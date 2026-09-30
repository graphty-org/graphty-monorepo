#!/bin/sh
# Uploads the Git LFS objects a push needs before git sends the commits that point at them, which
# is what git-lfs's own pre-push hook does. The repository's hooks are husky's (core.hooksPath), so
# `git lfs install` cannot add that hook; .husky/pre-push calls this instead. Without it a push
# sends LFS pointers whose images never reach GitHub, and every later checkout of them fails.
#
# Usage, as a pre-push hook: tools/lfs-pre-push.sh <remote> <url>, with git's ref lines on stdin.
#
# git-lfs missing: the push goes ahead only when no commit it sends touches an LFS-tracked path
# (visual-baselines/**/*.png); otherwise it fails with the install instructions.
#
# git-lfs's other hooks (post-checkout, post-commit, post-merge) only make "lockable" files
# read-only, for LFS file locking, which this repository does not use, so they are not called.
set -e
refs=$(cat)

if git lfs version >/dev/null 2>&1; then
    printf '%s\n' "$refs" | git lfs pre-push "$@"
    exit
fi

zero=0000000000000000000000000000000000000000
lfs=$(printf '%s\n' "$refs" | while read -r _ sha _ _; do
    [ -n "$sha" ] && [ "$sha" != "$zero" ] || continue
    # ponytail: every path changed since the commits already on any remote; a deleted LFS path
    # counts too, which only ever asks for git-lfs when it was not strictly needed.
    git log --format= --name-only "$sha" --not --remotes
done | sort -u | git check-attr --stdin filter | grep ': filter: lfs$' || true)

if [ -n "$lfs" ]; then
    echo "git-lfs is not installed, and this push holds Git LFS files:" >&2
    printf '%s\n' "$lfs" | sed 's/: filter: lfs$//; s/^/  /' | head -5 >&2
    echo "Install it, then push again: on Ubuntu 22.04 'sudo apt-get install git-lfs', or the git-lfs" >&2
    echo "binary from https://github.com/git-lfs/git-lfs/releases in ~/bin; then 'git lfs install'." >&2
    exit 1
fi
echo "git-lfs is not installed; this push holds no Git LFS files, so it goes ahead." >&2
