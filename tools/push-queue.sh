#!/bin/bash
# Run a command (normally `git push ...`, whose pre-push hook runs the full gate) in a
# first-come-first-served queue that lets SLOTS of them run at once.
#
# Usage: tools/push-queue.sh git push origin HEAD:<branch>
#        PUSH_QUEUE_PRIORITY=critical tools/push-queue.sh git push ...   (goes ahead of every normal push)
#
# Each waiter writes a ticket named by its rank, its arrival time and its pid; it runs once its
# ticket is among the SLOTS oldest tickets whose process is still alive, critical ones first.
# Tickets of dead processes are removed, so a killed push never blocks the queue. The tickets live
# in the main checkout's tmp/push-queue, which every worktree of the repository shares; githerd's
# board reads them (githerd/lib/proc.mjs pushQueueTickets).
# Run from a private copy: bash reads a script from disk as it runs, so editing this file would
# otherwise change the code of every push already waiting.
if [ -z "${PUSH_QUEUE_COPY:-}" ]; then
    copy=$(mktemp /tmp/push-queue.XXXXXX.sh) && cp "$0" "$copy" && PUSH_QUEUE_COPY=$copy exec bash "$copy" "$@"
fi
SLOTS=${PUSH_QUEUE_SLOTS:-3}
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
dir=${PUSH_QUEUE_DIR:-$main/tmp/push-queue}
mkdir -p "$dir"
rank=1; [ "${PUSH_QUEUE_PRIORITY:-}" = critical ] && rank=0
ticket="$dir/$rank-$(date +%s%N)-$$"
echo "$PWD :: $*" > "$ticket"
trap 'rm -f "$ticket" "$PUSH_QUEUE_COPY"' EXIT

while :; do
    live=()
    # Order by rank (0 critical, 1 normal; a ticket from before ranks existed counts as 1), then by
    # arrival time.
    for t in $(ls "$dir" | awk -F- '{ if (NF == 2) print "1 " $1 " " $0; else print $1 " " $2 " " $0 }' | sort -k1,1n -k2,2n | awk '{print $3}'); do
        pid=${t##*-}
        if kill -0 "$pid" 2>/dev/null; then live+=("$t"); else rm -f "$dir/$t"; fi
    done
    for ((i = 0; i < ${#live[@]} && i < SLOTS; i++)); do
        [ "${live[$i]}" = "$(basename "$ticket")" ] && break 2
    done
    sleep 10
done
"$@"
