#!/usr/bin/env bash
# Repro of round 3 session r3-s54 (T2, Florentine families): the Overview's direction row
# "Undirected, from the file: directed 0" has no label and runs to the panel edge; the row label
# "Edges per n..." is cut off; hovering the Medici dot shows no name. Writes PNGs and run.log
# into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                      # 02 card answered
st --click "Florentine families"            # 03 sample drawn, Overview shown
st --hover "Edges per"                      # 04 hover the cut label
st --hover-at 701,378                       # 05 hover the Medici dot
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
