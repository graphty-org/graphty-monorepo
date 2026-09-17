#!/usr/bin/env bash
#
# Land @graphty/webgpu-graph-algorithms in graphty-monorepo with its git history.
#
# Modelled on tools/commit-graph-format-landing.sh (the graph-format landing): the same
# narrowed core.hooksPath (commitlint runs, Commitizen's tty wizard does not), the same
# "every changed path is claimed by exactly one step" guard, the same --dry-run. It differs
# in that the package arrives through a history merge, so the FIRST commit on the landing
# branch is the merge and the wiring commits come after it (design/monorepo/
# nx-monorepo-implementation-plan.md:1483-1491: history must be merged BEFORE the files exist).
#
# Signing: every commit is GPG-signed (~/.gitconfig commit.gpgsign=true) and the script refuses to
# run without it (owner rule of 2026-09-17: signing is never disabled); run it from an interactive
# terminal so the pinentry prompt can appear.
#
# Usage, in order (all from the landing worktree):
#   ./tools/land-webgpu-graph-algorithms.sh prepare          # fresh clone + filter-repo rewrite + fetch
#   ./tools/land-webgpu-graph-algorithms.sh merge            # the unrelated-history merge (first commit)
#   ./tools/land-webgpu-graph-algorithms.sh commit workspace # then package, docs, ignore, ci -- one at a time,
#                                                            #   after the plan's tasks have filled the tree
#   ./tools/land-webgpu-graph-algorithms.sh push             # push the branch (pre-push gate runs)
#   ./tools/land-webgpu-graph-algorithms.sh land             # after the PR is green: ff master, push master
#                                                            #   (run through the worktree copy; it switches to the
#                                                            #   main worktree itself; pass --skip-gate: the pre-push
#                                                            #   gate already ran on the branch push, and the main
#                                                            #   worktree's node_modules predate the new importer)
# Options: --dry-run (stage/commit nothing), --skip-gate (push --no-verify).
#
# Every message below is plain ASCII and carries no Co-Authored-By / Claude-Session trailer;
# the script refuses to commit a message that has either.

set -u

cd "$(dirname "$0")/.." || exit 1

SOURCE_REPO=/home/apowers/Projects/webgpu-graph-algorithms
REWRITE_DIR=tmp/land/wga-rewrite            # inside the monorepo's gitignored tmp/
REMOTE_NAME=wga-rewrite
BRANCH=land/webgpu-graph-algorithms
MERGE_SUBJECT="feat: merge the webgpu-graph-algorithms package history into the monorepo"
EXPECTED_COMMITS=31                         # 30 from the rehearsal of 2026-09-16 + the M0-T1 docs commit

DRY_RUN=0
SKIP_GATE=0
COMMAND=""
STEP=""
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        --skip-gate) SKIP_GATE=1 ;;
        prepare|merge|commit|push|land) COMMAND=$arg ;;
        workspace|package|docs|ignore|ci) STEP=$arg ;;
        *) echo "unknown argument: $arg"; exit 2 ;;
    esac
done
[ -n "$COMMAND" ] || { echo "usage: $0 {prepare|merge|commit <step>|push|land} [--dry-run] [--skip-gate]"; exit 2; }

fail() { echo "REFUSING: $1"; exit 1; }

# ---------------------------------------------------------------- the commit plan

STEP_ORDER="workspace package docs ignore ci"

declare -A SUBJECTS=(
    [workspace]="build(workspace): wire webgpu-graph-algorithms into the workspace, hooks, coverage and docs index"
    [package]="build(webgpu-graph-algorithms): point the manifest, project graph and live docs at the monorepo"
    [docs]="docs(webgpu-graph-algorithms): record the landing beside the design and index the design corpus"
    [ignore]="build(workspace): ignore the package's run output and normalise line endings"
    [ci]="ci: add the webgpu-graph-algorithms shards, the GPU lane and the host matrix"
)

