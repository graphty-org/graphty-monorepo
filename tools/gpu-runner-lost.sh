#!/usr/bin/env bash
# Did this run attempt fail only because a runner was taken away (a machine.dev spot reclaim)? Needs GH_TOKEN and
# GITHUB_REPOSITORY. Used by gpu-rerun-on-runner-loss.yml (to re-run the attempt once) and release.yml's held job
# (to open no "Release held" issue for an attempt that rerun will repeat), so the two always agree.
#
#   tools/gpu-runner-lost.sh <run id> <attempt>
#
# Exits 0 when at least one job of that attempt failed and EVERY failed job carries a lost-runner annotation;
# exits 1 otherwise. A real test failure carries no such annotation, so any failed test, in any lane, means 1.
set -euo pipefail

run=$1 attempt=$2
lost='runner has received a shutdown signal|lost communication with the server|runner .*(was|has been) (lost|terminated|preempted|reclaimed)|spot (instance )?(interruption|reclaim)'
failed=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$run/attempts/$attempt/jobs?per_page=100" --paginate \
    --jq '.jobs[] | select(.conclusion == "failure") | .id')
[ -n "$failed" ] || exit 1
for job in $failed; do
    # a check run's id is its job's id; the lost-runner message is one of its annotations
    if ! gh api "repos/$GITHUB_REPOSITORY/check-runs/$job/annotations" --jq '.[].message' | grep -qiE "$lost"; then
        echo "job $job failed on its own"
        exit 1
    fi
    echo "job $job lost its runner"
done
