#!/bin/bash
# Repro for r1-s16: after every issue in gauges.csv is fixed, the source row still shows the
# warning mark with a count of 0; and dragging the table's scrollbar closes the open issue list.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s16
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/gauges.txt
node $T/real.mjs --step "$R" --click-at 232,134
node $T/real.mjs --step "$R" --drag 600,868 1150,868
node $T/real.mjs --step "$R" --click-at 232,134 --click Trim --click "Make blank" --click "Read as yes/no" --read
node $T/real.mjs --step "$R" --click-at 600,250 --read
node $T/real.mjs --end "$R"
