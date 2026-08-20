#!/usr/bin/env python3
"""Standalone Pi module-boundary check used inside the meta-agent sandbox."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path


MODULES = {
    "M1_prompt_task_intake": ("workspace/.pi/APPEND_SYSTEM.md",),
    "M2_skills": ("workspace/.pi/skills/**",),
    "M3_observation_processing": (
        "workspace/.pi/extensions/rsibench/m03_observation_processing/**",
    ),
    "M4_context_selection": ("workspace/.pi/extensions/rsibench/m04_context_selection/**",),
    "M5_compaction": (
        "workspace/.pi/extensions/rsibench/m05_compaction/**",
    ),
    "M6_working_memory": (
        "workspace/.pi/extensions/rsibench/m06_working_memory/**",
        "workspace/.pi/state/**",
        "workspace/.pi/rsibench.json",
    ),
    "M7_hooks": (
        "workspace/.pi/extensions/rsibench/m07_hooks/**",
    ),
    "M8_completion_verification": (
        "workspace/.pi/extensions/rsibench/m08_completion_verification/**",
    ),
    "M9_local_tools": (
        "workspace/.pi/extensions/rsibench/m09_local_tools/**",
    ),
    "M10_mcp_adapters": (
        "workspace/.pi/extensions/rsibench/m10_mcp_adapters/**",
        "workspace/.pi/mcp/**",
    ),
}
FIXED = {
    "workspace/.pi/settings.json",
    "workspace/.pi/extensions/rsibench/package.json",
    "workspace/.pi/rsibench-runtime/module-evidence.ts",
}
REQUIRED = {
    "workspace/.pi/extensions/rsibench/m03_observation_processing/index.ts",
    "workspace/.pi/extensions/rsibench/m04_context_selection/index.ts",
    "workspace/.pi/extensions/rsibench/m05_compaction/index.ts",
    "workspace/.pi/extensions/rsibench/m06_working_memory/index.ts",
    "workspace/.pi/extensions/rsibench/m07_hooks/index.ts",
    "workspace/.pi/extensions/rsibench/m08_completion_verification/index.ts",
    "workspace/.pi/extensions/rsibench/m09_local_tools/index.ts",
    "workspace/.pi/extensions/rsibench/m10_mcp_adapters/index.ts",
}
EXPECTED_EXTENSIONS = [
    "./m03_observation_processing/index.ts",
    "./m04_context_selection/index.ts",
    "./m05_compaction/index.ts",
    "./m06_working_memory/index.ts",
    "./m07_hooks/index.ts",
    "./m08_completion_verification/index.ts",
    "./m09_local_tools/index.ts",
    "./m10_mcp_adapters/index.ts",
]
SHARED_RESOURCE_PATTERNS = (
    "workspace/.pi/rules/**",
    "workspace/.pi/hooks/**",
    "workspace/.pi/prompts/**",
    "workspace/.pi/agents/**",
)
SHARED_FIXED = {"workspace/.rsibench/shared-modules.json"}
API_RULES = (
    (re.compile(r"\bpi\.registerTool\s*\("), {"M6_working_memory", "M9_local_tools", "M10_mcp_adapters"}, "registerTool"),
    (re.compile(r"\bpi\.(?:sendMessage|setActiveTools|getActiveTools)\s*\("), {"M7_hooks"}, "hook control"),
    (re.compile(r"\bpi\.on\s*\(\s*['\"]context['\"]"), {"M4_context_selection"}, "context hook"),
    (re.compile(r"\bpi\.on\s*\(\s*['\"]session_(?:before_)?compact['\"]"), {"M5_compaction"}, "compaction hook"),
)


def matches(path: str, pattern: str) -> bool:
    return path.startswith(pattern[:-3] + "/") if pattern.endswith("/**") else path == pattern


def owner(path: str) -> str | None:
    for name, patterns in MODULES.items():
        if any(matches(path, pattern) for pattern in patterns):
            return name
    return None


def content_hash(rows: list[tuple[str, Path]]) -> str:
    digest = hashlib.sha256()
    for rel, path in sorted(rows):
        digest.update(rel.encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--harness", required=True, type=Path)
    args = parser.parse_args()
    root = args.harness.resolve()
    violations: list[str] = []
    files: dict[str, list[tuple[str, Path]]] = {name: [] for name in MODULES}
    fixed_rows: list[tuple[str, Path]] = []

    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        rel = path.relative_to(root).as_posix()
        if ".git" in path.relative_to(root).parts or "__pycache__" in path.parts:
            continue
        if rel in FIXED:
            fixed_rows.append((rel, path))
        elif (module := owner(rel)) is not None:
            files[module].append((rel, path))
        elif rel in SHARED_FIXED or any(
            matches(rel, pattern) for pattern in SHARED_RESOURCE_PATTERNS
        ):
            pass
        elif rel.startswith("workspace/"):
            violations.append(f"unowned Pi evolvable path: {rel}")

    for rel in sorted(FIXED):
        if not (root / rel).is_file():
            violations.append(f"missing fixed Pi runtime resource: {rel}")
    for rel in sorted(REQUIRED):
        if not (root / rel).is_file():
            violations.append(f"missing Pi module entrypoint: {rel}")

    manifest = root / "workspace/.pi/extensions/rsibench/package.json"
    if manifest.is_file():
        try:
            entries = json.loads(manifest.read_text(encoding="utf-8"))["pi"]["extensions"]
        except (KeyError, TypeError, ValueError):
            violations.append("invalid fixed Pi extension manifest")
        else:
            if entries != EXPECTED_EXTENSIONS:
                violations.append("fixed Pi extension manifest has unexpected entries/order")

    for module, rows in files.items():
        for rel, path in rows:
            if path.suffix not in {".ts", ".js", ".mjs", ".cjs"}:
                continue
            source = path.read_text(encoding="utf-8", errors="replace")
            for pattern, allowed, capability in API_RULES:
                if pattern.search(source) and module not in allowed:
                    violations.append(
                        f"Pi {capability} is outside {module} ownership: {rel}"
                    )

    changed = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "-z"],
        cwd=root,
        capture_output=True,
        check=False,
    )
    changed_paths = {
        value.decode(errors="replace")
        for value in changed.stdout.split(b"\0")
        if value
    }
    for rel in sorted(changed_paths & FIXED):
        violations.append(f"fixed Pi loader resource was edited: {rel}")

    module_sha256 = {name: content_hash(rows) for name, rows in files.items()}
    fixed_sha256 = content_hash(fixed_rows)
    combined = hashlib.sha256()
    for name in sorted(module_sha256):
        combined.update(name.encode())
        combined.update(b"\0")
        combined.update(module_sha256[name].encode())
        combined.update(b"\0")
    combined.update(b"fixed\0")
    combined.update(fixed_sha256.encode())
    combined.update(b"\0")
    report = {
        "ok": not violations,
        "harness_sha256": combined.hexdigest(),
        "module_sha256": module_sha256,
        "module_files": {
            name: [rel for rel, _ in sorted(rows)] for name, rows in files.items()
        },
        "fixed_sha256": fixed_sha256,
        "changed_paths": sorted(changed_paths),
        "violations": violations,
    }
    print(json.dumps(report, sort_keys=True))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
