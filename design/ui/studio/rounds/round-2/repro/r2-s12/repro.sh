#!/usr/bin/env bash
# Repro for round 2 session r2-s12 (Les Miserables, names on Everything): does the label line's
# "N hidden to avoid overlap" count go DOWN and then back UP as the reader keeps zooming in?
# Same clicks and wheel turns as the session, run twice into ./run-1/ and ./run-2/.
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
st --click "No thanks" --click "Les Miserables"          # 02
st --click "Everything"                                  # 03
st --click "Add label line"                              # 04
st --click "role=option:name"                            # 05 names drawn: count A
st --key Escape --wheel 700,420,-600                     # 06 count B
st --wheel 640,420,-2500                                 # 07 count C
st --wheel 700,420,-5000                                 # 08 count D
st --wheel 700,420,-5000                                 # 09 count E (further)
node "$T" --end "$S"
} 2>&1 | tee "$here/run-$n.log"
done
