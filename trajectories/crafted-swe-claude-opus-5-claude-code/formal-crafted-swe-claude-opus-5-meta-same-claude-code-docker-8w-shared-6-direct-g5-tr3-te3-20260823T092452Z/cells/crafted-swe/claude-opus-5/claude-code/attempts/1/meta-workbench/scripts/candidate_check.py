#!/usr/bin/env python3
"""Frozen in-sandbox candidate validation for every editable harness surface."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shlex
import shutil
import subprocess
import sys
import time
try:
    import tomllib
except ModuleNotFoundError:  # Python 3.10 support
    import tomli as tomllib
from pathlib import Path
from typing import Any


EXCLUDED_PARTS = {
    ".git",
    ".cache",
    "__pycache__",
    "dist",
    "node_modules",
}


def _candidate_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(root.rglob("*")):
        if not path.is_file() or EXCLUDED_PARTS.intersection(path.relative_to(root).parts):
            continue
        relative = path.relative_to(root).as_posix()
        digest.update(relative.encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def _run(name: str, argv: list[str], *, cwd: Path, env: dict[str, str], timeout: int) -> dict[str, Any]:
    started = time.monotonic()
    try:
        completed = subprocess.run(
            argv,
            cwd=cwd,
            env=env,
            text=True,
            capture_output=True,
            check=False,
            timeout=timeout,
        )
        returncode = completed.returncode
        stdout = completed.stdout[-8000:]
        stderr = completed.stderr[-8000:]
        timed_out = False
    except subprocess.TimeoutExpired as exc:
        returncode = 124
        stdout = (exc.stdout or "")[-8000:] if isinstance(exc.stdout, str) else ""
        stderr = (exc.stderr or "")[-8000:] if isinstance(exc.stderr, str) else ""
        timed_out = True
    return {
        "name": name,
        "argv": argv,
        "returncode": returncode,
        "timed_out": timed_out,
        "duration_seconds": round(time.monotonic() - started, 3),
        "stdout_tail": stdout,
        "stderr_tail": stderr,
        "passed": returncode == 0,
    }


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _commands(value: Any) -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key == "command" and isinstance(child, str):
                found.append(child)
            else:
                found.extend(_commands(child))
    elif isinstance(value, list):
        for child in value:
            found.extend(_commands(child))
    return found


def _validate_command(command: str, workspace: Path) -> str | None:
    try:
        head = shlex.split(command)[0]
    except (ValueError, IndexError):
        return f"invalid empty command: {command!r}"
    if "/" in head:
        target = Path(head)
        if not target.is_absolute():
            target = workspace / target
        if not target.exists():
            return f"referenced command does not exist: {head}"
    elif shutil.which(head) is None:
        return f"referenced command is unavailable: {head}"
    return None


def _shared_checks(agent: str, harness: Path, env: dict[str, str]) -> tuple[list[dict[str, Any]], list[str]]:
    workspace = harness / "workspace"
    diagnostics: list[str] = []
    checks: list[dict[str, Any]] = []
    if not workspace.is_dir():
        return checks, [f"workspace is missing: {workspace}"]

    for path in sorted(workspace.rglob("*.json")):
        try:
            _load_json(path)
        except (OSError, ValueError) as exc:
            diagnostics.append(f"invalid JSON {path.relative_to(harness)}: {exc}")
    for path in sorted(workspace.rglob("*.toml")):
        try:
            tomllib.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            diagnostics.append(f"invalid TOML {path.relative_to(harness)}: {exc}")
    for path in sorted(workspace.rglob("*.sh")):
        checks.append(_run(
            f"shell-syntax:{path.relative_to(workspace)}",
            ["sh", "-n", str(path)], cwd=workspace, env=env, timeout=30,
        ))

    if agent == "claude-code":
        settings = workspace / ".claude" / "settings.json"
        if settings.is_file():
            value = _load_json(settings)
            if not isinstance(value, dict) or set(value) - {"hooks"}:
                diagnostics.append(".claude/settings.json may contain only hooks")
            for command in _commands(value):
                issue = _validate_command(command, workspace)
                if issue:
                    diagnostics.append(issue)
        mcp = workspace / ".mcp.json"
        if mcp.is_file():
            value = _load_json(mcp)
            servers = value.get("mcpServers") if isinstance(value, dict) else None
            if not isinstance(servers, dict):
                diagnostics.append(".mcp.json requires an mcpServers object")
            else:
                for name, server in servers.items():
                    if not isinstance(server, dict) or not isinstance(server.get("command"), str):
                        diagnostics.append(f"MCP server {name!r} requires command")
                        continue
                    issue = _validate_command(str(server["command"]), workspace)
                    if issue:
                        diagnostics.append(f"MCP server {name!r}: {issue}")
        claude = shutil.which("claude")
        if claude:
            checks.append(_run("claude-agents", [claude, "agents"], cwd=workspace, env=env, timeout=60))
    elif agent == "codex":
        config = workspace / ".codex" / "config.toml"
        if config.is_file():
            value = tomllib.loads(config.read_text(encoding="utf-8"))
            if set(value) - {"mcp_servers"}:
                diagnostics.append(".codex/config.toml may contain only mcp_servers")
            servers = value.get("mcp_servers", {})
            if not isinstance(servers, dict):
                diagnostics.append(".codex/config.toml mcp_servers must be a table")
            else:
                for name, server in servers.items():
                    if not isinstance(server, dict) or not isinstance(server.get("command"), str):
                        diagnostics.append(f"MCP server {name!r} requires command")
                        continue
                    issue = _validate_command(str(server["command"]), workspace)
                    if issue:
                        diagnostics.append(f"MCP server {name!r}: {issue}")
        hooks = workspace / ".codex" / "hooks.json"
        if hooks.is_file():
            for command in _commands(_load_json(hooks)):
                issue = _validate_command(command, workspace)
                if issue:
                    diagnostics.append(issue)
        codex = shutil.which("codex")
        if codex:
            checks.append(_run("codex-version", [codex, "--version"], cwd=workspace, env=env, timeout=30))
            checks.append(_run("codex-mcp-config", [codex, "mcp", "list"], cwd=workspace, env=env, timeout=60))
            for rules in sorted((workspace / ".codex" / "rules").glob("*.rules")):
                checks.append(_run(
                    f"codex-execpolicy:{rules.name}",
                    [codex, "execpolicy", "check", "--rules", str(rules), "/bin/echo", "rsibench-smoke"],
                    cwd=workspace,
                    env=env,
                    timeout=60,
                ))
    elif agent == "pi":
        node = os.environ.get("RSIBENCH_PI_NODE_EXECUTABLE", "node")
        checker = Path("/app/meta-workbench/scripts/pi_resource_check.mjs")
        if not checker.is_file():
            diagnostics.append(f"frozen Pi resource checker is missing: {checker}")
        else:
            checks.append(_run(
                "pi-resource-loader", [node, str(checker), str(workspace)],
                cwd=workspace, env=env, timeout=120,
            ))
    else:
        diagnostics.append(f"unsupported agent: {agent}")
    return checks, diagnostics


def _source_checks(source: Path, env: dict[str, str]) -> tuple[list[dict[str, Any]], list[str]]:
    cache = Path(env.get("RSIBENCH_PI_NPM_CACHE_ROOT", ""))
    node = Path(env.get("RSIBENCH_PI_NODE_EXECUTABLE", ""))
    diagnostics: list[str] = []
    if not cache.is_dir():
        diagnostics.append(f"pinned Pi npm cache is missing: {cache}")
    if not node.is_file():
        diagnostics.append(f"pinned Node executable is missing: {node}")
    if diagnostics:
        return [], diagnostics
    npm = node.parent / "npm"
    if not npm.is_file():
        return [], [f"pinned npm executable is missing: {npm}"]
    check_env = dict(env)
    check_env.update({
        "PATH": str(node.parent) + os.pathsep + check_env.get("PATH", ""),
        "PI_OFFLINE": "1",
        "npm_config_cache": str(cache),
    })
    checks: list[dict[str, Any]] = []
    commands = (
        ("npm-ci-offline", [str(npm), "ci", "--ignore-scripts", "--offline"], 1200),
        ("build-offline", [str(npm), "run", "build:offline"], 1800),
        ("pi-cli-smoke", [str(node), "packages/coding-agent/dist/cli.js", "--version"], 60),
    )
    for name, argv, timeout in commands:
        result = _run(name, argv, cwd=source, env=check_env, timeout=timeout)
        checks.append(result)
        if not result["passed"]:
            break
    return checks, diagnostics


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", required=True, choices=("pi", "claude-code", "codex"))
    parser.add_argument("--harness", type=Path)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--verify-attestation", action="store_true")
    args = parser.parse_args()
    if bool(args.harness) == bool(args.source):
        parser.error("exactly one of --harness or --source is required")
    root = (args.source or args.harness).resolve()
    mode = "source" if args.source else "shared"
    digest = _candidate_digest(root)
    if args.verify_attestation:
        try:
            report = _load_json(args.output)
        except (OSError, ValueError) as exc:
            print(f"candidate self-check attestation is missing or invalid: {exc}", file=sys.stderr)
            return 2
        expected = (report.get("agent"), report.get("mode"), report.get("candidate_sha256"), report.get("passed"))
        actual = (args.agent, mode, digest, True)
        if expected != actual:
            print(f"candidate self-check attestation is stale or failed: expected {actual}, got {expected}", file=sys.stderr)
            return 2
        return 0

    env = os.environ.copy()
    if mode == "source":
        checks, diagnostics = _source_checks(root, env)
    else:
        checks, diagnostics = _shared_checks(args.agent, root, env)
    passed = not diagnostics and all(item["passed"] for item in checks)
    report = {
        "schema_version": 1,
        "agent": args.agent,
        "mode": mode,
        "candidate_sha256": digest,
        "passed": passed,
        "checks": checks,
        "diagnostics": diagnostics,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
