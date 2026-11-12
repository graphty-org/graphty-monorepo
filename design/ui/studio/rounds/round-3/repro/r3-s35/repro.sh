#!/usr/bin/env bash
# Repro of round 3 session r3-s35 (T11, Les Miserables, untangle the drawing).
# Checks two things the session met:
#  1. In the Force layout form, typing a new Gravity value leaves the button reading "Applied"
#     (greyed) until Enter is pressed in the field; there is no "Apply" to click. Seen in 13.png.
#  2. After Force is applied with Shape 2D the toolbar chip still reads "3D". Seen in 11.png, 15.png.
#     The chip is opened at the end to show what it offers.
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                # 02
st --click "Les Miserables"                           # 03 sample drawn with Force, 3D
st --click "Layout" --click "Force"                   # 04 Force form, "Applied"
st --click "2D" --click "Apply"                       # 05 flat drawing; chip still "3D"?
st --click "Layout" --click "Force"                   # 06 Force form again
st --click "Gravity" --key Control+a --type "-4"      # 07 typed -4: still "Applied"?
st --expect "role=button:Apply"                       # 08 is there an Apply button? (expected miss)
st --key Enter                                        # 09 Enter: Apply enabled?
st --click "Apply"                                    # 10 applied
st --click "3D"                                       # 11 what the chip offers
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
