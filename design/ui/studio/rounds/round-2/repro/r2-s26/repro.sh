#!/usr/bin/env bash
# Repro of round 2 session r2-s26 (Sam, keyboard only, Florentine families, the Medici's marriages),
# Sam's own keys, in screen-reader mode so the tool prints the focused element after each step.
# Checks: after Enter on the sample card, focus is on the drawing (no ring on screen); Tab goes to
# Analyze and Shift+Tab back to the drawing; "/" puts focus in the find box (a working shortcut
# the box never shows); after choosing Medici, ArrowDown on "Summary values" opens nothing, and
# Tab, Enter on "Degree 6" opens "Medici's 6 connections". Run twice (run1/, run2/).
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
for n in 1 2; do
S="$here/run$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab   # 02 Florentine card
st --key Enter                                                   # 03 sample open: where is focus?
st --key Tab                                                     # 04 Analyze
st --key Shift+Tab                                               # 05 back to the drawing
st --key /                                                       # 06 find box
st --type Medici                                                 # 07 results
st --key ArrowDown                                               # 08
st --key Enter                                                   # 09 Medici, Summary values
st --key ArrowDown --expect-not "Medici's 6 connections"         # 10 dead ArrowDown
st --key Tab                                                     # 11 Degree 6
st --key Enter --expect "Medici's 6 connections"                 # 12 the list
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
