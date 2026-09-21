#!/usr/bin/env bash
#
# commit-changes.sh -- land the working tree as a sequence of conventional commits.
#
# Start here:
#
#   ./tools/commit-changes.sh --dry-run     # read the plan; STAGES NOTHING
#   ./tools/commit-changes.sh               # make the commits
#   ./tools/commit-changes.sh --check       # run prepush:fast first, abort if it fails
#
# WHY THIS SCRIPT EXISTS, and why it does not use `git commit -m`.
#
# .husky/prepare-commit-msg is:
#
#     exec < /dev/tty && npx cz --hook || true
#
# That is Commitizen's INTERACTIVE prompt. A scripted `git commit -m "..."` hands
# control to the wizard, which either replaces the message it was given or hangs
# waiting for an answer nobody is watching -- so the commit never lands. The fix,
# taken from tmp/commit-hardening.sh, is to commit with core.hooksPath pointed at a
# temporary directory holding a copy of .husky/commit-msg and NOTHING else:
# commitlint still validates every message, and prepare-commit-msg is not there to
# run. The directory is removed in an EXIT trap. (.husky currently has no pre-commit
# hook; if one is added, it has to be copied in here too or it will be skipped.)
#
# It does NOT push. Pushing stays a separate, deliberate step -- and the pre-push
# hook (.husky/pre-push -> pnpm run prepush:fast -> tools/prepush.sh) runs the
# validation then.
#
# The plan below is tailored to one specific change set: the app shell work of
# 2026-09. It is data, not machinery -- STEPS, SUBJECTS, PATHS and one body_*
# function each. Re-point it at the next change set rather than reusing the
# messages, and read the diff before you write a message, not a summary of it.
#
# The repository releases with semantic-release, so every subject has to be a
# conventional commit: <type>(<scope>): <subject>, where type is one of
# feat / fix / perf / refactor / docs / test / build / ci / chore / style / revert
# and scope comes from commitlint.config.js's scope-enum. Subjects, scopes and body
# line lengths are all checked here, before anything is staged, rather than being
# discovered by a commit-msg failure halfway through the run.

set -euo pipefail

# Associative arrays, so bash 4 or newer. macOS ships bash 3.2 as /bin/bash; the
# shebang finds a newer one on PATH, and this says so rather than failing obscurely
# on an unbound variable.
if [ -z "${BASH_VERSINFO:-}" ] || [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
    echo "commit-changes: needs bash 4 or newer (found ${BASH_VERSION:-unknown})." >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DRY_RUN=0
CHECK=0

usage() {
    cat <<'USAGE'
commit-changes.sh -- land the working tree as a sequence of conventional commits.

  ./tools/commit-changes.sh --check     Validate every message against commitlint
                                        and STOP. Stages nothing, commits nothing.

  ./tools/commit-changes.sh --dry-run   Print the plan: every commit, its subject,
                                       its message and its diffstat. STAGES NOTHING
                                       and touches neither the index nor HEAD. Do
                                       this first, every time.
  ./tools/commit-changes.sh             Make the commits. One signing passphrase
                                       prompt per commit; no Commitizen wizard.
  ./tools/commit-changes.sh --check     Run `pnpm run prepush:fast` first and abort
                                       if it fails. Slow (minutes), thorough.
  ./tools/commit-changes.sh --help      This text.

Options: -n/--dry-run, -c/--check, -h/--help.

A commit whose paths have nothing left to commit is skipped with a note, so a
re-run after an interruption picks up where it stopped. Nothing is pushed.
USAGE
}

while [ $# -gt 0 ]; do
    case "$1" in
        -n|--dry-run)
            DRY_RUN=1
            shift
            ;;
        -c|--check)
            CHECK=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            echo "commit-changes: unexpected argument '$1'" >&2
            echo "This script carries its own messages; it takes no message argument." >&2
            echo "Try './tools/commit-changes.sh --help'." >&2
            exit 2
            ;;
    esac
done

# ---------------------------------------------------------------------------
# THE PLAN.
#
# One entry per commit, in the order they are made. This change set is what the
# pre-push gate turned up after the graphty-element 2.0 commits landed: one lint
# failure in a package 2.0 never touched, and this script's own re-point.
#
# TWO STEPS RATHER THAN ONE, and the second is not ceremony. Re-pointing this
# script dirties this script, so a plan that covered only the fix would leave
# tools/commit-changes.sh behind as an unclaimed leftover on every run. The
# alternative -- folding the script into the fix's commit -- would put a tooling
# change under an `algorithms` scope, which is the wrong package and the wrong
# type for what semantic-release reads.
#
# PATHS entries are space-separated pathspecs (no path in this repository has a
# space in it, so the word splitting below is deliberate). A directory pathspec
# takes everything under it -- ignored files are not added, because `git add`
# without -f leaves ignored paths alone and the preview uses
# `git ls-files --others --exclude-standard`, which counts the same set.
# ---------------------------------------------------------------------------

