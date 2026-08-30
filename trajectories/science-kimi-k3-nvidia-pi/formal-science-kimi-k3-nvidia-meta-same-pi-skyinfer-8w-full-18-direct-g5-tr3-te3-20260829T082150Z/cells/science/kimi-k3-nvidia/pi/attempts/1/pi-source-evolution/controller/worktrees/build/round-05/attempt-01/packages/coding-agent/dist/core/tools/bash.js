import { constants } from "node:fs";
import { access as fsAccess, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Container, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { spawn } from "child_process";
import { Type } from "typebox";
import { keyHint } from "../../modes/interactive/components/keybinding-hints.js";
import { truncateToVisualLines } from "../../modes/interactive/components/visual-truncate.js";
import { theme } from "../../modes/interactive/theme/theme.js";
import { waitForChildProcess } from "../../utils/child-process.js";
import { getShellConfig, getShellEnv, killProcessTree, trackDetachedChildPid, untrackDetachedChildPid, } from "../../utils/shell.js";
import { OutputAccumulator } from "./output-accumulator.js";
import { getTextOutput, invalidArgText, str } from "./render-utils.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "./truncate.js";
const MAX_TIMEOUT_MS = 2_147_483_647;
const MAX_TIMEOUT_SECONDS = MAX_TIMEOUT_MS / 1000;
function resolveTimeoutMs(timeout) {
    if (timeout === undefined)
        return undefined;
    if (!Number.isFinite(timeout) || timeout <= 0) {
        throw new Error("Invalid timeout: must be a finite number of seconds");
    }
    const timeoutMs = timeout * 1000;
    if (timeoutMs > MAX_TIMEOUT_MS) {
        throw new Error(`Invalid timeout: maximum is ${MAX_TIMEOUT_SECONDS} seconds`);
    }
    return timeoutMs;
}
const bashSchema = Type.Object({
    command: Type.String({ description: "Bash command to execute" }),
    timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, no default timeout)" })),
});
/**
 * Create bash operations using pi's built-in local shell execution backend.
 *
 * This is useful for extensions that intercept user_bash and still want pi's
 * standard local shell behavior while wrapping or rewriting commands.
 */
export function createLocalBashOperations(options) {
    return {
        exec: async (command, cwd, { onData, signal, timeout, env }) => {
            const timeoutMs = resolveTimeoutMs(timeout);
            if (signal?.aborted) {
                throw new Error("aborted");
            }
            const shellConfig = getShellConfig(options?.shellPath);
            try {
                await fsAccess(cwd, constants.F_OK);
            }
            catch {
                throw new Error(`Working directory does not exist: ${cwd}\nCannot execute bash commands.`);
            }
            const commandFromStdin = shellConfig.commandTransport === "stdin";
            const child = spawn(shellConfig.shell, commandFromStdin ? shellConfig.args : [...shellConfig.args, command], {
                cwd,
                detached: process.platform !== "win32",
                env: env ?? getShellEnv(),
                stdio: [commandFromStdin ? "pipe" : "ignore", "pipe", "pipe"],
                windowsHide: true,
            });
            if (commandFromStdin) {
                child.stdin?.on("error", () => { });
                child.stdin?.end(command);
            }
            if (child.pid)
                trackDetachedChildPid(child.pid);
            let timedOut = false;
            let timeoutHandle;
            const onAbort = () => {
                if (child.pid)
                    killProcessTree(child.pid);
            };
            try {
                // Set timeout if provided.
                if (timeoutMs !== undefined) {
                    timeoutHandle = setTimeout(() => {
                        timedOut = true;
                        if (child.pid)
                            killProcessTree(child.pid);
                    }, timeoutMs);
                }
                // Stream stdout and stderr.
                child.stdout?.on("data", onData);
                child.stderr?.on("data", onData);
                // Handle abort signal by killing the entire process tree.
                if (signal) {
                    if (signal.aborted)
                        onAbort();
                    else
                        signal.addEventListener("abort", onAbort, { once: true });
                }
                // Handle shell spawn errors and wait for the process to terminate without hanging
                // on inherited stdio handles held by detached descendants.
                const exitCode = await waitForChildProcess(child);
                if (signal?.aborted) {
                    throw new Error("aborted");
                }
                if (timedOut) {
                    throw new Error(`timeout:${timeout}`);
                }
                return { exitCode };
            }
            finally {
                if (child.pid)
                    untrackDetachedChildPid(child.pid);
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                if (signal)
                    signal.removeEventListener("abort", onAbort);
            }
        },
    };
}
function resolveSpawnContext(command, cwd, spawnHook, exposeSessionEnvironment, ctx) {
    const env = { ...getShellEnv() };
    delete env.PI_SESSION_ID;
    delete env.PI_SESSION_FILE;
    delete env.PI_PROVIDER;
    delete env.PI_MODEL;
    delete env.PI_REASONING_LEVEL;
    if (exposeSessionEnvironment && ctx) {
        const model = ctx.model;
        env.PI_SESSION_ID = ctx.sessionManager.getSessionId();
        const sessionFile = ctx.sessionManager.getSessionFile();
        if (sessionFile)
            env.PI_SESSION_FILE = sessionFile;
        if (model) {
            env.PI_PROVIDER = model.provider;
            env.PI_MODEL = model.id;
        }
        if (ctx.thinkingLevel)
            env.PI_REASONING_LEVEL = ctx.thinkingLevel;
    }
    const baseContext = { command, cwd, env };
    return spawnHook ? spawnHook(baseContext) : baseContext;
}
/**
 * Success-only, best-effort observation enrichments appended to bash results.
 * Every detector is wrapped by its caller so any failure degrades to baseline output.
 */
