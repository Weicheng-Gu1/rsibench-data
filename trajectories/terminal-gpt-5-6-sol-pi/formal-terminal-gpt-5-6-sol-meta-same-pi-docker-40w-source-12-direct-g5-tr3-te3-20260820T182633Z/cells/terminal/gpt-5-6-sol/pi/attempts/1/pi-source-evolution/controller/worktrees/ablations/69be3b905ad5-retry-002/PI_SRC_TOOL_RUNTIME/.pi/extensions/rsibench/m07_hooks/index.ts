import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// SHARED_HOOKS: task-local shell hooks, implemented through Pi's native event API.
// A missing script is a no-op. Non-zero exits are observable but never mutate
// the fixed controller or provider configuration.
function runHook(cwd: string, name: string): void {
  const script = join(cwd, ".pi", "hooks", `${name}.sh`);
  if (!existsSync(script)) return;
  const result = spawnSync("/bin/sh", [script], {
    cwd,
    env: { ...process.env, RSIBENCH_PI_HOOK_EVENT: name },
    encoding: "utf-8",
    timeout: 30_000,
  });
  if (result.status !== 0) {
    process.stderr.write(
      `[rsibench hook ${name}] exit=${result.status ?? "signal"}\n${result.stderr ?? ""}`,
    );
  }
}

export default function install(pi: ExtensionAPI): void {
  pi.on("agent_start", (_event, ctx) => runHook(ctx.cwd, "agent_start"));
  pi.on("agent_end", (_event, ctx) => runHook(ctx.cwd, "agent_end"));
  pi.on("turn_start", (_event, ctx) => runHook(ctx.cwd, "turn_start"));
  pi.on("turn_end", (_event, ctx) => runHook(ctx.cwd, "turn_end"));
}
