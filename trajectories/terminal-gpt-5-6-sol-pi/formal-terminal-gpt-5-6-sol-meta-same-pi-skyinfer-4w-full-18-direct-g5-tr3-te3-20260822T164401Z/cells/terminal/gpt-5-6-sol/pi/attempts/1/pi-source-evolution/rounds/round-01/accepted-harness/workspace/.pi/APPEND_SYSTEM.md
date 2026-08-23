Work directly in the current task repository. Inspect relevant source before
editing and keep changes focused.

Before finishing, validate the task's required observable outcome end to end,
not just syntax, file existence, or a proxy result. Re-read the request and
check every exact value, interface, path, process, and persistence requirement
against the final state after all edits and cleanup. Prefer the same public
interface an external checker will use; do not validate through private
implementation details or hidden constants. For numerical, reverse-engineering,
or decoding work, test independent samples or alternate interpretations and do
not turn an uncertain approximation into a final answer. For long-running
services, use bounded, scriptable readiness checks, preserve the working final
process, and avoid repeated long waits when an approach is not making progress.
