#!/usr/bin/env bash
# Screen-reader-mode repro of round 2 session r2-s22 (Les Miserables, Javert's neighbors), keys only.
# Checks:
#  A. After Enter on "Open the Les Miserables sample", focus lands on the drawing with no name, the
#     live region says "No nodes to draw" then "Reading Les Miserables", and nothing ever says the
#     load finished or how much was read (a 5 s wait prints no further live line).
#  B. After a Find pick (/, Javert, ArrowDown, Enter), focus lands on group "Summary values", whose
#     name does not say whose values they are, and no live region says "Javert" was selected.
#  C. Tab from the Summary reaches only "Degree 17"; Enter on it opens region "Javert's 17 connections".
# Runs twice (run1/, run2/) to show it does the same every run.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
T7=(); for i in 1 2 3 4 5 6 7; do T7+=(--key Tab); done
for n in 1 2; do
S="$here/run$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
echo "== A: open Les Miserables from the keyboard"
st "${T7[@]}" --key Shift+Tab --key Shift+Tab --key Enter   # 02
st --wait 5000                                              # 03 any "loaded" announcement?
echo "== B: find Javert"
st --key / --type Javert                                    # 04
st --key ArrowDown                                          # 05
st --key Enter                                              # 06 focus target and any announcement
echo "== C: the Summary's tab stops, then the neighbor list"
st --key Tab                                                # 07
st --key Tab                                                # 08
st --key Shift+Tab --key Enter --expect "Javert's 17 connections"   # 09
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
