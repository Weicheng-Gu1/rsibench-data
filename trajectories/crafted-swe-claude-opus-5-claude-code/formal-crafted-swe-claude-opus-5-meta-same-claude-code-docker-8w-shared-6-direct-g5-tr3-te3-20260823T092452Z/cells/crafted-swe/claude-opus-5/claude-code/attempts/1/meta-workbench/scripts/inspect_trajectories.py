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
    outcomes_by_task: dict[str, dict[str, list[int]]] = {}
    for index, row in enumerate(rows):
        task_id = str(row.get("task_id", "unknown"))
        repeat = row.get("repeat_index", index)
        try:
            repeat = int(repeat)
        except (TypeError, ValueError):
            repeat = index
        buckets = outcomes_by_task.setdefault(
            task_id, {"passed_repeats": [], "failed_repeats": []}
        )
        if row.get("error"):
            infrastructure.append(task_id)
        elif float(row.get("reward", 0.0) or 0.0) > 0:
            passed.append(task_id)
            buckets["passed_repeats"].append(repeat)
        else:
            failed.append(task_id)
            buckets["failed_repeats"].append(repeat)
    # A task with both passing and failing clean repeats is the highest-value
    # diagnosis target: the within-task contrast isolates the causal action.
    # Read EVERY repeat of these tasks, not a sample.
    mixed = {
        task_id: {
            "passed_repeats": sorted(buckets["passed_repeats"]),
            "failed_repeats": sorted(buckets["failed_repeats"]),
        }
        for task_id, buckets in outcomes_by_task.items()
        if buckets["passed_repeats"] and buckets["failed_repeats"]
    }
    return {
        "passed_task_ids": sorted(set(passed)),
        "failed_task_ids": sorted(set(failed)),
        "infrastructure_task_ids": sorted(set(infrastructure)),
        "mixed_outcome_tasks": {key: mixed[key] for key in sorted(mixed)},
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
