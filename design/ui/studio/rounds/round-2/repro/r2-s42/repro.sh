#!/usr/bin/env bash
# Replays the session's pointer path on Les Miserables to check, on the build:
# Force in 2D still leaves a 3D orbit camera ("3D" in the toolbar, a canvas drag rotates);
# Ctrl+Z after Spectral restores the node positions but not the view, leaving the drawing off-center;
# "Rings by group" stays disabled after Louvain made communities.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"                       # 02 loaded
st --click "Layout" --click-at 594,446 --click "2D" --click "Apply"    # 03 Force in 2D, toolbar label
st --click-at 680,864 --type "modularity" --click "Louvain" --click "Run"   # 04 communities
st --click "Layout"                                                   # 05 list after Louvain
st --click-at 619,558                                                 # 06 Rings by group: does anything happen?
st --key Escape --click "Layout" --click "Spectral" --click "Apply"    # 07 Spectral
st --key Control+z                                                    # 08 undo: positions back, view?
st --drag 900,600 1150,850                                            # 09 canvas drag: pan or rotate?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
