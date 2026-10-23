#!/usr/bin/env bash
# Scripted repro of the build defect graded in session r1-s15b (names on every dot, College football):
# the mouse wheel over the drawing does not zoom. 03.png, 04.png and 05.png come out byte-identical.
# Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
R --step "$here" --click "No thanks" --click "College football"
R --step "$here" --click-at 1100,800
R --step "$here" --wheel 750,450,-400
R --step "$here" --wheel 750,450,-1500
R --end "$here"
md5sum "$here"/0[345].png | tee -a "$here/session.log"
