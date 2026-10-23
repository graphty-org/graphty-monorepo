#!/usr/bin/env bash
# Keyboard-only repro of round 2 session r2-s07, menu path: Main menu > Export... with Enter.
# Does focus enter the Export dialog, or go back to the Main menu button behind it?
# Writes PNGs and run-menu.log into ./run-menu/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run-menu"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
echo "== open Les Miserables (5 Tabs, Enter), wait"
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Enter
st --wait 3000
echo "== Tab from the drawing round to Main menu (as Morgan did)"
for i in $(seq 8); do st --key Tab; done
echo "== Enter on Main menu"
st --key Enter
echo "== ArrowDown x7 to Export, Enter"
for i in $(seq 7); do st --key ArrowDown; done
st --key Enter
echo "== Tab x3: dialog controls, or the page behind?"
for i in 1 2 3; do st --key Tab; done
echo "== Control+e while the dialog is open"
st --key Control+e
node "$T" --end "$S"
} 2>&1 | tee "$here/run-menu.log"
