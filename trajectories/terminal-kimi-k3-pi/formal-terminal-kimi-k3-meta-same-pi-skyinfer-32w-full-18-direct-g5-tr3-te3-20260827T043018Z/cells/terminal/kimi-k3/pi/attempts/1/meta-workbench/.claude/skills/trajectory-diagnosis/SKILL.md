---
name: trajectory-diagnosis
description: Use when diagnosing TRAIN trajectory failures before editing an agent harness.
---

# Trajectory Diagnosis

Inventory every TRAIN task and prioritize mixed tasks. For at least one mixed
task, read one complete passing rollout and one complete failing rollout. Cite
both paths and identify the first action or judgment that changes the external
verifier outcome. Separate model behavior from provider, sandbox, setup, and
verifier infrastructure failures.

Survey the current implementation and evolution history before choosing a
change. Map each independently supported causal objective to the authoritative
module contract: Shared-6 for all harnesses and, for Pi source evolution only,
the separate Source-12 catalog. Do not invent semantic module labels. Preserve
already-passing behavior and state a falsifiable expected change in the next
TRAIN rollout.
