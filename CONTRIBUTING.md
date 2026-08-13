# Contributing Experiment Records

1. Run exactly one RSIBench `benchmark x model x harness` cell.
2. Treat `(bench, model, harness, run-id)` as the submission identity and pass
   all three `--expect-*` assertions to the publisher.
3. Confirm the run completed all configured optimization steps and final tests.
   Preserve every Meta-agent round in `candidate_history`: candidates with a
   benchmark score keep that score whether accepted or rejected; source/build/
   protocol failures are explicitly marked `error`; rounds without a candidate
   score are explicitly marked `not_scored`.
4. Use the RSIBench trajectory publisher; do not copy files manually.
5. Commit only the new immutable run directory. The merge workflow rebuilds
   leaderboard indexes after attaching the authenticated GitHub identity.
6. Push a branch and open a GitHub pull request. Do not push a result directly
   to `main`: the pull request author is the authenticated submitter of record.

Do not add or modify `submissions/github/**` or
`leaderboard/submissions.json`. Those trusted identity records are written only
by the default-branch workflow after a PR merges. A display name, email, or
GitHub login embedded in a trajectory does not establish submission identity.

Do not submit API keys, endpoint credentials, private task assets, invalid runs,
or results with unresolved infrastructure contamination. Never rewrite an
existing run directory. Corrections must be a new run with a new run ID.
Multiple runs for the same benchmark/model/harness are all retained and ordered
by their authenticated merge events.

For terminal runs, preserve every ablation directory emitted by RSIBench. Do
not split variants into independent submissions. The parent trajectory
manifest indexes shared resources and, for Pi source mode, core source. A
completed layer includes its results and raw `trials/`; unchanged modules are
recorded in `skipped_unchanged_modules` and must not have fabricated rollout
trajectories. New submissions use `keep_one_changed_module`: every reported
component score is `A0` plus that component alone, with all other editable
components restored to `A0`. Submit its absolute score only; do not add
baseline or full-score difference fields.
