#!/usr/bin/env bash
# The adapter report, the nine story layouts three times each and the iteration-exact comparison, each in a fresh
# Node process. Usage: run-all.sh <adapter substring> <out dir>
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
adapter=$1; out=$2
mkdir -p "$out"
node "$here/adapter-info.mjs" "$adapter" "$out/adapter-info.json"
grep -q '"vendor": "nvidia"' "$out/adapter-info.json" || { echo "not an NVIDIA adapter"; exit 1; }
for s in force-atlas-2-at-2000 fruchterman-reingold-at-2000 spring-electrical-at-2000 force-atlas-2-at-10000 fruchterman-reingold-at-10000 spring-electrical-at-10000 force-atlas-2-at-50000 fruchterman-reingold-at-50000 spring-electrical-at-50000; do
    for r in 1 2 3; do node "$here/run-story.mjs" "$adapter" "$out" "$s" "$r"; done
done
node "$here/one-iter.mjs" "$adapter" "$out"
