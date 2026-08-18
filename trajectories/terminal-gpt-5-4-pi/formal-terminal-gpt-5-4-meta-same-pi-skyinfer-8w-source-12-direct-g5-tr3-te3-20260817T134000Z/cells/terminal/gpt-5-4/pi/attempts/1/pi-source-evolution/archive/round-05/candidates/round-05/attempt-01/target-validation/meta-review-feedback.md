# Direct full-training gate result

- Result: `direct_full_training_no_improvement`
- Candidate source commit: `42b0e30999899a7f383d70b55ba57cf4de0b997e`
- Repeats per claimed task: `3`
- Evidence: `/tmp/rsibench-direct-meta-20260817T105156Z/runs/formal-terminal-gpt-5-4-meta-same-pi-skyinfer-8w-source-12-direct-g5-tr3-te3-20260817T134000Z/cells/terminal/gpt-5-4/pi/attempts/1/pi-source-evolution/archive/round-05/candidates/round-05/attempt-01/target-validation/result.json`

- `terminal-bench-model-extraction-relu-logits`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-cobol-modernization`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`
- `terminal-bench-headless-terminal`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-write-compressor`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-raman-fitting`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-make-mips-interpreter`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-largest-eigenval`: baseline `0.3333333333333333`, candidate `0.0`, delta `-0.3333333333333333`
- `terminal-bench-sanitize-git-repo`: baseline `0.6666666666666666`, candidate `0.6666666666666666`, delta `0.0`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-tune-mjcf`: baseline `0.6666666666666666`, candidate `0.0`, delta `-0.6666666666666666`
- `terminal-bench-adaptive-rejection-sampler`: baseline `0.6666666666666666`, candidate `0.6666666666666666`, delta `0.0`
- `terminal-bench-build-cython-ext`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-regex-log`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-configure-git-webserver`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-qemu-alpine-ssh`: baseline `1.0`, candidate `0.0`, delta `-1.0`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. There are no target, anchor, or post-review gates in direct mode.
