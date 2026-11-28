#!/usr/bin/env bash
# Run one shard of the measured style combination matrix (issue #10370).
#   test/browser/style-combination-matrix.sh <shard index> <shard count> [results dir]
# Holds one of the four machine-wide browser slots while Chromium runs, and copies
# shard-<i>.json (and the PNGs of failing cases) into the results dir.
# VITE_STYLE_CASES=<id,id> or VITE_STYLE_LIMIT=<n> narrow the shard.
set -euo pipefail
index=${1:?shard index}
count=${2:?shard count}
here=$(cd "$(dirname "$0")/../.." && pwd)
repo=$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)/..
results=${3:-$(cd "$repo" && pwd)/tmp/style-sweep/results}
slots=${STYLE_SLOT_DIR:-$(cd "$repo" && pwd)/tmp/style-sweep}
out="tmp/style-matrix/shard-$index"
mkdir -p "$results" "$slots"
cd "$here"
rm -rf "$out"
run() {
  FC_FONTATIONS=1 VITE_STYLE_SHARD="$index" VITE_STYLE_SHARDS="$count" VITE_STYLE_OUT="$out" \
    VITE_STYLE_RESULTS_DIR="$results" ../tools/low-priority.sh pnpm exec vitest run --project=browser \
    test/browser/style-combination-matrix.test.ts
}
status=1
while :; do
  for slot in 1 2 3 4; do
    exec {fd}>"$slots/browser-slot-$slot.lock"
    if flock -n "$fd"; then
      set +e; run; status=$?; set -e
      flock -u "$fd"
      mkdir -p "$results/png"
      cp "$out/shard-$index.json" "$results/shard-$index.json"
      if [ -d "$out/png" ]; then cp "$out"/png/*.png "$results/png/" 2>/dev/null || true; fi
      echo "results: $results/shard-$index.json"
      exit "$status"
    fi
    exec {fd}>&-
  done
  # every slot is taken: block on slot 1 until it frees, then try all four again
  flock "$slots/browser-slot-1.lock" true
done
