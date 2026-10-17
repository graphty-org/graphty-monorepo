#!/bin/bash
# S8 (corrected form): gh run rerun --job <job id> alone, on the oldest master run.
R=apowers313/githerd-spike-2026-10-03
OLD=37151263806; J=111285474909
gh run rerun -R $R --job $J; echo "exit=$?"
sleep 40
gh api /repos/$R/actions/runs/$OLD --jq '"after: run \(.id) head=\(.head_sha[0:8]) attempt=\(.run_attempt) \(.status)/\(.conclusion) run_started=\(.run_started_at)"'
gh api /repos/$R/actions/runs/$OLD/attempts/2/jobs --jq '.jobs[]|"  attempt2 job \(.id) \(.conclusion) head=\(.head_sha[0:8]) run_attempt=\(.run_attempt)"'
L=$(gh api /repos/$R/actions/runs/$OLD/attempts/2/jobs --jq '.jobs[0].id'); gh api /repos/$R/actions/jobs/$L/logs | grep -o 'sha=[0-9a-f]* ref=[^ ]* attempt=[0-9]*' | head -1
echo "commit status / check runs on e7d4a6ab:"; gh api /repos/$R/commits/e7d4a6ab/check-runs --jq '.check_runs[]|"  \(.id) \(.name) \(.conclusion) \(.started_at)"'
