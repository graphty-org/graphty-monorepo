#!/bin/bash
# Repro for r1-s15: clicking a value the table marks as an issue selects its node, and neither the
# table nor the inspector then says what is wrong with it or offers the fix. Also shows that hovering
# a column header's warning mark does open the one-line fix list.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s15/walk
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/pantries.txt
node $T/real.mjs --step "$R" --click "With issues 2"
node $T/real.mjs --step "$R" --click "Northgate Center" --read
node $T/real.mjs --step "$R" --hover-at 860,509 --read
node $T/real.mjs --end "$R"
