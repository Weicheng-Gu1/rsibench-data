# RSIBench Data

Open experiment records for RSIBench. This repository stores complete agent
trajectories, execution logs, harness checkpoints, verifier outputs, scores,
token usage, dollar cost, and provenance for paper results.

The layout follows the reproducibility principles of the
[SWE-bench experiments repository](https://github.com/swe-bench/experiments):
each reported result has its own immutable directory with metadata and the raw
artifacts needed for independent review.

## Layout

```text
trajectories/
  <subset>-<model>-<harness>/
    <run-id>/
      trajectory-manifest.json
      result.json or suite.json
      config.resolved.json
      splits.resolved.json
      provenance.json
      training-schedule.json
      shared-module-ablation/          # terminal, changed SHARED_* only
        harnesses/manifest.json
        results.json
        results.csv
        trials/
      pi-source-module-ablation/       # terminal Pi source, changed PI_SRC_* only
        results.json
        trials/
      ... complete run artifacts ...
leaderboard/
  results.csv
  results.jsonl
schemas/
  trajectory-manifest.schema.json
scripts/
  build_leaderboard.py
```

The source repository publishes one complete run with:

```bash
python scripts/collab-experiments/publish_trajectory.py \
  --run-id "$RUN_ID" \
  --trajectory-repo /path/to/rsibench-data \
  --push
```

Only completed, paper-valid runs without unresolved infrastructure errors are
accepted by default. Credentials, transient PID files, and local absolute paths
are rejected before commit.

Module ablations belong to the same immutable run, not separate leaderboard
runs. They are produced only for `terminal` using changed-module keep-one
semantics: each evaluated variant is `A0` plus exactly one module's accepted
`A*` bytes. Claude Code and Codex may contain changed `SHARED_*` variants; Pi
source runs may additionally contain changed `PI_SRC_*` variants. Unchanged
modules are recorded in `skipped_unchanged_modules` and consume no rollout.
`trajectory-manifest.json.ablations` indexes every applicable layer and exposes
compact `component_scores`; each layer's `results.json` and `trials/` retain the
complete scores, token/cost accounting, and raw task-agent trajectories.

## Rebuild The Leaderboard

```bash
python scripts/build_leaderboard.py
git diff --check
```

`leaderboard/results.csv` and `leaderboard/results.jsonl` are derived indexes.
The immutable run manifest and raw artifacts remain the source of truth.
