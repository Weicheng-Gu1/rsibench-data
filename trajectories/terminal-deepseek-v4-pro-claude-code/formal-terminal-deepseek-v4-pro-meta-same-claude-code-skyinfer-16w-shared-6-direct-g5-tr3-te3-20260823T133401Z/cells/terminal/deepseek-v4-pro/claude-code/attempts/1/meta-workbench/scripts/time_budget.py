#!/usr/bin/env python3
"""Deterministic 50%/70%/90% time-budget reminders for Meta-agent sessions.

The controller exports ``RSIBENCH_META_BUDGET_SECONDS`` into the Meta
sandbox. The budget clock starts at this script's first invocation (agent
runtime, not container setup), recorded in a state file. Each threshold
fires exactly once.

Two entry modes share the same state:

- default: print the highest newly-crossed reminder to stdout (used by
  agents that run this script between phases, per AGENT.md).
- ``--hook``: consume a Claude Code PostToolUse hook payload on stdin and
  emit ``hookSpecificOutput.additionalContext`` JSON when a reminder is
  newly crossed. Always exits 0; a reminder must never break a session.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

STATE_PATH = Path(
    os.environ.get("RSIBENCH_META_TIME_BUDGET_STATE")
    or "/tmp/rsibench-meta-time-budget.json"
)

REMINDERS = (
    (
        0.50,
        "reminder_50",
        "TIME BUDGET 50% USED. Finish analysis now and write the actual "
        "code changes to disk. Do not keep browsing without editing.",
    ),
    (
        0.70,
        "reminder_70",
        "TIME BUDGET 70% USED. Stop exploration. Verify the on-disk changes "
        "load and pass the required proposal checks, repair every failure, "
        "and prepare the submission.",
    ),
    (
        0.90,
        "reminder_90",
        "TIME BUDGET 90% USED. Submit NOW. Finalize and return the "
        "submission immediately; an unsubmitted candidate scores zero. Do "
        "not start a new check, edit, or investigation.",
    ),
)


def _load_state() -> dict:
    try:
        value = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if isinstance(value, dict) and isinstance(value.get("started_at"), (int, float)):
            return value
    except (OSError, ValueError):
        pass
    return {"started_at": time.time(), "fired": []}


def _save_state(state: dict) -> None:
    try:
        STATE_PATH.write_text(
            json.dumps(state, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    except OSError:
        pass


def pending_reminder(now: float | None = None) -> str | None:
    """Return the highest newly-crossed reminder message, marking it fired."""

    raw_budget = os.environ.get("RSIBENCH_META_BUDGET_SECONDS", "").strip()
    try:
        budget = float(raw_budget)
    except ValueError:
        return None
    if budget <= 0:
        return None
    state = _load_state()
    now = time.time() if now is None else now
    elapsed = now - float(state["started_at"])
    fired = set(state.get("fired") or [])
    message: str | None = None
    for fraction, kind, text in REMINDERS:
        if elapsed >= budget * fraction and kind not in fired:
            fired.add(kind)
            message = text
    state["fired"] = sorted(fired)
    _save_state(state)
    return message


def main() -> int:
    hook_mode = "--hook" in sys.argv[1:]
    if hook_mode:
        try:
            sys.stdin.read()
        except OSError:
            pass
    message = pending_reminder()
    if message is None:
        return 0
    if hook_mode:
        print(
            json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PostToolUse",
                        "additionalContext": message,
                    }
                }
            )
        )
    else:
        print(message)
    return 0


if __name__ == "__main__":
    sys.exit(main())
