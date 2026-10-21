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
# real.mjs --start takes its own slot (it runs its session process through this gate), so wrapped
# it held one slot with no browser while that process waited for a second. real.mjs --prove runs
# the gate itself for every browser it starts, so wrapped it waited forever when the other three
# slots were busy.
if [[ "$*" =~ real\.mjs\ --(start|step|end|brief|prove)( |$) ]]; then
    exec "$@"
fi
# bars.mjs launches no browser itself: its tier 2 and tier 3 walks are real.mjs sessions, each
# taking its own slot, and its tier 1 screens run as "bars.mjs ... --inner", which it wraps in this
# gate itself. Wrapped, it held one slot with no browser for its whole run (round 1's tool dry run 2).
if [[ "$*" =~ bars\.mjs( |$) && ! "$*" =~ (^| )--inner( |$) ]]; then
    exec "$@"
fi
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
# BROWSER_SLOT_DIR: another pool, for the self-test that fills every slot
DIR="${BROWSER_SLOT_DIR:-$main/tmp/browser-slots}"
mkdir -p "$DIR/queue"
# First come, first served: each waiter holds a ticket named by when it asked (nanoseconds, then its
# pid), and only the oldest live ticket may take a free slot. Until 2026-10-21 every waiter retried
# every 2 seconds in no order, so one start waited 14 minutes while later ones got slots (round 1's
# tool dry run 2). A ticket whose process is gone (killed while it waited) is removed by whoever
# finds it. Commands that take the machine's slots without this script (the pre-push gate's
# shards) do not queue here; they take a free slot when they find one.
ticket="$DIR/queue/$(date +%s%N)-$$"
: >"$ticket"
trap 'rm -f "$ticket"' EXIT
trap 'exit 143' TERM INT HUP
first_in_line() {
    local t
    for t in $(ls "$DIR/queue" | sort); do
        [[ "$DIR/queue/$t" == "$ticket" ]] && return 0
        # alive, and still this script (a pid can be reused by another process)
        grep -qs with-browser "/proc/${t##*-}/cmdline" && return 1
        rm -f "$DIR/queue/$t"
    done
    return 0
}
while true; do
    if first_in_line; then
        for i in $(seq 1 "$SLOTS"); do
            exec 9>"$DIR/slot$i"
            if flock -n 9; then
                rm -f "$ticket"
                trap - EXIT TERM INT HUP
                export BROWSER_SLOT=$i BROWSER_SLOT_FILE="$DIR/slot$i"
                "$@"
                code=$?
                flock -u 9
                exit $code
            fi
            exec 9>&-
        done
    fi
    sleep 1
done
