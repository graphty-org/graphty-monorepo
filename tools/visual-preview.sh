#!/usr/bin/env bash
#
# Captures a pull request's screenshots on this machine, minutes after a push, so the owner can
# review (and Finish) them before CI's capture lands. Design: design/visual-testing/local-previews.md.
#
# Usage:
#   ./tools/visual-preview.sh <pull request number>
#   ./tools/visual-preview.sh --head <commit>      (tools/prepush.sh, before a push)
#   ./tools/visual-preview.sh --promote <commit>   (tools/prepush.sh, once every check passed)
#   ./tools/visual-preview.sh --discard <commit>   (tools/prepush.sh, when the push was refused)
#
# --head builds what CI WILL build once the commit is pushed: the commit merged into origin/master,
# fetched first, made here (git merge-tree) instead of fetched from GitHub. The capture is staged in
# local/.pending-<commit>, which the review page never reads; --promote moves it to the open pull
# request of the current branch when it has one (tmp/pr-status/status.json, else one gh call), so the
# review page offers it as soon as the push lands, and --discard deletes it. Staging keeps a refused
# push from replacing the preview of the head already on GitHub. Without a pull request it goes under
# local/branch-<branch> and only checks that every story captures. A merge conflict with origin/master
# skips the capture (CI cannot build that pull request either).
#
# It builds what CI builds -- refs/pull/<n>/merge, the head merged into the base branch -- in the
# reused worktree .worktrees/visual-preview, with the base branch's copy of the capture code (as
# CI runs it) and the repository's pinned fonts, captures each affected project's Storybook, and
# writes <main checkout>/<workDir>/local/<n>/<project>/ plus status.json there (running, done,
# stale or failed with the step and the end of the log). The review server lists a complete preview
# of the pull request's current head as "local preview, CI pending"; CI's own capture replaces it
# project by project, and the gate still checks CI's capture against whatever was approved.
#
# Refuses a pull request from a fork: its code would run on this machine. One preview runs at a
# time (a lock), and each capture goes through tmp/with-browser.sh when this machine has it (the
# shared cap on browsers).
#
# VISUAL_PREVIEW_TIMEOUT (default 45m; a whole number with s, m, h or d) bounds the work, not the
# waits: it starts once this preview holds the lock, and each capture's share of it starts once that
# capture holds its browser slot, so time queued behind another preview or behind the test shards'
# browsers never counts. A step still running when it runs out fails the preview.

set -euo pipefail

die() {
    echo "tools/visual-preview.sh: $*" >&2
    if [[ -n "${STEP:-}" ]]; then echo "$*" >> "$LOG"; status failed; fi
    exit 1
}

LIMIT="${VISUAL_PREVIEW_TIMEOUT:-45m}"
[[ "$LIMIT" =~ ^([0-9]+)([smhd]?)$ ]] || die "VISUAL_PREVIEW_TIMEOUT=$LIMIT is not a whole number with s, m, h or d"
case "${BASH_REMATCH[2]}" in
    m) LIMIT_S=$((BASH_REMATCH[1] * 60)) ;;
    h) LIMIT_S=$((BASH_REMATCH[1] * 3600)) ;;
    d) LIMIT_S=$((BASH_REMATCH[1] * 86400)) ;;
    *) LIMIT_S=$((BASH_REMATCH[1])) ;;
esac
# Progress lines for whoever started this (the pre-push gate shows them): fd 3 stays this script's
# own output even inside the steps whose output goes to the log.
exec 3>&1
say() { echo "$(date +%T) visual-preview: $*" >&3; }

HERE="$(cd "$(dirname "$0")/.." && pwd)"
MAIN="$(dirname "$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir)")"
WORK="$(jq -r '.workDir // "tmp/visual-review"' "$HERE/visual-review.config.json")"
ROOT="$MAIN/$WORK/local"
WT="$MAIN/.worktrees/visual-preview"

MODE="pr"
case "${1:-}" in
    --head | --promote | --discard) MODE="${1#--}" ;;
