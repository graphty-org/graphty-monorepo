#!/bin/bash
# S6: for each run id given, list its check runs (via the run's check suite) with
# annotations_count, then print the annotations of those with a count above 0.
R=graphty-org/graphty-monorepo
for run in "$@"; do
  suite=$(gh api /repos/$R/actions/runs/$run --jq '"\(.check_suite_id) \(.name) \(.conclusion) \(.head_sha[0:8])"')
  echo "== run $run: $suite"
  sid=${suite%% *}
  gh api "/repos/$R/check-suites/$sid/check-runs?per_page=100" --jq '.check_runs[]|"\(.id)\t\(.output.annotations_count)\t\(.conclusion)\t\(.name)"' | while IFS=$'\t' read id cnt concl name; do
    echo "  check $id count=$cnt $concl $name"
    if [ "$cnt" != "0" ]; then gh api "/repos/$R/check-runs/$id/annotations" --jq '.[]|"     [\(.annotation_level)] \(.title // "") :: \(.message|gsub("\n";" | ")|.[0:300])"'; fi
  done
done
