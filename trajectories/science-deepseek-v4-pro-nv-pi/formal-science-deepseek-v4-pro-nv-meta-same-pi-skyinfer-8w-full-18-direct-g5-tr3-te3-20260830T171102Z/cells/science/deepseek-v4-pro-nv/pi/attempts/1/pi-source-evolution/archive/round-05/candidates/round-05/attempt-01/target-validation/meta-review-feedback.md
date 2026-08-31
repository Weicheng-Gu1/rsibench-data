# Direct full-training gate result

- Result: `direct_full_training_no_improvement`
- Candidate source commit: `7b4facfaa9fcc05315795d27a355391029fad749`
- Repeats per claimed task: `3`
- Evidence: `/volume/ywan/yss/rsibench-master/runs/formal-science-deepseek-v4-pro-nv-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260830T171102Z/cells/science/deepseek-v4-pro-nv/pi/attempts/1/pi-source-evolution/archive/round-05/candidates/round-05/attempt-01/target-validation/result.json`

- `scienceagentbench-sab_87`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `scienceagentbench-sab_1`: baseline `1.0`, candidate `0.6666666666666666`, delta `-0.33333333333333337`
- `scienceagentbench-sab_16`: baseline `0.6666666666666666`, candidate `1.0`, delta `0.33333333333333337`
- `scienceagentbench-sab_15`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `scienceagentbench-sab_34`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `scienceagentbench-sab_21`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `scienceagentbench-sab_40`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `scienceagentbench-sab_18`: baseline `0.0`, candidate `0.3333333333333333`, delta `0.3333333333333333`
- `scienceagentbench-sab_67`: baseline `0.3333333333333333`, candidate `0.0`, delta `-0.3333333333333333`
- `scienceagentbench-sab_29`: baseline `0.0`, candidate `0.3333333333333333`, delta `0.3333333333333333`
- `scienceagentbench-sab_101`: baseline `1.0`, candidate `1.0`, delta `0.0`
- `scienceagentbench-sab_35`: baseline `0.3333333333333333`, candidate `0.0`, delta `-0.3333333333333333`

The controller first runs one paired rollout per frozen training task. If pass@1 does not strictly improve in aggregate, or three previously passing tasks fall to zero, it records screen_rejected and skips the remaining repeats. Otherwise it resumes the same candidate evaluation for the remaining repeats and applies the complete pass@3 gate, which requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
