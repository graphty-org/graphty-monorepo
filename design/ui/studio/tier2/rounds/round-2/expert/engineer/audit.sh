#!/usr/bin/env bash
# Screenshot audit walks: every tier 2 screen and state, by pointer, in one window size.
# Usage: SIZE=1200x900 audit.sh <walk>... | all     (REAL_DIST must name the frozen build)
# Sessions go to <this folder>/<SIZE>/<walk>/, each step logged in <SIZE>/<walk>.log.
set -u
E=$(cd "$(dirname "$0")" && pwd)
ST=$(cd "$E/../../../../.." && pwd)
SET=$ST/rounds/tier-2/setups
SIZE=${SIZE:-1200x900}
HERE=$E/$SIZE
mkdir -p "$HERE"
R() { REAL_VIEWPORT=$SIZE node "$ST/tool/real.mjs" "$@"; }
walk() {
    local name=$1 start=$2; shift 2
    local dir=$HERE/$name log=$HERE/$name.log n=1
    rm -rf "$dir"; : >"$log"
    echo "== start $start" >>"$log"
    R --start "$dir" $start >>"$log" 2>&1; echo "exit $?" >>"$log"
    for s in "$@"; do
        n=$((n + 1)); printf '== [%02d] %s\n' "$n" "$s" >>"$log"
        eval "R --step \"$dir\" $s" >>"$log" 2>&1; echo "exit $?" >>"$log"
    done
    R --end "$dir" >>"$log" 2>&1
    echo "$SIZE $name done"
}
run() { case $1 in
start) walk start empty '--click "No thanks"' '--hover "New from data..."' ;;
import) walk import empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload people.csv' '--click "role=combobox:Role of team"' '--key Escape' \
    '--click "Add a table"' '--click "File..." --upload messages.csv' '--click "Show the 1 unmatched row"' \
    '--click "Load"' '--click "Data"' '--click "people.csv and messages.csv"' '--click "Source actions"' \
    '--key Escape' '--click "1 row left out"' ;;
openfile) walk openfile empty '--click "No thanks"' '--click "Open project or file..." --upload bus-stops.csv' \
    '--click "role=combobox:Role of minutes"' '--click "Weight"' '--click "Farther"' '--click "Direction"' \
    '--key Escape' '--click "Load"' ;;
weight) walk weight empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload trails.csv' '--click "role=combobox:Role of km"' '--click "Weight"' \
    '--click "Farther"' '--click "Load"' '--key p' '--type Trailhead' '--key Enter' '--type Summit' \
    '--key Enter' '--click "Find path"' '--click "Values"' ;;
filter) walk filter setup:$SET/friends-ranked.txt '--click "Data"' '--click "weight"' \
    '--click "Attribute actions"' '--click "Filter to..."' '--click "Value" --type 4' '--click "Add step"' \
    '--click "Apply step: weight is at least 4"' '--click "Graph"' '--click "Data"' \
    '--click "weight is at least 4"' '--click "Value" --key Control+a --type 5' '--click "Save and turn on"' \
    '--click "Add filter step"' '--click "Keep"' '--key Escape' '--key Escape' \
    '--rclick "weight is at least 5"' '--click "role=menuitem:Delete"' ;;
chip) walk chip setup:$SET/friends-ranked.txt '--click "Data"' '--click "Add filter step"' '--click "Attribute"' \
    '--click "weight#1"' '--click "Value" --type 4' '--click "Add step"' '--hover "Filter: weight is at least 4"' \
    '--click "Filter: weight is at least 4"' ;;
path) walk path setup:$SET/florentine-ranked.txt '--key p' '--type Strozzi' '--key Enter' '--type Pazzi' \
    '--key Enter' '--click "Find path"' '--click "Values"' ;;
notes) walk notes setup:$SET/friends-ranked.txt '--click "Notes"' '--key / --type Farah --key Enter' '--key n' \
    '--type "Moving away in May; ask who takes over the Tuesday run"' '--key Control+Enter' \
    '--key Escape --key Escape' '--click "Notes"' '--click "Add note"' \
    '--type "Spring list, checked against the sign-up sheet"' '--key Control+Enter' '--key Control+s' \
    '--click Save' '--reopen' '--click friends' '--click "Notes"' ;;
replace) walk replace setup:$SET/team-ranked.txt '--click "role=treeitem:PageRank"' '--click "Values"' \
    '--click "Data"' '--click "team.csv"' '--click "Source actions"' '--click "Replace with file..." --upload team-v2.csv' \
    '--click "Replace"' '--click "role=treeitem:PageRank"' '--click "Rerun"' ;;
select) walk select setup:$SET/bus-stops-ranked.txt '--click "Find nodes, edges, values"' '--type "minutes >= 10"' \
    '--key Control+a --type "=minutes >= 10"' '--key Enter' '--key Control+a --type "=minutes >= \`10\`"' \
    '--key Enter' '--click "Selection actions"' '--key Escape' ;;
neighbors) walk neighbors setup:$SET/friends-ranked.txt '--click "Find nodes, edges, values" --type Ava' \
    '--key Enter' '--click "Degree"' '--click role=radio:2' '--click "Filter to neighbors"' '--click "Data"' ;;
edge) walk edge setup:$SET/bus-stops-ranked-names.txt '--click "Find nodes, edges, values"' \
    '--type "Station -> Stadium"' '--key ArrowDown --key Enter' '--click "Edge actions"' \
    '--click "Select endpoints"' '--click "role=tab:Style"' ;;
analyze) walk analyze setup:$SET/friends-ranked-names.txt '--key Shift+A' '--key Escape' \
    '--click "role=treeitem:Everything"' '--click "role=tab:Style"' ;;
long) walk long setup:$E/long-names-ranked.txt '--key / --type Eastside --key Enter' '--click "Degree"' \
    '--key Escape --key Escape' '--key p' '--type Northern' '--key Enter' '--type Southern' '--key Enter' \
    '--click "Find path"' '--click "Data"' '--click "average_minutes_between_visits"' \
    '--click "Attribute actions"' '--click "Filter to..."' '--click "Value" --type 20' '--click "Add step"' \
    '--click "Graph"' '--key / --type "Eastside Cold"' ;;
*) echo "unknown walk $1" ;;
esac; }
ALL="start import openfile weight filter chip path notes replace select neighbors edge analyze long"
todo=(); for a in "$@"; do [ "$a" = all ] && todo+=($ALL) || todo+=("$a"); done
for w in "${todo[@]}"; do
    while [ "$(jobs -rp | wc -l)" -ge "${LANES:-2}" ]; do wait -n; done
    run "$w" &
done
wait
