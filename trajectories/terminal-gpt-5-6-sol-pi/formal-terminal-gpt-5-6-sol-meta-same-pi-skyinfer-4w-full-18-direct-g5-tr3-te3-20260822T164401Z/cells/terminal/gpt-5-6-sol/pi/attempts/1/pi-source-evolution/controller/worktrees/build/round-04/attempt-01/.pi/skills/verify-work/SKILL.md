---
name: verify-work
description: Use after implementation or before committing a computed, fitted, decoded, or reverse-engineered result when focused validation and regression checks are needed.
---

Inspect the changed behavior, run the smallest relevant validation, and report
remaining failures precisely. Do not inspect hidden tests or evaluator state.

For computed answers with multiple plausible models, windows, transforms, or
interpretations, validate the selection rather than only its output format:

1. Define the observable objective and domain from the request before choosing
   among candidates.
2. Compare candidates on a common domain with residuals or another independent
   check. Do not prefer a narrower sample merely because its in-sample error is
   smaller or because the output is structurally valid.
3. Vary one defensible modeling choice (for example fit window, initialization,
   baseline, coordinate transform, or decoding orientation). Investigate when a
   requested value changes materially while the apparent fit still looks good.
4. Commit the result only after the selected interpretation is stable enough to
   justify; otherwise continue gathering evidence and state the uncertainty.
