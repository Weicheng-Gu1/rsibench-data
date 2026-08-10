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

export default function install(pi: ExtensionAPI): void {
  let lastTestPassed = false;
  let gateCount = 0;
  const pendingCommands = new Map<string, string>();

  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return;
    const cmd = String((event.input as { command?: unknown }).command ?? "");
    pendingCommands.set(event.toolCallId, cmd);
  });

  pi.on("tool_result", async (event) => {
    if (event.toolName !== "bash") return;
    const cmd = pendingCommands.get(event.toolCallId);
    pendingCommands.delete(event.toolCallId);
    if (!cmd) return;

    if (isTestCommand(cmd) && resultIndicatesPassing(event)) {
      lastTestPassed = true;
      gateCount = 0;
      pi.appendEntry("rsibench:mechanism", {
        kind: "verification_passed",
        command: cmd.slice(0, 200),
      });
    }
  });

  pi.on("agent_end", async (_event) => {
    if (gateCount >= MAX_GATE_TRIGGERS) return;
    if (lastTestPassed) return;

    gateCount++;
    pi.appendEntry("rsibench:mechanism", {
      kind: "verification_gate",
      trigger: gateCount,
    });
    pi.sendMessage(
      {
        customType: "rsibench-control",
        content:
          "Before declaring this task complete, run the visible test suite to verify " +
          "your solution. Look for test files in the repository (e.g., under /tests/, " +
          "test_*.py, Makefile targets, or similar). Execute them and ensure they all " +
          "pass. If any tests fail, fix the issues and re-run until all pass. " +
          "Do not stop until verification succeeds.",
        display: false,
      },
      { deliverAs: "followUp", triggerTurn: true },
    );
  });
}
