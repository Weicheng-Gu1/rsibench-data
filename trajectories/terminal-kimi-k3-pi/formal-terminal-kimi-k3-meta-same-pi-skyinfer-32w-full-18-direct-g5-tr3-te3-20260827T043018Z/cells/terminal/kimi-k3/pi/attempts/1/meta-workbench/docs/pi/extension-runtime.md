# PI_SRC_EXTENSION_RUNTIME — Extension and Event Runtime

## What this module is

The loader and event dispatcher for Pi extensions, which is what
SHARED_HOOKS and SHARED_MCP are both built on top of. Owned paths:
`packages/coding-agent/src/core/extensions/**`,
`packages/coding-agent/src/core/event-bus.ts`, and
`packages/coding-agent/src/extensions/**`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

This module discovers extension entrypoints, registers their event handlers
via `pi.on(...)`, dispatches lifecycle events to them, and contains failures
so one broken extension doesn't take down the session. A valid extension
under `.pi/extensions/hooks/**` or `.pi/extensions/mcp/**` that fails to
load, never receives its events, or whose errors aren't isolated is a defect
here — not in the extension's own code.

## How to edit it well

Choose PI_SRC_EXTENSION_RUNTIME when valid extensions fail to load,
dispatch, isolate, or report errors correctly. Inspect
`packages/coding-agent/docs/extensions.md` and
`packages/coding-agent/src/core/extensions` first — Pi's extensions
documentation defines the lifecycle events and registration contract you
must preserve, in particular event ordering and failure containment (one
extension's exception should not corrupt another's state or crash the
session).

## Constraints

New task-level hook behavior (a new event handler doing new work) belongs to
`SHARED_HOOKS`, not here — this module is the mechanism, not the behavior.

## How to verify

Test native discovery of a representative extension and the concrete event
path it depends on (e.g. confirm `pi_resource_check.mjs` reports it loaded
with no diagnostics after rebuild). Run the targeted checks
(`extension-loader`, `extension-runner`), then run the mandatory clean
rebuild and Pi CLI smoke via `candidate_check.py --agent pi --source <path>`
before submission.
