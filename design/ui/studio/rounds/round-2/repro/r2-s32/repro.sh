#!/usr/bin/env bash
# The legend drawn after a PageRank run covers the Pazzi node on Florentine families.
# Before the run, 531,83 is the node "Pazzi"; after it, the same point is the legend box and a
# click there selects nothing (the panel stays on Graph).
set -e
T="$(cd "$(dirname "$0")/../../../../tool" && pwd)"
D="$(cd "$(dirname "$0")" && pwd)"
cd "$T"
node real.mjs --start "$D" empty
node real.mjs --step "$D" --click "No thanks" --click "Florentine families"
node real.mjs --step "$D" --hover-at 531,83            # prints: node with id "Pazzi"
node real.mjs --step "$D" --key Shift+A --type PageRank --click "PageRank"
node real.mjs --step "$D" --click "Run"
node real.mjs --step "$D" --click-at 531,83            # prints: div (the legend); 06.png panel still "Graph"
node real.mjs --end "$D"
