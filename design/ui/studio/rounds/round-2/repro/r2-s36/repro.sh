#!/usr/bin/env bash
# Repro for round 2 session r2-s36 (T14, save and come back by closing the tab):
# after Save as..., closing the tab and reopening the project from Recent projects, the Influence
# row in the outline no longer shows its count "77" (before the save it does). The color ramp,
# the labels and the Values tab come back.
# Same setup and clicks as the session. Writes PNGs and run.log into ./run/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" "setup:$here/../../setups/T14.txt"   # 01 Influence 77
st --click "Main menu" --click "Save as..."                 # 02
st --click "Name" --key Control+a --type "Repro reopen"     # 03
st --click "Save"                                           # 04 "Saved Repro reopen in this browser."
st --reopen                                                 # 05 start screen, Recent projects
st --click "Repro reopen"                                   # 06 reopened: Influence row without 77
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
