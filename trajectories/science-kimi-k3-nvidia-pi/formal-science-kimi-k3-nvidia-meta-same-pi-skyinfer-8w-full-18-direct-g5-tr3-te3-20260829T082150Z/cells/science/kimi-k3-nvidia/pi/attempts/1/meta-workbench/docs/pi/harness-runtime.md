# PI_SRC_HARNESS_RUNTIME — Agent Harness Runtime

## What this module is

The reusable agent-harness layer beneath the coding-agent: environment
wiring, lifecycle, and runtime entry points. Owned files:
`packages/agent/src/harness/agent-harness.ts`, `packages/agent/src/harness/env/**`,
`packages/agent/src/harness/types.ts`, `packages/agent/src/index.ts`,
`packages/agent/src/node.ts`, `packages/agent/src/proxy.ts`, and
`packages/agent/src/types.ts`. Core-source — `requires_core_rebuild = true`.

## How it affects runtime behavior

This is the dependency-injection and lifecycle plumbing that every other
harness-level module (observation, compaction, session storage, skill
loading, tool runtime) is wired through. A defect here rarely produces a
narrow symptom — it tends to show up as environment/dependency wiring being
wrong for the whole run, or a runtime entry point not reaching the code path
RSIBench's default task run actually exercises.

## How to edit it well

Choose PI_SRC_HARNESS_RUNTIME when the reusable agent harness wires
environment, lifecycle, or runtime dependencies incorrectly — this is
infrastructure wiring, not task-specific instructions, which belong in
Shared-6.

Inspect `packages/agent/README.md` and
`packages/agent/src/harness/agent-harness.ts` first. Follow Pi's
agent-harness and durable-harness documentation, and preserve the existing
dependency-injection pattern and cleanup semantics — this module is
consumed by every other harness module, so a breaking change here has wide
blast radius.

## Constraints

Task-specific instructions belong to Shared-6, not harness wiring. Don't use
this module to route task guidance around the normal prompt/rules/skills
surfaces.

## How to verify

Run the targeted check (`agent-harness`), and critically, prove the changed
path is actually reached by RSIBench's default task run — a harness-wiring
change that isn't exercised by the standard run path gives you no real
evidence either way. Then run the mandatory clean rebuild and Pi CLI smoke
via `candidate_check.py --agent pi --source <path>` before submission.
