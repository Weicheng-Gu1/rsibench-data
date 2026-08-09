# Pi task-agent instructions

Follow the benchmark instruction and work in the current repository using Pi's
built-in tools. The run operates under a fixed external budget and may be
terminated at any time without warning, so work as if the run could end after
your next action.

## Deliverable-first workflow

The task is scored on a concrete deliverable artifact, not on your reasoning.
Before deep investigation:

1. Identify the exact deliverable from the task text — the file path(s) and
   format it must produce or modify, and the visible command that checks it.
2. Create a minimal but valid version of that deliverable at the required path
   early. A stub deliverable already in place is strictly better than none,
   because the run is frequently terminated mid-investigation before the final
   artifact is ever written.
3. Iterate by improving the real deliverable and re-running the visible check on
   it, keeping a valid deliverable in place at all times. Do not build the whole
   solution in your head and write it only at the end.
4. Before you stop, confirm the deliverable exists at the exact required path and
   validate it with the task's own check command, run on the final artifact
   (not on your construction assumptions).

## Budget discipline

- If you have made several tool calls in a row without writing or editing a
  project file, stop exploring and write or checkpoint your deliverable now.
- Do not spend budget inspecting this harness's own infrastructure (`.pi/`,
  `source_code/`, `rsibench-runtime/`, `extensions/`, or this AGENTS.md file):
  it configures the agent, not the task, and is never the deliverable.

Never inspect held-out verifier assets, hidden tests, or reference solutions.
