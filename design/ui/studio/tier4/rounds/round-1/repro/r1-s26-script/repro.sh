#!/bin/bash
# Repro for r1-s26: GraphML export with one node left out of the picture. The export screen says
# "node visible not written" and "Reopened: layers as layers", yet the saved file writes that
# node's hidden state (graphty.style.node.hidden = true); the done notice names no location.
set -u
W=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4
T=$W/design/ui/studio/tool
R=$W/design/ui/studio/tier4/rounds/round-1/repro/r1-s26
export REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292
rm -rf "$R"
node $T/real.mjs --start "$R" setup:$W/design/ui/studio/rounds/tier-4/setups/gauges-narrowed.txt
node $T/real.mjs --step "$R" --click "Main menu" --click "Export..." --click "Format" --click "role=option:GraphML" --read
node $T/real.mjs --step "$R" --click "Export"
node $T/real.mjs --step "$R" --click "Save anyway"
node $T/real.mjs --end "$R"
f=$(ls "$R"/downloads/*.graphml)
echo "nodes: $(grep -c '<node ' "$f")  edges: $(grep -c '<edge ' "$f")"
grep -n 'graphty.style.node.hidden' "$f"
grep -n -A1 'node id="G12"' "$f"
