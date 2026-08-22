# Pinned Pi Harness Reference

RSIBench pins Pi 0.82.1 and exposes its native project resources as ten
independently attributable modules. Pi core is never edited. The editable
surface lives entirely under `/app/task-agent-harness/workspace/.pi/`.

Read `modules.md` before changing a Pi harness. It records the supported native
resource and `ExtensionAPI` mechanisms, module ownership, evidence requirements,
and common failure modes.

The canonical layout is:

```text
workspace/.pi/
  APPEND_SYSTEM.md                         # M1 Prompt, optional
  skills/**                                # M2 Skills
  extensions/rsibench/
    package.json                           # fixed ordered manifest
    m03_observation_processing/index.ts    # M3 Observation Processing
    m04_context_selection/index.ts         # M4 Context Selection
    m05_compaction/index.ts                # M5 Compaction
    m06_working_memory/index.ts             # M6 Working Memory
    m07_hooks/index.ts                      # M7 Hooks
    m08_completion_verification/index.ts    # M8 Completion Verification
    m09_local_tools/index.ts               # M9 Local Tools
    m10_mcp_adapters/index.ts              # M10 MCP Adapters
  mcp/**                                   # M10 MCP Adapters-owned config/server files
  state/**                                 # M6 Working Memory-owned state schema/config
  rsibench-runtime/module-evidence.ts       # fixed evidence helper
  settings.json                            # fixed runtime settings
```

There is deliberately no `AGENTS.md` in the canonical Pi harness. M1 uses
Pi's native `.pi/APPEND_SYSTEM.md`, preserving Pi's default system prompt.
There is also no RSIBench capability facade: extension entrypoints receive the
official Pi `ExtensionAPI` directly. RSIBench enforces attribution through path
ownership, a fixed ordered extension manifest, source checks, content hashes,
cold-start loading, leave-one-module-out materialization, and runtime evidence.

Every submitted proposal must pass:

```bash
python3 /app/meta-workbench/scripts/pi_module_check.py \
  --harness /app/task-agent-harness

"$RSIBENCH_PI_NODE_EXECUTABLE" \
  /app/meta-workbench/scripts/pi_resource_check.mjs \
  /app/task-agent-harness/workspace
```

Passing these checks proves structure and loadability, not performance. A
runtime claim additionally needs a matching official session event, tool call,
tool result, state transition, or provider-context effect in the next task
rollout. Formal acceptance remains controlled by the RSIBench test gate.
