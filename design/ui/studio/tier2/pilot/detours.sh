#!/usr/bin/env bash
# Walks each tier 2 task's success path and its commonest wrong turns from round 1, once by
# pointer (P) and once by keyboard (K, a screen-reader-mode session, so no pointer step can run),
# pressing Enter, Tab and Escape in the fields each walk opens. Each walk checks the screen it
# should reach with --expect / --expect-not; a walk whose log holds "exit 1" or "exit 2" failed.
#
# Usage: detours.sh <walk> [<walk> ...]   (a walk name below, a task prefix such as T22, or "all")
# HERE=<dir> writes the sessions and logs there (default design/ui/studio/tmp/detours).
# REAL_DIST=<frozen build> serves that build (design/ui/studio/tool/README.md).
# LANES=<n> runs that many walks at once (default 2; each takes one of the machine's 4 browsers).
set -u
# a step that finds nothing to act on fails the walk (tool/README.md, "Scripted walks")
export REAL_MISS_FAILS=1
ST=$(cd "$(dirname "$0")/../.." && pwd)
HERE=${HERE:-$ST/tmp/detours}
SET=$ST/rounds/tier-2/setups
mkdir -p "$HERE"
R() { node "$ST/tool/real.mjs" "$@"; }

walk() {
    local name=$1 start=$2; shift 2
    local dir=$HERE/$name log=$HERE/$name.log
    rm -rf "$dir"; : >"$log"
    echo "== $name start $start" >>"$log"
    # shellcheck disable=SC2086 # $start carries "--sr" for a keyboard walk
    R --start "$dir" $start >>"$log" 2>&1; echo "exit $?" >>"$log"
    for s in "$@"; do
        echo "== $name step: $s" >>"$log"
        eval "R --step \"$dir\" $s" >>"$log" 2>&1; echo "exit $?" >>"$log"
    done
    R --end "$dir" >>"$log" 2>&1
    if grep -qE '^exit [12]$' "$log"; then echo "$name: FAIL ($log)"; else echo "$name: ok"; fi
}

# A keyboard sweep: from a screen reached by keys, press every control on it once -- Tab to the
# next stop, Enter, then Escape twice -- until Tab comes back to the first stop (at most SWEEP_MAX,
# default 60). A screen-reader session, so each stop's focus line is in the log. A stop where
# Escape leaves focus on nothing is a fault (focus dropped to the page, WCAG 2.4.3), as is any
# error the page reports (exit 1).
sweep() {
    local name=$1 start=$2; shift 2
    local dir=$HERE/$name log=$HERE/$name.log first="" now n
    rm -rf "$dir"; : >"$log"
    echo "== $name start $start" >>"$log"
    # shellcheck disable=SC2086 # $start carries "--sr"
    R --start "$dir" $start >>"$log" 2>&1; echo "exit $?" >>"$log"
    for s in "$@"; do
        echo "== $name step: $s" >>"$log"
        eval "R --step \"$dir\" $s" >>"$log" 2>&1; echo "exit $?" >>"$log"
    done
    for ((n = 1; n <= ${SWEEP_MAX:-60}; n++)); do
        now=$(R --step "$dir" --key Tab 2>&1 | grep -m1 '^focus:')
        [ -n "$first" ] && [ "$now" = "$first" ] && break
        [ -n "$first" ] || first=$now
        echo "== $name stop $n: $now" >>"$log"
        R --step "$dir" --key Enter >>"$log" 2>&1; echo "exit $?" >>"$log"
        R --step "$dir" --key Escape --key Escape >"$dir.esc" 2>&1; echo "exit $?" >>"$dir.esc"
        cat "$dir.esc" >>"$log"
        if tail -n 3 "$dir.esc" | grep -q '^focus: nothing (the page itself)'; then
            echo "FAULT stop $n: Escape after pressing $now left focus on nothing" >>"$log"
        fi
    done
    rm -f "$dir.esc"
    R --end "$dir" >>"$log" 2>&1
    if grep -qE '^exit [12]$|^FAULT' "$log"; then echo "$name: FAIL ($log)"; else echo "$name: ok ($((n - 1)) stops)"; fi
}

