#!/usr/bin/env bash
# Repro of round 3 session r3-s18 (names on every dot, College football, keyboard-only participant).
# Replays the participant's keys and checks three things the session met:
#  1. After Enter on the College football sample card, where focus goes (the next Tab should
#     not restart at the main menu if focus landed on the drawing).
#  2. Whether the disabled Redo button shows a focus ring when tabbed to.
#  3. What the tall blue bar between the left panel and the drawing is when it has focus
#     (its role and accessible name).
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --read   # 02 on the College football card
st --key Enter --wait 1500 --read                                                 # 03 sample drawn: where is focus?
st --key Tab --read                                                               # 04 next Tab
st --key Tab --key Tab --key Tab --read                                           # 05 redo: ring?
st --key Tab --key Tab --key Tab --key Tab --read                                 # 06 Selection
st --key Tab --read                                                               # 07 the blue bar
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
