#!/usr/bin/env bash
# Repro of round 3 session r3-s38 (T6, Les Miserables, what did I get).
# Checks, on the build:
#  1. Graph Overview: "Components" shows no tooltip or explanation on hover (tooltip: null).
#  2. Graph Overview: the direction row reads "Undirected, from the file: directed 0" with no label,
#     and "Edges per ..." is cut off.
#  3. Data place: source rows are cut to "Node t..." and "Ed...".
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty
st --click "No thanks"                      # 02
st --click "Les Miserables"                 # 03 Overview
st --hover-at 1267,300                      # 04 Components row: tooltip?
st --hover "Edges per"                      # 05 truncated label: tooltip?
st --click "Data"                           # 06 Data place: source names cut off
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