declare -A PATHS=(
    [workspace]="pnpm-workspace.yaml commitlint.config.js knip.config.ts package.json pnpm-lock.yaml tools/prepush.sh tools/merge-coverage.sh tools/apply-root-claude-md-webgpu.py tools/land-webgpu-graph-algorithms.sh CLAUDE.md README.md"
    [package]="webgpu-graph-algorithms/package.json webgpu-graph-algorithms/project.json webgpu-graph-algorithms/README.md webgpu-graph-algorithms/CLAUDE.md webgpu-graph-algorithms/vitest.config.ts webgpu-graph-algorithms/test/build-output.test.ts webgpu-graph-algorithms/test/fixtures/networkx/generate.py webgpu-graph-algorithms/src/memory/upload-plan.ts webgpu-graph-algorithms/benchmarks/run.ts webgpu-graph-algorithms/benchmarks/layout-run.ts webgpu-graph-algorithms/scripts/bench-compare.js"
    [docs]="design/webgpu design/README.md graph-format/CLAUDE.md graph-format/test/audit/gpu-upload.test.ts"
    [ignore]=".gitignore .gitattributes"
    [ci]=".github/workflows/ci.yml .github/workflows/release.yml .github/workflows/gpu.yml .github/workflows/hosts.yml"
)

body_workspace() {
    cat <<'MSG'
The root touch points of design section 13.3 (graph-format design) and 12.5
(WebGPU design), the same set commit 0069386c applied for graph-format and
graph-io: the workspace entry, the commitlint scope, the knip workspace with
the two subpath barrels as extra entries, the coverage-preview script on port
9058, the pre-push fast-test line (the node project only; the browser project
runs in CI), the merge-coverage package list, and the root CLAUDE.md and
README.md sections. The lockfile gains the package's importer; every external
version it needs was already resolved by graph-format's devDependencies.

tools/apply-root-claude-md-webgpu.py edits the two CLAUDE.md lines that carry
non-ASCII characters (the tree and the build-order arrows), anchored on lines
that must occur exactly once; tools/land-webgpu-graph-algorithms.sh is the
landing script that made these commits.
MSG
}

body_package() {
    cat <<'MSG'
The package.json repository, bugs and homepage fields name this repository
and the directory webgpu-graph-algorithms (the test that pinned the staging
directory string follows). The graph-format peer range becomes "^0.2.0",
the minor graph-io states since 6b4777df: nx release keeps a dependent's
range only while the new version satisfies it and refuses to version
otherwise, so "^0.1.0" would make the format's 0.1.0 -> 0.2.0 bump abort the
whole release; below 1.0.0 a caret pins the minor, the honest claim for a
0.x format, and the F2 PR turns it into "^1.0.0".

project.json: implicitDependencies "!algorithms" and "!layout" remove the
project-graph edges nx builds from the OPTIONAL peer ranges (^1.0.0 matches
the workspace versions), which would otherwise build both packages before
this one, patch-bump it on their every release and mark it affected by their
every change; the edges return with the real devDependencies at W1-proper.
The lint target depends on build (the strict-consumer compile reads the d.ts
shims only build:bundle writes) and the test targets are uncached (their
outcome depends on the adapter and the GRAPHTY_* policy, which nx does not
hash).

README.md and CLAUDE.md cite the design and the interface contract at
design/webgpu/ instead of the staging root, and the NVIDIA recipes name the
libEGL tree under this repository's tmp/ (the dev container still lacks
libegl1; HEADLESS_GPU_REPORT.md appendix D). The vitest reporter is "default"
under CI, as graph-format and graph-io set it after the worker RPC starved
behind the verbose reporter (6fc56c1b). The three upload-plan interfaces carry
@public (members of the exported UploadPlan union; knip 5.77 reported them),
and the usage comments of the benchmark runners and bench-compare name the
new directory.
MSG
}

