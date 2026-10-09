#!/usr/bin/env bash
# Runs a command that launches a headless browser only when one of the machine's shared browser
# slots is free, so this machine never runs more than four gated browsers at once.
# On 2026-10-01 a design round ran 23 browsers at once (49 GB), filled swap and set off an alert.
#
# The slots are the machine-wide ones every browser-driving command takes: the main checkout's
# tmp/browser-slots/slot1..slot4, the same lock files as <main checkout>/tmp/with-browser.sh, which
# the pre-push gate's browser shards and visual-preview captures take. Until 2026-10-09 this script
# kept a pool of its own in /tmp, so study sessions and test runs each had four slots and together
# ran eight or more browsers at once (tool/README.md, "Browsers").
#
# Usage: with-browser.sh <command> [args...]. BROWSER_SLOTS (1 to 4) uses fewer of the four.
set -u
SLOTS=${BROWSER_SLOTS:-4}
if ! [[ "$SLOTS" =~ ^[1-4]$ ]]; then
    echo "with-browser.sh: BROWSER_SLOTS must be 1 to 4 (the machine runs at most four browsers), not \"$SLOTS\"" >&2
    exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
# real.mjs --step, --end and --brief launch no browser: a step talks to a session that already holds
# its slot. Wrapped, it waited for a second slot while its own session held one (r1-s04, void).
if [[ "$*" =~ real\.mjs\ --(step|end|brief)( |$) ]]; then
    exec "$@"
fi
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
DIR="$main/tmp/browser-slots"
mkdir -p "$DIR"
while true; do
    for i in $(seq 1 "$SLOTS"); do
        exec 9>"$DIR/slot$i"
        if flock -n 9; then
            export BROWSER_SLOT=$i BROWSER_SLOT_FILE="$DIR/slot$i"
            "$@"
            code=$?
            flock -u 9
            exit $code
        fi
        exec 9>&-
    done
    sleep 2
done
