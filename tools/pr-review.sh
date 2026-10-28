#!/bin/bash
# The fresh-context code review of a branch before its pull request opens (design/ci/channels-pipeline/
# budgets-and-trust.md section 4.3, merging.md section 2.2). A headless `claude -p` that has never seen the
# author's conversation reviews the change with the /code-review skill at level high, given only:
#   - the issue (title and body, `gh issue view`),
#   - the diff, `git diff origin/master...HEAD` (data files named only; over 400 KB, its --stat),
#   - the Proof file.
#
#   tools/pr-review.sh --proof <file> [--issue N] [--base <ref>] [--reuse] [--dry-run]
#
# It writes the report to tmp/pr-review/<branch>/report.md and prints that path. The report's first line is
#   <!-- fresh-review <patch id> -->
# where the patch id is `git patch-id --stable` of `git diff -U0 <merge base> HEAD`, the branch's own change,
# exactly as PR Integrity (tools/pr-integrity.mjs, patchId) recomputes it; tools/pr-open.sh posts the report
# as a COMMENT review, which is what PR Integrity looks for. Its last line is `Blocking findings: N`.
#
# Exit 0: no blocking finding. Exit 3: N > 0; fix them (a fix changes the patch id, so the next run reviews
# again) or answer each one in the Proof and open with `tools/pr-open.sh --review-answered`. Exit 1: refused
# or failed (no Proof, no issue, nothing to review, no verdict from the review).
#   --reuse    accepted for old callers; a branch is reviewed ONCE (owner, 2026-10-26): when it already has a
#              report, that report is used whatever the branch changed since. --again reviews it once more.
#   --dry-run  print the prompt it would send and exit, calling nothing and writing nothing
set -euo pipefail

# Always master's review (owner, 2026-10-26): a branch that has not merged master since the review changed
# would otherwise run its own older copy of this script (the costly one, before #3657). So fetch master and,
# when its copy differs from this one, run that instead. PR_REVIEW_LOCAL=1 (the tests) keeps this copy.
if [ -z "${PR_REVIEW_FROM_MASTER:-}${PR_REVIEW_LOCAL:-}" ]; then
    git fetch -q origin master 2>/dev/null || true
    latest=$(mktemp)
    if git show origin/master:tools/pr-review.sh >"$latest" 2>/dev/null && [ -s "$latest" ] && ! cmp -s "$latest" "$0"; then
        PR_REVIEW_FROM_MASTER=1 exec bash "$latest" "$@"
    fi
    rm -f "$latest"
fi

die() {
    echo "pr-review: $*" >&2
    exit 1
}

proof="" issue="" base="origin/master" reuse=0 dry=0 again=0
while [ $# -gt 0 ]; do
    case "$1" in
        --proof) proof="${2:-}"; shift 2 ;;
        --issue) issue="${2:-}"; shift 2 ;;
        --base) base="${2:-}"; shift 2 ;;
        --reuse) reuse=1; shift ;;
        --again) again=1; shift ;;
        --dry-run) dry=1; shift ;;
        *) die "unknown argument: $1 (usage: tools/pr-review.sh --proof <file> [--issue N] [--base <ref>] [--reuse] [--again] [--dry-run])" ;;
    esac
done

[ -n "$proof" ] && [ -s "$proof" ] || die "--proof <file> is required and must not be empty"
branch=$(git symbolic-ref -q --short HEAD) || die "HEAD is detached; check out the branch"
# The same issue rule as tools/pr-open.sh.
[ -n "$issue" ] || issue=$(git config "branch.$branch.issue" || true)
[ -n "$issue" ] || issue=$(printf '%s\n' "$branch" | sed -nE 's#^[a-z0-9-]+/([0-9]{3,})(-[a-zA-Z].*)?$#\1#p')
[[ "$issue" =~ ^[0-9]+$ ]] || die "$branch names no issue (pass --issue N)"

mb=$(git merge-base "$base" HEAD) || die "no merge base with $base"
# the same options as patchId in tools/pr-integrity.mjs (--binary: a changed binary file moves the id)
id=$(git diff -U0 --binary --no-color --no-ext-diff --no-renames --diff-algorithm=myers "$mb" HEAD | git patch-id --stable | cut -d' ' -f1)
[ -n "$id" ] || die "$branch changes nothing against $base"
marker="<!-- fresh-review $id -->"

