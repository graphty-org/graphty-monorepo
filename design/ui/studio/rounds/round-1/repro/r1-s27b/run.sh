#!/usr/bin/env bash
# Scripted repro of session r1-s27b (Florentine families, size dots by Influence).
# Checks whether the Size field's "Open list" arrow opens an empty list, and whether the
# success path ("Size by attribute") works on the same build.
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --click "Florentine families"
R --step "$here" --key Shift+A --type "PageRank" --click "PageRank"
R --step "$here" --click "Run"
R --step "$here" --click "Influence"
R --step "$here" --click "role=tab:Style"
R --step "$here" --click "Add to Shape"
R --step "$here" --click "Size"
echo "== A: the Size field's Open list arrow: expect an empty, thin list with no choices ==" | tee -a "$here/session.log"
R --step "$here" --click "Open list"
R --step "$here" --expect-not "role=option"
echo "== B: success path: Size by attribute, then Influence ==" | tee -a "$here/session.log"
R --step "$here" --key Escape --click "Size by attribute"
R --step "$here" --click "role=option:Influence"
R --step "$here" --expect "Size: Influence"
R --end "$here"
