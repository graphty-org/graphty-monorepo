#!/usr/bin/env bash
# Repro of round 3 session r3-s09 (T15 B, friends.csv): her route, run as a script.
# Checks (1) Ava's dot is drawn larger than Farah's although Farah has the higher PageRank
# (0.06608 against 0.06423), on screen and in the exported image; (2) node names in the 2x
# export are soft while the key's text is sharp; (3) a click on "Export#2" in the Export
# dialog saves nothing. Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                  # 02
st --click "Open project or file" --upload friends.csv  # 03 drawn
st --click-at 680,864                                   # 04 Analyze
st --click "PageRank"                                   # 05
st --click "Run"                                        # 06
st --click-at 155,156                                   # 07 run row
st --click-at 1419,234                                  # 08 Add to Shape
st --click "Size"                                       # 09
st --click-at 1195,416                                  # 10 size bound to PageRank
st --click-at 1419,332                                  # 11 Add label line
st --click-at 1106,470                                  # 12 label bound to id
st --click-at 23,20                                     # 13 Main menu
st --click "Export..."                                  # 14 dialog
st --click "Export#2"                                   # 15 what did this hit?
st --click-at 1057,746                                  # 16 file saved
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
