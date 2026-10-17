#!/bin/bash
# S6/S7/S9: for a run attempt, every job's queue and run times, labels, runner, steps,
# annotations, and where the balance text appears in its log.
R=graphty-org/graphty-monorepo
run=$1; att=$2
echo "== run $run attempt $att"
gh api "/repos/$R/actions/runs/$run/attempts/$att/jobs?per_page=100" --jq '.jobs[]|"\(.id)\t\(.status)/\(.conclusion)\tcreated=\(.created_at) started=\(.started_at) completed=\(.completed_at)\trunner=\(.runner_name) labels=\(.labels|join(","))\tsteps=\(.steps|length)\t\(.name)"' | while IFS=$'\t' read id st times runner steps name; do
  echo "  job $id $st $name"; echo "    $times"; echo "    $runner $steps"
  gh api "/repos/$R/check-runs/$id" --jq '"    annotations_count=\(.output.annotations_count) title=\(.output.title) summary=\(.output.summary // "" | .[0:200])"' 2>&1
  gh api "/repos/$R/check-runs/$id/annotations" --jq '.[]|"      [\(.annotation_level)] \(.message|gsub("\n";" | ")|.[0:250])"' 2>&1
  gh api "/repos/$R/actions/jobs/$id/logs" 2>/dev/null > log-$id.txt; echo "    log bytes=$(wc -c < log-$id.txt)"
  grep -i -m3 'balance\|shutdown signal\|lost communication' log-$id.txt | cut -c1-250 | sed 's/^/      log: /'
done
