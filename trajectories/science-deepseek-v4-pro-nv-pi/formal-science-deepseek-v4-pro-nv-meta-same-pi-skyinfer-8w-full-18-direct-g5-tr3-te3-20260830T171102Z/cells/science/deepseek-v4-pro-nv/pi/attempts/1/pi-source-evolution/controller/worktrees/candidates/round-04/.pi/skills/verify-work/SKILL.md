---
name: verify-work
description: Use after implementation to verify produced output artifacts against the task's exact output requirements before finishing.
---

Before reporting completion, verify the actual artifacts you produced against
the task's written requirements:

1. Re-read the task's output requirements (file name, directory, format,
   columns, row order, units) and check each one against the file you actually
   wrote, not against your memory of it.
2. Confirm the output file exists, is non-empty, and inspect its header, row
   count, and a few values.
3. When a library offers equivalent-looking alternatives (legacy vs new API,
   or parameters with defaults), prefer the canonical form used by the
   library's own documentation, and confirm equivalence on the full input, not
   a few samples.
4. Check that correctness-affecting parameters (sampling rates, units,
   thresholds, axis/column selection) match the actual data instead of relying
   on library defaults.
5. When several input files could match the task, state which one the task is
   about and why before relying on it.
6. Independently recompute the result with a different code path and compare;
   report any remaining differences precisely.

Do not inspect hidden tests or evaluator state.
