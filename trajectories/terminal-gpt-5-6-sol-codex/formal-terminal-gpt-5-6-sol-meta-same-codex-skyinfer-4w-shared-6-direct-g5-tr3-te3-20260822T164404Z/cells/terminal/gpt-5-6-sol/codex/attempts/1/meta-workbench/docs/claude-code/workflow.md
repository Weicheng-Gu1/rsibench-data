# SHARED_WORKFLOW — Claude Code

## What this module is

Files under `workspace/.claude/agents/**` define Claude Code subagents:
delegated roles the main agent can hand a bounded task to and get a result
back from. Each file is a Markdown document with YAML frontmatter declaring
the subagent's `name`, `description`, and the native tool names it is
allowed to use.

## How it affects runtime behavior

A subagent is not invoked automatically like a hook, and it is not
description-selected like a skill's body — the main Claude Code agent
explicitly delegates to it by name, and the subagent runs with its own tool
restrictions (e.g. read-only review) before handing a result back. This
makes SHARED_WORKFLOW the right place for a role that should be *isolated*
from the main agent's broader tool access, not just conditionally invoked.

## How to edit it well

Choose SHARED_WORKFLOW when existing capabilities need a repeatable
sequence, an explicit handoff contract, or a delegated specialist role —
not for an always-on short loop (that's [prompt.md](prompt.md)) and not for
a conditional procedure the main agent runs itself (that's
[skills.md](skills.md)).

```markdown
---
name: rsibench-reviewer
description: Review completed task work when an independent verification pass is useful.
tools: Read, Glob, Grep
---

Review the current implementation against the user's request. Identify concrete
correctness gaps and missing validation without editing files.
```

Define the trigger for delegating to this role, its inputs, its ordered
stages if it has more than one, its deliverable back to the caller, how that
deliverable is verified, and the handback condition. Restrict `tools` to the
minimum the role actually needs — a read-only reviewer should not be able to
edit files.

## Constraints

Bound recursion and parallelism explicitly; a workflow coordinates existing
tools, it does not silently create new authority or an unbounded delegation
chain. Do not use a subagent to route around a tool restriction that exists
elsewhere in the harness for a reason.

## How to verify

`candidate_check.py` runs `claude agents` as a live smoke test when the
`claude` binary is present in the sandbox, which surfaces malformed
frontmatter or a broken agent registration. Beyond that, manually confirm
native discovery (the subagent shows up), invoke one complete delegation
end to end, and confirm the deliverable and handback actually reach the
main agent in a usable form.
