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
chip2) walk chip2 setup:$SET/friends-ranked.txt '--click "Data"' '--click "Add filter step"' '--click "Attribute"' \
    '--click "weight#1"' '--click "Value" --type 4' '--click "Add step"' '--hover "Filter: 19 of 20 nodes"' \
    '--click "Filter: 19 of 20 nodes"' ;;
twosrc) walk twosrc empty '--click "No thanks"' '--click "New from data..."' \
    '--click "choose a file..." --upload people.csv' '--click "Add a table"' '--click "File..." --upload messages.csv' \
    '--click "Load"' '--click "Data"' '--rclick "people.csv and messages.csv"' '--key Escape' \
    '--click "people.csv and messages.csv"' '--hover-icon 1' ;;
editsrc) walk editsrc setup:$SET/team-ranked.txt '--click "Data"' '--click "team.csv"' '--click "Source actions"' \
    '--click "Edit source..."' '--key Escape' ;;
*) echo "unknown walk $1" ;;
esac; }
todo=(); for a in "$@"; do todo+=("$a"); done
for w in "${todo[@]}"; do
    while [ "$(jobs -rp | wc -l)" -ge "${LANES:-2}" ]; do wait -n; done
    run "$w" &
done
wait
