#!/usr/bin/env bash
# Runs a command that launches a headless browser only when one of the shared browser slots is
# free, so the design round as a whole never runs more than BROWSER_SLOTS browsers at once.
# On 2026-10-01 a design round ran 23 browsers at once (49 GB), filled swap and set off an alert.
# Usage: kit/with-browser.sh <command> [args...]
set -u
SLOTS=${BROWSER_SLOTS:-4}
DIR=/tmp/graphty-design-browser-slots
mkdir -p "$DIR"
while true; do
    for i in $(seq 1 "$SLOTS"); do
        exec 9>"$DIR/slot-$i.lock"
        if flock -n 9; then
            export BROWSER_SLOT=$i
            "$@"
            code=$?
            flock -u 9
            exit $code
        fi
        exec 9>&-
    done
    sleep 2
done
