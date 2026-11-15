#!/bin/bash
# Repro for r1-s11: opening volunteers.graphml shows Fields > "Coordinates: phone" with nobody
# setting it -- the phone column (text like "+1 555 0101", 70% filled) is taken for a location
# column -- while data.json's columns give phone no role.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s11
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:volunteers.txt
node $T/real.mjs --step "$R" --click Data --read
node $T/real.mjs --end "$R"
