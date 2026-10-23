#!/usr/bin/env bash
# Scripted repro of the build defect graded in session r1-s33b (Dana, friends.csv): selecting a
# loaded table under Data > Sources opens "Add to friends" with an empty Tables list -- the
# source the reader picked is not shown, so there is nothing to edit and no rows to check.
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
files="$here/../../../../tool/files"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks"
R --step "$here" --click "Open project or file..." --upload "$files/friends.csv"
R --step "$here" --click "Data" --expect "41 rows, 41 edges"
echo "== select the Edge table row in Sources ==" | tee -a "$here/session.log"
R --step "$here" --click-at 160,200 --expect "Add to friends" --expect-not "friends.csv"
R --end "$here"
