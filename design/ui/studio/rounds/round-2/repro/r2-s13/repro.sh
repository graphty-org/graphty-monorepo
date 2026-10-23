#!/usr/bin/env bash
# Repro of round 2 session r2-s13 (Les Miserables, names on every dot), the participant's own clicks.
# Checks: the "Above" text in the label line does nothing; the toolbar's "3D" button is named "View";
# the hidden-for-overlap count moves 7 -> 5 -> 7 with zoom; 2D gives 0 hidden.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"                 # 02
st --click "Everything" --click "Add label line" --click "role=option:name"  # 03 7 hidden
st --click "Above"                                              # 04 does anything change?
st --wheel 700,420,-600                                         # 05
st --wheel 680,420,-1500                                        # 06
st --wheel 700,400,-2500                                        # 07
st --click "3D"                                                 # 08 expect: nothing is called 3D
st --click "View" --click "2D"                                  # 09 0 hidden
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
