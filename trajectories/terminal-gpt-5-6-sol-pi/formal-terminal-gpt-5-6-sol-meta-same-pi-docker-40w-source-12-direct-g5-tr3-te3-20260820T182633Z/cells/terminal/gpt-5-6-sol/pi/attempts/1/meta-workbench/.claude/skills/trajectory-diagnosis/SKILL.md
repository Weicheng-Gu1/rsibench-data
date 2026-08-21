---
name: trajectory-diagnosis
description: Use when training trajectories contain failures, zero rewards, inconsistent actions, or possible infrastructure contamination.
---

# Diagnose Training Trajectories

Run `inspect_trajectories.py` on the supplied current-harness problem files.
Inventory every task and repeat, then classify each result as clean pass, clean
task failure, or infrastructure error from the summaries and scores. Raw
trajectories remain available as files. Read the sessions needed to identify a
concrete repeated cause, cite its action/result evidence, and check the selected
trigger against relevant failures and clean passes.
Exclude infrastructure errors from behavioral conclusions.
Provider/transport and sandbox startup timeouts are infrastructure. A valid agent
session that keeps reasoning or using tools but does not complete the task is a
clean behavioral failure and may support a harness change.

For clean failures, cite concrete action/result pairs and group repeated causes:
missing inspection, weak planning, unused tools, premature finish, unverified edit,
or context loss. Select one cause supported by multiple tasks when possible.
Record behaviors found in passing tasks that the proposal must preserve.

Before selecting a proposal, rank evidence-backed candidates by expected
task-general utility: repeated failure coverage, task/domain independence, trigger
precision, observable next-trajectory events, and exposure on clean passes.
Task-specific constants, paths, answers, and commands in executable behavior are
not transferable evidence. Base the estimate only on the supplied training
evidence. Training task IDs may appear as audit evidence, but
executable behavior must not branch on task identity or depend on original-task
paths, answers, commands, or constants. Name the unseen failure class and
explain why the observable trigger still fires when no training task reappears.
Use task-general events and session-local state that are present in the recorded
task-agent trajectories, provider context, tool results, or task workspace. When
multiple clean failures finish normally after self-authored checks report success, test the
hypothesis that the checks share the same assumptions as construction and need
an independent or adversarial final-artifact oracle.

For an M3-M10 runtime trigger, perform a train-only trace replay before
editing: apply the exact proposed predicate to every cited failure and a
representative set of clean passes. Report a small hit/exposure table. Do not
claim a failure as covered when its recorded events would suppress or never
reach the trigger. Treat `read`, `bash` exit zero, and a self-authored checker as
ambiguous signals unless they demonstrate the final artifact against an oracle
independent of the construction assumptions.

Before choosing an edit, produce an M1-M10 hypothesis table. Each row must state:
supporting clean task IDs and action-result evidence, the proposed runtime trigger
and mechanism, the observable event expected in the next trajectory, regression
risk, and `select` or `reject`. Empty source modules are not evidence that they
should be selected, and easy Markdown edits are not evidence that M1 should be
selected.

Select the module from the causal location, not from ease of editing:

- M1 Prompt & Task Intake when a task-general rule or stable task frame is absent;
- M2 Skills when a reusable procedure is absent;
- M3 Observation Processing when a tool result hides or loses decisive evidence;
- M4 Context Selection when evidence exists but misses the decisive provider call;
- M5 Compaction when compression loses the active task contract or next step;
- M6 Working Memory when bounded task-local state does not survive a required boundary;
- M7 Hooks when a lifecycle trigger, phase transition, interception, or recovery fails;
- M8 Completion Verification when completion lacks objective structured evidence;
- M9 Local Tools when repeated project-local work is manually fragile;
- M10 MCP Adapters when a justified external capability requires a real MCP transport.

Generic instructions such as "plan carefully", "use tools", or "verify before
finishing" are not a causal diagnosis when equivalent guidance already exists.
In that case identify why it was not followed and change the relevant runtime
mechanism. A valid Meta round may not abstain: when evidence is incomplete,
submit the smallest low-exposure mechanism supported by the strongest clean
failure pattern and state the uncertainty. A task-specific trick supported by one failure is weaker
evidence than a mechanism that explains repeated failures without harming clean
passes.

Do not infer success from assistant prose. Reward, verifier outcome, tool results,
and preserved official session events are authoritative.
