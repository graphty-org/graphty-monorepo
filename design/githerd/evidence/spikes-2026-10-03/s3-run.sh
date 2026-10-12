#!/bin/bash
# S3: retarget a stacked PR after its base merged: (1) PATCH base=master; (2) delete the merged base branch.
R=apowers313/githerd-spike-2026-10-03
runs() { gh api "/repos/$R/actions/runs?head_sha=$1" --jq '.workflow_runs[]|"    run \(.id) \(.event) \(.status)/\(.conclusion) created=\(.created_at)"'; }
pr() { gh api /repos/$R/pulls/$1 --jq '"    PR \(.number) state=\(.state) base=\(.base.ref) head=\(.head.sha[0:8]) mergeable_state=\(.mergeable_state)"'; }
echo "== (1) merge PR 1, then PATCH PR 2 base=master"
gh api -X PUT /repos/$R/pulls/1/merge -f merge_method=merge --jq '"    merged=\(.merged) sha=\(.sha[0:8])"'
sleep 3; pr 2
B=$(gh api /repos/$R/pulls/2 --jq .head.sha); echo "    runs on B head before:"; runs $B
gh api -X PATCH /repos/$R/pulls/2 -f base=master --jq '"    PATCH -> base=\(.base.ref)"'
sleep 45; pr 2; echo "    runs on B head after retarget:"; runs $B
gh api "/repos/$R/issues/2/events" --jq '.[]|"    event \(.event) \(.created_at)"'
echo "== (2) merge PR 3, then delete branch d"
gh api -X PUT /repos/$R/pulls/3/merge -f merge_method=merge --jq '"    merged=\(.merged) sha=\(.sha[0:8])"'
sleep 3; pr 4
C=$(gh api /repos/$R/pulls/4 --jq .head.sha); echo "    runs on C head before:"; runs $C
gh api -i -X DELETE /repos/$R/git/refs/heads/d 2>&1 | tr -d '\r' | grep '^HTTP'
sleep 45; pr 4; echo "    runs on C head after delete:"; runs $C
gh api "/repos/$R/issues/4/events" --jq '.[]|"    event \(.event) \(.created_at)"'
