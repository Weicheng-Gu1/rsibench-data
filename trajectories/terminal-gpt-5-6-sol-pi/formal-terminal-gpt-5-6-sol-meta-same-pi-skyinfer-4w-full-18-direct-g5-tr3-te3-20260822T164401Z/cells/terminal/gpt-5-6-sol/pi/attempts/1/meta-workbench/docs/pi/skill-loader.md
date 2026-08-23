# PI_SRC_SKILL_LOADER — Skill and Resource Loader

## What this module is

The discovery, filtering, and parsing mechanism behind SHARED_SKILLS. Owned
files: `packages/agent/src/harness/skills.ts`,
`packages/coding-agent/src/core/skills.ts`, and
`packages/coding-agent/src/core/resource-loader.ts`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

This is the `DefaultResourceLoader` machinery that `pi_resource_check.mjs`
exercises directly: it discovers skill directories under `.pi/skills/**`,
filters/precedence-resolves candidates, parses `SKILL.md` frontmatter, and
decides what gets loaded for a given task. Correct skill content that is
never discovered, or is discovered but filtered/collided incorrectly, is a
defect here, not in the skill's own content.

## How to edit it well

Choose PI_SRC_SKILL_LOADER when correct skills or resources exist but
discovery, filtering, precedence, parsing, or loading fails — not when the
skill's procedure content itself is wrong (that's
[skills.md](skills.md)).

Inspect `packages/coding-agent/src/core/skills.ts` and
`packages/coding-agent/src/core/resource-loader.ts` first, follow Pi's
skills documentation, and preserve the existing selection-boundary semantics
(what makes a skill eligible vs. ineligible for a given task) rather than
loosening them incidentally while fixing something else.

## Constraints

Skill content belongs to `SHARED_SKILLS`; don't put procedure text or
frontmatter guidance changes into this module.

## How to verify

Test both positive and negative discovery through the default task-agent
startup path — a skill that should be found is found, and one that
shouldn't match a given task isn't. Run the targeted checks (`skills`,
`resource-loader`), then run the mandatory clean rebuild and Pi CLI smoke
via `candidate_check.py --agent pi --source <path>` before submission. The
frozen `pi_resource_check.mjs` probe (run against your rebuilt `dist/`) is
the most direct evidence: it reports the loader's actual `skills`, `tools`,
and `diagnostics` output.