STEPS=(bellmanford tooling)

declare -A SUBJECTS=(
    [bellmanford]="fix(algorithms): restore the doc comment orphaned from bellmanFord"
    [tooling]="chore(tools): re-point the commit script at the bellman-ford fix"
)

declare -A PATHS=(
    [bellmanford]="algorithms/src/algorithms/shortest-path/bellman-ford.ts"
    [tooling]="tools/commit-changes.sh"
)

# ---------------------------------------------------------------------------
# One body per step. Written for someone reading `git log` a year from now with
# none of this conversation: say what changed and why it had to, not what the
# work was like. A BREAKING CHANGE footer is what semantic-release reads to cut
# a major; neither commit here is one.
# ---------------------------------------------------------------------------

body_bellmanford() {
    cat <<'BODY'
An interface and a helper were inserted between bellmanFord's doc comment and
the function, so the comment landed on the interface below it -- which then had
two stacked doc comments -- and the exported function had none. eslint's
jsdoc/require-jsdoc refused it, which stopped the pre-push gate for the whole
workspace.

The doc text is unchanged. It is the same seven lines, moved back above the
function they describe.
BODY
}

body_tooling() {
    cat <<'BODY'
The step list, the subjects and the paths describe this change set. The
machinery -- the commitlint pre-validation, the temporary hooks directory that
keeps commit-msg while leaving Commitizen's interactive prompt out of the run,
and the leftover report -- is unchanged.
BODY
}

# ---------------------------------------------------------------------------
# Preflight: refuse anywhere the result would be a surprise.
# ---------------------------------------------------------------------------

if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "commit-changes: not inside a git repository." >&2
    exit 1
fi

if [ -d "$(git rev-parse --git-path rebase-merge)" ] ||
   [ -d "$(git rev-parse --git-path rebase-apply)" ] ||
   [ -f "$(git rev-parse --git-path MERGE_HEAD)" ] ||
   [ -f "$(git rev-parse --git-path CHERRY_PICK_HEAD)" ]; then
    echo "commit-changes: a merge, rebase or cherry-pick is in progress. Finish it first." >&2
    exit 1
fi

if [ -n "$(git ls-files --unmerged)" ]; then
    echo "commit-changes: the tree has unresolved conflicts:" >&2
    git diff --name-only --diff-filter=U >&2
    exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
    echo "commit-changes: nothing to commit -- the working tree is clean."
    exit 0
fi

# A dirty index would be swept into the first commit whose `git add` ran after it,
# and the owner would not see it in that commit's preview. In a dry run it is only
# worth a warning, since nothing is staged either way.
if ! git diff --cached --quiet; then
    if [ "$DRY_RUN" = "1" ]; then
        echo "commit-changes: NOTE -- the index already holds staged changes:"
        git diff --cached --name-only | sed 's/^/  /'
        echo "  A real run refuses until they are unstaged ('git reset')."
        echo
    else
        echo "commit-changes: the index already holds staged changes:" >&2
        git diff --cached --name-only | sed 's/^/  /' >&2
        echo >&2
        echo "They would be swept into the first commit below without appearing in its" >&2
        echo "preview. Unstage them first: git reset" >&2
        exit 1
    fi
fi

if ! [ -f .husky/commit-msg ]; then
    echo "commit-changes: .husky/commit-msg is missing." >&2
    echo "That hook is the commitlint check this script deliberately keeps. Restore it" >&2
    echo "before committing, or the messages go unvalidated." >&2
    exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# ---------------------------------------------------------------------------
# Temporary state: the rendered messages, and the hooks directory that holds
# commit-msg without prepare-commit-msg.
# ---------------------------------------------------------------------------

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/commit-changes.XXXXXX")"
HOOKS_DIR="$WORK_DIR/githooks"

