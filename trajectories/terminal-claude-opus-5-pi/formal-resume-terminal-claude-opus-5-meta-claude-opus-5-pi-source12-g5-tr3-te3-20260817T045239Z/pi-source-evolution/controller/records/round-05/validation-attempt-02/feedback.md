# Pi candidate source validation failed

This is repair-only controller feedback, not downstream task evidence. Use it only to repair the same candidate; do not cite it as failure evidence, root cause, mechanism, or a predicted task fix.

- Candidate: `round-05`
- Attempt: `2`
- Source commit: `49d84496c84c7cf2bb2b3d9d046e1f123b767981`
- Failed phase: `strategy`
- Changed paths: `packages/agent/src/agent-loop.ts`

Fix the source in the same candidate worktree, then submit again. Do not edit generated `dist/**` output.

## strategy: cross-round-pivot-contract

- Exit code: `1`
- Timed out: `False`
- Command: `validate-evolution-strategy`

### stdout (tail)

```text

```

### stderr (tail)

```text
causal citation for 'terminal-bench-raman-fitting' must identify an action_NN from the failed rollout's evidence packet
cross_task_pattern requires citations to counterfactual findings from at least two distinct required tasks
```
