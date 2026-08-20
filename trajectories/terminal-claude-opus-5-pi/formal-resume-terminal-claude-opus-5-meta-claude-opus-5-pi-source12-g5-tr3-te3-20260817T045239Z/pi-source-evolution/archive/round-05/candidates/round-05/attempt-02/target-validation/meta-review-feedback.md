# Targeted training gate result

- Result: `targeted_training_infrastructure_contaminated`
- Candidate source commit: `085a701cd18efaec3d405a51772bc04618343ee3`
- Repeats per claimed task: `3`
- Evidence: `<REDACTED_USER_HOME>/rsibench/runs/formal-resume-terminal-claude-opus-5-meta-claude-opus-5-pi-source12-g5-tr3-te3-20260817T045239Z/pi-source-evolution/archive/round-05/candidates/round-05/attempt-02/target-validation/result.json`

- `terminal-bench-raman-fitting`: baseline `0.6666666666666666`, candidate `None`, delta `None`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-cobol-modernization`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-write-compressor`: baseline `1.0`, candidate `None`, delta `None`

The controller runs only the current declared targets plus one task selected from the accepted all-pass pool as anchor: ['terminal-bench-write-compressor']. Unselected mixed tasks are not rerun. Later attempts may select different targets from the frozen non-all-pass validation surface, ordered mixed-first then zero-pass: ['terminal-bench-raman-fitting', 'terminal-bench-cobol-modernization', 'terminal-bench-gcode-to-text', 'terminal-bench-adaptive-rejection-sampler']. The accepted baseline was reused; only your built candidate ran. Inspect the evidence and candidate trajectories, explain which prediction was falsified, then revise or revert the cumulative source diff and submit a materially different source candidate.
