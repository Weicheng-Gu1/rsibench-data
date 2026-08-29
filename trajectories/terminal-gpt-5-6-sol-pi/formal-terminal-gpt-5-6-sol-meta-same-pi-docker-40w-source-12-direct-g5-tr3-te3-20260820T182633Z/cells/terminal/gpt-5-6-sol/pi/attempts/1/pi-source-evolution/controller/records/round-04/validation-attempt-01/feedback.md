# Pi candidate source validation failed

This is repair-only controller feedback, not downstream task evidence. Use it only to repair the same candidate; do not cite it as failure evidence, root cause, mechanism, or a predicted task fix.

- Candidate: `round-04`
- Attempt: `1`
- Source commit: `de46a90acd0098c5ba56efcd8354b848299f91d2`
- Failed phase: `manifest`
- Changed paths: `.pi/APPEND_SYSTEM.md`

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
invalid candidate change manifest: manifest primary_module must be a non-empty string when set
candidate change manifest is required
```
