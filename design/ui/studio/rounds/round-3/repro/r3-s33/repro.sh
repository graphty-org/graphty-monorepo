#!/usr/bin/env bash
# Repro of round 3 session r3-s33 (T11, Les Miserables, untangle the drawing).
# Checks two things the session met:
#  1. Layout > Spectral > Apply crushes nearly every node into one small clump in a corner of the
#     canvas, with a few nodes flung far away on long edges, and no notice. Seen in 09.png.
#  2. Undo brings the previous arrangement back but does not refit the camera: the drawing sits
#     in the top half of the canvas, its top cut off at the edge. Seen in 11.png.
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                      # 02
st --click "Les Miserables"                 # 03 sample drawn with Force
st --click "Layout"                         # 04 layout list
st --click "Spectral"                       # 05 Spectral form
st --click "Apply"                          # 06 clump plus outliers?
st --click "Undo"                           # 07 old arrangement, framed or cut off?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
