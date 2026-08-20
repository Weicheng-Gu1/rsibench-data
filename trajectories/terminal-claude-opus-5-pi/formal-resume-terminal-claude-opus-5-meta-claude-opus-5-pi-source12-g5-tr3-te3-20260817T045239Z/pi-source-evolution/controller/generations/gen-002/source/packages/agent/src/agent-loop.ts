/**
 * Agent loop that works with AgentMessage throughout.
 * Transforms to Message[] only at the LLM call boundary.
 */

import {
	type AssistantMessage,
	type Context,
	EventStream,
	type ToolResultMessage,
	validateToolArguments,
} from "@earendil-works/pi-ai";
import { getDefaultStreamFn } from "./stream-fn.ts";
import type {
	AgentContext,
	AgentEvent,
	AgentLoopConfig,
	AgentMessage,
	AgentTool,
	AgentToolCall,
	AgentToolResult,
	StreamFn,
	TaskContractAuditConfig,
} from "./types.ts";

export type AgentEventSink = (event: AgentEvent) => Promise<void> | void;

// ---------------------------------------------------------------------------
// Task-contract audit
//
// The external grader of an agent run judges the final environment state against
// the literal obligations stated in the task text, not against the agent's own
// belief that it is done. The loop therefore derives those obligations
// deterministically from the task text at run start, records how each turn's
// tool calls actually exercised them, and injects a short machine-generated
// notice when the run is provably about to hand back a state that the task text
// says is not yet demonstrated:
//
//  - a command quoted verbatim in the task was never executed as written;
//  - the task's quoted commands all succeeded once, but the environment was
//    destructively changed afterwards and nothing was re-verified since;
//  - a quoted code snippet was only ever executed with a working directory
//    inside a directory this run itself created (a build tree), so it proves
//    the local tree rather than the global state a grader observes;
//  - a file the task names as an output was never created or referenced;
//  - the deliverable is a program the grader will execute itself, and this run
//    only ever exercised it against the single problem instance that happened
//    to be present in the container, so instance-specific constants cannot be
//    distinguished from a general solution;
//  - the task states an explicit multi-field output structure, every field of
//    which is graded separately, so validating one field is not validating the
//    answer.
//
// Notices are bounded, deduplicated by finding signature, skipped when the task
// states nothing mechanically checkable, and disableable via config.
// ---------------------------------------------------------------------------

const AUDIT_DEFAULTS = {
	enabled: true,
	maxNotices: 3,
	checkpointTurns: 8,
	maxRepeatNotices: 2,
	repeatThreshold: 3,
} as const;

/** Command heads that denote a real, externally observable action worth re-checking. */
const EXECUTABLE_HEADS = new Set([
	"apt",
	"apt-get",
	"bash",
	"cargo",
	"cmake",
	"curl",
	"docker",
	"g++",
	"gcc",
	"git",
	"go",
	"gradle",
	"java",
	"javac",
	"make",
	"mvn",
	"nginx",
	"node",
	"npm",
	"pip",
	"pip3",
	"pnpm",
	"psql",
	"pytest",
	"python",
	"python3",
	"rsync",
	"ruby",
	"scp",
	"service",
	"sh",
	"ssh",
	"systemctl",
	"wget",
	"yarn",
]);

/** Substrings that mark a command as destructive to previously proven state. */
const DESTRUCTIVE_PATTERNS = [
	"rm -rf",
	"rm -fr",
	"git reset --hard",
	"git clean -",
	"git gc",
	"update-ref -d",
	"systemctl stop",
	"service nginx stop",
	"service ssh stop",
	"pkill",
	"killall",
	"mkfs",
	"truncate -s 0",
	"docker rm",
	"apt-get remove",
	"apt-get purge",
];

/**
 * Paths whose deletion is routine scratch cleanup rather than a change to the
 * state a grader observes. Without this the guard fires on every run that tidies
 * up its own temporary clone directory.
 */
const SCRATCH_PREFIXES = ["/tmp/", "/var/tmp/", "./tmp", "~/tmp"];

function isScratchOnlyDestruction(normalized: string, offset: number): boolean {
	const tail = normalized.slice(offset).split(" ").slice(1);
	const targets = tail
		.filter((token) => !token.startsWith("-"))
		.slice(0, 4)
		.filter((token) => token.length > 0 && token !== "&&" && token !== ";" && token !== "|");
	if (targets.length === 0) return false;
	return targets.every((token) => SCRATCH_PREFIXES.some((prefix) => token.startsWith(prefix)));
}

const PRODUCING_VERBS = [
	"write",
	"writes",
	"written",
	"save",
	"saves",
	"saved",
	"create",
	"creates",
	"created",
	"output",
	"outputs",
	"produce",
	"produces",
	"generate",
	"generates",
	"called",
	"named",
];

const NEGATION_MARKERS = ["no need", "don't", "do not", "except", "ignore", "dead code", "not required"];

/**
 * Phrases that mark a named file as a program the grader will execute itself,
 * rather than a finished answer it will only read. When the grader runs the
 * program it does so in its own environment, which may regenerate the problem
 * instance, so validating the program against the one instance present in the
 * container proves nothing about the constants tuned while looking at it.
 */
const EXECUTION_PHRASES = [
	"when run",
	"when executed",
	"when you run",
	"when i run",
	"when it is run",
	"when it runs",
	"when the script",
	"that runs",
	"should run",
	"is run",
	"running it",
];

const PROGRAM_EXTENSIONS = [".py", ".sh", ".js", ".ts", ".rb", ".pl", ".mjs", ".cjs"];

/** Tokens that, immediately before a program path, mean the program is being executed. */
const PROGRAM_RUN_HEADS = [
	"python",
	"python3",
	"bash",
	"sh ",
	"node",
	"ruby",
	"perl",
	"./",
	"timeout",
	"exec",
	"nohup",
];

type ObligationKind = "command" | "snippet" | "artifact" | "program" | "schema";

interface AuditObligation {
	kind: ObligationKind;
	id: string;
	/** Human-readable form injected into the notice. */
	display: string;
	/** Whitespace/quote-normalized form used for literal matching. */
	normalized: string;
	/** Distinctive (non-flag) tokens used for variant matching. */
	tokens: string[];
	/** For snippet obligations: root module names that must be importable. */
	modules?: string[];
	/** For schema obligations: the field names the task's output structure names. */
	fields?: string[];
}

interface ExercisePoint {
	call: number;
	offset: number;
	/** 2 = executed literally as quoted, 1 = executed as a recognizable variant. */
	level: 1 | 2;
	cwd?: string;
}

interface TaskContractAuditState {
	enabled: boolean;
	/** Repeat guard runs even when the task states no mechanically checkable obligation. */
	repeatEnabled: boolean;
	obligations: AuditObligation[];
	/** Normalized invocation signature -> number of times it was issued. */
	invocationCounts: Map<string, number>;
	/** Signature -> display form of the first invocation, for the notice text. */
	invocationDisplay: Map<string, string>;
	/** Signatures observed during the turn currently being recorded. */
	pendingRepeats: string[];
	repeatNoticesEmitted: number;
	maxRepeatNotices: number;
	repeatThreshold: number;
	exercises: Map<string, ExercisePoint[]>;
	/**
	 * Program obligation id -> every tool call that executed or referenced that
	 * program, with the working directory it happened in. Distinct directories are
	 * how a run proves it exercised the program against more than one instance.
	 */
	programRuns: Map<string, { call: number; cwd?: string; executed: boolean }[]>;
	producedArtifacts: Set<string>;
	/** Obligation id -> position of the last tool call that produced or referenced it. */
	artifactProducedAt: Map<string, { call: number; offset: number }>;
	createdDirs: string[];
	lastDestructive?: { call: number; offset: number; command: string };
	callIndex: number;
	turnIndex: number;
	noticesEmitted: number;
	reportedSignatures: Set<string>;
	startedAt: number;
	maxNotices: number;
	checkpointTurns: number;
}

