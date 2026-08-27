# PI_SRC_SKILL_LOADER — Skill Loader

## What this module is

The skill discovery, filtering, and conditional-activation mechanism behind
SHARED_SKILLS. Owned files: `packages/agent/src/harness/skills.ts` and
`packages/coding-agent/src/core/skills.ts`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

This module decides which skills under `.pi/skills/**` are eligible for a
given task: candidate filtering, precedence resolution, `SKILL.md`
frontmatter parsing, and the selection boundary between "always loaded" and
"conditionally activated". Correct skill content that is discovered but
selected, filtered, or precedence-resolved incorrectly is a defect here, not
in the skill's own content — and not in the generic file discovery that
[resource-loader.md](resource-loader.md) owns.

## How to edit it well

Choose PI_SRC_SKILL_LOADER when correct skills exist but filtering,
precedence, or conditional activation fails — not when the skill's procedure
content itself is wrong (that's [skills.md](skills.md)) and not when the
underlying resource discovery never surfaces the files (that's
[resource-loader.md](resource-loader.md)).

Inspect `packages/coding-agent/src/core/skills.ts` and
`packages/agent/src/harness/skills.ts` first, follow Pi's skills
documentation, and preserve the existing selection-boundary semantics (what
makes a skill eligible vs. ineligible for a given task) rather than
loosening them incidentally while fixing something else.

## Constraints

Skill content belongs to `SHARED_SKILLS`; don't put procedure text or
frontmatter guidance changes into this module. Generic resource discovery
and loading belongs to `PI_SRC_RESOURCE_LOADER`.

## How to verify

Test both positive and negative selection through the default task-agent
startup path — a skill that should be eligible is eligible, and one that
shouldn't match a given task isn't. Run the targeted check (`skills`), then
run the mandatory clean rebuild and Pi CLI smoke via
`candidate_check.py --agent pi --source <path>` before submission. The
frozen `pi_resource_check.mjs` probe (run against your rebuilt `dist/`)
reports the loader's actual `skills` output.
