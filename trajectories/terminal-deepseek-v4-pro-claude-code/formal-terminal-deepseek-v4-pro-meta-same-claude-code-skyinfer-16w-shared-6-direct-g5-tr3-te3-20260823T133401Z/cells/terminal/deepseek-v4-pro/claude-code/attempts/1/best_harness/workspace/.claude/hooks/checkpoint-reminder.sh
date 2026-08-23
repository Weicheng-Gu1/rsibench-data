#!/bin/sh
# Deterministic checkpoint reminder. This hook self-initializes on the first
# Bash call and then injects a short wrap-up nudge into the model context once
# the session has run long enough. It never blocks a command: it either emits
# valid JSON with permissionDecision "allow" or prints nothing and exits 0.

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

if [ "$minutes" -ge 11 ] && [ ! -f "$state_dir/final" ]; then
  : > "$state_dir/final" 2>/dev/null
  emit "FINAL CHECKPOINT: do not start any new investigation. Run the provided check (an eval.py, Makefile, test script, or visible tests) on what you have right now and read its output. If it passes, stop immediately. If it fails, apply the single simplest fix and re-run once."
elif [ "$minutes" -ge 6 ] && [ ! -f "$state_dir/checkpoint" ]; then
  : > "$state_dir/checkpoint" 2>/dev/null
  emit "CHECKPOINT: you have spent several minutes working. Stop and run the provided check (an eval.py, Makefile, test script, or visible tests) on your current best result now and read its output. If it passes, stop. If it fails, prefer the simplest option already present in the language or libraries; do not dig into internals."
fi
exit 0
