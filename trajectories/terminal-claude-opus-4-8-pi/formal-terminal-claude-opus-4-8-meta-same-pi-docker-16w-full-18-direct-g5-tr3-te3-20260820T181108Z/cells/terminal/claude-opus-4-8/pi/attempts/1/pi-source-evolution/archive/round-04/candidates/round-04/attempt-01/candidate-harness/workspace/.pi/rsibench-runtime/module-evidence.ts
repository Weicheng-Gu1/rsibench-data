import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type RSIBenchModule =
  | "M3_observation_processing"
  | "M4_context_selection"
  | "M5_compaction"
  | "M6_working_memory"
  | "M7_hooks"
  | "M8_completion_verification"
  | "M9_local_tools"
  | "M10_mcp_adapters";

export function recordModuleEvent(
  pi: ExtensionAPI,
  module: RSIBenchModule,
  event: string,
  details: Record<string, unknown> = {},
): void {
  pi.appendEntry("rsibench:module-activation", {
    schemaVersion: 1,
    module,
    event,
    details,
  });
}
