# Independent Pi candidate validation verdict

This archived report is not returned to the Meta-agent as a repair turn. The candidate failed the external verdict after its required in-sandbox self-check and is rejected.

- Candidate: `round-01`
- Attempt: `1`
- Source commit: `c8da40ed2bf478de99c02c3aa1211d483588451e`
- Failed phase: `manifest`
- Changed paths: `submission.json`

The accepted source remains unchanged. Generated `dist/**` output is never part of the submitted candidate.

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
