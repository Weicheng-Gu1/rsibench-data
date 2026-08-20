# Direct full-training gate result

- Result: `direct_full_training_no_improvement`
- Candidate source commit: `6192e4ca4c6a327c9c856a4f6e1a39a1edd53964`
- Repeats per claimed task: `3`
- Evidence: `<REDACTED_USER_HOME>/rsibench-openrsi-formal-20260819/runs/formal-terminal-gpt-5-5-meta-same-pi-skyinfer-4w-source-12-direct-g5-tr3-te3-20260819T185453Z/cells/terminal/gpt-5-5/pi/attempts/1/pi-source-evolution/archive/round-05/candidates/round-05/attempt-01/target-validation/result.json`

- `terminal-bench-model-extraction-relu-logits`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-cobol-modernization`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-headless-terminal`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-write-compressor`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-raman-fitting`: baseline `0.0`, candidate `0.3333333333333333`, delta `0.3333333333333333`
- `terminal-bench-make-mips-interpreter`: baseline `0.6666666666666666`, candidate `0.0`, delta `-0.6666666666666666`
- `terminal-bench-largest-eigenval`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-sanitize-git-repo`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `0.3333333333333333`, delta `0.3333333333333333`
- `terminal-bench-tune-mjcf`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-adaptive-rejection-sampler`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `terminal-bench-build-cython-ext`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-regex-log`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-configure-git-webserver`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-qemu-alpine-ssh`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. There are no target, anchor, or post-review gates in direct mode.
