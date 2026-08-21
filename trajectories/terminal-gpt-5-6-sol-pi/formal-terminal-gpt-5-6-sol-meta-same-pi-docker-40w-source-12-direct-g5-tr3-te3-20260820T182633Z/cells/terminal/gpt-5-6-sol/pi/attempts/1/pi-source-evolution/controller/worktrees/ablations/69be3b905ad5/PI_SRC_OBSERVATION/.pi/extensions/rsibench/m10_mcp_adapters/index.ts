import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// SHARED_MCP: native Pi extension entrypoint for MCP adapters. Meta-agent
// changes register adapters/tools here and keeps endpoint declarations under
// .pi/mcp/**; the empty baseline deliberately exposes no external server.
export default function install(_pi: ExtensionAPI): void {}
