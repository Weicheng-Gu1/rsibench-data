# Pi Ten-Module Developer Reference

The ten modules follow one task from instruction ingestion to action and final
verification. Select modules from observed trajectory failures. Do not touch a
module merely to make the proposal look comprehensive.

| ID | Module | Native surface | Typical evidence-backed change |
| --- | --- | --- | --- |
| M1 | Prompt & Task Intake | `.pi/APPEND_SYSTEM.md` | Add a missing general decision rule or task-frame extraction |
| M2 | Skills | `.pi/skills/*/SKILL.md` | Add a reusable debugging or testing procedure |
| M3 | Observation Processing | `tool_result`, tool execution events | Preserve the actionable tail of oversized output |
| M4 | Context Selection | `context`, `before_agent_start` | Select complete turns and remove diagnosed noise |
| M5 | Compaction | `session_before_compact`, `session_compact` | Preserve objective, constraints, edits, checks, and next action |
| M6 | Working Memory | session hooks, custom entries, `.pi/state/**` | Persist and retrieve bounded task-local facts |
| M7 | Hooks | `pi.on(...)`, `sendMessage`, active tools | Trigger a phase transition, tool-call interception, or one bounded recovery |
| M8 | Completion Verification | verification evidence plus `agent_end`/`agent_settled` | Decide whether objective evidence permits completion |
| M9 | Local Tools | `registerTool` | Replace repeated fragile shell work with a typed local tool |
| M10 | MCP Adapters | `registerTool` plus real MCP transport | Discover and call an external MCP service with bounded timeouts |

## Native API rules

M3-M10 export a default installer receiving Pi's official `ExtensionAPI`:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function install(pi: ExtensionAPI): void {
  pi.on("tool_result", async (event) => {
    // Return only a semantics-preserving transformation supported by evidence.
  });
}
```

Use `pi.on(...)` for hooks. M7 owns lifecycle control and phase state;
hooks used by another module only implement that module's narrow responsibility.
For example, an M3 `tool_result` hook shapes an observation, while an M7
`tool_result` hook may advance a bounded phase-control state machine. M8 owns
the completion predicate and verification record; M7 may schedule recovery from
that predicate, but must not duplicate it.

M9 and M10 may call `pi.registerTool(...)`. M9 implements deterministic local
operations. M10 must perform genuine MCP initialization, discovery, and
`tools/call` over a configured transport; an `mcp__` name around hard-coded
local output is not MCP. Tool schemas must validate inputs, honor cancellation
where applicable, bound output, and surface failures instead of reporting false
success.

M4 context transforms must preserve causal order, the current task request, and
complete assistant tool-call/tool-result groups. M3 observation transforms must
preserve exit status, failure identity, reproduction commands, and the evidence
needed for diagnosis. M5 compaction must use a valid `firstKeptEntryId` and
preserve the task contract and unresolved work. M6 memory is task-local by
default; never persist answers, task IDs as triggers, credentials, verifier
internals, or uncontrolled transcript dumps.

## Mechanism evidence

Import the fixed helper from `.pi/rsibench-runtime/module-evidence.ts` and emit
an event when a mechanism actually activates. Registration alone is not an
activation claim.

```ts
import { recordModuleEvent } from "../../../rsibench-runtime/module-evidence.ts";

recordModuleEvent(pi, "M7_hooks", "recovery_scheduled", {
  reason: "verification_missing",
});
```

Evidence requirements:

- M1/M2: the resource is loaded and the next provider context contains the
  intended general guidance or skill.
- M3: raw and retained observation sizes/hashes plus the preserved decisive
  evidence and its use in the next action.
- M4: the selected context remains structurally valid and changes the next
  action for the diagnosed reason.
- M5: before/after compaction evidence and survival of the required fields.
- M6: a real write, later read, and injection/use with matching value hashes.
- M7: trigger, bounded state transition, intervention count, and resulting
  ordered action. Every loop needs a termination condition.
- M8: an objective verification action/result and the predicate decision. A
  prose self-review is not independent verification.
- M9/M10: loader registration, assistant `toolCall`, matching successful
  `toolResult`, and a subsequent action using the result. M10 also needs MCP
  discovery/call evidence.

Replay a proposed trigger over cited failures and representative clean passes
before submitting. Report failure hits and clean-pass exposure. A newly added
opt-in tool cannot claim a pre-change replay hit; its next-rollout activation
must be marked unverified until the official trajectory contains the call.

## Choosing a module

Use the earliest causal break, not the easiest file to edit:

1. Missing rule: M1.
2. Missing reusable procedure: M2.
3. Tool output hid the evidence: M3.
4. Evidence existed but did not reach the decisive model call: M4.
5. Evidence was lost during compaction: M5.
6. Required task-local state did not survive the needed boundary: M6.
7. Correct action was known but sequencing/recovery failed: M7.
8. Completion lacked objective proof: M8.
9. Repeated local operation was fragile: M9.
10. A justified external capability was missing: M10.

Cross-module edits are valid only when they form one explicit causal mechanism.
For example, M9 produces structured test evidence, M8 evaluates it, and M7
schedules one recovery turn on failure. Preserve passing behavior and measure
extra turns, tokens, and tool exposure.
