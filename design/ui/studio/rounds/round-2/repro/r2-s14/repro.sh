#!/usr/bin/env bash
# Repro of round 2 session r2-s14 (Les Miserables, names on every dot), the participant's own path.
# Checks: 7 hidden after the label line; View -> 2D gives 0 hidden; then Fit (key 0) and View -> Fit
# fill the canvas with one edge instead of the whole graph; the wheel does not zoom back out;
# View -> 3D then View -> 2D brings the whole drawing back.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"                              # 02
st --click "Everything" --click "Add label line" --click "role=option:name"  # 03 7 hidden
st --click "View" --click "2D"                                               # 04 0 hidden
st --wheel 880,300,-1500                                                     # 05 small zoom in
st --click-at 750,450 --key 0                                                # 06 Fit by key
st --click "View" --click "Fit"                                              # 07 Fit from the menu
st --wheel 750,450,5000                                                      # 08 wheel out
st --click "View" --click "3D" --click "View" --click "2D"                    # 09 recovery
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
