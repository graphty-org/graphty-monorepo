#!/usr/bin/env bash
#
# Starts the full CI suite on a pull request the merge queue is checking (merge-queue-suite.yml).
#
# ci.yml runs the full suite when the pull request carries the "checking" label at the moment its
# plan job runs. A pull request that is behind its base gets a fresh run from Mergify's update push,
# which sees the label. One that is already up to date gets no push, so this script re-runs ci.yml's
# newest run of this pull request on its head: the re-run keeps the pull_request event and merge
# commit (the same tree and base tip, since the head already contains the base), and its plan job now
# sees the label and runs the full suite, which alone publishes the check Mergify merges on.
#
# A run's suite is read from its "Suite: <suite>" job. A completed full attempt is never re-run from
# here, so a real failure cannot loop: re-run its failed jobs by hand for a flake.
#
# Usage: tools/merge-queue-suite.sh <pull request number>   (needs GH_TOKEN and GITHUB_REPOSITORY)

set -euo pipefail

PR="${1:?usage: merge-queue-suite.sh <pull request number>}"
R="$GITHUB_REPOSITORY"
done_() { echo "::notice::$1"; exit 0; }

pull() { gh api "repos/$R/pulls/$PR" --jq "$1"; }
head=$(pull .head.sha)
base=$(pull .base.ref)

# Behind its base: Mergify is merging the base in, and that push starts the full suite itself.
behind=$(gh api "repos/$R/compare/${base}...${head}" --jq .behind_by)
[ "$behind" = 0 ] || done_ "${head} is ${behind} commits behind ${base}; Mergify's update push starts the full suite"

# This pull request's newest CI run on that head (another pull request may share the commit).
newest() {
    gh api "repos/$R/actions/workflows/ci.yml/runs?head_sha=$head&event=pull_request&per_page=20" \
        --jq "[.workflow_runs[] | select(any(.pull_requests[]; .number == $PR))][0] // empty | \"\(.id) \(.run_attempt) \(.status)\""
}
run=""
for _ in $(seq 1 20); do
    run=$(newest)
    [ -n "$run" ] && break
    sleep 15
done
[ -n "$run" ] || { echo "::error::no CI run of #${PR} on ${head} after 5 minutes; push to the pull request to start one"; exit 1; }
read -r id attempt status <<<"$run"
echo "CI run ${id}, attempt ${attempt}, ${status}"

# The plan's decision, once its "Suite:" job exists in this attempt.
suite=""
for _ in $(seq 1 30); do
    suite=$(gh api "repos/$R/actions/runs/$id/attempts/$attempt/jobs?per_page=100" \
        --jq '[.jobs[] | select(.name | startswith("Suite: ")) | .name[7:]][0] // empty')
    [ -n "$suite" ] && break
    [ "$(gh api "repos/$R/actions/runs/$id" --jq .status)" = completed ] && break
    sleep 10
done
[ "$suite" = full ] && done_ "run ${id} attempt ${attempt} is the full suite"

if [ "$(gh api "repos/$R/actions/runs/$id" --jq .status)" != completed ]; then
    echo "cancelling run ${id} (suite: ${suite:-unknown}) so it can be re-run as the full suite"
    gh api -X POST "repos/$R/actions/runs/$id/cancel" >/dev/null || true
    for _ in $(seq 1 60); do
        [ "$(gh api "repos/$R/actions/runs/$id" --jq .status)" = completed ] && break
        sleep 10
    done
fi

# Mergify may have pushed meanwhile; a re-run of the old head would then cancel the new head's run.
[ "$(pull .head.sha)" = "$head" ] || done_ "the head moved past ${head}; its own run starts the full suite"

gh api -X POST "repos/$R/actions/runs/$id/rerun" >/dev/null
echo "re-running CI run ${id} as the full suite: https://github.com/${R}/actions/runs/${id}"
