#!/usr/bin/env bash
# Repro of round 2 session r2-s46: the Les Miserables overview and Data page, checking which
# truncated or unexplained labels have a tooltip. Writes PNGs and run.log beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                       # 02
st --click "Les Miserables"                                  # 03 overview
echo "== hover Components (no explanation?)"
st --hover "Components"                                      # 04
echo "== hover the cut-off Edges per ... label"
st --hover-at 1265,332                                       # 05
echo "== hover the directed line"
st --hover-at 1330,236                                       # 06
st --click "Data"                                            # 07
echo "== hover the cut-off source names"
st --hover-at 136,136                                        # 08
st --hover-at 158,168                                        # 09
st --hover-at 148,200                                        # 10
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
