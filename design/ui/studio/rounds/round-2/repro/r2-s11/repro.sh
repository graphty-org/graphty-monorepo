#!/usr/bin/env bash
# Repro for round 2 session r2-s11 (keyboard only, friends.csv). The session's own keys, twice:
# once with screenshots ("run/"), once in screen-reader mode ("run-sr/"), which prints the
# focused element after every step, so each screenshot can be matched to where focus really is.
#   - step 08: Shift+Tab from the Analyze button puts focus on the drawing; no ring is drawn.
#   - step 14: Tab from the outline's eye button walks resize handle, drawing (no ring), toolbar.
#   - step 22: Enter on "Size by attribute" opens the picker; check whether a focus ring shows.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
walk() {
  S="$1"; shift
  rm -rf "$S"
  st() { node "$T" --step "$S" "$@"; }
  node "$T" --start "$S" empty "$@"
  st --key Control+o                            # 02
  st --upload friends.csv                       # 03 drawn
  st --key Shift+A                              # 04 Analyze
  st --type "pagerank"                          # 05
  st --key Enter                                # 06 PageRank form, Run focused
  st --key Enter                                # 07 run; focus back on Analyze
  st --key Shift+Tab                            # 08 focus on the drawing: no visible ring
  st --key Shift+Tab --key Shift+Tab --key Shift+Tab   # 09 Selection row
  st --key ArrowDown                            # 10 Influence row
  st --key Enter                                # 11 Influence opened in inspector
  st --key Tab --key Tab --key Tab              # 12 eye, handle, drawing (no ring)
  st --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab  # 13 Add to Shape
  st --key Enter                                # 14 menu: Size
  st --key Enter                                # 15 Size line
  st --key Tab                                  # 16 Size by attribute
  st --key Enter                                # 17 picker open: where is focus?
  node "$T" --end "$S"
}
{
walk "$here/run"
walk "$here/run-sr" --sr
} 2>&1 | tee "$here/run.log"
