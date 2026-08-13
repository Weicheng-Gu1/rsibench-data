#!/usr/bin/env python3
"""Validate an untrusted RSIBench data pull request against its base revision."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from submission_common import DERIVED_INDEXES, RECEIPT_ROOT, validate_manifest


def git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        check=True,
        text=True,
        capture_output=True,
    ).stdout


def changed_paths(repo: Path, base: str, head: str) -> list[tuple[str, Path]]:
    rows: list[tuple[str, Path]] = []
    for line in git(repo, "diff", "--name-status", "--no-renames", base, head).splitlines():
        status, relative = line.split("\t", 1)
        rows.append((status, Path(relative)))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    args = parser.parse_args()
    root = args.repo_root.resolve()
    changes = changed_paths(root, args.base, args.head)
    if not changes:
        raise SystemExit("submission contains no changes")

    added_manifests: list[Path] = []
    for status, relative in changes:
        if status.startswith(("D", "R")):
            raise SystemExit(f"submission may not delete or rename files: {relative}")
        if relative == Path("leaderboard/submissions.json") or str(relative).startswith(
            RECEIPT_ROOT.as_posix() + "/"
        ):
            raise SystemExit(f"submission may not write trusted identity data: {relative}")
        if relative in DERIVED_INDEXES or str(relative).startswith("leaderboard/"):
            raise SystemExit(f"submission may not write derived leaderboard data: {relative}")
        if not str(relative).startswith("trajectories/"):
            raise SystemExit(f"submission may only add trajectories and derived indexes: {relative}")
        existed = subprocess.run(
            ["git", "-C", str(root), "cat-file", "-e", f"{args.base}:{relative.as_posix()}"],
            text=True,
            capture_output=True,
        ).returncode == 0
        if existed:
            raise SystemExit(f"immutable trajectory path already exists on base: {relative}")
        if relative.name == "trajectory-manifest.json":
            added_manifests.append(root / relative)

    if not added_manifests:
        raise SystemExit("submission must add at least one trajectory-manifest.json")
    run_ids: list[str] = []
    allowed_trajectory_paths: set[Path] = set()
    for path in added_manifests:
        manifest = validate_manifest(root, path, enforce_current_protocol=True)
        run_id = str(manifest["source_run_id"])
        if run_id in run_ids:
            raise SystemExit(f"duplicate run_id in submission: {run_id}")
        run_ids.append(run_id)
        allowed_trajectory_paths.add(path.relative_to(root))
        for artifact in manifest["artifacts"]:
            allowed_trajectory_paths.add(
                (path.parent / str(artifact["path"])).relative_to(root)
            )
    changed_trajectory_paths = {
        relative for _, relative in changes if str(relative).startswith("trajectories/")
    }
    unindexed = sorted(changed_trajectory_paths - allowed_trajectory_paths)
    if unindexed:
        raise SystemExit(
            "submission contains trajectory files outside manifest checksums: "
            + ", ".join(path.as_posix() for path in unindexed)
        )
    print(f"validated {len(added_manifests)} new GitHub submission(s): {', '.join(run_ids)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
