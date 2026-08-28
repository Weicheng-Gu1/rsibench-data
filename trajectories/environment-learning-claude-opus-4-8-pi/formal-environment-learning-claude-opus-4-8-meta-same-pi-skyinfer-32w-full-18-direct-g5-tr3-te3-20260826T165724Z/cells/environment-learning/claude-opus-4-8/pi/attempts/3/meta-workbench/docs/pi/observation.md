# PI_SRC_OBSERVATION — Observation and Tool-result Processing

## What this module is

Everything that turns a raw execution result into what the model actually
sees. Owned files: `packages/agent/src/harness/messages.ts`,
`packages/agent/src/harness/utils/shell-output.ts`,
`packages/agent/src/harness/utils/truncate.ts`,
`packages/coding-agent/src/core/messages.ts`,
`packages/coding-agent/src/core/tools/output-accumulator.ts`, and
`packages/coding-agent/src/core/tools/truncate.ts`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

Tool execution can succeed while the model still fails, if what it observes
afterward is lossy, misleading, unordered, or missing the metadata it needs
to reason about a truncation or error. This module governs that
model-visible representation: message shaping, output accumulation, and
truncation. It does not run tools — it decides how their results are
presented.

## How to edit it well

Choose PI_SRC_OBSERVATION when tool results, errors, shell output,
truncation metadata, or message fidelity loses actionable evidence for the
model — not when the tool execution itself is wrong (that's
[tool-runtime.md](tool-runtime.md)).

Inspect `packages/coding-agent/src/core/messages.ts` and
`packages/coding-agent/src/core/tools/truncate.ts` first. Preserve the
full-result reference (don't silently drop data the model could still need)
and keep truncation/error metadata explicit rather than implicit — the model
should be able to tell that something was truncated, not just see a
truncated string.

## Constraints

Tool execution itself belongs to `PI_SRC_TOOL_RUNTIME`; don't reach into
execution logic to fix a presentation problem, and don't reach into
presentation to fix an execution bug.

## How to verify

Test the exact failing output shape and its model-visible representation
using TRAIN evidence, run the targeted checks (`messages`, `tool-output`,
`truncate`), then run the mandatory clean rebuild and Pi CLI smoke via
`candidate_check.py --agent pi --source <path>` before submission.