K=--sr
PATH_FORM='--key p --type Chloe --key Enter --type Milo --key Enter'

run() { case $1 in
# ---- T4: two tables -------------------------------------------------------------------------
T4-P) walk T4-P empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload people.csv' '--click "Role of name"' '--key Escape' \
    '--expect "Open as a new graph"' '--click "Add a table"' '--key Escape' '--click "Add a table"' \
    '--click "File..." --upload messages.csv' '--click "Show the 1 unmatched row"' '--key Escape' \
    '--expect "Open as a new graph"' '--click "Load"' '--expect "people and messages"' '--click "Data"' \
    '--click "people.csv and messages.csv"' '--expect "Left out"' ;;
T4-K) walk T4-K "empty $K" '--key Tab --key Tab --key Tab --key Tab --key Enter' \
    '--key Enter --upload people.csv' '--key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab' \
    '--key Enter' '--key Escape' '--expect "Open as a new graph"' \
    '--key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab' \
    '--key Enter' '--key Enter --upload messages.csv' '--key Escape' '--expect "Open as a new graph"' \
    '--key Enter' '--expect "people and messages"' ;;
# Wrong turn: each table through "Open project or file..." (Control+O), the second as an addition.
T4-D1) walk T4-D1 empty '--click "No thanks"' '--click "Open project or file..." --upload people.csv' \
    '--expect "Open as a new graph"' '--key Control+o --upload messages.csv' '--expect "Edges: messages.csv"' \
    '--click "Add"' '--key Tab' '--key Escape' ;;
# ---- Tier 1 T3: one's own file, opened from the start screen, through the Data page
T3-P) walk T3-P empty '--click "No thanks"' '--click "Open project or file..." --upload friends.csv' \
    '--click "Load"' '--click "Data"' '--expect "41 edges"' ;;
# ---- T17: filtering --------------------------------------------------------------------------
T17-P) walk T17-P setup:$SET/friends-ranked.txt '--click "Data"' '--click "weight"' '--click "Attribute actions"' \
    '--click "Filter to..."' '--click "Value" --type 4' '--key Enter' '--click "Add step"' \
    '--expect "weight is at least 4"' '--click "Apply step: weight is at least 4"' '--click "weight is at least 4"' \
    '--click "Value" --key Control+a --type 5' '--key Enter' '--click "Save and turn on"' '--key Escape' \
    '--expect "weight is at least 5"' '--click "Apply step: weight is at least 5"' ;;
T17-K) walk T17-K "setup:$SET/lesmis-ranked.txt $K" '--key Tab --key Tab --key Tab --key Tab --key Tab --key Tab' \
    '--key Enter' '--key Tab --key Tab --key Tab --key Tab' '--key Enter' '--key Escape' '--key Tab' ;;
# Wrong turn: the toolbar and the Analyze list, looking for a filter; then closing the list by
# Escape and by a click on the drawing (one session's popover would not close).
T17-D1) walk T17-D1 setup:$SET/lesmis-ranked.txt '--click Analyze' '--type chapters' '--key Escape' \
    '--click-at 1100,700' '--expect-not "Rank nodes and edges"' '--click Analyze' '--key Escape' \
    '--expect-not "Rank nodes and edges"' '--hover Layout' '--click Layout' '--key Escape' \
    '--expect-not role=dialog:Layout' ;;
# Wrong turn: the Filters "+" door, with Enter, Tab and Escape in the step editor.
T17-D2) walk T17-D2 setup:$SET/friends-ranked.txt '--click "Data"' '--click "Add filter step"' '--key Tab' \
    '--key Escape' '--click "Add filter step"' '--click "Attribute"' '--click "role=option:weight"' \
    '--click "Value" --type 4' '--key Enter' '--click "Add step"' '--expect "weight is at least 4"' ;;
