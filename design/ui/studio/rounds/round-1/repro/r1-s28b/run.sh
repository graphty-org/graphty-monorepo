#!/usr/bin/env bash
# Scripted repro of the build defects graded in session r1-s28b (Dev, Florentine families sized by betweenness).
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --click "Florentine families"
echo "== A: after a Betweenness run the legend box covers a node (14 of 15 dots visible) ==" | tee -a "$here/session.log"
R --step "$here" --click-at 659,864
R --step "$here" --click "Betweenness"
R --step "$here" --click "Run"
echo "== B: Size line's 'Open list' opens an empty dropdown ==" | tee -a "$here/session.log"
R --step "$here" --click "Bridges"
R --step "$here" --click "role=tab:Style"
R --step "$here" --click-at 1419,226
R --step "$here" --click "Size"
R --step "$here" --click-at 1352,256
echo "== C: bind size, then hover the biggest dot: no name shown ==" | tee -a "$here/session.log"
R --step "$here" --key Escape --click "Size by attribute"
R --step "$here" --click-at 1188,324
R --step "$here" --hover-at 700,378
R --end "$here"
