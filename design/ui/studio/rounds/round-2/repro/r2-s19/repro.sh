#!/usr/bin/env bash
# Repro of round 2 session r2-s19 (Les Miserables, Javert's neighbors), the participant's own path.
# Checks: a click on the chevron drawn at the right end of the "Degree 17 >" row lands on the
# surrounding group "Summary values", not on the button "Degree 17": the row is only shaded and no
# list opens (05). A click on the middle of the same row hits the button and opens "Javert's 17
# connections" (06), so step 07 then finds no "Degree" on screen. Run twice (run1/, run2/).
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
st --click-at 1410,236                                    # 05 chevron: expect no list
st --click-at 1330,236                                    # 06 row middle: expect the 17 connections
st --click "Degree"                                       # 07 the participant's own click; list already open
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
