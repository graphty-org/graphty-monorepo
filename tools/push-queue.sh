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

# The push log, which githerd reads to learn whose pull request a branch is
# (githerd/lib/owners.mjs): one JSON line per push, appended when it ends, with the pushed branch
# and commit and the Claude Code session that launched it -- the first ancestor process with a
# registry entry in ~/.claude/sessions (its procStart matching, so a reused pid is not mistaken for
# it), or null. Append only; a missing jq skips the line, never the push.
# ponytail: only the last refspec of a push is logged; one branch per push is the norm here.
log=${PUSH_QUEUE_LOG:-$(dirname "$dir")/push-log.jsonl}
branch=; sha=; session=
args=("$@"); i=1
if [ "${args[0]:-}" = git ]; then
    while [ $i -lt ${#args[@]} ] && [ "${args[$i]}" != push ]; do i=$((i + 1)); done
    pos=()
    for a in "${args[@]:$((i + 1))}"; do case $a in -*) ;; *) pos+=("$a") ;; esac; done
    if [ ${#pos[@]} -ge 2 ]; then
        ref=${pos[${#pos[@]} - 1]}; src=${ref%%:*}; src=${src#+}; dst=${ref#*:}
    else
        src=HEAD; dst=$(git symbolic-ref --short -q HEAD)
    fi
    branch=${dst#refs/heads/}
    sha=$(git rev-parse --verify -q "${src:-HEAD}^{commit}" 2>/dev/null)
fi
p=$$
while [ "${p:-0}" -gt 1 ] && [ -r "/proc/$p/stat" ]; do
    read -ra f <<<"$(sed 's/.*) //' "/proc/$p/stat")"
    entry="${HOME:-}/.claude/sessions/$p.json"
    if [ -f "$entry" ]; then
        session=$(jq -c --arg s "${f[19]}" 'select((.procStart // $s | tostring) == $s and .sessionId != null)
            | {sessionId, name}' "$entry" 2>/dev/null)
        [ -n "$session" ] && break
    fi
    p=${f[1]}
done
"$@"
rc=$?
jq -nc --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg branch "$branch" --arg sha "$sha" --arg cwd "$PWD" \
    --argjson exit "$rc" --argjson session "${session:-null}" \
    '{at: $at, branch: (if $branch == "" then null else $branch end),
      sha: (if $sha == "" then null else $sha end), exit: $exit, cwd: $cwd,
      sessionId: $session.sessionId, name: $session.name}' >>"$log" 2>/dev/null
exit $rc
