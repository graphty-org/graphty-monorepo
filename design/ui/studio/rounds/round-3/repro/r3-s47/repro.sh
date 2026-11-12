#!/usr/bin/env bash
# Repro of round 3 session r3-s47 (T14 in screen-reader mode: Control+s, name, Enter, close the
# tab, reopen from Recent projects by keyboard, then Main menu > "Save local copy...").
# Checks, from the printed focus and live-region text:
#  1. After Enter in the save dialog, focus falls to the page body.
#  2. After Enter on the Recent projects row, focus falls to the page body.
#  3. "Save local copy..." writes a .graphty.json file and the app announces nothing.
# Writes run/ and run.log beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" setup:"$here/../../setups/T14.txt" --sr
st --key Control+s                                         # Name field
st --key Control+a --type "Repro r3-s47"
st --key Enter                                             # check 1
st --reopen
st --key Tab --key Tab --key Tab --key Tab --key Tab       # the Recent projects row
st --key Enter                                             # check 2
st --key Tab                                               # Main menu (first stop from the body)
st --key Enter
st --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown
st --key Enter                                             # check 3
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
