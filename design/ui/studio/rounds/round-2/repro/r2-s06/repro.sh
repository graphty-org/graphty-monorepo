#!/usr/bin/env bash
# Repro for round 2 session r2-s06: do node names get sharper in the "For print -- PNG, 4x,
# sharper" export than in the default 2x export? Same clicks as the session (Les Miserables,
# names on Everything), then one export at the default 2x and one with the "For print" preset.
# Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                                   # 02
st --click "Les Miserables"                              # 03
st --click "Everything"                                  # 04
st --click "Add label line"                              # 05
st --click "role=option:name"                            # 06 names drawn
echo "== export at the default (To share -- PNG, 2x)"
st --key Control+e                                       # 07
st --click "role=button:Export"                          # 08
echo "== export with For print -- PNG, 4x, sharper"
st --key Control+e                                       # 09
st --click "Preset"                                      # 10
st --click "For print -- PNG, 4x, sharper"               # 11
st --click "role=button:Export"                          # 12
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
