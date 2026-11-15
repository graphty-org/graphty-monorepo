#!/bin/bash
# Run a command (normally `git push ...`, whose pre-push hook runs the full gate) in a
# first-come-first-served queue that lets SLOTS of them run at once.
#
# Usage: tools/push-queue.sh git push origin HEAD:<branch>
#        PUSH_QUEUE_PRIORITY=critical tools/push-queue.sh git push ...   (goes ahead of every normal push)
#
# Each waiter writes a ticket named by its rank, its arrival time and its pid; it runs once its
# ticket is among the SLOTS oldest tickets whose process is still alive, critical ones first.
# Tickets of dead processes are removed, so a killed push never blocks the queue. The tickets, the
# push log and the gate logs live in the main checkout's tmp/, which every worktree of the
# repository shares, whichever worktree this runs from; githerd's board reads the tickets
# (githerd/lib/proc.mjs pushQueueTickets).
# A commit whose gate already failed a check of its own (build, lint, tests, SonarQube ...) is not
# queued again while nothing it depends on changed: same commit, same checkout fingerprint, same gate.
# PUSH_QUEUE_RETRY=1 pushes it anyway, for a failure you believe was the machine's, not the commit's.
# Settings, for tests: PUSH_QUEUE_SLOTS (4), PUSH_QUEUE_DIR (the tickets), PUSH_QUEUE_LOG (the push
# log), PUSH_QUEUE_GATE (the gate's live worktree), PUSH_QUEUE_POLL (seconds between looks, 10).
# Run from a private copy: bash reads a script from disk as it runs, so editing this file would
# otherwise change the code of every push already waiting.
# The copy goes in the main checkout's tmp/, not /tmp, which other processes on this machine clear.
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
# The queue itself runs from the gate's live copy, like the gate, whichever copy of this file was
# called (a branch's tools/push-queue.sh, or tmp/push-queue.sh), so a queue fix made live with
# `tools/live.sh gate <branch>` reaches every push at once.
live_queue=${PUSH_QUEUE_GATE:-$main/.worktrees/gate-live}/tools/push-queue.sh
if [ -z "${PUSH_QUEUE_COPY:-}" ] && [ -f "$live_queue" ] && ! [ "$0" -ef "$live_queue" ]; then
    exec bash "$live_queue" "$@"
fi
if [ -z "${PUSH_QUEUE_COPY:-}" ]; then
    mkdir -p "$main/tmp/push-queue-copies" &&
        copy=$(mktemp "$main/tmp/push-queue-copies/push-queue.XXXXXX.sh") && cp "$0" "$copy" &&
        PUSH_QUEUE_COPY=$copy exec bash "$copy" "$@"
fi
# The queue's settings are for this script only, never for the command it runs: exported, the
# snapshot's PUSH_QUEUE_GATE reached every test the gate runs, and a test running a throwaway
# checkout's own push-queue.sh then pushed through the machine's snapshot instead (2026-10-24).
export -n PUSH_QUEUE_GATE PUSH_QUEUE_COPY
# 4 gates at once: since each Node test run is capped at its share of the cores (#2184) and the GPU
# step has its own slot (#2267), 3 gates left the machine at load ~29 of 32 with 20 pushes waiting;
# the 4 machine-wide test slots still keep the test stages from oversubscribing it.
SLOTS=${PUSH_QUEUE_SLOTS:-4}
dir=${PUSH_QUEUE_DIR:-$main/tmp/push-queue}
mkdir -p "$dir"
# The gate's live copy (CLAUDE.md, "Where a change takes effect"): every push's gate runs the scripts
# of .worktrees/gate-live against the checkout being pushed, so a gate fix helps every branch as soon
# as `tools/live.sh gate <branch>` puts it there, instead of after it merges and each branch picks it
# up. First it follows origin/master: a fast-forward or plain merge when it holds no gate fixes of its
# own (no commit that is not a merge is missing from master), else `tools/live.sh gate master`, which
# tests the merge before it goes live. One update at a time (flock); a failed update is reported and
# the push goes on with the gate as it was. Gates already running are not disturbed: git replaces a
# changed file with a new one, and a running script keeps reading the old. A gate-live without the
# split (no PREPUSH_ROOT in its hook) is not used; the push runs its own checkout's gate as before.
#
# Then the push runs from a snapshot of that live copy (tools/gate-snapshot.sh): this script again, from
# the snapshot, with PUSH_QUEUE_GATE naming it, so the source checks, the hook and every script the gate
# starts hours later are one version, whatever live.sh does meanwhile. A caller that already holds a
# snapshot (tools/land.mjs, for a landing's check and its push) passes it as PUSH_QUEUE_GATE, and nothing
# here changes it. This runs before the ticket is written: the snapshot's copy writes the one ticket.
gate_dir=${PUSH_QUEUE_GATE:-$main/.worktrees/gate-live}
use_gate=0
if [ -f "$gate_dir/.gate-snapshot" ]; then
    grep -q PREPUSH_ROOT "$gate_dir/.husky/pre-push" 2>/dev/null && use_gate=1
    echo "push-queue: the gate is the snapshot $gate_dir ($(cat "$gate_dir/.gate-snapshot"))"