const TRAINING_COMMAND_PATTERN = /\.fit(?:_predict|_transform)?\s*\(|GridSearchCV|RandomizedSearchCV|cross_val_score|cross_validate|nb_epoch\b|num_epochs\b/;
const TRAINING_ROBUSTNESS_NOTE = "\n\n[training-robustness note] This command ran model-training code. Before finalizing predictions from a single training run: " +
    "(1) fix random seeds and prefer a small seed/config ensemble over one fit; " +
    "(2) use class weights or resampling when training labels are imbalanced; " +
    "(3) when test labels are masked or placeholders, tune decision thresholds on held-out training splits; " +
    "(4) inspect saved predictions for degenerate collapse (near-constant or single-class scores).";
const MAX_SCRIPT_SNIFF_BYTES = 512 * 1024;
const MAX_CSV_BYTES = 64 * 1024 * 1024;
const MAX_WALK_ENTRIES = 20000;
const MAX_WALK_DEPTH = 6;
const MAX_FRESH_ARTIFACTS = 3;
const MAX_REFERENCE_FILES = 40;
/** Clock-skew slack for mtime comparisons (LLM turn gaps are seconds; writes land inside the command window). */
const MTIME_SLACK_MS = 1000;
/** Extract script paths from `python <script>.py` invocations inside a shell command. */
function extractPythonScriptPaths(command) {
    const paths = [];
    const re = /(?:^|[\s;&|])python(?:\d(?:\.\d+)*)?(?:\s+-[^\s;&|]+)*\s+([^\s;&|"'`]+\.py)\b/g;
    let m;
    while ((m = re.exec(command)) !== null)
        paths.push(m[1]);
    return paths;
}
/** Resolve the effective working directory after any `cd` segments chained with && or ;. */
function resolveCommandCwd(command, cwd) {
    let target = cwd;
    const re = /(?:^|[;&|]\s*)cd\s+([^\s;&|]+)/g;
    let m;
    while ((m = re.exec(command)) !== null) {
        const segment = m[1];
        target = path.isAbsolute(segment) ? segment : path.resolve(target, segment);
    }
    return target;
}
/**
 * Detect commands that execute supervised model-training code, either directly in the
 * command text or, for `python <script>.py` invocations, via a bounded read-only sniff
 * of the resolved script.
 */
async function commandRunsModelTraining(command, cwd) {
    if (TRAINING_COMMAND_PATTERN.test(command))
        return true;
    const base = resolveCommandCwd(command, cwd);
    for (const raw of extractPythonScriptPaths(command)) {
        try {
            const scriptPath = path.isAbsolute(raw) ? raw : path.resolve(base, raw);
            const st = await stat(scriptPath);
            if (!st.isFile() || st.size > MAX_SCRIPT_SNIFF_BYTES)
                continue;
            const content = await readFile(scriptPath, "utf8");
            if (TRAINING_COMMAND_PATTERN.test(content))
                return true;
        }
        catch {
            // Unreadable or missing script: ignore.
        }
    }
    return false;
}
/** Recursively collect *.csv files under root, pruning hidden dirs and node_modules. */
async function walkCsvFiles(root, skipTopLevelDirs, cap) {
    const out = [];
    const walk = async (dir, depth) => {
        if (depth > MAX_WALK_DEPTH || cap.count > MAX_WALK_ENTRIES)
            return;
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (cap.count++ > MAX_WALK_ENTRIES)
                return;
            if (entry.isSymbolicLink())
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith(".") || entry.name === "node_modules")
                    continue;
                if (depth === 0 && skipTopLevelDirs.has(entry.name))
                    continue;
                await walk(full, depth + 1);
            }
            else if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) {
                out.push(full);
            }
        }
    };
    await walk(root, 0);
    return out;
}
/** Parse a CSV header line, dropping empty and pandas-style unnamed index columns. */
function parseCsvHeader(line) {
    return line
        .split(",")
        .map((c) => c.trim().replace(/^"|"$/g, "").trim())
        .filter((c) => c.length > 0 && !/^unnamed/i.test(c));
}
/** Read header columns and count data rows of a CSV file (bounded size). */
async function readCsvMeta(filePath) {
    try {
        const st = await stat(filePath);
        if (!st.isFile() || st.size === 0 || st.size > MAX_CSV_BYTES)
            return null;
        const content = await readFile(filePath, "utf8");
        const firstNewline = content.indexOf("\n");
        const headerLine = firstNewline === -1 ? content : content.slice(0, firstNewline);
        const columns = parseCsvHeader(headerLine);
        if (columns.length === 0)
            return null;
        let newlines = 0;
        for (let i = 0; i < content.length; i++) {
            if (content.charCodeAt(i) === 10)
                newlines++;
        }
        let rows = newlines - 1; // subtract the header line
        if (!content.endsWith("\n"))
            rows += 1;
        if (rows < 0)
            rows = 0;
        return { path: filePath, columns, rows };
    }
    catch {
        return null;
    }
}
function formatColumnList(columns) {
    const shown = columns.slice(0, 8).join(", ");
    return columns.length > 8 ? `${shown}, …` : shown;
}
/**
 * Cross-check freshly written CSV artifacts against provided reference CSVs.
 *
 * When a command creates or updates a CSV under the working directory and a pre-existing
 * CSV has the same data-row count, shares at least one column name with it, but contains
 * one or two additional (non-index) columns the artifact lacks, the artifact likely
 * re-invented a schema that a provided file already defines (e.g. a test split whose
 * target column should be mirrored into a prediction file). Returns an advisory note
 * surfacing that concrete evidence, or "" when nothing matches.
 */
