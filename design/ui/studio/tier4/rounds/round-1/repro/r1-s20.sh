#!/bin/bash
# Repro for r1-s20: on the joined gauges network the table's "With issues 11" chip counts 11 rows
# while only two cells (Willow Run, Stone Weir's "-") are flagged, and turning it on narrows the
# Nodes table to 11 rows, dropping G12 (the gauge only in flows.csv) with no row-count change in
# the bar ("12 nodes" stays). Clicking the already-ticked Latitude in lat's Role menu changes
# nothing on screen and gives no notice.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s20
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/gauges-joined.txt
node $T/real.mjs --step "$R" --wheel 740,700,600
node $T/real.mjs --step "$R" --click "With issues 11"
node $T/real.mjs --step "$R" --wheel 740,700,600
node $T/real.mjs --step "$R" --click "Options for lat" --click Role --click Latitude
node $T/real.mjs --step "$R" --click "Options for lat" --click Role
node $T/real.mjs --end "$R"