esac
if [[ "$MODE" != "pr" ]]; then
    HEAD="$(git -C "$HERE" rev-parse --verify "${2:-}^{commit}")" || die "usage: visual-preview.sh $1 <commit>"
    BRANCH="$(git -C "$HERE" symbolic-ref --short -q HEAD || true)"
    PR=""
    if [[ -n "$BRANCH" ]]; then
        PR="$(jq -r --arg b "$BRANCH" '[.pullRequests[]? | select(.head == $b) | .number][0] // empty' \
            "$MAIN/tmp/pr-status/status.json" 2>/dev/null || true)"
        [[ -n "$PR" ]] || PR="$(gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number // empty' 2>/dev/null || true)"
    fi
    KEY="${PR:-branch-${BRANCH//\//-}}"
    [[ "$KEY" != "branch-" ]] || KEY="commit-${HEAD:0:10}"
    STAGED="$ROOT/.pending-$HEAD"
    case "$MODE" in
        promote)
            [[ -d "$STAGED" ]] || exit 0
            rm -rf "${ROOT:?}/$KEY.old"
            [[ ! -e "$ROOT/$KEY" ]] || mv "$ROOT/$KEY" "$ROOT/$KEY.old"
            mv "$STAGED" "$ROOT/$KEY"
            rm -rf "${ROOT:?}/$KEY.old"
            echo "visual-preview: ${HEAD:0:10} is now the preview $ROOT/$KEY"
            exit 0
            ;;
        discard)
            rm -rf "$STAGED"
            exit 0
            ;;
    esac
else
    PR="${1:-}"
    [[ "$PR" =~ ^[1-9][0-9]*$ ]] || die "usage: visual-preview.sh <pull request number> | --head <commit>"
    KEY="$PR"
fi
OUT="${STAGED:-$ROOT/$KEY}"
mkdir -p "$OUT"
LOG="$OUT/log.txt"

# The pull request: same repository, open, and its head.
if [[ "$MODE" == "pr" ]]; then
    read -r STATE HEAD_REPO BASE_REPO HEAD < <(gh api "repos/{owner}/{repo}/pulls/$PR" \
        --jq '[.state, (.head.repo.full_name // "deleted"), .base.repo.full_name, .head.sha] | @tsv')
    [[ "$STATE" == "open" ]] || die "#$PR is $STATE, not open"
    [[ "$HEAD_REPO" == "$BASE_REPO" ]] || die "#$PR comes from $HEAD_REPO, a fork: its code is never built here"
fi

STEP="waiting for the lock"
STARTED="$(date -u +%FT%TZ)"
status() { # <state> [projects...]
    local state="$1"; shift
    local tail=""
    [[ "$state" == "failed" ]] && tail="$(tail -n 20 "$LOG" 2>/dev/null || true)"
    jq -n --arg state "$state" --arg step "$STEP" --argjson pr "${PR:-null}" --arg head "$HEAD" \
        --arg merge "${MERGE:-}" --arg started "$STARTED" --arg at "$(date -u +%FT%TZ)" --arg tail "$tail" \
        --args '{state: $state, step: $step, pr: $pr, head: $head, merge: (if $merge == "" then null else $merge end),
            startedAt: $started, updatedAt: $at, projects: $ARGS.positional, log: (if $tail == "" then null else $tail end)}' \
        "$@" > "$OUT/status.json.tmp"
    mv "$OUT/status.json.tmp" "$OUT/status.json"
}
trap 'status failed' ERR

# Runs a step with what is left of the limit (DEADLINE, set once the lock is held). Out of time is
# exit 124, said in the log and on fd 3.
bounded() { # <command...>
    local left=$((DEADLINE - $(date +%s))) rc=0
    if ((left > 0)); then timeout --kill-after=30s "$left" "$@" || rc=$?; else rc=124; fi
    if [[ $rc -eq 124 || $rc -eq 137 ]]; then
        echo "visual-preview: timed out while $STEP: more than $LIMIT of work (VISUAL_PREVIEW_TIMEOUT)" >> "$LOG"
        say "timed out while $STEP: more than $LIMIT of work (VISUAL_PREVIEW_TIMEOUT)"
        return 124
    fi
    return $rc
}

# git fetch into the main checkout, retried: the lock above covers only previews, and any other fetch
# there (a gate, an agent, the review server) that moves the same ref first makes this one exit 1 with
# "cannot lock ref ...: is at <new> but expected <old>" (issue #1548). The winner has already written the
# ref, so a retry succeeds. A fetch that still fails dies with git's own message.
fetch_main() { # <refspec>...
    local err="" try
    for try in 1 2 3; do
        err="$(bounded git -C "$MAIN" fetch -q origin "$@" 2>&1)" && return 0
        echo "$err" >> "$LOG"
        [[ $try -eq 3 ]] || sleep "$try"
    done
    die "cannot fetch $*: $err"
}

