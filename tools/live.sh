#!/usr/bin/env bash
#
# Put a branch or commit into the running copy of a tool on this machine (githerd, the visual-review
# server, the pre-push gate, ...): merge it into the tool's live worktree, and restart the tool's
# servherd servers. The pull request is the record; this is how the change takes effect today
# instead of after the merge queue (CLAUDE.md, "Where a change takes effect").
#
# Usage: tools/live.sh <tool> <branch-or-commit>
#        tools/live.sh --list
#   <tool>              a key of tools/live-tools.json: { "worktree", "servers", "test" }
#   <branch-or-commit>  origin/<branch> when origin has that branch (fetched first), else any commit
#
# Steps, each stopping the run when it fails, with the live copy unchanged:
#  1. The merge and the tests run in a scratch worktree at the live copy's commit, so the live copy
#     never holds a merge that conflicts or fails its tests. Merge, never rebase; the merge commit is
#     signed like any commit here and checked by .husky/commit-msg (the only hook it runs).
#  2. The tool's "test" command, in the scratch worktree.
#  3. The live copy fast-forwards to the tested merge; `pnpm install --frozen-lockfile` when the
#     lockfile changed; then each server restarts (`servherd restart <name>` when a servherd CLI is
#     on PATH, else the servherd_restart call to make is printed).
# It never pushes: pushing the branch and its pull request stay with the caller.
#
# Exit: 0 done (or already live), 1 refused or tests failed, 2 merge conflict.

set -euo pipefail

say() { echo "live.sh: $*"; }
die() {
    echo "live.sh: $*" >&2
    exit 1
}

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$HERE/live-tools.json"
MAIN="$(dirname "$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir)")"

if [ "${1:-}" = --list ]; then
    node -e 'for (const [k, v] of Object.entries(require(process.argv[1])))
        console.log(`${k}\t${v.worktree}\t${(v.servers ?? []).join(",") || "-"}`)' "$REGISTRY"
    exit 0
