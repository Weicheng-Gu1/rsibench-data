#!/usr/bin/env python3
"""Fail closed when the staged proposal diff is empty or out of scope."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path, PurePosixPath


EDITABLE = {
    "claude-code": ("workspace/",),
    "codex": ("workspace/",),
    "pi": ("workspace/", "source_code/"),
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--agent", required=True, choices=sorted(EDITABLE))
    args = parser.parse_args()
    proc = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "-z"],
        cwd=args.repo,
        capture_output=True,
        check=False,
    )
    paths = [
        part.decode(errors="replace")
        for part in proc.stdout.split(b"\0")
        if part
    ]
    unsafe = []
    for value in paths:
        path = PurePosixPath(value)
        if path.is_absolute() or ".." in path.parts:
            unsafe.append(value)
        elif not any(value.startswith(root) for root in EDITABLE[args.agent]):
            unsafe.append(value)
    report = {"ok": proc.returncode == 0 and bool(paths) and not unsafe,
              "paths": paths, "unsafe_paths": unsafe}
    print(json.dumps(report, sort_keys=True))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
