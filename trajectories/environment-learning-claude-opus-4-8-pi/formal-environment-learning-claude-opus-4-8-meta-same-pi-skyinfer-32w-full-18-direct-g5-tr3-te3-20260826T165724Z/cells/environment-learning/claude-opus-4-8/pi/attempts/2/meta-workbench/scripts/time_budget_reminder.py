#!/usr/bin/env python3
"""PostToolUse wall-clock reminder for the Claude Code / Codex meta-agent.

Invoked by the frozen ``.claude/settings.json`` / ``.codex/hooks.json`` hook
declared at ``/app/.claude/settings.json`` and ``/app/.codex/hooks.json``
(separate from, and outside of, the editable task-agent harness surface).
Reads the deadline the controller computed from ``cfg.meta_run_timeout`` and,
the first time each fraction of the budget is crossed, returns
``hookSpecificOutput.additionalContext`` so the reminder reaches the model
through the same channel a normal tool result would. A hook fires on every
matching lifecycle event regardless of what the model does, so this is the
one part of the schedule that does not depend on the model remembering to
check the time itself.

Silently no-ops (prints an empty ``{"continue": true}``) when the deadline
env vars are absent or malformed, so a misconfigured or missing budget never
blocks the tool call it is attached to.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

_THRESHOLDS: tuple[tuple[float, str], ...] = (
    (
        0.90,
        "TIME BUDGET 90% USED. Submit NOW: the real edit must already be on "
        "disk. Run the frozen candidate check, repair every failure it "
        "reports, and finish. Do not start a new investigation or edit.",
    ),
    (
        0.70,
        "TIME BUDGET 70% USED. Stop exploring and finish the evidence-backed "
        "change now. Get the edit on disk, run the frozen candidate check, "
        "and repair every failure it reports in this same session.",
    ),
    (
        0.50,
        "TIME BUDGET 50% USED. If you have not yet identified the causal "
        "mechanism from a passing/failing trajectory pair, do so now; do "
        "not spend the remaining budget still investigating.",
    ),
)


def _emit(context: str | None) -> None:
    payload: dict = {"continue": True}
    if context:
        payload["hookSpecificOutput"] = {
            "hookEventName": "PostToolUse",
            "additionalContext": context,
        }
    print(json.dumps(payload))


def _fired_events(events_path: Path | None) -> set[str]:
    fired: set[str] = set()
    if events_path is None or not events_path.is_file():
        return fired
    for line in events_path.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        name = row.get("event") if isinstance(row, dict) else None
        if isinstance(name, str):
            fired.add(name)
    return fired


def main() -> int:
    # A hook receives the tool-call payload on stdin; this reminder does not
    # need it, but the process must not block waiting for a pipe the caller
    # never intends us to read.
    try:
        if not sys.stdin.isatty():
            sys.stdin.read()
    except (OSError, ValueError):
        pass

    try:
        started = int(os.environ["RSIBENCH_META_STARTED_EPOCH_MS"])
        deadline = int(os.environ["RSIBENCH_META_DEADLINE_EPOCH_MS"])
    except (KeyError, ValueError):
        _emit(None)
        return 0
    span = deadline - started
    if span <= 0:
        _emit(None)
        return 0
    fraction = (int(time.time() * 1000) - started) / span

    events_value = os.environ.get("RSIBENCH_META_TIME_BUDGET_EVENTS", "")
    events_path = Path(events_value) if events_value else None
    fired = _fired_events(events_path)

    for threshold, message in _THRESHOLDS:
        name = f"reminder_{int(threshold * 100)}"
        if fraction < threshold or name in fired:
            continue
        if events_path is not None:
            events_path.parent.mkdir(parents=True, exist_ok=True)
            with events_path.open("a", encoding="utf-8") as handle:
                handle.write(
                    json.dumps(
                        {
                            "event": name,
                            "fraction": fraction,
                            "timestamp_unix": time.time(),
                        }
                    )
                    + "\n"
                )
        _emit(message)
        return 0

    _emit(None)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
