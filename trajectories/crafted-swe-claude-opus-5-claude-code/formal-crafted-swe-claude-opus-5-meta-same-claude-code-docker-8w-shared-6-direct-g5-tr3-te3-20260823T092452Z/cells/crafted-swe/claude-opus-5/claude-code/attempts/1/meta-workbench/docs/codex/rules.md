# SHARED_RULES — Codex

## What this module is

Rule files live under `workspace/.codex/rules/**`, conventionally with a
`.rules` extension. Codex discovers this tree as project execution policy.
A rule should describe a trigger and apply only when that trigger matches
the current task, unlike AGENTS.md which loads unconditionally.

## How it affects runtime behavior

Discovered rules are available to Codex as project policy. The empty
baseline is a placeholder file:

```
# Evolvable project execution-policy rules. Empty means no additional policy.
```

Codex also has an `execpolicy` mechanism the candidate checker exercises
directly (see below): each `.rules` file is checked against a sample
command, so a rules file that is syntactically broken fails validation
before it ever reaches a task.

## How to edit it well

Choose SHARED_RULES when a policy should apply only under a recognizable
file, language, tool, or failure condition — not for unconditional strategy
(that's [prompt.md](prompt.md)) and not for a multi-step reusable procedure
(that's [skills.md](skills.md)).

Write one scoped, testable policy per file, stating the trigger before the
required behavior:

```
# Shell script edits

When editing a file matching *.sh:
- Run `sh -n` on the file before considering the task complete.
- Do not remove existing `set -e` guards without an explicit reason.
```

Keep one concern per file so it's easy to reason about which policy applies
to a given task.

## Constraints

Rules are policy, not lifecycle scripts (use [hooks.md](hooks.md)), not
external tool configuration, not endpoint configuration, and not
task-specific answers.

## How to verify

`candidate_check.py --agent codex` runs `codex execpolicy check --rules
<file> /bin/echo rsibench-smoke` against every `.codex/rules/*.rules` file
when the `codex` binary is present in the sandbox — a malformed rules file
fails this smoke test directly. Beyond that automated check, construct one
matching case and one non-matching case and confirm the trigger language
actually discriminates between them.
