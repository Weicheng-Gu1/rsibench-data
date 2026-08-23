# Pi Editable Surface

This sandbox is a single Pi coding-agent project with two distinct edit
surfaces layered on top of each other: **Shared-6**, native project
resources loaded at runtime (the same category of thing Claude Code and
Codex expose), and **Source-12**, the physical TypeScript modules of the
pinned Pi source tree itself (`packages/agent`, `packages/coding-agent`,
`packages/ai`) that *implement* the loading, execution, and provider logic
every task run depends on. Full-18 is exactly Source-12 plus Shared-6 — there
is no additional workspace module and no other semantic taxonomy to invent.

## Reading order

1. Read this file, then inventory TRAIN evidence (a passing and a failing
   trajectory for the same task, where available) before touching anything.
2. Decide layer first: is the causal defect missing/wrong task guidance
   (Shared-6), or is it broken runtime mechanism — discovery, loading,
   context assembly, tool execution, provider wire format, and so on
   (Source-12)? Mixing both layers in one change set is rejected by the
   controller.
3. Read the guide for every plausible module in that layer, and its
   `inspect_first` files in the candidate worktree, before editing.
4. Edit only inside the exact native/source paths declared for that module.

## Shared-6 — native project resources

| Module | Guide | Native path |
| --- | --- | --- |
| SHARED_PROMPT | [prompt.md](prompt.md) | `.pi/APPEND_SYSTEM.md` |
| SHARED_RULES | [rules.md](rules.md) | `AGENTS.md` |
| SHARED_SKILLS | [skills.md](skills.md) | `.pi/skills/**` |
| SHARED_HOOKS | [hooks.md](hooks.md) | `.pi/extensions/hooks/**` |
| SHARED_MCP | [mcp.md](mcp.md) | `.pi/extensions/mcp/**` |
| SHARED_WORKFLOW | [workflow.md](workflow.md) | `.pi/prompts/**` |

These never require a rebuild. They are validated by a resource-preflight
plus a per-module load smoke, and for hooks/MCP/skills specifically by the
frozen `pi_resource_check.mjs` loader probe.

## Source-12 — physical Pi source owners

| Module | Guide | Owned trees (abridged) |
| --- | --- | --- |
| PI_SRC_AGENT_LOOP | [agent-loop.md](agent-loop.md) | `packages/agent/src/agent-loop.ts`, `agent.ts`, `stream-fn.ts` |
| PI_SRC_HARNESS_RUNTIME | [harness-runtime.md](harness-runtime.md) | `packages/agent/src/harness/agent-harness.ts`, `harness/env/**`, `types.ts` |
| PI_SRC_CODING_SESSION | [coding-session.md](coding-session.md) | `packages/coding-agent/src/core/agent-session*.ts`, `sdk.ts` |
| PI_SRC_OBSERVATION | [observation.md](observation.md) | `harness/messages.ts`, `core/messages.ts`, tool-output/truncate files |
| PI_SRC_CONTEXT | [context.md](context.md) | `core/model-runtime.ts`, `core/provider-composer.ts` |
| PI_SRC_COMPACTION | [compaction.md](compaction.md) | `harness/compaction/**`, `core/compaction/**` |
| PI_SRC_SESSION_STORAGE | [session-storage.md](session-storage.md) | `harness/session/**`, `core/session-manager.ts`, `session-cwd.ts` |
| PI_SRC_PROMPT_LOADER | [prompt-loader.md](prompt-loader.md) | `harness/system-prompt.ts`, `prompt-templates.ts`, `cli/initial-message.ts` |
| PI_SRC_SKILL_LOADER | [skill-loader.md](skill-loader.md) | `harness/skills.ts`, `core/skills.ts`, `core/resource-loader.ts` |
| PI_SRC_TOOL_RUNTIME | [tool-runtime.md](tool-runtime.md) | `harness/tools/**`, `core/tools/*.ts`, `bash-executor.ts`, `exec.ts` |
| PI_SRC_EXTENSION_RUNTIME | [extension-runtime.md](extension-runtime.md) | `core/extensions/**`, `core/event-bus.ts`, `src/extensions/**` |
| PI_SRC_PROVIDER_RUNTIME | [provider-runtime.md](provider-runtime.md) | `packages/ai/src/api/*.ts` (Anthropic/OpenAI request+stream) |

Every Source-12 module `requires_core_rebuild = true`: a clean rebuild
(`npm ci --ignore-scripts --offline`, `npm run build:offline`) plus a Pi CLI
smoke (`node .../cli.js --version`) must pass before submission, run in that
order by `candidate_check.py --agent pi --source <path>`.

## How the pieces fit

Shared-6 content is *what the task agent is told*; Source-12 is *how the
agent actually turns instructions into actions*. A missing strategy is a
Shared-6 fix; a correct strategy that never reaches the model because
discovery, ordering, or context assembly is broken is a Source-12 fix in the
loader/runtime that owns that step. `PI_SOURCE_MODULE_GUIDANCE` (mined into
each module doc's "choose when") captures this boundary precisely — apply
the same pattern in your own reasoning: "missing task strategy -> shared
resource; correct strategy not loaded -> PI_SRC_PROMPT_LOADER or
PI_SRC_SKILL_LOADER."

## What is frozen

Model/provider catalogs, registration, credentials, endpoint routing, and
lazy entry wrappers (`model-config.ts`, `model-registry.ts`,
`provider-attribution.ts`, `packages/ai/src/providers/**`,
`*.lazy.ts`, etc.) are frozen — these are experiment control variables, not
evolvable agent capability. CLI/RPC entry and interactive-UI files
(`cli.ts`, `cli/args.ts`, `main.ts`, `rpc-entry.ts`,
`modes/interactive/**`, `modes/rpc/**`) are frozen as outside downstream task
capability — `cli/initial-message.ts` is the one CLI file that *is*
evolvable, under PI_SRC_PROMPT_LOADER. Generated/build artifacts
(`package.json`, `package-lock.json`, `**/dist/**`, `**/node_modules/**`,
`.git/**`, `settings/build/**`) are fixed and never evolvable. A file inside
`packages/agent/src`, `packages/ai/src`, or `packages/coding-agent/src` that
matches none of the twelve modules' paths and none of the frozen patterns is
still not fair game — it is an unowned source file and stays frozen until a
targeted validation contract exists for it.

## Before you submit

Every proposal is checked in this order:

1. **`proposal_guard.py`** — the staged diff must stay inside editable
   roots, use an allowed extension, never touch `manifest.json`, and must
   not contain evaluator-owned runtime signals.
2. **`diff_scope_check.py --agent pi`** — every staged path must start with
   `workspace/` or `source_code/` (Pi is the only agent with the second
   root).
3. **`candidate_check.py --agent pi --harness <path>`** for Shared-6 edits
   (runs `pi_resource_check.mjs`, Pi's real `DefaultResourceLoader` and
   extension loader against the staged workspace), or
   **`candidate_check.py --agent pi --source <path>`** for Source-12 edits
   (clean rebuild + CLI smoke, in that order, stopping at the first
   failure).
4. The controller's own manifest validation (`SourceModuleRegistry.
   validate_manifest`) rejects a change set that touches frozen or unowned
   paths, mixes core-source and shared-resource layers, mislabels its
   primary/compound module ownership, or omits `requires_rebuild` for a
   core-source change — physical files and the registry are authoritative
   over any label you write.

A candidate that fails any of these is rejected before it reaches TRAIN.
Module-specific verification is described in each module's own guide.
