#!/usr/bin/env bash
# Scripted repro of the build defects graded in session r1-s16b (Sam, keyboard only, names on
# every dot, College football). Run from anywhere; writes PNGs and session.log beside this file.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tool="$here/../../../../tool/real.mjs"
R() { node "$tool" "$@" 2>&1 | tee -a "$here/session.log"; }
: > "$here/session.log"
R --start "$here" empty
echo "== A: start page, Tab 4 = New from data (ring); Tabs 5, 6, 7 = the first three samples: no ring (03-05 identical to 01) ==" | tee -a "$here/session.log"
R --step "$here" --key Tab --key Tab --key Tab --key Tab
R --step "$here" --key Tab
R --step "$here" --key Tab
R --step "$here" --key Tab
echo "== B: Enter opens College football; Tab x4 and ArrowLeft reach the Style tab; Shift+Tab x4: no ring anywhere ==" | tee -a "$here/session.log"
R --step "$here" --key Enter
R --step "$here" --key Tab --key Tab --key Tab --key Tab --key ArrowLeft
R --step "$here" --key Shift+Tab
R --step "$here" --key Shift+Tab
R --step "$here" --key Shift+Tab
R --step "$here" --key Shift+Tab
R --end "$here"
