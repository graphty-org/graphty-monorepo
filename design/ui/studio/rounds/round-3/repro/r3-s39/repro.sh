#!/usr/bin/env bash
# Repro of round 3 session r3-s39 (T6, Les Miserables, screen-reader mode, keyboard only).
# Checks what the session met:
#  1. Enter on "Open the Les Miserables sample" leaves focus on the page body.
#  2. The rail's "Graph" is read as a plain button with no state; Right Arrow does not move to
#     "Data" (Down Arrow is printed for comparison); Tab skips "Data".
#  3. Escape from the "?" shortcuts dialog leaves focus on the page body.
#  4. Shift+T opens the table; focus does not move into it.
#  5. From the drawing ("Graph drawing"), "?" then Escape leaves focus on the page body.
# Writes run/ and run.log beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
st --key Tab --key Tab --key Tab --key Tab --key Tab     # 02 on "Open the Les Miserables sample"?
st --key Enter --wait 1500                              # 03 focus after load
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab   # 04 on "Graph": role and state
st --key Tab                                            # 05 skips "Data"?
st --key Shift+Tab --key ArrowRight                     # 06 Right Arrow on "Graph"
st --key ArrowDown                                      # 07 Down Arrow on "Graph"
st --key Escape --key "?"                               # 08 shortcuts dialog
st --key Escape                                         # 09 focus after closing it
st --key Shift+T --wait 1000                            # 10 focus after the table opens
st --key Tab --key Tab --key Tab --key Tab               # 11 on "Graph drawing"?
st --key "?"                                            # 12 shortcuts dialog from the drawing
st --key Escape                                         # 13 focus after closing it
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
