# SHARED_HOOKS — Claude Code

## What this module is

Hooks are declared in `workspace/.claude/settings.json` under a `hooks` key;
the commands they invoke should live as scripts under
`workspace/.claude/hooks/**`. Claude Code fires a declared hook at its
matching lifecycle event regardless of what the model decides to do —
this is the only module in the harness whose behavior does not depend on
model compliance.

## How it affects runtime behavior

Because a hook is guaranteed to run, it is the right tool for anything that
must happen every time a documented event occurs, independent of whether the
model "remembers" to do it. `settings.json` must contain *only* the `hooks`
key — the candidate checker rejects any other top-level key — and every
command referenced anywhere in the hooks tree must resolve to either an
executable on `PATH` or a path that exists inside the workspace.

## How to edit it well

Choose SHARED_HOOKS when a deterministic action must run at a documented
lifecycle event independently of model compliance — not for conditional
policy (that's rules) and not for a procedure the model should choose to
invoke (that's skills).

```json
{
  "hooks": {}
}
```

is the empty baseline. A populated example points a lifecycle event at a
script under the hooks directory:

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "workspace/.claude/hooks/lint.sh" }] }
    ]
  }
}
```

Scripts must be idempotent, noninteractive, bounded in runtime, and explicit
about their own failure (non-zero exit on failure, not a silent no-op).

## Constraints

Hooks may not inspect hidden tests, credentials, evaluator state, budgets,
or acceptance decisions. `settings.json` may contain only the `hooks` key —
nothing else — and every referenced command must actually exist and resolve
in the workspace or on `PATH`.

## How to verify

`candidate_check.py --agent claude-code` parses `settings.json` as JSON,
rejects any key other than `hooks`, and resolves every command string found
inside it (a `/`-containing command must exist as a file; otherwise it must
resolve via `PATH`) — an unresolvable command fails the candidate outright.
It also syntax-checks (`sh -n`) every `.sh` file in the workspace. Beyond
that automated check, manually trigger the event your hook targets (e.g. via
a TRAIN trajectory) and confirm the script actually ran, exited as expected,
and stayed within its time bound.
