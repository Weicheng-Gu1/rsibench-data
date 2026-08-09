import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: get the agent to checkpoint its scored deliverable as early as
// possible, and recover it once if the agent stalls in read-only investigation.
//
// Training trajectories (step_02) show a dominant zero-reward pattern: the agent
// opens the task, spends its first turns reading/inspecting with bash+read, and
// is then terminated by the externally enforced task limit before it ever writes
// the scored deliverable artifact. The tightest-budget tasks (write-compressor,
// model-extraction-relu-logits) were killed after only 1-2 assistant turns of
// pure reading; the prior no-write-streak(8) backstop could never reach them
// because they never got 8 turns. Other long-running failures (gcode-to-text,
// path-tracing-reverse, raman-fitting, largest-eigenval) DID reach streak 8, the
// backstop fired, and the agent responded by immediately writing a stub
// deliverable — proving the agent acts on these foreground directives.
//
// This controller therefore applies the deliverable-checkpoint nudge at the
// earliest observable point — before the first model call — as a one-time
// foreground message, and retains the streak backstop for runs that survive
// long enough to stall in investigation. Both interventions are task-general:
// they reference only "the deliverable the task is scored on" (derivable from
// the task text already in context), never task identity, paths, answers, or
// constants. Each fires at most once per session.

const NO_WRITE_STREAK_THRESHOLD = 8;

export default function install(pi: ExtensionAPI): void {
  let consecutiveTurnsWithoutWrite = 0;
  let wroteThisTurn = false;
  let recoverySent = false;

  // One-time foreground directive before the first model call. The agent has
  // the task text in context but has not yet committed to reading first. This
  // reaches runs that would otherwise be killed before the streak backstop can
  // fire. It is a control message (not a system-prompt paraphrase): it injects a
  // distinct foreground instruction the agent must address on its first turn.
  pi.on("before_agent_start", async () => {
    pi.appendEntry("rsibench:mechanism", {
      kind: "control_recovery",
      trigger: "before_first_turn",
      turn: 0,
    });
    const instruction =
      "This run is scored on a concrete deliverable artifact and can be " +
      "terminated at any time without warning, often after only a few actions. " +
      "Before you read or explore, do this on your very first action: identify " +
      "the exact file path and format of the deliverable the task is scored on " +
      "from the task text, then write a minimal but valid version of that " +
      "deliverable at that path immediately — even if incomplete. A stub " +
      "deliverable already in place is strictly better than none, because the " +
      "run is frequently killed mid-investigation before the final artifact is " +
      "written. After the stub exists, read what you need and improve the real " +
      "deliverable, re-running the task's own check command on it. Do not let " +
      "the run end with no deliverable at the required path.";
    return {
      message: {
        customType: "rsibench-control",
        content: instruction,
        display: false,
      },
    };
  });

  // Any file-producing tool call in the current turn resets the streak.
  pi.on("tool_call", (event) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      wroteThisTurn = true;
    }
  });

  pi.on("turn_end", (event) => {
    if (recoverySent) return;

    if (wroteThisTurn) {
      consecutiveTurnsWithoutWrite = 0;
    } else {
      consecutiveTurnsWithoutWrite += 1;
    }
    wroteThisTurn = false;

    if (consecutiveTurnsWithoutWrite < NO_WRITE_STREAK_THRESHOLD) return;

    recoverySent = true;
    pi.appendEntry("rsibench:mechanism", {
      kind: "control_recovery",
      trigger: "no_write_streak",
      streak: consecutiveTurnsWithoutWrite,
      turn: event.turnIndex,
    });

    const instruction =
      "Checkpoint: you have made several tool calls in a row without writing or " +
      "editing any project file. This task is scored on a deliverable artifact and " +
      "the run can be terminated at any time without warning. Right now: " +
      "(1) from the task instructions, identify the exact file path and format of " +
      "the deliverable it is scored on; (2) if that deliverable does not already " +
      "exist at that path, write your best current version of it now, even if " +
      "imperfect; (3) run the task's own check command against that real artifact " +
      "to confirm it works. Then continue improving. Do not let the run end with " +
      "no deliverable in place.";

    pi.sendMessage(
      { customType: "rsibench-control", content: instruction, display: false },
      { deliverAs: "steer", triggerTurn: true },
    );
  });
}
