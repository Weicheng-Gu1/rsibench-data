# SHARED_HOOKS — Codex

## What this module is

Hooks are declared in `workspace/.codex/hooks.json`; the commands they
invoke should live as scripts under `workspace/.codex/hooks/**`. Codex fires
a declared hook at its matching lifecycle event independent of what the
model decides to do.

## How it affects runtime behavior

Because a hook is guaranteed to run, it's the right tool for anything that
must happen every time a documented event occurs, regardless of whether the
model "remembers" to do it. Every command referenced anywhere in
`hooks.json` must resolve to either an executable on `PATH` or a path that
exists inside the workspace — an unresolvable command fails validation
before the candidate is ever run.

## How to edit it well

Choose SHARED_HOOKS when a deterministic action must run at a documented
lifecycle event independently of model compliance — not for conditional
policy (rules) and not for a procedure the model chooses to invoke (skills).

The empty baseline:

```json
{
  "description": "Evolvable RSIBench Codex lifecycle hooks.",
  "hooks": {}
}
```

Populate it with a lifecycle event mapped to a script under the hooks
directory, keeping the script idempotent, noninteractive, bounded in
runtime, and explicit about its own failure (non-zero exit on failure).

## Constraints

Hooks may never read hidden tests, credentials, evaluator state, routing,
budgets, or acceptance state. Every referenced command must actually exist
and resolve — do not point a hook at a script you forgot to include in the
diff.

## How to verify

`candidate_check.py --agent codex` resolves every command referenced inside
`hooks.json` the same way it validates `.claude/settings.json` hooks for
Claude Code, and syntax-checks (`sh -n`) every `.sh` file in the workspace.
Beyond that automated check, manually trigger the event your hook targets
(e.g. via a TRAIN trajectory) and confirm the script ran, exited as
expected, and stayed within its time bound.
