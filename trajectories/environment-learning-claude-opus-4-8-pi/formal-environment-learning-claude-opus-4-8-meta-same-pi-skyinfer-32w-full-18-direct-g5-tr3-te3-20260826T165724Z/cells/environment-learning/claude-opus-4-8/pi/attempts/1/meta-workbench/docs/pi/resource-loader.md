# PI_SRC_RESOURCE_LOADER — Resource Loader

## What this module is

Pi's `DefaultResourceLoader` — the single discovery-and-loading engine for
every project resource: prompts and `APPEND_SYSTEM.md`, skills directories,
prompt templates, extensions, context files (`AGENTS.md`), and themes. Owned
file: `packages/coding-agent/src/core/resource-loader.ts`. Core-source —
`requires_core_rebuild = true`. Split from the skill loader in module
protocol v2 so loader-level failures attribute to one owner.

## How it affects runtime behavior

This is the machinery that `pi_resource_check.mjs` exercises directly: it
walks `.pi/**` and the global agent directory, resolves which resource files
exist, in what order they load, and hands them to the specific subsystems
(skills selection, prompt assembly, extension activation). A resource that
exists on disk but is never discovered, is loaded in the wrong order, or is
silently dropped with no diagnostic is a defect here — regardless of which
resource type it is.

## How to edit it well

Choose PI_SRC_RESOURCE_LOADER when prompts, skills, extensions, context
files, or `APPEND_SYSTEM.md` exist but are not discovered, ordered, or
loaded correctly. Inspect `packages/coding-agent/src/core/resource-loader.ts`
and Pi's `docs/sdk.md` (the "DefaultResourceLoader" section) first — the
loading order and trust gating documented there are contracts your fix must
preserve.

## Constraints

Skill selection semantics belong to `PI_SRC_SKILL_LOADER`; resource content
belongs to the shared modules. Do not weaken project-trust gating, and do
not special-case benchmark paths or task identities in discovery logic.

## How to verify

Run the targeted check (`resource-loader`), then the mandatory clean rebuild
and Pi CLI smoke via `candidate_check.py --agent pi --source <path>`. The
frozen `pi_resource_check.mjs` probe against your rebuilt `dist/` is the
most direct evidence: it reports the loader's actual `skills`, `tools`,
`extensions`, and `diagnostics` output for the staged workspace.
