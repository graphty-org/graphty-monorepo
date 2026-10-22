#!/usr/bin/env bash
# Keyboard-only repro of round 2 session r2-s47 (Morgan, screen-reader mode, "What did I get?"
# on Les Miserables). Checks, with the session's own keys:
#   A. opening the sample announces only "Reading Les Miserables", never that it finished
#   B. Enter on "From Les Miserables" opens the Data page without a word or a focus move
#   C. what the Data page's controls say when walked by Tab
#   D. a Connected components run announces "added, running" and never that it finished
#   E. the outline rows' visible counts are missing from their spoken names
#   F. Enter on "Separate pieces Group 1" in a character's Values drops focus to the page
#   G. Main menu > Keyboard shortcuts opens the dialog but leaves focus outside it
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
# presses <key> one step at a time until the focus line matches <pattern> (at most <max> presses)
until_focus() {
    local pat="$1" key="$2" max="$3" out
    for _ in $(seq "$max"); do
        out="$(st --key "$key")"; echo "$out"
        echo "$out" | grep -Eq "^focus: $pat" && return 0
    done
    echo "(did not reach $pat in $max presses of $key)"
}
{
node "$T" --start "$S" empty --sr
echo "== A: open Les Miserables (5 Tabs, Enter), wait 3 s: is the end of the load announced?"
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Enter
st --wait 3000
echo "== B: Tab to From Les Miserables, Enter: does anything speak, where is focus? (see PNG)"
st --key Tab --key Tab
st --key Enter
echo "== C: Shift+Tab to the Data page's outline and arrow through it: are the counts and attributes spoken?"
for i in 1 2 3 4; do st --key Shift+Tab; done
for i in 1 2 3 4 5; do st --key ArrowDown; done
until_focus 'treeitem "Les Miserables' Shift+Tab 6
st --key ArrowDown --key ArrowDown
echo "== C2: back to the rail (Shift+Tab), switch to Graph with Enter: is a state spoken?"
until_focus 'button "(Graph|Data)"' Shift+Tab 6
st --key Enter
st --key ArrowDown --key ArrowUp
echo "== D: Analyze (Shift+A), type component, Enter, Run; wait 3 s for a finished announcement"
st --key Shift+a
st --type component --key Enter
st --key Enter
st --wait 3000
echo "== E: Shift+Tab into the outline and walk it: are the visible counts (1, 77) in the names?"
until_focus 'treeitem' Shift+Tab 6
st --key Home
for i in 1 2 3 4; do st --key ArrowDown; done
echo "== F: Find Valjean, Tab to Separate pieces Group 1, Enter: where does focus go?"
until_focus 'combobox "Find"' Shift+Tab 10
st --type Valjean --key Enter
until_focus 'button "Separate pieces' Tab 4
st --key Enter
echo "== G: Main menu, Keyboard shortcuts with Enter: does focus move into the dialog? (see PNG)"
until_focus 'button "Main menu"' Tab 20
st --key Enter
until_focus 'menuitem "Keyboard shortcuts' ArrowDown 15
st --key Enter
st --key Tab
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
