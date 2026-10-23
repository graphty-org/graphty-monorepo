#!/usr/bin/env bash
# Keyboard-only repro of round 2 session r2-s07, the Size field: it is announced as a combobox,
# and Alt+ArrowDown (the usual "open the list" key) lowers its value instead.
# Writes PNGs and run-size.log into ./run-size/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run-size"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
echo "== open Les Miserables, run Degree (Shift+A, type degree, Enter, Enter)"
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Enter
st --wait 3000
st --key Shift+A
st --type degree
st --key Enter
st --key Enter
st --wait 2000
echo "== Shift+Tab to the outline, select Connections"
for i in 1 2 3 4; do st --key Shift+Tab; done
st --key ArrowDown --key Enter
echo "== Tab to Add to Shape (Morgan's path), Enter, Enter on Size"
for i in $(seq 13); do st --key Tab; done
st --key Enter
st --key Enter
echo "== Alt+ArrowDown on the Size field"
st --key Alt+ArrowDown
node "$T" --end "$S"
} 2>&1 | tee "$here/run-size.log"
