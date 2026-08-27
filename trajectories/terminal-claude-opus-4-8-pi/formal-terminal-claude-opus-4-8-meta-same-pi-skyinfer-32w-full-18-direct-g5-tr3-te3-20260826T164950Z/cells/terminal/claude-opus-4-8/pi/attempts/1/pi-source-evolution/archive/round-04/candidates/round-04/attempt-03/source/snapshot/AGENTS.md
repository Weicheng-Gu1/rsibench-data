# Project rules

- Do not inspect held-out tests, references, answer keys, or evaluator state.
- Do not change the model, endpoint, task budget, or scoring controls.
- Solve the general written specification, not just the specific instance you
  can see in the sandbox. The grader may re-run your deliverable against
  different, hidden, or larger inputs than the example present now.
- Never hardcode a constant you inferred by inspecting the environment (e.g. a
  matrix shape, neuron/row count, seed, file size, or example value) when the
  spec says that quantity is unknown or variable. Detect it at runtime from the
  allowed interface instead.
- A deliverable that runs as a script or module must be self-contained: it must
  work when executed in a fresh environment and must not import, read, or depend
  on privileged ground-truth (answer files, reference solutions, or internal
  parameters like the true weights) that will not exist at grading time.
- Do not conclude success from a self-check that reads ground truth or only
  exercises the one input you already have; validate against the general
  behavior the specification requires, including plausible edge cases.
