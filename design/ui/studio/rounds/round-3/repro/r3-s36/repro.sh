#!/usr/bin/env bash
# Repro of round 3 session r3-s36 (T6, Les Miserables, sighted mouse user).
# Checks whether the truncated text in the Overview ("Edges per ...") and the Data panel's source
# rows ("Les Mis...", "Node t...", "Ed...") can be read in full by hovering, and whether hovering
# "Components" explains the word. Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks" --click "Les Miserables"   # 02 sample drawn, Overview shown
st --hover-at 1266,332                            # 03 hover the "Edges per ..." label
st --hover-at 1266,300                            # 04 hover "Components"
st --click "Data"                                 # 05 Data panel
st --hover-at 137,136                             # 06 hover "Les Mis..."
st --hover-at 158,168                             # 07 hover "Node t..."
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
