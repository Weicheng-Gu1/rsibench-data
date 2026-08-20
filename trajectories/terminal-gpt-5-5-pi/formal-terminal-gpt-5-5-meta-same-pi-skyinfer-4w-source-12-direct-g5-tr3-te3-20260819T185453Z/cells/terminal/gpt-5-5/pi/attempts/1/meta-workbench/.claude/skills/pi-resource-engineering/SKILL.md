---
name: pi-resource-engineering
description: Use when improving the official Pi project workspace through prompts, skills, hooks, context, memory, verification, local tools, or MCP.
---

# Engineer Native Pi Resources

Read `/app/meta-workbench/references/pi/README.md` and `modules.md` before
editing. They define the pinned Pi 0.82.1 contract. Public documentation is
background; the pinned package and loader check are executable authority.

Pi already provides its default system prompt, read/write/edit/search/shell
tools, multi-turn sessions, extension hooks, and automatic compaction. Do not
claim built-ins as RSI improvements. Do not add `AGENTS.md` to the Pi harness or
replace the base system prompt. M1 uses `.pi/APPEND_SYSTEM.md` only when training
evidence shows that a general rule is genuinely absent.

Use the ten native modules:

1. M1 Prompt & Task Intake: `.pi/APPEND_SYSTEM.md`.
2. M2 Skills: `.pi/skills/**`.
3. M3 Observation Processing: tool-result shaping.
4. M4 Context Selection: provider-context selection and assembly.
5. M5 Compaction: summary and overflow policy.
6. M6 Working Memory: bounded task-local persistence and retrieval.
7. M7 Hooks: lifecycle triggers, interception, phase transitions, recovery.
8. M8 Completion Verification: objective completion predicates and evidence.
9. M9 Local Tools: typed deterministic project-local tools.
10. M10 MCP Adapters: genuine MCP transport, discovery, and calls.

M3-M10 are native extensions under
`.pi/extensions/rsibench/<module>/index.ts` and receive official
`ExtensionAPI` directly. The ordered `package.json`, `settings.json`, and
`rsibench-runtime/module-evidence.ts` are controller-owned and immutable.

Before editing, produce an M1-M10 hypothesis table in the Meta session. For each
module record clean trajectory evidence, proposed trigger/mechanism, expected
next-trajectory event, preservation risk, and `select` or `reject`. Then make
the smallest sufficient causal proposal. It may span several modules when their
dependency is explicit; never modify modules for taxonomy coverage.

Prefer task-general triggers supported by repeated clean failures and rare in
clean passes. Task IDs may appear in analysis but never in executable triggers,
messages, constants, or harness data. Separate provider, transport, sandbox,
and credential failures from task-agent behavior.

Before shipping a hook or predicate, replay it over cited failing and passing
trajectories. Before shipping a tool, run deterministic contract tests and name
the exact next-rollout `toolCall`/`toolResult` evidence required. Mark that
activation unverified until the official trajectory contains it. Loader success
proves only registration. A mechanism claim needs runtime activation and a
subsequent behavior change.

Run both checks before staging the proposal:

```bash
python3 /app/meta-workbench/scripts/pi_module_check.py \
  --harness /app/task-agent-harness

"$RSIBENCH_PI_NODE_EXECUTABLE" \
  /app/meta-workbench/scripts/pi_resource_check.mjs \
  /app/task-agent-harness/workspace
```

Use `recordModuleEvent(...)` for correlated runtime evidence. Inspect the
staged diff and report selected modules, causal evidence, expected event,
clean-pass exposure, checks, and preserved behavior. Formal acceptance is made
only by RSIBench validation.
