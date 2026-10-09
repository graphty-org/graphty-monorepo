#!/usr/bin/env bash
# After the 2D switch (key 5): is any dot under the floating toolbar, and what does Fit (key 0) do?
# Pointer steps here are the grader's, only to set up and to look under the toolbar.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run-2d"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "Open the College football sample"                       # 02
st --click "Everything" --click "Label" --click "role=option:label"  # 03 label line
st --key Escape --key 5                                              # 04 2D, as the participant left it
st --drag 1100,300 1100,150                                          # 05 pan up 150 px: what was under the toolbar
st --key 0                                                           # 06 Fit
st --key 0                                                           # 07 Fit again
node "$T" --end "$S"
} 2>&1 | tee "$here/run-2d.log"
