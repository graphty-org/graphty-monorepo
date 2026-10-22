#!/usr/bin/env bash
# Replays the session's own pointer path on friends.csv (open, PageRank, size by Influence,
# label by id, export) to check whether names drawn over dots ("Chloe" on Farah, Eli and Dev)
# recur while the label line reads "20 labels, 0 hidden to avoid overlap".
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                          # 02
st --click "Open project or file..." --upload friends.csv       # 03
st --click-at 680,864 --click PageRank --click Run              # 04 ranked
st --click Influence --click-at 1419,234 --click Size           # 05 Size line
st --click "Size by attribute" --click "Influence#2"            # 06 sized
st --click-at 1419,332 --click id                               # 07 names
st --key Control+e --click Export                               # 08 image
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
