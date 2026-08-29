# Direct full-training gate result

- Result: `direct_full_training_severe_task_regression`
- Candidate source commit: `a31a2bddc9939f596a43c6e6b3394b5d9a475465`
- Repeats per claimed task: `3`
- Evidence: `/volume/ywan/yss/rsibench/runs/formal-terminal-glm-5-3-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260827T190327Z/cells/terminal/glm-5-3/pi/attempts/1/pi-source-evolution/archive/round-03/candidates/round-03/attempt-01/target-validation/result.json`

- `terminal-bench-make-mips-interpreter`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-model-extraction-relu-logits`: baseline `0.6666666666666666`, candidate `0.3333333333333333`, delta `-0.3333333333333333`
- `terminal-bench-configure-git-webserver`: baseline `0.3333333333333333`, candidate `0.6666666666666666`, delta `0.3333333333333333`
- `terminal-bench-regex-log`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-raman-fitting`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-write-compressor`: baseline `1.0`, candidate `0.3333333333333333`, delta `-0.6666666666666667`
- `terminal-bench-build-cython-ext`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-tune-mjcf`: baseline `0.6666666666666666`, candidate `0.6666666666666666`, delta `0.0`
- `terminal-bench-headless-terminal`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `terminal-bench-largest-eigenval`: baseline `0.3333333333333333`, candidate `0.6666666666666666`, delta `0.3333333333333333`
- `terminal-bench-cobol-modernization`: baseline `1.0`, candidate `0.3333333333333333`, delta `-0.6666666666666667`
- `terminal-bench-adaptive-rejection-sampler`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-sanitize-git-repo`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`
- `terminal-bench-gcode-to-text`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `terminal-bench-qemu-alpine-ssh`: baseline `1.0`, candidate `1.0`, delta `0.0`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. Acceptance additionally requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
