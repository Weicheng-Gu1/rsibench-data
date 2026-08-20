# Pi candidate source validation failed

This is repair-only controller feedback, not downstream task evidence. Use it only to repair the same candidate; do not cite it as failure evidence, root cause, mechanism, or a predicted task fix.

- Candidate: `round-04`
- Attempt: `3`
- Source commit: `ad57a38d560c64e54f8fefa12a7c6a9c0b96feb4`
- Failed phase: `strategy`
- Changed paths: `packages/agent/src/agent-loop.ts, packages/agent/src/types.ts`

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
causal citation for 'terminal-bench-raman-fitting' does not name a recorded failed repeat
```
