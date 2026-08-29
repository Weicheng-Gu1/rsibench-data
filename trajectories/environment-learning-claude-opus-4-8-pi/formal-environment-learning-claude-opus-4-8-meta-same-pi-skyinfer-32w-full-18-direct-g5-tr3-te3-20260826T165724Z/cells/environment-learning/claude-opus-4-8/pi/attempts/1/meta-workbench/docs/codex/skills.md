# SHARED_SKILLS — Codex

## What this module is

Skills live at `workspace/.agents/skills/<name>/SKILL.md` — note this is a
Codex-specific path, `.agents/skills/`, not `.codex/skills/`. Codex discovers
every skill directory and uses its frontmatter `description` to decide,
per task, whether to load the skill's body.

## How it affects runtime behavior

Like Claude Code's skills, loading is description-gated: an irrelevant task
never pays the context cost of a skill it doesn't need. A vague or
overlapping `description` causes Codex to miss the right skill, pick the
wrong one, or load more than intended, so the description is the selection
mechanism, not just documentation.

## How to edit it well

Choose SHARED_SKILLS when several TRAIN failures need the same specialized
procedure but unrelated tasks should not load it. If the procedure should
apply to essentially every task, it belongs in [prompt.md](prompt.md)
instead.

```markdown
---
name: verify-work
description: Use after implementation when focused validation and regression checks are needed.
---

Inspect the changed behavior, run the smallest relevant validation, and report
remaining failures precisely. Do not inspect hidden tests or evaluator state.
```

Put selection cues in the description and the detailed conditional procedure
in the body. Keep any referenced scripts inside the skill's own directory,
deterministic, and bounded.

## Constraints

A skill cannot repair broken skill discovery or native tool execution. Don't
use a skill as a workaround for a rule or prompt that isn't loading — fix the
actual owner.

## How to verify

`candidate_check.py` parses workspace JSON but does not schema-check
`SKILL.md` frontmatter directly, so verify by hand: the file starts with
`---`, has a closing `---`, and `name`/`description` are both present and
the `name` matches the skill's own directory. Then confirm native discovery,
that the description actually triggers selection for a representative
matching task, and that every referenced path and script resolves.
