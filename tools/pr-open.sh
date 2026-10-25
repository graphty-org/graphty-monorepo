#!/bin/bash
# Opens the pull request for a finished branch, into master, as the agent account, with auto-merge on.
# It replaces `node tools/land.mjs land <branch>` (design/ci/channels-pipeline/merging.md, section 2.2)
# and runs no tests: CI is the only gate. It returns in seconds and never waits for CI.
#
#   tools/pr-open.sh --proof <file> [--refs] [--title "<header>"]
#
# Run it in the branch's worktree, with every change committed. In order it:
#   1. refuses uncommitted changes, master/golden branches, a branch with no issue number (three or
#      more digits in its name), a branch with nothing master lacks, and an empty or missing Proof file;
#   2. merges origin/master when the branch is behind (never a rebase); a conflict stops it, exit 2;
#   3. scans the branch's changed files for secrets, uploads its Git LFS objects, and pushes the branch;
#   4. opens the pull request (title: the branch's first commit header; body: the commit list, a line
#      "Fixes #N", or "Refs #N" with --refs, and a "## Proof" section from the file), or reuses the open one;
#   5. turns on auto-merge with a merge commit (not for a breaking change: `type!:` or BREAKING CHANGE, which
#      waits for the owner), and prints the pull request's URL.
#
# Every git and gh call runs as the agent account, never as the owner: GIT_CONFIG_GLOBAL is the agent's
# git config (its name, its signing key, its SSH key), GH_CONFIG_DIR its gh login, and the session's
# GIT_CONFIG_COUNT overrides and ssh-agent are dropped. The push skips .husky/pre-push (the old local
# gate) but runs its two parts that protect GitHub: the secret scan and the LFS upload.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
die() {
    echo "pr-open: $*" >&2
    exit "${code:-1}"
}

proof="" refs=0 title=""
while [ $# -gt 0 ]; do
    case "$1" in
        --proof) proof="${2:-}"; shift 2 ;;
        --refs) refs=1; shift ;;
        --title) title="${2:-}"; shift 2 ;;
        *) die "unknown argument: $1 (usage: tools/pr-open.sh --proof <file> [--refs] [--title \"<header>\"])" ;;
    esac
done

# The agent identity: read from these files only, whatever the caller's environment says.
export GIT_CONFIG_GLOBAL="$HOME/.config/git-agent/config"
export GH_CONFIG_DIR="$HOME/.config/gh-agent"
export SSH_AUTH_SOCK=""
unset GIT_CONFIG_PARAMETERS GH_TOKEN GITHUB_TOKEN GH_ENTERPRISE_TOKEN
for v in $(env | sed -n 's/^\(GIT_CONFIG_\(COUNT\|KEY_[0-9]*\|VALUE_[0-9]*\)\)=.*/\1/p'); do unset "$v"; done
[ -f "$GIT_CONFIG_GLOBAL" ] || die "no agent git config at $GIT_CONFIG_GLOBAL"
[ -d "$GH_CONFIG_DIR" ] || die "no agent gh login at $GH_CONFIG_DIR"

[ -n "$proof" ] && [ -s "$proof" ] || die "--proof <file> is required and must not be empty: what you ran and what it showed"
branch=$(git symbolic-ref -q --short HEAD) || die "HEAD is detached; check out the branch"
case "$branch" in master | golden | golden-cut | golden-verified) die "refusing to open a pull request from $branch" ;; esac
issue=$(printf '%s\n' "$branch" | grep -oE '[0-9]{3,}' | head -1) || true
[ -n "$issue" ] || die "$branch names no issue (a number of three or more digits, as in fix/1234-topic)"
[ -z "$(git status --porcelain)" ] || die "the worktree has uncommitted or untracked changes; commit them first"
[ ! -e "$(git rev-parse --git-path MERGE_HEAD)" ] || die "a merge is in progress; finish it first"

git fetch -q origin master
if ! git merge-base --is-ancestor origin/master HEAD; then
    # The merge runs without hooks: its message is git's own, and post-commit would push in the background.
    if ! git -c core.hooksPath=/dev/null merge -q --no-edit origin/master; then
        git merge --abort >/dev/null 2>&1 || true
        code=2 die "origin/master does not merge cleanly into $branch; merge it by hand (git merge origin/master), resolve, commit, run again"
    fi
fi
[ -n "$(git rev-list -1 origin/master..HEAD)" ] || die "$branch has nothing master lacks"

base=$(git merge-base origin/master HEAD)
scan="${PR_OPEN_SCAN:-$here/scan-secrets.sh}"
PREPUSH_ROOT="$PWD" "$scan" "$base" HEAD || die "the secret scan refused the branch"
zero=0000000000000000000000000000000000000000
remote_sha=$(git rev-parse -q --verify "refs/remotes/origin/$branch" || echo "$zero")
printf 'refs/heads/%s %s refs/heads/%s %s\n' "$branch" "$(git rev-parse HEAD)" "$branch" "$remote_sha" |
    "$here/lfs-pre-push.sh" origin "$(git remote get-url origin)" || die "the Git LFS upload failed"
git -c core.hooksPath=/dev/null push -q -u origin "HEAD:refs/heads/$branch" || die "the push of $branch failed"

[ -n "$title" ] || title=$(git log --reverse --no-merges --format=%s "$base..HEAD" | head -1)
url=$(gh pr list --head "$branch" --base master --state open --json url --jq '.[0].url // empty')
if [ -z "$url" ]; then
    body=$(mktemp)
    trap 'rm -f "$body"' EXIT
    {
        git log --reverse --no-merges --format='- %s' "$base..HEAD"
        echo
        if [ "$refs" = 1 ]; then echo "Refs #$issue"; else echo "Fixes #$issue"; fi
        echo
        echo "## Proof"
        echo
        cat "$proof"
    } >"$body"
    url=$(gh pr create --base master --head "$branch" --title "$title" --body-file "$body")
fi
# A breaking change reaches master only with the owner's go (it bumps a published major): no auto-merge.
if git log --no-merges --format='%s%n%b' "$base..HEAD" | grep -qE '^[a-z]+(\([^)]*\))?!:|^BREAKING[ -]CHANGE:'; then
    echo "pr-open: $branch holds a breaking change; auto-merge is NOT on. The owner merges it when he gives the go" >&2
else
    gh pr merge "$url" --auto --merge || die "auto-merge could not be turned on for $url"
fi

if git diff --name-only "$base" HEAD | grep -q '^webgpu-graph-algorithms/'; then
    echo "pr-open: this changes webgpu-graph-algorithms; CI has no real GPU. Run its NVIDIA tests here before trusting the merge" >&2
fi
echo "$url"