body_docs() {
    cat <<'MSG'
The accepted WebGPU design (design/webgpu/webgpu-acceleration-plan.md, owner
decision Q-18 chose this directory) and the P0-P3 interface contract and phase
plans under design/webgpu/plans/ arrived with the package's history. Each of
the two normative documents gains a LANDED entry appended at its end (never
prepended: the contract, the phase plans and the gate records cite the design
by line number) explaining the path forms of the staging era. design/webgpu/
README.md indexes the corpus, since the p1 and p3 phase plans exceed a
megabyte and GitHub does not render them; design/README.md gains the webgpu
row and the graph-format row the F1 landing forgot; graph-format/CLAUDE.md
and the GPU upload audit stop pointing at staging-only paths. The
integration plan carries its execution-time amendments (the knip path
artifact of .worktrees/ checkouts and the gate that runs from a clean-path
copy because of it).
MSG
}

body_ignore() {
    cat <<'MSG'
The package writes benchmarks/out/, browser-results.json and gpu-report.json
when its benchmarks, browser smoke and adapter report run (contract 2.8); the
staging repository ignored all three and this one did not. The four review
probe logs under docs/research/review/probes/ are committed on purpose
(contract 1.1); the root "*.log" rule would hide any NEW probe log from git
status, so the directory is un-ignored by name (the tracked four are
unaffected either way).

.gitattributes: every text file is committed and checked out with LF (the
Windows host lane runs the package's tests on a checkout; the source-entry
test and prettier assume LF), the two import corpora keep their deliberate
CRLF files (-text), and .gsnp / .png / .zip fixtures are marked binary.
`git ls-files --eol` shows no CRLF or mixed file outside the two corpora, so
the attribute describes the tree as it already is.
MSG
}

