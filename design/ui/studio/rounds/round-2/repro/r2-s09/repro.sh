#!/usr/bin/env bash
# Repro for round 2 session r2-s09: on friends.csv sized by Degree ("Connections") with names
# bound to id, two people are unreadable (Eli behind Dev's dot, Farah behind Chloe's dot) while
# the label line says "20 labels, 1 hidden to avoid overlap", and nothing on screen shows the
# hidden one. Same clicks as the session. Runs the path twice into ./run-1/ and ./run-2/.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
for n in 1 2; do
S="$here/run-$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
echo "== run $n"
node "$T" --start "$S" empty
st --click "No thanks"                                  # 02
st --click "Open project or file..." --upload friends.csv  # 03
st --click "Analyze"                                    # 04
st --click "Degree"                                     # 05
st --click "Run"                                        # 06 colored by Connections
st --click "Connections"                                # 07 row selected, Style tab
st --click-at 1419,234                                  # 08 + beside Shape
st --click "Size"                                       # 09
st --click "Size by attribute"                          # 10
st --click "Connections#2"                              # 11 sized
st --click-at 1419,332                                  # 12 + beside Label
st --click "id"                                         # 13 names drawn
node "$T" --end "$S"
} 2>&1 | tee "$here/run-$n.log"
done
