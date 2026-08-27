# PI_SRC_TOOL_RUNTIME — Tool Runtime

## What this module is

The actual implementation of Pi's native tools. Owned paths:
`packages/agent/src/harness/tools/**` and the catalogued coding-agent
execution files — `bash.ts`, `edit-diff.ts`, `edit.ts`,
`file-mutation-queue.ts`, `find.ts`, `grep.ts`, `index.ts`, `ls.ts`,
`path-utils.ts`, `read.ts`, `render-utils.ts`,
`tool-definition-wrapper.ts`, `write.ts`, `bash-executor.ts`, and `exec.ts`
under `packages/coding-agent/src/core/`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

This is where a tool call actually happens: schema validation, invocation,
filesystem mutation, command execution, timeout enforcement, and turning a
failure into a structured execution error. If a tool produces the wrong
result, mutates the filesystem incorrectly, times out incorrectly, or its
error semantics are wrong, the defect is here.

## How to edit it well

Choose PI_SRC_TOOL_RUNTIME for tool schema, invocation, filesystem mutation,
bash execution, timeout, or execution-error defects. Inspect
`packages/coding-agent/README.md` and `packages/coding-agent/src/core/tools`
first.

Preserve sandbox boundaries (a tool fix must not widen what the sandbox
allows) and existing error semantics (callers and the observation layer
depend on a stable error shape). Exercise the exact tool path involved, its
failure mode, and a normal/successful case — don't fix only the failure
path and silently break the common case.

## Constraints

Lossy presentation of an otherwise-correct tool result belongs to
[observation.md](observation.md), not here — if the tool did the right
thing but the model can't tell, that's a different module.

## How to verify

Exercise the exact tool path, its failure mode, and a normal case using
TRAIN evidence. Run the targeted checks (`tools`, `mutation-queue`), then
run the mandatory clean rebuild and Pi CLI smoke via `candidate_check.py
--agent pi --source <path>` before submission.
