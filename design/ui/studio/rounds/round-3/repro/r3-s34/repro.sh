#!/usr/bin/env bash
# Repro of round 3 session r3-s34 (T11, Les Miserables, untangle the drawing).
# Checks what the session met:
#  1. Layout > Spectral > Apply piles almost every node into one small ball, and the view is not
#     refitted: the ball sits at the bottom edge of the canvas, partly under the toolbar (session 08.png).
#  2. A mouse-wheel zoom over that ball does not zoom toward the pointer; the ball slides further
#     off the canvas edge (session 09.png).
#  3. After a 2D layout (Circle 2D, Force 2D) the toolbar view button still reads "3D" (06.png, 14.png);
#     the last step opens that button to show what it controls.
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"   # 02 sample drawn (Force, 3D)
st --click "Layout" --click "Circle"              # 03 Circle form
st --click "2D" --click "Apply"                   # 04 ring; toolbar still "3D"?
st --click "Layout" --click "Spectral"            # 05 Spectral form
st --click "Apply"                                # 06 collapsed ball at canvas edge?
st --wheel 885,830,-600                           # 07 zoom toward ball, or ball slides off?
st --click "Layout" --click "Force"               # 08 Force form
st --click "2D" --click "Apply"                   # 09 Force flat; toolbar "3D"?
st --click-at 768,864                             # 10 what the toolbar "3D" button controls
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
