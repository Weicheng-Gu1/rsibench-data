# Contributing Experiment Records

1. Run exactly one RSIBench `benchmark x model x harness` cell.
2. Treat `(bench, model, harness, run-id)` as the submission identity and pass
   all three `--expect-*` assertions to the publisher.
3. Confirm the run completed all configured optimization steps and final tests.
4. Use the RSIBench trajectory publisher; do not copy files manually.
5. Rebuild the leaderboard with `python scripts/build_leaderboard.py`.
6. Commit the new run directory and generated leaderboard files together.

Do not submit API keys, endpoint credentials, private task assets, invalid runs,
or results with unresolved infrastructure contamination. Never rewrite an
existing run directory. Corrections must be a new run with a new run ID.

For terminal runs, preserve every ablation directory emitted by RSIBench. Do
not split variants into independent submissions. The parent trajectory
manifest indexes shared resources and, for Pi source mode, core source. A
completed layer includes its results and raw `trials/`; unchanged modules are
recorded in `skipped_unchanged_modules` and must not have fabricated rollout
trajectories. New submissions use `keep_one_changed_module`: every reported
component score is `A0` plus that component alone, with all other editable
components restored to `A0`. Submit its absolute score only; do not add
baseline or full-score difference fields.
