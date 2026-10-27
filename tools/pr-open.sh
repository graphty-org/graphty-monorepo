#!/bin/bash
# Opens the pull request for a finished branch, into master, as the agent account, with auto-merge on.
# It replaces `node tools/land.mjs land <branch>` (design/ci/channels-pipeline/merging.md, section 2.2)
# and runs no tests: CI is the only gate. It returns in seconds and never waits for CI.
#
#   tools/pr-open.sh --proof <file> [--refs] [--title "<header>"] [--issue N] [--review-answered] [--merge-master]
#
# Keep the Proof file under tmp/<task>/ (gitignored): an untracked file in the worktree is refused.
#
# Run it in the branch's worktree, with every change committed. In order it:
#   1. refuses uncommitted changes, master/golden branches, a branch with no issue (--issue, else
#      `git config branch.<b>.issue` as tools/worktree-new.sh writes it, else the number right after the type
#      prefix, as in fix/1234-topic), a branch with nothing master lacks, an empty or missing Proof file, and a
#      title commitlint rejects (Lint PR Title is a required check);
#   2. merges origin/<branch> when GitHub's copy has commits this one lacks (the owner's screenshot approvals),
#      then checks that origin/master merges cleanly (git merge-tree); a conflict stops it, exit 2: merge it by hand.
#      A branch that is only behind master is not merged: CI tests the pull request as merged with master and the
#      required checks are not strict, so that merge was one more push and one more CI run for nothing
#      (design/ci/channels-pipeline-plan.md, step 5a, fewer-pushes-per-pr). --merge-master merges it anyway (never
#      a rebase);
#   3. runs the fresh-context review (tools/pr-review.sh; reused when its report already carries the branch's
#      patch id) and stops, exit 3, on a blocking finding: fix it, or answer each finding in the Proof and run
#      again with --review-answered;
#   4. scans the branch's changed files for secrets, uploads its Git LFS objects, and pushes the branch;
#   5. opens the pull request (title: the branch's first commit header; body: the commit list, a line
#      "Fixes #N", or "Refs #N" with --refs, and a "## Proof" section from the file), or reuses the open one, and
#      posts the review's report as a COMMENT review (its `<!-- fresh-review <patch id> -->` line is what PR
#      Integrity checks) unless one with that marker is already there;
#   6. turns on auto-merge with a merge commit, and prints the pull request's URL. It leaves auto-merge off (and
#      turns it off on a re-run) for the owner to merge: a breaking change (`type!:` or BREAKING CHANGE), a change
#      to one of the few files that guard the owner (GUARD_PATHS below), and a pull request someone other than
#      the agent opened. A change to CI or to what guards the owner merges like any
#      other once green (owner, 2026-10-25: "I don't agree that I should be required to manually merge to change
#      CI"). Until code-owner review is turned on (the last rollout step, .github/CODEOWNERS), such a pull
#      request -- one that can change the very checks that judge it -- merges with only the fresh review and
#      PR Integrity looking at it; the owner accepted that gap.
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

proof="" refs=0 title="" issue="" answered=0 merge_master=0
while [ $# -gt 0 ]; do
    case "$1" in
        --proof) proof="${2:-}"; shift 2 ;;
        --refs) refs=1; shift ;;
        --title) title="${2:-}"; shift 2 ;;
        --issue) issue="${2:-}"; shift 2 ;;
        --review-answered) answered=1; shift ;;
        --merge-master) merge_master=1; shift ;;
        *) die "unknown argument: $1 (usage: tools/pr-open.sh --proof <file> [--refs] [--title \"<header>\"] [--issue N] [--review-answered] [--merge-master])" ;;
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
[ -n "$issue" ] || issue=$(git config "branch.$branch.issue" || true)
# Only the number right after the type prefix: a date or a commit id elsewhere in the name is not an issue.
[ -n "$issue" ] || issue=$(printf '%s\n' "$branch" | sed -nE 's#^[a-z0-9-]+/([0-9]{3,})(-[a-zA-Z].*)?$#\1#p')
[[ "$issue" =~ ^[0-9]+$ ]] || die "$branch names no issue (pass --issue N, or name it as in fix/1234-topic)"
[ -z "$(git status --porcelain)" ] || die "the worktree has uncommitted or untracked changes; commit them first"
[ ! -e "$(git rev-parse --git-path MERGE_HEAD)" ] || die "a merge is in progress; finish it first"

