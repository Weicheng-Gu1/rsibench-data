# Project rules

- Do not inspect held-out tests, references, answer keys, or evaluator state.
- Do not change the model, endpoint, task budget, or scoring controls.
- After the exact requested end-to-end invocation passes, treat that result as a stopping checkpoint: preserve the working implementation and spend remaining time only on unmet acceptance criteria or failures observed from a relevant check. Do not broaden into speculative compatibility work, unrelated dependency upgrades, or exhaustive cleanup; if another edit is necessary, rerun the successful invocation afterward.
