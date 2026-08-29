# SHARED_MCP — Claude Code

## What this module is

`workspace/.mcp.json` declares Model Context Protocol servers that Claude
Code starts and exposes as tools alongside its native tool set. It is a
single JSON file with one required shape: a top-level `mcpServers` object
mapping server names to their launch configuration.

## How it affects runtime behavior

Every declared server is started at session initialization and its tools
become available to the model for the whole session. A server that fails to
start, hangs on initialization, or returns malformed tool schemas degrades
or blocks the whole session, not just the capability it was meant to add —
so startup determinism matters more here than almost anywhere else in the
harness.

## How to edit it well

Choose SHARED_MCP when a bounded external capability with a stable tool
schema is genuinely absent from Claude Code's native tools (Read, Write,
Edit, Bash, Grep, etc.) — do not reach for MCP to work around a tool that
already exists but is being used incorrectly.

The empty baseline:

```json
{
  "mcpServers": {}
}
```

A populated server needs a `command` that resolves (a bare name found on
`PATH`, or a path that exists inside the workspace):

```json
{
  "mcpServers": {
    "example": {
      "command": "workspace/scripts/example-mcp-server.sh",
      "args": []
    }
  }
}
```

Keep the tool schema minimal and stable, keep startup deterministic (no
network calls that can hang indefinitely), keep per-request bounds explicit,
and make errors actionable rather than opaque failures.

## Constraints

MCP may not proxy the evaluator, hidden data, the model endpoint, or
unrestricted host access. Every server's `command` must resolve inside the
sandbox — an MCP server that shells out to an unresolvable binary fails
validation, not just at runtime but at candidate-check time.

## How to verify

`candidate_check.py --agent claude-code` parses `.mcp.json`, requires
`mcpServers` to be an object, and for every server requires a string
`command` that resolves — either an existing path or something found via
`shutil.which`. That check catches configuration errors but not runtime
behavior: manually verify server startup, the MCP handshake, one
representative tool call end to end, error behavior on a bad call, and clean
shutdown, ideally by running the harness's live smoke path if available.
