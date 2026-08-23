# SHARED_PROMPT — Pi

## What this module is

`.pi/APPEND_SYSTEM.md` is Pi's native append-to-system-prompt file. Pi loads
it unconditionally on every task alongside the task instruction — there is
no trigger and no way to scope it to a subset of tasks. It is the only
Shared-6 module every task pays for.

## How it affects runtime behavior

Content is appended to the system prompt without shadowing or replacing the
original task instruction; both are visible together. `PI_SRC_PROMPT_LOADER`
is the module that actually performs this discovery/ordering/escaping step —
if the file's content is correct but never reaches the model, that's a
Source-12 bug in the loader, not a Shared-6 content problem. See
[prompt-loader.md](prompt-loader.md).

## How to edit it well

Choose SHARED_PROMPT when a concise strategy or completion discipline is
missing across multiple TRAIN tasks and the failure is caused by an absent
general strategy rather than broken runtime execution. If the gap only
matters under a specific trigger, use [rules.md](rules.md) instead; if it's
a reusable procedure only some tasks need, use [skills.md](skills.md).

Write in terms of observable actions and stopping criteria, and preserve the
original task instruction and any literal braces within it.

An optional evidence-backed example is Open-RSI's five-step scaffold:

```
PLAN: restate the goal and concrete acceptance criteria, edge cases, and error paths.
IMPLEMENT: make the smallest change that satisfies the next unmet criterion.
VERIFY: run the result and inspect real outputs, edge cases, and failure paths.
LEARN & FIX: use verification evidence to revise the implementation and repeat.
ADVERSARIAL REVIEW: ask what a strict grader would reject and close those gaps before finishing.
```

This is prompt scaffolding, not an agent-loop source change, and should be
adopted only when TRAIN contrasts show missing execution discipline.

## Constraints

Do not encode task answers, hidden-test details, model routing, budgets, or
behavior that belongs in a narrower rule or skill. Do not use this module to
compensate for a loader bug — if the content is right but not loading
correctly, fix `PI_SRC_PROMPT_LOADER` instead.

## How to verify

Validate resource schema, native prompt load (confirm Pi's resource
preflight and `pi_resource_check.mjs` still report no diagnostics), and
instruction preservation — the original task instruction text must remain
intact and the appended guidance must not duplicate a conditional rule or
skill.
