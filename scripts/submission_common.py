#!/usr/bin/env python3
"""Shared validation and indexing helpers for GitHub-authenticated submissions."""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any, Iterable


TRAJECTORY_MANIFEST = "trajectory-manifest.json"
RECEIPT_ROOT = Path("submissions/github")
TRUSTED_INDEX = Path("leaderboard/submissions.json")
DERIVED_INDEXES = {
    Path("leaderboard/results.csv"),
    Path("leaderboard/results.jsonl"),
    TRUSTED_INDEX,
}
IDENTITY_KEYS = {
    "github_login",
    "github_user_id",
    "pull_request",
    "merge_commit",
    "submission_receipt",
    "submitted_by_github",
}


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ValueError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"expected a JSON object: {path}")
    return value


def slug(value: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    if not result:
        raise ValueError(f"cannot derive slug from {value!r}")
    return result


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def manifest_paths(root: Path) -> list[Path]:
    return sorted((root / "trajectories").glob(f"*/*/{TRAJECTORY_MANIFEST}"))


def artifact_path_for_manifest(root: Path, path: Path) -> str:
    return path.parent.relative_to(root).as_posix()


def validate_manifest(root: Path, path: Path, *, enforce_current_protocol: bool) -> dict[str, Any]:
    manifest = read_json(path)
    required = ("source_run_id", "bench", "model", "harness", "protocol", "artifacts")
    missing = [key for key in required if manifest.get(key) in (None, "", [])]
    if missing:
        raise ValueError(f"{path}: missing {', '.join(missing)}")
    if IDENTITY_KEYS.intersection(manifest):
        keys = ", ".join(sorted(IDENTITY_KEYS.intersection(manifest)))
        raise ValueError(f"{path}: submitter-controlled identity is forbidden: {keys}")

    run_id = str(manifest["source_run_id"])
    bench = str(manifest["bench"])
    model = str(manifest["model"])
    harness = str(manifest["harness"])
    expected_parent = f"{slug(bench)}-{slug(model)}-{slug(harness)}"
    if path.parent.name != run_id or path.parent.parent.name != expected_parent:
        raise ValueError(
            f"{path}: path must be trajectories/{expected_parent}/{run_id}/"
        )

    protocol = manifest["protocol"]
    if not isinstance(protocol, dict):
        raise ValueError(f"{path}: protocol must be an object")
    legacy_endpoints = protocol.get("submission_profile") == "legacy-endpoints-v1"
    if enforce_current_protocol:
        expected = {
            "num_steps": 5,
            "train_rollouts_per_task": 3,
            "test_rollouts_per_task": 3,
        }
        mismatches = {
            key: protocol.get(key)
            for key, value in expected.items()
            if protocol.get(key) != value
        }
        if mismatches:
            raise ValueError(
                f"{path}: formal protocol mismatch {mismatches}; expected {expected}"
            )
        if protocol.get("test_state_policy") not in {"endpoints", "all-accepted"}:
            raise ValueError(
                f"{path}: test_state_policy must be endpoints or all-accepted"
            )

    artifacts = manifest["artifacts"]
    if not isinstance(artifacts, list) or not artifacts:
        raise ValueError(f"{path}: artifacts must be a nonempty list")
    seen: set[str] = set()
    for item in artifacts:
        if not isinstance(item, dict):
            raise ValueError(f"{path}: artifact entries must be objects")
        relative = item.get("path")
        if not isinstance(relative, str) or not relative or relative in seen:
            raise ValueError(f"{path}: invalid or duplicate artifact path {relative!r}")
        seen.add(relative)
        target = (path.parent / relative).resolve()
        if path.parent.resolve() not in target.parents or not target.is_file():
            raise ValueError(f"{path}: missing or escaping artifact {relative}")
        if target.is_symlink():
            raise ValueError(f"{path}: symlink artifacts are forbidden: {relative}")
        if item.get("bytes") != target.stat().st_size:
            raise ValueError(f"{path}: byte count mismatch for {relative}")
        if item.get("sha256") != sha256(target):
            raise ValueError(f"{path}: sha256 mismatch for {relative}")

    score = manifest.get("score_and_cost") or {}
    if not isinstance(score, dict):
        raise ValueError(f"{path}: score_and_cost must be an object")
    for key in ("V_test_A0", "V_test_AT"):
        value = score.get(key)
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(float(value))
        ):
            raise ValueError(f"{path}: required {key} must be finite")
    delta = score.get("delta_test")
    if delta is not None and (
        isinstance(delta, bool)
        or not isinstance(delta, (int, float))
        or not math.isfinite(float(delta))
    ):
        raise ValueError(f"{path}: delta_test must be finite when supplied")
    endpoint_usage = score.get("held_out_test_usage")
    if endpoint_usage is not None:
        if not isinstance(endpoint_usage, dict):
            raise ValueError(f"{path}: held_out_test_usage must be an object")
        expected_usage = {
            "schema_version": 1,
            "scope": "held_out_test_A0_and_A_last_only",
            "unit": "per_test_task_mean",
            "rollouts_per_task": 3,
        }
        mismatches = {
            key: endpoint_usage.get(key)
            for key, expected_value in expected_usage.items()
            if endpoint_usage.get(key) != expected_value
        }
        task_count = endpoint_usage.get("task_count")
        if isinstance(task_count, bool) or not isinstance(task_count, int) or task_count < 1:
            mismatches["task_count"] = task_count
        if mismatches:
            raise ValueError(f"{path}: invalid held-out endpoint usage contract {mismatches}")

        endpoints: dict[str, dict[str, Any]] = {}
        for endpoint_name in ("a0", "a_last"):
            endpoint = endpoint_usage.get(endpoint_name)
            if not isinstance(endpoint, dict):
                raise ValueError(f"{path}: held_out_test_usage.{endpoint_name} must be an object")
            endpoints[endpoint_name] = endpoint
            for field in ("total_tokens", "tokens_per_task"):
                value = endpoint.get(field)
                if (
                    isinstance(value, bool)
                    or not isinstance(value, (int, float))
                    or not math.isfinite(float(value))
                    or float(value) < 0
                ):
                    raise ValueError(
                        f"{path}: held_out_test_usage.{endpoint_name}.{field} must be nonnegative and finite"
                    )
            expected_per_task = float(endpoint["total_tokens"]) / task_count
            if not math.isclose(
                float(endpoint["tokens_per_task"]), expected_per_task, rel_tol=1e-9, abs_tol=1e-6
            ):
                raise ValueError(
                    f"{path}: held_out_test_usage.{endpoint_name}.tokens_per_task is inconsistent"
                )
            cost = endpoint.get("cost_usd")
            cost_per_task = endpoint.get("cost_usd_per_task")
            if (cost is None) != (cost_per_task is None):
                raise ValueError(
                    f"{path}: held_out_test_usage.{endpoint_name} cost fields must both be null or numeric"
                )
            if cost is not None:
                if any(
                    isinstance(value, bool)
                    or not isinstance(value, (int, float))
                    or not math.isfinite(float(value))
                    or float(value) < 0
                    for value in (cost, cost_per_task)
                ):
                    raise ValueError(
                        f"{path}: held_out_test_usage.{endpoint_name} cost must be nonnegative and finite"
                    )
                if not math.isclose(
                    float(cost_per_task), float(cost) / task_count, rel_tol=1e-9, abs_tol=1e-9
                ):
                    raise ValueError(
                        f"{path}: held_out_test_usage.{endpoint_name}.cost_usd_per_task is inconsistent"
                    )

        usage_delta = endpoint_usage.get("delta")
        if not isinstance(usage_delta, dict):
            raise ValueError(f"{path}: held_out_test_usage.delta must be an object")
        for field in ("tokens_per_task", "cost_usd_per_task"):
            left = endpoints["a0"].get(field)
            right = endpoints["a_last"].get(field)
            supplied = usage_delta.get(field)
            expected_delta = None if left is None or right is None else float(right) - float(left)
            if expected_delta is None:
                if supplied is not None:
                    raise ValueError(f"{path}: held_out_test_usage.delta.{field} must be null")
            elif (
                isinstance(supplied, bool)
                or not isinstance(supplied, (int, float))
                or not math.isclose(float(supplied), expected_delta, rel_tol=1e-9, abs_tol=1e-6)
            ):
                raise ValueError(f"{path}: held_out_test_usage.delta.{field} is inconsistent")

        pricing = endpoint_usage.get("pricing")
        has_cost = endpoints["a0"].get("cost_usd") is not None
        if has_cost and not isinstance(pricing, dict):
            raise ValueError(f"{path}: priced held-out usage requires pricing provenance")
        if manifest.get("model") == "gpt-5-5" and has_cost:
            expected_prices = {
                "model": "gpt-5.5",
                "input_usd_per_million": 5.0,
                "cached_input_usd_per_million": 0.5,
                "output_usd_per_million": 30.0,
                "source": "https://developers.openai.com/api/docs/models/gpt-5.5",
            }
            price_mismatches = {
                key: pricing.get(key)
                for key, expected_value in expected_prices.items()
                if pricing.get(key) != expected_value
            }
            if price_mismatches:
                raise ValueError(
                    f"{path}: GPT-5.5 held-out cost must use public list pricing {price_mismatches}"
                )
    history = manifest.get("candidate_history")
    if enforce_current_protocol:
        if not isinstance(history, dict) or history.get("schema_version") != 1:
            raise ValueError(f"{path}: candidate_history schema_version 1 is required")
        candidates = history.get("candidates")
        if not isinstance(candidates, list) or len(candidates) != 5:
            raise ValueError(f"{path}: candidate_history must preserve all 5 RSI rounds")
        for expected_round, candidate in enumerate(candidates, start=1):
            if not isinstance(candidate, dict) or candidate.get("round") != expected_round:
                raise ValueError(f"{path}: invalid candidate_history round {expected_round}")
            if candidate.get("status") in (None, "") or candidate.get("score_status") not in {
                "scored", "error", "not_scored"
            }:
                raise ValueError(f"{path}: incomplete candidate_history round {expected_round}")
        accepted_rounds = [
            int(candidate["round"])
            for candidate in candidates
            if candidate.get("accepted")
        ]
        expected_test_order = [0]
        if accepted_rounds:
            expected_test_order.append(accepted_rounds[-1])
            if protocol.get("test_state_policy") == "all-accepted":
                expected_test_order.extend(accepted_rounds[:-1])
        if protocol.get("test_evaluation_order") != expected_test_order:
            raise ValueError(
                f"{path}: test_evaluation_order must contain A0 and A_last; "
                f"earlier accepted generations are optional under all-accepted: "
                f"expected {expected_test_order}, got "
                f"{protocol.get('test_evaluation_order')!r}"
            )

        ablations = manifest.get("ablations")
        if ablations is not None:
            if not isinstance(ablations, dict) or ablations.get("method") != (
                "keep_one_changed_module"
            ):
                raise ValueError(f"{path}: invalid optional keep-one ablation manifest")
            layers = ablations.get("layers")
            if not isinstance(layers, dict):
                raise ValueError(f"{path}: ablation layers must be an object")
            for layer, payload in layers.items():
                if not isinstance(payload, dict):
                    raise ValueError(f"{path}: invalid ablation layer {layer}")
                if payload.get("status") != "completed":
                    continue
                if payload.get("rollouts_per_task") != 3:
                    raise ValueError(
                        f"{path}: completed ablation layer {layer} must use avg@3"
                    )
                if not isinstance(payload.get("component_scores"), dict):
                    raise ValueError(
                        f"{path}: completed ablation layer {layer} has no component scores"
                    )
    return manifest


