#!/usr/bin/env python3
"""Publish one merged PR receipt and rebuild indexes with push-conflict retries."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        check=check,
        text=True,
        capture_output=True,
    )


def required(value: Any, label: str) -> Any:
    if value in (None, ""):
        raise ValueError(f"pull request metadata is missing {label}")
    return value


def nested(payload: dict[str, Any], outer: str, inner: str) -> Any:
    value = payload.get(outer)
    if not isinstance(value, dict):
        raise ValueError(f"pull request metadata is missing {outer}.{inner}")
    return required(value.get(inner), f"{outer}.{inner}")


def metadata_args(payload: dict[str, Any]) -> list[str]:
    if payload.get("merged") is not True:
        raise ValueError("pull request is not merged; refusing to create a receipt")
    return [
        "--github-login", str(nested(payload, "user", "login")),
        "--github-user-id", str(nested(payload, "user", "id")),
        "--pull-request", str(required(payload.get("number"), "number")),
        "--merge-commit", str(required(payload.get("merge_commit_sha"), "merge_commit_sha")),
        "--base-commit", str(nested(payload, "base", "sha")),
        "--head-commit", str(nested(payload, "head", "sha")),
        "--merged-at", str(required(payload.get("merged_at"), "merged_at")),
        "--merged-by-github", str(nested(payload, "merged_by", "login")),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--repository", required=True)
    parser.add_argument("--pull-request-json", type=Path, required=True)
    parser.add_argument("--added-manifests-file", type=Path, required=True)
    parser.add_argument("--remote", default="origin")
    parser.add_argument("--branch", default="main")
    parser.add_argument("--max-attempts", type=int, default=8)
    parser.add_argument("--retry-delay", type=float, default=1.0)
    args = parser.parse_args()
    if args.max_attempts < 1:
        parser.error("--max-attempts must be positive")

    root = args.repo_root.resolve()
    payload = json.loads(args.pull_request_json.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit("pull request metadata must be a JSON object")
    try:
        receipt_args = metadata_args(payload)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    pr_number = str(payload["number"])

    git(root, "config", "user.name", "github-actions[bot]")
    git(
        root,
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
    )

    for attempt in range(1, args.max_attempts + 1):
        # Every attempt starts from the newest published receipts. This makes the
        # derived feed a deterministic union rather than whichever run pushes last.
        git(root, "fetch", "--no-tags", args.remote, args.branch)
        git(root, "reset", "--hard", f"{args.remote}/{args.branch}")
        subprocess.run(
            [
                sys.executable,
                str(root / "scripts/record_submission.py"),
                "--repo-root", str(root),
                "--repository", args.repository,
                *receipt_args,
                "--added-manifests-file", str(args.added_manifests_file),
            ],
            check=True,
        )
        subprocess.run(
            [sys.executable, str(root / "scripts/build_leaderboard.py")],
            cwd=root,
            check=True,
        )
        git(root, "add", "submissions/github", "leaderboard")
        if git(root, "diff", "--cached", "--quiet", check=False).returncode == 0:
            print(f"receipt for PR #{pr_number} is already published")
            return 0
        git(root, "commit", "-m", f"submissions: record GitHub identity for PR #{pr_number}")
        pushed = git(
            root,
            "push",
            args.remote,
            f"HEAD:refs/heads/{args.branch}",
            check=False,
        )
        if pushed.returncode == 0:
            print(f"published receipt and rebuilt indexes for PR #{pr_number}")
            return 0
        if attempt < args.max_attempts:
            print(
                f"main changed while publishing PR #{pr_number}; "
                f"retrying from the latest remote ({attempt}/{args.max_attempts})"
            )
            if args.retry_delay > 0:
                time.sleep(args.retry_delay)

    raise SystemExit(
        f"could not publish PR #{pr_number} after {args.max_attempts} attempts; "
        "rerun the workflow_dispatch backfill"
    )


if __name__ == "__main__":
    raise SystemExit(main())
