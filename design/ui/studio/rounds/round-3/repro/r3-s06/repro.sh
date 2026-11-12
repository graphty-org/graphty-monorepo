#!/usr/bin/env bash
# Repro of round 3 session r3-s06 (T15 A, Les Miserables, Betweenness): with sizes bound to
# Betweenness and names on, the top node's name (Valjean) is drawn over its own enlarged dot,
# on screen and in the exported image; names in the 2x export are soft next to the key.
# Also opens the Values tab so the top three can be compared with the drawing.
# Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                      # 02
st --click "Les Miserables"                 # 03 sample drawn
st --click "Analyze"                        # 04
st --type "betweenness" --key Enter         # 05 card opens
st --click "Run"                            # 06
st --click "Betweenness"                    # 07 run row
st --click "Add to Shape"                   # 08
st --click "Size"                           # 09
st --click "role=option:Betweenness"        # 10 size bound
st --click "Add label line"                 # 11
st --click "role=option:name"               # 12 names drawn
st --click "Show all labels"                # 13
st --key Control+e                          # 14 export dialog
st --click "role=button:Export"             # 15 file saved
st --click "Values"                         # 16 the run's values
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
