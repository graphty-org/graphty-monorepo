#!/usr/bin/env bash
# Repro for round 2 session r2-s15 (screen-reader mode, Les Miserables, names on every dot).
# Keyboard only, the same keys as the session. Checks, in run.log:
#  - opening the sample moves focus to an unnamed "Canvas", announces "No nodes to draw" before
#    "Reading Les Miserables", and never announces that loading finished (step 03/04)
#  - Undo is enabled right after the sample opens, before the reader changed anything (step 05)
#  - the Gravity field reads "-1.2000000476837158" (step 06)
#  - choosing "name" for the label line makes two announcements, "0 labels, 0 hidden to avoid
#    overlap" and then "77 labels, 7 hidden to avoid overlap" (step 10)
#  - the "Label position" dialog's controls come after "Add Tooltip", and Tab walks out of it
#    to the page (step 11/12)
# Writes PNGs and run.log into ./run/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
k() { local a=(); for x in "$@"; do a+=(--key "$x"); done; st "${a[@]}"; }
{
node "$T" --start "$S" empty --sr
k Tab Tab Tab Tab Tab                                  # 02 to "Open the Les Miserables sample"
k Enter                                                # 03 open it
st --wait 3000                                         # 04 listen for "loaded"
k Shift+Tab Shift+Tab Shift+Tab Shift+Tab Shift+Tab Shift+Tab Shift+Tab   # 05 back to Undo
k Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab ArrowRight Tab Tab Tab Tab Tab Tab Tab Tab  # 06 Style tab to Gravity
k Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab ArrowDown Enter   # 07 to the tree, pick Everything
k Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab Tab      # 08 to "Label"
k Enter ArrowDown ArrowDown                            # 09 open the attribute list, arrow through it
st --type "name" --key Enter                           # 10 choose name
k Enter                                                # 11 open "Label position"
k Tab Tab Tab                                          # 12 Tab through it
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
