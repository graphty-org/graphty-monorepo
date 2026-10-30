#!/bin/bash
# Runs a command that drives a browser (a vitest browser or Storybook project, a Playwright script, a
# screenshot capture) in one of the machine's four shared browser slots, waiting until one is free.
# On 2026-10-01, 23 browsers at once filled the swap; every browser-driving command on this machine
# goes through these slots: the pre-push gate's browser shards (tools/prepush-tests.mjs), the screenshot
# previews (tools/visual-preview.sh) and the design studio's sessions (design/ui/studio/tool/with-browser.sh,
# whose slots 1 to 4 are these same lock files).
#
# Usage: tools/with-browser.sh <command...>     (exits with the command's exit code)
#
# The slots are lock files, <main checkout>/tmp/browser-slots/slot1..slot4 (BROWSER_SLOT_DIR names another
# directory, for tests), held with flock for as long as the command runs, so a killed command frees its
# slot at once. The holder of each slot is written beside it (slotN.holder), and a wait for a slot is
# recorded in the wait log, with who held the slots when it began (tools/wait-log.mjs,
# <main checkout>/tmp/waits.jsonl). BROWSER_SLOT_POLL sets the seconds between looks (5).
#
# The low-priority lane: with BROWSER_SLOT_PRIORITY=low (tools/low-priority.sh) the command waits for slot 4
# only, the one every other command tries last, so it never holds more than one of the four and never one an
# ordinary command would have taken first. Low-lane commands take slot 4 in the order they began to wait: each
# leaves a ticket (<slot dir>/.low-<epoch ns>-<pid>) while it waits, and tries the slot only while its ticket is
# the oldest one of a live process, so a command that looks more often cannot keep the slot from the others.
#
# The high lane: with BROWSER_SLOT_PRIORITY=high (the cut's screenshot preview, which the owner reviews before
# a ship: tools/visual-preview.sh sets it) the command takes the next free slot of the four,
# ahead of every other waiter: while it waits it leaves a mark
# (<slot dir>/.high-<pid>), and no command outside the high lane takes a slot while a live mark exists. It
# never takes a slot from a command that holds one.
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
dir=${BROWSER_SLOT_DIR:-$main/tmp/browser-slots}
mkdir -p "$dir"
[ $# -gt 0 ] || { echo "usage: tools/with-browser.sh <command...>" >&2; exit 2; }

# Who holds each slot now: the holder files of live processes.
holders() {
    local f pid
    for f in "$dir"/slot[1-4].holder; do
        [ -f "$f" ] || continue
        pid=$(head -c 20 "$f" | cut -d' ' -f1)
        kill -0 "$pid" 2>/dev/null && head -1 "$f" | cut -c1-300
    done
}

# Whether a command of the high lane other than this one waits for a slot: a live mark.
high_waiting() {
    local f
    for f in "$dir"/.high-*; do
        [ -e "$f" ] || continue
        [ "${f##*/.high-}" = "$$" ] && continue
        if kill -0 "${f##*/.high-}" 2>/dev/null; then return 0; fi
        rm -f "$f"
    done
    return 1
}

# Whether this command's low-lane ticket is the oldest of a live process; dead tickets are removed.
low_turn() {
    local f pid
    for f in "$dir"/.low-*; do
        [ -e "$f" ] || continue
        pid=${f##*-}
        if kill -0 "$pid" 2>/dev/null; then [ "$f" = "$low" ]; return; fi
        rm -f "$f"
    done
    return 1
}

start=$(date +%s%3N)
held_by=()
high=""
if [ "${BROWSER_SLOT_PRIORITY:-}" = high ]; then
    high="$dir/.high-$$"
    : >"$high"
    trap 'rm -f "$high"' EXIT
fi
low=""
if [ "${BROWSER_SLOT_PRIORITY:-}" = low ]; then
    low="$dir/.low-$(date +%s%N)-$$"
    : >"$low"
    trap 'rm -f "$low"' EXIT
fi
while :; do
    slots="1 2 3 4"
    if [ -n "$high" ]; then
        :
    elif high_waiting; then
        slots=""
    elif [ -n "$low" ]; then
        slots=""
        if low_turn; then slots=4; fi
    fi
    for i in $slots; do
        exec {fd}>"$dir/slot$i"
        if flock -n "$fd"; then
            echo "$$ $(date -u +%Y-%m-%dT%H:%M:%SZ) $PWD :: $*" >"$dir/slot$i.holder"
            [ -z "$high" ] || rm -f "$high"
            [ -z "$low" ] || rm -f "$low"
            if [ ${#held_by[@]} -gt 0 ]; then
                node "$here/wait-log.mjs" browser-slot "$start" "$PWD :: $*" "${held_by[@]}" 2>/dev/null
            fi
            "$@"
            rc=$?
            rm -f "$dir/slot$i.holder"
            flock -u "$fd"
            exit $rc
        fi
        exec {fd}>&-
    done
    if [ ${#held_by[@]} = 0 ]; then
        mapfile -t held_by < <(holders)
        [ ${#held_by[@]} -gt 0 ] || held_by=("unknown (a command that takes the slots without this script)")
        echo "with-browser: waiting for one of 4 browser slots, held by: $(printf '%s; ' "${held_by[@]}")" >&2
    fi
    sleep "${BROWSER_SLOT_POLL:-5}"
done