# GitHub's copy of the branch first: the owner's Finish commits screenshot approvals to it, and a push that
# lacks them is rejected. Merged without hooks, like origin/master below.
if git fetch -q origin "+refs/heads/$branch:refs/remotes/origin/$branch" 2>/dev/null &&
    ! git merge-base --is-ancestor "origin/$branch" HEAD; then
    if ! git -c core.hooksPath=/dev/null merge -q --no-edit "origin/$branch"; then
        git merge --abort >/dev/null 2>&1 || true
        code=2 die "origin/$branch (commits pushed to GitHub's copy) does not merge cleanly; merge it by hand, resolve, commit, run again"
    fi
fi
git fetch -q origin master
clash="origin/master does not merge cleanly into $branch; merge it by hand (git merge origin/master), resolve, commit, run again"
if [ "$merge_master" = 0 ]; then
    # Exit 1 is a conflict; anything else (an old git) is not ours to judge, and CI will say.
    rc=0
    git merge-tree --write-tree origin/master HEAD >/dev/null 2>&1 || rc=$?
    [ "$rc" != 1 ] || code=2 die "$clash"
elif ! git merge-base --is-ancestor origin/master HEAD; then
    # The merge runs without hooks: its message is git's own, and post-commit would push in the background.
    if ! git -c core.hooksPath=/dev/null merge -q --no-edit origin/master; then
        git merge --abort >/dev/null 2>&1 || true
        code=2 die "$clash"
    fi
fi
[ -n "$(git rev-list -1 origin/master..HEAD)" ] || die "$branch has nothing master lacks"

# The fresh-context review, before anything is pushed. It prints its report's path; exit 3 is a blocking finding.
review="${PR_OPEN_REVIEW:-$here/pr-review.sh}"
rc=0
report=$("$review" --proof "$proof" --issue "$issue" --reuse) || rc=$?
if [ "$rc" = 3 ] && [ "$answered" = 1 ]; then
    echo "pr-open: opening with the review's blocking findings answered in the Proof (--review-answered)" >&2
elif [ "$rc" = 3 ]; then
    code=3 die "the review found blocking findings ($report); fix them, or answer each in the Proof and run again with --review-answered"
elif [ "$rc" != 0 ]; then
    die "the review failed (exit $rc)"
fi

base=$(git merge-base origin/master HEAD)
scan="${PR_OPEN_SCAN:-$here/scan-secrets.sh}"
PREPUSH_ROOT="$PWD" "$scan" "$base" HEAD || die "the secret scan refused the branch"
zero=0000000000000000000000000000000000000000
remote_sha=$(git rev-parse -q --verify "refs/remotes/origin/$branch" || echo "$zero")
printf 'refs/heads/%s %s refs/heads/%s %s\n' "$branch" "$(git rev-parse HEAD)" "$branch" "$remote_sha" |
    "$here/lfs-pre-push.sh" origin "$(git remote get-url origin)" || die "the Git LFS upload failed"
git -c core.hooksPath=/dev/null push -q -u origin "HEAD:refs/heads/$branch" || die "the push of $branch failed"

[ -n "$title" ] || title=$(git log --reverse --no-merges --format=%s "$base..HEAD" | sed -n 1p)
lint="${PR_OPEN_TITLE_LINT:-$here/../node_modules/.bin/commitlint --cwd $here/..}"
$lint <<<"$title" >&2 || die "Lint PR Title would reject \"$title\"; pass --title \"<type>(<scope>): <summary>\""

