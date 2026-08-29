# SHARED_HOOKS — Pi

## What this module is

Unlike Claude Code and Codex, Pi has no dedicated hooks-declaration file.
Task-level lifecycle behavior is implemented as a native Pi *extension*
under `.pi/extensions/hooks/**`, using Pi's documented extension event API
(`pi.on(eventName, handler)`).

## How it affects runtime behavior

`PI_SRC_EXTENSION_RUNTIME` is the Source-12 module that loads extensions,
dispatches events, and isolates/contains extension failures. This module
(SHARED_HOOKS) is only the content of your extension — the event handlers
and the scripts they invoke. If extension loading or dispatch itself is
broken (a valid extension never registers, an event never fires), that's a
Source-12 bug in `PI_SRC_EXTENSION_RUNTIME`, not something fixable here. See
[extension-runtime.md](extension-runtime.md).

## How to edit it well

Choose SHARED_HOOKS when a deterministic action must run at a documented
lifecycle event independently of model compliance.

A minimal extension entrypoint wires lifecycle events to scripts kept next
to it:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    process.stderr.write(`[rsibench hook ${name}] exit=${result.status ?? "signal"}\n${result.stderr ?? ""}`);
  }
}

export default function install(pi: ExtensionAPI): void {
  pi.on("agent_start", (_event, ctx) => runHook(ctx.cwd, "agent_start"));
  pi.on("agent_end", (_event, ctx) => runHook(ctx.cwd, "agent_end"));
  pi.on("turn_start", (_event, ctx) => runHook(ctx.cwd, "turn_start"));
  pi.on("turn_end", (_event, ctx) => runHook(ctx.cwd, "turn_end"));
}
```

Keep optional shell handlers next to the entrypoint under `scripts/`, one
event per handler. Scripts must be deterministic, idempotent, noninteractive,
time-bounded, and explicit on error (non-zero exit, not a silent failure).

## Constraints

Hidden tests, credentials, evaluator state, routing, budgets, and acceptance
state are forbidden inside a hook. Broken extension discovery or dispatch is
not fixable here — it belongs to `PI_SRC_EXTENSION_RUNTIME`.

## How to verify

`pi_resource_check.mjs` loads the staged workspace through Pi's real
extension loader and reports any load errors as diagnostics. Beyond that
automated check, validate extension loading explicitly and trigger a real
event (e.g. via a TRAIN trajectory) to confirm the handler actually ran, hit
its exit-status contract, and stayed within its time bound.
