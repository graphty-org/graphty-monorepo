#!/usr/bin/env bash
# Repro of round 2 session r2-s55 (first look on friends.csv): a node selected while
# exporting the "To share" image is drawn in the file with the selection ring and fill,
# not its data color. Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                   # 02
st --drop friends.csv                                    # 03 drawn
st --click "Analyze"                                     # 04
st --click "PageRank"                                    # 05
st --click "Run"                                         # 06 colored by Influence
st --click "role=treeitem:Influence"                     # 07
st --click "Values"                                      # 08 Top 10
echo "== select the #1 node from the Top 10"
st --click "Farah"                                       # 09 Farah selected
echo "== export the To share image with Farah still selected"
st --click "Main menu" --click "Export..."               # 10
st --click "role=button:Export"                          # 11 file saved
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