elif [ "${1:-}" = git ] && [ -d "$gate_dir" ]; then
    (
        flock 8
        git -C "$gate_dir" fetch -q origin master || exit 1
        git -C "$gate_dir" merge-base --is-ancestor origin/master HEAD && exit 0
        old=$(git -C "$gate_dir" rev-parse HEAD)
        if [ -z "$(git -C "$gate_dir" rev-list --no-merges -1 HEAD ^origin/master)" ]; then
            hooks=$(mktemp -d) && cp "$gate_dir/.husky/commit-msg" "$hooks/" &&
                git -C "$gate_dir" -c core.hooksPath="$hooks" merge -q --no-edit origin/master
            rc=$?; rm -rf "$hooks"
            [ $rc = 0 ] || { git -C "$gate_dir" merge --abort 2>/dev/null; exit 1; }
            git -C "$gate_dir" diff --quiet "$old" HEAD -- pnpm-lock.yaml || (cd "$gate_dir" && pnpm install --frozen-lockfile >/dev/null)
        else
            "$gate_dir/tools/live.sh" gate master
        fi
    ) 8>"$dir/../gate-live.lock" || echo "push-queue: could not bring $gate_dir up to origin/master; this push uses the gate as it is" >&2
    grep -q PREPUSH_ROOT "$gate_dir/.husky/pre-push" 2>/dev/null && use_gate=1
    if [ "$use_gate" = 1 ] && [ -x "$gate_dir/tools/gate-snapshot.sh" ]; then
        exec 8>"$main/tmp/gate-snapshot.lock"
        flock 8
        snap=$(GATE_SNAPSHOT_LOCKED=1 "$gate_dir/tools/gate-snapshot.sh" "$gate_dir") || {
            echo "push-queue: could not take a snapshot of the live gate $gate_dir, so this push is not run:" \
                "a gate run from the live copy itself could mix two versions of the gate if live.sh moves it." >&2
            exit 1
        }
        exec 9<"$snap/.in-use"
        flock -s 9
        exec 8>&-
        rm -f "$PUSH_QUEUE_COPY"
        PUSH_QUEUE_GATE=$snap PUSH_QUEUE_COPY= exec bash "$snap/tools/push-queue.sh" "$@"
    fi
fi

rank=1; [ "${PUSH_QUEUE_PRIORITY:-}" = critical ] && rank=0
ticket="$dir/$rank-$(date +%s%N)-$$"
queued_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$PWD :: $*" > "$ticket"
trap 'rm -f "$ticket" "$PUSH_QUEUE_COPY"' EXIT
gate_log="$(dirname "$dir")/push-gate-logs/$(basename "$ticket").log"
mkdir -p "$(dirname "$gate_log")" 2>/dev/null && find "$(dirname "$gate_log")" -name '*.log' -mtime +14 -delete 2>/dev/null

# What is pushed (only the last refspec of a push; one branch per push is the norm here), for the
# push log below and the refusal of a commit that already failed.
log=${PUSH_QUEUE_LOG:-$(dirname "$dir")/push-log.jsonl}
branch=; sha=
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
    remote=${pos[0]:-origin}
    case " ${args[*]} " in *" --force"* | *" -f "* | *" --mirror "* | *" --delete "* | *" -d "*) forced=1 ;; esac
    [ "${ref:-}" != "${ref#+}" ] && forced=1
fi

