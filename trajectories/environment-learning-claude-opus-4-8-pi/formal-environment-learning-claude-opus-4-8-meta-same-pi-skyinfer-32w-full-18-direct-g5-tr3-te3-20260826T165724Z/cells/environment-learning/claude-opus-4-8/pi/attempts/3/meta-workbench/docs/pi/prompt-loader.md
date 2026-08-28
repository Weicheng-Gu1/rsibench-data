# PI_SRC_PROMPT_LOADER — Prompt Loader

## What this module is

The discovery and assembly mechanism for system prompts and initial
messages. Owned files: `packages/agent/src/harness/system-prompt.ts`,
`packages/agent/src/harness/prompt-templates.ts`,
`packages/coding-agent/src/core/system-prompt.ts`,
`packages/coding-agent/src/core/prompt-templates.ts`, and
`packages/coding-agent/src/cli/initial-message.ts`. Core-source —
`requires_core_rebuild = true`. Note this is the one CLI file
(`cli/initial-message.ts`) that is evolvable despite most of `cli/**` being
frozen.

## How it affects runtime behavior

This module governs how `.pi/APPEND_SYSTEM.md` (SHARED_PROMPT) and
`AGENTS.md` (SHARED_RULES) actually reach the model: discovery order,
precedence when multiple sources are present, escaping, and injection into
the system prompt / initial message. Correct Shared-6 content that never
reaches the model because of a loader defect is invisible from the content
side — you have to look here.

## How to edit it well

Choose PI_SRC_PROMPT_LOADER only when the correct prompt resource already
exists but discovery, precedence, escaping, ordering, or injection is wrong
— not when the prompt content itself needs to change (that's
[prompt.md](prompt.md) or [rules.md](rules.md)).

Inspect `packages/coding-agent/src/core/system-prompt.ts` and
`packages/coding-agent/src/core/prompt-templates.ts` first, and follow Pi's
prompt-template documentation for the expected assembly order.

## Constraints

Changing the guidance itself belongs to SHARED_PROMPT or SHARED_RULES, not
here — this module is about mechanism, not content.

## How to verify

Test the default RSIBench load path end to end, plus correct ordering
against existing task instructions (the loaded content should not shadow or
scramble the original task instruction). Run the targeted check
(`prompt-loader`), then run the mandatory clean rebuild and Pi CLI smoke via
`candidate_check.py --agent pi --source <path>` before submission.
