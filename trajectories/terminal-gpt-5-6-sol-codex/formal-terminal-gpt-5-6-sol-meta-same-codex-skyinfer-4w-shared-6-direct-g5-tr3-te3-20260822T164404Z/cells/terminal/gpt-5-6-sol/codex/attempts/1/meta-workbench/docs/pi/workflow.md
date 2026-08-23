# SHARED_WORKFLOW — Pi

## What this module is

Files under `.pi/prompts/**` are Pi command/prompt templates, following Pi's
own prompt-template documentation. Each file is a reusable prompt a user or
the agent can invoke by reference rather than content that loads
automatically.

## How it affects runtime behavior

A prompt template is explicitly invoked, not automatically loaded like
SHARED_PROMPT and not description-selected like SHARED_SKILLS. `PI_SRC_
PROMPT_LOADER` governs discovery/ordering for the append-system prompt path;
workflow templates are a separate, explicitly-triggered surface. Pi
intentionally leaves subagent-style delegation to extensions and examples
rather than a first-class subagent runtime the way Claude Code and Codex
have one — do not try to build an unbounded recursive delegation runtime
here.

## How to edit it well

Choose SHARED_WORKFLOW when existing capabilities need a repeatable
sequence, handoff contract, or delegated role — not for an always-on short
loop ([prompt.md](prompt.md)) and not for conditional knowledge the main
agent applies itself ([skills.md](skills.md)).

```markdown
---
description: Review completed task work without editing files
---

Review the current implementation against the user's request. Identify concrete
correctness gaps and missing validation without editing files.
```

Define the trigger for invoking this template, its inputs, its ordered
stages if more than one, its deliverable, how that deliverable is verified,
and explicit bounds on recursion and parallelism.

## Constraints

Do not invent an unbounded recursive process or a new provider/hidden-test
channel. A workflow coordinates existing tools; it does not create new
authority beyond what the template's stages explicitly define.

## How to verify

Validate native discovery (the template is found under `.pi/prompts/`),
invocation (it can actually be triggered), artifact handoff (its output
reaches the intended consumer in a usable form), and bounded completion (no
unbounded loop or recursion).
