#!/usr/bin/env bash
#
# List, and on confirmation remove, worktrees whose work is finished.
#
# A worktree is a candidate when its branch is merged into origin/master, or when its upstream
# branch has been deleted on origin ("gone"). Master merges pull requests with merge commits, so
# a merged branch's tip is an ancestor of origin/master that is NOT on master's first-parent
# line; a new branch with no commits of its own sits on that line and is therefore not "merged".
#
# For each candidate it prints the branch, why it qualifies, its size, its uncommitted changes and
# every process whose working directory is inside it (a dev server left running, for example).
# It then asks before removing each one with `git worktree remove`, without --force: git refuses
# a worktree with uncommitted or untracked changes, and this script skips one with a live process.
# The branch itself is kept. It never stashes, checks out or resets anything, and never touches
# the main checkout or the worktree it runs from.
#
# Usage:
#   ./tools/worktree-prune.sh [--dry-run]
#     --dry-run  list the candidates and remove nothing

set -euo pipefail

DRY=0
case "${1:-}" in
    "") ;;
    --dry-run | -n) DRY=1 ;;
    *) echo "usage: worktree-prune.sh [--dry-run]" >&2; exit 2 ;;
esac

MAIN="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
HERE="$(git rev-parse --show-toplevel)"
git -C "$MAIN" fetch --quiet --prune origin

FIRST_PARENT="$(mktemp)"
trap 'rm -f "$FIRST_PARENT"' EXIT
git -C "$MAIN" rev-list --first-parent origin/master >"$FIRST_PARENT"

# processes whose cwd is the directory or below it
procs_in() {
    local dir="$1" p cwd
    for p in /proc/[0-9]*; do
        cwd="$(readlink "$p/cwd" 2>/dev/null)" || continue
        case "$cwd/" in
            "$dir"/*) echo "        pid ${p#/proc/}: $(tr '\0\n' '  ' <"$p/cmdline" 2>/dev/null | cut -c1-100)" ;;
        esac
    done
}

consider() {
    local path="$1" branch="$2" reason="" tip dirty live
    [ "$path" = "$MAIN" ] || [ "$path" = "$HERE" ] && return 0
    [ -n "$branch" ] || return 0 # detached HEAD: nothing to judge it by
    tip="$(git -C "$MAIN" rev-parse "refs/heads/$branch")"
    if [ "$(git -C "$MAIN" for-each-ref --format='%(upstream:track)' "refs/heads/$branch")" = "[gone]" ]; then
        reason="upstream deleted"
    elif git -C "$MAIN" merge-base --is-ancestor "$tip" origin/master && ! grep -qx "$tip" "$FIRST_PARENT"; then
        reason="merged into origin/master"
    fi
    [ -n "$reason" ] || return 0

    dirty="$(git -C "$path" status --porcelain 2>/dev/null | wc -l)"
    live="$(procs_in "$path")"
    echo "$branch ($reason)"
    echo "    path:   $path"
    echo "    size:   $(du -sh "$path" 2>/dev/null | cut -f1)"
    echo "    dirty:  $dirty uncommitted or untracked file(s)"
    if [ -n "$live" ]; then
        echo "    processes:"
        echo "$live"
    fi

    [ "$DRY" = 1 ] && return 0
    if [ -n "$live" ]; then
        echo "    skipped: stop the processes above first"
        return 0
    fi
    local answer=""
    read -r -p "    remove this worktree? [y/N] " answer </dev/tty || answer=""
    if [ "$answer" = y ] || [ "$answer" = Y ]; then
        git -C "$MAIN" worktree remove "$path" && echo "    removed" || echo "    not removed (see git's message)"
    fi
}

path="" branch=""
while IFS= read -r line; do
    case "$line" in
        "worktree "*) path="${line#worktree }"; branch="" ;;
        "branch refs/heads/"*) branch="${line#branch refs/heads/}" ;;
        "") [ -n "$path" ] && consider "$path" "$branch"; path="" ;;
    esac
done < <(git -C "$MAIN" worktree list --porcelain; echo)
