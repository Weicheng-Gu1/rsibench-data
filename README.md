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

## Rebuild The Leaderboard

```bash
python scripts/build_leaderboard.py
git diff --check
```

`leaderboard/results.csv` and `leaderboard/results.jsonl` are derived indexes.
The immutable run manifest and raw artifacts remain the source of truth.

