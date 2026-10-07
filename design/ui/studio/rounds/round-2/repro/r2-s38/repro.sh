#!/usr/bin/env bash
# Repro of round 2 session r2-s38 (Les Miserables, Communities run): does the on-screen color key
# cover part of the drawing, and does the exported image frame the drawing differently?
# Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
SETUP="$here/../../setups/T13.txt"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" "setup:$SETUP"                        # 01 key box over the drawing
st --key Control+e                                           # 02 Export dialog, Image
st --click "role=button:Export"                              # 03 PNG saved
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
