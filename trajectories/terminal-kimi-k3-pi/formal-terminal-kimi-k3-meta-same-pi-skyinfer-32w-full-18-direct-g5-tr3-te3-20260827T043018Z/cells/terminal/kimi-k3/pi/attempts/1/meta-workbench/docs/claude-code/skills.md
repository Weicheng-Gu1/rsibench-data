# SHARED_SKILLS — Claude Code

## What this module is

Skills live at `workspace/.claude/skills/<name>/SKILL.md`, one directory per
skill. Claude Code discovers every skill directory at startup but does not
load a skill's full body into context by default — it reads the frontmatter
`description` of each skill to decide, per task, whether the skill is
relevant, and only then loads the body.

## How it affects runtime behavior

This description-gated loading is what makes skills different from
CLAUDE.md: an irrelevant task never pays the context cost of a skill it
doesn't need. If the `description` is vague or overlaps with another skill's
trigger, Claude Code may fail to select the right skill, select the wrong
one, or select both — so the description is not documentation, it is the
selection mechanism itself.

## How to edit it well

Choose SHARED_SKILLS when several TRAIN failures need the same specialized
procedure, but unrelated tasks should not load it. If the procedure should
apply to essentially every task, it belongs in [prompt.md](prompt.md)
instead.

A skill needs YAML frontmatter with `name` and a `description` that starts
with a selection cue (e.g. "Use when...") and is specific enough to
discriminate this skill from others in the workspace:

```markdown
---
name: verify-work
description: Use after implementation when focused validation and regression checks are needed.
---

Inspect the changed behavior, run the smallest relevant validation, and report
remaining failures precisely. Do not inspect hidden tests or evaluator state.
```

Put the selection cues in the description and the detailed conditional
procedure in the body. Keep any referenced scripts inside the skill's own
directory, deterministic, and bounded — a skill that shells out to an
unbounded or non-deterministic command is unverifiable.

## Constraints

A skill cannot repair broken skill discovery or native tool execution —
that's a source-runtime concern outside this benchmark's editable Claude
Code surface. Don't use a skill as a workaround for a rule or prompt that
isn't loading; fix the actual owner.

## How to verify

`candidate_check.py` parses every `workspace/**/*.json` file but does not
schema-check `SKILL.md` frontmatter directly, so verify by hand: the file
starts with `---`, has a closing `---`, and `name`/`description` are both
present and match the skill's own directory name. Then run one representative
task that should select the skill and confirm both selection and the
referenced procedure/scripts execute as written.
