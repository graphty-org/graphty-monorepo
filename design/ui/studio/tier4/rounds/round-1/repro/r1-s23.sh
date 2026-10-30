#!/bin/bash
# Repro for r1-s23: a Node id filter card counts "1 of 13" while its text box still has focus but
# changes nothing on the canvas and shows no Select | Hide control until focus leaves the box; the
# id card's match list offers no way to leave one value out (no "is not", no "Has no value"), so
# "Is exactly P13" with Hide leaves P13 alone in the picture.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s23
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/pantries-joined.txt
node $T/real.mjs --step "$R" --click "Add filter" --click "Node id"
node $T/real.mjs --step "$R" --click "Node id: how to match"
node $T/real.mjs --step "$R" --click "Is exactly" --click "Type the text to match" --type "P13"
node $T/real.mjs --step "$R" --key Tab
node $T/real.mjs --end "$R"
