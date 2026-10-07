#!/usr/bin/env bash
# Repro of round 3 session r3-s32 (T11, Les Miserables, untangle the drawing).
# Checks two things the session met:
#  1. Layout > Spectral > Apply piles almost every node into one small ball in a corner, with a few
#     outliers far away, and no message (session 06.png). Run twice to show it is the same each time.
#  2. Undo after that Apply brings the earlier positions back but the view does not refit: the
#     drawing sits cut off at the top edge of the canvas (session 07.png).
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"   # 02 sample drawn (Force)
st --click "Layout"                               # 03 method list
st --click "Spectral"                             # 04 Spectral form
st --click "Apply"                                # 05 collapse?
st --click "Undo"                                 # 06 old positions: cut off at the top?
st --click "Layout" --click "Spectral"            # 07
st --click "Apply"                                # 08 collapse again, same shape?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
