#!/usr/bin/env bash
# Decides whether gpu.yml's paid T4 job must run for the checked-out commit, and writes run=true|false to
# $GITHUB_OUTPUT. design/ci/ci-cd-plan.md section 7.
#
# - A schedule (the nightly, when switched on) and a manual dispatch always run it.
# - Otherwise the T4 must have passed on a commit from which nothing that affects webgpu-graph-algorithms (by
#   `nx show projects --affected`, which follows its dependencies, the lockfile and the shared configs, leaving out
#   the workflow files other than gpu.yml) changed:
#   - a pull request: if the pull request as a whole does not affect the package, nothing is needed; else the newest
#     commit of the pull request the T4 passed on, if any, counting only the files the pull request itself changes
#     (a merge of master into the branch never re-runs the T4);
#   - master: the newest first-parent commit the T4 passed on.
#
# Env: EVENT (github.event_name), PR (the pull request number), GH_TOKEN, GITHUB_REPOSITORY.
set -euo pipefail

decide() {
    echo "run=$1" >> "$GITHUB_OUTPUT"
    echo "T4 needed: $1 ($2)"
    exit 0
}
affects() { # affects <base>: does the change from <base> to HEAD affect webgpu-graph-algorithms?
    # nx counts every file under .github/workflows/ as an input of every project; for this lane only its own workflow
    # matters, so the other workflows are left out of the question (a CI-only change does not buy a T4 hour).
    # A failure stops the script: no answer must never read as "not affected", which would pass the gate unrun.
    local base changed files out
    base=$(git merge-base "$1" HEAD) || { echo "::error::no merge base with $1"; exit 1; }
    changed=$(git diff --name-only "$base" HEAD) || { echo "::error::git diff failed"; exit 1; }
    if [ -n "${PR_FILES:-}" ]; then
        # A pull request re-runs the T4 only for its own files: what a merge of master brought in, master's own T4
        # run judged already, so updating the branch from master never buys another T4 hour.
        changed=$(grep -Fxf <(printf '%s\n' "$PR_FILES") <<< "$changed") || true
    fi
    grep -qx '.github/workflows/gpu.yml' <<< "$changed" && return 0
    files=$(grep -v '^\.github/workflows/' <<< "$changed" | paste -sd, -) || true
    [ -n "$files" ] || return 1
    out=$(pnpm exec nx show projects --affected --files="$files" --json) || { echo "::error::nx affected failed"; exit 1; }
    [[ "$out" == *'"webgpu-graph-algorithms"'* ]]
}
t4_passed() { # t4_passed <sha>: did "Test (NVIDIA T4)" pass on it?
    local n
    n=$(gh api "repos/${GITHUB_REPOSITORY}/commits/$1/check-runs?check_name=Test%20(NVIDIA%20T4)&filter=latest" \
        --jq '[.check_runs[] | select(.conclusion == "success")] | length')
    [ "$n" -gt 0 ]
}

case "$EVENT" in
    schedule | workflow_dispatch) decide true "$EVENT always runs the T4" ;;
    pull_request)
        affects origin/master || decide false "the pull request does not affect webgpu-graph-algorithms"
        PR_FILES=$(git diff --name-only "$(git merge-base origin/master HEAD)" HEAD)
        # The pull request's commits, newest first; 30 at most (each costs one API call).
        candidates=$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR}/commits?per_page=100" --paginate --jq '.[].sha' | tac | head -30)
        ;;
    push) candidates=$(git log --first-parent --format=%H -n 30 HEAD) ;;
    *) decide true "unknown event $EVENT" ;;
esac

for sha in $candidates; do
    if t4_passed "$sha"; then
        if affects "$sha"; then
            decide true "the T4 passed on ${sha}, but the change since then affects webgpu-graph-algorithms"
        fi
        decide false "the T4 passed on ${sha} and nothing since affects webgpu-graph-algorithms"
    fi
done
decide true "no T4 pass among the last 30 commits"
