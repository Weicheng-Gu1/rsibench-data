# Training evidence overview

Mean reward: 0.6222222222222222
Trajectories: 45 across 15 tasks.

## Observed outcome patterns

- agent_timeout: 7 task(s) — terminal-bench-adaptive-rejection-sampler, terminal-bench-gcode-to-text, terminal-bench-largest-eigenval, terminal-bench-make-mips-interpreter, terminal-bench-model-extraction-relu-logits, terminal-bench-raman-fitting, terminal-bench-tune-mjcf
- task_solution_failure: 3 task(s) — terminal-bench-configure-git-webserver, terminal-bench-raman-fitting, terminal-bench-sanitize-git-repo

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
