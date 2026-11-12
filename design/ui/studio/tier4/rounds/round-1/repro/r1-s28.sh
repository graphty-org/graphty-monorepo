#!/bin/bash
# Repro for r1-s28: in a keyboard-only session, the second F6 moves focus onto the drawing and no
# focus ring is drawn anywhere; the next Tab skips the bottom toolbar and lands in the right panel.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s28
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
export REAL_TIER=4
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/volunteers.txt --keys
node $T/real.mjs --step "$R" --key F6
node $T/real.mjs --step "$R" --key F6 --read
node $T/real.mjs --step "$R" --key Tab --read
node $T/real.mjs --end "$R"
