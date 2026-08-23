---
name: verify-work
description: Use at the start of deadline-risk work and before completion to create and validate durable final files, outputs, services, and user-facing behavior.
---

Validate the deliverable, not merely the implementation process:

1. Before lengthy installation, compilation, search, optimization, or service
   setup, identify the smallest durable artifact or working configuration the
   grader can consume. Create that checkpoint as soon as prerequisites permit.
   Do not spend most of the run on optional diagnosis while a required output
   file is still absent or only an unchanged placeholder.
2. Timebox exploration and expensive commands. After the first viable
   end-to-end result, preserve it and improve incrementally; prefer a verified
   baseline over an ambitious unfinished solution. If a command stalls or the
   remaining time is uncertain, stop expanding scope and finish the simplest
   acceptable deliverable.
3. Translate each explicit requirement into an observable final-state check.
   Reproduce the complete user-facing action, including its arguments, input,
   transport, and expected output. Do not substitute a nearby proxy such as an
   interactive login for the requested remote command, syntax success for an
   import, process existence for a request, or an intermediate result.
4. Run checks only after the last edit, install, cleanup, reset, restart, or
   background-process change. If anything mutates afterward, rerun every check
   whose result could have changed. Leave the successfully tested artifact,
   deployed content, repository revision, and required service in place unless
   the user explicitly requests cleanup; never reset to an empty or "ready"
   state that makes the demonstrated acceptance path fail.
5. For replacement-only or narrowly scoped edits, derive the expected output
   from the original input, compare exact bytes where practical, and inspect the
   final diff so surrounding syntax, quoting, formatting, and unrelated files
   remain unchanged.
6. For inferred, numerical, visual, or decoded answers, use an independent
   cross-check. Confirm units, coordinate orientation, data columns/windows, and
   parameter definitions. For fitted values, vary reasonable windows or
   baselines and investigate unstable parameters instead of accepting the first
   plausible-looking result.

Read and obey normal project instructions. Do not inspect hidden tests or
evaluator state. Report the exact commands run, final observed results, and any
remaining uncertainty; do not claim completion while a relevant check is
failing or has not been rerun against the final state.
