import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M3 Control: deliverable-first recovery with exec-grounded verification.
//
// Prior rounds (1-4) all used M3 prose recovery. The accepted pieces are kept
// unchanged: (a) the before_first_turn foreground directive (accepted round 2,
// reaches runs killed before any turn_end streak can fire), and (b) the
// one-shot pre-write streak-8 recovery (accepted round 2).
//
// What step_05 clean-failure evidence shows about the round-4 post-write
// recovery: the post-write stall trigger FIRES on the cited long-budget zero-
// reward runs (gcode-to-text r1/r2, path-tracing-reverse 3/3, raman-fitting
// 3/3 — 8 runs, confirmed by rsibench:mechanism control_recovery entries in the
// recorded trajectories) but those runs STILL score 0. The agent receives the
// generic "run the task's own check command" prose and does not pivot, because
// for reverse-engineering / output-matching tasks the verifier is HIDDEN and
// there is no visible check command to run. Rephrasing that prose would repeat
// an exhausted mechanism.
//
// This slice replaces the generic post-write prose with an OBJECTIVE,
// exec-grounded recovery: when the post-write stall fires, M3 itself runs
// `pi.exec` to inspect the deliverable the agent already wrote (existence, byte
// size, and a read-only syntax check for code files), records that structured
// status via appendEntry, and sends a steer message that EMBEDS the concrete
// status and tells the agent how to construct a self-check from VISIBLE
// artifacts (reference program/expected output/documented behavior) when no
// check command is given. M3 now inspects objective structured evidence rather
// than re-emitting prose. It is bounded (fires at most once per session, <=2
// read-only exec calls, all guarded) and uses the same streak-5 trigger already
// accepted in round 4, so its firing set (and clean-pass exposure) is unchanged
// from the accepted harness — only the recovery action is upgraded.
//
// The tight-budget failures (write-compressor 3/3, feal 3/3) are killed after
// ~1 turn / ~2.3k tokens by the externally enforced task limit, before any
// turn_end streak can fire; only the before_first_turn nudge reaches them, and
// that is unchanged here. They are not addressed by any turn-based recovery and
// are not claimed as covered.
//
// Trigger replay (step_05, POST_WRITE_STREAK_THRESHOLD = 5, same as round 4):
//   Fires (8): gcode r1/r2, path-tracing r0/r1/r2, raman r0/r1/r2.
//   Does not fire: gcode r0 (wrote frequently, no 5-turn gap), all tight-budget
//   tasks (killed before turn_end).
//   Clean-pass exposure: bounded to the same runs the round-4 trigger already
//   exposed (~3 passing runs per the round-4 replay); the added exec is
//   read-only and benign there.

const PRE_WRITE_STREAK_THRESHOLD = 8;
const POST_WRITE_STREAK_THRESHOLD = 5;

interface DeliverableStatus {
  path: string;
  exists: boolean;
  size: number;
  syntax: string | null; // "ok" | "failed: <line>" | "unavailable" | null (not a code file)
}

// Read-only structural inspection of the most recently written deliverable.
// Every call is guarded: any exec failure degrades gracefully (status reflects
// what could be determined) and never blocks the recovery message.
async function inspectDeliverable(
  pi: ExtensionAPI,
  path: string,
): Promise<DeliverableStatus> {
  const status: DeliverableStatus = {
    path,
    exists: false,
    size: -1,
    syntax: null,
  };
  if (!path) return status;

  try {
    const stat = await pi.exec("stat", ["-c", "%s", path], { timeout: 5000 });
    if (stat.code === 0) {
      status.exists = true;
      const parsed = parseInt(stat.stdout.trim(), 10);
      status.size = Number.isFinite(parsed) ? parsed : -1;
    } else {
      return status; // file missing
    }
  } catch {
    return status; // exec unavailable; treat as unknown existence
  }

  const probe = syntaxProbe(path);
  if (!probe) return status; // non-code file: existence + size only

  try {
    const result = await pi.exec(probe.cmd, probe.args, { timeout: 10000 });
    if (result.code === 0) {
      status.syntax = "ok";
    } else {
      const first = (result.stderr || result.stdout || "").trim().split("\n")[0];
      status.syntax = first ? `failed: ${first}` : "failed";
    }
  } catch {
    status.syntax = "unavailable"; // interpreter/compiler not present
  }
  return status;
}

