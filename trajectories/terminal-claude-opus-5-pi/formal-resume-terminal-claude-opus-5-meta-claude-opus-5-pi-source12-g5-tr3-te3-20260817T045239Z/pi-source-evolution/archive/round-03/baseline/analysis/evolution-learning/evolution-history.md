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


## round-02 — accepted

- reason: targeted_training_improved
- change: round-02-loop-contract-audit-and-no-progress-guard
- module: PI_SRC_AGENT_LOOP
- mechanism: Both objectives live in packages/agent/src/agent-loop.ts as deterministic state derived from the run itself; packages/agent/src/types.ts adds TaskContractAuditConfig to AgentLoopConfig and packages/agent/src/agent.ts threads it through Agent and createLoopConfig, which the coding agent constructs in sdk.ts - that is the default-path consumer of the new option, so the RSIBench path picks up the defaults with no call-site change. OBJECTIVE A: at the top of runLoop, createTaskContractAuditState parses the task's user messages into externally checkable obligations - verbatim commands (fenced blocks, indented blocks, inline code spans, admitted only when the command head is a real executable and the line carries arguments), root module names imported by quoted python snippets, and file paths the task names as outputs (required only when a producing verb governs the mention within a 70-character lead window and no negation marker appears nearby). recordTurnForAudit updates that state after every assistant turn from the actual tool calls: which obligations were exercised and at what fidelity (literal versus recognizable variant, with host-insensitive argument matching so localhost for a quoted hostname still counts), the working directory implied by a leading cd, the directories this run created (git clone targets with flag-value skipping, mkdir targets, and the cwd of an in-place build_ext --inplace or pip install -e), the position at which each named artifact was last produced or referenced (by bash command text, by write/edit path, or by an artifact path appearing inside written file content), and the last destructive action - restricted to genuinely state-destroying patterns (rm -rf, git reset --hard, git clean -, git gc, update-ref -d, systemctl or service stop, pkill, apt-get purge) and suppressed when every target is scratch space under /tmp. collectAuditFindings reports only provable gaps: (1) a quoted command never exercised in any form; (2) every quoted command having succeeded earlier but a destructive action occurring strictly after the last such exercise with no re-verification since; (3) a quoted snippet exercised exclusively from inside a directory this run created; (4) at exit, a named output artifact never created or referenced; and (5) at exit, an artifact that was produced but only before a later destructive action that nothing has touched since - the grader reads the final filesystem, not the moment the file first appeared. Findings become one short machine-generated user message labelled '[pi harness]' carrying elapsed seconds and tool-call count, injected through the existing pendingMessages path so the loop continues instead of emitting agent_end; it runs at the exit point and as a mid-run checkpoint every eight turns. OBJECTIVE B: recordInvocation hashes each tool call to a flag-and-redirection-free signature (first six distinctive tokens for bash, tool plus path for write and edit). When a signature reaches three occurrences, runRepeatGuard injects a notice naming the repeated operation, its count, the elapsed wall-clock and total tool calls, and instructs the run either to change approach materially or to stop iterating and spend the remaining budget making the current state durable and running the task's own acceptance check once, literally. It fires before the contract checkpoint because non-convergence is the more urgent signal. Both mechanisms are bounded (three contract notices, two repeat notices per run), deduplicated by finding signature, skipped when the abort signal is set, silent when the task states nothing mechanically checkable, and switchable off via taskContractAudit.enabled.
- baseline/candidate/delta: 0.6666666666666666 / 1.0 / 0.33333333333333337
- improved tasks: terminal-bench-build-cython-ext, terminal-bench-configure-git-webserver, terminal-bench-qemu-alpine-ssh
- regressed tasks: none
- performance feedback delivery: none

- scored attempt 1: gate=targeted_training_improved, review=accept, score_judgment=causal_improvement, failure_disposition=none
  reflection: <REDACTED_USER_HOME>/rsibench/runs/formal-resume-terminal-claude-opus-5-meta-claude-opus-5-pi-source12-g5-tr3-te3-20260817T045239Z/pi-source-evolution/archive/round-02/candidates/round-02/attempt-01/post-review/reflection.json

## Prompt policy

- performance attempts: 0
- performance rejections: 0
- blocked after no lift: False
- required action: prompt_remains_eligible_with_causal_evidence
