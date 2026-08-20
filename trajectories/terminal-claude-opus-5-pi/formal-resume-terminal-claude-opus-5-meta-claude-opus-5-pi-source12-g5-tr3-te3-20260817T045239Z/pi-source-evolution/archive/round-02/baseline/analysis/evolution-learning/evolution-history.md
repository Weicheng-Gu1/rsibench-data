# Pi evolution history

Use measured task flips and score deltas to decide KEEP, IMPROVE, or
ROLLBACK + PIVOT. Causal mechanisms are free text, not controller categories.

## round-01 — rejected

- reason: meta_submission_failed
- change: round-01-agent-loop-completion-audit
- module: PI_SRC_AGENT_LOOP
- mechanism: packages/agent/src/agent-loop.ts builds a CompletionAuditState from the task's user messages at the start of runLoop and updates it after every turn from the actual tool calls (recordTurnForAudit). It deterministically extracts three classes of obligation: verbatim commands quoted in the task (fenced blocks, inline code spans, indented blocks, filtered by an executable command head), import lines of quoted code snippets that must run, and named artifact paths, with paths required only when a producing verb governs the mention and dropped when the mention is negated ('except', 'no need', 'ignore'). Per action it records which obligations were exercised, the working directory via a leading `cd`, the directories the run created or built inside (git clone targets, mkdir, in-place build/install cwds), the last mutating action and, separately, the last destructive action (rm/mv/chmod/kill/git reset|clean|gc|update-ref|checkout/systemctl stop|restart/...), so ordinary forward progress such as compiling or installing never triggers a pointless re-run demand. Where the loop would exit, runCompletionAudit reports findings when a quoted command was never executed as written, when a command or snippet last succeeded before a later destructive change, when a quoted snippet only ever ran from inside a directory this run created (proving the local build tree rather than the installed/global state a grader observes), or when a required artifact was never produced or was rewritten and never re-validated. Any finding causes a machine-generated checklist to be injected as a pending message and the loop continues instead of ending. Bounded and safe: at most maxAudits injections per run (default 2), suppressed on repeated finding signature, skipped when the abort signal is set, silent when the task states no mechanically checkable obligation, and disableable via completionAudit.enabled. AgentLoopConfig.completionAudit is threaded through Agent (packages/agent/src/agent.ts, packages/agent/src/types.ts).
- baseline/candidate/delta: None / None / None
- improved tasks: none
- regressed tasks: none
- performance feedback delivery: none


## Prompt policy

- performance attempts: 0
- performance rejections: 0
- blocked after no lift: False
- required action: prompt_remains_eligible_with_causal_evidence