function syntaxProbe(
  path: string,
): { cmd: string; args: string[] } | null {
  if (path.endsWith(".py")) {
    return {
      cmd: "python3",
      args: [
        "-c",
        "import sys; compile(open(sys.argv[1]).read(), sys.argv[1], 'exec')",
        path,
      ],
    };
  }
  if (path.endsWith(".c") || path.endsWith(".h")) {
    return { cmd: "gcc", args: ["-fsyntax-only", path] };
  }
  if (path.endsWith(".js") || path.endsWith(".mjs")) {
    return { cmd: "node", args: ["--check", path] };
  }
  return null;
}

function statusLine(status: DeliverableStatus): string {
  if (!status.path) {
    return "No deliverable file path was recorded from your recent writes.";
  }
  if (!status.exists) {
    return `Your last-written deliverable ${status.path} no longer exists at that path.`;
  }
  const parts: string[] = [`exists (${status.size} bytes)`];
  if (status.syntax === "ok") {
    parts.push("syntax check: OK");
  } else if (status.syntax && status.syntax !== "unavailable") {
    parts.push(`syntax check: ${status.syntax}`);
  }
  return `Your deliverable ${status.path} ${parts.join("; ")}.`;
}

function buildVerifyInstruction(status: DeliverableStatus): string {
  return (
    "Checkpoint: a deliverable file already exists, but you have spent the " +
    "last several turns reading or inspecting without touching it. " +
    statusLine(status) +
    " This task is scored on whether your deliverable actually passes, not " +
    "on how much you investigated, and the run can be terminated at any time " +
    "without warning. Right now: (1) run your deliverable against the task's " +
    "VISIBLE reference — if the task gives you a reference program, binary, " +
    "or expected output file, pipe your deliverable's output through it and " +
    "compare; if no reference is visible, write a tiny check that exercises " +
    "the behavior the task documents; (2) read the first failing case or " +
    "mismatch it prints; (3) edit the real deliverable to fix that case, then " +
    "re-run the check. Keep a passing artifact in place at all times. Do not " +
    "keep investigating while an unverified deliverable sits unchanged."
  );
}

export default function install(pi: ExtensionAPI): void {
  let consecutiveTurnsWithoutWrite = 0;
  let wroteThisTurn = false;
  let everWrote = false;
  let preWriteRecoverySent = false;
  let verifyRecoverySent = false;
  let lastWrittenPath = "";

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
  // records the deliverable path (used by the post-write recovery to inspect
  // the actual artifact).
  pi.on("tool_call", (event) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      wroteThisTurn = true;
      everWrote = true;
      const input =
        (event as { input?: unknown }).input ??
        (event as { args?: unknown }).args ??
        {};
      const p = String((input as { path?: unknown }).path ?? "");
      if (p) lastWrittenPath = p;
    }
  });

  pi.on("turn_end", async (event) => {
    if (wroteThisTurn) {
      consecutiveTurnsWithoutWrite = 0;
    } else {
      consecutiveTurnsWithoutWrite += 1;
    }
    wroteThisTurn = false;

    // Phase 1 — pre-write stall: no file has been written yet and the agent has
    // spent many turns only reading/inspecting. Nudge it to place a deliverable
    // now. Fires at most once; identical trigger to the accepted round-2 harness
    // (only additionally gated on !everWrote).
    if (
      !preWriteRecoverySent &&
      !everWrote &&
      consecutiveTurnsWithoutWrite >= PRE_WRITE_STREAK_THRESHOLD
    ) {
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
    // without touching it. This is the dominant observed zero-reward pattern on
    // long-budget tasks. Instead of re-emitting generic prose, M3 inspects the
    // ACTUAL deliverable (existence/size/syntax) via exec and embeds that
    // objective status in a bounded, once-per-session recovery that tells the
    // agent how to self-verify against visible artifacts.
    if (
      !verifyRecoverySent &&
      everWrote &&
      consecutiveTurnsWithoutWrite >= POST_WRITE_STREAK_THRESHOLD
    ) {
      verifyRecoverySent = true;
      pi.appendEntry("rsibench:mechanism", {
        kind: "control_recovery",
        trigger: "post_write_stall",
        phase: "post_write",
        streak: consecutiveTurnsWithoutWrite,
        turn: event.turnIndex,
      });
      const status = await inspectDeliverable(pi, lastWrittenPath);
      pi.appendEntry("rsibench:mechanism", {
        kind: "deliverable_status",
        path: lastWrittenPath,
        exists: status.exists,
        size: status.size,
        syntax: status.syntax,
      });
      pi.sendMessage(
        {
          customType: "rsibench-control",
          content: buildVerifyInstruction(status),
          display: false,
        },
        { deliverAs: "steer", triggerTurn: true },
      );
    }
  });
}
