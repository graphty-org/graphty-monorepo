#!/bin/sh
# Never copy, always merge (the owner's rule, 2026-10-21). A cherry-pick or a rebase copies commits
# under new ids, so the same change then exists twice: the copy lands beside its original, a later
# merge conflicts with itself, and nothing can tell which branch a change came from. Merge instead:
# `git merge <branch>` brings the same commits, with the same ids.
#
#   tools/no-copy.sh          refuses while a cherry-pick or a rebase is in progress (.husky/pre-commit,
#                             and .husky/prepare-commit-msg, because a cherry-pick that applies cleanly
#                             runs no pre-commit hook)
#   tools/no-copy.sh rebase   refuses a rebase before it starts (.husky/pre-rebase)
#
# REBASE_HEAD is not a sign on its own: git leaves it behind after a finished rebase. A rebase in
# progress always has rebase-merge/ or rebase-apply/.
#
# Last resort only: git commit --no-verify (for a cherry-pick: git cherry-pick -n <commit>, then
# git commit --no-verify; for a rebase: git rebase --no-verify).

refuse() {
    echo "no-copy: $1 copies commits under new ids. Never copy, always merge: git merge <branch>." >&2
    echo "no-copy: $2" >&2
    exit 1
}

[ "$1" = rebase ] && refuse "a rebase" "merge instead. Last resort only: git rebase --no-verify."
[ -e "$(git rev-parse --git-path CHERRY_PICK_HEAD)" ] && refuse "a cherry-pick" \
    "git cherry-pick --abort, and merge instead. Last resort only: git cherry-pick -n, then git commit --no-verify."
for d in rebase-merge rebase-apply; do
    [ -d "$(git rev-parse --git-path "$d")" ] && refuse "a rebase" "git rebase --abort, and merge instead."
done
exit 0