# ---- T18: the shortest chain ----------------------------------------------------------------
T18-P) walk T18-P setup:$SET/friends-ranked.txt '--click Analyze' '--type chain' '--click "Shortest path"' \
    '--click "From" --type Chloe' '--key Enter' '--type Milo' '--key Enter' '--click "Find path"' \
    '--expect "Milo"' ;;
T18-K) walk T18-K "setup:$SET/florentine-ranked.txt $K" '--key p' '--type Strozzi' '--key Enter' \
    '--type Pazzi' '--key Enter' '--key Enter' '--key Tab' '--key Escape' ;;
# Wrong turn: recoloring a selected node, and selecting a node on the path.
T18-D1) walk T18-D1 setup:$SET/friends-ranked.txt '--key / --type Chloe --key Enter' '--click "role=tab:Style"' \
    '--click "Add to Fill"' '--click "role=menuitem:Color"' '--key Escape' '--key Escape' ;;
T18-D2) walk T18-D2 setup:$SET/florentine-ranked.txt '--key p' '--type Strozzi' '--key Enter' '--type Pazzi' \
    '--key Enter' '--key Enter' '--click Values' '--click Medici' '--key Escape' ;;
# ---- T19: notes -----------------------------------------------------------------------------
T19-P) walk T19-P setup:$SET/friends-ranked.txt '--click "Notes"' '--click "Add note"' \
    '--type "Spring list"' '--key Tab' '--key Escape' '--click "Add note"' \
    '--type ", checked against the sign-up sheet"' '--key Control+Enter' '--key Control+s' \
    '--click Save' '--reopen' '--click friends' '--click "Notes"' '--expect "Spring list"' ;;
T19-K) walk T19-K "setup:$SET/florentine-ranked.txt $K" '--key / --type Medici --key Enter' '--key n' \
    '--type "Check the 1434 return from exile"' '--key Control+Enter' '--key Escape --key Escape' '--key n' \
    '--type "Marriages only; business ties are a separate list"' '--key Tab' '--key Control+Enter' \
    '--key Control+s' '--key Enter' ;;
# ---- T20: a weight set at load ---------------------------------------------------------------
T20-P) walk T20-P empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload bus-stops.csv' '--click "Role of minutes"' '--click "Weight"' \
    '--click "Farther"' '--click "Direction"' '--key Escape' '--click "Load"' '--key p' '--type Depot' \
    '--key Enter' '--type Harbor' '--key Enter' '--key Enter' '--expect "Total minutes"' ;;
T20-K) walk T20-K "empty $K" '--key Tab --key Tab --key Tab --key Tab --key Enter' \
    '--key Enter --upload trails.csv' '--key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab' \
    '--key Enter' '--key ArrowUp --key ArrowUp --key ArrowUp --key Enter' '--expect "Weight: km"' '--key Tab --key Tab' \
    '--key ArrowRight --key ArrowRight' '--expect "Weight: km (farther)"' '--key Escape' '--expect "Open as a new graph"' ;;
# Wrong turn: "Open project or file..." from the start screen, and from inside a project.
T20-D1) walk T20-D1 empty '--click "No thanks"' '--click "Open project or file..." --upload bus-stops.csv' \
    '--expect "Open as a new graph"' '--click "Role of minutes"' '--click "Weight"' '--expect "Higher means"' \
    '--click "Farther"' '--click "Load"' '--key p' '--expect "minutes (farther"' '--click "Weight"' '--key Escape' '--key Escape' ;;
T20-D2) walk T20-D2 setup:$SET/bus-stops-ranked.txt '--click "Main menu"' '--click "Open project or file..." --upload trails.csv' \
    '--key Tab' '--key Escape' '--click "Cancel"' ;;
# ---- T21: replace -----------------------------------------------------------------------------
T21-P) walk T21-P setup:$SET/friends-ranked.txt '--click "Data"' '--rclick "friends.csv"' \
    '--click "Replace with file..." --upload friends-v2.csv' '--click "Replace"' '--click "Rerun"' ;;
