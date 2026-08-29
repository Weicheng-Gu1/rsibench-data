import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// SHARED_HOOKS is one native Pi extension. Optional shell handlers live next
// to this entrypoint under scripts/, rather than in a pseudo-native hook tree.
const extensionDir = dirname(fileURLToPath(import.meta.url));

function runHook(cwd: string, name: string): void {
  const script = join(extensionDir, "scripts", `${name}.sh`);
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
