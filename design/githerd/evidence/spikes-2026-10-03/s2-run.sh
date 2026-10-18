#!/bin/bash
# S2: PUT update-branch on PR 1 with allow_update_branch=false: stale sha, then the real head sha.
R=apowers313/githerd-spike-2026-10-03
echo "allow_update_branch=$(gh api /repos/$R --jq .allow_update_branch)"
H=$(gh api /repos/$R/pulls/1 --jq .head.sha); echo "head=$H mergeable_state=$(gh api /repos/$R/pulls/1 --jq .mergeable_state)"
echo "-- stale expected_head_sha:"; gh api -i -X PUT /repos/$R/pulls/1/update-branch -f expected_head_sha=0000000000000000000000000000000000000000 2>&1 | tr -d '\r' | grep -i '^HTTP\|message'
echo "-- correct expected_head_sha:"; gh api -i -X PUT /repos/$R/pulls/1/update-branch -f expected_head_sha=$H 2>&1 | tr -d '\r' | grep -i '^HTTP\|message'
sleep 5
N=$(gh api /repos/$R/pulls/1 --jq .head.sha); echo "new head=$N"
gh api /repos/$R/commits/$N --jq '"parents=\([.parents[].sha[0:8]]|join(",")) message=\(.commit.message|split("\n")[0]) verified=\(.commit.verification.verified) committer=\(.commit.committer.name)"'
echo "-- old head as expected_head_sha after the update:"; gh api -i -X PUT /repos/$R/pulls/1/update-branch -f expected_head_sha=$H 2>&1 | tr -d '\r' | grep -i '^HTTP\|message'
echo "-- runs for the new head:"; sleep 20; gh api "/repos/$R/actions/runs?head_sha=$N" --jq '.workflow_runs[]|"\(.event) \(.status) \(.head_sha[0:8])"'
