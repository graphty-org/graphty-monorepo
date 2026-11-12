#!/usr/bin/env bash
# Repro of round 3 session r3-s53 (T3, friends.csv dropped on the start page).
# Checks: clicking the single "friends.csv" row under Data > Sources -- does anything open
# (details, the edge table, a "rows read / skipped" statement), or does the row only highlight?
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                      # 02
st --drop friends.csv                       # 03 drawn at once
st --click "From friends.csv" --read        # 04 Data > Sources: "41 rows, 41 edges"
st --click "friends.csv" --read             # 05 the row: does anything open?
st --key Enter --read                       # 06 the same row by keyboard
node "$T" --end "$S"
} > "$here/run.log" 2>&1
echo "exit $?"
