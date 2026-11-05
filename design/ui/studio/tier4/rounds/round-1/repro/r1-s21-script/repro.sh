#!/bin/bash
# Repro for r1-s21: the weight's reading control is labeled "Higher means" on screen but is named
# "Higher weight means" for assistive technology, and clicking the visible label opens nothing.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s21
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/pantries-joined.txt
node $T/real.mjs --step "$R" --click "Add to edge fields"
node $T/real.mjs --step "$R" --click "role=menuitem:Weight"
node $T/real.mjs --step "$R" --click "role=option:trips"
node $T/real.mjs --step "$R" --click "Higher means" --read
node $T/real.mjs --step "$R" --click "role=combobox:Higher weight means"
node $T/real.mjs --end "$R"
