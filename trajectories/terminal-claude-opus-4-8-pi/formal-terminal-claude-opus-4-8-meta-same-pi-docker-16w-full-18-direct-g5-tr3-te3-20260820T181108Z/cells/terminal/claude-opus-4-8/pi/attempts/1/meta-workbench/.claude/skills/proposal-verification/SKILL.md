---
name: proposal-verification
description: Use when a candidate harness edit is ready and must be checked for scope, syntax, structural validity, and nonempty on-disk changes.
---

# Verify a Proposal

Stage the current on-disk edit with
`git -C /app/task-agent-harness add -A`, then run, in order:

1. `python3 /app/meta-workbench/scripts/diff_scope_check.py --repo /app/task-agent-harness --agent <claude-code-or-codex-or-pi>`
2. `python3 /app/meta-workbench/scripts/proposal_guard.py --agent <claude-code-or-codex-or-pi> --harness /app/task-agent-harness`
3. For Pi, `"$RSIBENCH_PI_NODE_EXECUTABLE" /app/meta-workbench/scripts/pi_resource_check.mjs /app/task-agent-harness/workspace`

Stop on any nonzero exit. Confirm the staged diff changes one focused mechanism,
does not touch immutable paths, and is an actual disk edit. Do not weaken a
checker to make a proposal pass.