# Whether the branch on the remote holds a commit this push lacks: git would reject the push, but only after
# the gate (18 pushes in the 14 days to 2026-10-24 failed so after a passing gate, about 47 minutes each).
# Asked before the source checks and again once the push holds a gate slot. A forced push, a new branch and a
# remote that cannot be asked go on; golden, golden-cut and master are tools/land.mjs's to handle.
remote_moved() {
    [ -n "$sha" ] && [ -n "$branch" ] && [ "${forced:-0}" = 0 ] || return 1
    case "$branch" in golden | golden-cut | master) return 1 ;; esac
    local tip
    tip=$(git ls-remote "$remote" "refs/heads/$branch" 2>/dev/null | cut -f1)
    [ -n "$tip" ] && ! git merge-base --is-ancestor "$tip" "$sha" 2>/dev/null || return 1
    echo "push-queue: stopped before the gate -- $remote's $branch is at ${tip:0:12}, which ${sha:0:12} does not contain" \
        "(a newer commit's push moved it), so git would reject this push after the gate." \
        "Run git fetch $remote && git merge $remote/$branch, then push again." >&2
}
if [ "${1:-}" = git ] && remote_moved; then
    exit 1
fi

# Refuse a commit the gate already failed, when nothing it depends on changed: the push log's latest
# line for this commit failed, with the same checkout fingerprint (HEAD and every file git does not
# ignore, tools/prepush-inputs.mjs) and the same gate scripts (the live copy's tools/ and .husky/
# trees, which a master merge that touches neither leaves alone), on a check whose result is the
# commit's own -- a [FAIL] of the build, lint, Knip, formatting, the API report, a bundle size, the CI
# workflow tests, SonarQube's changed lines, or the tests with a shard that exited 1 (a shard killed
# or timed out, exit 124 or 137, is the machine's). Never after a failure outside the commit's
# control: a rejected or failed git push, a screenshot capture, the local GPU lane, a SonarQube step
# that could not run, a gate that crashed with no [FAIL] line, or a gate in which a process was killed
# by a signal from outside it (KILLED_RE, below). 2026-10-12: one branch failed the gate 20 times on
# an unchanged commit, each time on the same test.
#
# KILLED_RE: what a step's output shows when one of its processes was killed by SIGTERM or SIGKILL --
# bash's "Terminated" / "Killed" report, pnpm's "exit code 143", run-tests.sh's "FAILED: exit 137".
# 2026-10-17: a memory-hungry query outside the gate drove the machine out of memory, and a killer
# outside this container sent SIGTERM to the largest processes: lint, knip and a test shard of three
# gates died mid-step, each recorded as the commit's own [FAIL], and the retries were refused.
# Also the test stage's "Stopped after SIGTERM failed": tools/prepush-tests.mjs itself got the signal
# (until 2026-10-17 a 90-minute stage clock sent it, while every shard that had run had passed and the
# rest were waiting for test slots other gates held).
KILLED_RE='(^|[0-9] +)(Terminated|Killed)( |$)|exit (code )?(137|143)([^0-9]|$)|Stopped after SIG[A-Z]+ failed'
top="$(git rev-parse --show-toplevel 2>/dev/null)"
inputs="$top/tools/prepush-inputs.mjs"
[ "$use_gate" = 1 ] && inputs="$gate_dir/tools/prepush-inputs.mjs"
fingerprint=; gate_tree=
[ -n "$sha" ] && [ -f "$inputs" ] && fingerprint=$(cd "$top" && node "$inputs" fingerprint 2>/dev/null)
# The branch this push merges into (tools/push-base.mjs: origin/master, or a stacked pull request's
# parent branch), asked once here and exported to the source checks and the gate, so a push asks at
# most once and every step measures its changes from the same base.
push_base="$top/tools/push-base.mjs"
[ "$use_gate" = 1 ] && push_base="$gate_dir/tools/push-base.mjs"
if [ -z "${PUSH_BASE_REF:-}" ] && [ -n "$sha" ] && [ -f "$push_base" ]; then
    PUSH_BASE_REF=$(cd "$top" && node "$push_base" --branch "$branch") && export PUSH_BASE_REF
