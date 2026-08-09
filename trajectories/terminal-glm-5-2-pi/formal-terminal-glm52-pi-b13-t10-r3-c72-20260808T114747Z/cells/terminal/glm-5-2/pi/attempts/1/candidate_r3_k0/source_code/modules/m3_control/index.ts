import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: get the agent to checkpoint its scored deliverable as early as
// possible, and recover it repeatedly (but boundedly) when the agent stalls in
// read-only investigation.
//
// Training trajectories (step_03) show a dominant zero-reward pattern: the
// agent writes a stub deliverable on its first turn (the before_first_turn
// nudge works), then sinks into a long read-only investigation loop
// (objdump/strings/grep/read) and never updates the deliverable again before
// the externally enforced task limit kills the run. The prior one-shot
// no-write-streak backstop fired exactly once at streak 8; the agent IGNORED
// that single steer and kept investigating for 10+ more turns until termination
// (path-tracing-reverse 3/3, raman-fitting 3/3, gcode-to-text r1/r2,
// mcmc-sampling-stan r1/r2, qemu-alpine-ssh r1/r2, configure-git-webserver r0,
// largest-eigenval r2). A one-shot `recoverySent` guard meant there was no
// escalation once the agent ignored the single nudge.
//
// This controller keeps the first-turn checkpoint nudge and the streak-8 first
// recovery, but makes recovery repeatable: if the agent keeps not writing, it
// re-fires every REPEAT_INTERVAL no-write turns up to MAX_INTERVENTIONS times.
// Each re-fire is a distinct foreground steer that re-surfaces the
// deliverable-checkpoint obligation. It is task-general (references only "the
// deliverable the task is scored on", derivable from the task text already in
// context), never task identity, paths, answers, or constants. Capped to avoid
// unbounded loops.
//
// Replay/exposure (step_03): the streak-8 trigger fires on 13 failing runs and
// 4 passing runs. The 4 passing runs either wrote again within 2 turns of the
// nudge (cobol r0: wrote@10) or ignored the nudge and passed on an earlier
// write (adaptive r2, feal r2, largest-eigenval r2). Re-fires are prose steers
// that remain ignorable, so a run that already ignored the first nudge and
// passed is not forced to overwrite a correct artifact. `nextMilestone` only
// advances (never resets on a write), so a write-then-stall needs a longer
// fresh stall before the next fire, keeping clean-pass exposure low.

const FIRST_STREAK_THRESHOLD = 8;
const REPEAT_INTERVAL = 3;
const MAX_INTERVENTIONS = 3;

export default function install(pi: ExtensionAPI): void {
  let consecutiveTurnsWithoutWrite = 0;
  let wroteThisTurn = false;
  let interventions = 0;
  let nextMilestone = FIRST_STREAK_THRESHOLD;

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
    if (wroteThisTurn) {
      consecutiveTurnsWithoutWrite = 0;
    } else {
      consecutiveTurnsWithoutWrite += 1;
    }
    wroteThisTurn = false;

    // Bounded recovery: fire at the first stall threshold, then re-fire every
    // REPEAT_INTERVAL no-write turns, up to MAX_INTERVENTIONS times per session.
    // nextMilestone only advances, so a write that resets the streak still
    // requires a longer fresh stall before the next fire (low clean-pass
    // exposure). The cap prevents unbounded follow-up loops.
    if (interventions >= MAX_INTERVENTIONS) return;
    if (consecutiveTurnsWithoutWrite < nextMilestone) return;

    interventions += 1;
    nextMilestone = consecutiveTurnsWithoutWrite + REPEAT_INTERVAL;

    pi.appendEntry("rsibench:mechanism", {
      kind: "control_recovery",
      trigger: "no_write_streak",
      streak: consecutiveTurnsWithoutWrite,
      intervention: interventions,
      turn: event.turnIndex,
    });

    const prefix =
      interventions === 1
        ? ""
        : `This is reminder ${interventions} of ${MAX_INTERVENTIONS}: you still have not written or edited any project file. `;
    const instruction =
      prefix +
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
