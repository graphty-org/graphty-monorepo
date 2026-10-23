#!/usr/bin/env bash
# Repro for round 2 session r2-s43: the same damaged GraphML file is refused with two different
# messages. "Open project or file..." says the file is incomplete or damaged near line 9 and to ask
# for it again; "New from data..." says only that it "could not be read as GraphML" and suggests
# picking another format in File settings -- no cause, no line, and advice that points the other
# way. Writes PNGs and run.log into ./run/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Open project or file..." --upload club-members.graphml   # 02 detailed refusal
st --click "New from data..."                                                           # 03
st --click "choose a file..." --upload club-members.graphml                             # 04 short refusal
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
