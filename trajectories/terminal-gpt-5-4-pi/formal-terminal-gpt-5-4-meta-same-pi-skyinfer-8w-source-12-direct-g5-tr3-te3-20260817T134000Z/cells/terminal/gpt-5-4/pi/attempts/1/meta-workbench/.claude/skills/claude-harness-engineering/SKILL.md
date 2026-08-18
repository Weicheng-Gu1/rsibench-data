---
name: claude-harness-engineering
description: Use when the editable target is a Claude Code harness and trajectories show a repeated behavioral bottleneck.
---

# Engineer a Claude Code Harness

Choose the narrowest official project lever matching the diagnosed cause:

- `workspace/CLAUDE.md` for always-relevant project behavior;
- `workspace/.claude/skills/<name>/SKILL.md` for a reusable conditional procedure;
- `workspace/.claude/settings.json` for supported settings or hooks;
- `workspace/scripts/` or `workspace/mcp/` for deterministic local capabilities.

Prefer one additive skill or checker over a broad instruction rewrite. Preserve
existing verification loops and successful tool use. Do not modify
`manifest.json`, `source_code/`, Claude Code itself, benchmark data, or the
frozen meta workbench. Validate syntax and run both diff/guard scripts.
