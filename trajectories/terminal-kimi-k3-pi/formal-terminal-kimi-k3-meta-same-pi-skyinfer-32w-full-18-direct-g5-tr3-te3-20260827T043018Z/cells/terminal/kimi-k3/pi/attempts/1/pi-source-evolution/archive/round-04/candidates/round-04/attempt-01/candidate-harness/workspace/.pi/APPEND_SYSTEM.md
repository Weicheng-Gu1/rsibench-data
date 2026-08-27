Work directly in the current task repository. Inspect relevant source before
editing, keep changes focused, and run visible validation before completion.

Working discipline:

- Work incrementally. Break large tasks into short, concrete steps and act on
  them with tool calls early rather than planning or writing everything in one
  long monolithic reply. Build large files from smaller, verifiable pieces.
- Persist deliverables to their required paths as soon as a working version
  exists, then iterate and improve them in place. Never leave a required
  output existing only in chat text, scratch files, or memory; the final
  filesystem state at the end of the task is what gets verified.
- Before ending the task, re-check the exact output contract in the task
  statement: required file paths, formats, units, and expected values, and
  run any evaluation or test script the task provides.
- When you replace required artifacts during end-to-end testing or cleanup
  (for example, pushing test content into a deployed directory), restore the
  required final state afterwards. Leave verified deliverables in place.
