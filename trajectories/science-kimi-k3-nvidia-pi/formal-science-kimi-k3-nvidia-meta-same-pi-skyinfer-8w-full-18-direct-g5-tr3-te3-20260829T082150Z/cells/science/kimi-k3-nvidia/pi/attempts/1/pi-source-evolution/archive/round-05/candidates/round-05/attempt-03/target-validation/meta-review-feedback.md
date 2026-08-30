# Direct full-training gate result

- Result: `targeted_training_infrastructure_contaminated`
- Candidate source commit: `12b122c0bf78af0bbcf4c357c0bcd02513007925`
- Repeats per claimed task: `3`
- Evidence: `/volume/ywan/yss/rsibench-master/runs/formal-science-kimi-k3-nvidia-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260829T082150Z/cells/science/kimi-k3-nvidia/pi/attempts/1/pi-source-evolution/archive/round-05/candidates/round-05/attempt-03/target-validation/result.json`

- `scienceagentbench-sab_87`: baseline `0.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_1`: baseline `0.6666666666666666`, candidate `None`, delta `None`
- `scienceagentbench-sab_16`: baseline `1.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_15`: baseline `0.3333333333333333`, candidate `None`, delta `None`
- `scienceagentbench-sab_34`: baseline `0.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_21`: baseline `0.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_40`: baseline `0.6666666666666666`, candidate `None`, delta `None`
- `scienceagentbench-sab_18`: baseline `0.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_67`: baseline `0.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_29`: baseline `1.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_101`: baseline `1.0`, candidate `None`, delta `None`
- `scienceagentbench-sab_35`: baseline `0.0`, candidate `None`, delta `None`

The controller first runs one paired rollout per frozen training task. If pass@1 does not strictly improve in aggregate, or three previously passing tasks fall to zero, it records screen_rejected and skips the remaining repeats. Otherwise it resumes the same candidate evaluation for the remaining repeats and applies the complete pass@3 gate, which requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