status running
exec 9> "$ROOT/.lock"
flock -n 9 || { say "waiting for another preview to finish (the lock; not counted against $LIMIT)"; flock 9; }
DEADLINE=$(($(date +%s) + LIMIT_S))
: > "$LOG"
say "working (limit $LIMIT, from now; the waits for browser slots are not counted)"
echo "visual-preview: $KEY at ${HEAD:0:10} (log: $LOG)"

if [[ "$MODE" == "head" ]]; then
    # The merge commit CI will build: the current master's tree merged with the head, as GitHub makes
    # refs/pull/<n>/merge (first parent the base, second the head). Fetched first: the last fetch may
    # be days old, and a preview of an old master is not what CI captures.
    STEP="fetching origin/master"
    status running
    fetch_main master
    STEP="merging ${HEAD:0:10} into origin/master"
    status running
    # Exit 1 is a conflict; anything else (a missing ref, an unreadable object) is an error, never a pass.
    RC=0
    TREE="$(git -C "$MAIN" merge-tree --write-tree origin/master "$HEAD" 2>> "$LOG")" || RC=$?
    if [[ $RC -eq 1 ]]; then
        STEP="nothing captured: ${HEAD:0:10} conflicts with origin/master (merge it first)"
        status done
        echo "visual-preview: $STEP"
        exit 0
    fi
    [[ $RC -eq 0 ]] || die "git merge-tree failed (exit $RC)"
    MERGE="$(git -C "$MAIN" commit-tree "$TREE" -p origin/master -p "$HEAD" -m "visual preview: ${HEAD:0:10} into origin/master" 2>> "$LOG")"
else
    STEP="fetching refs/pull/$PR/merge"
    status running
    fetch_main "+refs/pull/$PR/merge:refs/visual-preview/$PR"
    MERGE="$(git -C "$MAIN" rev-parse "refs/visual-preview/$PR")"
    [[ "$(git -C "$MAIN" rev-parse "$MERGE^2")" == "$HEAD" ]] \
        || die "refs/pull/$PR/merge is not built from the head $HEAD yet; try again in a minute"
fi

# Inside the preview worktree only: never the main checkout. No hooks, no LFS download on checkout.
STEP="checking out the merge tree"
status running
G=(git -c core.hooksPath=/dev/null -C "$WT")
export GIT_LFS_SKIP_SMUDGE=1 HUSKY=0 NX_DAEMON=false
[[ -e "$WT" ]] || bounded git -C "$MAIN" -c core.hooksPath=/dev/null worktree add -q --detach "$WT" "$MERGE" >> "$LOG" 2>&1
bounded "${G[@]}" checkout -q --force --detach "$MERGE" >> "$LOG" 2>&1
bounded "${G[@]}" clean -fdq >> "$LOG" 2>&1
[[ -e "$WT/.env" ]] || ln -s "$MAIN/.env" "$WT/.env"
bounded "${G[@]}" lfs pull --include "visual-baselines/**,visual-fonts/**" >> "$LOG" 2>&1
# The base branch's capture code, as CI runs it (ci.yml, "Use the base branch's capture code").
rm -rf "$WT/visual-review/capture" "$WT/visual-review/trusted"
"${G[@]}" archive "$MERGE^1" visual-review/capture visual-review/trusted | tar -x -C "$WT"

STEP="installing dependencies"
status running
(cd "$WT" && bounded pnpm install --frozen-lockfile) >> "$LOG" 2>&1

# The projects the change affects (all of them when nx cannot tell).
STEP="finding the affected projects"
status running
mapfile -t ALL < <(jq -r '.projects | keys[]' "$WT/visual-review.config.json")
if AFFECTED="$(cd "$WT" && bounded pnpm exec nx show projects --affected --base="$MERGE^1" --head="$MERGE" --json 2>> "$LOG")"; then
    mapfile -t PROJECTS < <(jq -r --argjson all "$(printf '%s\n' "${ALL[@]}" | jq -R . | jq -s .)" \
        '.[] | select(. as $p | $all | index($p))' <<< "$AFFECTED")
elif [[ $? -eq 124 ]]; then
    die "timed out while $STEP"
else
    PROJECTS=("${ALL[@]}")
