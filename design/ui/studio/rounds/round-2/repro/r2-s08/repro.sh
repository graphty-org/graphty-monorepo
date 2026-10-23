#!/usr/bin/env bash
# Repro for round 2 session r2-s08: a node clicked before export keeps its selection ring in the
# exported "To share" picture, and its dot is drawn olive instead of its Influence color, so the
# picture's color no longer matches its own key. Same clicks as the session (friends.csv, click
# Ava, PageRank), then the default export. Writes PNGs, downloads and run.log into ./run/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                 # 02
st --drop friends.csv                  # 03
st --click-at 640,578                  # 04 click Ava (selection)
st --key Shift+A                       # 05 Analyze
st --click "PageRank"                  # 06
st --click "role=button:Run"           # 07 colored by Influence
st --key Control+e                     # 08 Export dialog
st --click "role=button:Export"        # 09 saved
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
