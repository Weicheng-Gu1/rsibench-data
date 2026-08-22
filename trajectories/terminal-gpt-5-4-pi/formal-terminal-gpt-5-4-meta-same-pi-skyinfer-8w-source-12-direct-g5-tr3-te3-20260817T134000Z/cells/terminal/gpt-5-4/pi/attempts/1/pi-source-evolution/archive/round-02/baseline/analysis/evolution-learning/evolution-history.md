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
