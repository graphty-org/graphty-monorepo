#!/usr/bin/env bash
# Nadia's path on Florentine families: PageRank, then Size bound to Influence.
# Checks two things at the end state: (1) the legend box covers a node at the top left
# (before the run 531,83 is node "Pazzi"; after sizing it is the legend);
# (2) hovering the biggest node (Medici) shows no name.
set -e
T="$(cd "$(dirname "$0")/../../../../tool" && pwd)"
D="$(cd "$(dirname "$0")" && pwd)"
cd "$T"
node real.mjs --start "$D" empty
node real.mjs --step "$D" --click "No thanks" --click "Florentine families"
node real.mjs --step "$D" --hover-at 531,83            # expect: node with id "Pazzi"
node real.mjs --step "$D" --click-at 679,864 --click "PageRank"
node real.mjs --step "$D" --click "Run"
node real.mjs --step "$D" --click "Influence"
node real.mjs --step "$D" --click-at 1419,234 --click "Size"
node real.mjs --step "$D" --click-at 1380,264 --click "role=option:Influence"
node real.mjs --step "$D" --hover-at 531,83            # expect: the legend, not the node
node real.mjs --step "$D" --hover-at 700,378           # expect: node "Medici", tooltip null
node real.mjs --end "$D"