function messageText(message: AgentMessage): string {
	const content = (message as { content?: unknown }).content;
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((part): part is { type: "text"; text: string } =>
			Boolean(part && typeof part === "object" && (part as { type?: string }).type === "text"),
		)
		.map((part) => part.text)
		.join("\n");
}

function normalizeCommand(raw: string): string {
	return raw
		.replace(/\\\n/g, " ")
		.replace(/["'`]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function commandHead(normalized: string): string {
	const head = normalized.split(" ")[0] ?? "";
	return head.toLowerCase();
}

function isExecutableCommandLine(normalized: string): boolean {
	if (normalized.length < 4 || normalized.length > 300) return false;
	const head = commandHead(normalized);
	if (head.startsWith("./") || head.startsWith("/usr/") || head.startsWith("/bin/") || head.startsWith("/sbin/")) {
		return true;
	}
	if (!EXECUTABLE_HEADS.has(head)) return false;
	// A bare head with no arguments is not a checkable obligation.
	return normalized.split(" ").length > 1;
}

/**
 * Host-insensitive form of an argument token. A run that reaches the same
 * endpoint through `localhost` instead of the hostname quoted in the task, or
 * that clones the same path without the `user@host:` prefix, has still
 * exercised the obligation; only the endpoint spelling differs.
 */
function hostInsensitive(token: string): string {
	return token
		.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")
		.replace(/^[^@\s]*@[^:\s]*:/, "")
		.replace(/^[A-Za-z0-9_.-]+:(?=\/)/, "");
}

function distinctiveTokens(normalized: string): string[] {
	return normalized
		.split(" ")
		.slice(1)
		.filter((token) => token.length > 1 && !token.startsWith("-"));
}

function makeCommandObligation(normalized: string): AuditObligation | undefined {
	if (!isExecutableCommandLine(normalized)) return undefined;
	return {
		kind: "command",
		id: `command:${normalized}`,
		display: normalized,
		normalized,
		tokens: distinctiveTokens(normalized),
	};
}

/**
 * Local window around a mention. Task statements are frequently one long line,
 * so line-scoped checks both miss the governing verb and pick up unrelated
 * negations elsewhere in the same paragraph.
 */
function windowAround(text: string, index: number, before: number, after: number): string {
	return text.slice(Math.max(0, index - before), Math.min(text.length, index + after)).toLowerCase();
}

function extractObligations(taskText: string): AuditObligation[] {
	const obligations = new Map<string, AuditObligation>();
	const add = (obligation: AuditObligation | undefined) => {
		if (obligation && !obligations.has(obligation.id)) obligations.set(obligation.id, obligation);
	};

	// Fenced blocks: code snippets that must run, or command sequences to execute.
	const fence = /```([A-Za-z0-9_+-]*)\n([\s\S]*?)```/g;
	let fenceMatch: RegExpExecArray | null = fence.exec(taskText);
	while (fenceMatch) {
		const language = (fenceMatch[1] ?? "").toLowerCase();
		const body = fenceMatch[2] ?? "";
		if (language === "python" || language === "py") {
			const modules = new Set<string>();
			const importRe = /^\s*(?:import|from)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
			let importMatch: RegExpExecArray | null = importRe.exec(body);
			while (importMatch) {
				modules.add(importMatch[1]);
				importMatch = importRe.exec(body);
			}
			if (modules.size > 0) {
				const names = [...modules].sort();
				add({
					kind: "snippet",
					id: `snippet:${names.join(",")}`,
					display: `the quoted code snippet importing ${names.map((n) => `\`${n}\``).join(", ")}`,
					normalized: names.join(","),
					tokens: names,
					modules: names,
				});
			}
		} else {
			for (const line of body.split("\n")) {
				add(makeCommandObligation(normalizeCommand(line)));
			}
		}
		fenceMatch = fence.exec(taskText);
	}

	// Indented command blocks (four or more leading spaces).
	for (const line of taskText.split("\n")) {
		if (!/^\s{4,}\S/.test(line)) continue;
		add(makeCommandObligation(normalizeCommand(line)));
	}

	// Inline code spans.
	const inline = /`([^`\n]{3,200})`/g;
	let inlineMatch: RegExpExecArray | null = inline.exec(taskText);
	while (inlineMatch) {
		add(makeCommandObligation(normalizeCommand(inlineMatch[1])));
		inlineMatch = inline.exec(taskText);
	}

	// Named output artifacts governed by a producing verb.
	const pathRe = /(\/[A-Za-z0-9._\-/]*[A-Za-z0-9_-]\.[A-Za-z0-9]{1,6})/g;
	let pathMatch: RegExpExecArray | null = pathRe.exec(taskText);
	while (pathMatch) {
		const path = pathMatch[1];
		const lead = windowAround(taskText, pathMatch.index, 70, 0);
		const scope = windowAround(taskText, pathMatch.index, 70, 40);
		const hasVerb = PRODUCING_VERBS.some((verb) => lead.includes(verb));
		const negated = NEGATION_MARKERS.some((marker) => scope.includes(marker));
		if (hasVerb && !negated) {
			add({
				kind: "artifact",
				id: `artifact:${path}`,
				display: path,
				normalized: path,
				tokens: [path],
			});
		}
		// The same path is additionally a program obligation when the task says the
		// file will be executed: the grader runs it, in its own environment.
		const executable = PROGRAM_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(extension));
		const runPhrase = windowAround(taskText, pathMatch.index, 40, 120);
		if (executable && !negated && EXECUTION_PHRASES.some((phrase) => runPhrase.includes(phrase))) {
			add({
				kind: "program",
				id: `program:${path}`,
				display: path,
				normalized: path,
				tokens: [path],
			});
		}
		pathMatch = pathRe.exec(taskText);
	}

	// An explicit output structure: every named field is graded on its own.
	const schemaFields = new Set<string>();
	const fieldRe = /"([A-Za-z_][A-Za-z0-9_ -]{0,40})"\s*:\s*<[^>\n]{1,60}>/g;
	let fieldMatch: RegExpExecArray | null = fieldRe.exec(taskText);
	while (fieldMatch) {
		schemaFields.add(fieldMatch[1]);
		fieldMatch = fieldRe.exec(taskText);
	}
	if (schemaFields.size >= 2) {
		const fields = [...schemaFields];
		add({
			kind: "schema",
			id: `schema:${fields.join(",")}`,
			display: fields.map((field) => `\`${field}\``).join(", "),
			normalized: fields.join(","),
			tokens: fields,
			fields,
		});
	}

	return [...obligations.values()];
}

function createTaskContractAuditState(
	messages: AgentMessage[],
	overrides: TaskContractAuditConfig | undefined,
): TaskContractAuditState {
	const enabled = overrides?.enabled ?? AUDIT_DEFAULTS.enabled;
	const taskText = messages
		.filter((message) => message.role === "user")
		.map((message) => messageText(message))
		.join("\n\n");
	const obligations = enabled && taskText.length > 0 ? extractObligations(taskText) : [];
	return {
		enabled: enabled && obligations.length > 0,
		repeatEnabled: enabled,
		obligations,
		invocationCounts: new Map(),
		invocationDisplay: new Map(),
		pendingRepeats: [],
		repeatNoticesEmitted: 0,
		maxRepeatNotices: Math.max(0, overrides?.maxRepeatNotices ?? AUDIT_DEFAULTS.maxRepeatNotices),
		repeatThreshold: Math.max(2, overrides?.repeatThreshold ?? AUDIT_DEFAULTS.repeatThreshold),
		exercises: new Map(),
		programRuns: new Map(),
		producedArtifacts: new Set(),
		artifactProducedAt: new Map(),
		createdDirs: [],
		callIndex: 0,
		turnIndex: 0,
		noticesEmitted: 0,
		reportedSignatures: new Set(),
		startedAt: Date.now(),
		maxNotices: Math.max(0, overrides?.maxNotices ?? AUDIT_DEFAULTS.maxNotices),
		checkpointTurns: Math.max(1, overrides?.checkpointTurns ?? AUDIT_DEFAULTS.checkpointTurns),
	};
}

function resolveAgainst(cwd: string | undefined, target: string): string {
	if (target.startsWith("/")) return target.replace(/\/+$/, "");
	const base = (cwd ?? "").replace(/\/+$/, "");
	return `${base}/${target}`.replace(/\/+$/, "");
}

/** Tokens that end a command segment; anything after them is not an argument. */
function segmentTokens(normalized: string, from: number): string[] {
	const tokens: string[] = [];
	for (const token of normalized.slice(from).split(" ")) {
		if (token === "" ) continue;
		if (token === "&&" || token === "||" || token === ";" || token === "|" || token.startsWith("2>") || token.startsWith(">")) {
			break;
		}
		tokens.push(token);
	}
	return tokens;
}

/** git clone flags that consume a following value. */
const CLONE_VALUE_FLAGS = new Set(["--branch", "-b", "--depth", "--origin", "-o", "--reference", "-c", "--config"]);

function recordCreatedDirs(state: TaskContractAuditState, normalized: string, cwd: string | undefined): void {
	const cloneAt = normalized.indexOf("git clone");
	if (cloneAt !== -1) {
		const tokens = segmentTokens(normalized, cloneAt + "git clone".length);
		const positional: string[] = [];
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token.startsWith("-")) {
				if (CLONE_VALUE_FLAGS.has(token) && !token.includes("=")) i++;
				continue;
			}
			positional.push(token);
		}
		const source = positional[0];
		const target = positional[1];
		if (target) {
			state.createdDirs.push(resolveAgainst(cwd, target));
		} else if (source) {
			const base = source.split("/").pop() ?? "";
			const name = base.replace(/\.git$/, "");
			if (name) state.createdDirs.push(resolveAgainst(cwd, name));
		}
	}
	const mkdirRe = /mkdir(?:\s+-\S+)*\s+([^\s;|&>]+)/g;
	let mkdir: RegExpExecArray | null = mkdirRe.exec(normalized);
	while (mkdir) {
		state.createdDirs.push(resolveAgainst(cwd, mkdir[1]));
		mkdir = mkdirRe.exec(normalized);
	}
	// An in-place build makes the current directory an importable source tree; a
	// check run from there proves the tree, not the installed/global state.
	if (cwd && (normalized.includes("build_ext --inplace") || /pip\d?\s+install\s+-e\b/.test(normalized))) {
		state.createdDirs.push(cwd);
	}
}

function isInsideCreatedDir(state: TaskContractAuditState, cwd: string | undefined): boolean {
	if (!cwd) return false;
	return state.createdDirs.some((dir) => dir.length > 1 && (cwd === dir || cwd.startsWith(`${dir}/`)));
}

function addExercise(state: TaskContractAuditState, obligation: AuditObligation, point: ExercisePoint): void {
	const points = state.exercises.get(obligation.id);
	if (points) points.push(point);
	else state.exercises.set(obligation.id, [point]);
}

function recordBashCall(state: TaskContractAuditState, rawCommand: string): void {
	const normalized = normalizeCommand(rawCommand);
	const lower = normalized.toLowerCase();
	const cdMatch = /(?:^|&&\s*|;\s*)cd\s+(\S+)/.exec(normalized);
	const cwd = cdMatch ? cdMatch[1].replace(/\/+$/, "") : undefined;

	recordCreatedDirs(state, normalized, cwd);

	for (const pattern of DESTRUCTIVE_PATTERNS) {
		const offset = lower.indexOf(pattern);
		if (offset === -1) continue;
		if (isScratchOnlyDestruction(lower, offset)) continue;
		const previous = state.lastDestructive;
		if (!previous || previous.call < state.callIndex || previous.offset < offset) {
			state.lastDestructive = { call: state.callIndex, offset, command: pattern };
		}
	}

	for (const obligation of state.obligations) {
		if (obligation.kind === "artifact") {
			const basename = obligation.normalized.split("/").pop() ?? obligation.normalized;
			const hit = normalized.includes(obligation.normalized)
				? normalized.indexOf(obligation.normalized)
				: basename.length > 3 && normalized.includes(basename)
					? normalized.indexOf(basename)
					: -1;
			if (hit !== -1) {
				state.producedArtifacts.add(obligation.id);
				state.artifactProducedAt.set(obligation.id, { call: state.callIndex, offset: hit });
			}
			continue;
		}
		if (obligation.kind === "program") {
			const basename = obligation.normalized.split("/").pop() ?? obligation.normalized;
			const stem = basename.replace(/\.[A-Za-z0-9]+$/, "");
			let index = normalized.indexOf(obligation.normalized);
			if (index === -1 && basename.length > 3) index = normalized.indexOf(basename);
			// A run that copies or rewrites the program under another name in order to
			// point it at a second instance still counts as touching the program.
			if (index === -1 && stem.length > 3) index = normalized.indexOf(stem);
			if (index === -1) continue;
			const lead = normalized.slice(Math.max(0, index - 40), index).toLowerCase();
			const executed = PROGRAM_RUN_HEADS.some((head) => lead.includes(head));
			const runs = state.programRuns.get(obligation.id) ?? [];
			runs.push({ call: state.callIndex, cwd, executed });
			state.programRuns.set(obligation.id, runs);
			continue;
		}
		if (obligation.kind === "schema") continue;
		if (obligation.kind === "snippet") {
			for (const moduleName of obligation.modules ?? []) {
				const importRe = new RegExp(`\\b(?:import|from)\\s+${moduleName}\\b`);
				const hit = importRe.exec(normalized);
				if (hit) {
					addExercise(state, obligation, { call: state.callIndex, offset: hit.index, level: 2, cwd });
					break;
				}
			}
			continue;
		}
		const literalOffset = normalized.indexOf(obligation.normalized);
		if (literalOffset !== -1) {
			addExercise(state, obligation, { call: state.callIndex, offset: literalOffset, level: 2, cwd });
			continue;
		}
		const head = commandHead(obligation.normalized);
		if (!normalized.includes(head)) continue;
		const matched = obligation.tokens.filter(
			(token) => normalized.includes(token) || normalized.includes(hostInsensitive(token)),
		);
		if (obligation.tokens.length > 0 && matched.length / obligation.tokens.length >= 0.6) {
			const probe = matched[0] ?? head;
			const offset = normalized.includes(probe) ? normalized.indexOf(probe) : normalized.indexOf(head);
			addExercise(state, obligation, { call: state.callIndex, offset: Math.max(0, offset), level: 1, cwd });
		}
	}
}

/**
 * Signature used by the repeat guard. Flags, redirections and quoting are
 * dropped so that a command re-issued with cosmetic edits still collapses onto
 * the same signature; the first six distinctive tokens are enough to identify
 * "the same thing again" without collapsing genuinely different work.
 */
function invocationSignature(normalized: string): string {
	return normalized
		.toLowerCase()
		.split(" ")
		.filter((token) => token.length > 0 && !token.startsWith("-") && !token.startsWith(">") && token !== "|")
		.slice(0, 6)
		.join(" ");
}

function recordInvocation(state: TaskContractAuditState, signature: string, display: string): void {
	if (!state.repeatEnabled || signature.length === 0) return;
	const count = (state.invocationCounts.get(signature) ?? 0) + 1;
	state.invocationCounts.set(signature, count);
	if (!state.invocationDisplay.has(signature)) state.invocationDisplay.set(signature, display);
	if (count >= state.repeatThreshold) state.pendingRepeats.push(signature);
}

function recordTurnForAudit(state: TaskContractAuditState, message: AssistantMessage): void {
	if (!state.enabled && !state.repeatEnabled) return;
	state.turnIndex += 1;
	state.pendingRepeats = [];
	for (const block of message.content) {
		if (block.type !== "toolCall") continue;
		state.callIndex += 1;
		const args = (block.arguments ?? {}) as Record<string, unknown>;
		const command = typeof args.command === "string" ? args.command : undefined;
		if (command) {
			const normalized = normalizeCommand(command);
			recordInvocation(state, invocationSignature(normalized), normalized.slice(0, 160));
			if (state.enabled) recordBashCall(state, command);
			continue;
		}
		const path = typeof args.path === "string" ? args.path : undefined;
		if (!path) continue;
		const normalizedPath = path.replace(/\/+$/, "");
		recordInvocation(state, `${block.name}:${normalizedPath}`, `${block.name} ${normalizedPath}`);
		if (!state.enabled) continue;
		const pathBase = normalizedPath.split("/").pop() ?? normalizedPath;
		// A written script that itself names the artifact counts as producing it.
		const written =
			typeof args.content === "string"
				? args.content
				: Array.isArray(args.edits)
					? args.edits
							.map((edit) => (edit as { newText?: unknown }).newText)
							.filter((text): text is string => typeof text === "string")
							.join("\n")
					: "";
		for (const obligation of state.obligations) {
			if (obligation.kind !== "artifact") continue;
			const basename = obligation.normalized.split("/").pop() ?? obligation.normalized;
			if (
				normalizedPath === obligation.normalized ||
				pathBase === basename ||
				written.includes(obligation.normalized) ||
				(basename.length > 3 && written.includes(basename))
			) {
				state.producedArtifacts.add(obligation.id);
				state.artifactProducedAt.set(obligation.id, { call: state.callIndex, offset: 0 });
			}
		}
	}
}

/**
 * Repeat guard: the same command or the same file rewritten several times means
 * the run is spending budget without changing external state, and the model has
 * no other way to see how much wall-clock it has already burned. Report both,
 * once per signature, bounded per run.
 */
function runRepeatGuard(state: TaskContractAuditState, signal: AbortSignal | undefined): AgentMessage[] {
	if (!state.repeatEnabled || signal?.aborted) return [];
	if (state.repeatNoticesEmitted >= state.maxRepeatNotices) return [];
	const fresh = state.pendingRepeats.filter((signature) => !state.reportedSignatures.has(`repeat:${signature}`));
	state.pendingRepeats = [];
	if (fresh.length === 0) return [];
	const signature = fresh[0];
	state.reportedSignatures.add(`repeat:${signature}`);
	state.repeatNoticesEmitted += 1;

	const count = state.invocationCounts.get(signature) ?? state.repeatThreshold;
	const display = state.invocationDisplay.get(signature) ?? signature;
	const elapsedSeconds = Math.round((Date.now() - state.startedAt) / 1000);
	const text =
		`[pi harness] Automatic no-progress check. This is not a message from the user.\n\n` +
		`You have now issued the same operation ${count} times in this run: \`${display}\`. ` +
		`Elapsed wall-clock: ${elapsedSeconds}s over ${state.callIndex} tool calls; runs here are cut off by a hard deadline and any work that is not already durable at that moment is lost.\n\n` +
		`Do not retry the same operation a further time in the same form. Either change the approach materially, or stop iterating and spend the remaining budget making the current state durable and verifiable: persist what already works (scripts, services, installed artifacts, written files) so it survives this session, then run the task's own acceptance check once, literally as the task states it.`;

	return [
		{
			role: "user",
			content: [{ type: "text", text }],
			timestamp: Date.now(),
		} satisfies AgentMessage,
	];
}

function lastExercisePosition(state: TaskContractAuditState): { call: number; offset: number } | undefined {
	let best: { call: number; offset: number } | undefined;
	for (const obligation of state.obligations) {
		if (obligation.kind === "artifact") continue;
		for (const point of state.exercises.get(obligation.id) ?? []) {
			if (!best || point.call > best.call || (point.call === best.call && point.offset > best.offset)) {
				best = { call: point.call, offset: point.offset };
			}
		}
	}
	return best;
}

interface AuditFinding {
	signature: string;
	text: string;
}

function collectAuditFindings(state: TaskContractAuditState, phase: "checkpoint" | "exit"): AuditFinding[] {
	const findings: AuditFinding[] = [];
	const commandObligations = state.obligations.filter((o) => o.kind === "command");

	// 1. A verbatim quoted command was never executed as written. Reported only
	//    at exit: mid-run a contract command legitimately has not run yet.
	for (const obligation of phase === "exit" ? commandObligations : []) {
		const points = state.exercises.get(obligation.id) ?? [];
		// Only report when the obligation was never exercised at all. A run that
		// executed a recognizable variant has already demonstrated the behavior,
		// and demanding the literal string there would cost a turn for nothing.
		if (points.length > 0) continue;
		findings.push({
			signature: `never-run:${obligation.id}`,
			text: `The task quotes this command: \`${obligation.display}\`. Nothing in this run has executed it or any recognizable form of it. Whatever grades this run will execute the quoted form against the final state, so run it exactly as written and observe the result before finishing.`,
		});
	}

	// 2. Every quoted command ran at least once, then the environment was
	//    destructively changed and nothing has been re-verified since.
	const everyCommandRan =
		commandObligations.length > 0 &&
		commandObligations.every((obligation) => (state.exercises.get(obligation.id) ?? []).length > 0);
	const destructive = state.lastDestructive;
	const lastExercise = lastExercisePosition(state);
	if (
		everyCommandRan &&
		destructive &&
		lastExercise &&
		(destructive.call > lastExercise.call ||
			(destructive.call === lastExercise.call && destructive.offset > lastExercise.offset))
	) {
		findings.push({
			signature: `stale-after-destructive:${destructive.call}:${destructive.offset}`,
			text: `The task's quoted commands all succeeded earlier in this run, but afterwards the environment was changed destructively (\`${destructive.command}\`) and none of them has been re-run since. The grader only sees the final state. Re-run the quoted sequence end to end against the current state, fix whatever it now reveals (ownership, permissions, deleted refs, removed hooks), and only then finish.`,
		});
	}

	// 3. A quoted snippet was only ever exercised from inside a directory this run created.
	for (const obligation of state.obligations) {
		if (obligation.kind !== "snippet") continue;
		const points = state.exercises.get(obligation.id) ?? [];
		if (points.length === 0) continue;
		if (!points.every((point) => isInsideCreatedDir(state, point.cwd))) continue;
		const dirs = [...new Set(points.map((point) => point.cwd).filter(Boolean))].join(", ");
		findings.push({
			signature: `snippet-local-only:${obligation.id}`,
			text: `So far ${obligation.display} has only ever been executed with a working directory inside ${dirs}, which this run created. Inside that tree the modules resolve from the source directory itself, so this proves nothing about the global environment a grader uses. Re-run the snippet from an unrelated working directory (for example \`cd /tmp\`) in a fresh interpreter; if it fails there, install the package into the environment and re-check.`,
		});
	}

	// 6. The deliverable is a program the grader executes itself. A program that
	//    has only ever been run against the single problem instance sitting in this
	//    container has not been distinguished from one that hard-codes that
	//    instance's shape, size or tuned constants; the grader may run it against a
	//    regenerated instance. Distinct working directories are the observable
	//    signal that a second, independent instance was actually exercised.
	for (const obligation of state.obligations) {
		if (obligation.kind !== "program") continue;
		const touches = state.programRuns.get(obligation.id) ?? [];
		const runs = touches.filter((touch) => touch.executed);
		if (runs.length === 0) {
			if (phase !== "exit") continue;
			findings.push({
				signature: `program-never-run:${obligation.id}`,
				text: `The task says \`${obligation.display}\` will be run. Nothing in this run has executed it end to end as a program (only imported pieces of it, or written it). Whatever grades this run executes that file itself, in its own environment. Run it exactly as the grader would and observe its complete output before finishing.`,
			});
			continue;
		}
		// Mid-run this needs two runs to be worth a turn; at exit a single run
		// against the only local instance is already the whole evidence base.
		if (runs.length < 2 && phase !== "exit") continue;
		// Every context the program was executed OR prepared in. A run that copied it
		// into a scratch directory built for a second instance shows up here even
		// though the copy carries a different filename.
		const contexts = new Set(touches.map((touch) => touch.cwd ?? ""));
		// More than one working directory means a second, independent instance was
		// actually exercised, which is exactly what this finding asks for.
		if (contexts.size > 1) continue;
		findings.push({
			signature: `program-single-instance:${obligation.id}`,
			text: `\`${obligation.display}\` has been run ${runs.length} times, every time against the same problem instance in the same directory (${[...contexts][0] || "the starting directory"}). The grader executes this program itself and may do so against a regenerated instance whose size, shape, seed or scale differs from the one present here, so agreement with the local instance cannot distinguish a general solution from one whose thresholds, iteration counts, filters or assumed dimensions were tuned by looking at this instance. Before finishing: (a) build a second, independent instance of the same problem yourself, with a deliberately different size and scale, and run the unmodified program against it; and (b) replace any acceptance check that reads private ground truth from inside the environment with one the program could make on its own from its permitted inputs. If the second instance fails or drops part of the answer, remove the tuned constant or filter that caused it rather than adjusting it to the local instance.`,
		});
	}

	// 7. Exit only: the task states a multi-field output structure. Every field is
	//    graded separately, so a run that validated one salient field and reported
	//    the answer as confirmed has checked a fraction of what it is graded on.
	if (phase === "exit") {
		for (const obligation of state.obligations) {
			if (obligation.kind !== "schema") continue;
			const fields = obligation.fields ?? [];
			if (fields.length < 2) continue;
			findings.push({
				signature: `schema-fields:${obligation.id}`,
				text: `The task specifies the exact output structure, naming these fields: ${obligation.display}. Every one of them is compared against a reference value independently, so the result is only as good as its weakest field. Before finishing, check each field separately rather than the one that is easiest to confirm: vary the analysis choice you made most arbitrarily (fit or integration window, subset of the data, initial guess, model form, tolerance) and report how much EACH field moves. A field that is still drifting as you widen or narrow that choice is not converged, and the value you would write is an artifact of where you stopped - pick the setting where all fields stabilize, not the one where only the most obvious field does.`,
			});
		}
	}

	// 4. Exit only: a file the task names as an output was never created or referenced.
	if (phase === "exit") {
		for (const obligation of state.obligations) {
			if (obligation.kind !== "artifact") continue;
			if (!state.producedArtifacts.has(obligation.id)) {
				findings.push({
					signature: `artifact-missing:${obligation.id}`,
					text: `The task names \`${obligation.display}\` as an output, but no tool call in this run has created or referenced it. Produce it and verify its contents before finishing.`,
				});
				continue;
			}
			// 5. Exit only: the artifact was produced, but a later destructive action
			//    can have removed it and nothing has touched it since. The grader reads
			//    the final filesystem, not the moment the file first appeared.
			const producedAt = state.artifactProducedAt.get(obligation.id);
			if (
				destructive &&
				producedAt &&
				(destructive.call > producedAt.call ||
					(destructive.call === producedAt.call && destructive.offset > producedAt.offset))
			) {
				findings.push({
					signature: `artifact-stale:${obligation.id}:${destructive.call}:${destructive.offset}`,
					text: `\`${obligation.display}\` was last produced or referenced before this run ran \`${destructive.command}\`, and nothing has touched it since. Confirm it still exists with the expected contents in the final state, and re-create it if the destructive step removed it.`,
				});
			}
		}
	}

	return findings;
}

function runTaskContractAudit(
	state: TaskContractAuditState,
	phase: "checkpoint" | "exit",
	signal: AbortSignal | undefined,
): AgentMessage[] {
	if (!state.enabled || signal?.aborted) return [];
	if (state.noticesEmitted >= state.maxNotices) return [];
	if (phase === "checkpoint" && (state.turnIndex === 0 || state.turnIndex % state.checkpointTurns !== 0)) {
		return [];
	}

	const fresh = collectAuditFindings(state, phase).filter(
		(finding) => !state.reportedSignatures.has(finding.signature),
	);
	if (fresh.length === 0) return [];
	for (const finding of fresh) state.reportedSignatures.add(finding.signature);
	state.noticesEmitted += 1;

	const elapsedSeconds = Math.round((Date.now() - state.startedAt) / 1000);
	const header =
		phase === "exit"
			? `[pi harness] Automatic task-contract check before this run ends (${elapsedSeconds}s elapsed, ${state.callIndex} tool calls). This is not a message from the user.`
			: `[pi harness] Automatic task-contract checkpoint (${elapsedSeconds}s elapsed, ${state.callIndex} tool calls). This is not a message from the user.`;
	const body = fresh.map((finding, index) => `${index + 1}. ${finding.text}`).join("\n");
	const footer =
		"Act on each item that is still true. If an item is already satisfied by work you have done, say so in one line and continue; do not restart unrelated work.";

	return [
		{
			role: "user",
			content: [{ type: "text", text: `${header}\n\n${body}\n\n${footer}` }],
			timestamp: Date.now(),
		} satisfies AgentMessage,
	];
}

/**
 * Start an agent loop with a new prompt message.
 * The prompt is added to the context and events are emitted for it.
 */
export function agentLoop(
	prompts: AgentMessage[],
	context: AgentContext,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	streamFn: StreamFn,
): EventStream<AgentEvent, AgentMessage[]> {
	const stream = createAgentStream();

	void runAgentLoop(
		prompts,
		context,
		config,
		async (event) => {
			stream.push(event);
		},
		signal,
		streamFn,
	).then((messages) => {
		stream.end(messages);
	});

	return stream;
}

/**
 * Continue an agent loop from the current context without adding a new message.
 * Used for retries - context already has user message or tool results.
 *
 * **Important:** The last message in context must convert to a `user` or `toolResult` message
 * via `convertToLlm`. If it doesn't, the LLM provider will reject the request.
 * This cannot be validated here since `convertToLlm` is only called once per turn.
 */
export function agentLoopContinue(
	context: AgentContext,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	streamFn: StreamFn,
): EventStream<AgentEvent, AgentMessage[]> {
	if (context.messages.length === 0) {
		throw new Error("Cannot continue: no messages in context");
	}

	if (context.messages[context.messages.length - 1].role === "assistant") {
		throw new Error("Cannot continue from message role: assistant");
	}

	const stream = createAgentStream();

	void runAgentLoopContinue(
		context,
		config,
		async (event) => {
			stream.push(event);
		},
		signal,
		streamFn,
	).then((messages) => {
		stream.end(messages);
	});

	return stream;
}

export async function runAgentLoop(
	prompts: AgentMessage[],
	context: AgentContext,
	config: AgentLoopConfig,
	emit: AgentEventSink,
	signal: AbortSignal | undefined,
	streamFn: StreamFn,
): Promise<AgentMessage[]> {
	const newMessages: AgentMessage[] = [...prompts];
	const currentContext: AgentContext = {
		...context,
		messages: [...context.messages, ...prompts],
	};

	await emit({ type: "agent_start" });
	await emit({ type: "turn_start" });
	for (const prompt of prompts) {
		await emit({ type: "message_start", message: prompt });
		await emit({ type: "message_end", message: prompt });
	}

	await runLoop(currentContext, newMessages, config, signal, emit, streamFn ?? getDefaultStreamFn());
	return newMessages;
}

export async function runAgentLoopContinue(
	context: AgentContext,
	config: AgentLoopConfig,
	emit: AgentEventSink,
	signal: AbortSignal | undefined,
	streamFn: StreamFn,
): Promise<AgentMessage[]> {
	if (context.messages.length === 0) {
		throw new Error("Cannot continue: no messages in context");
	}

	if (context.messages[context.messages.length - 1].role === "assistant") {
		throw new Error("Cannot continue from message role: assistant");
	}

	const newMessages: AgentMessage[] = [];
	const currentContext: AgentContext = { ...context };

	await emit({ type: "agent_start" });
	await emit({ type: "turn_start" });

	await runLoop(currentContext, newMessages, config, signal, emit, streamFn ?? getDefaultStreamFn());
	return newMessages;
}

function createAgentStream(): EventStream<AgentEvent, AgentMessage[]> {
	return new EventStream<AgentEvent, AgentMessage[]>(
		(event: AgentEvent) => event.type === "agent_end",
		(event: AgentEvent) => (event.type === "agent_end" ? event.messages : []),
	);
}

/**
 * Main loop logic shared by agentLoop and agentLoopContinue.
 */
async function runLoop(
	initialContext: AgentContext,
	newMessages: AgentMessage[],
	initialConfig: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
	streamFunction: StreamFn,
): Promise<void> {
	let currentContext = initialContext;
	let config = initialConfig;
	let firstTurn = true;
	const auditState = createTaskContractAuditState(currentContext.messages, config.taskContractAudit);
	// Check for steering messages at start (user may have typed while waiting)
	let pendingMessages: AgentMessage[] = (await config.getSteeringMessages?.()) || [];

	// Outer loop: continues when queued follow-up messages arrive after agent would stop
	while (true) {
		let hasMoreToolCalls = true;

		// Inner loop: process tool calls and steering messages
		while (hasMoreToolCalls || pendingMessages.length > 0) {
			if (!firstTurn) {
				await emit({ type: "turn_start" });
			} else {
				firstTurn = false;
			}

			// Process pending messages (inject before next assistant response)
			if (pendingMessages.length > 0) {
				for (const message of pendingMessages) {
					await emit({ type: "message_start", message });
					await emit({ type: "message_end", message });
					currentContext.messages.push(message);
					newMessages.push(message);
				}
				pendingMessages = [];
			}

			// Stream assistant response
			const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFunction);
			newMessages.push(message);
			recordTurnForAudit(auditState, message);

			if (message.stopReason === "error" || message.stopReason === "aborted") {
				await emit({ type: "turn_end", message, toolResults: [] });
				await emit({ type: "agent_end", messages: newMessages });
				return;
			}

			// Check for tool calls
			const toolCalls = message.content.filter((c) => c.type === "toolCall");

			const toolResults: ToolResultMessage[] = [];
			hasMoreToolCalls = false;
			if (toolCalls.length > 0) {
				// A "length" stop means the output was cut off by the token limit, so
				// every tool call in the message may carry truncated arguments. Fail
				// them all instead of executing potentially borked calls.
				const executedToolBatch =
					message.stopReason === "length"
						? await failToolCallsFromTruncatedMessage(toolCalls, emit)
						: await executeToolCalls(currentContext, message, config, signal, emit);
				toolResults.push(...executedToolBatch.messages);
				hasMoreToolCalls = !executedToolBatch.terminate;

				for (const result of toolResults) {
					currentContext.messages.push(result);
					newMessages.push(result);
				}
			}

			await emit({ type: "turn_end", message, toolResults });

			const nextTurnContext = {
				message,
				toolResults,
				context: currentContext,
				newMessages,
			};
			const nextTurnSnapshot = await config.prepareNextTurn?.(nextTurnContext);
			if (nextTurnSnapshot) {
				currentContext = nextTurnSnapshot.context ?? currentContext;
				config = {
					...config,
					model: nextTurnSnapshot.model ?? config.model,
					reasoning:
						nextTurnSnapshot.thinkingLevel === undefined
							? config.reasoning
							: nextTurnSnapshot.thinkingLevel === "off"
								? undefined
								: nextTurnSnapshot.thinkingLevel,
				};
			}

			if (
				await config.shouldStopAfterTurn?.({
					message,
					toolResults,
					context: currentContext,
					newMessages,
				})
			) {
				await emit({ type: "agent_end", messages: newMessages });
				return;
			}

			pendingMessages = (await config.getSteeringMessages?.()) || [];
			if (pendingMessages.length === 0 && hasMoreToolCalls) {
				// No-progress guard first: repeating the same operation is the more
				// urgent signal because it burns the deadline without changing state.
				pendingMessages = runRepeatGuard(auditState, signal);
			}
			if (pendingMessages.length === 0 && hasMoreToolCalls) {
				// Mid-run checkpoint: surface obligations that are already provably
				// unmet while there is still budget to act on them.
				pendingMessages = runTaskContractAudit(auditState, "checkpoint", signal);
			}
		}

		// Agent would stop here. Check for follow-up messages.
		const followUpMessages = (await config.getFollowUpMessages?.()) || [];
		if (followUpMessages.length > 0) {
			// Set as pending so inner loop processes them
			pendingMessages = followUpMessages;
			continue;
		}

		// The model believes it is done. The grader judges the final environment
		// state against the task's literal obligations, so check those first.
		const auditMessages = runTaskContractAudit(auditState, "exit", signal);
		if (auditMessages.length > 0) {
			pendingMessages = auditMessages;
			continue;
		}

		// No more messages, exit
		break;
	}

	await emit({ type: "agent_end", messages: newMessages });
}

/**
 * Stream an assistant response from the LLM.
 * This is where AgentMessage[] gets transformed to Message[] for the LLM.
 */
async function streamAssistantResponse(
	context: AgentContext,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
	streamFunction: StreamFn,
): Promise<AssistantMessage> {
	// Apply context transform if configured (AgentMessage[] → AgentMessage[])
	let messages = context.messages;
	if (config.transformContext) {
		messages = await config.transformContext(messages, signal);
	}

	// Convert to LLM-compatible messages (AgentMessage[] → Message[])
	const llmMessages = await config.convertToLlm(messages);

	// Build LLM context
	const llmContext: Context = {
		systemPrompt: context.systemPrompt,
		messages: llmMessages,
		tools: context.tools,
	};

	// Resolve API key (important for expiring tokens)
	const resolvedApiKey =
		(config.getApiKey ? await config.getApiKey(config.model.provider) : undefined) || config.apiKey;

	const response = await streamFunction(config.model, llmContext, {
		...config,
		apiKey: <REDACTED_CREDENTIAL>,
		signal,
	});

	let partialMessage: AssistantMessage | null = null;
	let addedPartial = false;

	for await (const event of response) {
		switch (event.type) {
			case "start":
				partialMessage = event.partial;
				context.messages.push(partialMessage);
				addedPartial = true;
				await emit({ type: "message_start", message: { ...partialMessage } });
				break;

			case "text_start":
			case "text_delta":
			case "text_end":
			case "thinking_start":
			case "thinking_delta":
			case "thinking_end":
			case "toolcall_start":
			case "toolcall_delta":
			case "toolcall_end":
				if (partialMessage) {
					partialMessage = event.partial;
					context.messages[context.messages.length - 1] = partialMessage;
					await emit({
						type: "message_update",
						assistantMessageEvent: event,
						message: { ...partialMessage },
					});
				}
				break;

			case "done":
			case "error": {
				const finalMessage = await response.result();
				if (addedPartial) {
					context.messages[context.messages.length - 1] = finalMessage;
				} else {
					context.messages.push(finalMessage);
				}
				if (!addedPartial) {
					await emit({ type: "message_start", message: { ...finalMessage } });
				}
				await emit({ type: "message_end", message: finalMessage });
				return finalMessage;
			}
		}
	}

	const finalMessage = await response.result();
	if (addedPartial) {
		context.messages[context.messages.length - 1] = finalMessage;
	} else {
		context.messages.push(finalMessage);
		await emit({ type: "message_start", message: { ...finalMessage } });
	}
	await emit({ type: "message_end", message: finalMessage });
	return finalMessage;
}

/**
 * Fail all tool calls from an assistant message that was truncated by the
 * output token limit. Streamed tool-call arguments are finalized with a
 * best-effort JSON salvage parser, so a truncated message can yield tool calls
 * whose arguments parse and validate but are silently incomplete. None of them
 * are safe to execute; report each as an error so the model can re-issue them.
 */
async function failToolCallsFromTruncatedMessage(
	toolCalls: AgentToolCall[],
	emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
	const messages: ToolResultMessage[] = [];
	for (const toolCall of toolCalls) {
		await emit({
			type: "tool_execution_start",
			toolCallId: toolCall.id,
			toolName: toolCall.name,
			args: toolCall.arguments,
		});
		const finalized: FinalizedToolCallOutcome = {
			toolCall,
			result: createErrorToolResult(
				`Tool call "${toolCall.name}" was not executed: the response hit the output token limit, so its arguments may be truncated. Re-issue the tool call with complete arguments.`,
			),
			isError: true,
		};
		await emitToolExecutionEnd(finalized, emit);
		const toolResultMessage = createToolResultMessage(finalized);
		await emitToolResultMessage(toolResultMessage, emit);
		messages.push(toolResultMessage);
	}
	return { messages, terminate: false };
}

/**
 * Execute tool calls from an assistant message.
 */
async function executeToolCalls(
	currentContext: AgentContext,
	assistantMessage: AssistantMessage,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
	const toolCalls = assistantMessage.content.filter((c) => c.type === "toolCall");
	const hasSequentialToolCall = toolCalls.some(
		(tc) => currentContext.tools?.find((t) => t.name === tc.name)?.executionMode === "sequential",
	);
	if (config.toolExecution === "sequential" || hasSequentialToolCall) {
		return executeToolCallsSequential(currentContext, assistantMessage, toolCalls, config, signal, emit);
	}
	return executeToolCallsParallel(currentContext, assistantMessage, toolCalls, config, signal, emit);
}

type ExecutedToolCallBatch = {
	messages: ToolResultMessage[];
	terminate: boolean;
};

async function executeToolCallsSequential(
	currentContext: AgentContext,
	assistantMessage: AssistantMessage,
	toolCalls: AgentToolCall[],
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
	const finalizedCalls: FinalizedToolCallOutcome[] = [];
	const messages: ToolResultMessage[] = [];

	for (const toolCall of toolCalls) {
		await emit({
			type: "tool_execution_start",
			toolCallId: toolCall.id,
			toolName: toolCall.name,
			args: toolCall.arguments,
		});

		const preparation = await prepareToolCall(currentContext, assistantMessage, toolCall, config, signal);
		let finalized: FinalizedToolCallOutcome;
		if (preparation.kind === "immediate") {
			finalized = {
				toolCall,
				result: preparation.result,
				isError: preparation.isError,
			};
		} else {
			const executed = await executePreparedToolCall(preparation, signal, emit);
			finalized = await finalizeExecutedToolCall(
				currentContext,
				assistantMessage,
				preparation,
				executed,
				config,
				signal,
			);
		}

		await emitToolExecutionEnd(finalized, emit);
		const toolResultMessage = createToolResultMessage(finalized);
		await emitToolResultMessage(toolResultMessage, emit);
		finalizedCalls.push(finalized);
		messages.push(toolResultMessage);

		if (signal?.aborted) {
			break;
		}
	}

	return {
		messages,
		terminate: shouldTerminateToolBatch(finalizedCalls),
	};
}

async function executeToolCallsParallel(
	currentContext: AgentContext,
	assistantMessage: AssistantMessage,
	toolCalls: AgentToolCall[],
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
	const finalizedCalls: FinalizedToolCallEntry[] = [];

	for (const toolCall of toolCalls) {
		await emit({
			type: "tool_execution_start",
			toolCallId: toolCall.id,
			toolName: toolCall.name,
			args: toolCall.arguments,
		});

		const preparation = await prepareToolCall(currentContext, assistantMessage, toolCall, config, signal);
		if (preparation.kind === "immediate") {
			const finalized = {
				toolCall,
				result: preparation.result,
				isError: preparation.isError,
			} satisfies FinalizedToolCallOutcome;
			await emitToolExecutionEnd(finalized, emit);
			finalizedCalls.push(finalized);
			if (signal?.aborted) {
				break;
			}
			continue;
		}

		finalizedCalls.push(async () => {
			const executed = await executePreparedToolCall(preparation, signal, emit);
			const finalized = await finalizeExecutedToolCall(
				currentContext,
				assistantMessage,
				preparation,
				executed,
				config,
				signal,
			);
			await emitToolExecutionEnd(finalized, emit);
			return finalized;
		});
		if (signal?.aborted) {
			break;
		}
	}

	const orderedFinalizedCalls = await Promise.all(
		finalizedCalls.map((entry) => (typeof entry === "function" ? entry() : Promise.resolve(entry))),
	);
	const messages: ToolResultMessage[] = [];
	for (const finalized of orderedFinalizedCalls) {
		const toolResultMessage = createToolResultMessage(finalized);
		await emitToolResultMessage(toolResultMessage, emit);
		messages.push(toolResultMessage);
	}

	return {
		messages,
		terminate: shouldTerminateToolBatch(orderedFinalizedCalls),
	};
}

type PreparedToolCall = {
	kind: "prepared";
	toolCall: AgentToolCall;
	tool: AgentTool<any>;
	args: unknown;
};

type ImmediateToolCallOutcome = {
	kind: "immediate";
	result: AgentToolResult<any>;
	isError: boolean;
};

type ExecutedToolCallOutcome = {
	result: AgentToolResult<any>;
	isError: boolean;
};

type FinalizedToolCallOutcome = {
	toolCall: AgentToolCall;
	result: AgentToolResult<any>;
	isError: boolean;
};

type FinalizedToolCallEntry = FinalizedToolCallOutcome | (() => Promise<FinalizedToolCallOutcome>);

function shouldTerminateToolBatch(finalizedCalls: FinalizedToolCallOutcome[]): boolean {
	return finalizedCalls.length > 0 && finalizedCalls.every((finalized) => finalized.result.terminate === true);
}

function prepareToolCallArguments(tool: AgentTool<any>, toolCall: AgentToolCall): AgentToolCall {
	if (!tool.prepareArguments) {
		return toolCall;
	}
	const preparedArguments = tool.prepareArguments(toolCall.arguments);
	if (preparedArguments === toolCall.arguments) {
		return toolCall;
	}
	return {
		...toolCall,
		arguments: preparedArguments as Record<string, any>,
	};
}

async function prepareToolCall(
	currentContext: AgentContext,
	assistantMessage: AssistantMessage,
	toolCall: AgentToolCall,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
): Promise<PreparedToolCall | ImmediateToolCallOutcome> {
	const tool = currentContext.tools?.find((t) => t.name === toolCall.name);
	if (!tool) {
		return {
			kind: "immediate",
			result: createErrorToolResult(`Tool ${toolCall.name} not found`),
			isError: true,
		};
	}

	try {
		const preparedToolCall = prepareToolCallArguments(tool, toolCall);
		const validatedArgs = validateToolArguments(tool, preparedToolCall);
		if (config.beforeToolCall) {
			const beforeResult = await config.beforeToolCall(
				{
					assistantMessage,
					toolCall,
					args: validatedArgs,
					context: currentContext,
				},
				signal,
			);
			if (signal?.aborted) {
				return {
					kind: "immediate",
					result: createErrorToolResult("Operation aborted"),
					isError: true,
				};
			}
			if (beforeResult?.block) {
				return {
					kind: "immediate",
					result: createErrorToolResult(beforeResult.reason || "Tool execution was blocked"),
					isError: true,
				};
			}
		}
		if (signal?.aborted) {
			return {
				kind: "immediate",
				result: createErrorToolResult("Operation aborted"),
				isError: true,
			};
		}
		return {
			kind: "prepared",
			toolCall,
			tool,
			args: validatedArgs,
		};
	} catch (error) {
		return {
			kind: "immediate",
			result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
			isError: true,
		};
	}
}

async function executePreparedToolCall(
	prepared: PreparedToolCall,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
): Promise<ExecutedToolCallOutcome> {
	const updateEvents: Promise<void>[] = [];
	let acceptingUpdates = true;

	try {
		const result = await prepared.tool.execute(
			prepared.toolCall.id,
			prepared.args as never,
			signal,
			(partialResult) => {
				if (!acceptingUpdates) return;
				updateEvents.push(
					Promise.resolve(
						emit({
							type: "tool_execution_update",
							toolCallId: prepared.toolCall.id,
							toolName: prepared.toolCall.name,
							args: prepared.toolCall.arguments,
							partialResult,
						}),
					),
				);
			},
		);
		acceptingUpdates = false;
		await Promise.all(updateEvents);
		return { result, isError: false };
	} catch (error) {
		acceptingUpdates = false;
		await Promise.all(updateEvents);
		return {
			result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
			isError: true,
		};
	} finally {
		acceptingUpdates = false;
	}
}

async function finalizeExecutedToolCall(
	currentContext: AgentContext,
	assistantMessage: AssistantMessage,
	prepared: PreparedToolCall,
	executed: ExecutedToolCallOutcome,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
): Promise<FinalizedToolCallOutcome> {
	let result = executed.result;
	let isError = executed.isError;

	if (config.afterToolCall) {
		try {
			const afterResult = await config.afterToolCall(
				{
					assistantMessage,
					toolCall: prepared.toolCall,
					args: prepared.args,
					result,
					isError,
					context: currentContext,
				},
				signal,
			);
			if (afterResult) {
				result = {
					...result,
					content: afterResult.content ?? result.content,
					details: afterResult.details ?? result.details,
					usage: afterResult.usage ?? result.usage,
					terminate: afterResult.terminate ?? result.terminate,
				};
				isError = afterResult.isError ?? isError;
			}
		} catch (error) {
			result = createErrorToolResult(error instanceof Error ? error.message : String(error));
			isError = true;
		}
	}

	return {
		toolCall: prepared.toolCall,
		result,
		isError,
	};
}

function createErrorToolResult(message: string): AgentToolResult<any> {
	return {
		content: [{ type: "text", text: message }],
		details: {},
	};
}

async function emitToolExecutionEnd(finalized: FinalizedToolCallOutcome, emit: AgentEventSink): Promise<void> {
	await emit({
		type: "tool_execution_end",
		toolCallId: finalized.toolCall.id,
		toolName: finalized.toolCall.name,
		result: finalized.result,
		isError: finalized.isError,
	});
}

function createToolResultMessage(finalized: FinalizedToolCallOutcome): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: finalized.toolCall.id,
		toolName: finalized.toolCall.name,
		// Untyped tools (JS extensions) can return results without content; normalize
		// so the null never enters session history or provider payloads.
		content: finalized.result.content ?? [],
		details: finalized.result.details,
		usage: finalized.result.usage,
		...(finalized.result.addedToolNames?.length ? { addedToolNames: finalized.result.addedToolNames } : {}),
		isError: finalized.isError,
		timestamp: Date.now(),
	};
}

async function emitToolResultMessage(toolResultMessage: ToolResultMessage, emit: AgentEventSink): Promise<void> {
	await emit({ type: "message_start", message: toolResultMessage });
	await emit({ type: "message_end", message: toolResultMessage });
}
