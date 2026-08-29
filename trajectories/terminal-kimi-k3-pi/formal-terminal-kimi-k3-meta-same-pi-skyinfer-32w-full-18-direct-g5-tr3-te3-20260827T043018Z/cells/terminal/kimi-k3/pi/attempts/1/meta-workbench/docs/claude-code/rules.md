# SHARED_RULES — Claude Code

## What this module is

Rule files live under `workspace/.claude/rules/**`. Claude Code discovers
every file in that tree as project policy. Unlike CLAUDE.md, a rule is meant
to be conditional: it should describe a trigger and only apply when that
trigger is present in the current task.

## How it affects runtime behavior

All discovered rules are available to Claude Code as project policy context.
There is no per-rule activation mechanism enforced by the runtime itself —
the model is expected to apply a rule when its stated trigger matches. This
means a badly written rule (vague trigger, or a trigger that matches
everything) behaves like an unconditional CLAUDE.md edit but without the
single-file visibility CLAUDE.md gives you, so keep triggers narrow and
explicit.

## How to edit it well

Choose SHARED_RULES when a policy should apply only under a recognizable
file, language, tool, or failure condition — not for unconditional project
strategy (that's [prompt.md](prompt.md)) and not for a multi-step reusable
procedure (that's [skills.md](skills.md)).

Write one scoped, testable policy per rule file, and state the trigger
before the required behavior, e.g.:

```markdown
# Python test files

When editing a file matching `test_*.py` or `*_test.py`:
- Run the file's own test module before considering the task complete.
- Do not modify fixtures shared with other test files without checking their usage.
```

A rule file is plain Markdown; there is no required frontmatter schema
(contrast with skills, which require YAML frontmatter). Keep each file
focused on one concern so it's easy to reason about which rules apply to a
given task.

## Constraints

Rules are policy, not provider settings, not lifecycle executors (use
[hooks.md](hooks.md)), and not a channel for hidden-test access, evaluator
state, model routing, credentials, or benchmark-specific answers.

## How to verify

`candidate_check.py` syntax-checks any `.sh` files elsewhere in the
workspace and validates the JSON/TOML surfaces, but rule files themselves
have no schema check — verify by inspection. Construct one matching case
(a task that should trigger the rule) and one non-matching case, and confirm
mentally or via a TRAIN trajectory that the rule's trigger language is
specific enough to distinguish them. A rule with a trigger that always
matches is functionally an unconditional CLAUDE.md edit and should probably
be moved there for clarity.
