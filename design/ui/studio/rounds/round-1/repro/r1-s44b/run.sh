#!/usr/bin/env bash
# Scripted repro for session r1-s44b (Alex, change the layout of Les Miserables).
# Checks whether "Force, flat" ever settles into clusters or stays an even disc, and where Spectral
# puts the nodes. Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
echo "== A: open Les Miserables, open Layout, pick Force, flat ==" | tee -a "$here/session.log"
R --step "$here" --click "No thanks" --click "Les Miserables"
R --step "$here" --click "Layout" --click "Method"
R --step "$here" --click "Force, flat"
echo "== B: wait 5 s and 20 s more: does the disc change? ==" | tee -a "$here/session.log"
R --step "$here" --wait 5000
R --step "$here" --wait 20000
echo "== C: Spectral ==" | tee -a "$here/session.log"
R --step "$here" --click-at 708,768 --click "Spectral"
R --step "$here" --wait 5000
R --end "$here"
