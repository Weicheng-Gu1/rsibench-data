# Direct full-training gate result

- Result: `targeted_training_infrastructure_contaminated`
- Candidate source commit: `13a5cf3ad0ce50415175b92a32421e592ae3b06e`
- Repeats per claimed task: `3`
- Evidence: `/volume/ywan/yss/rsibench/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260826T184050Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-03/candidates/round-03/attempt-03/target-validation/result.json`

- `terminal-bench-make-mips-interpreter`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-model-extraction-relu-logits`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-configure-git-webserver`: baseline `0.6666666666666666`, candidate `None`, delta `None`
- `terminal-bench-regex-log`: baseline `1.0`, candidate `None`, delta `None`
- `terminal-bench-raman-fitting`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-write-compressor`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-build-cython-ext`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-tune-mjcf`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-headless-terminal`: baseline `0.3333333333333333`, candidate `None`, delta `None`
- `terminal-bench-largest-eigenval`: baseline `0.3333333333333333`, candidate `None`, delta `None`
- `terminal-bench-cobol-modernization`: baseline `0.6666666666666666`, candidate `None`, delta `None`
- `terminal-bench-adaptive-rejection-sampler`: baseline `0.6666666666666666`, candidate `None`, delta `None`
- `terminal-bench-sanitize-git-repo`: baseline `0.6666666666666666`, candidate `None`, delta `None`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `None`, delta `None`
- `terminal-bench-qemu-alpine-ssh`: baseline `0.3333333333333333`, candidate `None`, delta `None`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. Acceptance additionally requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
