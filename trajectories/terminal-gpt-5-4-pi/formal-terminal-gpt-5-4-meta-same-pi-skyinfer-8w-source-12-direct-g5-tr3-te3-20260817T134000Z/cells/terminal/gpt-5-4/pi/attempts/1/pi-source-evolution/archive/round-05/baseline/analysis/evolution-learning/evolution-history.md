# Pi evolution history

Use measured task flips and score deltas to decide KEEP, IMPROVE, or
ROLLBACK + PIVOT. Causal mechanisms are free text, not controller categories.

## round-01 — accepted

- reason: direct_full_training_improved
- change: round-01-agent-session-idle-stream-retry
- module: PI_SRC_CODING_SESSION
- mechanism: Extend AgentSession._isRetryableError() to classify provider stream idle timeout, stalled connection, and stream-ended-without-finish-reason errors as retryable in addition to the existing generic retryable assistant errors. This reuses the current retry backoff and continue flow on the normal RSIBench execution path.
- baseline/candidate/delta: 0.3555555555555555 / 0.4444444444444444 / 0.0888888888888889
- improved tasks: terminal-bench-build-cython-ext, terminal-bench-qemu-alpine-ssh, terminal-bench-sanitize-git-repo, terminal-bench-tune-mjcf
- regressed tasks: terminal-bench-adaptive-rejection-sampler, terminal-bench-cobol-modernization, terminal-bench-regex-log
- performance feedback delivery: none


## round-02 — rejected

- reason: direct_full_training_no_improvement
- change: round-02-agent-session-safe-continue-guard
- module: PI_SRC_CODING_SESSION
- mechanism: Add a default-path guard in AgentSession that checks whether the current state can legally continue before both returning queued-continuation intent and before calling agent.continue(). This keeps retries and extension-queued post-run work on the normal path when the tail message is user/toolResult, but suppresses invalid continuation when the tail is assistant.
- baseline/candidate/delta: 0.4444444444444444 / 0.3777777777777777 / -0.06666666666666671
- improved tasks: terminal-bench-adaptive-rejection-sampler, terminal-bench-largest-eigenval
- regressed tasks: terminal-bench-build-cython-ext, terminal-bench-qemu-alpine-ssh, terminal-bench-regex-log, terminal-bench-sanitize-git-repo
- performance feedback delivery: next_round_same_recursive_meta_agent


## round-03 — rejected

- reason: direct_full_training_no_improvement
- change: round-03-tool-path-current-dir-preserve-dot
- module: PI_SRC_TOOL_RUNTIME
- mechanism: Adjust resolveToCwd() so literal current-directory placeholders (".", "./", and empty string) preserve the symbolic "." result instead of being rewritten to the absolute cwd. All other paths still resolve normally. This changes model-visible tool call/error text on the default path while leaving actual nontrivial path resolution untouched.
- baseline/candidate/delta: 0.4444444444444444 / 0.3555555555555555 / -0.0888888888888889
- improved tasks: terminal-bench-largest-eigenval
- regressed tasks: terminal-bench-build-cython-ext, terminal-bench-qemu-alpine-ssh, terminal-bench-tune-mjcf
- performance feedback delivery: next_round_same_recursive_meta_agent


## round-04 — rejected

- reason: direct_full_training_no_improvement
- change: round-04-agent-session-post-run-continue-legality-guard
- module: PI_SRC_CODING_SESSION
- mechanism: Add a narrow default-path legality check in AgentSession that only allows post-run continuation when the current transcript tail is user or toolResult. The guard is applied both when _handlePostAgentRun reports more work and immediately before calling agent.continue(), preserving the accepted retry mechanism but preventing assistant-tail post-run continuation after terminal states.
- baseline/candidate/delta: 0.4444444444444444 / 0.26666666666666666 / -0.17777777777777776
- improved tasks: terminal-bench-cobol-modernization
- regressed tasks: terminal-bench-adaptive-rejection-sampler, terminal-bench-build-cython-ext, terminal-bench-qemu-alpine-ssh, terminal-bench-regex-log, terminal-bench-sanitize-git-repo, terminal-bench-tune-mjcf
- performance feedback delivery: next_round_same_recursive_meta_agent


## meta-agent-smoke — rejected

- reason: qualification_passed
- change: meta-agent-smoke
- module: PI_SRC_AGENT_LOOP
- mechanism: Insert exactly one harmless source comment immediately before the defaultStreamFn declaration in packages/agent/src/stream-fn.ts so the controller can verify the candidate produced a real owned source diff through the normal submission protocol.
- baseline/candidate/delta: None / None / None
- improved tasks: none
- regressed tasks: none
- performance feedback delivery: none


## Prompt policy

- performance attempts: 0
- performance rejections: 0
- blocked after no lift: False
- required action: prompt_remains_eligible_with_causal_evidence
