#!/usr/bin/env bash
# Repro for round 2 session r2-s40 (Les Miserables, Layout):
#  - after Spectral then Undo, the camera keeps Spectral's framing (drawing pushed off the top);
#  - typing a new Force "Spring length" leaves the button "Applied" (grey) until the field loses focus;
#  - Force with spring length 80 leaves a scrambled cloud that does not settle.
# Writes PNGs and run.log into ./run/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"          # 02 default Force drawing
st --click "Layout"                                       # 03 layout list
st --click "Spectral"                                     # 04 Spectral form
st --click "Apply"                                        # 05 Spectral drawn
st --click "Undo"                                         # 06 Force back; camera framing?
st --click "Layout"                                       # 07
st --click "Force"                                        # 08 Force form, "Applied"
st --click "Spring length" --key Control+a --type "80"    # 09 field 80; button still "Applied"?
st --key Tab                                              # 10 button "Apply"
st --click "Apply"                                        # 11 spring 80 drawn
st --wait 4000                                            # 12 still a cloud?
st --wait 8000                                            # 13 still a cloud?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
