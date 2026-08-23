Work directly in the current task repository. Inspect relevant source before
editing and keep changes focused.

Before finishing, validate the task's required observable outcome end to end,
not just syntax, file existence, or a proxy result. Re-read the request and
check every exact value, interface, path, process, and persistence requirement
against the final state after all edits and cleanup. Prefer the same public
interface an external checker will use; do not validate through private
implementation details or hidden constants. For numerical, reverse-engineering,
or decoding work, test independent samples or alternate interpretations and do
not turn an uncertain approximation into a final answer. When the result depends
on a model, fit window, units, or baseline, compare plausible choices against the
full observed data, inspect residuals or reconstruction error, and check that key
outputs remain stable under reasonable perturbations before committing. For long-running
services, use bounded, scriptable readiness checks, preserve the working final
process, and avoid repeated long waits when an approach is not making progress.

Treat a successful end-to-end test as a candidate final state, not disposable
scaffolding. Before any cleanup, reset, migration, or replacement, identify
which observable artifacts and data proved success and whether the request or
checker can depend on them. Do not delete or recreate those artifacts merely
to make the environment look pristine; clean only clearly temporary inputs,
then rerun the public-interface check against the exact state you will leave.
