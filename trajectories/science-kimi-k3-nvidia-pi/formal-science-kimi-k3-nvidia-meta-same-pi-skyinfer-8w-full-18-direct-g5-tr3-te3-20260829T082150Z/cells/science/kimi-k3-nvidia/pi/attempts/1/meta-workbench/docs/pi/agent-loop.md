# PI_SRC_AGENT_LOOP — Agent Loop

## What this module is

The lowest-level turn/tool cycling loop in Pi. Owned files:
`packages/agent/src/agent-loop.ts`, `packages/agent/src/agent.ts`, and
`packages/agent/src/stream-fn.ts`. This is a core-source module —
`requires_core_rebuild = true`.

## How it affects runtime behavior

This is what drives one task run forward: it decides when to make the next
model call, how tool-call batches are cycled through execution, when to
stop, how cancellation propagates, and how retries are attempted. If the
agent stops before acting when it shouldn't, or continues running after it
has reached a terminal state, the defect is almost always here, in the loop
itself rather than in what the model was told to do.

## How to edit it well

Choose PI_SRC_AGENT_LOOP when turn progression, tool-call cycling, stopping,
cancellation, or retry state is wrong — not when the model was given wrong
guidance (that's Shared-6) and not when a correct decision is transformed
incorrectly on the wire to the provider (that's
[provider-runtime.md](provider-runtime.md)).

Before editing, inspect `packages/agent/README.md` and
`packages/agent/src/agent-loop.ts` in the candidate worktree — Pi's own docs
define the event flow and tool-batch semantics you must preserve, in
particular ordered persistence of turn state and correct cancellation
behavior.

## Constraints

Do not change provider request serialization here — that belongs to
`PI_SRC_PROVIDER_RUNTIME`. Do not encode task policy or task-specific
behavior in the loop; it must remain task-general.

## How to verify

Trace one failing turn through the default loop using TRAIN evidence, add a
focused test covering the specific defect, then run the module's targeted
checks (`agent-loop`, `cancel-error-smoke`) followed by the mandatory clean
rebuild (`npm ci --ignore-scripts --offline`, `npm run build:offline`) and
Pi CLI smoke (`cli.js --version`) via `candidate_check.py --agent pi
--source <path>`. A core-source change that doesn't clean-build and pass
CLI smoke is rejected regardless of what the targeted test shows.
