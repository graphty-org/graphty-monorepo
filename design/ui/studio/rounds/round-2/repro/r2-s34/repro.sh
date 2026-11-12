#!/usr/bin/env bash
# The legend drawn after a Betweenness run covers the Pazzi node on Florentine families.
# Before the run, 531,83 is the node "Pazzi"; after the run and after binding size, the same
# point is the legend box and a click there selects nothing.
set -e
T="$(cd "$(dirname "$0")/../../../../tool" && pwd)"
D="$(cd "$(dirname "$0")" && pwd)"
cd "$T"
node real.mjs --start "$D" empty
node real.mjs --step "$D" --click "No thanks" --click "Florentine families"
node real.mjs --step "$D" --hover-at 531,83            # prints: node with id "Pazzi"
node real.mjs --step "$D" --key Shift+A --type betweenness --key Enter
node real.mjs --step "$D" --click "Run"
node real.mjs --step "$D" --click "Bridges"
node real.mjs --step "$D" --click "Add to Shape" --click "Size" --click "Size by attribute"
node real.mjs --step "$D" --click "role=option:Bridges"
node real.mjs --step "$D" --click-at 531,83            # prints: the legend, not a node
node real.mjs --end "$D"
