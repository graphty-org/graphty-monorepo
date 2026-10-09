#!/usr/bin/env bash
# Pilots every tier 2 task half (A and B, T21B and T12R included) on the frozen study build: each
# half's success path from the answer key, from the start tasks.md gives it, plus the steps that
# show the screens the last dry run's fixes changed (Add | Leave out before and after "Show the 1
# unmatched row", the left-out row's inspector, a preview that scrolls, the run's weight note, the
# find box's refusal and its Enter on an unchanged rule, the neighbor list's heading, tooltip and
# filter toggle at another reach, the find list of a node's ties). A walk whose log holds "exit 1"
# or "exit 2" had a step miss.
#
# Usage: REAL_DIST=<frozen build> repilot.sh <half> [<half> ...]   (T4A ... T12RB, a task such as
#        T23, or "all")
# OUT=<dir> writes the sessions and logs there (default tier2/rounds/r2d2/pilot).
# LANES=<n> runs that many halves at once (default 2; each takes one of the machine's 4 browsers).
set -u
ST=$(cd "$(dirname "$0")/../.." && pwd)
OUT=${OUT:-$ST/tier2/rounds/r2d2/pilot}
SET=$ST/rounds/tier-2/setups
mkdir -p "$OUT"
R() { node "$ST/tool/real.mjs" "$@"; }

walk() {
    local name=$1 start=$2; shift 2
    local dir=$OUT/$name log=$OUT/$name.log
    rm -rf "$dir"; : >"$log"
    echo "== $name start $start" >>"$log"
    R --start "$dir" "$start" >>"$log" 2>&1; echo "exit $?" >>"$log"
    for s in "$@"; do
        echo "== $name step: $s" >>"$log"
        eval "R --step \"$dir\" $s" >>"$log" 2>&1; echo "exit $?" >>"$log"
    done
    R --end "$dir" >>"$log" 2>&1
    if grep -qE '^exit [12]$' "$log"; then echo "$name: step missed ($log)"; else echo "$name: ok"; fi
}

two_tables() { # $1 half, $2 node file, $3 edge file, $4 source row
    walk "$1" empty '--click "No thanks"' '--click "New from data..."' \
        "--click \"choose a file...\" --upload $2" '--click "Add a table"' \
        "--click \"File...\" --upload $3" '--click "Show the 1 unmatched row"' '--hover "Leave out"' \
        '--click "Load"' '--click "Data"' '--click "1 row left out"' "--click \"$4\""
}
filter() { # $1 half, $2 setup, $3 column, $4 value
    walk "$1" "setup:$SET/$2" '--click "Data"' "--click \"$3\"" '--click "Attribute actions"' \
        '--click "Filter to..."' "--click \"Value\" --type $4" '--click "Add step"' \
        "--click \"Apply step: $3 is at least $4\""
}
weight_at_load() { # $1 half, $2 file, $3 column, $4 from, $5 to
    walk "$1" empty '--click "No thanks"' '--click "New from data..."' \
        "--click \"choose a file...\" --upload $2" "--click \"Role of $3\"" '--click "Weight"' \
        '--click "Farther"' '--click "Load"' "--key p --type $4 --key Enter" \
        "--type $5 --key Enter" '--key Enter'
}

run() { case $1 in
T4A) two_tables T4A people.csv messages.csv "people.csv and messages.csv" ;;
T4B) two_tables T4B players.csv passes.csv "players.csv and passes.csv" ;;
T17A) filter T17A friends-ranked.txt weight 4 ;;
T17B) filter T17B lesmis-ranked.txt shared_chapters 5 ;;
T18A) walk T18A "setup:$SET/friends-ranked.txt" '--key p --type Chloe --key Enter' '--type Milo --key Enter' \
    '--key Enter' '--click "Advanced run settings"' ;;
T18B) walk T18B "setup:$SET/florentine-ranked.txt" '--key p --type Strozzi --key Enter' \
    '--type Pazzi --key Enter' '--key Enter' '--click "Advanced run settings"' ;;
