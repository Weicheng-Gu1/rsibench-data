#!/usr/bin/env python3
"""Correlate official Pi tool calls/results and compaction events."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def rows(path: Path) -> list[dict]:
    values = []
    for line in path.read_text(errors="replace").splitlines():
        try:
            value = json.loads(line)
        except ValueError:
            continue
        if isinstance(value, dict):
            values.append(value)
    return values


def correlate(values: list[dict], loader: dict) -> dict:
    calls = {}
    successful_results = set()
    hook_indexes, compact_indexes = [], []
    for index, row in enumerate(values):
        kind = row.get("type") or row.get("kind")
        call_id = row.get("toolCallId") or row.get("tool_call_id") or row.get("id")
        message = row.get("message") if isinstance(row.get("message"), dict) else row
        role = message.get("role")
        if role == "assistant" and isinstance(message.get("content"), list):
            for part in message["content"]:
                if not isinstance(part, dict) or part.get("type") != "toolCall":
                    continue
                part_id = part.get("id") or part.get("toolCallId")
                name = part.get("name") or part.get("toolName")
                if part_id and name:
                    calls[str(part_id)] = str(name)
        elif role == "toolResult":
            result_id = message.get("toolCallId") or message.get("tool_call_id")
            if result_id and message.get("isError", False) is not True and not message.get("error"):
                successful_results.add(str(result_id))
        elif kind == "tool_execution_start" and call_id:
            calls[str(call_id)] = str(row.get("toolName") or row.get("tool_name") or "")
        elif kind == "tool_execution_end" and call_id and row.get("isError", False) is not True and not row.get("error"):
            successful_results.add(str(call_id))
        if (
            row.get("type") == "custom"
            and row.get("customType") == "rsibench:mechanism"
            and isinstance(row.get("data"), dict)
            and row["data"].get("kind") == "session_before_compact"
        ):
            hook_indexes.append(index)
        if kind in {"compaction_start", "compaction"}:
            compact_indexes.append(index)
    registered = set(loader.get("tools", [])) if loader.get("ok") is True else set()
    successful_tools = sorted(
        {
            name
            for cid, name in calls.items()
            if cid in successful_results and name in registered
        }
    )
    return {
        "successful_custom_tools": successful_tools,
        "mcp_calls": sum(name.startswith("mcp__") for name in successful_tools),
        "compaction_policy_verified": any(hook < compact for hook in hook_indexes for compact in compact_indexes),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("session", type=Path)
    parser.add_argument("--loader-report", required=True, type=Path)
    args = parser.parse_args()
    loader = json.loads(args.loader_report.read_text())
    if not isinstance(loader, dict):
        raise SystemExit("loader report must be a JSON object")
    print(json.dumps(correlate(rows(args.session), loader), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
