#!/bin/bash
# Run a command (normally `git push ...`) after the source-only checks, refusing a commit whose checks
# already failed, and log the push.
#
# Usage: tools/push-queue.sh git push origin HEAD:<branch>
#
# Before the push: tools/prepush-source-checks.sh of the checkout being pushed (formatting, links, the CI
# workflow tests, duplicate code, the release dry run and the other source-only checks, about two
# minutes), so a slip fails here instead of in CI. The release dry run runs nowhere else. Then the command
# runs, with the checkout's own pre-push hook. The name is historical: until the pre-push gate was retired
# this script also queued pushes for a gate slot; there is no queue now.
# A commit whose checks already failed a check of its own is not run again while nothing it depends on
# changed: same commit, same checkout fingerprint. PUSH_QUEUE_RETRY=1 pushes it anyway, for a failure you
# believe was the machine's, not the commit's.
# Settings, for tests: PUSH_QUEUE_STATE (the directory of the push log and the check logs, the main
# checkout's tmp/), PUSH_QUEUE_LOG (the push log).
# Run from a private copy: bash reads a script from disk as it runs, so editing this file would
# otherwise change the code of every push already running.
# The copy goes in the main checkout's tmp/, not /tmp, which other processes on this machine clear.
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
if [ -z "${PUSH_QUEUE_COPY:-}" ]; then
    mkdir -p "$main/tmp/push-queue-copies" &&
        copy=$(mktemp "$main/tmp/push-queue-copies/push-queue.XXXXXX.sh") && cp "$0" "$copy" &&
        PUSH_QUEUE_COPY=$copy exec bash "$copy" "$@"
fi
# The script's settings are for this script only, never for the command it runs: a test the checks run
# that runs a throwaway checkout's own push-queue.sh must not inherit them (2026-10-24).
export -n PUSH_QUEUE_COPY PUSH_QUEUE_STATE PUSH_QUEUE_LOG
state=${PUSH_QUEUE_STATE:-$main/tmp}
started="$(date +%s%N)-$$"
queued_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
trap 'rm -f "$PUSH_QUEUE_COPY"' EXIT
gate_log="$state/push-gate-logs/$started.log"
mkdir -p "$(dirname "$gate_log")" 2>/dev/null && find "$(dirname "$gate_log")" -name '*.log' -mtime +14 -delete 2>/dev/null

# What is pushed (only the last refspec of a push; one branch per push is the norm here), for the
# push log below and the refusal of a commit that already failed.
log=${PUSH_QUEUE_LOG:-$state/push-log.jsonl}
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
# the source checks. A forced push, a new branch, master and a remote that cannot be asked go on.
remote_moved() {
    [ -n "$sha" ] && [ -n "$branch" ] && [ "${forced:-0}" = 0 ] || return 1
    [ "$branch" = master ] && return 1
    local tip
    tip=$(git ls-remote "$remote" "refs/heads/$branch" 2>/dev/null | cut -f1)
    [ -n "$tip" ] && ! git merge-base --is-ancestor "$tip" "$sha" 2>/dev/null || return 1
    echo "push-queue: stopped before the checks -- $remote's $branch is at ${tip:0:12}, which ${sha:0:12} does not contain" \
        "(a newer commit's push moved it), so git would reject this push." \
        "Run git fetch $remote && git merge $remote/$branch, then push again." >&2
}
if [ "${1:-}" = git ] && remote_moved; then
    exit 1
fi

# Refuse a commit whose checks already failed, when nothing it depends on changed: the push log's latest
# line for this commit failed, with the same checkout fingerprint (HEAD and every file git does not
# ignore, tools/prepush-inputs.mjs, which covers the checks' own scripts), on a check whose result is the
# commit's own -- a [FAIL] of formatting, the CI workflow tests, the duplicate code check, or (in lines
# from the retired gate) the build, lint, Knip, the API report, a bundle size or a test shard that exited
# 1 (a shard killed or timed out, exit 124 or 137, is the machine's). Never after a failure outside the
# commit's control: a rejected or failed git push, a run that crashed with no [FAIL] line, or a run in
# which a process was killed by a signal from outside it (KILLED_RE, below). 2026-10-12: one branch
# failed the gate 20 times on an unchanged commit, each time on the same test.
#
# KILLED_RE: what a step's output shows when one of its processes was killed by SIGTERM or SIGKILL --
# bash's "Terminated" / "Killed" report, pnpm's "exit code 143", run-tests.sh's "FAILED: exit 137".
# 2026-10-17: a memory-hungry query outside the gate drove the machine out of memory, and a killer
# outside this container sent SIGTERM to the largest processes: lint, knip and a test shard of three
# gates died mid-step, each recorded as the commit's own [FAIL], and the retries were refused.
KILLED_RE='(^|[0-9] +)(Terminated|Killed)( |$)|exit (code )?(137|143)([^0-9]|$)|Stopped after SIG[A-Z]+ failed'
top="$(git rev-parse --show-toplevel 2>/dev/null)"
inputs="$top/tools/prepush-inputs.mjs"
fingerprint=
[ -n "$sha" ] && [ -f "$inputs" ] && fingerprint=$(cd "$top" && node "$inputs" fingerprint 2>/dev/null)
# The branch this push merges into (tools/push-base.mjs: origin/master, or a stacked pull request's
# parent branch), asked once here and exported to the source checks and the pre-push hook, so a push asks
# at most once and every step measures its changes from the same base.
push_base="$top/tools/push-base.mjs"
if [ -z "${PUSH_BASE_REF:-}" ] && [ -n "$sha" ] && [ -f "$push_base" ]; then
    PUSH_BASE_REF=$(cd "$top" && node "$push_base" --branch "$branch") && export PUSH_BASE_REF