fi
gate_tree_of() { [ "$use_gate" = 1 ] && git -C "$gate_dir" rev-parse HEAD:tools HEAD:.husky 2>/dev/null | paste -sd: -; }
gate_tree=$(gate_tree_of)
if [ -n "$fingerprint" ] && [ "${PUSH_QUEUE_RETRY:-}" != 1 ] && [ -f "$log" ]; then
    prev=$(jq -c --arg sha "$sha" 'select(.sha == $sha)' "$log" 2>/dev/null | tail -1 |
        jq -c --arg fp "$fingerprint" --arg gt "$gate_tree" '
            select(.exit != 0 and .fingerprint == $fp and (.gateTree // "") == $gt)
            | (.gate // []) as $g
            | ($g | map(select(test("^\\[FAIL\\] (Build|Lint|Knip |Formatting|Public API report|Bundle size|CI workflow tests|SonarQube \\(changed lines\\))")))
                + (if any($g[]; test("^ *\\[FAIL\\] [^ ]+ \\(exit 1,")) then $g | map(select(test("^ *\\[FAIL\\] (Tests |[^ ]+ \\(exit 1,)"))) else [] end)) as $why
            | select($why | length > 0) | {why: $why, gateLog, at}' 2>/dev/null)
    prev_log="$(jq -r .gateLog <<<"$prev" 2>/dev/null)"
    if [ -n "$prev" ] && ! grep -q "SonarQube step cannot run" "$prev_log" 2>/dev/null &&
        ! grep -qaE "$KILLED_RE" "$prev_log" 2>/dev/null; then
        {
            echo "push-queue: refused -- commit ${sha:0:12} already failed the gate at $(jq -r .at <<<"$prev"), and nothing it depends on has changed since (same commit, same files, same gate scripts):"
            jq -r '.why[] | "  " + .' <<<"$prev"
            echo "  the gate's log of that push: $(jq -r .gateLog <<<"$prev")"
            echo "Fix the failure and commit, or, if it was the machine's and not the commit's, push again with PUSH_QUEUE_RETRY=1."
        } >&2
        exit 1
    fi
fi

# Runs a command with its stdout and stderr each copied into the gate log on their way to where they
# went before, and returns once both copies are written. The copies are opened here, in this shell:
# written as `cmd > >(tee ...) 2> >(tee ...)`, bash makes them children of the forked command, so no
# `wait` here waits for them, and the log could be read before the [FAIL] line reached it (#2357).
# The command does not inherit the copies' descriptors beyond its stdout and stderr.
logged() {
    local out err out_pid err_pid rc
    exec {out}> >(tee -a "$gate_log" 2>/dev/null)
    out_pid=$!
    exec {err}> >(tee -a "$gate_log" >&2 2>/dev/null)
    err_pid=$!
    "$@" >&"$out" 2>&"$err" {out}>&- {err}>&-
    rc=$?
    exec {out}>&- {err}>&-
    wait "$out_pid" "$err_pid"
    return $rc
}

# The gate's source-only checks (formatting, links, the CI workflow tests, the config and tool checks:
# tools/prepush-source-checks.sh of the checkout being pushed), run while this push already holds its
# place in the queue, so a slip fails in about a minute instead of after the wait for a slot. The
# gate skips them later when the checkout has not changed since they passed. A checkout without the
# script (a branch from before it existed) goes straight to the queue. Their output goes to the gate
# log too, so a failure here is logged like a gate failure, and the push itself never runs.
#
# Before them: a checkout whose whole gate already passed on exactly these inputs -- the same files, the
# same installed lockfile, the same gate scripts and lanes (tools/prepush-inputs.mjs, the gate key), on
# any branch -- needs neither these checks nor a gate slot. The landing push of a branch that merged
# golden first is such a push: its land commit has the tree the branch's own push tested. The hook still
# runs and finds the same pass, so it ends in seconds. PREPUSH_RERUN_ALL=1 runs everything anyway.
rc=0
passed_gate=0
if [ "${1:-}" = git ] && [ -n "$sha" ] && [ -f "$inputs" ] && [ "${PREPUSH_RERUN_ALL:-}" != 1 ] &&
    gate_key=$(cd "$top" && node "$inputs" key 2>/dev/null) && [ -n "$gate_key" ] &&
    { gate_pass=$(cd "$top" && node "$inputs" passed gate "$gate_key" 2>/dev/null) ||
        { [ "${TEST_LEDGER_KIND:-}" = land-check ] &&
            gate_pass=$(cd "$top" && node "$inputs" passed gate-known "$gate_key" 2>/dev/null); }; }; then
    passed_gate=1
    # The hook checks that its key is still this one, and stops rather than run the whole gate without
    # a slot (tools/prepush-source-checks.sh).
    export PREPUSH_EXPECTED_KEY="$gate_key"
    echo "push-queue: every check of the gate already passed on these inputs ($(jq -r '"\(.branch // "detached") at \(.sha[0:12]), \(.at)"' <<<"$gate_pass" 2>/dev/null)); no gate slot needed"
fi
early="$top/tools/prepush-source-checks.sh"
use_gate_root=
[ "$use_gate" = 1 ] && early="$gate_dir/tools/prepush-source-checks.sh" && use_gate_root=1
if [ "${1:-}" = git ] && [ -f "$early" ] && [ "$passed_gate" = 0 ]; then
    logged env ${use_gate_root:+PREPUSH_ROOT="$top"} bash "$early"
    rc=$?
fi

# Fast lane: a push that affects no package (documents, design files) runs only the gate's
# whole-repository checks, a few minutes at most, so it does not wait behind full gates for a slot.
# 2026-10-10: docs-only pushes sat 1-2 hours behind three 45-minute gates.
# Only an nx workspace has packages to ask about: elsewhere (a test's throwaway repository) pnpm and
# nx would only fail, after seconds of startup and a listing of every directory above the checkout.
fast=$passed_gate
if [ "$rc" = 0 ] && [ "$fast" = 0 ] && [ "${1:-}" = git ] && [ -f "$top/nx.json" ] && base=$(git merge-base "${PUSH_BASE_REF:-origin/master}" HEAD 2>/dev/null); then
    affected_json=$(NX_DAEMON=false pnpm exec nx show projects --affected --base="$base" --head=HEAD --json 2>/dev/null)
    [ "$affected_json" = "[]" ] && fast=1 && echo "push-queue: no package affected; skipping the queue"
fi

# A wait for a slot goes into the wait log (tools/wait-log.mjs, <main checkout>/tmp/waits.jsonl) once it
# ends, with the pushes that held the slots when it began.
wait_start=$(date +%s%3N)
held_by=()
while [ "$rc" = 0 ] && [ "$fast" = 0 ]; do
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
    if [ ${#held_by[@]} = 0 ]; then
        for ((i = 0; i < ${#live[@]} && i < SLOTS; i++)); do
            held_by+=("pid ${live[$i]##*-}: $(head -c 300 "$dir/${live[$i]}" 2>/dev/null)")
        done
        echo "push-queue: waiting for one of $SLOTS gate slots, held by: $(printf '%s; ' "${held_by[@]}")" >&2
    fi
    sleep "${PUSH_QUEUE_POLL:-10}"
done
if [ "$rc" = 0 ] && [ "${1:-}" = git ] && remote_moved; then
    rc=1
fi
wait_log="$top/tools/wait-log.mjs"
[ "$use_gate" = 1 ] && wait_log="$gate_dir/tools/wait-log.mjs"
if [ ${#held_by[@]} -gt 0 ] && [ -f "$wait_log" ]; then
    node "$wait_log" gate-slot "$wait_start" "$PWD :: $*" "${held_by[@]}" 2>/dev/null
fi
# A running push's ticket becomes critical as of its start, so nothing that arrives later -- a
# critical push included -- sorts ahead of it and takes a slot it still holds.
if [ "$rc" = 0 ] && [ "$fast" = 0 ]; then
    running="$dir/0-$(date +%s%N)-$$"
    mv "$ticket" "$running" && ticket=$running
fi
started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
[ "$rc" = 0 ] || started_at=$queued_at

# The push log, which githerd reads to learn whose pull request a branch is
# (githerd/lib/owners.mjs): one JSON line per push, appended when it ends, with the pushed branch
# and commit and the Claude Code session that launched it -- the first ancestor process with a
# registry entry in ~/.claude/sessions (its procStart matching, so a reused pid is not mistaken for
# it), or null. Append only; a missing jq skips the line, never the push.
session=
p=$$
while [ "${p:-0}" -gt 1 ] && read -r stat 2>/dev/null <"/proc/$p/stat"; do
    read -ra f <<<"${stat##*) }"
    entry="${HOME:-}/.claude/sessions/$p.json"
    if [ -f "$entry" ]; then
        session=$(jq -c --arg s "${f[19]}" 'select((.procStart // $s | tostring) == $s and .sessionId != null)
            | {sessionId, name}' "$entry" 2>/dev/null)
        [ -n "$session" ] && break
    fi
    p=${f[1]}
done
# The gate's report, for githerd's pre-push statistics (githerd/lib/prepush.mjs): the command's
# stdout and stderr (the gate prints on both) are each copied into tmp/push-gate-logs/<ticket>.log on
# their way to where they went before (logged, above), and both copies finish before the log is read. The
# log line then carries the queue times, the gate's [FAIL] and FAIL lines -- with the FAIL lines of
# each failed shard's own log (tmp/prepush-tests/<shard>.log), whose printed tail can miss them --
# and the top-level directories the push changes against its merge base with the branch it merges into
# (Markdown left out). Recording never fails or slows the push: each part that fails is left out of
# the line. Logs older than 14 days are removed.
# Through the live gate: git runs gate-live's pre-push hook, in the pushed checkout.
cmd=("$@")
[ "$use_gate" = 1 ] && cmd=(git -c core.hooksPath="$gate_dir/.husky/_" "${@:2}") && echo "push-queue: gate from $gate_dir ($(git -C "$gate_dir" rev-parse --short HEAD))"
# The gate stages its screenshot capture under the pushed checkout's HEAD and, told
# PUSH_QUEUE_PROMOTES=1, leaves it staged (visual-preview.sh --promote does nothing then). This script
# promotes it to the branch's preview only once GitHub accepted the push, and throws it away when the
# push was rejected, so the preview of the head GitHub already has stays. 2026-10-24: the gate
# promoted before the push, the push of golden-cut was then rejected, and the cut's owner-reviewed
# preview was replaced by one of a commit GitHub never got, which kept ship from shipping.
preview="$top/tools/visual-preview.sh"
[ "$use_gate" = 1 ] && preview="$gate_dir/tools/visual-preview.sh"
head_sha=$(git rev-parse -q --verify HEAD 2>/dev/null)
if [ "$rc" = 0 ]; then
    gate_tree=$(gate_tree_of)
    PUSH_QUEUE_PROMOTES=1 logged "${cmd[@]}"
    rc=$?
    if [ -n "$sha" ] && [ -n "$head_sha" ] && [ -x "$preview" ]; then
        if [ "$rc" = 0 ]; then
            PUSH_QUEUE_PROMOTES= PREPUSH_ROOT="$top" "$preview" --promote "$head_sha" ||
                echo "push-queue: could not promote the screenshot preview of ${head_sha:0:10}" >&2
        else
            PREPUSH_ROOT="$top" "$preview" --discard "$head_sha" >/dev/null 2>&1
        fi
    fi
fi
if [ "$rc" != 0 ] && grep -qaE "$KILLED_RE" "$gate_log" 2>/dev/null; then
    echo "push-queue: a process in the gate was killed by a signal from outside it (\"Terminated\", \"Killed\" or exit 143/137 in $gate_log):" \
        "that failure is the machine's, not the commit's -- often memory running out -- so pushing this commit again is not refused." >&2
fi
finished_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gate=$(sed 's/\x1b\[[0-9;]*m//g' "$gate_log" 2>/dev/null | grep -aE '\[FAIL\]|^ *FAIL |All pre-push checks passed|\[(remote )?rejected\]' \
    | awk '{ print } /\[FAIL\] [^ ]+ \(exit .*; the end of .*:$/ {
        f = $0; sub(/.*; the end of /, "", f); sub(/:$/, "", f)
        while ((getline l < f) > 0) { gsub(/\033\[[0-9;]*m/, "", l); if (l ~ /^ *FAIL /) print l }
        close(f) }' 2>/dev/null | head -200 | jq -Rsc 'split("\n") | map(select(length > 0))' 2>/dev/null)
changed=
if [ -n "$sha" ] && base=$(git merge-base "${PUSH_BASE_REF:-origin/master}" "$sha" 2>/dev/null); then
    changed=$(git diff --name-only "$base" "$sha" 2>/dev/null | awk -F/ '!/\.md$/ { print (NF > 1 ? $1 "/" : $0) }' | sort -u \
        | jq -Rsc 'split("\n") | map(select(length > 0))' 2>/dev/null)
fi
jq -nc --arg at "$finished_at" --arg branch "$branch" --arg sha "$sha" --arg cwd "$PWD" \
    --argjson exit "$rc" --argjson session "${session:-null}" --arg queuedAt "$queued_at" --arg startedAt "$started_at" \
    --arg gateLog "$gate_log" --argjson gate "${gate:-null}" --argjson changed "${changed:-null}" \
    --arg fingerprint "$fingerprint" --arg gateTree "$gate_tree" \
    '{at: $at, branch: (if $branch == "" then null else $branch end),
      sha: (if $sha == "" then null else $sha end), exit: $exit, cwd: $cwd,
      sessionId: $session.sessionId, name: $session.name,
      queuedAt: $queuedAt, startedAt: $startedAt, gateLog: $gateLog, gate: $gate, changed: $changed,
      fingerprint: (if $fingerprint == "" then null else $fingerprint end),
      gateTree: (if $gateTree == "" then null else $gateTree end)}' >>"$log" 2>/dev/null
exit $rc
