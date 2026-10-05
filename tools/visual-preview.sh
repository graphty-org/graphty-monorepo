#!/usr/bin/env bash
#
# Captures a pull request's screenshots on this machine, minutes after a push, so the owner can
# review (and Finish) them before CI's capture lands. Design: design/visual-testing/local-previews.md.
#
# Usage:
#   ./tools/visual-preview.sh <pull request number>
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

set -euo pipefail

die() {
    echo "tools/visual-preview.sh: $*" >&2
    if [[ -n "${STEP:-}" ]]; then echo "$*" >> "$LOG"; status failed; fi
    exit 1
}

PR="${1:-}"
[[ "$PR" =~ ^[1-9][0-9]*$ ]] || die "usage: visual-preview.sh <pull request number>"

HERE="$(cd "$(dirname "$0")/.." && pwd)"
MAIN="$(dirname "$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir)")"
WORK="$(jq -r '.workDir // "tmp/visual-review"' "$HERE/visual-review.config.json")"
ROOT="$MAIN/$WORK/local"
OUT="$ROOT/$PR"
WT="$MAIN/.worktrees/visual-preview"
mkdir -p "$OUT"
LOG="$OUT/log.txt"

# The pull request: same repository, open, and its head.
read -r STATE HEAD_REPO BASE_REPO HEAD < <(gh api "repos/{owner}/{repo}/pulls/$PR" \
    --jq '[.state, (.head.repo.full_name // "deleted"), .base.repo.full_name, .head.sha] | @tsv')
[[ "$STATE" == "open" ]] || die "#$PR is $STATE, not open"
[[ "$HEAD_REPO" == "$BASE_REPO" ]] || die "#$PR comes from $HEAD_REPO, a fork: its code is never built here"

STEP="waiting for the lock"
STARTED="$(date -u +%FT%TZ)"
status() { # <state> [projects...]
    local state="$1"; shift
    local tail=""
    [[ "$state" == "failed" ]] && tail="$(tail -n 20 "$LOG" 2>/dev/null || true)"
    jq -n --arg state "$state" --arg step "$STEP" --argjson pr "$PR" --arg head "$HEAD" \
        --arg merge "${MERGE:-}" --arg started "$STARTED" --arg at "$(date -u +%FT%TZ)" --arg tail "$tail" \
        --args '{state: $state, step: $step, pr: $pr, head: $head, merge: (if $merge == "" then null else $merge end),
            startedAt: $started, updatedAt: $at, projects: $ARGS.positional, log: (if $tail == "" then null else $tail end)}' \
        "$@" > "$OUT/status.json.tmp"
    mv "$OUT/status.json.tmp" "$OUT/status.json"
}
trap 'status failed' ERR

status running
exec 9> "$ROOT/.lock"
flock 9
: > "$LOG"
echo "visual-preview: #$PR at ${HEAD:0:10} (log: $LOG)"

STEP="fetching refs/pull/$PR/merge"
status running
git -C "$MAIN" fetch -q origin "+refs/pull/$PR/merge:refs/visual-preview/$PR" >> "$LOG" 2>&1
MERGE="$(git -C "$MAIN" rev-parse "refs/visual-preview/$PR")"
[[ "$(git -C "$MAIN" rev-parse "$MERGE^2")" == "$HEAD" ]] \
    || die "refs/pull/$PR/merge is not built from the head $HEAD yet; try again in a minute"

# Inside the preview worktree only: never the main checkout. No hooks, no LFS download on checkout.
STEP="checking out the merge tree"
status running
G=(git -c core.hooksPath=/dev/null -C "$WT")
export GIT_LFS_SKIP_SMUDGE=1 HUSKY=0 NX_DAEMON=false
[[ -e "$WT" ]] || git -C "$MAIN" -c core.hooksPath=/dev/null worktree add -q --detach "$WT" "$MERGE" >> "$LOG" 2>&1
"${G[@]}" checkout -q --force --detach "$MERGE" >> "$LOG" 2>&1
"${G[@]}" clean -fdq >> "$LOG" 2>&1
[[ -e "$WT/.env" ]] || ln -s "$MAIN/.env" "$WT/.env"
"${G[@]}" lfs pull --include "visual-baselines/**,visual-fonts/**" >> "$LOG" 2>&1
# The base branch's capture code, as CI runs it (ci.yml, "Use the base branch's capture code").
rm -rf "$WT/visual-review/capture" "$WT/visual-review/trusted"
"${G[@]}" archive "$MERGE^1" visual-review/capture visual-review/trusted | tar -x -C "$WT"

STEP="installing dependencies"
status running
(cd "$WT" && pnpm install --frozen-lockfile) >> "$LOG" 2>&1

# The projects the change affects (all of them when nx cannot tell).
STEP="finding the affected projects"
status running
mapfile -t ALL < <(jq -r '.projects | keys[]' "$WT/visual-review.config.json")
if AFFECTED="$(cd "$WT" && pnpm exec nx show projects --affected --base="$MERGE^1" --head="$MERGE" --json 2>> "$LOG")"; then
    mapfile -t PROJECTS < <(jq -r --argjson all "$(printf '%s\n' "${ALL[@]}" | jq -R . | jq -s .)" \
        '.[] | select(. as $p | $all | index($p))' <<< "$AFFECTED")
else
    PROJECTS=("${ALL[@]}")
fi
if [[ ${#PROJECTS[@]} -eq 0 ]]; then
    STEP="nothing to capture: no project with a Storybook is affected"
    status done
    echo "visual-preview: #$PR changes no project with a Storybook"
    exit 0
fi

WRAP=()
[[ -x "$MAIN/tmp/with-browser.sh" ]] && WRAP=("$MAIN/tmp/with-browser.sh")
for P in "${PROJECTS[@]}"; do
    STEP="building the Storybook ($P)"
    status running "${PROJECTS[@]}"
    (cd "$WT" && bash -c "$(jq -r --arg p "$P" '.projects[$p].build' visual-review.config.json)") >> "$LOG" 2>&1

    STEP="capturing ($P)"
    status running "${PROJECTS[@]}"
    REF="$(mktemp -d)"
    REF_DIR="$(cd "$WT" && node visual-review/trusted/cli.mjs reference --project "$P" --out "$REF" 2>> "$LOG" || true)"
    rm -rf "${OUT:?}/$P"
    (cd "$WT" && VISUAL_REVIEW_PREVIEW_PR="$PR" VISUAL_REVIEW_PREVIEW_HEAD="$HEAD" "${WRAP[@]}" \
        node visual-review/trusted/cli.mjs capture --project "$P" --out "$OUT/$P" --reference "$REF_DIR") >> "$LOG" 2>&1
    rm -rf "$REF"
done

# The server shows only a preview of the current head; say so when the branch moved meanwhile.
NOW="$(gh api "repos/{owner}/{repo}/pulls/$PR" --jq .head.sha)"
STEP="captured"
if [[ "$NOW" != "$HEAD" ]]; then
    STEP="the branch moved to ${NOW:0:10} while this captured ${HEAD:0:10}"
    status stale "${PROJECTS[@]}"
    echo "visual-preview: #$PR moved on while capturing; run it again for ${NOW:0:10}"
    exit 0
fi
status done "${PROJECTS[@]}"
echo "visual-preview: #$PR done: ${PROJECTS[*]} in $OUT"
