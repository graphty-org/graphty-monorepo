#!/bin/sh
# Every branch, large or small, is on GitHub (the owner's rule, 2026-10-21). Run by .husky/post-commit:
# pushes the current branch to origin in the background after every commit, setting its upstream, and
# refreshes the latest-commit line of the branch's progress note on its issue (tools/branch-note.mjs, at
# most once per 10 minutes per branch). It returns at once and never fails the commit.
#
# The push skips the pre-push gate (--no-verify): it is a copy of work in progress, not a landing, and
# nothing runs CI on a branch push. The gate runs when the branch lands (tools/land.mjs).
#
# Never for golden, golden-cut or master, a detached HEAD, or a commit in the middle of a rebase. What
# happens goes to tmp/branch-push.log in the main checkout; a failed push (no network, a branch that
# moved on GitHub) is only logged, and the next commit tries again.
branch=$(git symbolic-ref -q --short HEAD) || exit 0
case "$branch" in master | golden | golden-cut) exit 0 ;; esac
for d in rebase-merge rebase-apply; do
    [ -d "$(git rev-parse --git-path "$d")" ] && exit 0
done
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)") || exit 0
mkdir -p "$main/tmp" || exit 0
note="$(cd "$(dirname "$0")" && pwd -P)/branch-note.mjs"
(
    echo "$(date -Iseconds) $branch $(git rev-parse --short HEAD)"
    if git push --no-verify -q -u origin "$branch"; then echo "pushed $branch"; else echo "push of $branch failed"; fi
    node "$note" commit --branch "$branch" || echo "the progress note of $branch was not updated"
    echo "finished $branch"
) </dev/null >>"$main/tmp/branch-push.log" 2>&1 &
exit 0