top=$(git rev-parse --show-toplevel)
report="$top/tmp/pr-review/$branch/report.md"
verdict() { sed -nE 's/^Blocking findings: ([0-9]+)[[:space:]]*$/\1/p' "$1" | tail -n 1; }
finish() {
    echo "$report"
    if [ "$1" -gt 0 ]; then
        echo "pr-review: $1 blocking finding(s) in $report; fix them, or answer each in the Proof and open with --review-answered" >&2
        exit 3
    fi
    exit 0
}
# One review per branch (owner, 2026-10-26): every fix used to change the patch id and start a full new review,
# about 40% of all token use. An existing report stands for the branch unless --again asks for another.
if [ "$again" = 0 ] && [ "$dry" = 0 ] && [ -f "$report" ]; then
    n=$(verdict "$report")
    [ -z "$n" ] || finish "$n"
fi

issue_text=$(gh issue view "$issue" --json title,body --jq '"\(.title)\n\n\(.body)"' 2>/dev/null) ||
    die "could not read issue #$issue with gh"

prompt=$(mktemp)
out=$(mktemp)
trap 'rm -f "$prompt" "$out"' EXIT
{
    cat <<EOF
Use the code-review skill (the Skill tool, skill "code-review", args "medium") to review one change to this
repository before its pull request opens. You have not seen the author's conversation; judge the change
only from the three inputs below and the repository's code. Review the change in the DIFF section, not the
working tree's uncommitted state. Do not edit any file.

Report ONLY critical findings. A finding is critical when the change, merged as it is, would: break master or
CI, merge or publish wrong code, lose or corrupt data, open a security hole or leak a secret, silently disable
or weaken a check or a test, or rest on a Proof claim that is false. Leave out everything else: style,
naming, wording, documentation, comments, edge cases nobody will hit, suggestions, questions, and follow-ups.
Most changes have no critical finding; saying so is the expected and correct answer, not a failure to look.

Write Markdown on standard output. For each critical finding: its file and line, what is wrong, and the
concrete case that breaks. If there are none, write exactly "No critical findings." End with exactly one
line of the form

Blocking findings: N

where N is the number of critical findings (0 when there are none).

===== ISSUE #$issue =====
$issue_text

===== PROOF =====
EOF
    cat "$proof"
    echo
    echo "===== DIFF (git diff $base...HEAD) ====="
    # Data and generated files (design records, sample datasets, lockfiles) are named, never inlined; a diff
    # still larger than PR_REVIEW_INLINE_MAX bytes goes in as its --stat, and the reviewer reads each file's
    # diff itself with git diff. claude -p refuses stdin over 10 MB, and a few MB already overflow its context.
    skip=(':(top,glob,exclude)design/**' ':(top,glob,exclude)graphty/public/samples/*.json'
        ':(top,glob,exclude)**/pnpm-lock.yaml' ':(top,glob,exclude)**/package-lock.json' ':(top,glob,exclude)**/yarn.lock')
    git diff --no-color --no-ext-diff "$base...HEAD" -- ':(top)' "${skip[@]}" >"$out"
    if [ "$(wc -c <"$out")" -le "${PR_REVIEW_INLINE_MAX:-400000}" ]; then
        cat "$out"
    else
        echo "This diff is too large to include. Its summary follows; read each file's change yourself with"
        echo "git diff $base...HEAD -- <file>."
        echo
        git diff --no-color --stat=200 "$base...HEAD" -- ':(top)' "${skip[@]}"
    fi
    named=$(git diff --name-only "$base...HEAD" -- ':(top)design' ':(top,glob)graphty/public/samples/*.json' ':(top,glob)**/pnpm-lock.yaml' \
        ':(top,glob)**/package-lock.json' ':(top,glob)**/yarn.lock')
    if [ -n "$named" ]; then
        echo
        echo "Data and generated files also changed (not shown; read one with git diff if it matters):"
        printf '%s\n' "$named"
    fi
} >"$prompt"

if [ "$dry" = 1 ]; then
    cat "$prompt"
    exit 0
fi

# A fresh process with no --continue or --resume: it starts with no conversation but this prompt.
claude -p --output-format text \
    --allowedTools "Read,Grep,Glob,Skill,Bash(git diff:*),Bash(git log:*),Bash(git show:*)" \
    --disallowedTools "Write,Edit,NotebookEdit,WebFetch,WebSearch" \
    <"$prompt" >"$out" || die "claude -p failed (exit $?)"
n=$(verdict "$out")
[ -n "$n" ] || die "the review ended without a 'Blocking findings: N' line; its output is not a verdict"
mkdir -p "$(dirname "$report")"
{
    echo "$marker"
    echo
    cat "$out"
} >"$report"
finish "$n"
