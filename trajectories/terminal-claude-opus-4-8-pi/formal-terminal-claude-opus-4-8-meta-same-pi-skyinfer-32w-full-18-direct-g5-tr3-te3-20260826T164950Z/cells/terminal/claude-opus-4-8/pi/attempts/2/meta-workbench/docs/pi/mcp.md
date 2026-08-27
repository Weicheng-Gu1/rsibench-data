# SHARED_MCP — Pi

## What this module is

Pi has no built-in MCP configuration file (no `.mcp.json` equivalent).
SHARED_MCP is therefore a native Pi *extension* surface: MCP-backed
adapters and tools must be implemented directly under
`.pi/extensions/mcp/**` as extension code, not declared as JSON/TOML
configuration.

## How it affects runtime behavior

The extension's `install()` function registers whatever tools it wants to
expose using Pi's `ExtensionAPI`. Nothing is registered unless your
extension code registers it — there is no separate MCP-server-launch step
Pi performs on your behalf. As with hooks, extension *loading and dispatch*
is owned by `PI_SRC_EXTENSION_RUNTIME` ([extension-runtime.md](
extension-runtime.md)); this module only covers what your extension does
once loaded.

## How to edit it well

Choose SHARED_MCP when a bounded external capability with a stable tool
schema is genuinely absent from Pi's native tools.

The empty baseline documents the constraint explicitly:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Pi has no built-in MCP configuration loader. SHARED_MCP is therefore a
// native extension surface: adapters and tools must be registered here and
// are proven by the normal Pi extension/resource preflight before evaluation.
export default function install(_pi: ExtensionAPI): void {}
```

A real adapter registers one or more tools inside `install()` with a small,
stable schema, deterministic startup, bounded per-request behavior, and
actionable errors on failure.

## Constraints

Never change provider routing or expose evaluator, hidden-test, credential,
or unrestricted-network state through an MCP-backed tool. Keep the schema
minimal — this is not a place to expose a general-purpose shell or
filesystem escape hatch that duplicates or bypasses native tool policy.

## How to verify

`pi_resource_check.mjs` loads the staged workspace through Pi's real
extension loader and surfaces load errors. Beyond that, validate extension
loading explicitly, transport startup, the handshake, one representative
tool call, error behavior on a bad call, and clean shutdown.
