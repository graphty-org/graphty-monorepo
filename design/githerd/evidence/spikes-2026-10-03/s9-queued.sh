#!/bin/bash
# S9 (queued shape): dispatch a job on a label no runner serves, read it while queued, then cancel.
R=apowers313/githerd-spike-2026-10-03
gh workflow run queued.yml -R $R --ref master; sleep 30
ID=$(gh api "/repos/$R/actions/workflows/queued.yml/runs" --jq '.workflow_runs[0].id')
gh api /repos/$R/actions/runs/$ID --jq '"run \(.id) status=\(.status) created=\(.created_at) run_started=\(.run_started_at)"'
gh api /repos/$R/actions/runs/$ID/jobs --jq '.jobs[]|"job \(.id) status=\(.status) created_at=\(.created_at) started_at=\(.started_at) runner=\(.runner_name) labels=\(.labels)"'
sleep 60; echo "60 s later:"
gh api /repos/$R/actions/runs/$ID/jobs --jq '.jobs[]|"job \(.id) status=\(.status) created_at=\(.created_at) started_at=\(.started_at)"'
gh run cancel $ID -R $R; sleep 15
gh api /repos/$R/actions/runs/$ID --jq '"after cancel: \(.status)/\(.conclusion)"'
gh api /repos/$R/actions/runs/$ID/jobs --jq '.jobs[]|"job status=\(.status)/\(.conclusion) started_at=\(.started_at) completed_at=\(.completed_at) steps=\(.steps|length)"'
