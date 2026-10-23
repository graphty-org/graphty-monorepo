#!/usr/bin/env bash
# Scripted repro of the build defects graded in session r1-s21b (the Medici's marriages).
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --click "Florentine families"
R --step "$here" --click-at 175,90 --type "Medici" --key ArrowDown --key Enter
echo "== A: Neighborhood: summary reads Edges 0 beside Edges among them 7, one name with (1) ==" | tee -a "$here/session.log"
R --step "$here" --click "Neighborhood"
echo "== B: click the Selection row: the inspector empties to the word Selection ==" | tee -a "$here/session.log"
R --step "$here" --click-at 121,124
echo "== C: Data tab, Edge table row opens the Add-to import page ==" | tee -a "$here/session.log"
R --step "$here" --click-at 28,130
R --step "$here" --click-at 157,200
R --step "$here" --click "Cancel"
echo "== D: success path check: select Medici, click Degree ==" | tee -a "$here/session.log"
R --step "$here" --key Escape --click-at 28,75
R --step "$here" --click-at 175,90 --type "Medici" --key ArrowDown --key Enter
R --step "$here" --click "Degree"
R --end "$here"
