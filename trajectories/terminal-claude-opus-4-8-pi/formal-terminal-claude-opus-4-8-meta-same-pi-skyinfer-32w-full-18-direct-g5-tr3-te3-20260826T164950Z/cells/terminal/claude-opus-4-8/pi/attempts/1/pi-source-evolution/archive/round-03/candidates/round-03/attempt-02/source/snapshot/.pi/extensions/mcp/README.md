# Pi MCP adapter surface

Pi does not consume `.mcp.json` or `.pi/mcp/**`. Implement bounded MCP-backed
tools in `index.ts`; the task sandbox loads that file through Pi's native
project extension discovery.
