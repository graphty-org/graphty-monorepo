#!/usr/bin/env bash
# Repro for round 2 session r2-s35 (T14, save and come back):
#  (a) "Save local copy..." downloads the .graphty.json file but the app shows no message at all;
#  (b) after the project is reopened from Recent projects, the Influence row in the outline no
#      longer shows its count "77" (before the save it does).
# Same setup and clicks as the session. Writes PNGs, downloads and run.log into ./run/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" "setup:$here/../../setups/T14.txt"   # 01 Influence 77
st --click "Main menu" --click "Save as..."                 # 02
st --click "Name" --key Control+a --type "Repro save"       # 03
st --click "Save"                                           # 04 "Saved Repro save in this browser."
st --wait 4000                                              # 05 message gone
st --click "Main menu" --click "Save local copy..."         # 06 file saved, no message
st --click "Main menu" --click "Back to start"              # 07
st --click "Repro save"                                     # 08 reopened: Influence row without 77
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
