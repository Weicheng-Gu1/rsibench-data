# Pi candidate source validation failed

This is repair-only controller feedback, not downstream task evidence. Use it only to repair the same candidate; do not cite it as failure evidence, root cause, mechanism, or a predicted task fix.

- Candidate: `round-01`
- Attempt: `1`
- Source commit: `12d38fedc336403046cb826cd858cafa32f07683`
- Failed phase: `strategy`
- Changed paths: `packages/agent/src/agent-loop.ts, packages/agent/src/agent.ts, packages/agent/src/types.ts, packages/agent/test/agent-loop.test.ts`

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
causal citation for 'terminal-bench-qemu-alpine-ssh' must name a recorded successful repeat
causal citation for 'terminal-bench-configure-git-webserver' must name a recorded successful repeat
causal citation for 'terminal-bench-build-cython-ext' must name a recorded successful repeat
```
