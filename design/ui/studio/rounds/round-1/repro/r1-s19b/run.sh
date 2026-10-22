#!/usr/bin/env bash
# Scripted repro of the build defects graded in session r1-s19b (Javert's neighbors).
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --click "Les Miserables"
R --step "$here" --click-at 180,90 --type "Javert" --key ArrowDown --key Enter
R --step "$here" --click "Neighborhood"
echo "== A: click the Selection row, no Escape first ==" | tee -a "$here/session.log"
R --step "$here" --click-at 121,124
echo "== B: wheel zoom over the drawing ==" | tee -a "$here/session.log"
R --step "$here" --wheel 750,500,-600
R --step "$here" --wheel 750,500,-600 --wheel 750,500,-600
echo "== C: Data tab, Node table row ==" | tee -a "$here/session.log"
R --step "$here" --click-at 28,130
R --step "$here" --click-at 160,168
R --end "$here"
