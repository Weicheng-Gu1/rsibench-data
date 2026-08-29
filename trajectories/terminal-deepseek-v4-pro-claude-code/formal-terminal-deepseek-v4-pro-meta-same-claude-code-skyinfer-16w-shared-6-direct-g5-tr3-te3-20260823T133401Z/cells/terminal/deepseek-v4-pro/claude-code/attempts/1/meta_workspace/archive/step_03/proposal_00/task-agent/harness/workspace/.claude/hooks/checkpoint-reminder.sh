#!/bin/sh
# Deterministic checkpoint reminder. This hook self-initializes on the first
# Bash call and then injects short wrap-up nudges into the model context as
# the session runs long. Each nudge pushes the agent to persist its best
# result to the exact final path(s) named in the task instruction and to bound
# long-running commands, so a deliverable exists on disk before time runs out.
# It never blocks a command: it either emits valid JSON with permissionDecision
# "allow" or prints nothing and exits 0.

state_dir="${TMPDIR:-/tmp}/rsibench-checkpoint"
start_file="$state_dir/start"
mkdir -p "$state_dir" 2>/dev/null || exit 0

now=$(date +%s 2>/dev/null) || exit 0
if [ ! -f "$start_file" ]; then
  printf '%s' "$now" > "$start_file" 2>/dev/null
  exit 0
fi
start=$(cat "$start_file" 2>/dev/null) || exit 0
case "$start" in
  ''|*[!0-9]*) exit 0 ;;
esac

minutes=$(( (now - start) / 60 ))

emit() {
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","additionalContext":"$1"}}
EOF
}

if [ "$minutes" -ge 28 ] && [ ! -f "$state_dir/tier28" ]; then
  : > "$state_dir/tier28" 2>/dev/null
  emit "FINAL CHECKPOINT: stop now. The deliverable must already be written to the final required path(s) from the task instruction, not /tmp. Run the provided check once more only if it is quick; otherwise leave the on-disk result as-is and finish."
elif [ "$minutes" -ge 23 ] && [ ! -f "$state_dir/tier23" ]; then
  : > "$state_dir/tier23" 2>/dev/null
  emit "FINAL CHECKPOINT: do not start anything new. Confirm the deliverable is at the final required path(s) from the task instruction. A deliverable that exists on disk still counts; missing files do not. Verify and stop."
elif [ "$minutes" -ge 19 ] && [ ! -f "$state_dir/tier19" ]; then
  : > "$state_dir/tier19" 2>/dev/null
  emit "CHECKPOINT: finalize now. Re-run the provided check on the on-disk deliverable at its final required path(s). Any remaining long-running command must be bounded by a short timeout so it cannot consume the rest of the session."
elif [ "$minutes" -ge 15 ] && [ ! -f "$state_dir/tier15" ]; then
  : > "$state_dir/tier15" 2>/dev/null
  emit "CHECKPOINT: stop new exploration. Write your best result to the exact final path(s) the task instruction names, then run the provided check on it. Apply only the single simplest fix and re-run once."
elif [ "$minutes" -ge 11 ] && [ ! -f "$state_dir/tier11" ]; then
  : > "$state_dir/tier11" 2>/dev/null
  emit "CHECKPOINT: your best-effort deliverable must already exist at the final required path(s) from the task instruction. Run the provided check on it now; fix only the single simplest failure and re-run once."
elif [ "$minutes" -ge 8 ] && [ ! -f "$state_dir/tier8" ]; then
  : > "$state_dir/tier8" 2>/dev/null
  emit "CHECKPOINT: if nothing passes yet, persist the best working version to the final required path(s) now. Run long commands with a short timeout so a hung step cannot consume the session."
elif [ "$minutes" -ge 5 ] && [ ! -f "$state_dir/tier5" ]; then
  : > "$state_dir/tier5" 2>/dev/null
  emit "CHECKPOINT: stop exploring and write your current best result to the exact final path(s) the task instruction asks for (not /tmp), then run the provided check on it."
fi
exit 0
