import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type RSIBenchModule = "M2_state" | "M3_control" | "M4_action";

const EVENTS: Record<RSIBenchModule, ReadonlySet<string>> = {
  M2_state: new Set([
    "resources_discover", "session_start", "session_before_switch",
    "session_before_fork", "session_before_compact", "session_compact",
    "session_shutdown", "session_before_tree", "session_tree", "context",
    "before_provider_request", "before_provider_headers",
    "after_provider_response", "before_agent_start", "tool_result",
  ]),
  M3_control: new Set([
    "session_start", "session_shutdown", "before_agent_start", "agent_start",
    "agent_end", "agent_settled", "turn_start", "turn_end", "message_start",
    "message_update", "message_end", "tool_call", "tool_result", "user_bash",
    "input", "model_select", "thinking_level_select",
  ]),
  M4_action: new Set([
    "session_start", "session_shutdown", "tool_execution_start",
    "tool_execution_update", "tool_execution_end",
  ]),
};

const METHODS: Record<RSIBenchModule, ReadonlySet<string>> = {
  M2_state: new Set([
    "on", "registerTool", "appendEntry", "registerEntryRenderer",
    "registerMessageRenderer", "getSessionName",
  ]),
  M3_control: new Set([
    "on", "sendMessage", "sendUserMessage", "appendEntry", "setSessionName",
    "getSessionName", "setLabel", "exec", "getActiveTools", "getAllTools",
    "setActiveTools", "getThinkingLevel", "setThinkingLevel",
  ]),
  M4_action: new Set([
    "on", "registerTool", "appendEntry", "exec", "getActiveTools",
    "getAllTools",
  ]),
};

function stateToolAllowed(tool: unknown): boolean {
  const name = String((tool as { name?: unknown })?.name ?? "");
  return /(?:memory|state|context)/i.test(name);
}

export function scopedExtensionApi(
  pi: ExtensionAPI,
  module: RSIBenchModule,
): ExtensionAPI {
  return new Proxy(pi, {
    get(target, property) {
      if (typeof property !== "string") return Reflect.get(target, property);
      if (!METHODS[module].has(property)) {
        throw new Error(`RSIBench module ${module} cannot access ExtensionAPI.${property}`);
      }
      if (property === "on") {
        return (event: string, handler: unknown) => {
          if (!EVENTS[module].has(event)) {
            throw new Error(`RSIBench module ${module} cannot subscribe to ${event}`);
          }
          return (target.on as unknown as (name: string, fn: unknown) => void)(event, handler);
        };
      }
      if (property === "registerTool") {
        return (tool: unknown) => {
          if (module === "M3_control") {
            throw new Error("M3_control cannot register tools");
          }
          if (module === "M2_state" && !stateToolAllowed(tool)) {
            throw new Error("M2_state tools must have a memory/state/context name");
          }
          return (target.registerTool as unknown as (value: unknown) => void)(tool);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
