---
name: verify-work
description: Use after implementation when focused validation and regression checks are needed.
---

Inspect the changed behavior, run the smallest relevant validation, and report
remaining failures precisely. Do not inspect hidden tests or evaluator state.

Verify against the general specification, not just the concrete instance in the
sandbox:

- Confirm any deliverable script or module is self-contained and re-runnable in
  a fresh environment. It must not import or read privileged ground-truth
  (answer files, reference solutions, true parameters) to check itself, because
  the grader re-runs it against different or hidden inputs where that state is
  absent.
- Confirm you did not hardcode a value inferred from inspecting the environment
  (shape, count, seed, sizes, example values) when the spec treats it as unknown
  or variable; such values must be discovered at runtime from the allowed
  interface.
- Exercise behavior beyond the single happy-path input you already have,
  including the edge cases the specification implies, before declaring success.
