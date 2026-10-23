#!/usr/bin/env bash
# Scripted repro of the build defects graded in session r1-s17b (Elena, Javert's neighbors).
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --click "Les Miserables"
R --step "$here" --click-at 175,90 --type "Javert" --key ArrowDown --key Enter
echo "== A: Node actions > Neighborhood: header '18 nodes, 0 edges' beside 'Edges among them 61'; id/name 'Babet (1)' ==" | tee -a "$here/session.log"
R --step "$here" --click-at 1419,74
R --step "$here" --click "role=menuitem:Neighborhood"
echo "== B: Data rail, Node table row opens 'Add to Les Miserables' ==" | tee -a "$here/session.log"
R --step "$here" --click-at 28,132
R --step "$here" --click-at 158,168
R --step "$here" --click "Cancel" --click-at 28,76
echo "== C: Selection 18 row empties the inspector ==" | tee -a "$here/session.log"
R --step "$here" --click-at 121,124
echo "== D: hover a selected neighbor: no name shown ==" | tee -a "$here/session.log"
R --step "$here" --hover-at 668,378
R --end "$here"
