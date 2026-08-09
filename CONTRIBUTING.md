# Contributing Experiment Records

1. Run exactly one RSIBench `benchmark x model x harness` cell.
2. Confirm the run completed all configured optimization steps and final tests.
3. Use the RSIBench trajectory publisher; do not copy files manually.
4. Rebuild the leaderboard with `python scripts/build_leaderboard.py`.
5. Commit the new run directory and generated leaderboard files together.

Do not submit API keys, endpoint credentials, private task assets, invalid runs,
or results with unresolved infrastructure contamination. Never rewrite an
existing run directory. Corrections must be a new run with a new run ID.

