#!/usr/bin/env bash
# Scripted repro of the build defect graded in session r1-s36b (Grace, running club ranked by betweenness):
# the Values histogram of a Betweenness run on friends.csv draws 20 bars of equal height
# for 20 different values (2.583 to 51.27, median 11.2).
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" "setup:$here/setup.txt"
R --step "$here" --click-at 659,864
R --step "$here" --click "Betweenness"
R --step "$here" --click "Run"
R --step "$here" --click "Bridges"
R --end "$here"
