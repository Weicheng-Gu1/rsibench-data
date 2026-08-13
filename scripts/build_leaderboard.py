#!/usr/bin/env python3
"""Build deterministic RSIBench leaderboard indexes from run manifests."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from submission_common import (
    TRUSTED_INDEX,
    artifact_path_for_manifest,
    load_receipts,
    manifest_paths,
    trusted_site_record,
)


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
    "submitted_by_github",
    "github_user_id",
    "pull_request",
    "merge_commit",
    "submission_receipt",
    "V_test_A0",
    "V_test_AT",
    "delta_test",
    "V_test_Astar",
    "V_test_A0_only_M1",
    "V_test_A0_only_M2",
    "V_test_A0_only_M3",
    "V_test_A0_only_M4",
    "V_test_A0_only_M5",
    "V_test_A0_only_M6",
    "V_test_A0_only_M7",
    "V_test_A0_only_M8",
    "V_test_A0_only_M9",
    "V_test_A0_only_M10",
    "reward_Astar",
    "reward_A0_only_M1",
    "reward_A0_only_M2",
    "reward_A0_only_M3",
    "reward_A0_only_M4",
    "reward_A0_only_M5",
    "reward_A0_only_M6",
    "reward_A0_only_M7",
    "reward_A0_only_M8",
    "reward_A0_only_M9",
    "reward_A0_only_M10",
    "accepted_steps",
    "task_agent_tokens_A0",
    "task_agent_tokens_AT",
    "meta_agent_tokens",
    "task_agent_usd_A0",
    "task_agent_usd_AT",
    "meta_agent_usd",
    "module_ablation_task_agent_tokens",
    "module_ablation_task_agent_usd",
    "module_ablation_actual_usd",
    "module_ablation_actual_usd_status",
    "module_ablation_status",
    "shared_module_ablation_task_agent_tokens",
    "shared_module_ablation_task_agent_usd",
    "pi_source_module_ablation_task_agent_tokens",
    "pi_source_module_ablation_task_agent_usd",
    "legacy_pi_workspace_component_scores",
    "shared_resources_component_scores",
    "pi_core_source_component_scores",
    "artifact_path",
)


def row_from_manifest(
    path: Path, receipts: dict[str, dict[str, object]]
) -> tuple[dict[str, object], dict[str, object] | None]:
    manifest = json.loads(path.read_text())
    required = ("source_run_id", "subset", "bench", "model", "harness")
    missing = [key for key in required if not manifest.get(key)]
    if missing:
        raise ValueError(f"{path}: missing {', '.join(missing)}")
    score = manifest.get("score_and_cost") or {}
    artifact_path = artifact_path_for_manifest(ROOT, path)
    receipt = receipts.get(artifact_path)
    row: dict[str, object] = {
        "published_at_utc": manifest.get("published_at_utc"),
        "subset": manifest["subset"],
        "bench": manifest["bench"],
        "model": manifest["model"],
        "harness": manifest["harness"],
        "run_id": manifest["source_run_id"],
        "backend": manifest.get("backend"),
        "source_commit": manifest.get("source_commit"),
        "artifact_path": artifact_path,
        "submitted_by_github": receipt.get("github_login") if receipt else None,
        "github_user_id": receipt.get("github_user_id") if receipt else None,
        "pull_request": receipt.get("pull_request") if receipt else None,
        "merge_commit": receipt.get("merge_commit") if receipt else None,
        "submission_receipt": receipt.get("receipt_path") if receipt else None,
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
    site_record = (
        trusted_site_record(manifest=manifest, artifact_path=artifact_path, receipt=receipt)
        if receipt
        else None
    )
    return row, site_record


def main() -> int:
    receipts, receipt_list = load_receipts(ROOT)
    manifests = manifest_paths(ROOT)
    indexed = []
    for path in manifests:
        indexed.append(row_from_manifest(path, receipts))
    rows = [row for row, _ in indexed]
    site_records = [record for _, record in indexed if record is not None]
    rows.sort(key=lambda row: (str(row["subset"]), str(row["model"]), str(row["harness"]), str(row["run_id"])))
    LEADERBOARD.mkdir(parents=True, exist_ok=True)
    with (LEADERBOARD / "results.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    with (LEADERBOARD / "results.jsonl").open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    site_records.sort(
        key=lambda row: (
            str(row["benchmark"]), str(row["configuration"]), str(row["run_id"])
        )
    )
    trusted = {
        "schema_version": 1,
        "source_repository": "Weicheng-Gu1/rsibench-data",
        "identity_policy": "github_pull_request_author",
        "generated_at": max(
            (str(receipt.get("merged_at") or "") for receipt in receipt_list),
            default=None,
        ),
        "generated_from_receipts": len(receipt_list),
        "results": site_records,
    }
    (ROOT / TRUSTED_INDEX).write_text(
        json.dumps(trusted, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(
        f"indexed {len(rows)} RSIBench runs; "
        f"published {len(site_records)} GitHub-authenticated result(s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
