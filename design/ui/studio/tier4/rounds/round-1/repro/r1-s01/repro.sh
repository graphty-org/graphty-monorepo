#!/bin/bash
# Repro for r1-s01: the join screen's "1 new node" chip does nothing when clicked, and the
# "1 repeated key" menu marks no current choice and names no repeated row.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s01
F=$T/files
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
rm -rf "$R"
node $T/real.mjs --start "$R" empty
node $T/real.mjs --step "$R" --click "Open a file" --upload $F/pantries.csv
node $T/real.mjs --step "$R" --click "Data" --click "Add source" --click "File..." --upload $F/deliveries.csv
node $T/real.mjs --step "$R" --click "1 new node"
node $T/real.mjs --step "$R" --click "1 repeated key" --read
node $T/real.mjs --end "$R"
