#!/usr/bin/env bash
#
# Create a ready-to-use git worktree under .worktrees/, for a branch that belongs to an issue and is on
# GitHub from its first minute (the owner's rules, 2026-10-21: every branch belongs to an issue that
# records its owner; every branch is pushed).
#
# A bare `git worktree add` gives a checkout with no .env and no node_modules: tools that read
# tokens from the checkout's .env (tools/sonar-gate.mjs) fail, and the
# commit-msg hook (`pnpm exec commitlint`) cannot run. This script adds the worktree, symlinks
# the main checkout's .env into it (a link, so a token rotated in one place is rotated
# everywhere) and runs `pnpm install --frozen-lockfile` there.
#
# It also records the branch's issue (`git config branch.<branch>.issue`), pushes a new branch to origin
# with its upstream set (--no-verify: no gate for an empty branch), labels the issue `in-progress` and
# writes the branch's progress note on it (tools/branch-note.mjs): branch, worktree, owning session,
# latest commit, and what is done, left and next.
#
# The design/** images (the design studio's walk screenshots and the mockups, about 10 GB of Git LFS
# PNGs) are checked out as small LFS pointer files, not images: nothing an ordinary worktree builds,
# tests or checks reads them, and every worktree would otherwise write its own full copy. Every other
# LFS file (visual-baselines/, visual-fonts/, the graph-io fidelity references) is checked out in full.
# To get the design images later, in the worktree: git lfs pull --include "design/**"
# A later merge or pull that brings in a changed design/** image checks that one image out in full.
#
# Usage:
#   ./tools/worktree-new.sh <branch> [base] [name] [--issue N | --new-issue "<title>"] [--owner O]
#     <branch>  an existing local or origin branch is checked out; a new name is created from base
#     [base]    the start point of a new branch (default origin/master; fetched first)
#     [name]    the worktree's directory name (default: the branch, with / replaced by -)
#     the issue, one of: a number of three or more digits in <branch> (fix/1234-scroll), --issue N, or
#               --new-issue "<title>", which opens one labelled with a type (from the branch's prefix:
#               fix/ bug, feat/ enhancement, docs/ documentation, else infrastructure, or --type),
#               --priority (default medium) and --effort (default medium)
#     --owner   who owns the work, for the note (default: this Claude Code session)
#     --full-images  check out the design/** images in full too (the design studio's worktree needs them)
#
# The worktree lands in .worktrees/<name>. Remove finished ones with tools/worktree-prune.sh.

set -euo pipefail

die() { echo "tools/worktree-new.sh: $*" >&2; exit 1; }
# Three tries: DNS for github.com fails now and then.
retry() { "$@" || { sleep 2; "$@"; } || { sleep 5; "$@"; }; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Every run executes one copy of this script, the live copy in <main checkout>/.worktrees/land-live (put a
# new version there with `tools/live.sh land <branch>`), whichever checkout's copy was called: it runs the live copy with the same arguments and directory. Without a live copy it
# runs itself and says so. LAND_LIVE names the live worktree instead (tests). A handed-off run carries
# WORKTREE_NEW_LIVE_COPY and never hands off again, and drops the mark so nothing it starts inherits it.
if [ -z "${WORKTREE_NEW_LIVE_COPY:-}" ]; then
    LIVE_ROOT="${LAND_LIVE:-$(dirname "$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || echo .)")/.worktrees/land-live}"
    LIVE="$LIVE_ROOT/tools/worktree-new.sh"
    if [ ! -f "$LIVE" ]; then
        echo "tools/worktree-new.sh: no live copy at $LIVE; running $HERE/worktree-new.sh instead" >&2
    elif [ "$(realpath "$LIVE")" != "$(realpath "$HERE/worktree-new.sh")" ]; then
        WORKTREE_NEW_LIVE_COPY="$LIVE" exec "$LIVE" "$@"
    fi
fi
unset WORKTREE_NEW_LIVE_COPY
POS=()
ISSUE="" NEW_ISSUE="" OWNER="" TYPE="" PRIORITY="" EFFORT="" FULL_IMAGES=""
while [ $# -gt 0 ]; do
    case "$1" in
        --issue) ISSUE="${2:-}"; shift 2 ;;
        --new-issue) NEW_ISSUE="${2:-}"; shift 2 ;;
        --owner) OWNER="${2:-}"; shift 2 ;;
        --type) TYPE="${2:-}"; shift 2 ;;
        --priority) PRIORITY="${2:-}"; shift 2 ;;
        --effort) EFFORT="${2:-}"; shift 2 ;;
        --full-images) FULL_IMAGES=1; shift ;;
        --*) die "unknown option $1" ;;
        *) POS+=("$1"); shift ;;
    esac
