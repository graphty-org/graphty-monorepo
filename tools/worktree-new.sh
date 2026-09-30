#!/usr/bin/env bash
#
# Create a ready-to-use git worktree under .worktrees/.
#
# A bare `git worktree add` gives a checkout with no .env and no node_modules: tools that read
# tokens from the checkout's .env (tools/chromatic.sh, tools/chromatic-api.sh) fail, and the
# commit-msg hook (`pnpm exec commitlint`) cannot run. This script adds the worktree, symlinks
# the main checkout's .env into it (a link, so a token rotated in one place is rotated
# everywhere) and runs `pnpm install --frozen-lockfile` there.
#
# Usage:
#   ./tools/worktree-new.sh <branch> [base]
#     <branch>  an existing local or origin branch is checked out; a new name is created from base
#     [base]    the start point of a new branch (default origin/master, fetched first)
#
# The worktree lands in .worktrees/<branch with / replaced by ->. Remove finished ones with
# tools/worktree-prune.sh.

set -euo pipefail

die() { echo "tools/worktree-new.sh: $*" >&2; exit 1; }

BRANCH="${1:-}"
BASE="${2:-origin/master}"
[ -n "$BRANCH" ] || die "usage: worktree-new.sh <branch> [base]"

# The main checkout, even when this runs from inside another worktree.
MAIN="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
DIR="$MAIN/.worktrees/${BRANCH//\//-}"
[ -e "$DIR" ] && die "$DIR already exists"

git -C "$MAIN" fetch --quiet origin
if git -C "$MAIN" show-ref --verify --quiet "refs/heads/$BRANCH" \
    || git -C "$MAIN" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    # an origin-only branch gets a local tracking branch of the same name
    git -C "$MAIN" worktree add "$DIR" "$BRANCH"
else
    # --no-track: the new branch's upstream is set by its first `git push -u`, not to the base
    git -C "$MAIN" worktree add --no-track -b "$BRANCH" "$DIR" "$BASE"
fi

if [ -f "$MAIN/.env" ]; then
    ln -s "$MAIN/.env" "$DIR/.env"
else
    echo "note: $MAIN/.env does not exist, so there is no .env to link (see .env.example)" >&2
fi

(cd "$DIR" && pnpm install --frozen-lockfile)

echo "ready: $DIR"
