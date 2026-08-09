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

// True when a bash command likely creates or modifies a file in the task
// workspace. The recovery state machine below uses this only to keep its
// "has a deliverable been produced?" flag accurate. False positives are
// benign: they merely suppress the pre-write "write a deliverable now" nudge
// for one turn. False negatives fall back to the existing write/edit detection.
// Task-general: it matches shell command structure only — never task identity,
// paths, answers, or constants.
// Evidence (step_06): sanitize-git-repo r1/r2 did all deliverable work via
// `sed -i` in bash (0 write/edit calls), so everWrote stayed false and the
// pre-write nudge fired AFTER the work was already done; write-compressor r0
// created data.comp via `touch` in bash with the same effect. Counting these
// bash mutations as writes removes that false, mid-work nudge and lets the
// post-write phase engage on the correct state.
function bashMutatesFile(command: string): boolean {
  // In-place stream-editor edit.
  if (/\bsed\b[^|]*?(?:-i|--in-place)\b/.test(command)) return true;
  // File creation / copy / move / tee.
  if (/\b(?:touch|cp|mv|tee)\b/.test(command)) return true;
  if (/\bdd\b[^|]*?\bof=/.test(command)) return true;
  // stdout redirect (> or >>) to a real path. Excludes fd merges (2>&1, &>)
  // by requiring a non-digit, non-& char before the redirect, and excludes
  // /dev/null targets.
  const redirects = command.match(/(?:^|[^0-9&|>])>{1,2}\s*[^&|\s]+/g);
  if (redirects) {
    for (const r of redirects) {
      const target = r.replace(/^[^>]*>{1,2}\s*/, "");
      if (target && !target.startsWith("/dev/null")) return true;
    }
  }
  // Inline interpreter opening a file for writing/appending.
  if (/\b(?:python|python3|perl|ruby)\b/.test(command) && /open\s*\([^)]*['"][wax]/.test(command)) return true;
  return false;
}

export default function install(pi: ExtensionAPI): void {
  let consecutiveTurnsWithoutWrite = 0;
  let wroteThisTurn = false;
  let everWrote = false;
  let preWriteRecoverySent = false;
  let verifyRecoverySent = false;
  let bashMutationLogged = false;

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
  // This also counts file-mutating bash commands (sed -i, touch, cp/mv, tee,
  // dd of=, stdout redirect, inline interpreter open(...,'w')): many agents
  // produce their deliverable via shell redirection rather than write/edit, and
  // without this everWrote stays false so the pre-write nudge fires after the
  // work is already done (step_06 sanitize-git-repo r1/r2 via sed -i;
  // write-compressor r0 via touch).
  pi.on("tool_call", (event) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      wroteThisTurn = true;
      everWrote = true;
      return;
    }
    if (event.toolName === "bash") {
      const command = String(
        (event.input as { command?: unknown } | undefined)?.command ?? "",
      );
      if (command && bashMutatesFile(command)) {
        wroteThisTurn = true;
        everWrote = true;
        if (!bashMutationLogged) {
          bashMutationLogged = true;
          pi.appendEntry("rsibench:mechanism", {
            kind: "bash_write_detected",
            toolName: "bash",
          });
        }
      }
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
    // it ONCE to run the task's own check on the existing deliverable and fix
    // the failing cases (a different, state-appropriate message from phase 1,
    // not a repeat of the stale "write a deliverable" nudge). Fires at most once.
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
        "warning. Right now: (1) run the task's own check command from the task " +
        "instructions against your current deliverable artifact directly (not " +
        "against your construction assumptions); (2) read the failing test or " +
        "case output it prints; (3) edit the real deliverable to fix the first " +
        "failing case, then re-run the check. Keep a passing artifact in place " +
        "at all times. Do not keep investigating while an unverified deliverable " +
        "sits unchanged.";
      pi.sendMessage(
        { customType: "rsibench-control", content: instruction, display: false },
        { deliverAs: "steer", triggerTurn: true },
      );
    }
  });
}
