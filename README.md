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
      # candidate_history in the manifest preserves all five Meta-agent rounds
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
  submissions.json                  # GitHub-authenticated public score feed
submissions/github/
  pr-<number>.json                  # trusted receipt written after merge
schemas/
  trajectory-manifest.schema.json
scripts/
  build_leaderboard.py
```

The source repository's `rsibench-run` skill is the canonical submission
interface. It validates one complete run, initializes a partial-clone data cache
when needed, pushes through the authenticated submitter's fork when necessary,
and opens a pull request directly against `Weicheng-Gu1/rsibench-data:main`.
The lower-level publisher remains available for maintainers:

```bash
python scripts/collab-experiments/publish_trajectory.py \
  --run-id "$RUN_ID" \
  --expect-bench "$BENCH" \
  --expect-model "$MODEL" \
  --expect-harness "$HARNESS" \
  --trajectory-repo /path/to/rsibench-data \
  --defer-leaderboard
```

Push that branch to your GitHub fork (or an authorized branch) and open a pull
request against `Weicheng-Gu1/rsibench-data:main`. Direct pushes do not create a
public submitter identity and are not eligible for the trusted site feed.

The pull request author is the submitter of record. After merge, a protected
GitHub Action reads the authenticated PR author, numeric GitHub user ID, PR
number, merge commit, and merged artifact paths from the GitHub event. It writes
`submissions/github/pr-<number>.json` and rebuilds
`leaderboard/submissions.json`. Submission content cannot supply or override
these identity fields.

`run-id` is only the unique run instance. Experiment identity is the explicit
tuple `(bench, model, harness, run-id)`: the publisher verifies the first three
expectations against `result.json`, writes all four into
`trajectory-manifest.json`, archives under
`trajectories/<bench>-<model>-<harness>/<run-id>/`, and repeats them in the
leaderboard indexes.

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
Component scores are absolute `Only(Mi)` scores; new records do not calculate
`Only(Mi)-A0` or `A*-Only(Mi)`.

Current formal submissions use avg@3 throughout. Held-out evaluation order is
`A0`, `A_last`, then every earlier accepted generation without duplicating
`A_last`; completed changed-module keep-one layers also use avg@3. Pull-request
validation rejects a different state policy, order, or ablation repeat count.

## Rebuild The Leaderboard

```bash
python scripts/build_leaderboard.py
git diff --check
```

`leaderboard/results.csv` and `leaderboard/results.jsonl` are derived indexes.
The immutable run manifest and raw artifacts remain the source of truth.
`leaderboard/submissions.json` contains only runs with a merge-generated GitHub
identity receipt and is the trusted feed consumed by the RSIBench Submit page.
Every merged run remains in that feed. Repeated submissions for the same
`(bench, model, harness)` cell receive deterministic `submission_sequence` and
`resubmission_increment` values; later submissions never overwrite earlier
candidate histories or scores.
