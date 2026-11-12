#!/usr/bin/env bash
# Repro of round 2 session r2-s18 (College football, names on every dot), the participant's own path.
# Checks: the label line reports "115 labels, 14 hidden to avoid overlap"; one wheel zoom in at the
# middle raises the hidden count (14 -> 16); hovering the count note gives no explanation of its own.
# Run it twice (run1/, run2/) to show the counts are the same on every run.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
for n in 1 2; do
S="$here/run$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "College football"                                  # 02
st --click "Everything" --click "Add label line" --click "role=option:label"         # 03 expect 14 hidden
st --hover-at 1290,417                                                              # 04 tooltip on the note?
st --wheel 740,470,-500                                                             # 05 expect 16 hidden
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
