#!/usr/bin/env bash
# Repro of round 2 session r2-s21 (Les Miserables, Javert's neighbors), the participant's own path.
# Checks: a click on the chevron drawn at the right end of the "Degree 17 >" row (1410,236) lands on
# the surrounding group "Summary values", not on the button "Degree 17": the row is only shaded and
# no list opens (04). A click on the word "Degree" (1252,236) hits the button and opens
# "Javert's 17 connections" (05). Run twice (run1/, run2/) to show it does the same every run.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
for n in 1 2; do
S="$here/run$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"          # 02
st --click-at 176,90 --type "Javert"                      # 03 find results
st --click-at 114,153                                     # 04 Javert selected, Summary shown
st --click-at 1410,236 --expect-not "Javert's 17 connections"   # 05 chevron: no list
st --click-at 1252,236 --expect "Javert's 17 connections"       # 06 the word "Degree": the list
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
