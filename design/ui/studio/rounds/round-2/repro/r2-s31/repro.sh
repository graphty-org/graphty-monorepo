#!/usr/bin/env bash
# Repro of round 2 session r2-s31 (Florentine families, Betweenness sized): the on-screen key box
# covers a whole node of the drawing (an edge runs under the key to a dot that cannot be seen).
# Runs the participant's path twice on fresh loads to show it is the same every time.
# Writes PNGs and run.log into ./run-1/ and ./run-2/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
for n in 1 2; do
S="$here/run-$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Florentine families"
st --key Shift+A --type Betweenness
st --click "Betweenness"
st --click "Run"
st --click "Bridges"
st --click "Add to Shape"
st --click "Size"
st --click "Size by attribute"
st --click "role=option:Bridges"
node "$T" --end "$S"
} 2>&1 | tee "$here/run-$n.log"
done
