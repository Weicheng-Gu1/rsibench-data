#!/usr/bin/env python3
"""Fail closed unless Claude registered and used the frozen meta workbench."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def collect(trace: Path) -> dict[str, set[str]]:
    evidence = {"registered": set(), "invoked": set(), "read": set()}
    for line in trace.read_text(errors="replace").splitlines():
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if row.get("type") == "system" and row.get("subtype") == "init":
            evidence["registered"].update(
                value for value in row.get("skills", []) if isinstance(value, str)
            )
        message = row.get("message")
        if not isinstance(message, dict):
            continue
        for item in message.get("content", []):
            if not isinstance(item, dict) or item.get("type") != "tool_use":
                continue
            value = item.get("input")
            if not isinstance(value, dict):
                continue
            if item.get("name") == "Skill" and isinstance(value.get("skill"), str):
                evidence["invoked"].add(value["skill"])
            if item.get("name") == "Read" and isinstance(value.get("file_path"), str):
                evidence["read"].add(value["file_path"])
    return evidence


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trace", required=True, type=Path)
    parser.add_argument("--expected-skill", action="append", default=[])
    parser.add_argument("--required-skill", action="append", default=[])
    parser.add_argument("--required-read", action="append", default=[])
    args = parser.parse_args()
    if not args.trace.is_file():
        print(json.dumps({"ok": False, "error": "trace is missing"}))
        return 2
    evidence = collect(args.trace)
    missing = {
        "registered": sorted(set(args.expected_skill) - evidence["registered"]),
        "invoked": sorted(set(args.required_skill) - evidence["invoked"]),
        "read": sorted(set(args.required_read) - evidence["read"]),
    }
    report = {
        "ok": not any(missing.values()),
        "registered": sorted(evidence["registered"]),
        "invoked": sorted(evidence["invoked"]),
        "read": sorted(evidence["read"]),
        "missing": missing,
    }
    print(json.dumps(report, sort_keys=True))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
