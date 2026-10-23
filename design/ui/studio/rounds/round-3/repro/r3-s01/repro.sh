#!/usr/bin/env bash
# Repro of round 3 session r3-s01 (T15 A, Les Miserables, screen-reader participant).
# Checks two things the session met:
#  1. Export with View "Whole graph" in the default 3D view: does the picture show the drawing
#     from the same side as the screen, or a different camera angle? A "Current view" export is
#     saved beside it for comparison.
#  2. The "?" shortcut (listed in Main menu as "Keyboard shortcuts ?") pressed while focus is on
#     the "Show all labels" checkbox.
# Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "Les Miserables"                 # 02 sample drawn
st --key Shift+A                            # 03
st --type betw                              # 04
st --key Enter                              # 05 Betweenness form, Run focused
st --key Enter --wait 2000                  # 06 run
st --click "Betweenness"                    # 07 run row
st --click "Add to Shape"                   # 08
st --click "Size"                           # 09
st --click "role=option:Betweenness"        # 10 size bound
st --click "Add label line"                 # 11
st --click "role=option:name"               # 12 names drawn
st --click "Show all labels"                # 13 every name
st --key ? --wait 500 --read                # 14 does "?" open the shortcuts list?
st --key Escape                             # 15
st --key Control+e --wait 800               # 16 export dialog
st --click "role=button:Export" --wait 2000 # 17 current-view file
st --key Control+e --wait 800               # 18 export dialog again
st --click "role=combobox:View"             # 19
st --click "role=option:Whole graph"        # 20
st --click "role=button:Export" --wait 2000 # 21 whole-graph file
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
