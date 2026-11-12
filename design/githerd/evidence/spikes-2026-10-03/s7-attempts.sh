#!/bin/bash
# Find GPU runs on 10-02 and 10-03 that had an earlier failed attempt (re-run after a balance failure).
R=graphty-org/graphty-monorepo
gh api "/repos/$R/actions/workflows/gpu.yml/runs?created=2026-10-01T20:00:00Z..2026-10-03T12:00:00Z&per_page=100" --paginate --jq '.workflow_runs[]|select(.conclusion!="skipped")|"\(.id) \(.run_attempt) \(.conclusion) \(.created_at)"' | while read id att concl c; do
  for a in $(seq 1 $att); do
    gh api "/repos/$R/actions/runs/$id/attempts/$a" --jq '"\(.id) attempt=\(.run_attempt) \(.conclusion) started=\(.run_started_at) updated=\(.updated_at) \(.head_branch) \(.head_sha[0:8])"'
  done
done
