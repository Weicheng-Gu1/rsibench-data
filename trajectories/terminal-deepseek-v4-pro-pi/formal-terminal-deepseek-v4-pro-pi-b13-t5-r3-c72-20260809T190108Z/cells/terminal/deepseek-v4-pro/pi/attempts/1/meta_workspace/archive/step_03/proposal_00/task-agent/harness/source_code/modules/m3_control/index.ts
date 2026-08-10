import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: orchestration, verification, and branching policies.

const MAX_GATE_TRIGGERS = 2;

function isTestCommand(cmd: string): boolean {
  return /\b(?:pytest|python3?\s+-m\s+pytest|npm\s+(?:run\s+)?test|npx\s+(?:jest|mocha|ava|vitest)|cargo\s+test|go\s+test|make\s+test|tox\b|unittest\b|ctest\b)/i.test(cmd);
}

function resultIndicatesPassing(event: { isError?: boolean; result?: unknown; content?: unknown }): boolean {
  if (event.isError) return false;
  const result = event.result ?? event;
  const text = extractText(result);
  if (!text) return !event.isError;
  if (/\bFAILED\b|\bfailures?\b/i.test(text) && !/\b0\s+fail/i.test(text)) return false;
  if (/\bpassed\b|\bPASSED\b|\bOK\b/i.test(text)) return true;
  return !event.isError;
}

function extractText(obj: unknown): string {
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map(extractText).join(" ");
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content.map(extractText).join(" ");
    if (typeof o.text === "string") return o.text;
    if (typeof o.stdout === "string") return o.stdout;
    if (typeof o.stderr === "string") return o.stderr;
  }
  return "";
}

async function discoverTestFiles(pi: ExtensionAPI): Promise<string | null> {
  try {
    const result = await pi.exec("bash", ["-c",
      "find /tests /app/tests ./tests ../tests -maxdepth 2 -type f \\( -name 'test_*.py' -o -name '*_test.py' -o -name 'conftest.py' \\) 2>/dev/null || true"
    ], { signal: AbortSignal.timeout(3000) });
    const lines = (result.stdout || "").trim().split("\n").filter(l => l.trim());
    if (lines.length > 0) {
      const unique = [...new Set(lines)].slice(0, 20);
      const bulletList = unique.map(p => "  • " + p.replace(/^\\.\//, "")).join("\n");
      return "\n\nTest files found at standard locations:\n" + bulletList +
        "\n\nRun them with: python3 -m pytest <path> -v";
    }
  } catch (_) { /* find failed or timed out; fall through */ }
  return null;
}

export default function install(pi: ExtensionAPI): void {
  let lastTestPassed = false;
  let gateCount = 0;
  let toolsCalledThisTurn = false;
  let testCommandExecuted = false;
  const pendingCommands = new Map<string, string>();

  pi.on("tool_call", async (event) => {
    toolsCalledThisTurn = true;
    if (event.toolName !== "bash") return;
    const cmd = String((event.input as { command?: unknown }).command ?? "");
    pendingCommands.set(event.toolCallId, cmd);
  });

  pi.on("tool_result", async (event) => {
    if (event.toolName !== "bash") return;
    const cmd = pendingCommands.get(event.toolCallId);
    pendingCommands.delete(event.toolCallId);
    if (!cmd) return;

    testCommandExecuted = testCommandExecuted || isTestCommand(cmd);

    if (isTestCommand(cmd) && resultIndicatesPassing(event)) {
      lastTestPassed = true;
      gateCount = 0;
      pi.appendEntry("rsibench:mechanism", {
        kind: "verification_passed",
        command: cmd.slice(0, 200),
      });
    }
  });

  pi.on("turn_end", async (_event) => {
    const hadNoTools = !toolsCalledThisTurn;
    toolsCalledThisTurn = false;

    if (!hadNoTools) return;
    if (gateCount >= MAX_GATE_TRIGGERS) return;
    if (lastTestPassed) return;

    gateCount++;

    // Deterministic test discovery: search standard locations so the agent
    // sees test paths even when its own find commands missed them.
    const discovered = await discoverTestFiles(pi);

    pi.appendEntry("rsibench:mechanism", {
      kind: "verification_gate",
      trigger: gateCount,
      testCommandExecuted,
      testsDiscovered: discovered !== null,
    });

    let message =
      "Verify your solution independently before the session ends. " +
      "First, check for pre-existing test suites in the repository " +
      "(e.g., /tests/, test_*.py, Makefile targets, package.json scripts). " +
      "If you find tests, run them all and fix any failures. " +
      "If no pre-existing tests exist, perform manual adversarial verification: " +
      "re-read each task requirement and test your output against it one by one. " +
      "Do NOT create a new test that simply confirms your current output is " +
      "formatted correctly — instead, check edge cases, spot-check values " +
      "against expected ranges, and confirm the artifact matches every " +
      "stated requirement independently of your construction assumptions.";

    if (discovered) {
      message += discovered;
    } else if (!testCommandExecuted) {
      message +=
        "\n\nNo test suites found at /tests, /app/tests, ./tests, or ../tests. " +
        "If you haven't already checked these exact paths, do so now.";
    }

    pi.sendMessage(
      { customType: "rsibench-control", content: message, display: false },
      { deliverAs: "followUp", triggerTurn: true },
    );
  });
}
