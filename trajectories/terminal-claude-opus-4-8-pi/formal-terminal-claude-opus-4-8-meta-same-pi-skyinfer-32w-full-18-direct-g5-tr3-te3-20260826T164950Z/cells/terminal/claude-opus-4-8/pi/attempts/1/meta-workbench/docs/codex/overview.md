# Codex Editable Surface

This sandbox is a single Codex CLI project. The task agent runs against
`workspace/`; the Codex binary, its own source, and everything outside these
six native project resources are frozen. You cannot install a different CLI
or invent a seventh module — the shared-module contract at
`workspace/.rsibench/shared-modules.json` declares exactly these six IDs, and
a file outside their native paths is unowned and never loaded.

## Reading order

1. Read this file, then inventory TRAIN evidence (a passing and a failing
   trajectory for the same task, where available) before touching anything.
2. Read the guide for every module whose native path could plausibly own the
   causal fix.
3. Edit only inside the exact native paths below.

## Module -> guide -> native path

| Module | Guide | Native path(s) |
| --- | --- | --- |
| SHARED_PROMPT | [prompt.md](prompt.md) | `workspace/AGENTS.md` |
| SHARED_RULES | [rules.md](rules.md) | `workspace/.codex/rules/**` |
| SHARED_SKILLS | [skills.md](skills.md) | `workspace/.agents/skills/**` |
| SHARED_HOOKS | [hooks.md](hooks.md) | `workspace/.codex/hooks.json`, `workspace/.codex/hooks/**` |
| SHARED_MCP | [mcp.md](mcp.md) | `workspace/.codex/config.toml` |
| SHARED_WORKFLOW | [workflow.md](workflow.md) | `workspace/.codex/agents/**` |

## How the pieces fit

AGENTS.md is the only unconditionally loaded surface — every task pays for
it. Rules trigger on a matching file/language/tool/failure signature; skills
are selected by a discriminating description under `.agents/skills/`; hooks
fire on a declared lifecycle event regardless of model choice; and
`.codex/agents/**` defines delegated roles invoked explicitly by name.
Prefer the most conditional module that can still carry the fix, since
AGENTS.md content is paid by every task including ones the fix is
irrelevant to.

Note the Codex-specific split that differs from Claude Code: skills live
under `workspace/.agents/skills/**` (not `.codex/skills/**`), while rules,
hooks, MCP config, and subagents live under `workspace/.codex/**`.

## What is frozen

Never edit credentials, routing, benchmark tasks, evaluators, budgets,
acceptance controls, the Codex executable, or
`workspace/.rsibench/shared-modules.json` itself. Never create a
compatibility mirror of a native path — ownership resolves by exact path
match, and an unrecognized file is never loaded, not a harmless duplicate.

## Before you submit

Every proposal is checked in this order:

1. **`proposal_guard.py`** — the staged diff must touch only `workspace/**`,
   use an allowed extension, never touch `manifest.json`, and must not
   contain evaluator-owned runtime signals (deadline/budget/harbor/evaluator
   language, `RSIBENCH_TASK_`, `AgentTimeoutError`).
2. **`diff_scope_check.py --agent codex`** — every staged path must start
   with `workspace/`.
3. **`candidate_check.py --agent codex --harness <path> --output <path>`** —
   parses every `workspace/**/*.json` and `*.toml`, syntax-checks every
   `.sh` file, validates `.codex/config.toml` (only an `mcp_servers` table,
   every server command must resolve) and `.codex/hooks.json` (every
   referenced command must resolve), and — when the `codex` binary is
   present — runs `codex --version`, `codex mcp list`, and
   `codex execpolicy check` against every `.codex/rules/*.rules` file as
   live smoke tests.

A candidate that fails any of these is rejected before it reaches TRAIN.
Module-specific verification is described in each module's own guide.