body_ci() {
    cat <<'MSG'
Two software shards join the test matrix (design 12.5): webgpu-graph-
algorithms-node runs the node project on Mesa lavapipe with coverage and the
no-subgroups pass, and uploads coverage-webgpu-graph-algorithms-node; webgpu-
graph-algorithms-browser runs the Chromium SwiftShader smoke through
scripts/run-browser-project.js. A needs-lavapipe matrix key gates the apt
install and the ICD discovery (ubuntu-24.04 ships lvp_icd.json, not the
lvp_icd.x86_64.json the design's table names). The build job builds the
package explicitly on PRs (nothing depends on it yet), uploads build-webgpu-
graph-algorithms, every shard downloads it, and release.yml downloads it for
nx release publish.

gpu.yml is the staging GPU lane with the three changes of design 12.5 (paths
without the packages/ prefix, its own install and nx build on the runner,
pnpm/action-setup without package_json_file); its push and schedule triggers
stay commented out until the hosted gpu-linux-t4 runner exists, and it is
never a job of CI (release.yml and coverage.yml are workflow_run on CI).
hosts.yml is the informational macOS / Windows matrix, filtered to changes
under webgpu-graph-algorithms/ and graph-format/.
MSG
}

# ---------------------------------------------------------------- shared guards

hooks_dir() {
    # commitlint runs; the Commitizen tty wizard (prepare-commit-msg) is absent
    HOOKS_DIR=$(mktemp -d)
    cp .husky/commit-msg "$HOOKS_DIR/commit-msg"
    chmod +x "$HOOKS_DIR/commit-msg"
    echo "$HOOKS_DIR"
}

check_message() {
    local file=$1
    if LC_ALL=C grep -qP '[^\x00-\x7F]' "$file"; then fail "non-ASCII byte in the commit message $file"; fi
    if grep -qiE '^(Co-Authored-By|Claude-Session):' "$file"; then fail "attribution trailer in the commit message $file"; fi
    local subject
    subject=$(head -1 "$file")
    [ "${#subject}" -le 100 ] || fail "subject longer than 100 characters: $subject"
    # commitlint's body-max-line-length (config-conventional: 100) applies to the merge message too
    awk 'length($0) > 100 { exit 1 }' "$file" || fail "a line of the commit message $file exceeds 100 characters"
}

require_signing() {
    # never disabled, never overridden: the merge and every wiring commit carry the owner's signature
    [ "$(git config --get commit.gpgsign)" = "true" ] || fail "commit.gpgsign is not true; signing is never disabled for this landing"
    [ -n "$(git config --get user.signingkey)" ] || fail "no user.signingkey configured"
}

on_landing_branch() {
    [ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || fail "run this from the landing worktree on $BRANCH"
    # in a linked worktree .git is a file; rebase / merge state lives under the worktree's git dir
    local gd
    gd=$(git rev-parse --git-dir)
    { [ -d "$gd/rebase-merge" ] || [ -d "$gd/rebase-apply" ]; } && fail "a rebase is in progress"
    [ -f "$gd/MERGE_HEAD" ] && fail "a merge is in progress"
    [ -z "$(git diff --cached --name-only)" ] || fail "the index is not empty"
}

# ---------------------------------------------------------------- prepare

do_prepare() {
    on_landing_branch
    [ -d "$SOURCE_REPO/.git" ] || fail "source repository not found at $SOURCE_REPO"
    (cd "$SOURCE_REPO" && [ -z "$(git status --porcelain)" ]) || fail "the source repository has uncommitted changes; finish Task M0-T1 first"
    local tip
    tip=$(cd "$SOURCE_REPO" && git rev-parse HEAD)
    echo "source tip: $tip"
    [ "$DRY_RUN" = "1" ] && { echo "DRY RUN: would clone, rewrite and fetch"; return; }
    mkdir -p tmp/land
    if [ -d "$REWRITE_DIR" ]; then
        echo "removing the previous rewrite at $REWRITE_DIR"
        rm -rf "$REWRITE_DIR"
    fi
    git clone --no-local --quiet "$SOURCE_REPO" "$REWRITE_DIR" || fail "clone failed"
    (
        cd "$REWRITE_DIR" || exit 1
        git log --format='%h %s' > ../log-before.txt
        # --force is not needed for a --no-local clone (it passes filter-repo's fresh-clone check); kept so a
        # re-run over a partially rewritten clone cannot stop the script -- the clone is disposable
        git filter-repo --force \
            --path packages/webgpu-graph-algorithms/ \
            --path design/webgpu-acceleration-plan.md \
            --path docs/superpowers/plans/ \
            --path HEADLESS_GPU_REPORT.md \
            --path-rename packages/webgpu-graph-algorithms/:webgpu-graph-algorithms/ \
            --path-rename design/webgpu-acceleration-plan.md:design/webgpu/webgpu-acceleration-plan.md \
            --path-rename docs/superpowers/plans/:design/webgpu/plans/ \
            --path-rename HEADLESS_GPU_REPORT.md:webgpu-graph-algorithms/docs/HEADLESS_GPU_REPORT.md \
            || exit 1
        git log --format='%h %s' > ../log-after.txt
        git gc --quiet --prune=now
    ) || fail "filter-repo failed"
    # verification of the rewrite
    local count top stray nonascii trailers
    count=$(git -C "$REWRITE_DIR" rev-list --count HEAD)
    [ "$count" = "$EXPECTED_COMMITS" ] || echo "NOTE: $count commits survived the rewrite (expected $EXPECTED_COMMITS); compare tmp/land/log-before.txt and log-after.txt"
    top=$(git -C "$REWRITE_DIR" ls-tree --name-only HEAD | sort | tr '\n' ' ')
    [ "$top" = "design webgpu-graph-algorithms " ] || fail "unexpected top-level paths after the rewrite: $top"
    stray=$(git -C "$REWRITE_DIR" log --name-only --format= | grep -v '^$' | grep -v '^webgpu-graph-algorithms/\|^design/webgpu/' | head -3)
    [ -z "$stray" ] || fail "the rewrite still touches paths outside the two prefixes: $stray"
    nonascii=$(git -C "$REWRITE_DIR" log --format='%B' | LC_ALL=C grep -cP '[^\x00-\x7F]' || true)
    [ "$nonascii" = "0" ] || fail "$nonascii non-ASCII line(s) in the imported commit messages"
    trailers=$(git -C "$REWRITE_DIR" log --format='%B' | grep -ciE '^(Co-Authored-By|Claude-Session):' || true)
    [ "$trailers" = "0" ] || fail "$trailers attribution trailer(s) in the imported commit messages"
    echo "rewrite ok: $count commits, $(du -sh "$REWRITE_DIR/.git" | cut -f1) packed"
    git remote remove "$REMOTE_NAME" 2>/dev/null || true
    git remote add "$REMOTE_NAME" "$REWRITE_DIR" || fail "remote add failed"
    git fetch --quiet "$REMOTE_NAME" master || fail "fetch failed"
    echo "fetched $REMOTE_NAME/master = $(git rev-parse --short "$REMOTE_NAME/master")"
    echo "next: $0 merge"
}

# ---------------------------------------------------------------- merge

do_merge() {
    on_landing_branch
    require_signing
    # tracked modifications block the merge; untracked files (this script before its own commit, tmp/land/) do not
    [ -z "$(git status --porcelain --untracked-files=no)" ] || fail "the worktree has uncommitted tracked changes"
    git rev-parse --verify --quiet "$REMOTE_NAME/master" > /dev/null || fail "run prepare first ($REMOTE_NAME/master is missing)"
    [ -z "$(git ls-tree --name-only HEAD webgpu-graph-algorithms design/webgpu)" ] || fail "webgpu-graph-algorithms/ or design/webgpu/ already exists on this branch: the history merge must come first"
    [ ! -e webgpu-graph-algorithms ] && [ ! -e design/webgpu ] || fail "webgpu-graph-algorithms/ or design/webgpu/ exists on disk (untracked); remove it, the merge creates both"
    [ "$(git rev-list --count master..HEAD)" = "0" ] || fail "the branch already has commits on top of master; the merge must be the first"
    local msg
    msg=$(mktemp)
    {
        echo "$MERGE_SUBJECT"
        echo
        cat <<'MSG'
The package, its design corpus and the P0-P3 phase plans arrive with the
history of graphty-org/webgpu-graph-algorithms (31 of its 39 commits survive
the path filter), rewritten by git filter-repo to this repository's layout
(packages/webgpu-graph-algorithms/ -> webgpu-graph-algorithms/, design/ and
docs/superpowers/plans/ -> design/webgpu/); the monorepo's own history-import
procedure (design/monorepo/nx-monorepo-implementation-plan.md). The wiring
follows in separate commits.
MSG
    } > "$msg"
    check_message "$msg"
    if [ "$DRY_RUN" = "1" ]; then echo "DRY RUN: would merge $REMOTE_NAME/master with:"; cat "$msg"; rm -f "$msg"; return; fi
    local hooks
    hooks=$(hooks_dir)
    git -c core.hooksPath="$hooks" merge --allow-unrelated-histories --no-ff -F "$msg" "$REMOTE_NAME/master"
    local status=$?
    rm -rf "$hooks" "$msg"
    [ "$status" = "0" ] || fail "merge failed (exit $status); git merge --abort and inspect"
    [ -z "$(git diff --name-only --diff-filter=U)" ] || fail "conflicts after the merge"
    [ "$(git log -1 --format=%G?)" = "G" ] || fail "the merge commit is not signed (git log -1 --format=%G? printed $(git log -1 --format=%G?)); do not push it"
    echo "merged: $(git log -1 --format='%h signed=%G? %s')"
    echo "package files: $(git ls-files webgpu-graph-algorithms | wc -l); design files: $(git ls-files design/webgpu | wc -l)"
    echo "next: run the plan's tasks, then $0 commit workspace (then package, docs, ignore, ci)"
}

# ---------------------------------------------------------------- commit <step>

do_commit() {
    on_landing_branch
    require_signing
    [ -n "$STEP" ] || fail "commit needs a step: workspace | package | docs | ignore | ci"
    for path in ${PATHS[$STEP]}; do
        [ -e "$path" ] || fail "planned path does not exist: $path"
    done
    # every changed path must belong to THIS step or to a LATER step; nothing may be unclaimed
    local changed unclaimed=""
    changed=$(git status --porcelain --untracked-files=normal | sed 's/^...//' | sed 's/ -> .*//' | sed 's:/$::')
    for c in $changed; do
        local claimed=0
        for s in $STEP_ORDER; do
            for p in ${PATHS[$s]}; do
                case "$c" in "$p" | "$p"/*) claimed=1 ;; esac
            done
        done
        [ "$claimed" = "1" ] || unclaimed="$unclaimed $c"
    done
    [ -z "$unclaimed" ] || fail "changed paths no step claims:$unclaimed"
    local msg
    msg=$(mktemp)
    { echo "${SUBJECTS[$STEP]}"; echo; "body_$STEP"; } > "$msg"
    check_message "$msg"
    echo "-- ${SUBJECTS[$STEP]}"
    for path in ${PATHS[$STEP]}; do
        printf '     %-60s %s file(s)\n' "$path" "$(git status --porcelain --untracked-files=all -- "$path" | wc -l)"
    done
    if [ "$DRY_RUN" = "1" ]; then echo "DRY RUN: nothing staged"; rm -f "$msg"; return; fi
    # shellcheck disable=SC2086
    git add -- ${PATHS[$STEP]} || fail "git add failed"
    [ -n "$(git diff --cached --name-only)" ] || { echo "nothing staged for $STEP; no commit made"; rm -f "$msg"; return; }
    local hooks
    hooks=$(hooks_dir)
    git -c core.hooksPath="$hooks" commit -F "$msg"
    local status=$?
    rm -rf "$hooks" "$msg"
    [ "$status" = "0" ] || fail "commit failed for $STEP"
    [ "$(git log -1 --format=%G?)" = "G" ] || fail "the $STEP commit is not signed (git log -1 --format=%G? printed $(git log -1 --format=%G?)); do not push it"
    echo "     $(git log -1 --format='%h signed=%G? %s')"
}

# ---------------------------------------------------------------- push / land

do_push() {
    on_landing_branch
    # the first-parent line above master is the merge and the wiring commits, all signed by the owner; the
    # 31 imported commits behind the merge's second parent are unsigned by design (D-1) and are not walked
    local unsigned
    unsigned=$(git log --first-parent --format='%G? %h %s' master..HEAD | grep -v '^G ' | head -3)
    [ -z "$unsigned" ] || fail "unsigned commit(s) on the first-parent line of $BRANCH above master: $unsigned"
    [ -z "$(git status --porcelain --untracked-files=normal)" ] || fail "uncommitted changes; commit every step first"
    git remote remove "$REMOTE_NAME" 2>/dev/null || true
    [ "$DRY_RUN" = "1" ] && { echo "DRY RUN: would push $BRANCH to origin"; return; }
    if [ "$SKIP_GATE" = "1" ]; then git push --no-verify -u origin "$BRANCH"; else git push -u origin "$BRANCH"; fi
}

do_land() {
    # run through the landing worktree's copy of this script (master has no copy until the fast-forward); the
    # step moves itself to the MAIN worktree through the shared git dir and operates there
    cd "$(git rev-parse --path-format=absolute --git-common-dir)/.." || fail "cannot find the main worktree"
    [ "$(git rev-parse --abbrev-ref HEAD)" = "master" ] || fail "the main worktree is not on master"
    git fetch --quiet origin
    [ "$(git rev-parse master)" = "$(git rev-parse origin/master)" ] || fail "local master differs from origin/master"
    git merge-base --is-ancestor master "origin/$BRANCH" || fail "master moved under the branch; merge master into $BRANCH in the landing worktree, re-run CI, then land again"
    [ "$DRY_RUN" = "1" ] && { echo "DRY RUN: would fast-forward master to origin/$BRANCH and push"; return; }
    git merge --ff-only "origin/$BRANCH" || fail "fast-forward failed"
    if [ "$SKIP_GATE" = "1" ]; then git push --no-verify origin master; else git push origin master; fi
}

case "$COMMAND" in
    prepare) do_prepare ;;
    merge) do_merge ;;
    commit) do_commit ;;
    push) do_push ;;
    land) do_land ;;
esac
