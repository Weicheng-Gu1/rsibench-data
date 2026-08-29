# Pi evolution history

Use measured task flips and score deltas to decide KEEP, IMPROVE, or
ROLLBACK + PIVOT. Causal mechanisms are free text, not controller categories.

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
