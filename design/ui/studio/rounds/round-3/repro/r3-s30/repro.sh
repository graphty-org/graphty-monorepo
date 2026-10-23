#!/usr/bin/env bash
# Repro of round 3 session r3-s30 (T9 B, Florentine families, Betweenness sizes).
# Checks two things the session met:
#  1. After a ranking run, the key in the top-left corner of the drawing covers one of the 15
#     family dots (only 14 are visible; an edge runs in under the key). Seen in 05.png and after.
#  2. Hovering the biggest dot (Medici) shows no name or tooltip on screen.
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
st --click "Florentine families"            # 03 sample drawn, no key yet
st --click "Analyze"                        # 04
st --type "betweenness" --key Enter         # 05 card opens
st --click "Run"                            # 06 colors and key appear
st --click "Betweenness"                    # 07 run row
st --click "Add to Shape"                   # 08
st --click "Size"                           # 09
st --click "role=option:Betweenness"        # 10 size bound, key has two rows
st --hover-at 700,378                       # 11 hover the big dot: any name shown?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
