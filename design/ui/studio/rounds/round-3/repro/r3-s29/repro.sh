#!/usr/bin/env bash
# Repro of round 3 session r3-s29 (T9 B, Florentine families, sighted, PageRank).
# Checks: after the PageRank run, the key drawn in the canvas's top-left corner covers the
# family dot that sits there (about 531,84 at 1440 x 900), so that family's size and color
# cannot be seen. Hovers the spot before the run, after it, and after sizes are bound.
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Florentine families"   # 02 the dot at top-left is visible
st --hover-at 531,84                                     # 03 what is under the pointer before
st --click-at 680,864                                    # 04 Analyze
st --click "role=option:PageRank"                        # 05
st --click "Run"                                         # 06 key appears top-left
st --hover-at 531,84                                     # 07 what is under the pointer now
st --click "role=treeitem:PageRank"                      # 08 the run row, Style
st --click-at 1420,234                                   # 09 Shape +
st --click "Size"                                        # 10
st --click "role=option:PageRank"                        # 11 sizes bound, key grows
st --hover-at 531,84                                     # 12
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
