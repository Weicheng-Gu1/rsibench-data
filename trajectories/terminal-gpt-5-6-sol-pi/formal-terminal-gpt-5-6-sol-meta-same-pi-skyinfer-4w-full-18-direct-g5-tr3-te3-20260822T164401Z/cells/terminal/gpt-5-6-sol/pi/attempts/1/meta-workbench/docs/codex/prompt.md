# SHARED_PROMPT — Codex

## What this module is

`workspace/AGENTS.md` is Codex's native project-instructions file. Codex
loads it unconditionally into every task's context alongside the task
instruction — there is no trigger and no way to scope it to a subset of
tasks. It is the only module in this harness that every task pays for.

## How it affects runtime behavior

AGENTS.md content is provided as project guidance together with the task
instruction; it does not replace or shadow the instruction. Because it loads
on every task, anything wrong here affects every task, not just the ones
you're trying to fix.

## How to edit it well

Choose SHARED_PROMPT when a concise strategy or completion discipline is
missing across *multiple* TRAIN tasks, and the task instruction itself is
correct but the agent lacks an always-relevant execution loop. If the gap
only matters under a specific file, language, or tool, use
[rules.md](rules.md) instead; if it's a reusable procedure only some tasks
need, use [skills.md](skills.md).

Write in terms of observable actions and stopping criteria, not generic
exhortations. Preserve the original task instruction literally — you are
adding guidance, not rewriting the task.

An optional evidence-backed example is Open-RSI's prompt-only five-step
loop:

```
PLAN: restate the goal and concrete acceptance criteria, edge cases, and error paths.
IMPLEMENT: make the smallest change that satisfies the next unmet criterion.
VERIFY: run the result and inspect real outputs, edge cases, and failure paths.
LEARN & FIX: use verification evidence to revise the implementation and repeat.
ADVERSARIAL REVIEW: ask what a strict grader would reject and close those gaps before finishing.
```

Adopt or adapt it only when TRAIN contrasts actually support missing
execution discipline, not by default.

## Constraints

Do not place conditional or narrow procedures here — that's rules or
skills. Do not place executable lifecycle logic here — that's hooks. Do not
encode task ids, answers, hidden-test details, evaluator state, model
routing, credentials, budgets, or acceptance controls, here or in any shared
module.

## How to verify

`candidate_check.py` does not schema-check AGENTS.md (it's plain text), but
the full candidate check still validates every JSON/TOML surface and runs
the Codex CLI smoke tests elsewhere in the workspace, so a broken proposal
elsewhere still fails your submission. Manually confirm: Codex discovers the
file, the original task instruction text is unmodified, the added guidance
doesn't conflict with a rule or skill you also touched, and the guidance
remains task-general rather than task-specific.
