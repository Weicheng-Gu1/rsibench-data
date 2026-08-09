import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: silent-stop recovery controller.
//
// Diagnosed failure class (training evidence, repeated across batches and
// tasks): the model occasionally ends a run with a response whose content is
// only internal reasoning (thinking blocks) and no tool calls and no visible
// text. Pi's agent loop sees no tool calls, treats the task as finished, and
// terminates the session mid-work: no deliverable is produced and the user
// never even sees an answer. In the supplied training trajectories this exact
// terminal shape appeared only in failed runs and never in a passing one.
//
// Mechanism: at turn_end, detect a terminal assistant turn with empty visible
// output (no toolCall block, no non-empty text block, no tool results) and a
// natural stop reason ("stop" or "length"; provider errors and aborts are
// excluded as infrastructure). Schedule exactly one bounded follow-up per
// firing, capped per session, that instructs the agent to resume with tools
// and finish with a visible response. The trigger is structural (content-block
// shape + stop reason), so it is task-independent: it fires on the same
// anomaly in any domain and cannot fire on a normal final answer, which always
// carries visible text.

const MAX_RECOVERIES_PER_SESSION = 2;

const RECOVERY_INSTRUCTION =
  "[session control] Your previous response contained only internal " +
  "reasoning: it had no tool calls and no visible answer, so the agent loop " +
  "treated the task as finished and the session was about to end with the " +
  "work incomplete. Resume the task now. Use your tools to take the next " +
  "concrete step, keep going until every deliverable the task asked for " +
  "actually exists at its requested location, and finish only with a visible " +
  "final response.";

interface ContentBlock {
  type?: unknown;
  text?: unknown;
}

function isSilentTerminalTurn(event: {
  message?: { role?: unknown; stopReason?: unknown; content?: unknown };
  toolResults?: unknown;
}): boolean {
  const message = event.message;
  if (!message || message.role !== "assistant") return false;
  // Provider/transport failures are infrastructure; never recover those.
  if (message.stopReason !== "stop" && message.stopReason !== "length") {
    return false;
  }
  if (Array.isArray(event.toolResults) && event.toolResults.length > 0) {
    return false;
  }
  const content: ContentBlock[] = Array.isArray(message.content)
    ? (message.content as ContentBlock[])
    : [];
  const hasToolCall = content.some((block) => block?.type === "toolCall");
  const hasVisibleText = content.some(
    (block) =>
      block?.type === "text" &&
      typeof block.text === "string" &&
      block.text.trim().length > 0,
  );
  return !hasToolCall && !hasVisibleText;
}

export default function install(pi: ExtensionAPI): void {
  let recoveries = 0;

  pi.on("session_start", async () => {
    recoveries = 0;
  });

  pi.on("turn_end", async (event) => {
    try {
      if (!isSilentTerminalTurn(event)) return;
      if (recoveries >= MAX_RECOVERIES_PER_SESSION) return;
      recoveries += 1;
      pi.appendEntry("rsibench:control", {
        kind: "silent_stop_recovery",
        recovery: recoveries,
        turnIndex: event.turnIndex,
        stopReason: event.message?.stopReason,
      });
      pi.sendMessage(
        {
          customType: "rsibench-silent-stop",
          content: RECOVERY_INSTRUCTION,
          display: false,
        },
        { deliverAs: "followUp", triggerTurn: true },
      );
    } catch {
      // Recovery control must never break the session.
    }
  });
}
