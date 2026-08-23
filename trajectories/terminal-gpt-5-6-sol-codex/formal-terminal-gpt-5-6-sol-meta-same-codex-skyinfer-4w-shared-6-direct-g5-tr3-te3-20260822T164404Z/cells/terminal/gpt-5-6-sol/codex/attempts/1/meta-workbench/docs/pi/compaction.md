# PI_SRC_COMPACTION — Compaction

## What this module is

The overflow-handling layer that summarizes and prunes context when a
session grows too large to serialize whole. Owned trees:
`packages/agent/src/harness/compaction/**` and
`packages/coding-agent/src/core/compaction/**`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

When context needs to shrink, this module decides what survives — the
summary metadata, which entries are kept verbatim, which files are still
tracked, and how a turn that gets split across a compaction boundary is
handled. Pi's compaction docs define these invariants. A defect here
manifests specifically at long-running or context-heavy tasks: correct
behavior right up until compaction fires, then task-critical state
disappears or a resumed session loses continuity.

## How to edit it well

Choose PI_SRC_COMPACTION only for overflow, summary, branch recovery, or
state loss caused specifically by compaction — not for ordinary message
handoff without compaction involved, which belongs to
[context.md](context.md).

Inspect `packages/coding-agent/docs/compaction.md` and
`packages/coding-agent/src/core/compaction` first. Preserve the documented
invariants: summary metadata shape, kept-entry boundaries, file tracking
across the compaction point, and correct handling of a turn split across
that boundary.

## Constraints

Ordinary context handoff without a compaction event belongs to
[context.md](context.md); don't touch this module for a bug that shows up
before compaction ever fires.

## How to verify

Test a real compact/resume boundary and confirm task-critical facts are
actually retained across it, using TRAIN evidence from a long-running task
if available. Run the targeted check (`compaction`), then run the mandatory
clean rebuild and Pi CLI smoke via `candidate_check.py --agent pi --source
<path>` before submission.
