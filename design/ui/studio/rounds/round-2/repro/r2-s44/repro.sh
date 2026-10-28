#!/usr/bin/env bash
# Repro of round 2 session r2-s44: the same truncated club-members.graphml through both
# "Open project or file..." and "New from data...". Writes PNGs and run.log beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                                   # 02
echo "== A: Open project or file... with the truncated GraphML"
st --click "Open project or file..." --upload club-members.graphml       # 03
echo "== B: New from data... -- does the first refusal survive?"
st --click "New from data..."                                            # 04
echo "== C: the same file through New from data..."
st --click "choose a file..." --upload club-members.graphml              # 05
st --click "File settings"                                               # 06
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
