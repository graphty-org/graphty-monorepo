#!/usr/bin/env bash
# Repro of round 2 session r2-s25 (Florentine families, the Medici's marriages), the participant's
# own path: find box, the "Medici" element row, then the chevron at the right end of the
# "Degree 6 >" row (1410,236). Checks: the chevron click lands on the surrounding group
# "Summary values", not on the button "Degree 6", and no list opens (05); a click on the button
# "Degree 6" opens "Medici's 6 connections" (06). Run twice (run1/, run2/) to show it does the
# same every run.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
for n in 1 2; do
S="$here/run$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                            # 02
st --click "Florentine families"                                  # 03
st --click-at 180,90 --type Medici                                # 04 find box, results
st --click "Medici"                                               # 05 Medici selected, Summary shown
st --click-at 1410,236 --expect-not "Medici's 6 connections"      # 06 chevron: no list
st --click "Degree 6" --expect "Medici's 6 connections"           # 07 the button: the list
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
