#!/bin/sh
# Publish the session's change set as a patch artifact.
#
#   publish-change-set.sh record    remember the commit the session started from
#   publish-change-set.sh publish   write the change set relative to that commit
#
# The script never rewrites refs, never checks out, never discards work. It only
# reads the repository and writes a patch file, so running it twice is safe.
set -u

mode="${1:-publish}"

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
top=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$top" || exit 0
gitdir=$(git rev-parse --absolute-git-dir 2>/dev/null) || exit 0

state="$gitdir/session-base-commit"
head=$(git rev-parse --verify --quiet HEAD) || head=""
[ -n "$head" ] || exit 0

if [ "$mode" = "record" ]; then
	if [ ! -s "$state" ]; then
		printf '%s\n' "$head" >"$state" 2>/dev/null || true
	fi
	exit 0
fi

base=""
if [ -s "$state" ]; then
	base=$(cat "$state" 2>/dev/null)
fi
if [ -z "$base" ]; then
	for name in main master trunk develop; do
		ref=$(git rev-parse --verify --quiet "refs/heads/$name") || continue
		if git merge-base --is-ancestor "$ref" "$head" 2>/dev/null; then
			base="$ref"
			break
		fi
	done
fi
[ -n "$base" ] || exit 0
git cat-file -e "${base}^{commit}" 2>/dev/null || exit 0

work=$(mktemp 2>/dev/null) || exit 0
index=$(mktemp 2>/dev/null) || { rm -f "$work"; exit 0; }
rm -f "$index"

# Seed a throwaway index from the base commit and add the current worktree to
# it. The resulting diff covers committed, staged and unstaged work in one
# patch, without touching the real index, the worktree, or HEAD.
if GIT_INDEX_FILE="$index" git read-tree "$base" 2>/dev/null; then
	GIT_INDEX_FILE="$index" git add -A -- . \
		':(exclude).claude' \
		':(exclude).mcp.json' \
		':(exclude).rsibench' \
		':(exclude)CLAUDE.md' \
		':(exclude)scripts/.gitkeep' \
		':(exclude)model.patch' >/dev/null 2>&1
	GIT_INDEX_FILE="$index" git diff --cached --binary "$base" >"$work" 2>/dev/null
fi
rm -f "$index"

if [ ! -s "$work" ]; then
	git diff --binary "$base" "$head" >"$work" 2>/dev/null
fi

if [ ! -s "$work" ]; then
	rm -f "$work"
	echo "publish-change-set: nothing to publish relative to $base"
	exit 0
fi

size=$(wc -c <"$work" 2>/dev/null | tr -d ' ')
case "$size" in
'' | *[!0-9]*) size=0 ;;
esac
if [ "$size" -gt 4194304 ]; then
	echo "publish-change-set: change set is ${size} bytes; refusing to publish an oversized patch"
	rm -f "$work"
	exit 1
fi

written=0
for dest in "$top/model.patch" /logs/model.patch /logs/agent/model.patch /logs/artifacts/model.patch; do
	dir=$(dirname "$dest")
	[ -d "$dir" ] || continue
	if cp "$work" "$dest" 2>/dev/null; then
		echo "publish-change-set: wrote $dest (${size} bytes)"
		written=$((written + 1))
	fi
done
rm -f "$work"

if [ "$written" -eq 0 ]; then
	echo "publish-change-set: change set is non-empty but no destination was writable"
	exit 1
fi
exit 0
