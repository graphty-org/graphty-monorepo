#!/bin/bash
# One configuration of the benchmark, repeated; one fresh browser per run, one browser at a time.
#   BENCH_URL=<url> BENCH_RESULTS=<file> ./matrix.sh <key> [reps]    (reps defaults to 1)
#   ./matrix.sh list
# BENCH_TOOLS names the checkout whose tools/with-browser.sh runs the browser (this one by default).
# A key is <library>-<size>[-suffix]: s is 10,000 nodes and 100,000 edges, m is 100,000 and 1,000,000,
# l is 1,000,000 and 1,000,000. A -few key keeps one edge per hundred nodes, to measure the node work alone. A -curves key draws every edge as a curve with no caps, in 3D. A -tail key is the same run without the still-frame stage, for builds
# whose load leaves too little of the ten minutes. Keep one Bash call under ten minutes: see RUNBOOK.md.
cd "$(dirname "$0")"
tools=${BENCH_TOOLS:-../..}
declare -A C=(
  [cosmos-s]="cosmos default on 10000 100000 1"
  [cosmos-m]="cosmos default on 100000 1000000 1"
  [cosmos-l]="cosmos default on 1000000 1000000 1"
  [cosmos-s-dpr2]="cosmos default on 10000 100000 2 skip-layout"
  [cosmos-m-dpr2]="cosmos default on 100000 1000000 2 skip-layout"
  [cosmos-l-dpr2]="cosmos default on 1000000 1000000 2 skip-layout"
  [lean-s]="graphty lean on 10000 100000 1"
  [lean-m]="graphty lean on 100000 1000000 1"
  [lean-l]="graphty lean on 1000000 1000000 1 skip-layout"
  [lean-l-few]="graphty lean on 1000000 10000 1 skip-layout"
  [lean-s-few]="graphty lean on 10000 100 1 skip-layout"
  [lean-m-few]="graphty lean on 100000 1000 1 skip-layout"
  [default-s]="graphty default on 10000 100000 1"
  [default-m]="graphty default on 100000 1000000 1"
  [lean-m-tail]="graphty lean on 100000 1000000 1 no-still"
  [default-m-tail]="graphty default on 100000 1000000 1 no-still"
  [lean-m-dpr2-tail]="graphty lean on 100000 1000000 2 skip-layout no-still"
  [default-m-dpr2-tail]="graphty default on 100000 1000000 2 skip-layout no-still"
  [lean-s-dpr2]="graphty lean on 10000 100000 2 skip-layout"
  [lean-m-dpr2]="graphty lean on 100000 1000000 2 skip-layout"
  [default-s-dpr2]="graphty default on 10000 100000 2 skip-layout"
  [default-m-dpr2]="graphty default on 100000 1000000 2 skip-layout"
  [lean-s-labels]="graphty lean on 10000 100000 1 skip-layout labels"
  [lean-m-labels]="graphty lean on 100000 1000000 1 skip-layout labels"
  [lean-5k-labels]="graphty lean on 5000 50 1 skip-layout labels"
  [lean-5k-glyphs]="graphty lean on 5000 50 1 skip-layout labels glyphs"
  [lean-m-sampled]="graphty lean on 100000 1000000 1 skip-layout labels sampled"
  [lean-s-curves]="graphty lean on 10000 100000 1 skip-layout curves"
  [lean-s-cpu]="graphty lean off 10000 100000 1"
  [lean-m-cpu]="graphty lean off 100000 1000000 1 no-still no-move"
  [default-s-cpu]="graphty default off 10000 100000 1"
)
[ "$1" = list ] && { printf '%s\n' "${!C[@]}" | sort; exit; }
args=${C[$1]:?unknown key, try: ./matrix.sh list}
for ((i = 1; i <= ${2:-1}; i++)); do
  echo "=== $1 run $i"
  # The slots are the machine's rule for every browser; not low-priority.sh, which would skew the timing.
  "$tools/tools/with-browser.sh" node run.mjs $args 2>&1 | grep -E '^(renderer|setup|load|canvas|still|orbit|memory|hover|layoutFps|layoutSteps|failure|crash|pageerror)' | cut -c1-${BENCH_CUT:-220}
done
