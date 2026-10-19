#!/bin/bash
# S3 follow-up: (3) after the PATCH retarget, does update-branch on the child start CI?
# (4) with delete_branch_on_merge=true, does GitHub retarget a stacked PR when the base PR merges?
set -e
R=apowers313/githerd-spike-2026-10-03
cd "$(dirname "$0")/scratch"
runs() { gh api "/repos/$R/actions/runs?head_sha=$1" --jq '.workflow_runs[]|"    run \(.id) \(.event) \(.status)/\(.conclusion) created=\(.created_at)"'; }
pr() { gh api /repos/$R/pulls/$1 --jq '"    PR \(.number) state=\(.state) base=\(.base.ref) head=\(.head.sha[0:8]) mergeable_state=\(.mergeable_state)"'; }
echo "== (3) update-branch on PR 2"
H=$(gh api /repos/$R/pulls/2 --jq .head.sha)
gh api -X PUT /repos/$R/pulls/2/update-branch -f expected_head_sha=$H --jq '"    \(.message)"'
sleep 30; pr 2; runs $(gh api /repos/$R/pulls/2 --jq .head.sha)
echo "== (4) delete_branch_on_merge=true, stack f on e, merge e"
gh api -X PATCH /repos/$R -F delete_branch_on_merge=true --jq '"    delete_branch_on_merge=\(.delete_branch_on_merge)"'
git fetch -q origin; git switch -q master; git merge -q --ff-only origin/master
for x in "e master" "f e"; do set -- $x; git switch -q -c $1 $2; echo $1 > $1.txt; git add $1.txt; git commit -q -m "chore: $1"; git push -q -u origin $1 2>/dev/null; done
git switch -q master
gh pr create -R $R -B master -H e -t "E" -b "spike E"
gh pr create -R $R -B e -H f -t "F stacked on E" -b "spike F"
sleep 20
E=$(gh pr view e -R $R --json number --jq .number); F=$(gh pr view f -R $R --json number --jq .number)
FH=$(gh api /repos/$R/pulls/$F --jq .head.sha)
gh api -X PUT /repos/$R/pulls/$E/merge -f merge_method=merge --jq '"    merged=\(.merged)"'
sleep 45; pr $F; runs $FH
gh api "/repos/$R/issues/$F/events" --jq '.[]|"    event \(.event) \(.created_at)"'
gh api -i /repos/$R/branches/e 2>&1 | tr -d '\r' | grep '^HTTP'
