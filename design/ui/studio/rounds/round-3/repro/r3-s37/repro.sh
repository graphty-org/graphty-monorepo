#!/usr/bin/env bash
# Repro of round 3 session r3-s37 (T6, Les Miserables, what did I get).
# Checks, on the Graph place's Values > Overview right after the sample opens:
#  1. The direction row shows only its value "Undirected, from the file: directed 0"; its label
#     ("Direction") is pushed out and the value runs past the panel's right edge. No tooltip.
#  2. "Components" has no tooltip or explanation on hover.
#  3. "Edges per ..." label is truncated.
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                      # 02
st --click "Les Miserables"                 # 03 Overview: direction row clipped, label gone?
st --hover "Components"                     # 04 any tooltip?
st --hover-at 1330,236                      # 05 any tooltip on the direction row?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
