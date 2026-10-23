#!/usr/bin/env bash
# Repro of round 2 session r2-s16 (College football, names on every dot): the
# "N hidden to avoid overlap" count while zooming in, and the label line added
# while one node is selected. Writes PNGs and run.log into ./run-<n>/ beside this script.
# Usage: repro.sh [run number]
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run-${1:-1}"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "College football"                                  # 02
echo "== A: select one node, then Style > Add label line > label"
st --click-at 768,602                                          # 03
st --click "role=tab:Style"                                    # 04
st --click "Add label line" --click "label" --expect "hidden to avoid overlap"   # 05
echo "== B: Everything > Add label line > label"
st --click "Everything"                                        # 06
st --click "Add label line" --click "label" --expect "hidden to avoid overlap"  # 07
echo "== C: zoom in step by step; does the hidden count fall?"
st --wheel 720,600,-600   --expect "hidden to avoid overlap"   # 08
st --wheel 640,560,-2000  --expect "hidden to avoid overlap"   # 09
st --wheel 640,600,-4000  --expect "hidden to avoid overlap"   # 10
node "$T" --end "$S"
} 2>&1 | tee "$S.log"
