#!/bin/sh
# Stop hook: make the independent conformance review non-optional, once.
#
# The review subagent is a capability the session can already use, but it is
# discretionary, so a session that believes it is done simply stops. This hook
# turns "believes it is done" into the documented trigger for exactly one
# review pass.
#
# It blocks at most once per session, only when the session actually produced a
# change set, and only when no review pass is present in the transcript. Every
# uncertain condition (re-entry, unreadable input, nothing changed, review
# already done) exits 0, so the session is never held up and publishing is
# never disturbed.
set -u

AGENT_NAME=rsibench-reviewer

payload=$(cat 2>/dev/null) || exit 0
[ -n "$payload" ] || exit 0

field() {
	printf '%s' "$payload" |
		tr ',{}' '\n\n\n' |
		sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" |
		head -n 1
}

# Re-entrant Stop (a Stop hook already blocked this turn): let the session stop.
case "$payload" in
*'"stop_hook_active"'*'true'*) exit 0 ;;
esac

session=$(field session_id)
transcript=$(field transcript_path)

# One shot per session: once this hook has blocked, it never blocks again. The
# marker is claimed only at the moment of blocking, so an early Stop with
# nothing to review does not spend it.
marker=""
if [ -n "$session" ]; then
	marker="${TMPDIR:-/tmp}/.rsibench-review-$(printf '%s' "$session" | tr -c 'A-Za-z0-9._-' '_')"
	[ -e "$marker" ] && exit 0
fi

# Already reviewed? The subagent call is recorded in the session transcript.
if [ -n "$transcript" ] && [ -r "$transcript" ]; then
	if grep -Eq "\"subagent_type\"[[:space:]]*:[[:space:]]*\"$AGENT_NAME\"" "$transcript" 2>/dev/null; then
		exit 0
	fi
fi

# Nothing to review if the session provably changed nothing.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	top=$(git rev-parse --show-toplevel 2>/dev/null) && cd "$top" 2>/dev/null
	gitdir=$(git rev-parse --absolute-git-dir 2>/dev/null) || gitdir=""
	base=""
	[ -n "$gitdir" ] && [ -s "$gitdir/session-base-commit" ] &&
		base=$(cat "$gitdir/session-base-commit" 2>/dev/null)
	if [ -n "$base" ] && git cat-file -e "${base}^{commit}" 2>/dev/null; then
		if git diff --quiet "$base" -- . 2>/dev/null &&
			[ -z "$(git status --porcelain --untracked-files=normal -- . 2>/dev/null)" ]; then
			exit 0
		fi
	fi
fi

[ -n "$marker" ] && { : >"$marker" 2>/dev/null || true; }

cat >&2 <<MSG
Stop blocked: this session changed code but has not had its independent
conformance review. The visible tests passing does not establish that the
change satisfies every clause of the request, and it does not establish that
pre-existing behavior survived.

Do exactly this, then stop:

1. Launch the $AGENT_NAME subagent once, via the Agent tool with
   subagent_type "$AGENT_NAME". Give it the task statement verbatim plus the
   list of files you changed. It is read-only and returns numbered findings.
2. Act only on findings you can confirm by reading the code: a requirement
   clause that is unimplemented or only partially implemented, or existing
   behavior the change weakened. Ignore style and coverage opinions. If a
   finding is wrong, say why and move on.
3. Re-run the visible tests after any fix.
4. Re-run .claude/hooks/publish-change-set.sh so the published patch matches
   the final tree.

This check runs once per session; it will not block you again.
MSG
exit 2
