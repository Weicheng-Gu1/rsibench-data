#!/usr/bin/env python3
"""Verify the accepted Task harness bytes loaded into a Meta sandbox."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--agent", required=True)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    expected_files = manifest.get("files")
    if not isinstance(expected_files, list) or not expected_files:
        raise ValueError("shared runtime manifest has no files")

    digest = hashlib.sha256()
    verified: list[dict[str, str]] = []
    for entry in expected_files:
        relative = str(entry.get("path") or "")
        if not relative or relative.startswith("/") or ".." in Path(relative).parts:
            raise ValueError(f"unsafe shared runtime path: {relative!r}")
        path = args.root / relative
        content = path.read_bytes()
        actual_file_sha256 = hashlib.sha256(content).hexdigest()
        if actual_file_sha256 != entry.get("sha256"):
            raise ValueError(f"shared runtime file mismatch: {relative}")
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(content)
        digest.update(b"\0")
        verified.append({"path": relative, "sha256": actual_file_sha256})

    actual = digest.hexdigest()
    expected = str(manifest.get("runtime_harness_sha256") or "")
    if actual != expected:
        raise ValueError(
            f"shared runtime harness mismatch: expected {expected}, got {actual}"
        )
    output = {
        "mode": "shared",
        "runtime_agent": args.agent,
        "runtime_harness_sha256": actual,
        "verified_file_count": len(verified),
        "verified_files": verified,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
