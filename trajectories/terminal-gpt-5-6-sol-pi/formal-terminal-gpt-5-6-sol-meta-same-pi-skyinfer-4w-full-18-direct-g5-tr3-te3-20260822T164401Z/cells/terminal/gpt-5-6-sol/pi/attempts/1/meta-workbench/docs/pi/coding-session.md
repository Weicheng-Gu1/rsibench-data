# PI_SRC_CODING_SESSION — Coding Session Runtime

## What this module is

The coding-agent's session orchestration layer, one level above the raw
agent loop. Owned files: `packages/coding-agent/src/core/agent-session.ts`,
its `agent-session-*.ts` companion files, and `packages/coding-agent/src/core/sdk.ts`.
Core-source — `requires_core_rebuild = true`.

## How it affects runtime behavior

This module is the entry point callers use to create a session, feed it
turns, and consume its events — the SDK surface Pi's own `docs/sdk.md`
documents. It orchestrates event propagation and resume behavior for a
session, sitting above the low-level turn state that
[agent-loop.md](agent-loop.md) owns and above the durable persistence that
[session-storage.md](session-storage.md) owns.

## How to edit it well

Choose PI_SRC_CODING_SESSION when coding-session orchestration, event
propagation, resume behavior, or SDK turn entry is wrong. Inspect
`packages/coding-agent/docs/sdk.md` and
`packages/coding-agent/src/core/agent-session.ts` first — the SDK docs
define how callers are expected to create sessions and consume events, and
your fix must preserve that contract.

## Constraints

Storage serialization has a separate owner
([session-storage.md](session-storage.md)); low-level agent-loop state has a
separate owner ([agent-loop.md](agent-loop.md)). Don't duplicate their
responsibilities here — orchestrate, don't reimplement.

## How to verify

Validate a real session start/resume path end to end using TRAIN evidence,
run the targeted checks (`agent-session`, `cli-smoke`), then run the
mandatory clean rebuild and Pi CLI smoke via `candidate_check.py --agent pi
--source <path>` before submission.
