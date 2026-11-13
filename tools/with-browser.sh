#!/bin/bash
# Runs a command that drives a browser (a vitest browser or Storybook project, a Playwright script, a
# screenshot capture) in one of the machine's shared browser slots, waiting until one is free.
# On 2026-10-01, 23 browsers at once filled the swap; every browser-driving command on this machine
# goes through these slots: the pre-push gate's browser shards (tools/prepush-tests.mjs), the screenshot
# previews (tools/visual-preview.sh) and the design studio's sessions (design/ui/studio/tool/with-browser.sh,
# a wrapper that waits through this script, with BROWSER_SLOTS above 4 for its GPU-drawn sessions).
#
# Usage: tools/with-browser.sh <command...>     (exits with the command's exit code)
#
# The slots are lock files, <main checkout>/tmp/browser-slots/slot1..slot4 (BROWSER_SLOT_DIR names another
# directory, for tests), held with flock for as long as the command runs, so a killed command frees its
# slot at once. The holder of each slot is written beside it (slotN.holder), and a wait for a slot is
# recorded in the wait log, with who held the slots when it began (tools/wait-log.mjs,
# <main checkout>/tmp/waits.jsonl). BROWSER_SLOT_POLL sets the seconds between looks (5). The command runs
# with BROWSER_SLOT (the slot's number) and BROWSER_SLOT_FILE (its lock file) set.
#
# BROWSER_SLOTS (1 to 16, default 4) is how many slots the command may take, slot1 up to slotN. Slots 5 and
# up are the design studio's alone; nothing else sets more than 4.
#
# Ordinary commands take a slot in the order they began to wait: each leaves a ticket
# (<slot dir>/queue/<epoch ns>-<pid>, holding its BROWSER_SLOTS) while it waits, and takes slot N only while no
# older ticket of a live process could take slot N too, so a waiter is never held up behind one that cannot
# use the slot it could.
#
# The low-priority lane: with BROWSER_SLOT_PRIORITY=low (tools/low-priority.sh) the command waits for slot 4
# only (and the studio's 5 and up), the one every other command tries last, so it never holds more than one of
# the four and never one an ordinary command would have taken first. Low-lane commands take their slot in the
# order they began to wait, by the same rule but with tickets of their own (<slot dir>/.low-<epoch ns>-<pid>),
# so a low-lane waiter never holds up an ordinary one, and a command that looks more often cannot keep the slot
# from the others.
#
# The high lane: with BROWSER_SLOT_PRIORITY=high (the cut's screenshot preview, which the owner reviews before
# a ship: tools/visual-preview.sh sets it) the command takes the next free slot,
# ahead of every other waiter: while it waits it leaves a mark
# (<slot dir>/.high-<pid>), and no command outside the high lane takes a slot while a live mark exists. It
# never takes a slot from a command that holds one.
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
dir=${BROWSER_SLOT_DIR:-$main/tmp/browser-slots}
[ $# -gt 0 ] || { echo "usage: tools/with-browser.sh <command...>" >&2; exit 2; }
n=${BROWSER_SLOTS:-4}
if ! [[ "$n" =~ ^([1-9]|1[0-6])$ ]]; then
    echo "with-browser.sh: BROWSER_SLOTS must be 1 to 16, not \"$n\"" >&2
    exit 2
fi
mkdir -p "$dir/queue"

# Who holds each slot this command may take now: the holder files of live processes.
holders() {
    local i f pid
    for i in $(seq 1 "$n"); do
        f=$dir/slot$i.holder
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

# Whether slot $1 is this command's to take: no older ticket of its lane, of a live process, could take it
# too (a ticket that names no slot count could take any). Dead tickets are removed.
my_turn() {
    local f max
    for f in $tickets; do
        [ -e "$f" ] || continue
        [ "$f" = "$ticket" ] && return 0
        if kill -0 "${f##*-}" 2>/dev/null; then
            max=$(head -c 3 "$f" 2>/dev/null | tr -dc 0-9)
            [ "${max:-16}" -lt "$1" ] || return 1
        else
            rm -f "$f"
        fi
    done
    return 0
}

start=$(date +%s%3N)
held_by=()
high=""
ticket=""
tickets=""
first=1
case "${BROWSER_SLOT_PRIORITY:-}" in
high)
    high="$dir/.high-$$"
    : >"$high"
    ;;
low)
    first=$((n < 4 ? n : 4))
    tickets="$dir/.low-*"
    ticket="$dir/.low-$(date +%s%N)-$$"
    ;;
*)
    tickets="$dir/queue/*"
    ticket="$dir/queue/$(date +%s%N)-$$"
    ;;
esac
[ -z "$ticket" ] || echo "$n" >"$ticket"
trap 'rm -f "$high" "$ticket"' EXIT
trap 'exit 143' TERM INT HUP
while :; do
    slots=$(seq "$first" "$n")
    if [ -z "$high" ] && high_waiting; then slots=""; fi
    for i in $slots; do
        [ -z "$ticket" ] || my_turn "$i" || continue
        exec {fd}>"$dir/slot$i"
        if flock -n "$fd"; then
            echo "$$ $(date -u +%Y-%m-%dT%H:%M:%SZ) $PWD :: $*" >"$dir/slot$i.holder"
            rm -f "$high" "$ticket"
            trap - EXIT TERM INT HUP
            if [ ${#held_by[@]} -gt 0 ]; then
                node "$here/wait-log.mjs" browser-slot "$start" "$PWD :: $*" "${held_by[@]}" 2>/dev/null
            fi
            export BROWSER_SLOT=$i BROWSER_SLOT_FILE=$dir/slot$i
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
        echo "with-browser: waiting for one of $n browser slots, held by: $(printf '%s; ' "${held_by[@]}")" >&2
    fi
    sleep "${BROWSER_SLOT_POLL:-5}"
done
