#!/usr/bin/env bash
# Repro of round 2 session r2-s23 (Florentine families, the Medici's marriages), the participant's
# own path. Checks: a click on the chevron drawn at the right end of the "Degree 6 >" row
# (1410,236) lands on the surrounding group "Summary values", not on the button "Degree 6": the
# row is only shaded and no list opens (05). A click on the word "Degree" hits the button and
# opens "Medici's 6 connections" (06). Run twice (run1/, run2/) to show it does the same every run.
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
st --click-at 700,378                                             # 04 Medici selected, Summary shown
st --click-at 1410,236 --expect-not "Medici's 6 connections"      # 05 chevron: no list
st --click "Degree" --expect "Medici's 6 connections"             # 06 the word "Degree": the list
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
