# SHARED_PROMPT — Claude Code

## What this module is

`workspace/CLAUDE.md` is Claude Code's native project-memory file. Claude
Code loads it unconditionally into every task's context alongside the task
instruction — there is no trigger, no selection step, and no way to scope it
to a subset of tasks. It is the only module in this harness that every task
pays for.

## How it affects runtime behavior

CLAUDE.md content is prepended/attached as project guidance before the model
sees the task instruction. It does not replace or shadow the instruction;
both are visible together. Because it loads on every task, anything wrong
here (a contradiction, an over-broad claim, an unbounded instruction) affects
every task, not just the ones you're trying to fix.

## How to edit it well

Choose SHARED_PROMPT when a concise strategy or completion discipline is
missing across *multiple* TRAIN tasks, and the task instruction itself is
correct but the agent lacks an always-relevant execution loop. If the gap
only matters under a specific file, language, or tool, use
[rules.md](rules.md) instead; if it's a reusable procedure that only some
tasks need, use [skills.md](skills.md) — CLAUDE.md is for the minority of
guidance that is unconditionally worth its context cost on every task.

Write in terms of observable actions and stopping criteria, not generic
exhortations ("be careful", "think step by step"). Preserve the original
task instruction and any braces or literal text within it — you are adding
guidance, not rewriting the task.

A validated example (Open-RSI's evidence-driven scaffold) is:

```
PLAN: restate the goal and concrete acceptance criteria, edge cases, and error paths.
IMPLEMENT: make the smallest change that satisfies the next unmet criterion.
VERIFY: run the result and inspect real outputs, edge cases, and failure paths.
LEARN & FIX: use verification evidence to revise the implementation and repeat.
ADVERSARIAL REVIEW: ask what a strict grader would reject and close those gaps before finishing.
```

This is a seed example, not a mandatory template — adopt or adapt it only
when TRAIN contrasts actually show missing execution discipline, not by
default.

## Constraints

Do not place conditional or narrow procedures here — that's rules or skills
territory. Do not place executable lifecycle logic here — that's hooks. Do
not encode task ids, answers, hidden-test details, evaluator state, model
routing, credentials, budgets, or acceptance controls, here or in any shared
module.

## How to verify

`candidate_check.py` treats `CLAUDE.md` as plain text (no schema to
validate), but the full candidate check still runs JSON/TOML/shell
validation and the `claude agents` smoke test on the rest of the workspace,
so a broken proposal elsewhere in the harness still fails your submission.
Manually confirm: the file still contains the original task instruction
text unmodified, the added guidance doesn't contradict a rule or skill you
also touched, and the change is something you'd want applied to *every*
task in the suite.
