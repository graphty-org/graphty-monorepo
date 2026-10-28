#!/usr/bin/env bash
# Repro of round 3 session r3-s02 (T15 A, Les Miserables): a node selected before export
# keeps its yellow selection ring in the exported image, and the ring tints that node's
# fill and covers its name. Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "Les Miserables"                 # 02 sample drawn
st --click-at 768,447                       # 03 select the middle dot (Valjean)
st --click "Analyze"                        # 04
st --click "PageRank"                       # 05
st --click "Run"                            # 06
st --click "PageRank"                       # 07 run row
st --click "Add to Shape"                   # 08
st --click "Size"                           # 09
st --click "role=option:PageRank"           # 10 size bound
st --click "Add label line"                 # 11
st --click "role=option:name"               # 12 names drawn
st --key Control+e                          # 13 export dialog
st --click "role=button:Export"             # 14 file saved
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
