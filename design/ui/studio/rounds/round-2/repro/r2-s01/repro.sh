#!/usr/bin/env bash
# Keyboard-only repro of round 2 session r2-s01 (College football, names on every dot).
# Run from anywhere; writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
T7=(); for i in 1 2 3 4 5 6 7; do T7+=(--key Tab); done
T15=(); for i in $(seq 15); do T15+=(--key Tab); done
{
node "$T" --start "$S" empty --sr
echo "== A: open College football from the keyboard; where is focus?"
st "${T7[@]}" --key Enter                                   # 02
echo "== to the Everything row"
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Shift+Tab --key ArrowLeft   # 03 Graph Style
st --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key ArrowDown --key Enter  # 04 Everything
echo "== add the label line bound to label"
st "${T15[@]}"                                              # 05 focus on Label
st --key Enter --key ArrowDown --key Enter                  # 06 label line, 14 hidden
echo "== B: Shift+Tab from Aa onto the dimmed + beside Label: is a ring drawn?"
st --key Shift+Tab                                          # 07
echo "== C: Shift+Tab to Label, Enter: does anything happen?"
st --key Shift+Tab --key Enter                              # 08
echo "== D: 5 (2D): hidden count and the bottom of the drawing"
st --key 5                                                  # 09
st --key 0                                                  # 10 Fit
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
