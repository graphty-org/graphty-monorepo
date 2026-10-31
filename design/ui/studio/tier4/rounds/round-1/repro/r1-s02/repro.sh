#!/bin/bash
# Repro for r1-s02: picking "Join" in the join screen's "Join choices" menu closes the menu and
# joins nothing; after Join and "Leave out" on the one unknown end, the flows.csv Sources row keeps
# an unlabeled "1" and the issue list names neither the left-out row nor the folded repeat.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s02
F=$T/files
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
rm -rf "$R"
node $T/real.mjs --start "$R" empty
node $T/real.mjs --step "$R" --click "Open a file" --upload $F/gauges.csv
node $T/real.mjs --step "$R" --click "Data" --click "Add source" --click "File..." --upload $F/flows.csv
node $T/real.mjs --step "$R" --click "Join choices"
node $T/real.mjs --step "$R" --click "role=menuitem:Join" --read
node $T/real.mjs --step "$R" --click "role=button:Join"
node $T/real.mjs --step "$R" --click "1 issue in flows.csv"
node $T/real.mjs --step "$R" --click "Leave out" --read
node $T/real.mjs --step "$R" --click "Close panel" --read
node $T/real.mjs --end "$R"
