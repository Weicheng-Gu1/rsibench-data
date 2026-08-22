# Direct full-training gate result

- Result: `direct_full_training_improved`
- Candidate source commit: `740a4536cd626fb15883081b4adfd99d000422c3`
- Repeats per claimed task: `3`
- Evidence: `/mnt/public/users/xieweichu/rsibench/runs/formal-terminal-claude-opus-4-8-meta-same-pi-docker-16w-full-18-direct-g5-tr3-te3-20260820T181108Z/cells/terminal/claude-opus-4-8/pi/attempts/1/pi-source-evolution/archive/round-01/candidates/round-01/attempt-01/target-validation/result.json`

- `terminal-bench-model-extraction-relu-logits`: baseline `0.0`, candidate `0.3333333333333333`, delta `0.3333333333333333`
- `terminal-bench-tune-mjcf`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-make-mips-interpreter`: baseline `0.6666666666666666`, candidate `0.6666666666666666`, delta `0.0`
- `terminal-bench-largest-eigenval`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-write-compressor`: baseline `0.0`, candidate `1.0`, delta `1.0`
- `terminal-bench-sanitize-git-repo`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-headless-terminal`: baseline `0.3333333333333333`, candidate `0.0`, delta `-0.3333333333333333`
- `terminal-bench-cobol-modernization`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-qemu-alpine-ssh`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-configure-git-webserver`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `0.3333333333333333`, delta `0.3333333333333333`
- `terminal-bench-regex-log`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-adaptive-rejection-sampler`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`
- `terminal-bench-build-cython-ext`: baseline `1.0`, candidate `0.0`, delta `-1.0`
- `terminal-bench-raman-fitting`: baseline `0.3333333333333333`, candidate `0.0`, delta `-0.3333333333333333`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. There are no target, anchor, or post-review gates in direct mode.
