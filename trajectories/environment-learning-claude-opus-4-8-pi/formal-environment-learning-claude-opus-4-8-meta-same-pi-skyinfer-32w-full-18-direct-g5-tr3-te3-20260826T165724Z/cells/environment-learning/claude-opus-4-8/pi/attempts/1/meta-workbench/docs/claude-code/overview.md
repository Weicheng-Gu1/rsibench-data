# Claude Code Editable Surface

This sandbox is a single Claude Code project. The task agent is the standard
Claude Code CLI running against `workspace/`; its binary, its own source, and
everything outside these six native project resources are frozen. You cannot
install a different CLI, patch Claude Code itself, or invent a seventh
module — the shared-module contract at `workspace/.rsibench/shared-modules.json`
declares exactly these six IDs, and a file outside their native paths is
unowned and simply never loaded.

## Reading order

1. Read this file, then inventory TRAIN evidence (a passing and a failing
   trajectory for the same task, where available) before touching anything.
2. Read the guide for every module whose native path could plausibly own the
   causal fix — not only the one that looks cheapest to edit.
3. Edit only inside the exact native paths below.

## Module -> guide -> native path

| Module | Guide | Native path(s) |
| --- | --- | --- |
| SHARED_PROMPT | [prompt.md](prompt.md) | `workspace/CLAUDE.md` |
| SHARED_RULES | [rules.md](rules.md) | `workspace/.claude/rules/**` |
| SHARED_SKILLS | [skills.md](skills.md) | `workspace/.claude/skills/**` |
| SHARED_HOOKS | [hooks.md](hooks.md) | `workspace/.claude/settings.json`, `workspace/.claude/hooks/**` |
| SHARED_MCP | [mcp.md](mcp.md) | `workspace/.mcp.json` |
| SHARED_WORKFLOW | [workflow.md](workflow.md) | `workspace/.claude/agents/**` |

## How the pieces fit

CLAUDE.md is the only unconditionally loaded surface — everything else is
conditional: a rule triggers on a file/tool/language pattern, a skill is
selected by its description, a hook fires on a lifecycle event, an MCP server
is called as a tool, and a subagent under `.claude/agents/` is explicitly
delegated to. Prefer the most conditional module that can still carry the
fix. An unconditional CLAUDE.md edit is paid by every task in the suite,
including ones the fix is irrelevant to; a rule, skill, or subagent is paid
only when its trigger or selection criteria actually match.

## What is frozen

Never edit credentials, model routing, benchmark tasks, evaluators, budgets,
acceptance controls, the Claude Code executable, or
`workspace/.rsibench/shared-modules.json` itself. Never create a second file
that mirrors a native path (a `.claude/CLAUDE.md.bak`, a second rules
directory, and so on) — ownership resolves by exact path match, and an
unrecognized file is not a harmless no-op, it is simply never loaded.

## Before you submit

Every proposal is checked in this order:

1. **`proposal_guard.py`** — the staged diff must touch only `workspace/**`,
   use an allowed extension (`.md .json .yaml .yml .toml .py .js .mjs .cjs
   .ts .tsx .sh .txt`), never touch `manifest.json`, and must not contain
   evaluator-owned runtime signals (deadline/budget/harbor/evaluator
   language, `RSIBENCH_TASK_`, `AgentTimeoutError`).
2. **`diff_scope_check.py --agent claude-code`** — every staged path must
   start with `workspace/`.
3. **`candidate_check.py --agent claude-code --harness <path> --output
   <path>`** — parses every `workspace/**/*.json` and `*.toml`, syntax-checks
   every `.sh` file, validates `.claude/settings.json` (only a `hooks` key,
   every referenced command must resolve) and `.mcp.json` (an `mcpServers`
   object, every server command must resolve), and runs `claude agents` as a
   live smoke test when the CLI is present in the sandbox.

A candidate that fails any of these is rejected before it reaches TRAIN.
Module-specific verification is described in each module's own guide.
