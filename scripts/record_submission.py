#!/usr/bin/env python3
"""Create a trusted GitHub identity receipt after a trajectory PR is merged."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from submission_common import RECEIPT_ROOT, artifact_path_for_manifest, read_json, sha256


def git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        check=True,
        text=True,
        capture_output=True,
    ).stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--repository", required=True)
    parser.add_argument("--github-login", required=True)
    parser.add_argument("--github-user-id", required=True, type=int)
    parser.add_argument("--pull-request", required=True, type=int)
    parser.add_argument("--merge-commit", required=True)
    parser.add_argument("--base-commit", required=True)
    parser.add_argument("--head-commit", required=True)
    parser.add_argument("--merged-at", required=True)
    parser.add_argument("--merged-by-github", required=True)
    args = parser.parse_args()
    root = args.repo_root.resolve()
    receipt_path = root / RECEIPT_ROOT / f"pr-{args.pull_request}.json"
    if receipt_path.exists():
        existing = read_json(receipt_path)
        if existing.get("merge_commit") == args.merge_commit:
            print(f"identity receipt already exists: {receipt_path.relative_to(root)}")
            return 0
        raise SystemExit(f"refusing to replace identity receipt: {receipt_path}")

    added: list[Path] = []
    diff = git(
        root, "diff", "--name-status", "--no-renames",
        args.base_commit, args.merge_commit, "--", "trajectories",
    )
    for line in diff.splitlines():
        status, relative = line.split("\t", 1)
        path = Path(relative)
        if status == "A" and path.name == "trajectory-manifest.json":
            added.append(root / path)
    if not added:
        raise SystemExit("merged PR added no trajectory manifests; no receipt created")

    artifacts = []
    for path in sorted(added):
        manifest = read_json(path)
        artifacts.append(
            {
                "artifact_path": artifact_path_for_manifest(root, path),
                "run_id": manifest.get("source_run_id"),
                "bench": manifest.get("bench"),
                "model": manifest.get("model"),
                "harness": manifest.get("harness"),
                "manifest_sha256": sha256(path),
            }
        )
    receipt = {
        "schema_version": 1,
        "repository": args.repository,
        "github_login": args.github_login,
        "github_user_id": args.github_user_id,
        "pull_request": args.pull_request,
        "merge_commit": args.merge_commit,
        "base_commit": args.base_commit,
        "head_commit": args.head_commit,
        "merged_at": args.merged_at,
        "merged_by_github": args.merged_by_github,
        "artifacts": artifacts,
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    print(f"recorded GitHub identity @{args.github_login} in {receipt_path.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
