#!/usr/bin/env bash
# Scripted repro of the build defects graded in session r1-s29b (Tom, Florentine families sized by PageRank).
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --click "Florentine families"
echo "== A: PageRank run; the legend box covers the top-left node ==" | tee -a "$here/session.log"
R --step "$here" --key Shift+A
R --step "$here" --type PageRank
R --step "$here" --click "PageRank"
R --step "$here" --click "Run"
echo "== B: Size line's 'Open list' opens an empty dropdown ==" | tee -a "$here/session.log"
R --step "$here" --click "Influence"
R --step "$here" --click "role=tab:Style"
R --step "$here" --click "Add to Shape"
R --step "$here" --click "Size"
R --step "$here" --click "Open list"
echo "== C: bind size to Influence; legend still covers the top-left node ==" | tee -a "$here/session.log"
R --step "$here" --key Escape --click "Size by attribute"
R --step "$here" --click "role=option:Influence"
R --end "$here"
