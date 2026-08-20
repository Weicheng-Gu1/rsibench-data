#!/usr/bin/env python3
"""Summarize supplied RSIBench trajectory/score JSON without benchmark access."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def summarize(paths: list[Path]) -> dict:
    rows = []
    for path in paths:
        value = json.loads(path.read_text())
        if isinstance(value, list):
            rows.extend(item for item in value if isinstance(item, dict))
        elif isinstance(value, dict):
            rows.append(value)
    passed, failed, infrastructure = [], [], []
    for row in rows:
        task_id = str(row.get("task_id", "unknown"))
        if row.get("error"):
            infrastructure.append(task_id)
        elif float(row.get("reward", 0.0) or 0.0) > 0:
            passed.append(task_id)
        else:
            failed.append(task_id)
    return {
        "passed_task_ids": sorted(set(passed)),
        "failed_task_ids": sorted(set(failed)),
        "infrastructure_task_ids": sorted(set(infrastructure)),
        "records": len(rows),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    print(json.dumps(summarize(args.paths), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