async function buildSchemaCrossCheckNote(command, cwd, startedAt, sessionStartedAt) {
    const effectiveCwd = resolveCommandCwd(command, cwd);
    const artifactPaths = await walkCsvFiles(effectiveCwd, new Set(["benchmark"]), { count: 0 });
    const fresh = [];
    for (const p of artifactPaths) {
        if (fresh.length >= MAX_FRESH_ARTIFACTS)
            break;
        try {
            const st = await stat(p);
            if (st.mtimeMs < startedAt - MTIME_SLACK_MS)
                continue;
            const meta = await readCsvMeta(p);
            if (meta && meta.rows > 0)
                fresh.push(meta);
        }
        catch {
            // Skip unreadable artifacts.
        }
    }
    if (fresh.length === 0)
        return "";
    const freshSet = new Set(fresh.map((f) => f.path));
    const referencePaths = (await walkCsvFiles(effectiveCwd, new Set(), { count: 0 }))
        .filter((p) => !freshSet.has(p) && !p.split(path.sep).includes("gold_results"))
        .sort((a, b) => {
        // Provided benchmark inputs first.
        const aBench = a.split(path.sep).includes("benchmark") ? 0 : 1;
        const bBench = b.split(path.sep).includes("benchmark") ? 0 : 1;
        return aBench - bBench;
    });
    const references = [];
    for (const p of referencePaths) {
        if (references.length >= MAX_REFERENCE_FILES)
            break;
        try {
            const st = await stat(p);
            // References are provided inputs: they must predate the session, so files
            // the agent itself wrote earlier in the run never pose as references.
            if (st.mtimeMs >= sessionStartedAt - MTIME_SLACK_MS)
                continue;
            const meta = await readCsvMeta(p);
            if (meta)
                references.push(meta);
        }
        catch {
            // Skip unreadable references.
        }
    }
    const notes = [];
    for (const artifact of fresh) {
        const artifactCols = new Set(artifact.columns);
        let best = null;
        for (const ref of references) {
            if (ref.rows !== artifact.rows)
                continue;
            const refCols = new Set(ref.columns);
            const shared = artifact.columns.filter((c) => refCols.has(c));
            if (shared.length === 0)
                continue;
            const extras = ref.columns.filter((c) => !artifactCols.has(c));
            if (extras.length < 1 || extras.length > 2)
                continue;
            if (!best || shared.length > best.shared.length)
                best = { ref, shared, extras };
        }
        if (!best)
            continue;
        notes.push(`\n\n[output-schema note] This command wrote ${path.relative(effectiveCwd, artifact.path)} ` +
            `(${artifact.rows} data rows, columns: ${formatColumnList(artifact.columns)}). ` +
            `Provided data file ${path.relative(effectiveCwd, best.ref.path)} has the same row count and shares ` +
            `column(s) [${formatColumnList(best.shared)}], but also contains column(s) ` +
            `[${formatColumnList(best.extras)}] absent from your file. If this file is a prediction or submission ` +
            "for the same rows and the task statement does not explicitly dictate different column names, mirror " +
            "the provided file's schema (reuse its exact column names, including its target/label column) rather " +
            "than inventing new ones; re-open both files and confirm before finishing.");
    }
    return notes.join("");
}
/** Append success-only observation notes to a completed command's output. Never throws. */
async function appendSuccessNotes(command, cwd, startedAt, sessionStartedAt, outputText) {
    let text = outputText;
    try {
        if (await commandRunsModelTraining(command, cwd)) {
            text += TRAINING_ROBUSTNESS_NOTE;
        }
    }
    catch {
        // Detection failure degrades to baseline output.
    }
    try {
        text += await buildSchemaCrossCheckNote(command, cwd, startedAt, sessionStartedAt);
    }
    catch {
        // Detection failure degrades to baseline output.
    }
    return text;
}
const BASH_PREVIEW_LINES = 5;
const BASH_UPDATE_THROTTLE_MS = 100;
class BashResultRenderComponent extends Container {
    state = {
        cachedWidth: undefined,
        cachedLines: undefined,
        cachedSkipped: undefined,
    };
}
function formatDuration(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
}
function formatBashCall(args) {
    const command = str(args?.command);
    const timeout = args?.timeout;
    const timeoutSuffix = timeout ? theme.fg("muted", ` (timeout ${timeout}s)`) : "";
    const commandDisplay = command === null ? invalidArgText(theme) : command ? command : theme.fg("toolOutput", "...");
    return theme.fg("toolTitle", theme.bold(`$ ${commandDisplay}`)) + timeoutSuffix;
}
function rebuildBashResultRenderComponent(component, result, options, showImages, startedAt, endedAt) {
    const state = component.state;
    component.clear();
    let output = getTextOutput(result, showImages).trim();
    const truncation = result.details?.truncation;
    const fullOutputPath = result.details?.fullOutputPath;
    if (!options.isPartial && truncation?.truncated && fullOutputPath && output.endsWith("]")) {
        const footerStart = output.lastIndexOf("\n\n[");
        if (footerStart !== -1 && output.slice(footerStart).includes(fullOutputPath)) {
            output = output.slice(0, footerStart).trimEnd();
        }
    }
    if (output) {
        const styledOutput = output
            .split("\n")
            .map((line) => theme.fg("toolOutput", line))
            .join("\n");
        if (options.expanded) {
            component.addChild(new Text(`\n${styledOutput}`, 0, 0));
        }
        else {
            component.addChild({
                render: (width) => {
                    if (state.cachedLines === undefined || state.cachedWidth !== width) {
                        const preview = truncateToVisualLines(styledOutput, BASH_PREVIEW_LINES, width);
                        state.cachedLines = preview.visualLines;
                        state.cachedSkipped = preview.skippedCount;
                        state.cachedWidth = width;
                    }
                    if (state.cachedSkipped && state.cachedSkipped > 0) {
                        const hint = theme.fg("muted", `... (${state.cachedSkipped} earlier lines,`) +
                            ` ${keyHint("app.tools.expand", "to expand")}${theme.fg("muted", ")")}`;
                        return ["", truncateToWidth(hint, width, "..."), ...(state.cachedLines ?? [])];
                    }
                    return ["", ...(state.cachedLines ?? [])];
                },
                invalidate: () => {
                    state.cachedWidth = undefined;
                    state.cachedLines = undefined;
                    state.cachedSkipped = undefined;
                },
            });
        }
    }
    if (truncation?.truncated || fullOutputPath) {
        const warnings = [];
        if (fullOutputPath) {
            warnings.push(`Full output: ${fullOutputPath}`);
        }
        if (truncation?.truncated) {
            if (truncation.truncatedBy === "lines") {
                warnings.push(`Truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`);
            }
            else {
                warnings.push(`Truncated: ${truncation.outputLines} lines shown (${formatSize(truncation.maxBytes ?? DEFAULT_MAX_BYTES)} limit)`);
            }
        }
        component.addChild(new Text(`\n${theme.fg("warning", `[${warnings.join(". ")}]`)}`, 0, 0));
    }
    if (startedAt !== undefined) {
        const label = options.isPartial ? "Elapsed" : "Took";
        const endTime = endedAt ?? Date.now();
        component.addChild(new Text(`\n${theme.fg("muted", `${label} ${formatDuration(endTime - startedAt)}`)}`, 0, 0));
    }
}
export function createBashToolDefinition(cwd, options) {
    const ops = options?.operations ?? createLocalBashOperations({ shellPath: options?.shellPath });
    const commandPrefix = options?.commandPrefix;
    const exposeSessionEnvironment = options?.exposeSessionEnvironment ?? true;
    const spawnHook = options?.spawnHook;
    // Approximate session start: tool definitions are created during session setup,
    // before any command runs. Used to distinguish provided input files from
    // artifacts the agent itself produced during the session.
    const sessionStartedAt = Date.now();
    return {
        name: "bash",
        label: "bash",
        description: `Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Optionally provide a timeout in seconds.`,
        promptSnippet: "Execute bash commands (ls, grep, find, etc.)",
        promptGuidelines: exposeSessionEnvironment
            ? ["Inspect PI_* environment variables for current model and session details."]
            : undefined,
        parameters: bashSchema,
        async execute(_toolCallId, { command, timeout }, signal, onUpdate, ctx) {
            const resolvedCommand = commandPrefix ? `${commandPrefix}\n${command}` : command;
            const spawnContext = resolveSpawnContext(resolvedCommand, cwd, spawnHook, exposeSessionEnvironment, ctx);
            const output = new OutputAccumulator({ tempFilePrefix: "pi-bash" });
            let acceptingOutput = true;
            let updateTimer;
            let updateDirty = false;
            let lastUpdateAt = 0;
            const emitOutputUpdate = () => {
                if (!onUpdate || !updateDirty)
                    return;
                updateDirty = false;
                lastUpdateAt = Date.now();
                const snapshot = output.snapshot({ persistIfTruncated: true });
                onUpdate({
                    content: [{ type: "text", text: snapshot.content || "" }],
                    details: {
                        truncation: snapshot.truncation.truncated ? snapshot.truncation : undefined,
                        fullOutputPath: snapshot.fullOutputPath,
                    },
                });
            };
            const clearUpdateTimer = () => {
                if (updateTimer) {
                    clearTimeout(updateTimer);
                    updateTimer = undefined;
                }
            };
            const scheduleOutputUpdate = () => {
                if (!onUpdate)
                    return;
                updateDirty = true;
                const delay = BASH_UPDATE_THROTTLE_MS - (Date.now() - lastUpdateAt);
                if (delay <= 0) {
                    clearUpdateTimer();
                    emitOutputUpdate();
                    return;
                }
                updateTimer ??= setTimeout(() => {
                    updateTimer = undefined;
                    emitOutputUpdate();
                }, delay);
            };
            if (onUpdate) {
                onUpdate({ content: [], details: undefined });
            }
            const handleData = (data) => {
                if (!acceptingOutput)
                    return;
                output.append(data);
                scheduleOutputUpdate();
            };
            const finishOutput = async () => {
                acceptingOutput = false;
                output.finish();
                clearUpdateTimer();
                emitOutputUpdate();
                const snapshot = output.snapshot({ persistIfTruncated: true });
                await output.closeTempFile();
                return snapshot;
            };
            const formatOutput = (snapshot, emptyText = "(no output)") => {
                const truncation = snapshot.truncation;
                let text = snapshot.content || emptyText;
                let details;
                if (truncation.truncated) {
                    details = { truncation, fullOutputPath: snapshot.fullOutputPath };
                    const startLine = truncation.totalLines - truncation.outputLines + 1;
                    const endLine = truncation.totalLines;
                    if (truncation.lastLinePartial) {
                        const lastLineSize = formatSize(output.getLastLineBytes());
                        text += `\n\n[Showing last ${formatSize(truncation.outputBytes)} of line ${endLine} (line is ${lastLineSize}). Full output: ${snapshot.fullOutputPath}]`;
                    }
                    else if (truncation.truncatedBy === "lines") {
                        text += `\n\n[Showing lines ${startLine}-${endLine} of ${truncation.totalLines}. Full output: ${snapshot.fullOutputPath}]`;
                    }
                    else {
                        text += `\n\n[Showing lines ${startLine}-${endLine} of ${truncation.totalLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Full output: ${snapshot.fullOutputPath}]`;
                    }
                }
                return { text, details };
            };
            const appendStatus = (text, status) => `${text ? `${text}\n\n` : ""}${status}`;
            try {
                const startedAt = Date.now();
                let exitCode;
                try {
                    const result = await ops.exec(spawnContext.command, spawnContext.cwd, {
                        onData: handleData,
                        signal,
                        timeout,
                        env: spawnContext.env,
                    });
                    exitCode = result.exitCode;
                }
                catch (err) {
                    const snapshot = await finishOutput();
                    const { text } = formatOutput(snapshot, "");
                    if (err instanceof Error && err.message === "aborted") {
                        throw new Error(appendStatus(text, "Command aborted"));
                    }
                    if (err instanceof Error && err.message.startsWith("timeout:")) {
                        const timeoutSecs = err.message.split(":")[1];
                        throw new Error(appendStatus(text, `Command timed out after ${timeoutSecs} seconds`));
                    }
                    throw err;
                }
                const snapshot = await finishOutput();
                const { text: outputText, details } = formatOutput(snapshot);
                if (exitCode === null) {
                    // The process was terminated by a signal (e.g. OOM kill) before it could
                    // exit normally. Surface this as an error with the partial output so the
                    // model recovers instead of reasoning over a silently truncated run.
                    throw new Error(appendStatus(outputText, "Command was terminated by a signal before it could complete (partial output above; consider re-running it or reducing its footprint)"));
                }
                if (exitCode !== 0) {
                    throw new Error(appendStatus(outputText, `Command exited with code ${exitCode}`));
                }
                const enrichedText = await appendSuccessNotes(spawnContext.command, spawnContext.cwd, startedAt, sessionStartedAt, outputText);
                return { content: [{ type: "text", text: enrichedText }], details };
            }
            finally {
                clearUpdateTimer();
            }
        },
        renderCall(args, _theme, context) {
            const state = context.state;
            if (context.executionStarted && state.startedAt === undefined) {
                state.startedAt = Date.now();
                state.endedAt = undefined;
            }
            const text = context.lastComponent ?? new Text("", 0, 0);
            text.setText(formatBashCall(args));
            return text;
        },
        renderResult(result, options, _theme, context) {
            const state = context.state;
            if (state.startedAt !== undefined && options.isPartial && !state.interval) {
                state.interval = setInterval(() => context.invalidate(), 1000);
            }
            if (!options.isPartial || context.isError) {
                state.endedAt ??= Date.now();
                if (state.interval) {
                    clearInterval(state.interval);
                    state.interval = undefined;
                }
            }
            const component = context.lastComponent ?? new BashResultRenderComponent();
            rebuildBashResultRenderComponent(component, result, options, context.showImages, state.startedAt, state.endedAt);
            component.invalidate();
            return component;
        },
    };
}
export function createBashTool(cwd, options) {
    const definition = createBashToolDefinition(cwd, options);
    const tool = wrapToolDefinition(definition);
    Object.assign(tool, {
        promptSnippet: definition.promptSnippet,
        promptGuidelines: definition.promptGuidelines,
    });
    return tool;
}
//# sourceMappingURL=bash.js.map