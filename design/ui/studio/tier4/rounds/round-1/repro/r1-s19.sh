#!/bin/bash
# Repro for r1-s19: on the joined pantries network, the inspector offers "Time: opened / Set in Data"
# while the opened header's Role menu ticks None; lat and lon carry Latitude / Longitude ticks in
# their Role menus but no role chip on their headers, unlike the Time chip opened gets.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s19
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/pantries-joined.txt
node $T/real.mjs --step "$R" --click "Options for opened" --click Role
node $T/real.mjs --step "$R" --key Escape --key Escape --click "Options for lat" --click Role
node $T/real.mjs --step "$R" --key Escape --key Escape --click "Options for opened" --click Role --click Time
node $T/real.mjs --end "$R"