def load_receipts(root: Path) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    by_artifact: dict[str, dict[str, Any]] = {}
    receipts: list[dict[str, Any]] = []
    receipt_root = root / RECEIPT_ROOT
    if not receipt_root.is_dir():
        return by_artifact, receipts
    for path in sorted(receipt_root.glob("pr-*.json")):
        receipt = read_json(path)
        if receipt.get("schema_version") != 1:
            raise ValueError(f"{path}: unsupported receipt schema")
        for key in (
            "repository", "github_login", "github_user_id", "pull_request",
            "merge_commit", "merged_at", "artifacts",
        ):
            if receipt.get(key) in (None, "", []):
                raise ValueError(f"{path}: missing {key}")
        if not isinstance(receipt["artifacts"], list):
            raise ValueError(f"{path}: artifacts must be a list")
        relative_receipt = path.relative_to(root).as_posix()
        receipt["receipt_path"] = relative_receipt
        receipts.append(receipt)
        for item in receipt["artifacts"]:
            if not isinstance(item, dict) or not item.get("artifact_path"):
                raise ValueError(f"{path}: invalid artifact receipt")
            artifact = str(item["artifact_path"])
            if artifact in by_artifact:
                raise ValueError(f"duplicate GitHub identity receipt for {artifact}")
            by_artifact[artifact] = receipt
    return by_artifact, receipts


