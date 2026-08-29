#!/bin/sh
# Keep the work produced during a session visible in the repository's current
# state.
#
#   record   remember the commit the repository was sitting on when the session
#            started (idempotent; only written once per repository).
#   publish  if the session moved HEAD forward with new commits, point HEAD back
#            at the remembered starting commit *without touching a single file*,
#            so the whole change set shows up as pending changes of the
#            checked-out tree while the branch keeps its commits.
#
# Committing on a branch and stopping leaves the checked-out tree identical to
# its own HEAD, i.e. an empty change set. This script makes the same content
# also readable as a pending change relative to where the session began.

set -u

mode="${1:-publish}"

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
top=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$top" || exit 1
gitdir=$(git rev-parse --absolute-git-dir 2>/dev/null) || exit 1
state="$gitdir/claude-session-base-commit"

head=$(git rev-parse --verify --quiet HEAD || true)
[ -n "$head" ] || exit 0

if [ "$mode" = "record" ]; then
	if [ ! -s "$state" ]; then
		printf '%s\n' "$head" >"$state" || exit 1
	fi
	exit 0
fi

base=""
if [ -s "$state" ]; then
	base=$(cat "$state") || exit 1
fi
if [ -z "$base" ]; then
	# No recorded start point: fall back to a long-lived branch that HEAD was
	# grown from.
	for name in main master trunk develop; do
		ref=$(git rev-parse --verify --quiet "refs/heads/$name") || continue
		if [ "$ref" != "$head" ] && git merge-base --is-ancestor "$ref" "$head" 2>/dev/null; then
			base="$ref"
			break
		fi
	done
fi
[ -n "$base" ] || exit 0
git cat-file -e "${base}^{commit}" 2>/dev/null || exit 0

if ! git merge-base --is-ancestor "$base" "$head" 2>/dev/null; then
	base=$(git merge-base "$base" "$head" 2>/dev/null) || exit 0
	[ -n "$base" ] || exit 0
fi
# Nothing was committed after the session started: whatever the session
# produced is already pending in the checked-out tree, so leave it alone.
[ "$base" != "$head" ] || exit 0

# Move only the HEAD pointer. No file is written, no branch is moved or
# deleted, so the commits made during the session stay exactly where they are.
target=""
for name in main master trunk develop; do
	ref=$(git rev-parse --verify --quiet "refs/heads/$name") || continue
	if [ "$ref" = "$base" ]; then
		target="refs/heads/$name"
		break
	fi
done
if [ -n "$target" ]; then
	git symbolic-ref HEAD "$target" || exit 1
else
	git update-ref --no-deref HEAD "$base" || exit 1
fi

# Tracked edits that were never committed are staged too, so the pending change
# set is complete however it is read.
git add -u -- . >/dev/null 2>&1 || true

printf 'session work re-published as pending changes against %s\n' "$base"
exit 0
