#!/usr/bin/env bash
# Repro of round 3 session r3-s22 (T12 B, Florentine families, keyboard-only participant).
# Walks the session's keys in screen-reader mode so the focused element is printed after each.
# Checks: (1) where focus is after a sample opens from the keyboard, and where the next Tab goes;
# (2) whether the disabled redo button takes a Tab stop and shows a focus ring (run/09.png).
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
for i in 1 2 3 4 5 6 7 8; do st --key Tab; done   # 02-09: to the Florentine families card
st --key Enter --wait 1500                         # 10: sample opens; where is focus?
st --key Tab                                       # 11: first Tab after opening
st --key Tab                                       # 12
st --key Tab                                       # 13
st --key Tab                                       # 14: the participant met disabled redo here
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
