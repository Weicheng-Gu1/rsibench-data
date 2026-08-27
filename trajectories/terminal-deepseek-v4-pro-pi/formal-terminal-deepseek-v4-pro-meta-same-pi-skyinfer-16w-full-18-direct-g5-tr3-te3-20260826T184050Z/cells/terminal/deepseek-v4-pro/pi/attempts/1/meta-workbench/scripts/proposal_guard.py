#!/usr/bin/env python3
"""Standalone pre-submit path and size guard; host guard remains authoritative."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path, PurePosixPath


ALLOWED_EXTENSIONS = {
    ".md", ".json", ".yaml", ".yml", ".toml", ".py", ".js", ".mjs",
    ".cjs", ".ts", ".tsx", ".sh", ".txt",
}

FORBIDDEN_EXTERNAL_RUNTIME_SIGNALS = (
    "RSIBENCH_TASK_",
    "AgentTimeoutError",
)

FORBIDDEN_EXTERNAL_RUNTIME_PATTERNS = (
    re.compile(
        r"\b(?:harbor|evaluator|runner|scheduler|task\.toml)\b"
        r".{0,160}\b(?:deadline|time[ _-]?budget|remaining[ _-]?time|"
        r"elapsed[ _-]?time)\b",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"\b(?:deadline|time[ _-]?budget|remaining[ _-]?time|"
        r"elapsed[ _-]?time)\b.{0,160}"
        r"\b(?:harbor|evaluator|runner|scheduler|task\.toml)\b",
        re.IGNORECASE | re.DOTALL,
    ),
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--agent", required=True, choices=("claude-code", "codex", "pi")
    )
    parser.add_argument("--harness", required=True, type=Path)
    parser.add_argument("--max-files", type=int, default=400)
    parser.add_argument("--max-diff-bytes", type=int, default=400_000)
    args = parser.parse_args()
    proc = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "-z"], cwd=args.harness,
        capture_output=True, check=False,
    )
    paths = [item.decode(errors="replace") for item in proc.stdout.split(b"\0") if item]
    violations = []
    # Pi project resources are not limited to ``workspace/.pi``. MCP servers,
    # helper scripts, and prompt assets may live elsewhere under the project
    # workspace; the host HarnessLayout uses the same two editable roots.
    prefixes = (
        ("workspace/", "source_code/")
        if args.agent == "pi"
        else ("workspace/",)
    )
    for value in paths:
        path = PurePosixPath(value)
        if path.is_absolute() or ".." in path.parts or not value.startswith(prefixes):
            violations.append(f"path outside editable roots: {value}")
        if path.name != ".gitkeep" and path.suffix not in ALLOWED_EXTENSIONS:
            violations.append(f"unsafe extension: {value}")
        if value == "manifest.json":
            violations.append("manifest.json is immutable")
        candidate = args.harness / value
        if candidate.is_file():
            content = candidate.read_text(encoding="utf-8", errors="replace")
            for signal in FORBIDDEN_EXTERNAL_RUNTIME_SIGNALS:
                if signal in content:
                    violations.append(
                        f"forbidden evaluator-owned runtime signal in {value}: "
                        f"{signal}"
                    )
            for pattern in FORBIDDEN_EXTERNAL_RUNTIME_PATTERNS:
                if pattern.search(content):
                    violations.append(
                        "forbidden attempt to reconstruct evaluator-owned "
                        f"runtime state in {value}"
                    )
                    break
    diff = subprocess.run(
        ["git", "diff", "--cached", "--binary"], cwd=args.harness,
        capture_output=True, check=False,
    ).stdout
    if not paths:
        violations.append("proposal contains no staged file operations")
    if len(paths) > args.max_files:
        violations.append(f"too many changed files: {len(paths)}")
    if len(diff) > args.max_diff_bytes:
        violations.append(f"diff too large: {len(diff)} bytes")
    report = {"ok": not violations, "paths": paths, "diff_bytes": len(diff),
              "violations": violations}
    print(json.dumps(report, sort_keys=True))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
