import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M4 Action: local tools and MCP-backed tools.

interface ExecResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

async function safeExec(
  pi: ExtensionAPI,
  cmd: string,
  args: string[],
  signal?: AbortSignal,
): Promise<ExecResult> {
  try {
    const result = await pi.exec(cmd, args, { signal });
    return {
      code: (result as { code?: number | null }).code ?? null,
      stdout: (result as { stdout?: string }).stdout ?? "",
      stderr: (result as { stderr?: string }).stderr ?? "",
    };
  } catch {
    return { code: null, stdout: "", stderr: "" };
  }
}

export default function install(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "discover_and_run_tests",
    label: "Discover and run tests",
    description:
      "Search for pre-existing test suites in standard locations and optionally run them. " +
      "Use before declaring a task complete to find tests you may have missed. " +
      "Searches /tests/, /app/tests/, Makefile test targets, package.json test scripts, " +
      "and test_*.py / *_test.py patterns. Returns structured pass/fail results.",
    parameters: {
      type: "object",
      properties: {
        run: {
          type: "boolean",
          description: "Run discovered tests (default: true). Set false to only list.",
          default: true,
        },
      },
    },
    async execute(_id, params, signal) {
      const lines: string[] = [];
      let foundAny = false;
      let testDirFound = false;

      // 1. Check /tests/ — the most common verifier location
      const testsTop = await safeExec(
        pi,
        "find",
        ["/tests", "-maxdepth", "2", "-name", "*.py", "-type", "f"],
        signal,
      );

      if (testsTop.code === 0 && testsTop.stdout.trim()) {
        foundAny = true;
        testDirFound = true;
        lines.push("=== /tests/ ===");
        lines.push(testsTop.stdout.trim());
      }

      // 2. Check /app/tests/
      const appTests = await safeExec(
        pi,
        "find",
        ["/app/tests", "-maxdepth", "2", "-name", "*.py", "-type", "f"],
        signal,
      );

      if (appTests.code === 0 && appTests.stdout.trim()) {
        foundAny = true;
        lines.push("=== /app/tests/ ===");
        lines.push(appTests.stdout.trim());
      }

      // 3. Check for Makefile test target
      const makefile = await safeExec(
        pi,
        "bash",
        ["-c", "grep -lE '^test:' /app/Makefile /app/makefile 2>/dev/null || true"],
        signal,
      );

      if (makefile.stdout.trim()) {
        foundAny = true;
        lines.push("=== Makefile test target ===");
        lines.push(makefile.stdout.trim());
      }

      // 4. Check for package.json test script
      const pkg = await safeExec(
        pi,
        "bash",
        ["-c", "grep -l '\"test\"' /app/package.json 2>/dev/null || true"],
        signal,
      );

      if (pkg.stdout.trim()) {
        foundAny = true;
        lines.push("=== package.json (has test script) ===");
        lines.push(pkg.stdout.trim());
      }

      if (!foundAny) {
        lines.push(
          "No pre-existing test suites found in /tests/, /app/tests/, Makefile, or package.json.",
        );
      }

      const shouldRun = params.run !== false;
      let testOutput = "";
      let exitCode: number | null = null;

      if (shouldRun && foundAny && testDirFound) {
        const run = await safeExec(
          pi,
          "python3",
          ["-m", "pytest", "/tests/", "-v", "--tb=short"],
          signal,
        );

        testOutput =
          `\n\n=== Test execution: python3 -m pytest /tests/ -v ===\n` +
          `Exit code: ${run.code}\n` +
          `${run.stdout || ""}${run.stderr || ""}`;
        exitCode = run.code;
      } else if (shouldRun && foundAny && !testDirFound) {
        // Try make test as fallback
        const mt = await safeExec(pi, "make", ["-C", "/app", "test"], signal);

        if (mt.code !== null && mt.code !== 127) {
          testOutput =
            `\n\n=== Test execution: make -C /app test ===\n` +
            `Exit code: ${mt.code}\n` +
            `${mt.stdout || ""}${mt.stderr || ""}`;
          exitCode = mt.code;
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") + testOutput }],
        details: { found: foundAny, exitCode },
      };
    },
  });
}
