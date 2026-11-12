#!/bin/bash
# A snapshot of the gate's live copy (.worktrees/gate-live) at its HEAD, so that one push -- or one landing:
# its check and its push -- runs one version of the gate's scripts and rules from start to end, however
# often `tools/live.sh gate` moves the live copy meanwhile. 2026-10-23: the Figma lock went live while a
# land check of #3284 ran; the landing's push then ran the source checks under the new rule and threw
# away a passing 112-minute check. Within one gate, a node script started an hour in read the new
# version while the shell scripts that started it ran the old one.
#
#   tools/gate-snapshot.sh <live copy>           prints the snapshot's directory
#   tools/gate-snapshot.sh --hold <live copy>    prints it, then holds it until its stdin closes
#                                                (tools/land.mjs keeps it for the whole landing)
#
# Without --hold the caller holds the machine-wide snapshot lock (<main>/tmp/gate-snapshot.lock, flock)
# and sets GATE_SNAPSHOT_LOCKED=1, then takes a shared flock on the snapshot's .in-use before letting the
# lock go (tools/push-queue.sh), so no snapshot is removed between being named and being held.
#
# A snapshot is a sparse, detached worktree <main checkout>/.worktrees/gate-snapshot-<sha> of that commit:
# tools/, .husky/ (with the live copy's generated .husky/_), the root files, and every directory a tool
# imports from ("../<dir>/..."); node_modules is the live copy's. It is made once per commit and locked
# (git worktree lock), so tools/worktree-cleanup.mjs leaves it alone; .gate-snapshot marks it complete.
# Making a new snapshot removes every older one that nobody holds (an exclusive flock on its .in-use
# that succeeds at once). Uncommitted changes in the live copy are not in it: live.sh commits its merges.
set -euo pipefail

hold=0
if [ "${1:-}" = --hold ]; then
    hold=1
    shift
fi
[ -n "${1:-}" ] || { echo "usage: tools/gate-snapshot.sh [--hold] <live copy>" >&2; exit 2; }
live=$(cd "$1" && pwd)
main=$(dirname "$(git -C "$live" rev-parse --path-format=absolute --git-common-dir)")
sha=$(git -C "$live" rev-parse HEAD)
snap="$main/.worktrees/gate-snapshot-${sha:0:12}"

if [ -z "${GATE_SNAPSHOT_LOCKED:-}" ]; then
    mkdir -p "$main/tmp"
    exec 8>"$main/tmp/gate-snapshot.lock"
    flock 8
fi

if [ ! -f "$snap/.gate-snapshot" ]; then
    git -C "$live" worktree unlock "$snap" 2>/dev/null || true
    git -C "$live" worktree remove --force "$snap" 2>/dev/null || rm -rf "$snap"
    git -C "$live" worktree prune
    # The directories the tools import from outside tools/ (tools/check-figma-lock.mjs reads a
    # compact-mantine test helper): only top-level tools, only real imports.
    mapfile -t imports < <(git -C "$live" grep -h -o -E '(from |import\()"\.\./[A-Za-z0-9_./-]+/' "$sha" -- \
        ':(glob)tools/*.mjs' ':(exclude,glob)tools/*.test.mjs' | sed -E 's#^[^"]*"\.\./##; s#/$##' | sort -u)
    git -C "$live" -c core.hooksPath=/dev/null worktree add -q --no-checkout --detach "$snap" "$sha" >&2
    git -C "$snap" sparse-checkout set --cone tools .husky "${imports[@]}" >&2
    GIT_LFS_SKIP_SMUDGE=1 git -C "$snap" -c core.hooksPath=/dev/null checkout -q --detach "$sha" >&2
    [ -d "$live/.husky/_" ] && cp -a "$live/.husky/_" "$snap/.husky/"
    [ -e "$live/node_modules" ] && ln -s "$live/node_modules" "$snap/node_modules"
    git -C "$live" worktree lock --reason "gate snapshot (tools/gate-snapshot.sh)" "$snap"
    : >"$snap/.in-use"
    echo "$sha" >"$snap/.gate-snapshot"
    for old in "$main"/.worktrees/gate-snapshot-*; do
        [ "$old" = "$snap" ] || [ ! -f "$old/.in-use" ] && continue
        flock -n -x "$old/.in-use" true || continue
        git -C "$live" worktree unlock "$old" 2>/dev/null || true
        git -C "$live" worktree remove --force "$old" 2>/dev/null || rm -rf "$old"
    done
    git -C "$live" worktree prune
fi

if [ "$hold" = 1 ]; then
    exec 9<"$snap/.in-use"
    flock -s 9
    exec 8>&-
    echo "$snap"
    exec 1>&-
    cat >/dev/null
else
    echo "$snap"
fi
