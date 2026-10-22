#!/usr/bin/env bash
# Repro of round 3 session r3-s20 (T12 A, Les Miserables, screen-reader participant).
# Checks two things the session met, in screen-reader mode:
#  1. Opening the Les Miserables sample by keyboard from the start screen: where does focus land?
#     (The session heard "focus: nothing (the page itself)".)
#  2. Choosing Javert from the Find list with Enter: is the selection announced, and does the
#     focused element's name say whose values these are? (The session heard only
#     "focus: group Summary values", no live text.)
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
st --key Tab --key Tab --key Tab --key Tab --key Tab   # 02 Les Miserables sample focused
st --key Enter --wait 3000                    # 03 open it: focus after load
st --key /                                    # 04 Find
st --type Javert                              # 05
st --key ArrowDown                            # 06
st --key Enter --wait 1500                    # 07 choose Javert: announcement?
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
