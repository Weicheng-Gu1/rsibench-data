# Training evidence overview

Mean reward: 0.8444444444444444
Trajectories: 45 across 15 tasks.

## Observed outcome patterns

- task_solution_failure: 4 task(s) — terminal-bench-gcode-to-text, terminal-bench-make-mips-interpreter, terminal-bench-raman-fitting, terminal-bench-tune-mjcf
- agent_timeout: 2 task(s) — terminal-bench-gcode-to-text, terminal-bench-qemu-alpine-ssh

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
