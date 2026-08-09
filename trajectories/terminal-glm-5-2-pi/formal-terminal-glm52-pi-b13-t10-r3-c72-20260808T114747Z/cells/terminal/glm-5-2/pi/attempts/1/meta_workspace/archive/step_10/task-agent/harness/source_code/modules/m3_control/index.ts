import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: two-phase, state-aware deliverable recovery.
//
// Evidence (step_02 clean failures, current harness). The dominant zero-reward
// pattern is NOT "agent never writes" — it is a two-phase stall:
//   Phase 1 (pre-write): the agent opens the task and spends its first turns in
//     read-only investigation (bash objdump/strings/grep + read). On the longest
//     failures (path-tracing-reverse, gcode-to-text, raman-fitting) it spends 8+
//     turns this way before any write.
//   Phase 2 (post-write): after the streak-8 nudge fires, the agent DOES write a
//     stub deliverable (path-tracing r0 writes mystery.c on turn 9; gcode r0
//     writes out.txt on turn 9; etc.) — proving it acts on the foreground
//     directive — but then immediately sinks BACK into read-only investigation
//     (objdump/strings/read) for 5-18 more turns and NEVER runs the task's own
//     check command on the artifact before the externally enforced task limit
//     kills the run. The verifier then reports the deliverable missing or wrong
//     (write-compressor: data.comp absent; path-tracing: image similarity too
//     low; gcode: out.txt wrong).
//
// Why the prior round-3 fix regressed: it made the streak-8 nudge REPEATABLE up
// to 3x, but re-sent the SAME stale "write a deliverable" prose. Once a
// deliverable already exists, that message is irrelevant and the agent correctly
// ignores it; repeating it 3x only added noise and the slice regressed (d_t=-0.08).
//
// This controller keeps the accepted before_first_turn nudge and the accepted
// one-shot pre-write streak-8 recovery, and adds exactly ONE additional,
// state-aware post-write recovery: once a file has been written, if the agent
// stalls again for POST_WRITE_STREAK_THRESHOLD consecutive no-write turns, fire
// a SINGLE distinct "verify-and-fix" message telling it to run the task's own
// check on the existing artifact and fix failing cases. It is bounded (<=2 fires
// total per session, each once), state-aware (branches on whether a write
// occurred), and task-general (references only "the deliverable the task is
// scored on" and "the task's own check command", both derivable from the task
// text already in context; never task identity, paths, answers, or constants).
//
// Trigger replay over step_02 (POST_WRITE_STREAK_THRESHOLD = 5):
//   post-write recovery fires on 13 failing/partial runs incl. all 6 pure-zero
//   gcode-to-text (3/3) and path-tracing-reverse (3/3) runs, plus configure-git
//   (3), largest-eigenval r0, mcmc r1/r2, qemu r2. It does NOT fire on the
//   tight-budget pattern-A failures (adaptive-rejection-sampler,
//   model-extraction, write-compressor) which are killed before any stall
//   threshold can be reached — those are near-unrecoverable via prose and are
//   not touched. Clean-pass exposure: fires on 3 passing runs (cobol r1, feal
//   r0/r1) where a "run the check and fix" nudge is benign (feal already runs
//   checks; cobol passes without checking so running it can only confirm). The
//   pre-write phase has the same exposure as the accepted round-2 harness (it
//   is the same streak-8 trigger, only gated to fire before any write).

const PRE_WRITE_STREAK_THRESHOLD = 8;
const POST_WRITE_STREAK_THRESHOLD = 5;

