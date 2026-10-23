#!/usr/bin/env bash
# Repro of round 2 session r2-s17 (College football, names on every dot), the participant's own path.
# Checks: the label line's hidden-for-overlap count after picking "label" (14), after the same
# wheel zoom-in the participant used (16: zooming in hides more), the "Aa" button is "Label
# position" only, and whether 2D shows every name.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/${RUN:-run}"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "College football"                                  # 02
st --click "Everything" --click "Add label line" --click "role=option:label"       # 03 count
st --wheel 740,460,-400                                                            # 04 count after zoom in
st --click "Label position"                                                        # 05 position grid only
st --key Escape --click "View" --click "2D"                                        # 06 count in 2D
node "$T" --end "$S"
} 2>&1 | tee "$S.log"
