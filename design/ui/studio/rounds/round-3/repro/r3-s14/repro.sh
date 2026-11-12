#!/usr/bin/env bash
# Repro of round 3 session r3-s14 (T10 A, Les Miserables, screen-reader participant).
# Replays the session's keys in screen-reader mode and checks:
#  1. Opening a sample with Enter drops focus to the page body (step 03).
#  2. Quick actions: a word with no match is not announced; "No results" only on read (05, 06).
#  3. Quick actions: "Add label line" is listed disabled with no reason given (07, 08).
#  4. The canvas Style tab reads Gravity as "-1.2000000476837158" (09, 10).
#  5. Choosing "Everything" in the outline is not announced (11, 12).
#  6. The label count "77 labels, 7 hidden" and the "77 labels" after Show all labels (14-16).
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
st --key Tab --key Tab --key Tab --key Tab --key Tab           # 02 "Open the Les Miserables sample"
st --key Enter                                                 # 03 sample opens; focus drops?
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab \
   --key Tab --key Tab --key Tab \
   --key ArrowRight --key ArrowRight --key ArrowRight --key Enter  # 04 Quick actions open
st --type names                                                # 05 no announcement?
st --read                                                      # 06 "No results"
st --key Control+a --type label                                # 07
st --read                                                      # 08 "Add label line" disabled
st --key Escape --key Tab --key Tab --key Tab --key ArrowLeft  # 09 Style tab (canvas)
st --read                                                      # 10 Gravity value
st --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab \
   --key Shift+Tab --key Shift+Tab --key Tab --key ArrowDown   # 11 on "Everything"
st --key Enter                                                 # 12 chosen; any live text?
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab \
   --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab \
   --key Tab --key Tab --key Tab --key Tab                     # 13 to "Add label line"
st --key Enter --key ArrowDown --key Enter --wait 1000         # 14 name chosen
st --key Tab --key Tab --key Tab --key Space --wait 1000       # 15 Show all labels
st --read                                                      # 16
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
