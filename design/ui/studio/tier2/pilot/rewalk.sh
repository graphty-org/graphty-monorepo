#!/usr/bin/env bash
# Re-walks the tier 2 pilot success paths (T4, T17, T18, T20, T22, T24, both datasets) with tool/real.mjs.
# Usage: rewalk.sh <session> [<session> ...]   (sessions: T4A T4B T17A T17B T18A T18B T20A T20B T22A T22B T24A T24B)
set -u
ST=$(cd "$(dirname "$0")/../.." && pwd)
HERE=${HERE:-$ST/tmp/rewalk}
SET=$ST/rounds/tier-2/setups
# REAL_DIST (optional): a frozen copy of graphty/dist to serve instead of graphty/dist itself
R() { node $ST/tool/real.mjs "$@"; }

walk() {
    local name=$1; shift
    local dir=$HERE/$name log=$HERE/$name.log
    rm -rf "$dir"; : >"$log"
    echo "== $name start $1" >>"$log"
    R --start "$dir" "$1" >>"$log" 2>&1; echo "exit $?" >>"$log"
    shift
    for s in "$@"; do
        echo "== $name step: $s" >>"$log"
        eval "R --step \"$dir\" $s" >>"$log" 2>&1; echo "exit $?" >>"$log"
    done
    R --end "$dir" >>"$log" 2>&1
}

for t in "$@"; do case $t in
T4A) walk T4A empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload people.csv' '--click "Add a table"' \
    '--click "File..." --upload messages.csv' '--click "Show the 1 unmatched row"' \
    '--click "Load"' '--click "Data"' '--hover "people.csv and messages.csv"' \
    '--click "people.csv and messages.csv"' ;;
T4B) walk T4B empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload players.csv' '--click "Add a table"' \
    '--click "File..." --upload passes.csv' '--click "Show the 1 unmatched row"' \
    '--click "Load"' '--click "Data"' '--hover "players.csv and passes.csv"' ;;
T17A) walk T17A setup:$SET/friends.txt '--click "Data"' '--click "weight"' '--click "Attribute actions"' \
    '--click "Filter to..."' '--click "Value" --type 4' '--click "Add step"' \
    '--hover "weight is at least 4"' '--click "Apply step: weight is at least 4"' ;;
T17B) walk T17B setup:$SET/lesmis.txt '--click "Data"' '--click "shared_chapters"' '--click "Attribute actions"' \
    '--click "Filter to..."' '--click "Value" --type 5' '--click "Add step"' \
    '--hover "shared_chapters is at least 5"' '--click "Apply step: shared_chapters is at least 5"' ;;
T18A) walk T18A setup:$SET/friends.txt '--key p' '--type Chloe' '--click "Chloe"' \
    '--click "To" --type Milo' '--click "Milo"' '--click "Find path"' '--click "Values"' ;;
T18B) walk T18B setup:$SET/florentine.txt '--key p' '--type Strozzi' '--key Enter' '--type Pazzi' \
    '--key Enter' '--click "Find path"' '--click "Values"' ;;
T20A) walk T20A empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload bus-stops.csv' '--click-at 728,205' '--click "Weight"' \
    '--click "Farther"' '--click "Load"' '--key p' '--type Depot' '--click "Depot"' \
    '--click "To" --type Harbor' '--click "Harbor"' '--click "Find path"' '--click "Values"' ;;
T20B) walk T20B empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload trails.csv' '--click-at 728,205' '--click "Weight"' \
    '--click "Farther"' '--click "Load"' '--key p' '--type Trailhead' '--click "Trailhead"' \
    '--click "To" --type Summit' '--click "Summit"' '--click "Find path"' '--click "Values"' ;;
T22A) walk T22A setup:$SET/bus-stops.txt '--click "Find nodes, edges, values"' '--type "=minutes >= 10"' \
    '--key Enter' '--key Control+a --type "=minutes >= \`10\`"' '--key Enter' ;;
T22B) walk T22B setup:$SET/lesmis.txt '--key /' '--type "="' '--type "shared_chapters >= \`10\`"' '--key Enter' ;;
T24A) walk T24A setup:$SET/friends-names.txt '--click-at 755,586' '--click "Edge actions"' \
    '--click "Select endpoints"' ;;
T24B) walk T24B setup:$SET/bus-stops-names.txt '--click-at 750,172' '--click "Edge actions"' \
    '--click "Select endpoints"' '--click "Find nodes, edges, values" --type Stadium' ;;
*) echo "unknown $t" ;;
esac; done
