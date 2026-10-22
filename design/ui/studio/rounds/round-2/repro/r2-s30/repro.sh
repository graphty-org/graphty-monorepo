#!/usr/bin/env bash
# Screen-reader-mode repro of round 2 session r2-s30 (Les Miserables, bigger dots by importance), keys only.
# Checks:
#  A. In Analyze, after typing "betweenness", ArrowDown moves no reported focus and reads no option;
#     Enter opens a form focused on "Run" whose method is never named; Enter on Run announces
#     "Edge betweenness added, running" -- the first time the pick is named -- and a 5 s wait
#     brings no "finished" announcement.
#  B. On the Bridges row's Style tab, after Add to Shape > Size, the Size field reports as a
#     combobox and Alt+ArrowDown changes its value from 1 to 0 instead of opening a list.
#  C. Enter on "Bridges, Color" opens dialog "Color from data"; its Palette combobox reports no
#     value; Escape closes it and focus falls to the page body.
# Runs twice (run1/, run2/) to show it does the same every run.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
T7=(); for i in 1 2 3 4 5 6 7; do T7+=(--key Tab); done
for n in 1 2; do
S="$here/run$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
echo "== open Les Miserables"
st "${T7[@]}" --key Shift+Tab --key Shift+Tab --key Enter
st --wait 3000
echo "== A: Analyze, betweenness"
st --key Tab --key Enter
st --type betweenness
st --key ArrowDown                       # A: no option read
st --key Enter                           # A: focus on Run, method unnamed
st --key Enter                           # A: "Edge betweenness added, running"
st --wait 5000                           # A: no "finished"
echo "== run node betweenness"
st --key Enter --type "betweenness centrality" --key Enter
st --key Enter                           # "Betweenness added, running"
st --wait 3000
echo "== select the Bridges row"
st --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
st --key ArrowDown
st --key Enter --expect "Bridges"
echo "== walk to Add to Shape"
for i in $(seq 1 14); do st --key Tab; done
echo "== B: Size field"
st --key Enter                           # menu, Size
st --key Enter                           # combobox "Size" value "1"
st --key Alt+ArrowDown                   # B: value becomes 0
st --key ArrowUp
echo "== C: Color from data dialog"
st --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
st --key Enter                           # dialog
for i in 1 2 3 4; do st --key Tab; done # Palette with no value
st --key Escape                          # C: focus falls to body
node "$T" --end "$S"
} 2>&1 | tee "$here/run$n.log"
done
