---
name: verify-work
description: Use before completing any task to validate the exact final files, outputs, services, and user-facing behavior after all mutations.
---

Validate the deliverable, not merely the implementation process:

1. Translate each explicit requirement into an observable final-state check.
   Prefer the same command, import, request, file read, or protocol the user
   will use. Do not substitute a weaker proxy such as syntax success, process
   existence, or an intermediate result.
2. Run checks only after the last edit, install, cleanup, reset, restart, or
   background-process change. If anything mutates afterward, rerun every check
   whose result could have changed. Never remove required sample data, deployed
   content, or a running service after proving it works.
3. For replacement-only or narrowly scoped edits, derive the expected output
   from the original input, compare exact bytes where practical, and inspect the
   final diff so surrounding syntax, quoting, formatting, and unrelated files
   remain unchanged.
4. For inferred, numerical, visual, or decoded answers, use an independent
   cross-check. Confirm units, coordinate orientation, data columns/windows, and
   parameter plausibility; investigate disagreement instead of choosing the
   first plausible-looking result.
5. For long-running builds or environment setup, establish one end-to-end
   acceptance path early, timebox broad exploration, and spend remaining time
   fixing the first failing requirement. A timed-out or unfinished run is not a
   successful validation even if some checks pass.

Read and obey normal project instructions. Do not inspect hidden tests or
evaluator state. Report the exact commands run, final observed results, and any
remaining uncertainty; do not claim completion while a relevant check is
failing or has not been rerun against the final state.
