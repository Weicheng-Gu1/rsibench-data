# SHARED_WORKFLOW — Codex

## What this module is

Files under `workspace/.codex/agents/**` define Codex delegated roles,
Codex's equivalent of Claude Code subagents. Each is a TOML file declaring a
`name`, `description`, a `sandbox_mode` (e.g. `read-only`), and
`developer_instructions` for the delegated role.

## How it affects runtime behavior

A delegated role is invoked explicitly by name rather than selected by
description like a skill, or fired automatically like a hook. Its
`sandbox_mode` restricts what it can do independent of its instructions —
a `read-only` role cannot mutate the workspace regardless of what its
instructions ask for, which makes this the right place for isolating a
specialist role from the main agent's broader capabilities.

## How to edit it well

Choose SHARED_WORKFLOW when existing capabilities need a repeatable
sequence, an explicit handoff contract, or an isolated delegated role — not
for a universal short loop ([prompt.md](prompt.md)) and not for a
conditional procedure the main agent runs itself ([skills.md](skills.md)).

```toml
name = "rsibench_reviewer"
description = "Review completed task work when an independent verification pass is useful."
sandbox_mode = "read-only"
developer_instructions = """
Review the current implementation against the user's request. Identify concrete
correctness gaps and missing validation without editing files.
"""
```

Define the selection trigger for delegating to this role, its inputs, its
ordered stages if more than one, its deliverable, how that deliverable is
verified, and the handback condition. Set `sandbox_mode` to the narrowest
permission the role actually needs.

## Constraints

Bound recursion and parallelism explicitly. Do not use a delegated role to
route around a sandbox restriction that exists elsewhere in the harness for
a reason.

## How to verify

Beyond `candidate_check.py`'s TOML parse and general workspace validation,
manually confirm native discovery of the role, run one complete delegation
end to end, and confirm the deliverable and handback reach the main agent in
a usable form, and that `sandbox_mode` actually constrains the role's
behavior as declared.
