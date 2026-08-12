#!/usr/bin/env python3
"""Build deterministic RSIBench leaderboard indexes from run manifests."""

from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TRAJECTORIES = ROOT / "trajectories"
LEADERBOARD = ROOT / "leaderboard"
FIELDS = (
    "published_at_utc",
    "subset",
    "bench",
    "model",
    "harness",
    "run_id",
    "backend",
    "source_commit",
    "V_test_A0",
    "V_test_AT",
    "delta_test",
    "accepted_steps",
    "task_agent_tokens_A0",
    "task_agent_tokens_AT",
    "meta_agent_tokens",
    "task_agent_usd_A0",
    "task_agent_usd_AT",
    "meta_agent_usd",
    "module_ablation_task_agent_tokens",
    "module_ablation_task_agent_usd",
    "shared_module_ablation_task_agent_tokens",
    "shared_module_ablation_task_agent_usd",
    "pi_source_module_ablation_task_agent_tokens",
    "pi_source_module_ablation_task_agent_usd",
    "legacy_pi_workspace_component_scores",
    "shared_resources_component_scores",
    "pi_core_source_component_scores",
    "artifact_path",
)


def row_from_manifest(path: Path) -> dict[str, object]:
    manifest = json.loads(path.read_text())
    required = ("source_run_id", "subset", "bench", "model", "harness")
    missing = [key for key in required if not manifest.get(key)]
    if missing:
        raise ValueError(f"{path}: missing {', '.join(missing)}")
    score = manifest.get("score_and_cost") or {}
    row: dict[str, object] = {
        "published_at_utc": manifest.get("published_at_utc"),
        "subset": manifest["subset"],
        "bench": manifest["bench"],
        "model": manifest["model"],
        "harness": manifest["harness"],
        "run_id": manifest["source_run_id"],
        "backend": manifest.get("backend"),
        "source_commit": manifest.get("source_commit"),
        "artifact_path": path.parent.relative_to(ROOT).as_posix(),
    }
    for field in FIELDS:
        if field not in row:
            row[field] = score.get(field)
    layers = (manifest.get("ablations") or {}).get("layers") or {}
    for layer in (
        "legacy_pi_workspace",
        "shared_resources",
        "pi_core_source",
    ):
        payload = layers.get(layer) or {}
        row[f"{layer}_component_scores"] = json.dumps(
            payload.get("component_scores") or {}, sort_keys=True
        )
    return row


def main() -> int:
    manifests = sorted(TRAJECTORIES.glob("*/*/trajectory-manifest.json"))
    rows = [row_from_manifest(path) for path in manifests]
    rows.sort(key=lambda row: (str(row["subset"]), str(row["model"]), str(row["harness"]), str(row["run_id"])))
    LEADERBOARD.mkdir(parents=True, exist_ok=True)
    with (LEADERBOARD / "results.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    with (LEADERBOARD / "results.jsonl").open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    print(f"indexed {len(rows)} RSIBench runs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
