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
# The plan below is tailored to one specific change set: the M8a phase of the
# WebGPU work (the graph-format bridge, the indexed ports and the accelerator seam,
# branch feat/algorithms-indexed-seam, nine commits). It is data, not machinery --
# STEPS, SUBJECTS, PATHS and one body_*
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
# One entry per commit, in the order they are made. The order is a build order:
# the dependency before the code that imports it, the library before the app, the
# shell before the deletion of the shell it supersedes, tooling last.
#
# PATHS entries are space-separated pathspecs (no path in this repository has a
# space in it, so the word splitting below is deliberate). A directory pathspec
# takes everything under it, which is what makes the 134-file shell one entry --
# ignored files under it (the __screenshots__ directories) are not added, because
# `git add` without -f leaves ignored paths alone and the preview below uses
# `git ls-files --others --exclude-standard`, which counts the same set.
# ---------------------------------------------------------------------------

# The M8a phase: the graph-format bridge (A1), the first six indexed ports, the accelerator seam,
# the GPU package's W1b algorithms half, the records, then the script itself.
STEPS=(deps bridge ports betweenness seam decisions w1b gate tools)

declare -A SUBJECTS=(
    [deps]="build(algorithms): take @graphty/graph-format as a workspace dependency and a caret peer"
    [bridge]="feat(algorithms): convert a legacy Graph to a graph-format snapshot with a mutation counter"
    [ports]="feat(algorithms): port six algorithms to graph-format snapshots under the indexed namespace"
    [betweenness]="feat(algorithms): express sampled betweenness on the shared option type"
    [seam]="feat(algorithms): add the accelerator seam and the accelerated() dispatcher"
    [decisions]="docs: record the A1 ordering and the PageRankOptions shadowing"
    [w1b]="feat(webgpu-graph-algorithms)!: import the real AlgorithmAccelerator and retire CpuAlgorithmOptions"
    [gate]="docs(webgpu-graph-algorithms): record the algorithms slice of the G6 gate"
    [tools]="chore(tools): point the commit script at the M8a phase"
)

declare -A PATHS=(
    [deps]="algorithms/package.json algorithms/scripts/build-bundle.js algorithms/scripts/build-gh-pages.js algorithms/vite-plugin-algorithms-redirect.js pnpm-lock.yaml algorithms/test/unit/indexed/package-wiring.test.ts"
    [bridge]="algorithms/src/core/graph.ts algorithms/src/indexed/to-snapshot.ts algorithms/test/unit/indexed/to-snapshot.test.ts algorithms/test/helpers/snapshot-differential.ts algorithms/test/unit/indexed/to-snapshot-differential.test.ts"
    [ports]="algorithms/src/indexed/structures algorithms/src/indexed/bfs.ts algorithms/src/indexed/dijkstra.ts algorithms/src/indexed/pagerank.ts algorithms/src/indexed/components.ts algorithms/src/indexed/mst.ts algorithms/src/indexed/common-neighbors.ts algorithms/src/indexed/index.ts algorithms/test/unit/indexed/structures.test.ts algorithms/test/unit/indexed/bfs.test.ts algorithms/test/unit/indexed/dijkstra.test.ts algorithms/test/unit/indexed/pagerank.test.ts algorithms/test/unit/indexed/components.test.ts algorithms/test/unit/indexed/mst.test.ts algorithms/test/unit/indexed/common-neighbors.test.ts"
    [betweenness]="algorithms/src/algorithms/centrality/betweenness.ts algorithms/test/unit/indexed/betweenness-options.test.ts"
    [seam]="algorithms/src/indexed/accelerator.ts algorithms/src/index.ts algorithms/project.json algorithms/tsconfig.typecheck.json algorithms/test/types algorithms/test/unit/indexed/accelerated.test.ts algorithms/scripts/bundle-types.js knip.config.ts package.json"
    [decisions]="design/decisions/2026-09-19-a1-lands-inside-m8a.md design/decisions/2026-09-19-pagerank-options-shadowing.md design/decisions/README.md design/webgpu/README.md design/README.md"
    [w1b]="webgpu-graph-algorithms/package.json webgpu-graph-algorithms/project.json webgpu-graph-algorithms/src/index.ts webgpu-graph-algorithms/src/accelerator.ts webgpu-graph-algorithms/src/types/algorithms.ts webgpu-graph-algorithms/src/types/accelerator.ts webgpu-graph-algorithms/test/types/conformance.test-d.ts webgpu-graph-algorithms/test/types/public-api.test-d.ts webgpu-graph-algorithms/tsconfig.json webgpu-graph-algorithms/tsconfig.strict-consumer.json"
    [gate]="webgpu-graph-algorithms/docs/decisions/G6-algorithms.md"
    [tools]="tools/commit-changes.sh"
)

