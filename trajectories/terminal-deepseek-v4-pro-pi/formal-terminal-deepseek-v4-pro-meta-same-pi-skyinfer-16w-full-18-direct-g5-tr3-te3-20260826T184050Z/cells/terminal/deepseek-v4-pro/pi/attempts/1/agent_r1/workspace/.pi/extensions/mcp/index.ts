import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Pi has no built-in MCP configuration loader. SHARED_MCP is therefore a
// native extension surface: adapters and tools must be registered here and
// are proven by the normal Pi extension/resource preflight before evaluation.
export default function install(_pi: ExtensionAPI): void {}
