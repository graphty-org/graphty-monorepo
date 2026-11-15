#!/bin/bash
# usage: bench.sh <label> <key-or-"args..."> [reps]
label=$1; key=$2; reps=${3:-1}
case $label in s114-base) port=9662;; s114-branch) port=9327;; esac
cd "$(dirname "$0")/../../benchmarks/compare"
mkdir -p ../results/$label
export BENCH_URL=https://dev.ato.ms:$port BENCH_RESULTS=$PWD/../results/$label/results-$key${SUFFIX}.jsonl
export BENCH_RENDERER=webgpu BENCH_RENDER_PATH=batched
echo "load before: $(cut -d' ' -f1-3 /proc/loadavg)"
lock=/home/apowers/Projects/graphty-monorepo/tmp/cosmos-impl/gpu-bench.lock
if [ "$key" = m1k ]; then
  # 100k nodes + 1k edges with the layout running (no matrix key holds it)
  for ((i = 1; i <= reps; i++)); do echo "=== m1k run $i"
    flock -w 500 $lock ../../tools/with-browser.sh node run.mjs graphty lean on 100000 1000 1 no-still 2>&1 | grep -E '^(renderer|load|layoutFps|layoutSteps|failure|crash|pageerror)' | cut -c1-260
  done
else
  flock -w 500 $lock ./matrix.sh "$key" "$reps"
fi
echo "load after: $(cut -d' ' -f1-3 /proc/loadavg)"