# Wrong turn: a left click on the source row, then the main menu.
T21-D1) walk T21-D1 setup:$SET/team-ranked.txt '--click "Data"' '--click "team.csv"' '--key Escape' \
    '--click "Main menu"' '--key Escape' ;;
# ---- T22: select where ----------------------------------------------------------------------
T22-P) walk T22-P setup:$SET/bus-stops-ranked.txt '--click "Find nodes, edges, values"' \
    '--type "=minutes >= 10"' '--key Control+a --type "=minutes >= \`10\`"' '--key Enter' \
    '--expect "3 edges selected"' '--key Tab' '--key Escape' ;;
T22-K) walk T22-K "setup:$SET/lesmis-ranked.txt $K" '--key /' '--type "shared_chapters >= 10"' \
    '--key Control+a --type "=shared_chapters >= \`10\`"' '--key Enter' '--key Escape' '--key Escape' ;;
# Wrong turn: a condition typed with no "=", and styling edges from a run's Style tab.
T22-D1) walk T22-D1 setup:$SET/bus-stops-ranked.txt '--key /' '--type "minutes >= 10"' '--expect "start with ="' \
    '--key Enter' '--key Escape' ;;
T22-D2) walk T22-D2 setup:$SET/bus-stops-ranked.txt '--click "role=treeitem:PageRank"' '--click "role=tab:Style"' \
    '--click "Edges"' '--click "Add to Line"' '--click "role=menuitem:Color"' \
    '--expect-not "Edge color: Everything"' ;;
# ---- T23: neighborhood ----------------------------------------------------------------------
T23-P) walk T23-P setup:$SET/friends-ranked.txt '--click "Find nodes, edges, values" --type Ava' '--key Enter' \
    '--click "Degree"' '--click role=radio:2' '--click "Filter to neighbors"' '--expect "14"' ;;
T23-K) walk T23-K "setup:$SET/florentine-ranked.txt $K" '--key / --type Medici --key Enter' '--key g' \
    '--key Tab' '--key ArrowRight' '--key Escape' ;;
# ---- T24: one tie ---------------------------------------------------------------------------
T24-P) walk T24-P setup:$SET/friends-ranked-names.txt '--click-at 755,586' '--click "Edge actions"' \
    '--click "Select endpoints"' '--click "role=tab:Style"' '--click "Add to Fill"' \
    '--click "role=menuitem:Color"' '--key Escape' ;;
T24-K) walk T24-K "setup:$SET/bus-stops-ranked-names.txt $K" '--key /' '--type "Station -> Stadium"' \
    '--key ArrowDown' '--key Enter' '--key Tab' '--key Escape' ;;
# ---- T12R: one node's connections ------------------------------------------------------------
T12R-P) walk T12R-P setup:$SET/lesmis-ranked.txt '--click "Find nodes, edges, values" --type Javert' \
    '--key Enter' '--click "Degree"' '--expect "Javert"' ;;
T12R-K) walk T12R-K "setup:$SET/florentine-ranked.txt $K" '--key / --type Medici --key Enter' '--key g' '--key Escape' ;;
# ---- Round 2's detours: what participants did that no earlier walk did ------------------------
# Style a selection: a width, a color, and the key names the layer once the selection is let go.
R2-SEL-P) walk R2-SEL-P setup:$SET/friends-ranked.txt '--click "Find nodes, edges, values" --type "=weight >= \`4\`" --key Enter' \
    '--expect "12 edges selected"' '--click "role=tab:Style"' '--click "Add to Line"' '--click "role=menuitem:Width"' \
    '--expect "Width"' '--click "Add to Line"' '--click "role=menuitem:Color"' '--expect "Edge color: 12 edges"' \
    '--click-at 1150,820' '--expect "Edge color: 12 edges"' '--expect "Overview"' ;;
