#!/usr/bin/env bash
# Repro of round 3 session r3-s49 (picture and numbers for a report, Les Miserables, Louvain run).
# Checks whether the export dialog's Export button saves the nodes CSV when clicked by its
# role and name after choosing CSV > Nodes (in the session that click changed nothing and saved
# no file; a click on the button's position then saved it).
# Writes PNGs, downloads and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
studio="$here/../../../.."
T="$studio/tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" "setup:$studio/rounds/round-3/setups/T13.txt"
st --key Control+e --wait 800               # export dialog
st --click "Data"                           # Data row
st --click "Format"
st --click "role=option:CSV"
st --click "Table"
st --click "role=option:Nodes"
st --click "role=button:Export" --wait 2000 # should save les-miserables_nodes.csv
ls -la "$S/downloads" 2>&1
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