# ---------------------------------------------------------------------------
# The message bodies. One function each, a quoted heredoc so backticks, `$` and
# `${...}` in the prose stay literal. Keep every line at or under 100 characters:
# that is commitlint's body-max-line-length, and it is checked before staging.
# ---------------------------------------------------------------------------

body_deps() {
    cat <<'BODY'
algorithms enters the format's consumer closure: @graphty/graph-format is a
workspace:^ dependency and a ^1.0.0 peer, so nx affected now builds graph-format
on every algorithms-touching PR, and hosts.yml runs because pnpm-lock.yaml
changed. Resolution goes through node_modules to graph-format/dist, as layout's
does: algorithms' tsc EMITS, and a sources paths entry would move its inferred
rootDir.

dist/algorithms.js now carries a bare @graphty/graph-format specifier, which is
right for the npm entry (an app installing the format directly must not ship it
twice) and wrong for a browser. The examples and the gh-pages build therefore
move to a second, self-contained dist/algorithms.standalone.js; nothing under
examples/ changes because the copied file keeps its name.

The lockfile also carries the GPU package's side of this phase: its
@graphty/algorithms entry moves from an auto-installed ^1.0.0 registry peer to
the workspace:^ devDependency that the W1b commit below declares. One file, one
commit; pnpm install --frozen-lockfile is consistent again at that commit.
BODY
}

body_bridge() {
    cat <<'BODY'
Graph gains mutationCount, a monotone counter bumped by addNode (of a new id),
removeNode, addEdge, removeEdge and clear, and never reset: a reset could hand a
stale cache entry a matching key. toSnapshot(graph) freezes a legacy Graph into
a graph-format snapshot with weightDtype "f64", memoised on
(graph, mutationCount) in a WeakMap, so a mutation replaces the cached snapshot
and a read never rebuilds it. No existing signature or result shape moves.

The differential harness (test/helpers/snapshot-differential.ts) converts every
fixture of the corpus and compares neighbour sets and the edge multiset against
the legacy Graph. It deliberately does NOT compare algorithm results: that
waits for A2's widening, when the ports have something to differ from.

Graph.edges() also stops yielding an undirected edge twice when its ids mix
strings and numbers. The old mirror skip was `source > target`, and a string
never compares greater than a number, so both sides were yielded and toSnapshot
froze duplicate arcs for two corpus fixtures. Ids of one type still compare by
value; ids of different types compare by type name. The A1 decision record
carries the departure and its reversal.
BODY
}

body_ports() {
    cat <<'BODY'
The six ports graph-format design 14.2 names, under src/indexed/ and exported as
the `indexed` namespace: breadthFirstSearch, dijkstra (with the walkPredArcs /
walkPredEdges predecessor walk), pageRank, connectedComponents, kruskalMST and
commonNeighborsScore. Four are transcribed from the design's own code; Ports 4
and 5 (components, MST) are specified there in prose and designed in the plan
(DEP-8A-D, DEP-8A-H). Each takes a GraphSnapshot or an AdjacencyView first and
returns typed arrays; each test checks the port against its legacy counterpart
at the stated tolerance.

src/indexed/structures/ holds their index-keyed helpers: IntUnionFind,
IndexedMinHeap and arcSourceIn. The legacy NodeId-keyed union-find and
priority-queue stay exactly as they are until 2.0.

The departures from the design's text: DEP-8A-C, DEP-8A-D and DEP-8A-H, each
recorded in the plan's section 0.5. No legacy function's first parameter has
widened: the widening is A2's and waits.
BODY
}

body_betweenness() {
    cat <<'BODY'
BetweennessCentralityOptions gains `sources` (node indices to sample from) and
`k` (how many to draw). They are node INDICES and only mean something against a
snapshot, so the three legacy Graph-taking entry points throw when either is
set rather than silently running the exact all-sources computation a thousand
times too slowly. No code that compiled before could reach the guard.

The whole interface moves to one `readonly ... | undefined` style because the
GPU package compiles it a second time under exactOptionalPropertyTypes, where
`sources?: T` and `sources?: T | undefined` are different types. No existing
member's meaning changed.
BODY
}