T19A) walk T19A "setup:$SET/friends-ranked.txt" '--key / --type Farah --key Enter' '--key n' \
    '--type "Moving away in May; ask who takes over the Tuesday run"' '--key Control+Enter' \
    '--key Escape --key Escape' '--key n' '--type "Spring list, checked against the sign-up sheet"' \
    '--key Control+Enter' '--key Control+s' '--click Save' '--reopen' '--click "friends#1"' '--click "Notes"' ;;
T19B) walk T19B "setup:$SET/florentine-ranked.txt" '--key / --type Medici --key Enter' '--key n' \
    '--type "Check the 1434 return from exile"' '--key Control+Enter' '--key Escape --key Escape' '--key n' \
    '--type "Marriages only; business ties are a separate list"' '--key Control+Enter' '--key Control+s' \
    '--click Save' '--reopen' '--click "Florentine families#1"' '--click "Notes"' ;;
T20A) weight_at_load T20A bus-stops.csv minutes Depot Harbor ;;
T20B) weight_at_load T20B trails.csv km Trailhead Summit ;;
T21A) walk T21A "setup:$SET/friends-ranked.txt" '--click "Values"' '--click "Data"' '--rclick "friends.csv"' \
    '--click "Replace with file..." --upload friends-v2.csv' '--click "Replace"' '--click "Rerun"' ;;
T21B) walk T21B "setup:$SET/team-ranked.txt" '--click "Values"' '--click "Data"' '--rclick "team.csv"' \
    '--click "Replace with file..." --upload team-v2.csv' '--click "Replace"' '--click "Rerun"' ;;
T22A) walk T22A "setup:$SET/bus-stops-ranked.txt" '--key /' '--type "=minutes >= 10"' \
    '--key Control+a --type "=minutes >= \`10\`"' '--key Enter' '--key Enter' ;;
T22B) walk T22B "setup:$SET/lesmis-ranked.txt" '--key /' '--type "=shared_chapters >= 10x"' \
    '--key Control+a --type "=shared_chapters >= \`10\`"' '--key Enter' '--key Enter' ;;
T23A) walk T23A "setup:$SET/friends-ranked.txt" '--key / --type Ava --key Enter' '--key g' '--click role=radio:2' \
    '--click "Filter to neighbors"' '--hover "Ava and 14 connections within 2 hops#2"' '--click role=radio:1' \
    '--hover "Filter to neighbors"' ;;
T23B) walk T23B "setup:$SET/florentine-ranked.txt" '--key / --type Medici --key Enter' '--key g' '--click role=radio:2' \
    '--click "Filter to neighbors"' '--hover "Medici and 11 connections within 2 hops#2"' '--click role=radio:1' \
    '--hover "Filter to neighbors"' '--click "Graph Florentine families"' ;;
T24A) walk T24A "setup:$SET/friends-ranked-names.txt" '--click-at 755,586' '--click "Edge actions"' \
    '--click "Select endpoints"' ;;
T24B) walk T24B "setup:$SET/bus-stops-ranked-names.txt" '--click-at 762,145' '--click "Edge actions"' \
    '--click "Select endpoints"' ;;
T12RA) walk T12RA "setup:$SET/lesmis-ranked.txt" '--key / --type Javert' '--key ArrowDown --key Enter' \
    '--click "Degree"' '--click "Back to Javert"' ;;
T12RB) walk T12RB "setup:$SET/florentine-ranked.txt" '--key / --type Medici' '--key ArrowDown --key Enter' \
    '--click "Degree"' '--click "Back to Medici"' ;;
*) echo "unknown half $1" ;;
esac; }

ALL="T4A T4B T17A T17B T18A T18B T19A T19B T20A T20B T21A T21B T22A T22B T23A T23B T24A T24B T12RA T12RB"
todo=()
for a in "$@"; do
    if [ "$a" = all ]; then todo+=($ALL); continue; fi
    m=0; for w in $ALL; do case $w in "$a"|"$a"[AB]) todo+=("$w"); m=1 ;; esac; done
    [ $m = 1 ] || todo+=("$a")
done
lanes=${LANES:-2}
for w in "${todo[@]}"; do
    while [ "$(jobs -rp | wc -l)" -ge "$lanes" ]; do wait -n; done
    run "$w" &
done
wait
