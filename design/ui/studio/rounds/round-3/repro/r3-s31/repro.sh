#!/usr/bin/env bash
# Repro of round 3 session r3-s31 (T11, Les Miserables, untangle the drawing).
# Checks three things the session met:
#  1. After Spectral is applied, most nodes sit in one small lump at the bottom of the canvas,
#     partly under the floating toolbar (the fit frames the two long arms, not the toolbar inset).
#  2. After Force is applied with Shape 2D, the toolbar's view button still reads "3D".
#  3. Circle with its default Shape 3D draws a ball, not a ring.
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"   # 02 sample drawn
st --click "Layout" --click "Circle"              # 03 Circle form, Shape 3D
st --click "Apply"                                # 04 a ball, not a ring
st --click "Layout" --click "Spectral"            # 05 Spectral form
st --click "Apply"                                # 06 lump at the bottom, under the toolbar?
st --click "Layout" --click "Force"               # 07 Force form
st --click "2D" --click "Apply"                   # 08 flat drawing; toolbar still "3D"?
st --hover-at 768,864                             # 09 what the toolbar "3D" button is named
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