fi
[ $# -eq 2 ] || die "usage: tools/live.sh <tool> <branch-or-commit>   (tools/live.sh --list names the tools)"
TOOL="$1"
ARG="$2"

# The tool's entry, one field per line: worktree, test, then the servers.
ENTRY="$(node -e '
    const [file, tool] = process.argv.slice(1);
    const t = require(file)[tool];
    if (!t || typeof t.worktree !== "string" || typeof t.test !== "string" || !Array.isArray(t.servers ?? [])) {
        console.error(`no valid entry "${tool}" in ${file} (it needs "worktree" and "test", and "servers" a list)`);
        process.exit(1);
    }
    console.log([t.worktree, t.test, ...(t.servers ?? [])].join("\n"));
' "$REGISTRY" "$TOOL")" || exit 1
mapfile -t FIELDS <<<"$ENTRY"
WT="$MAIN/${FIELDS[0]}"
TEST="${FIELDS[1]}"
SERVERS=("${FIELDS[@]:2}")

[ -d "$WT" ] || die "$WT does not exist; create it with tools/worktree-new.sh, then run this again"
[ -z "$(git -C "$WT" status --porcelain --untracked-files=no)" ] ||
    die "$WT has uncommitted changes; commit or move them first (nothing was changed)"

if git -C "$MAIN" remote get-url origin >/dev/null 2>&1; then
    git -C "$MAIN" fetch --quiet origin
fi
if git -C "$MAIN" show-ref --verify --quiet "refs/remotes/origin/$ARG"; then
    REF="origin/$ARG"
    LABEL="remote-tracking branch 'origin/$ARG'"
else
    REF="$(git -C "$MAIN" rev-parse --verify --quiet "$ARG^{commit}")" || die "$ARG is neither an origin branch nor a commit"
    LABEL="commit '${REF:0:12}'"
fi
OLD="$(git -C "$WT" rev-parse HEAD)"
LIVE_BRANCH="$(git -C "$WT" symbolic-ref --short -q HEAD || echo "${OLD:0:12}")"

if git -C "$WT" merge-base --is-ancestor "$REF" HEAD; then
    say "$TOOL already has $ARG ($WT is at ${OLD:0:12}); nothing to do"
    exit 0
fi

# 1. Merge in a scratch worktree at the live commit.
SCRATCH="$MAIN/tmp/live/$TOOL-$$"
mkdir -p "$MAIN/tmp/live"
HOOKS="$(mktemp -d "$MAIN/tmp/live/hooks.XXXXXX")"
cleanup() {
    git -C "$MAIN" worktree remove --force "$SCRATCH" >/dev/null 2>&1 || rm -rf "$SCRATCH"
    git -C "$MAIN" worktree prune >/dev/null 2>&1 || true
    rm -rf "$HOOKS"
}
trap cleanup EXIT
mkdir -p "$(dirname "$SCRATCH")"
git -C "$MAIN" worktree add --quiet --detach "$SCRATCH" "$OLD"
[ ! -f "$WT/.env" ] || ln -s "$(readlink -f "$WT/.env")" "$SCRATCH/.env"
pnpm_install() { [ ! -f "$1/package.json" ] || (cd "$1" && pnpm install --frozen-lockfile --prefer-offline >/dev/null); }
say "installing dependencies in the scratch copy $SCRATCH"
pnpm_install "$SCRATCH"
[ ! -f "$WT/.husky/commit-msg" ] || cp "$WT/.husky/commit-msg" "$HOOKS/"
say "merging $ARG into $TOOL (${OLD:0:12}, $LIVE_BRANCH)"
if ! git -C "$SCRATCH" -c core.hooksPath="$HOOKS" merge --quiet --no-edit -m "Merge $LABEL into $LIVE_BRANCH" "$REF"; then
    if git -C "$SCRATCH" rev-parse --verify --quiet MERGE_HEAD >/dev/null; then
        echo "live.sh: $ARG conflicts with $TOOL's live copy in:" >&2
        git -C "$SCRATCH" diff --name-only --diff-filter=U | sed 's/^/  /' >&2
        echo "Nothing changed: $WT is still at ${OLD:0:12} and no server was restarted." >&2
        echo "Merge ${LIVE_BRANCH} (or origin/master) into your branch, resolve it there, push, and run" >&2
        echo "tools/live.sh $TOOL $ARG again." >&2
        exit 2
    fi
    die "the merge failed (above); nothing changed in $WT"
fi
NEW="$(git -C "$SCRATCH" rev-parse HEAD)"
LOCK_CHANGED=0
git -C "$MAIN" diff --quiet "$OLD" "$NEW" -- pnpm-lock.yaml || LOCK_CHANGED=1
[ "$LOCK_CHANGED" = 0 ] || pnpm_install "$SCRATCH"

# 2. The tool's tests, on the merge.
say "testing: $TEST"
if ! (cd "$SCRATCH" && bash -c "$TEST"); then
    echo "live.sh: $TOOL's tests failed on the merge of $ARG (above)." >&2
    echo "Nothing changed: $WT is still at ${OLD:0:12} and no server was restarted." >&2
    exit 1
fi

# 3. Go live.
git -C "$WT" merge --quiet --ff-only "$NEW" ||
    die "$WT moved while the tests ran; run tools/live.sh $TOOL $ARG again"
say "$WT is now at ${NEW:0:12}"
if [ "$LOCK_CHANGED" = 1 ]; then
    say "the lockfile changed: pnpm install in $WT"
    pnpm_install "$WT"
fi
for s in "${SERVERS[@]}"; do
    [ -n "$s" ] || continue
    if command -v servherd >/dev/null 2>&1; then
        say "restarting servherd server $s"
        servherd restart "$s"
    else
        say "restart it now (no servherd CLI here): servherd_restart({ name: \"$s\" })"
    fi
done
say "done: $ARG is live in $TOOL; push the branch and open its pull request as the record"