export default function install(pi: ExtensionAPI): void {
  let consecutiveTurnsWithoutWrite = 0;
  let wroteThisTurn = false;
  let everWrote = false;
  let preWriteRecoverySent = false;
  let verifyRecoverySent = false;

  // One-time foreground directive before the first model call. Accepted in
  // round 2; reaches runs that would be killed before any streak threshold can
  // fire. Unchanged.
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

  // Any file-producing tool call in the current turn resets the streak and
  // records that a deliverable has been placed at least once this session.
  pi.on("tool_call", (event) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      wroteThisTurn = true;
      everWrote = true;
    }
  });

  pi.on("turn_end", (event) => {
    if (wroteThisTurn) {
      consecutiveTurnsWithoutWrite = 0;
    } else {
      consecutiveTurnsWithoutWrite += 1;
    }
    wroteThisTurn = false;

    // Phase 1 — pre-write stall: no file has been written yet and the agent has
    // spent many turns only reading/inspecting. Nudge it to place a deliverable
    // now. Fires at most once; identical trigger to the accepted round-2 harness
    // (only additionally gated on !everWrote so it does not fire once a write
    // has happened).
    if (!preWriteRecoverySent && !everWrote && consecutiveTurnsWithoutWrite >= PRE_WRITE_STREAK_THRESHOLD) {
      preWriteRecoverySent = true;
      pi.appendEntry("rsibench:mechanism", {
        kind: "control_recovery",
        trigger: "no_write_streak",
        phase: "pre_write",
        streak: consecutiveTurnsWithoutWrite,
        turn: event.turnIndex,
      });
      const instruction =
        "Checkpoint: you have made several tool calls in a row without writing or " +
        "editing any project file. This task is scored on a deliverable artifact " +
        "and the run can be terminated at any time without warning. Right now: " +
        "(1) from the task instructions, identify the exact file path and format " +
        "of the deliverable it is scored on; (2) if that deliverable does not " +
        "already exist at that path, write your best current version of it now, " +
        "even if imperfect; (3) run the task's own check command against that " +
        "real artifact to confirm it works. Then continue improving. Do not let " +
        "the run end with no deliverable in place.";
      pi.sendMessage(
        { customType: "rsibench-control", content: instruction, display: false },
        { deliverAs: "steer", triggerTurn: true },
      );
      return;
    }

    // Phase 2 — post-write stall: a deliverable has already been written, but
    // the agent has since spent several turns only reading/inspecting again
    // without touching it. This is the dominant observed zero-reward pattern:
    // the agent writes a stub, then sinks back into investigation and never
    // verifies/improves the artifact before the task limit kills the run. Nudge
    // it ONCE to act on the existing deliverable and fix the first concrete
    // discrepancy (a different, state-appropriate message from phase 1, not a
    // repeat of the stale "write a deliverable" nudge). Fires at most once.
    //
    // step_09 defect fixed here: the prior message told the agent to "run the
    // task's own check command". In cobol-modernization r0 that nudge DID fire
    // (streak 5, turn 3) but the agent dismissed it in its own thinking —
    // "there's no explicit check command in the task" — because the verifier is
    // a hidden pytest with no visible command in the task text, so that
    // actionable step had no referent and the agent continued read-only
    // investigation until the task limit killed it with balances never updated.
    // The rewritten message below makes the first step always actionable with
    // no such precondition: execute the deliverable file you already wrote,
    // inspect its actual output/produced files, and fix the first concrete
    // discrepancy versus the task's stated expected behavior. A visible check
    // command is offered only as a fallback when one exists. The trigger,
    // threshold, fire count, and clean-pass exposure are unchanged from the
    // accepted round-4 harness; only the dismissed message content is corrected.
    if (!verifyRecoverySent && everWrote && consecutiveTurnsWithoutWrite >= POST_WRITE_STREAK_THRESHOLD) {
      verifyRecoverySent = true;
      pi.appendEntry("rsibench:mechanism", {
        kind: "control_recovery",
        trigger: "post_write_stall",
        phase: "post_write",
        streak: consecutiveTurnsWithoutWrite,
        turn: event.turnIndex,
      });
      const instruction =
        "Checkpoint: a deliverable file already exists, but you have spent the " +
        "last several turns reading or inspecting without touching it. This task " +
        "is scored on whether your deliverable actually passes, not on how much " +
        "you investigated, and the run can be terminated at any time without " +
        "warning. Stop investigating and act on the artifact now. Right now: " +
        "(1) execute the deliverable you already wrote — run the script, program, " +
        "or command that produces the scored output, directly against the real " +
        "artifact (not against your construction assumptions); if the task text " +
        "names an explicit test or check command, run that against the artifact " +
        "instead; (2) read the actual output it prints or the files it produces " +
        "and compare them against what the task says the output should be; " +
        "(3) edit the real deliverable to fix the first concrete discrepancy you " +
        "find, then re-run it. Keep a passing artifact in place at all times. Do " +
        "not keep exploring or reverse-engineering while an unverified deliverable " +
        "sits unchanged.";
      pi.sendMessage(
        { customType: "rsibench-control", content: instruction, display: false },
        { deliverAs: "steer", triggerTurn: true },
      );
    }
  });
}
