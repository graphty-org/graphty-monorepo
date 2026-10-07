#!/usr/bin/env bash
# Scripted repro of the build defect graded in session r1-s49b (Grace, first look at friends.csv).
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --drop friends.csv
echo "== Degree run: legend shows 'Color: Connections 3 -- 6' and the dots are orange ==" | tee -a "$here/session.log"
R --step "$here" --click-at 659,864
R --step "$here" --click-at 528,454
R --step "$here" --click "Run"
echo "== Louvain run on top: every dot is a group color, yet the legend still keys 'Color: Connections 3 -- 6' ==" | tee -a "$here/session.log"
R --step "$here" --click "Analyze" --type "group"
R --step "$here" --click-at 530,584 --click "Run"
R --end "$here"
