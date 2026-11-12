#!/bin/bash
# Repro for r1-s22: in Data > Fields, an edge Weight's "Higher means" text does not open its list
# when clicked (the list opens only on the box), and the box's accessible name ("Higher weight
# means") does not contain the visible words "Higher means".
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s22
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/gauges-joined.txt
node $T/real.mjs --step "$R" --click "Add to edge fields"
node $T/real.mjs --step "$R" --click "Weight"
node $T/real.mjs --step "$R" --click "role=option:km"
node $T/real.mjs --step "$R" --click "Higher means"
node $T/real.mjs --step "$R" --read
node $T/real.mjs --step "$R" --click "role=combobox:Higher weight means"
node $T/real.mjs --end "$R"