done
BRANCH="${POS[0]:-}"
BASE="${POS[1]:-}"
NAME="${POS[2]:-${BRANCH//\//-}}"
[ -n "$BRANCH" ] || die "usage: worktree-new.sh <branch> [base] [name] [--issue N | --new-issue \"<title>\"] [--owner O] [--full-images]"

[ -n "$ISSUE" ] || ISSUE=$(printf '%s\n' "$BRANCH" | grep -oE '(^|[^0-9])[0-9]{3,}' | head -1 | grep -oE '[0-9]+' || true)
[ -n "$ISSUE" ] || [ -n "$NEW_ISSUE" ] || die "every branch belongs to an issue: name it in the branch (fix/1234-topic), or give --issue N, or --new-issue \"<title>\""
[[ -z "$ISSUE" || "$ISSUE" =~ ^[0-9]+$ ]] || die "--issue takes a number, not $ISSUE"

# The main checkout, even when this runs from inside another worktree.
MAIN="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
DIR="$MAIN/.worktrees/$NAME"
[ -e "$DIR" ] && die "$DIR already exists"

if [ -z "$ISSUE" ]; then
    ISSUE=$(cd "$MAIN" && node "$HERE/branch-note.mjs" new-issue --title "$NEW_ISSUE" --branch "$BRANCH" \
        ${TYPE:+--type "$TYPE"} ${PRIORITY:+--priority "$PRIORITY"} ${EFFORT:+--effort "$EFFORT"}) ||
        die "could not open the issue"
fi

retry git -C "$MAIN" fetch --quiet origin
if [ -z "$BASE" ]; then
    BASE=origin/master
fi
# git-lfs's smudge filter writes the pointer instead of the image for a path lfs.fetchexclude matches.
# Given with -c, the exclude applies to this checkout only, never to the repository's config.
LFS_SLIM=(-c "lfs.fetchexclude=design/**")
[ -n "$FULL_IMAGES" ] && LFS_SLIM=()
if git -C "$MAIN" show-ref --verify --quiet "refs/heads/$BRANCH" \
    || git -C "$MAIN" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    # an origin-only branch gets a local tracking branch of the same name
    git -C "$MAIN" "${LFS_SLIM[@]}" worktree add "$DIR" "$BRANCH"
else
    # --no-track: the new branch's upstream is set by its first `git push -u` below, not to the base
    git -C "$MAIN" "${LFS_SLIM[@]}" worktree add --no-track -b "$BRANCH" "$DIR" "$BASE"
    # A branch started from another branch is stacked on it: record that, so the pre-push gate
    # measures this branch's changes from that branch, not origin/master (tools/push-base.mjs).
    case "$BASE" in
        origin/master) ;;
        origin/*) git -C "$MAIN" config "branch.$BRANCH.prBase" "${BASE#origin/}" ;;
    esac
fi

if [ -f "$MAIN/.env" ]; then
    ln -s "$MAIN/.env" "$DIR/.env"
else
    echo "note: $MAIN/.env does not exist, so there is no .env to link (see .env.example)" >&2
fi

git -C "$MAIN" config "branch.$BRANCH.issue" "$ISSUE"
if ! git -C "$DIR" rev-parse -q --verify '@{upstream}' >/dev/null 2>&1; then
    retry git -C "$DIR" push --no-verify -q -u origin "$BRANCH" ||
        echo "warning: could not push $BRANCH to origin; its first commit pushes it (.husky/post-commit)" >&2
fi
(cd "$DIR" && node "$HERE/branch-note.mjs" start --issue "$ISSUE" --branch "$BRANCH" --worktree "$DIR" \
    ${OWNER:+--owner "$OWNER"}) ||
    echo "warning: issue #$ISSUE is not labelled or noted yet; run: node tools/branch-note.mjs start --issue $ISSUE --branch $BRANCH --worktree $DIR" >&2

(cd "$DIR" && pnpm install --frozen-lockfile)

echo "ready: $DIR${ISSUE:+ (issue #$ISSUE)}"
[ -n "$FULL_IMAGES" ] || echo "the design/** images are LFS pointers here; to get them: git -C $DIR lfs pull --include \"design/**\""
