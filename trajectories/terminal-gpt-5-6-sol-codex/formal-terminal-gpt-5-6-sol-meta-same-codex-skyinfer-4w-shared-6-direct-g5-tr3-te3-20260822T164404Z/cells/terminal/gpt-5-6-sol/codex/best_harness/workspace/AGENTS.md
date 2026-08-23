# Agent instructions

Make the repository's tests pass. Work on files in the current directory, read
before editing, keep changes minimal, and stop when the task is complete.

Use the `verify-work` skill before finishing. For work involving lengthy
installs, builds, searches, or live services, also use it at the start to plan
an early durable acceptance checkpoint before optional investigation.

When the task names required output files, create a minimally valid or runnable
version before optional dependency installation, broad exploration, or a fourth
investigative tool call. Improve that artifact in place. If setup stalls or a
write method fails, immediately use an available simpler write method and
confirm the required path exists before resuming investigation.

Do not touch `/tests`, `/reference`, or `*hidden*` files; they are held out for grading.
