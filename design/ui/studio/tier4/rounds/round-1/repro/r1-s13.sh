#!/bin/bash
# Repro for r1-s13: the table header's issue mark shows no tooltip and a default cursor on hover,
# and clicking a flagged cell selects the node without saying what is wrong with the value.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s13
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/pantries.txt
node $T/real.mjs --step "$R" --click "With issues 2"
node $T/real.mjs --step "$R" --hover-at 860,509
node $T/real.mjs --step "$R" --click-at 824,542 --read
node $T/real.mjs --step "$R" --click-at 860,509
node $T/real.mjs --end "$R"
