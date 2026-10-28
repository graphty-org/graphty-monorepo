#!/usr/bin/env bash
# Same keys as repro.sh in screen-reader mode, to print the focused element's role and name after
# opening the sample, on Redo, and on the blue bar beside the left panel.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run-sr"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
st --key Enter --wait 1500
st --key Tab
st --key Tab --key Tab --key Tab
st --key Tab --key Tab --key Tab --key Tab
st --key Tab
node "$T" --end "$S"
} 2>&1 | tee "$here/run-sr.log"