fi
if [ -n "$fingerprint" ] && [ "${PUSH_QUEUE_RETRY:-}" != 1 ] && [ -f "$log" ]; then
    prev=$(jq -c --arg sha "$sha" 'select(.sha == $sha)' "$log" 2>/dev/null | tail -1 |
        jq -c --arg fp "$fingerprint" '
            select(.exit != 0 and .fingerprint == $fp)
            | (.gate // []) as $g
            | ($g | map(select(test("^\\[FAIL\\] (Build|Lint|Knip |Formatting|Public API report|Bundle size|CI workflow tests|Duplicate code)")))
                + (if any($g[]; test("^ *\\[FAIL\\] [^ ]+ \\(exit 1,")) then $g | map(select(test("^ *\\[FAIL\\] (Tests |[^ ]+ \\(exit 1,)"))) else [] end)) as $why
            | select($why | length > 0) | {why: $why, gateLog, at}' 2>/dev/null)
    prev_log="$(jq -r .gateLog <<<"$prev" 2>/dev/null)"
    if [ -n "$prev" ] && ! grep -qaE "$KILLED_RE" "$prev_log" 2>/dev/null; then
        {
            echo "push-queue: refused -- commit ${sha:0:12} already failed its checks at $(jq -r .at <<<"$prev"), and nothing it depends on has changed since (same commit, same files):"
            jq -r '.why[] | "  " + .' <<<"$prev"
            echo "  the log of that push: $(jq -r .gateLog <<<"$prev")"
            echo "Fix the failure and commit, or, if it was the machine's and not the commit's, push again with PUSH_QUEUE_RETRY=1."
        } >&2
        exit 1
    fi
fi

# Runs a command with its stdout and stderr each copied into the check log on their way to where they
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

# The source-only checks of the checkout being pushed. A checkout without the script goes straight to the
# push. Their output goes to the check log too, so a failure here is logged, and the push itself never runs.
rc=0
early="$top/tools/prepush-source-checks.sh"
if [ "${1:-}" = git ] && [ -f "$early" ]; then
    logged bash "$early"
    rc=$?
fi
if [ "$rc" = 0 ] && [ "${1:-}" = git ] && remote_moved; then
    rc=1
fi
started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
[ "$rc" = 0 ] || started_at=$queued_at

# The push log, which tools/pipeline-health/local/collector.mjs posts to the health dashboard and the
# refusal above reads: one JSON line per push, appended when it ends, with the pushed branch and commit
# and the Claude Code session that launched it -- the first ancestor process with a registry entry in
# ~/.claude/sessions (its procStart matching, so a reused pid is not mistaken for it), or null. Append
# only; a missing jq skips the line, never the push.
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
# The command's stdout and stderr are each copied into tmp/push-gate-logs/<start>.log on their way to
# where they went before (logged, above), and both copies finish before the log is read. The log line
# then carries the times, the [FAIL] and FAIL lines -- with the FAIL lines of each failed shard's own log,
# whose printed tail can miss them -- and the top-level directories the push changes against its merge
# base with the branch it merges into (Markdown left out). Recording never fails or slows the push: each
# part that fails is left out of the line. Logs older than 14 days are removed.
if [ "$rc" = 0 ]; then
    logged "$@"
    rc=$?
fi
if [ "$rc" != 0 ] && grep -qaE "$KILLED_RE" "$gate_log" 2>/dev/null; then
    echo "push-queue: a process in the checks was killed by a signal from outside it (\"Terminated\", \"Killed\" or exit 143/137 in $gate_log):" \
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
mkdir -p "$(dirname "$log")" 2>/dev/null
jq -nc --arg at "$finished_at" --arg branch "$branch" --arg sha "$sha" --arg cwd "$PWD" \
    --argjson exit "$rc" --argjson session "${session:-null}" --arg queuedAt "$queued_at" --arg startedAt "$started_at" \
    --arg gateLog "$gate_log" --argjson gate "${gate:-null}" --argjson changed "${changed:-null}" \
    --arg fingerprint "$fingerprint" \
    '{at: $at, branch: (if $branch == "" then null else $branch end),
      sha: (if $sha == "" then null else $sha end), exit: $exit, cwd: $cwd,
      sessionId: $session.sessionId, name: $session.name,
      queuedAt: $queuedAt, startedAt: $startedAt, gateLog: $gateLog, gate: $gate, changed: $changed,
      fingerprint: (if $fingerprint == "" then null else $fingerprint end)}' >>"$log" 2>/dev/null
exit $rc
