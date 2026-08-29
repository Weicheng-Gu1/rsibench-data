# RSIBench Meta-Agent Workbench

Improve only the mounted task-agent harness. Never edit benchmark tasks,
evaluators, model routing, credentials, budgets, or acceptance controls. Test
trajectories are withheld; use only the staged TRAIN evidence.

Before editing, inventory TRAIN failures. Read every raw trajectory of every
task that has at least one failing repeat. When a task has both passing and
failing repeats, read all of its repeats — passing and failing alike, never a
sample — cite their paths, identify the first concrete action or judgment that
changes the verifier outcome, and generalize the contrasted causes into
failure categories before choosing an intervention. Survey the current
implementation and evolution history before choosing an intervention.

A prior round's rejected candidates are archived, not discarded: each step's
`archive/step_XX/validation/candidate_NN/verdict.json` records why that
candidate was accepted or rejected, alongside the same `<task>/repeat_NN/
trajectory.jsonl` shape used for TRAIN evidence. `meta-history.jsonl` rows
carry a `validation` field pointing at this directory when it exists. Before
proposing an edit, read a prior rejected candidate's validation trajectories
themselves, not only its `decision_reason` or score, so the next change does
not repeat a failure mode the rollout already demonstrated.

The only shared-resource attribution contract is
`/app/meta_workspace/shared-module-contract.json`:

- `SHARED_PROMPT`
- `SHARED_RULES`
- `SHARED_SKILLS`
- `SHARED_HOOKS`
- `SHARED_MCP`
- `SHARED_WORKFLOW`

The sandbox contains documentation only for the current task agent. Read
`/app/meta-workbench/docs/<agent>/overview.md`, then the separate Markdown file
for every plausible module before editing. Follow the exact native paths in the
filtered contract; do not invent another semantic module taxonomy. For Pi,
Full-18 is Source-12 plus Shared-6, with no additional workspace modules.

Prefer the strongest evidence-backed causal change. A candidate may implement
multiple independent objectives when each is separately grounded in TRAIN
trajectories. Preserve behavior that already earns reward, keep executable
triggers task-general, and never branch on task identity or hidden artifacts.
Run the frozen proposal-verification instructions, inspect the staged diff, and
finish only with a real on-disk change inside the declared module ownership.

## Time budget

The session follows one flow: analyze trajectories, edit, verify, submit. The
controller enforces a wall-clock budget and delivers three one-shot reminders:
at 50% write the actual changes to disk, at 70% verify the on-disk changes and
prepare the submission, at 90% submit immediately — an unsubmitted candidate
scores zero. Reminders may arrive automatically; additionally, run
`python3 /app/meta-workbench/scripts/time_budget.py` after finishing each
phase — it prints any newly crossed reminder and nothing otherwise. Never
start a new investigation after the 90% reminder.
