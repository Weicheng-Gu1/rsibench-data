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
COST_ESTIMATES = ROOT / "pricing" / "cost-estimates.json"
FIELDS = (
    "published_at_utc",
    "subset",
    "bench",
    "model",
    "harness",
    "run_id",
    "backend",
    "source_commit",
    "candidate_history",
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
    "total_tokens",
    "total_cost_usd",
    "cost_estimate_status",
    "cost_pricing",
    "held_out_test_usage",
    "test_cost_usd_per_task_A0",
    "test_cost_usd_per_task_AT",
    "test_cost_usd_per_task_delta",
    "test_tokens_per_task_A0",
    "test_tokens_per_task_AT",
    "test_tokens_per_task_delta",
    "artifact_path",
)


def load_cost_estimates() -> dict[str, dict[str, object]]:
    if not COST_ESTIMATES.is_file():
        return {}
    payload = json.loads(COST_ESTIMATES.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 2 or not isinstance(payload.get("runs"), dict):
        raise ValueError(f"invalid cost estimate registry: {COST_ESTIMATES}")
    return payload["runs"]


def apply_endpoint_usage(
    target: dict[str, object], usage: dict[str, object], *, csv_row: bool
) -> None:
    """Expose only held-out TEST A0/A_last usage and per-task deltas."""
    if usage.get("scope") != "held_out_test_A0_and_A_last_only":
        raise ValueError("cost/token usage must be held-out TEST A0/A_last only")
    a0 = usage.get("a0")
    a_last = usage.get("a_last")
    delta = usage.get("delta")
    if not all(isinstance(value, dict) for value in (a0, a_last, delta)):
        raise ValueError("held-out TEST usage is missing endpoint objects")
    assert isinstance(a0, dict) and isinstance(a_last, dict) and isinstance(delta, dict)

    mapping = {
        "test_cost_usd_per_task_A0": a0.get("cost_usd_per_task"),
        "test_cost_usd_per_task_AT": a_last.get("cost_usd_per_task"),
        "test_cost_usd_per_task_delta": delta.get("cost_usd_per_task"),
        "test_tokens_per_task_A0": a0.get("tokens_per_task"),
        "test_tokens_per_task_AT": a_last.get("tokens_per_task"),
        "test_tokens_per_task_delta": delta.get("tokens_per_task"),
    }
    target.update(mapping)
    target["held_out_test_usage"] = (
        json.dumps(usage, sort_keys=True) if csv_row else usage
    )
    pricing = usage.get("pricing")
    target["cost_pricing"] = (
        json.dumps(pricing or {}, sort_keys=True) if csv_row else pricing
    )
    statuses = {a0.get("cost_status"), a_last.get("cost_status")}
    target["cost_estimate_status"] = (
        next(iter(statuses)) if len(statuses) == 1 else "mixed_endpoint_estimate"
    )
    endpoint_tokens = [a0.get("total_tokens"), a_last.get("total_tokens")]
    if all(isinstance(value, (int, float)) for value in endpoint_tokens):
        target["total_tokens"] = round(sum(float(value) for value in endpoint_tokens))
    endpoint_costs = [a0.get("cost_usd"), a_last.get("cost_usd")]
    if all(isinstance(value, (int, float)) for value in endpoint_costs):
        target["total_cost_usd"] = round(
            sum(float(value) for value in endpoint_costs), 8
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
    row["candidate_history"] = json.dumps(
        manifest.get("candidate_history") or {}, sort_keys=True
    )
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
    cost_estimates = load_cost_estimates()
    manifests = manifest_paths(ROOT)
    indexed = []
    for path in manifests:
        indexed.append(row_from_manifest(path, receipts))
    rows = [row for row, _ in indexed]
    site_records = [record for _, record in indexed if record is not None]
    for row in rows:
        manifest_usage = row.get("held_out_test_usage")
        if isinstance(manifest_usage, dict):
            apply_endpoint_usage(row, manifest_usage, csv_row=True)
        estimate = cost_estimates.get(str(row["run_id"]))
        if estimate:
            usage = estimate.get("held_out_test_usage")
            if isinstance(usage, dict):
                apply_endpoint_usage(row, usage, csv_row=True)
    for record in site_records:
        manifest_usage = record.get("held_out_test_usage")
        if isinstance(manifest_usage, dict):
            apply_endpoint_usage(record, manifest_usage, csv_row=False)
        estimate = cost_estimates.get(str(record["run_id"]))
        if estimate:
            usage = estimate.get("held_out_test_usage")
            if isinstance(usage, dict):
                apply_endpoint_usage(record, usage, csv_row=False)
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
            str(row["benchmark"]), str(row["configuration"]),
            str((row.get("submission") or {}).get("merged_at") or ""),
            str(row["run_id"]),
        )
    )
    submissions_per_cell: dict[tuple[str, str], int] = {}
    for record in site_records:
        key = (str(record["benchmark"]), str(record["configuration"]))
        sequence = submissions_per_cell.get(key, 0) + 1
        submissions_per_cell[key] = sequence
        record["submission_sequence"] = sequence
        record["resubmission_increment"] = sequence - 1
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
