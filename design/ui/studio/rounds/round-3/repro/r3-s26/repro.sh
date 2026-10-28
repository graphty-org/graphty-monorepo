#!/usr/bin/env bash
# Repro of round 3 session r3-s26 (T9 A, Les Miserables, screen-reader mode, keyboard only).
# Checks, by the same keys the participant pressed:
#  - focus falls to the page itself after "No thanks" and after opening the sample;
#  - after "No thanks" the first Tab stop is a stray "Change this in Settings > Privacy" button;
#  - binding Size to the run announces nothing (no live text after the Enter);
#  - the legend is text ("Size: Betweenness 0 1624") but names no color ramp direction;
#  - the Values tab reads its histogram as unnamed rows.
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
st --key Tab --key Shift+Tab --key Shift+Tab --key Enter  # No thanks (as in the session) -> focus?
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab   # stray button, then the sample
st --key Enter --wait 3000                                  # open the sample -> focus?
st --key Shift+A --type betw --key Enter --wait 2000        # Betweenness form
st --key Enter --wait 3000                                  # Run
st --read                                                   # legend text
st --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key ArrowDown --key Enter --wait 1000
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
st --key Enter                                              # Add to Shape -> Size
st --key Enter --wait 1000                                  # from-data list
st --type betw --key Enter --wait 2000                      # bind -> any announcement?
st --key Shift+A --key Escape
st --read                                                   # legend with Size row
st --key Tab --key Tab --key Tab --key ArrowRight --wait 1000
st --read                                                   # Values tab
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
