---
name: pi-resource-engineering
description: Use when editing Pi's six native shared-resource modules from TRAIN evidence.
---

# Pi Shared-Resource Engineering

Read `/app/meta-workbench/docs/pi/overview.md`, then every plausible linked
module document. Read `/app/meta_workspace/shared-module-contract.json` for the
machine-enforced paths. Shared-6 consists of `SHARED_PROMPT`, `SHARED_RULES`,
`SHARED_SKILLS`, `SHARED_HOOKS`, `SHARED_MCP`, and `SHARED_WORKFLOW`. A Full-18 target exposes Shared-6 plus Source-12; a
Source-12 target exposes only the twelve source owners.

Before editing, compare complete passing and failing trajectories for the same
mixed TRAIN task when available. State the concrete behavioral divergence and
why the chosen shared resource changes it. Prefer executable hooks or bounded
adapters only when their trigger is visible in the evidence; otherwise use the
narrowest prompt, rule, skill, or workflow intervention that explains the
failure. Never encode task IDs, answers, evaluator state, routing, or budgets.

Validate the shared contract and official Pi resource loader, inspect the
staged diff, and submit only a real change within one or more declared modules.
