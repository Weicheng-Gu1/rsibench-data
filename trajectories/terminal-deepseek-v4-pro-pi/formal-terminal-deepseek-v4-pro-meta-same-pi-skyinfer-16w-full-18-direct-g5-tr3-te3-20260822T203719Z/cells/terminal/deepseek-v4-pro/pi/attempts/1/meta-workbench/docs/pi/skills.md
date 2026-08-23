# SHARED_SKILLS — Pi

## What this module is

Skills live at `.pi/skills/<name>/SKILL.md`, one directory per skill, as
documented in Pi's own `packages/coding-agent/docs/skills.md`. Pi's
`DefaultResourceLoader` discovers every skill directory and uses the
frontmatter `description` to decide, per task, whether to load the body —
the same mechanism `pi_resource_check.mjs` exercises directly against the
real loader.

## How it affects runtime behavior

Loading is description-gated: an irrelevant task never pays the context cost
of a skill it doesn't need. `PI_SRC_SKILL_LOADER` is the module that
performs discovery, filtering, precedence, and parsing — if a skill's
content is correct but is never discovered or selected, that's a Source-12
bug in the loader, not a content problem here. See
[skill-loader.md](skill-loader.md).

## How to edit it well

Choose SHARED_SKILLS when several TRAIN failures need the same specialized
procedure but unrelated tasks should not pay its context cost. If the
procedure should apply to nearly every task, use [prompt.md](prompt.md)
instead.

```markdown
---
name: verify-work
description: Use after implementation when focused validation and regression checks are needed.
---

Inspect the changed behavior, run the smallest relevant validation, and report
remaining failures precisely. Do not inspect hidden tests or evaluator state.
```

Give the skill a discriminating description and include only necessary
references or bounded, deterministic scripts.

## Constraints

A skill cannot repair broken skill discovery or native tool execution — if
valid skill content is not being discovered at all, the fix belongs in
`PI_SRC_SKILL_LOADER`, not in a new or modified `SKILL.md`.

## How to verify

Validate skill schema (frontmatter has `name` and `description`), native
discovery and trigger selection via `pi_resource_check.mjs` (it runs Pi's
real `DefaultResourceLoader.getSkills()` against the staged workspace and
reports any diagnostics, including collisions), and a referenced script
smoke for anything the skill invokes.
