#!/usr/bin/env bash
# Repro of round 2 session r2-s56 (first look, karate club sample, then friends.csv):
#  1. After Degree then Louvain, the legend (on screen and in the exported "To share" image)
#     still lists "Color: Connections 1..17" though every node is drawn in its group color.
#  2. "Open project or file..." from the main menu while a project is open adds the file to
#     that project ("Added friends.csv to this project") instead of opening it on its own.
# Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                   # 02
st --click "Zachary's karate club"                       # 03 drawn
st --click "Analyze" --click "Degree" --click "Run"      # 04 colored by Connections
st --click "Analyze" --type "modularity"                 # 05
st --click "Louvain" --click "Run"                       # 06 group colors win
echo "== expect the legend to list Color: Connections although no node shows it"
st --expect "Color: Communities" --expect "Color: Connections"   # 07
st --click "Main menu" --click "Export..."               # 08
st --click "role=button:Export"                          # 09 file saved; open it to see the legend
echo "== open a file from the main menu while the sample is open"
st --click "Main menu" --click "Open project or file..." --upload friends.csv   # 10
st --expect "Added friends.csv to this project"          # 11
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
