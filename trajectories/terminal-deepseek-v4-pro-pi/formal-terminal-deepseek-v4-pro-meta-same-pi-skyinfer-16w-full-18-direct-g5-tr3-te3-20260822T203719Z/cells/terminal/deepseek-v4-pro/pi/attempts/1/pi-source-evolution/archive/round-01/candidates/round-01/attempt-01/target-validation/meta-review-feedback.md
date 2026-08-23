# Direct full-training gate result

- Result: `direct_full_training_improved`
- Candidate source commit: `1317229b78d0baf83759fa7b41498aff99f37e44`
- Repeats per claimed task: `3`
- Evidence: `/tmp/rsibench-release-20260822/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260822T203719Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-01/candidates/round-01/attempt-01/target-validation/result.json`

- `terminal-bench-model-extraction-relu-logits`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-tune-mjcf`: baseline `0.0`, candidate `0.3333333333333333`, delta `0.3333333333333333`
- `terminal-bench-make-mips-interpreter`: baseline `0.3333333333333333`, candidate `0.3333333333333333`, delta `0.0`
- `terminal-bench-largest-eigenval`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-write-compressor`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-sanitize-git-repo`: baseline `0.0`, candidate `1.0`, delta `1.0`
- `terminal-bench-headless-terminal`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`
- `terminal-bench-cobol-modernization`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-qemu-alpine-ssh`: baseline `0.6666666666666666`, candidate `0.6666666666666666`, delta `0.0`
- `terminal-bench-configure-git-webserver`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-regex-log`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-adaptive-rejection-sampler`: baseline `0.3333333333333333`, candidate `0.0`, delta `-0.3333333333333333`
- `terminal-bench-build-cython-ext`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-raman-fitting`: baseline `0.0`, candidate `0.0`, delta `0.0`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. Acceptance additionally requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
