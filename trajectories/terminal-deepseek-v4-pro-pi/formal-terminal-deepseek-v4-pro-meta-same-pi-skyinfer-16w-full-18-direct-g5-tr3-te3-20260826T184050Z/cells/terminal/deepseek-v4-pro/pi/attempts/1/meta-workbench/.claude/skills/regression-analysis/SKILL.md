---
name: regression-analysis
description: Use when a prior proposal was rejected or candidate training loses reward on tasks the current harness passed.
---

# Analyze Regressions

Compare current and candidate outcomes only on identical training task IDs.
Identify every current-pass/candidate-fail pair and trace it to the changed
behavior. Treat different tasks or repeats as incomparable.

Read the prior immutable ledger decision and preserve the rejected lesson.
Prefer narrowing or reverting the causal part over stacking more instructions.
Reject a candidate whose apparent average gain hides a repeated regression in
an already-working workflow unless the evidence gives a concrete safe fix.
