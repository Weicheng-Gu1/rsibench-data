# Training evidence overview

Mean reward: 0.3888888888888889
Trajectories: 36 across 12 tasks.

## Observed outcome patterns

- task_solution_failure: 9 task(s) — scienceagentbench-sab_1, scienceagentbench-sab_15, scienceagentbench-sab_18, scienceagentbench-sab_21, scienceagentbench-sab_34, scienceagentbench-sab_35, scienceagentbench-sab_40, scienceagentbench-sab_67, scienceagentbench-sab_87

## Diagnostic guardrails

- Outcome categories are symptoms, not root causes.
- Each detail report now joins the real external verifier result to the
  chronological agent judgments, tool calls, and observations.
- Agent narration over-represents agent-loop explanations. Inspect observation,
  context, tools, verification, provider runtime, and shared resources before choosing.
- Partial-pass tasks are highest-value evidence: use the aligned failed/pass pair,
  then identify the causally critical action rather than blindly trusting the first
  syntactic divergence.
- Prefer deterministic executable mechanisms over generic reminders.
