#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

function emit(value, code) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
  process.exitCode = code;
}

async function main() {
  const workspace = path.resolve(process.argv[2] || "");
  const packageRoot = path.resolve(process.env.RSIBENCH_PI_PACKAGE_ROOT || "");
  if (!process.argv[2] || !process.env.RSIBENCH_PI_PACKAGE_ROOT) {
    throw new Error("usage: RSIBENCH_PI_PACKAGE_ROOT=<root> pi_resource_check.mjs <workspace>");
  }
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (String(packageJson.version) !== "0.82.1") {
    throw new Error(`official Pi version mismatch: ${packageJson.version}`);
  }
  const module = await import(pathToFileURL(path.join(packageRoot, "dist", "index.js")).href);
  const agentDir = fs.mkdtempSync(path.join(os.tmpdir(), "rsibench-pi-probe-"));
  const stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rsibench-pi-workspace-"));
  const stagedWorkspace = path.join(stageRoot, "workspace");
  try {
    fs.cpSync(workspace, stagedWorkspace, { recursive: true });
    fs.mkdirSync(path.join(stagedWorkspace, ".git"), { recursive: true });
    const settingsManager = module.SettingsManager.create(stagedWorkspace, agentDir, { projectTrusted: true });
    const loader = new module.DefaultResourceLoader({
      cwd: stagedWorkspace, agentDir, settingsManager, noContextFiles: true,
    });
    await loader.reload();
    const extensionResult = loader.getExtensions();
    const skillResult = loader.getSkills();
    const extensions = extensionResult.extensions.map((item) => path.relative(stagedWorkspace, item.path ?? item.resolvedPath)).sort();
    const tools = [...new Set(extensionResult.extensions.flatMap((item) => item.tools instanceof Map ? [...item.tools.keys()] : []))].sort();
    const skills = [...new Set(skillResult.skills.map((item) => String(item.name)))].sort();
    const diagnostics = [
      ...extensionResult.errors.map((item) => `error: failed to load ${item.path}: ${item.error}`),
      ...skillResult.diagnostics.map((item) => `${item.type || "diagnostic"}: ${item.message || item}`),
    ];
    const ok = extensionResult.errors.length === 0 && !skillResult.diagnostics.some((item) => item.type === "error" || item.type === "collision");
    emit({ ok, version: "0.82.1", extensions, tools, skills, diagnostics }, ok ? 0 : 2);
  } finally {
    fs.rmSync(agentDir, { recursive: true, force: true });
    fs.rmSync(stageRoot, { recursive: true, force: true });
  }
}

main().catch((error) => emit({ ok: false, version: "", extensions: [], tools: [], skills: [], diagnostics: [String(error.message || error)] }, 1));
