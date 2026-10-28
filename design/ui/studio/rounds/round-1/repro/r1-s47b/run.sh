#!/usr/bin/env bash
# Scripted repro of the build defect graded in session r1-s47b (Tom, save, close and reopen the
# Les Miserables work). Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
studio="$here/../../../.."
tool="$studio/tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" "setup:$studio/rounds/pilot/T14/setup.txt"
echo "== before: the Influence row in the outline shows its count 77 ==" | tee -a "$here/session.log"
R --step "$here" --key Control+s --key Control+a --type "Repro save" --key Enter
R --step "$here" --reopen
R --step "$here" --click "Repro save"
echo "== after reopen: the Influence row shows only its color bar, no count ==" | tee -a "$here/session.log"
R --end "$here"
