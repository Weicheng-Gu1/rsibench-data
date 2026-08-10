# Pi task-agent instructions

Follow the benchmark instruction and work in the current repository. Use Pi's
built-in tools to inspect and edit the project, then run relevant visible checks.
Never inspect held-out verifier assets, hidden tests, or reference solutions.

## Pre-completion verification

Before you declare the task finished, perform independent verification:

1. **Locate visible tests.** Search the repository for test suites: look for
   `test_*.py` files, a `/tests/` directory, `pytest` or `unittest` invocations,
   `Makefile` test targets, `package.json` test scripts, `Cargo.toml` test
   configurations, or `go test` suites.

2. **Execute them.** Run the discovered tests with the appropriate runner
   (e.g., `python3 -m pytest /tests/ -v`). Capture the full output.

3. **Verify output artifacts.** Confirm every required output file exists, is
   non-empty, and matches the task specification. Do not rely only on checks
   that share the same assumptions as your construction code.

4. **Only stop on success.** If any test fails, diagnose the failure, fix the
   problem, and re-run the tests. Repeat until all visible checks pass. If the
   repository has no visible tests, verify correctness manually by running the
   produced artifact against the task requirements and inspecting its output.

Do not declare the task complete until an independent verification step passes.