fi
if [[ ${#PROJECTS[@]} -eq 0 ]]; then
    STEP="nothing to capture: no project with a Storybook is affected"
    status done
    echo "visual-preview: $KEY changes no project with a Storybook"
    exit 0
fi

WRAP=()
[[ -x "$MAIN/tmp/with-browser.sh" ]] && WRAP=("$MAIN/tmp/with-browser.sh")
# Only a preview naming a pull request and its head is decidable on the review page.
PREVIEW_ENV=()
[[ -n "$PR" ]] && PREVIEW_ENV=(VISUAL_REVIEW_PREVIEW_PR="$PR" VISUAL_REVIEW_PREVIEW_HEAD="$HEAD")
# Each Storybook is built in turn (they share the worktree's nx builds); each capture then starts in
# the background, so the captures run side by side, as many at once as the browser cap allows.
CAPTURES=()
for P in "${PROJECTS[@]}"; do
    STEP="building the Storybook ($P)"
    status running "${PROJECTS[@]}"
    (cd "$WT" && bounded bash -c "$(jq -r --arg p "$P" '.projects[$p].build' visual-review.config.json)") >> "$LOG" 2>&1

    STEP="capturing (${PROJECTS[*]})"
    status running "${PROJECTS[@]}"
    rm -rf "${OUT:?}/$P" "$OUT/$P.log"
    (
        REF="$(mktemp -d)"
        trap 'rm -rf "$REF"' EXIT
        cd "$WT"
        REF_DIR="$(bounded node visual-review/trusted/cli.mjs reference --project "$P" --out "$REF" 2>> "$OUT/$P.log" || true)"
        # What is left of the limit is taken now and starts counting inside the browser slot.
        LEFT=$((DEADLINE - $(date +%s)))
        ((LEFT > 0)) || { say "$P: timed out before its capture started (more than $LIMIT of work)"; exit 124; }
        [[ ${#WRAP[@]} -eq 0 ]] || say "$P: waiting for a browser slot (not counted against $LIMIT)"
        RC=0
        env "${PREVIEW_ENV[@]}" "${WRAP[@]}" bash -c \
            'echo "$(date +%T) visual-preview: $1: capturing ($2 left)" >&3; shift; exec timeout --kill-after=30s "$@"' \
            _ "$P" "${LEFT}s" node visual-review/trusted/cli.mjs capture --project "$P" --out "$OUT/$P" --reference "$REF_DIR" \
            || RC=$?
        [[ $RC -ne 124 && $RC -ne 137 ]] || say "$P: timed out: the capture ran past what was left of $LIMIT"
        exit "$RC"
    ) >> "$OUT/$P.log" 2>&1 &
    CAPTURES+=("$!:$P")
done
FAILED=()
for C in "${CAPTURES[@]}"; do
    wait "${C%%:*}" || FAILED+=("${C#*:}")
done
for P in "${PROJECTS[@]}"; do
    cat "$OUT/$P.log" >> "$LOG"
done
[[ ${#FAILED[@]} -eq 0 ]] || { STEP="capturing (${FAILED[*]})"; die "capture failed: ${FAILED[*]}"; }

# A story that did not render is a failed capture too; every other status is the owner's to review.
STEP="captured"
for P in "${PROJECTS[@]}"; do
    R="$OUT/$P/results.json"
    [[ "$(jq -r .complete "$R" 2>/dev/null)" == "true" ]] || die "$P: results.json is missing or incomplete"
    echo "visual-preview: $P: $(jq -r '[.items | group_by(.status)[] | "\(length) \(.[0].status)"] | join(", ")' "$R")"
    BAD="$(jq -r '.items[] | select(.status == "failed") | "  \(.file): \(.reason)"' "$R")"
    [[ -z "$BAD" ]] || { echo "$BAD" >> "$LOG"; die "$P: stories failed to capture:
$BAD"; }
done

# The server shows only a preview of the current head; say so when the branch moved meanwhile.
if [[ "$MODE" == "pr" ]] && NOW="$(gh api "repos/{owner}/{repo}/pulls/$PR" --jq .head.sha)" && [[ "$NOW" != "$HEAD" ]]; then
    STEP="the branch moved to ${NOW:0:10} while this captured ${HEAD:0:10}"
    status stale "${PROJECTS[@]}"
    echo "visual-preview: #$PR moved on while capturing; run it again for ${NOW:0:10}"
    exit 0
fi
status done "${PROJECTS[@]}"
echo "visual-preview: $KEY done: ${PROJECTS[*]} in $OUT"
[[ -n "$PR" ]] || echo "visual-preview: no open pull request for this branch yet, so the review page does not list this capture; run tools/visual-preview.sh <pr> after opening it"