body_seam() {
    cat <<'BODY'
accelerated(acc) is the ONE injection spelling (design 9.2, restated in the M8a
deliverables cell of the integration plan): a dispatcher object owned by this
package whose every method is
`acc?.x !== undefined ? acc.x(s, ...) : Promise.resolve(indexed.x(s, ...))`.
It carries the six methods whose indexed.* ports exist and grows with each later
port. sssp is decorated with pathTo / pathEdges because the GPU package cannot
attach them itself. There is no try/catch: a throwing accelerator method
propagates unchanged, and acc === null runs the CPU port.

src/indexed/accelerator.ts declares the *ResultLike shapes, AlgorithmAccelerator
(every method optional, GraphSnapshot in) and AcceleratedAlgorithms. The root
barrel exports them flat, so the GPU package can write
`import type { AlgorithmAccelerator } from "@graphty/algorithms"`, and exports
the ports as the `indexed` namespace because five of them collide by name with
the legacy functions. The indexed PageRankOptions is aliased
IndexedPageRankOptions: the flat name is taken twice already, and the shadowing
comment in the barrel says which one pageRank() actually takes.

The fake-accelerator tests cover delegation, the CPU path, the decoration and
the propagated throw. The lint script gains `tsc -p tsconfig.typecheck.json`,
which compiles test/types/accelerator.test-d.ts; project.json's lint target
delegates to the npm script so the two cannot drift.

scripts/bundle-types.js wrote a hand-copied mirror of src/index.ts that lacked
the whole new surface, and `npm run build:bundle` overwrote the package's types
entry with it. It is now a single `export * from './src/index'`.

knip: the algorithms entry list gains the type tests, and the root lint:knip
runs with --no-gitignore. knip stops reading ancestor .gitignore files only at a
.git DIRECTORY, and a worktree's .git is a file, so from a worktree under
.worktrees/ it also read the main checkout's unanchored `.worktrees/` pattern,
dropped every package.json-derived entry and reported the tree as dead code.
The scratch directories that .gitignore hid are listed in the config instead.
BODY
}

body_decisions() {
    cat <<'BODY'
Two decision records. A1 lands inside phase M8a together with the first six
indexed ports rather than as its own branch, as graph-format design 14.6 had it:
the harness commit precedes every port, so a bisect still separates a
conversion bug from a port bug, and the alternative was that M6 and M7 both
wait behind a branch nothing consumes. The record also carries the Graph.edges()
mirror-skip departure and how to reverse it.

The root barrel's explicit PageRankOptions re-export shadows the one pageRank()
actually takes (`alpha` there, `dampingFactor` here); neither changes during
the dual-API window, the indexed one is exported as IndexedPageRankOptions, and
the shadow goes at 2.0.

The three indexes gain their rows: design/decisions/README.md, the webgpu
directory's README (the M8a plan file) and design/README.md's file counts.
BODY
}

body_w1b() {
    cat <<'BODY'
The D27 mirrors of the algorithms half are deleted now that A2's first commit
exists: src/types/accelerator.ts imports AlgorithmAccelerator, the *ResultLike
shapes, BetweennessAcceleratorOptions and HitsOptionsLike from
@graphty/algorithms by `import type` and re-exports them, so the public surface
is unchanged except for CpuAlgorithmOptions, which is gone.

BREAKING CHANGE: CpuAlgorithmOptions is no longer exported. The accelerator
methods' option parameters are now the CPU package's own types
(IndexedPageRankOptions, HitsOptionsLike, BetweennessAcceleratorOptions).

test/types/conformance.test-d.ts gains the reverse compile design G10 names:
createAccelerator(ctx) satisfies the REAL AlgorithmAccelerator, the re-exports
are the algorithms declarations by identity, and the CPU dispatcher accepts this
package's accelerator. public-api.test-d.ts pins the two new re-exports.

@graphty/algorithms becomes a workspace:^ devDependency (the optional peer stays
as it is), both tsconfigs map it to algorithms/dist/algorithms.d.ts, and the
last implicitDependencies negation goes from project.json: nx now sees the
algorithms edge, and nx release will patch-bump this package on every
algorithms release.
BODY
}

body_gate() {
    cat <<'BODY'
docs/decisions/G6-algorithms.md records the algorithms slice of the G6 gate as
measured on the dev box: the 9.2 deliverables mapped to their evidence, the A1
gate of graph-format design 14.6, the six ports against their legacy
counterparts, the coverage table, and the findings. Two findings needed a
decision and both are closed: the Graph.edges() departure is in the A1 decision
record, and the knip report from a nested worktree was a false positive with a
root cause and a fix in the tree. The lanes, the commit hashes and the
sign-off are the owner's.
BODY
}

body_tools() {
    cat <<'BODY'
The step list now names the nine commits of phase M8a: the graph-format
dependency, the A1 bridge, the six ports, the betweenness options, the
accelerator seam, the two decision records, the GPU package's W1b algorithms
half, the G6 gate record, then this script.
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
VALID_SCOPES="graph-format graph-io webgpu-graph-algorithms algorithms layout graphty-element
              compact-mantine remote-logger graphty gpu-3d-force-layout deps release ci docs tools workspace"
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
