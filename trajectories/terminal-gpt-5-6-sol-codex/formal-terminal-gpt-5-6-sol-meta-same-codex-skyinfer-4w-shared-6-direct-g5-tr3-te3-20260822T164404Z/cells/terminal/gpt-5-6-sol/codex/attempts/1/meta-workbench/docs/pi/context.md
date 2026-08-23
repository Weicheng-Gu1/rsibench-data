# PI_SRC_CONTEXT — Context Construction and Provider Handoff

## What this module is

The step between the agent's message history and the provider-specific wire
format. Owned files: `packages/coding-agent/src/core/model-runtime.ts` and
`packages/coding-agent/src/core/provider-composer.ts`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

Pi's agent flow is Message -> context transform -> provider conversion. This
module owns the middle step: assembling valid history into the context that
gets hand off to serialization. If messages are omitted, duplicated, or
misordered before the provider ever sees them, the defect is here, upstream
of anything the provider-runtime layer does to the wire format.

## How to edit it well

Choose PI_SRC_CONTEXT when valid history is assembled incorrectly before the
provider handoff — model context omits, duplicates, or orders messages
incorrectly before serialization. Locate the first point of divergence
between what should be in context and what actually is; don't assume the
bug is here without tracing it, since a downstream provider-runtime bug can
look similar from the outside.

Inspect `packages/coding-agent/src/core/model-runtime.ts` and
`packages/coding-agent/src/core/provider-composer.ts` first.

## Constraints

Wire-format parameters and streamed response parsing belong to
[provider-runtime.md](provider-runtime.md), not here. Test assembled context
without changing model routing or credentials — those remain frozen
regardless of what you find.

## How to verify

Test the assembled context directly (not just end-to-end task outcome) using
TRAIN evidence, run the targeted checks (`context`, `provider-context`), then
run the mandatory clean rebuild and Pi CLI smoke via `candidate_check.py
--agent pi --source <path>` before submission.
