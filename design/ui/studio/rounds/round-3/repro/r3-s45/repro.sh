#!/usr/bin/env bash
# Repro of round 3 session r3-s45 (T14, save, close the tab, reopen from Recent projects).
# Checks what the session met:
#  1. After a reopen the PageRank row in the outline has lost its count "77".
#  2. "Save local copy..." downloads a file but the app shows and announces nothing.
#  3. The warning "This browser can clear projects kept here" appears only on the start page,
#     not when saving.
# Writes run/ and run.log beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" setup:"$here/../../setups/T14.txt"
st --click "Main menu" --click "Save as..."                     # 02 save dialog
st --type "Repro key characters" --click "Save"                 # 03 saved message, row "PageRank 77"
st --reopen                                                    # 04 start page, Recent projects
st --click "Repro key characters" --wait 1500                  # 05 reopened: row count?
st --click "Main menu" --click "Save local copy..." --wait 1000 # 06 download: any message?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
