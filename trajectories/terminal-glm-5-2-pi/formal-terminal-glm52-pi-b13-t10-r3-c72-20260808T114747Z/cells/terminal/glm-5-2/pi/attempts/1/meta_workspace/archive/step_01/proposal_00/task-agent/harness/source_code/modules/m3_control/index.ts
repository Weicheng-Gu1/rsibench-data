import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: bounded recovery when the agent spends many consecutive turns
// calling tools without writing or editing any project file.
//
// Training trajectories show a dominant zero-reward pattern: the agent keeps
// investigating (read/bash only) until the externally enforced task limit
// terminates the run mid-investigation, leaving the required deliverable
// artifact unwritten. This controller observes that pattern in the official
// tool_call/turn_end events and schedules at most ONE steer message prompting
// the agent to checkpoint its deliverable. It never blocks a tool, fires at
// most once per session, and triggers only on a task-general, observable
// signal (a streak of turns with no write/edit tool call), not on task
// identity, paths, or constants.

const NO_WRITE_STREAK_THRESHOLD = 8;

export default function install(pi: ExtensionAPI): void {
  let consecutiveTurnsWithoutWrite = 0;
  let wroteThisTurn = false;
  let recoverySent = false;

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
