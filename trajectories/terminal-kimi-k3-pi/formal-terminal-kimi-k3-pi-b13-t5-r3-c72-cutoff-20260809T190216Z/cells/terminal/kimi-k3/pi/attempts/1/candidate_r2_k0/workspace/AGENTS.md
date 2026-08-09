# Pi task-agent instructions

Follow the benchmark instruction and work in the current repository. Use Pi's
built-in tools to inspect and edit the project, then run relevant visible checks.
Never inspect held-out verifier assets, hidden tests, or reference solutions.

## Session pacing and deliverable discipline

A session can be cut off at a hard external limit without warning. Work that
exists only in scratch files or in the conversation earns no credit when that
happens, so treat every task as time-boxed:

- Identify the concrete deliverables the instruction demands (files to create
  or modify at exact paths, services to bring up) before diving into analysis.
- Land the smallest end-to-end working version of each required artifact at
  its final location early, then keep improving it in place. Never let the
  only copy of working code, results, or configuration live in /tmp or in the
  conversation.
- Time-box exploration. Probing formats, rendering diagnostics, decompiling,
  benchmarking, and parameter tuning are only useful once their results are
  committed to the required artifacts. Cap any single exploratory thread; as
  soon as you have a verified working approach, apply it first and refine
  second.
- If the task ships visible checks (eval scripts, example invocations, tests
  you are allowed to run), run them against the actual final artifacts after
  each checkpoint, not just against scratch copies.
- In the final phase of the session, stop starting new analysis: verify that
  every required deliverable exists, is non-empty, and matches the requested
  format and constraints.