def percentage(value: Any) -> float | None:
    if not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        return None
    return round(float(value) * 100.0, 8)


def trusted_site_record(
    *, manifest: dict[str, Any], artifact_path: str, receipt: dict[str, Any]
) -> dict[str, Any]:
    score = manifest.get("score_and_cost") or {}
    record: dict[str, Any] = {
        "configuration": f"{slug(str(manifest['model']))}__{slug(str(manifest['harness']))}",
        "benchmark": slug(str(manifest["bench"])),
        "status": "verified",
        "baseline_score": percentage(score.get("V_test_A0")),
        "final_score": percentage(score.get("V_test_AT")),
        "lift": percentage(score.get("delta_test")),
        "run_id": manifest["source_run_id"],
        "artifact_path": artifact_path,
        "source_commit": manifest.get("source_commit"),
        "candidate_history": manifest.get("candidate_history"),
        "submission": {
            "github_login": receipt["github_login"],
            "github_user_id": receipt["github_user_id"],
            "pull_request": receipt["pull_request"],
            "merge_commit": receipt["merge_commit"],
            "merged_at": receipt["merged_at"],
            "receipt_path": receipt["receipt_path"],
        },
    }
    endpoint_usage = score.get("held_out_test_usage")
    if isinstance(endpoint_usage, dict):
        record["held_out_test_usage"] = endpoint_usage
    return record


def ensure_unique(values: Iterable[str], label: str) -> None:
    seen: set[str] = set()
    for value in values:
        if value in seen:
            raise ValueError(f"duplicate {label}: {value}")
        seen.add(value)
