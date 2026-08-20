# Pi candidate source validation failed

This is repair-only controller feedback, not downstream task evidence. Use it only to repair the same candidate; do not cite it as failure evidence, root cause, mechanism, or a predicted task fix.

- Candidate: `round-05`
- Attempt: `1`
- Source commit: `00f72d30fb0f3254deb67a4a113cbec147ffb116`
- Failed phase: `manifest`
- Changed paths: `packages/coding-agent/src/core/system-prompt.ts, packages/coding-agent/src/core/task-guidance.ts`

Fix the source in the same candidate worktree, then submit again. Do not edit generated `dist/**` output.

## manifest: change-manifest-contract

- Exit code: `1`
- Timed out: `False`
- Command: `validate-change-manifest`

### stdout (tail)

```text

```

### stderr (tail)

```text
unowned evolvable path: packages/coding-agent/src/core/task-guidance.ts
```