cleanup() {
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$HOOKS_DIR"
cp .husky/commit-msg "$HOOKS_DIR/commit-msg"
chmod +x "$HOOKS_DIR/commit-msg"

# Let gpg-agent find the terminal, so pinentry can prompt for the signing
# passphrase here instead of failing invisibly.
if tty -s; then
    GPG_TTY="$(tty)"
    export GPG_TTY
fi

# ---------------------------------------------------------------------------
# Validation, in full, before a single file is staged.
# ---------------------------------------------------------------------------

# The types semantic-release and commitlint's conventional preset accept.
CONVENTIONAL_TYPES='feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert'
# Kept in step with commitlint.config.js's scope-enum, which is enforced at level 2:
# a scope outside this list is rejected by the commit-msg hook, mid-run.
VALID_SCOPES="algorithms layout graphty-element compact-mantine remote-logger graphty
              gpu-3d-force-layout deps release ci docs tools workspace"
# commitlint's body-max-line-length, from @commitlint/config-conventional.
BODY_MAX_LINE=100
SUBJECT_MAX=100

# Renders one step's message -- subject, blank line, body -- to $WORK_DIR/<step>.msg.
# The rendered file is what `git commit -F -` later reads, so what is validated here
# is byte for byte what commitlint sees.
render_message() {
    local step="$1"
    {
        printf '%s\n\n' "${SUBJECTS[$step]}"
        # A step id may carry a hyphen; a shell function name may not.
        "body_${step//-/_}"
    } > "$WORK_DIR/$step.msg"
}

validate_step() {
    local step="$1"
    local subject="${SUBJECTS[$step]}"
    local ok=0

    if ! printf '%s' "$subject" | grep -Eq "^($CONVENTIONAL_TYPES)(\([a-z0-9._-]+\))?!?: .+"; then
        echo "commit-changes: [$step] subject is not a conventional commit." >&2
        echo "  got:      $subject" >&2
        echo "  expected: <type>(<scope>): <subject>" >&2
        echo "  types:    ${CONVENTIONAL_TYPES//|/ }" >&2
        ok=1
    fi

    case "$subject" in
        *.)
            echo "commit-changes: [$step] subject ends in a full stop; commitlint refuses one." >&2
            ok=1
            ;;
    esac

    if [ "${#subject}" -gt "$SUBJECT_MAX" ]; then
        echo "commit-changes: [$step] subject is ${#subject} characters; the limit is $SUBJECT_MAX." >&2
        ok=1
    fi

    # The scope, when there is one, has to be in commitlint's enum.
    local scope
    scope="$(printf '%s' "$subject" | sed -n 's/^[a-z]*(\([^)]*\)).*/\1/p')"
    if [ -n "$scope" ]; then
        local found=0 candidate
        for candidate in $VALID_SCOPES; do
            if [ "$scope" = "$candidate" ]; then
                found=1
                break
            fi
        done
        if [ "$found" = "0" ]; then
            echo "commit-changes: [$step] scope '$scope' is not in commitlint.config.js's scope-enum." >&2
            echo "  allowed: $(echo "$VALID_SCOPES" | tr -s ' \n' ' ')" >&2
            ok=1
        fi
    fi

    # Body lines, which commitlint caps as well. A long line there fails the commit
    # after the files are staged, which is the worst moment to find out.
    local line_no=0 line
    while IFS= read -r line; do
        line_no=$((line_no + 1))
        if [ "${#line}" -gt "$BODY_MAX_LINE" ]; then
            echo "commit-changes: [$step] message line $line_no is ${#line} characters (limit $BODY_MAX_LINE):" >&2
            echo "  $line" >&2
            ok=1
        fi
    done < "$WORK_DIR/$step.msg"

    return "$ok"
}

VALIDATION_FAILED=0
for step in "${STEPS[@]}"; do
    if [ -z "${SUBJECTS[$step]:-}" ] || [ -z "${PATHS[$step]:-}" ]; then
        echo "commit-changes: [$step] has no subject or no paths. Fix the plan." >&2
        VALIDATION_FAILED=1
        continue
    fi
    render_message "$step"
    validate_step "$step" || VALIDATION_FAILED=1
done

if [ "$VALIDATION_FAILED" != "0" ]; then
    echo >&2
    echo "commit-changes: nothing was staged and nothing was committed." >&2
    exit 1
fi

# --check means CHECK, and stops here. It used to set a variable nothing read, so
# the run fell through into the commit loop below and committed -- a flag that
# lied by its name, which is worse than no flag. (2026-09-13.)
if [ "$CHECK" = "1" ]; then
    echo
    echo "All ${#STEPS[@]} messages pass commitlint. Nothing was staged or committed."
    echo "To preview what each commit would take: ./tools/commit-changes.sh --dry-run"
    exit 0
fi

# ---------------------------------------------------------------------------
# Helpers that read the tree without touching the index.
# ---------------------------------------------------------------------------

# Echoes the subset of a step's pathspecs that still have something to commit.
# `git status --porcelain -- <pathspec>` is empty for a path that is clean, gone or
# never existed, and unlike `git add` it does not fail on a pathspec that matches
# nothing -- which is what makes a re-run after a partial run safe.
pending_paths() {
    local path
    for path in $1; do
        if [ -n "$(git status --porcelain -- "$path")" ]; then
            printf '%s\n' "$path"
        fi
    done
}

