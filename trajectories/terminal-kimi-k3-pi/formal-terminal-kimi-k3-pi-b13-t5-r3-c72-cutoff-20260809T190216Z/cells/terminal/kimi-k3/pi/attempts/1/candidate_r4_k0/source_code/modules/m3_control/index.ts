import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: two independent bounded controllers.
//
// 1. Silent-stop recovery (retained, previously accepted).
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
//
// 2. Deliverable checkpoint pacer (new, this round).
//
// Diagnosed failure class (current training batch): the externally enforced
// task limit cuts sessions off while the agent is still mid-exploration, and
// the verifier then finds the required artifact missing. In the supplied batch
// this is the dominant failure (11 of 13 clean failures end in the external
// limit). The decisive structural signature: the failing sessions run many
// tool turns with ZERO write/edit calls to non-scratch (non-/tmp) locations —
// all results stay in the conversation or /tmp scratch files until it is too
// late (9 of 13 failures reach 8+ tool turns in that state; two failing
// sessions even wrote their only work product to /tmp). Passing sessions,
// including four that also hit the external limit but still scored, banked
// their deliverables early and updated them in place. The cutoff wall-clock
// time varies by an order of magnitude across tasks (about 90s to 1800s), so
// no elapsed-time trigger can be calibrated; the deficit is progress-based
// (many investigation steps, nothing committed), not time-based.
//
// Mechanism: at turn_end of a mid-loop tool turn, if the session has reached a
// checkpoint turn count with no write/edit tool call to a non-/tmp path so
// far, send exactly one conditional steer per checkpoint (two checkpoints per
// session, at 8 and 18 completed tool turns). The message asserts no specific
// paths (the agent identifies required artifacts from the task itself), is
// conditional (agents whose deliverable is not a file, or whose artifacts are
// already in place, are told to disregard and continue), and explicitly says
// it is not a signal to finish early. Nothing is blocked and satisfied
// sessions receive no message: any write/edit to a real location before the
// checkpoint suppresses it permanently.

const MAX_RECOVERIES_PER_SESSION = 2;

const RECOVERY_INSTRUCTION =
  "[session control] Your previous response contained only internal " +
  "reasoning: it had no tool calls and no visible answer, so the agent loop " +
  "treated the task as finished and the session was about to end with the " +
  "work incomplete. Resume the task now. Use your tools to take the next " +
  "concrete step, keep going until every deliverable the task asked for " +
  "actually exists at its requested location, and finish only with a visible " +
  "final response.";

const CHECKPOINT_TURNS = [8, 18];

function checkpointMessage(stage: number, toolTurns: number): string {
  if (stage === 0) {
    return (
      `[pacing checkpoint] This session has completed ${toolTurns} tool ` +
      `steps without any file-writing tool call outside scratch space ` +
      `(/tmp), so its results so far live only in this conversation or in ` +
      `scratch files. A session can be cut off at any moment by a hard ` +
      `external limit, and only work that exists at the locations the task ` +
      `requires earns credit. If the task requires files or artifacts at ` +
      `specific paths: write your current best version of each one to its ` +
      `exact required location now, even if rough, then keep improving it ` +
      `in place until it is fully correct. This is a pacing checkpoint, not ` +
      `a signal to finish early. If everything the task requires is already ` +
      `in place, or its deliverable is not a file (for example a running ` +
      `service), disregard this and continue.`
    );
  }
  return (
    `[pacing checkpoint - final notice] ${toolTurns} tool steps completed ` +
    `and still no file-writing tool call outside /tmp. If the task requires ` +
    `artifacts at specific locations, make committing your current best ` +
    `results to those exact locations your immediate next step, then ` +
    `continue refining them in place. Work kept only in scratch files or in ` +
    `this conversation earns no credit if the session is cut off. This is ` +
    `not a signal to finish early: keep working until every requirement is ` +
    `fully satisfied. If the deliverable is not a file, disregard and ` +
    `continue.`
  );
}

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

function isMidLoopToolTurn(event: {
  message?: { role?: unknown; stopReason?: unknown; content?: unknown };
}): boolean {
  const message = event.message;
  if (!message || message.role !== "assistant") return false;
  // Only steer while the tool loop is active; a finished run must never get
  // a queued message (that would be an unconditional second turn).
  if (message.stopReason !== "toolUse") return false;
  const content: ContentBlock[] = Array.isArray(message.content)
    ? (message.content as ContentBlock[])
    : [];
  return content.some((block) => block?.type === "toolCall");
}

function isWorkspaceMutation(event: {
  toolName?: unknown;
  input?: unknown;
}): boolean {
  if (event.toolName !== "write" && event.toolName !== "edit") return false;
  const input = (event.input ?? {}) as { path?: unknown };
  const path = typeof input.path === "string" ? input.path : "";
  // Scratch files do not count: work parked in /tmp earns no credit if the
  // session is cut, so it must not suppress the checkpoint.
  return !path.startsWith("/tmp/");
}

export default function install(pi: ExtensionAPI): void {
  let recoveries = 0;
  let toolTurns = 0;
  let workspaceMutations = 0;
  let firedCheckpoints = new Set<number>();

  pi.on("session_start", async () => {
    recoveries = 0;
    toolTurns = 0;
    workspaceMutations = 0;
    firedCheckpoints = new Set<number>();
  });

  pi.on("tool_call", async (event) => {
    try {
      if (isWorkspaceMutation(event)) {
        workspaceMutations += 1;
      }
    } catch {
      // Checkpoint bookkeeping must never break the session.
    }
  });

  pi.on("turn_end", async (event) => {
    try {
      if (isSilentTerminalTurn(event)) {
        if (recoveries < MAX_RECOVERIES_PER_SESSION) {
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
        }
        return;
      }

      if (!isMidLoopToolTurn(event)) return;
      toolTurns += 1;
      if (workspaceMutations > 0) return;
      for (let stage = 0; stage < CHECKPOINT_TURNS.length; stage += 1) {
        if (firedCheckpoints.has(stage)) continue;
        if (toolTurns < CHECKPOINT_TURNS[stage]) continue;
        firedCheckpoints.add(stage);
        pi.appendEntry("rsibench:control", {
          kind: "deliverable_checkpoint",
          stage,
          toolTurns,
          workspaceMutations,
        });
        pi.sendMessage(
          {
            customType: "rsibench-checkpoint",
            content: checkpointMessage(stage, toolTurns),
            display: false,
          },
          { deliverAs: "steer" },
        );
      }
    } catch {
      // Recovery control must never break the session.
    }
  });
}
