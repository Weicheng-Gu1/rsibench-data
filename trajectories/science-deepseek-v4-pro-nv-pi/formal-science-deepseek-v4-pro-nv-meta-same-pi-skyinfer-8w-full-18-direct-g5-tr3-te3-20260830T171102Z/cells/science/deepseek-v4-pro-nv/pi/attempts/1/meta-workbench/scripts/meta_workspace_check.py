#!/usr/bin/env python3
"""Verify that the Meta sandbox received the exact host evidence tree."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True, type=Path)
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    manifest_path = args.workspace / "evidence-manifest.json"
    errors: list[str] = []
    try:
        manifest = json.loads(manifest_path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        manifest = {}
        errors.append(f"manifest is missing or invalid: {exc}")

    declared = str(manifest.get("manifest_sha256") or "")
    unsigned = dict(manifest)
    unsigned.pop("manifest_sha256", None)
    canonical = json.dumps(
        unsigned, ensure_ascii=True, sort_keys=True, separators=(",", ":")
    ).encode()
    actual_manifest_sha = hashlib.sha256(canonical).hexdigest()
    if declared != args.expected_sha256 or actual_manifest_sha != args.expected_sha256:
        errors.append(
            "manifest digest mismatch: expected "
            f"{args.expected_sha256}, declared {declared or 'missing'}, "
            f"computed {actual_manifest_sha}"
        )

    checked = 0
    expected_files = {"evidence-manifest.json", "harness-context.json"}
    for item in manifest.get("files", []):
        if not isinstance(item, dict):
            errors.append("manifest contains a non-object file entry")
            continue
        relative = str(item.get("path") or "")
        expected_files.add(relative)
        path = args.workspace / relative
        try:
            if path.resolve().relative_to(args.workspace.resolve()).as_posix() != relative:
                raise ValueError("path escapes workspace")
            content = path.read_bytes()
        except (OSError, ValueError) as exc:
            errors.append(f"missing uploaded evidence {relative!r}: {exc}")
            continue
        actual_sha = hashlib.sha256(content).hexdigest()
        if len(content) != item.get("bytes") or actual_sha != item.get("sha256"):
            errors.append(f"uploaded evidence changed: {relative}")
            continue
        checked += 1

    actual_files = {
        path.relative_to(args.workspace).as_posix()
        for path in args.workspace.rglob("*")
        if path.is_file()
    }
    unexpected = sorted(actual_files - expected_files)
    if unexpected:
        errors.append("unexpected uploaded evidence: " + ", ".join(unexpected))

    report = {
        "ok": not errors,
        "manifest_sha256": actual_manifest_sha,
        "expected_step": manifest.get("expected_step"),
        "task_count": manifest.get("task_count"),
        "repeat_count": manifest.get("repeat_count"),
        "trajectory_count": manifest.get("trajectory_count"),
        "uncaptured_trajectory_count": manifest.get(
            "uncaptured_trajectory_count"
        ),
        "no_activity_trajectory_count": manifest.get(
            "no_activity_trajectory_count"
        ),
        "no_activity_trajectories": manifest.get("no_activity_trajectories"),
        "checked_files": checked,
        "errors": errors,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, sort_keys=True) + "\n")
    print(json.dumps(report, sort_keys=True))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