agent="${PR_OPEN_AGENT_LOGIN:-graphty-agent}"
existing=$(gh pr list --head "$branch" --base master --state open --json url,author --jq '.[0] // empty | "\(.url) \(.author.login)"')
url=${existing%% *}
author=${existing#* }
if [ -z "$url" ]; then
    author="$agent"
    body=$(mktemp)
    trap 'rm -f "$body"' EXIT
    {
        # GitHub refuses a description over 65,536 characters: list at most 50 commits.
        git log --reverse --no-merges --max-count=50 --format='- %s' "$base..HEAD"
        total=$(git rev-list --count --no-merges "$base..HEAD")
        [ "$total" -le 50 ] || echo "- and $((total - 50)) more"
        echo
        if [ "$refs" = 1 ]; then echo "Refs #$issue"; else echo "Fixes #$issue"; fi
        echo
        echo "## Proof"
        echo
        # The file's own "#" and "##" headings become "###", so they stay inside the Proof section (PR Integrity
        # reads the section up to the next "##"; a file starting "## Proof" left it empty).
        sed -E 's/^#{1,2}[ \t]+/### /' "$proof"
    } >"$body"
    url=$(gh pr create --base master --head "$branch" --title "$title" --body-file "$body")
fi
# The review goes on the pull request once per patch id: a re-run after a master merge does not post it again.
marker=$(head -n 1 "$report")
if ! grep -qF -- "$marker" <<<"$(gh pr view "$url" --json reviews --jq '.reviews[].body')"; then
    gh pr review "$url" --comment --body-file "$report" >/dev/null || die "the review could not be posted on $url"
fi
# The files that guard the owner rather than judge CI: the screenshot gate (keys, trusted gate, capture,
# config, graphty's in-test comparison), the release (approvals, holds, release.yml and the scripts that read
# them), the agents' credential guard and settings, the quarantine list and its reader, the two safeguards
# left on an unheld CI change (the fresh review and PR Integrity), and the two that hold breaking changes
# (this script and pr-title.yml). A change to one waits for the owner; every other CI change merges on green.
# Gap the owner accepted: ci.yml's own gate steps are not held, so a pull request can still change a check
# that judges it; code-owner review closes that when it is turned on.
GUARD_PATHS='^(visual-review/|visual-review\.config\.json$|(.*/)?\.storybook/vitest\.setup\.|release-[^/]*\.json$|\.github/workflows/release\.yml$|tools/release-(approvals|hold)\.mjs$|tools/claude-owner-credential-guard\.mjs$|\.claude/settings\.json$|tools/test-quarantine\.(json|mjs)$|tools/pr-open\.sh$|tools/pr-review\.sh$|tools/pr-integrity\.mjs$|tools/check-test-integrity\.mjs$|\.github/workflows/(pr-title|dependabot-automerge)\.yml$)'
hold=""
# A here-string, not a pipe: grep -q stops at the first match, and pipefail would read git's SIGPIPE as no match.
if grep -qE '^[a-z]+(\([^)]*\))?!:|^BREAKING[ -]CHANGE:' <<<"$(git log --no-merges --format='%s%n%b' "$base..HEAD")"; then
    hold="it holds a breaking change (it bumps a published major)"
elif guarded=$(git diff --name-only --no-renames "$base" HEAD | grep -E "$GUARD_PATHS"); then
    hold="it changes what guards the owner: $(echo $guarded)"
elif [ "$author" != "$agent" ]; then
    hold="it was opened by $author, not by $agent"
fi
if [ -n "$hold" ]; then
    # On a re-run auto-merge may be on from before; it must not stay on.
    gh pr merge "$url" --disable-auto >/dev/null 2>&1 || true
    echo "pr-open: auto-merge is NOT on for $url: $hold. The owner merges it when he gives the go" >&2
else
    gh pr merge "$url" --auto --merge || die "auto-merge could not be turned on for $url"
fi

if grep -q '^webgpu-graph-algorithms/' <<<"$(git diff --name-only "$base" HEAD)"; then
    echo "pr-open: this changes webgpu-graph-algorithms; CI has no real GPU. Run its NVIDIA tests here before trusting the merge" >&2
fi
echo "$url"
