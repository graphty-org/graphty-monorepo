#!/usr/bin/env bash
# Replays the session's own pointer path on Les Miserables to check four things on the build:
# Spectral draws a crushed knot plus far outliers and does not fit the view; "Rings by group" stays
# disabled after Louvain made communities; the toolbar still reads "3D" after Force is applied in
# 2D; and Force at spring length 60 settles into a scrambled picture (Apply stays "Applied" until
# Enter).
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"                 # 02 loaded
st --click "Layout" --click "Spectral" --click "Apply"          # 03 Spectral
st --click-at 679,864 --type "cluster" --click "Louvain" --click "Run"   # 04 communities
st --click "Layout"                                             # 05 list after Louvain
st --click "Rings by group"                                     # 06 still disabled?
st --click "Force" --click "2D" --click "Apply"                 # 07 Force 2D, toolbar label
st --click "Layout" --click "Force" --click "Spring length" --key Control+a --type "60"  # 08 Apply state
st --key Enter                                                  # 09 Apply state after Enter
st --click "Apply"                                              # 10 spring 60
st --wait 5000                                                  # 11 settled
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
