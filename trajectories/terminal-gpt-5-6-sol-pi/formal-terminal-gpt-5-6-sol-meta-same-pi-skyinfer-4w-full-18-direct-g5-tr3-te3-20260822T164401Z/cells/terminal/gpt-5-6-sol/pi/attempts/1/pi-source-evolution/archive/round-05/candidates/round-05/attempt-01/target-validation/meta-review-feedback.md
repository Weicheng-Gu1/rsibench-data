# Direct full-training gate result

- Result: `direct_full_training_insufficient_task_improvements`
- Candidate source commit: `d54e45fc72de253d402939f0765e0ded480b12a8`
- Repeats per claimed task: `3`
- Evidence: `<REDACTED_USER_HOME>/rsibench-formal-master-20260823/runs/formal-terminal-gpt-5-6-sol-meta-same-pi-skyinfer-4w-full-18-direct-g5-tr3-te3-20260822T164401Z/cells/terminal/gpt-5-6-sol/pi/attempts/1/pi-source-evolution/archive/round-05/candidates/round-05/attempt-01/target-validation/result.json`

- `terminal-bench-model-extraction-relu-logits`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-cobol-modernization`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-headless-terminal`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-write-compressor`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-raman-fitting`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-make-mips-interpreter`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-largest-eigenval`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-sanitize-git-repo`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-tune-mjcf`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`
- `terminal-bench-adaptive-rejection-sampler`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-build-cython-ext`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-regex-log`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-configure-git-webserver`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-qemu-alpine-ssh`: baseline `0.6666666666666666`, candidate `0.6666666666666666`, delta `0.0`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. Acceptance additionally requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
