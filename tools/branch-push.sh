#!/bin/sh
# Every branch, large or small, is on GitHub (the owner's rule, 2026-10-21). Run by .husky/post-commit:
# pushes the current branch to origin in the background after every commit, setting its upstream, and
# refreshes the latest-commit line of the branch's progress note on its issue (tools/branch-note.mjs, at
# most once per 10 minutes per branch). It returns at once and never fails the commit.
#
# The push skips the pre-push gate (--no-verify): it is a copy of work in progress, and nothing runs CI on
# a branch push. CI runs on the branch's pull request (tools/pr-open.sh).
#
# Never for golden, golden-cut, golden-verified (which the main checkout follows) or master, a detached
# HEAD, or a commit in the middle of a rebase. What happens goes to tmp/branch-push.log in the main
# checkout; a failed push (no network, a branch that moved on GitHub) is only logged, and the next commit
# tries again.
#
# The branch on GitHub can hold commits this one lacks: the owner's screenshot Finish commits its approval
# there, and visual-review's update pushes its merge of master. So before the push, while the commit is fresh and nothing else runs
# in the worktree, origin/<branch> is fetched and merged into the local branch (a fast-forward or a merge
# commit, never a rebase), so the push goes through. Only when the worktree is clean, with no merge in
# progress; a merge that conflicts is aborted at once, leaving the worktree as it was, and logged. The
# merge runs without hooks (its message is git's own; the Commitizen hook would want a terminal).
branch=$(git symbolic-ref -q --short HEAD) || exit 0
case "$branch" in master | golden | golden-cut | golden-verified) exit 0 ;; esac
for d in rebase-merge rebase-apply; do
    [ -d "$(git rev-parse --git-path "$d")" ] && exit 0
done
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)") || exit 0
mkdir -p "$main/tmp" || exit 0
log="$main/tmp/branch-push.log"
# A hook's environment can name a temporary index (a partial commit); the merge works on the real one.
unset GIT_INDEX_FILE
if timeout 30 git fetch -q origin "+refs/heads/$branch:refs/remotes/origin/$branch" 2>/dev/null &&
    ! git merge-base --is-ancestor "origin/$branch" HEAD; then
    if [ -e "$(git rev-parse --git-path MERGE_HEAD)" ] || [ -n "$(git status --porcelain --untracked-files=no)" ]; then
        echo "$(date -Iseconds) $branch: origin/$branch has commits this branch lacks; not merged (uncommitted changes or a merge in progress)" >>"$log"
    elif git -c core.hooksPath=/dev/null merge -q --no-edit "origin/$branch" >>"$log" 2>&1; then
        echo "$(date -Iseconds) $branch: merged origin/$branch" >>"$log"
    else
        git merge --abort >/dev/null 2>&1
        echo "$(date -Iseconds) $branch: origin/$branch does not merge cleanly; merge it by hand: git merge origin/$branch" >>"$log"
    fi
fi
note="$(cd "$(dirname "$0")" && pwd -P)/branch-note.mjs"
(
    echo "$(date -Iseconds) $branch $(git rev-parse --short HEAD)"
    if git push --no-verify -q -u origin "$branch"; then echo "pushed $branch"; else echo "push of $branch failed"; fi
    node "$note" commit --branch "$branch" || echo "the progress note of $branch was not updated"
    echo "finished $branch"
) </dev/null >>"$log" 2>&1 &
exit 0
