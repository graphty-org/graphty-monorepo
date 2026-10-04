#!/usr/bin/env bash
#
# Prints the id of a CI run that passed the full suite on exactly this tree, or nothing.
#
# A full-suite run of ci.yml (the merge queue's run of a pull request, or a full master run) ends
# by uploading an artifact named full-suite-passed-<tree>, where <tree> is the git tree it tested.
# Mergify merges an up-to-date pull request with a merge commit whose tree is that same tree, so the
# push to master can skip the test shards (ci.yml, plan job) and coverage.yml can publish the queue
# run's coverage instead. Runs from forks never count.
#
# Usage: tools/full-suite-proof.sh <tree sha>   (needs GH_TOKEN and GITHUB_REPOSITORY)

set -euo pipefail

tree="${1:?usage: full-suite-proof.sh <tree sha>}"
gh api "repos/${GITHUB_REPOSITORY}/actions/artifacts?name=full-suite-passed-${tree}&per_page=20" --jq '
    [.artifacts[] | select((.expired | not) and .workflow_run.head_repository_id == .workflow_run.repository_id)]
    | first | .workflow_run.id // empty'
