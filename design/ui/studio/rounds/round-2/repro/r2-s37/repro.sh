#!/usr/bin/env bash
# Repro for round 2 session r2-s37 (T14, screen-reader mode, keyboard only), Morgan's own keys:
#  - Escape from the header's inline rename field leaves focus on the page body (step 04).
#  - Main menu > "Back to start" leaves focus on the page body and announces nothing (step 07).
#  - Opening the project from Recent projects makes two announcements, "No nodes to draw" and
#    "Opened <name>", where one is asked for (step 10).
#  - After the reopen the Influence row no longer shows its count "77" (step 10 PNG vs 01).
# Writes PNGs and run.log into ./run/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" "setup:$here/../../setups/T14.txt" --sr      # 01 focus Analyze, Influence 77
st --key Control+s --key Control+a --type "Repro Morgan"           # 02 Name field
st --key Enter                                                     # 03 "Saved Repro Morgan in this browser."
st --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab \
   --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Enter --key Escape  # 04 project name -> rename -> Escape: focus on page
st --key Tab --key Shift+Tab                                       # 05 Main menu
st --key Enter                                                     # 06 Back to start
st --key Enter                                                     # 07 start screen: focus on page, no announcement
st --reopen                                                        # 08
st --key Tab --key Tab --key Tab --key Tab --key Tab               # 09 Recent projects grid cell
st --key Enter                                                     # 10 two announcements; Influence row without 77
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