# True when a changed path belongs to some step, so the leftover report at the end
# can name what the plan does not cover.
claimed_by_plan() {
    local changed="${1%/}"
    local step path
    for step in "${STEPS[@]}"; do
        for path in ${PATHS[$step]}; do
            case "$changed" in
                "$path"|"$path"/*)
                    return 0
                    ;;
            esac
        done
    done
    return 1
}

report_leftovers() {
    local leftovers=()
    local line path
    # -uall so an untracked directory is reported file by file and a leftover inside
    # one cannot hide behind a directory the plan claims.
    while IFS= read -r line; do
        [ -n "$line" ] || continue
        # Porcelain: two status columns, a space, then the path -- or "old -> new"
        # for a rename, where the new name is the one to test.
        path="${line:3}"
        case "$path" in
            *" -> "*)
                path="${path##* -> }"
                ;;
        esac
        path="${path%\"}"
        path="${path#\"}"
        if ! claimed_by_plan "$path"; then
            leftovers+=("$path")
        fi
    done < <(git status --porcelain -uall)

    if [ "${#leftovers[@]}" != "0" ]; then
        echo "Changed files no commit in this plan claims (${#leftovers[@]}):"
        printf '  %s\n' "${leftovers[@]}"
        echo
        echo "They are still in the working tree, uncommitted and unstaged. Either add them"
        echo "to a step in this script or commit them yourself."
        echo
    fi
}

# ---------------------------------------------------------------------------
# Optional full validation, before anything is committed.
# ---------------------------------------------------------------------------

if [ "$CHECK" = "1" ]; then
    echo "Running prepush:fast before committing (lint, build and the fast tests)..."
    if ! pnpm run prepush:fast; then
        echo >&2
        echo "commit-changes: prepush:fast failed. Nothing staged, nothing committed." >&2
        exit 1
    fi
    echo
fi

# ---------------------------------------------------------------------------
# The run.
# ---------------------------------------------------------------------------

echo "Branch:  $BRANCH"
echo "Commits: ${#STEPS[@]}"
if [ "$DRY_RUN" = "1" ]; then
    echo "Mode:    DRY RUN -- nothing is staged, nothing is committed, the index is untouched"
else
    echo "Mode:    committing. One signing passphrase prompt per commit; no Commitizen wizard"
fi
echo

MADE=0
SKIPPED=0

for step in "${STEPS[@]}"; do
    subject="${SUBJECTS[$step]}"
    pending="$(pending_paths "${PATHS[$step]}")"

    echo "-----------------------------------------------------------------------"
    echo "[$step] $subject"
    echo

    if [ -z "$pending" ]; then
        echo "  Nothing left to commit under this step's paths -- already committed. Skipping."
        echo
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # What this commit will contain, read from the tree rather than from the index.
    # shellcheck disable=SC2086 # deliberate word splitting: pathspecs, no spaces
    tracked_stat="$(git diff --stat HEAD -- $pending)"
    # shellcheck disable=SC2086
    untracked="$(git ls-files --others --exclude-standard -- $pending)"

    if [ -n "$tracked_stat" ]; then
        echo "  Tracked changes:"
        printf '%s\n' "$tracked_stat" | sed 's/^/  /'
    fi

    if [ -n "$untracked" ]; then
        untracked_count="$(printf '%s\n' "$untracked" | wc -l | tr -d ' ')"
        echo "  New files ($untracked_count):"
        printf '%s\n' "$untracked" | head -n 10 | sed 's/^/    /'
        if [ "$untracked_count" -gt 10 ]; then
            echo "    ... and $((untracked_count - 10)) more"
        fi
    fi
    echo

    if [ "$DRY_RUN" = "1" ]; then
        echo "  Message:"
        sed 's/^/  | /' "$WORK_DIR/$step.msg"
        echo
        continue
    fi

    # shellcheck disable=SC2086
    git add -- $pending

    if git diff --cached --quiet; then
        echo "  Staged nothing after all -- skipping rather than making an empty commit."
        echo
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # core.hooksPath is the whole trick: commit-msg (commitlint) runs from the
    # temporary directory, and Commitizen's prepare-commit-msg is not in it.
    git -c core.hooksPath="$HOOKS_DIR" commit -F - < "$WORK_DIR/$step.msg"

    echo
    echo "  $(git log -1 --format='%h %G? %s')"
    echo
    MADE=$((MADE + 1))
done

echo "-----------------------------------------------------------------------"
echo

report_leftovers

if [ "$DRY_RUN" = "1" ]; then
    echo "Dry run. Nothing was staged and nothing was committed; the index is untouched."
    echo "To make these commits: ./tools/commit-changes.sh"
    exit 0
fi

echo "Made $MADE commit(s) on '$BRANCH'; skipped $SKIPPED."
echo
git log --oneline -n "${#STEPS[@]}" | cat
echo
echo "Not pushed. Next:"
echo "  git push origin $BRANCH"
echo
echo "The pre-push hook runs tools/prepush.sh -- lint, knip, build and the fast tests"
echo "across every package, not just the ones touched here. Expect a few minutes."
