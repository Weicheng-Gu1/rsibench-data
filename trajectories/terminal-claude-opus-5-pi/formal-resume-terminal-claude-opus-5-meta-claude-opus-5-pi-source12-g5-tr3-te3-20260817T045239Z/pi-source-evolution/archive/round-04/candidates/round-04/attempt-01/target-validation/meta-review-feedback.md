# Targeted training gate result

- Result: `targeted_training_regressed`
- Candidate source commit: `ed983167acfda1bf5f778371091f9365130d9cbe`
- Repeats per claimed task: `3`
- Evidence: `<REDACTED_USER_HOME>/rsibench/runs/formal-resume-terminal-claude-opus-5-meta-claude-opus-5-pi-source12-g5-tr3-te3-20260817T045239Z/pi-source-evolution/archive/round-04/candidates/round-04/attempt-01/target-validation/result.json`

- `terminal-bench-raman-fitting`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-regex-log`: baseline `1.0`, candidate `1.0`, delta `0.0`

The controller runs only the current declared targets plus one task selected from the accepted all-pass pool as anchor: ['terminal-bench-regex-log']. Unselected mixed tasks are not rerun. Later attempts may select different targets from the frozen non-all-pass validation surface, ordered mixed-first then zero-pass: ['terminal-bench-raman-fitting', 'terminal-bench-cobol-modernization', 'terminal-bench-gcode-to-text', 'terminal-bench-adaptive-rejection-sampler']. The accepted baseline was reused; only your built candidate ran. Inspect the evidence and candidate trajectories, explain which prediction was falsified, then revise or revert the cumulative source diff and submit a materially different source candidate.
