# SHARED_RULES — Pi

## What this module is

`AGENTS.md` at the workspace root is Pi's native rules file — note this is
the project-root `AGENTS.md`, the same filename Codex uses but a distinct
file in a distinct harness. Pi discovers it as project policy, meant to
apply conditionally rather than unconditionally.

## How it affects runtime behavior

Discovered rule content is available to Pi as project policy context. There
is no separate per-rule activation mechanism in the runtime — the model is
expected to apply a rule when its stated trigger matches, so vague or
overly broad triggers behave like an unconditional prompt edit without
prompt's single-file visibility.

## How to edit it well

Choose SHARED_RULES when a policy should apply only under a recognizable
project, file, language, tool, or failure condition. Use
[prompt.md](prompt.md) for universal behavior, [hooks.md](hooks.md) for
executable lifecycle work, and a source loader
([prompt-loader.md](prompt-loader.md) or
[skill-loader.md](skill-loader.md)) only when a *correct* rule fails to
load — that's a runtime bug, not a content problem.

State the trigger first, then the required behavior, one concern per file
worth of content:

```markdown
# Project rules

- Do not inspect held-out tests, references, answer keys, or evaluator state.
- Do not change the model, endpoint, task budget, or scoring controls.
```

## Constraints

Use Prompt for unconditional project strategy and reusable procedures belong
in Skills. Rules are not lifecycle executors, provider configuration, or a
channel for task-specific answers.

## How to verify

Validate rule syntax (plain Markdown, no required schema), native discovery
(confirm `pi_resource_check.mjs` reports no diagnostics for the resource
loader), and both a triggered and a non-triggered smoke — construct one task
where the rule's trigger matches and one where it doesn't, and confirm the
behavior differs accordingly.
