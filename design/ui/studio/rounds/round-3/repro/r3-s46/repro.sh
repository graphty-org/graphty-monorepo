#!/usr/bin/env bash
# Repro of round 3 session r3-s46 (T14, Save as from the main menu, close the tab, reopen from
# Recent projects). Checks two things the session met on the reopened project:
#  1. The PageRank row in the outline shows "77" before the save and no count after the reopen.
#  2. The Graph overview's "Undirected, from the file: ..." line is cut off at the panel edge.
# Writes run/ and run.log beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" setup:"$here/../../../pilot/T14/setup.txt"
st --click "Main menu" --click "Save as..."                 # 02 save dialog
st --type "Repro r3-s46" --click "Save"                     # 03 saved; row "PageRank 77"
st --reopen                                                # 04 start page
st --click "Repro r3-s46" --wait 1500                       # 05 reopened: row count, overview line
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
