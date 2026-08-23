# PI_SRC_SESSION_STORAGE — Session Storage

## What this module is

The durable persistence layer for sessions. Owned files: everything under
`packages/agent/src/harness/session/**`, plus
`packages/coding-agent/src/core/session-manager.ts` and
`packages/coding-agent/src/core/session-cwd.ts`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

This module is what makes a session recoverable across process boundaries:
writing and reading session state, associating a session with its working
directory, and reconstructing it correctly on resume. Follow Pi's sessions
and session-format documentation for the on-disk shape. A defect here
produces symptoms specifically around persistence and resume — a session
that resumes with the wrong id, loses its parent/child relationship, appends
entries out of order, or fails to load after a format change.

## How to edit it well

Choose PI_SRC_SESSION_STORAGE when persistence, cwd association, or resume
loses state across turns. Inspect
`packages/coding-agent/src/core/session-manager.ts` and
`packages/agent/src/harness/session` first.

Preserve session IDs, parentage relationships, append ordering, and
migration compatibility with existing on-disk session formats — a change
that can't read sessions written before your change is a regression, not an
improvement.

## Constraints

In-memory turn orchestration (as opposed to durable persistence) belongs to
[coding-session.md](coding-session.md); don't duplicate that responsibility
here.

## How to verify

Test a write/read/resume cycle using the real storage path, not a mock —
write a session, terminate, and resume it, confirming IDs, parentage, and
ordering all survive. Run the targeted checks (`session`, `storage`), then
run the mandatory clean rebuild and Pi CLI smoke via `candidate_check.py
--agent pi --source <path>` before submission.