# A half-made filter step, then another item selected: "+" brings the step back as it was left.
# (Round 2: the step was thrown away without a word.)
R2-STEP-D1) walk R2-STEP-D1 setup:$SET/friends-ranked.txt '--click "Data"' '--click "Add filter step"' \
    '--click "Attribute"' '--click "role=option:weight"' '--click "Value" --type 4' '--click "role=treeitem:weight"' \
    '--expect "Range"' '--click "Add filter step"' '--expect "Keeps edges that pass"' '--click "Add step"' \
    '--expect "weight is at least 4"' ;;
# Tab out of an open step editor, and Escape: Tab keeps it open, Escape closes it.
R2-STEP-D2) walk R2-STEP-D2 setup:$SET/friends-ranked.txt '--click "Data"' '--click "Add filter step"' \
    '--click "Attribute"' '--click "role=option:weight"' '--click "Value" --type 4' \
    '--key Tab --key Tab --key Tab --key Tab' '--expect "New filter step"' '--click "Value"' '--key Escape' \
    '--expect-not "New filter step"' ;;
# A path run twice, then the Path form reopened from Analyze's Recent list.
R2-PATH-P) walk R2-PATH-P setup:$SET/friends-ranked.txt "$PATH_FORM" '--key Enter' '--expect "Milo"' \
    '--key p --type Ava --key Enter --type Kofi --key Enter --key Enter' '--expect-not "No node named"' \
    '--expect "2 hops"' \
    '--click Analyze' '--click "role=option:Shortest path#1"' '--expect "role=button:Find path"' '--key Escape' ;;
# A newer copy of a loaded file opened as an addition: the page says the ties repeat and offers Replace.
R2-NEWER-P) walk R2-NEWER-P setup:$SET/friends-ranked.txt '--click "Main menu"' \
    '--click "Open project or file..." --upload friends-v2.csv' '--expect "Add to friends"' '--expect "already in"' \
    '--click "Replace friends.csv"' '--expect "Replace"' '--key Escape' ;;
# A click on empty canvas while a run is selected lets go of the run; a note then is about the graph.
R2-EMPTY-P) walk R2-EMPTY-P setup:$SET/friends-ranked.txt '--click "role=treeitem:PageRank"' '--expect "Measure"' \
    '--click-at 1150,820' '--expect-not "Measure"' '--expect "Overview"' '--key n' '--expect "About"' '--key Escape' ;;
# ---- Keyboard sweeps: every control on each screen a keyboard participant reaches -------------
KS-GRAPH) sweep KS-GRAPH "setup:$SET/friends-ranked.txt $K" ;;
KS-FLOR) sweep KS-FLOR "setup:$SET/florentine-ranked.txt $K" '--key / --type Medici --key Enter' ;;
KS-RUN) sweep KS-RUN "setup:$SET/bus-stops-ranked.txt $K" '--key / --type Depot --key Enter' ;;
KS-PATH) sweep KS-PATH "setup:$SET/florentine-ranked.txt $K" '--key p' ;;
KS-START) sweep KS-START "empty $K" ;;
*) echo "unknown walk $1" ;;
esac; }

ALL="T3-P T4-P T4-K T4-D1 T17-P T17-K T17-D1 T17-D2 T18-P T18-K T18-D1 T18-D2 T19-P T19-K T20-P T20-K T20-D1 T20-D2
T21-P T21-D1 T22-P T22-K T22-D1 T22-D2 T23-P T23-K T24-P T24-K T12R-P T12R-K
R2-SEL-P R2-STEP-D1 R2-STEP-D2 R2-PATH-P R2-NEWER-P R2-EMPTY-P KS-START KS-GRAPH KS-FLOR KS-RUN KS-PATH"
todo=()
for a in "$@"; do
    if [ "$a" = all ]; then todo+=($ALL); continue; fi
    m=0; for w in $ALL; do case $w in "$a"|"$a"-*) todo+=("$w"); m=1 ;; esac; done
    [ $m = 1 ] || todo+=("$a")
done
lanes=${LANES:-2}
for w in "${todo[@]}"; do
    while [ "$(jobs -rp | wc -l)" -ge "$lanes" ]; do wait -n; done
    run "$w" &
done
wait
