# SHARED_MCP — Codex

## What this module is

`workspace/.codex/config.toml` declares MCP servers for Codex under a single
`mcp_servers` table. This file may contain *only* `mcp_servers` — the
candidate checker rejects any other top-level key, since Codex's fixed
model-provider configuration lives in a separate, frozen layer outside this
harness's editable surface.

## How it affects runtime behavior

Every declared server starts at session initialization and its tools become
available for the whole session, same as Claude Code's `.mcp.json`. A server
that fails to start or hangs on initialization degrades the whole session,
not just its own capability.

## How to edit it well

Choose SHARED_MCP when a bounded external capability with a stable tool
schema is genuinely absent from Codex's native tools — do not reach for MCP
to work around a native tool being used incorrectly.

The baseline is commented-out guidance, not an active server:

```toml
# SHARED_MCP: project-native Codex MCP declarations live here. The runtime
# injects its fixed HTTP-only model provider in the user config layer.
#
# [mcp_servers.example]
# command = "example-mcp-server"
```

A real server needs a `command` that resolves (a bare name found on `PATH`,
or a path that exists inside the workspace):

```toml
[mcp_servers.example]
command = "workspace/scripts/example-mcp-server.sh"
```

Keep the tool schema minimal and stable, startup deterministic, per-request
bounds explicit, and errors actionable.

## Constraints

`config.toml` may contain only the `mcp_servers` table — any other key is
rejected. MCP may not change the experiment endpoint or become a hidden-test,
evaluator, or unrestricted-network side channel.

## How to verify

`candidate_check.py --agent codex` parses the TOML, rejects any key besides
`mcp_servers`, and requires every server's `command` to resolve. When the
`codex` binary is present, it also runs `codex mcp list` as a live smoke
test against the configured servers. Beyond the automated check, manually
verify server startup, the MCP handshake, one representative tool call,
error behavior on a bad call, and clean shutdown.
