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
# The plan below is tailored to one specific change set: the M8b phase of the
# WebGPU work (the GPU SpMV family and Afforest WCC, branch feat/webgpu-spmv-wcc,
# fifteen commits). It is data, not machinery -- STEPS, SUBJECTS, PATHS and one body_*
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

# The M5b landing: the review fixes on top of the merge of master into feat/webgpu-layout-types,
# then the script itself.
STEPS=(peer prose ci tools)

declare -A SUBJECTS=(
    [peer]="fix(webgpu-graph-algorithms): require the layout release that ships the simulation seam"
    [prose]="docs(webgpu-graph-algorithms): correct what the M5b review found stale after the merge"
    [ci]="ci: say that the GPU lane builds layout through its real edge"
    [tools]="chore(tools): point the commit script at the M5b landing fixes"
)

declare -A PATHS=(
    [peer]="webgpu-graph-algorithms/package.json webgpu-graph-algorithms/test/build-output.test.ts"
    [prose]="webgpu-graph-algorithms/src/accelerator.ts webgpu-graph-algorithms/src/index.ts webgpu-graph-algorithms/src/types/algorithms.ts webgpu-graph-algorithms/src/types/layout.ts webgpu-graph-algorithms/test/types/conformance.test-d.ts webgpu-graph-algorithms/test/layouts/seed-cross.test.ts webgpu-graph-algorithms/CLAUDE.md design/graph-format/graph-format-design.md design/webgpu/webgpu-acceleration-plan.md"
    [ci]=".github/workflows/gpu.yml"
    [tools]="tools/commit-changes.sh"
)

# ---------------------------------------------------------------------------
# The message bodies. One function each, a quoted heredoc so backticks, `$` and
# `${...}` in the prose stay literal. Keep every line at or under 100 characters:
# that is commitlint's body-max-line-length, and it is checked before staging.
# ---------------------------------------------------------------------------

body_tools() {
    cat <<'BODY'
The step list now names the three fixes the M5b landing review produced, on top
of the merge of master into feat/webgpu-layout-types, then this script.
BODY
}

body_peer() {
    cat <<'BODY'
The published declarations of this package now import LayoutAccelerator and
LayoutSimulation from @graphty/layout, which only the layout release carrying
the simulation seam ships. The optional peer range still said ^1.0.0, so a
consumer holding any earlier layout would have met TS2305 inside node_modules.
The range is now ^1.7.0, the version the seam's feat commits will cut from the
published 1.6.2. The build-output test pins that range and the workspace:^
devDependency, which is what gives the tests layout's src/simulation.
BODY
}

body_prose() {
    cat <<'BODY'
Comments and design text that the merge of master left describing a state that
no longer exists: the layout types are real @graphty/layout declarations, not
mirrors, since W1b (accelerator.ts, index.ts, types/layout.ts,
types/algorithms.ts); the conformance type test is structural, so it catches a
mirror that drifts, not one copied verbatim; the seed.ts throw sites moved two
lines when its header grew; the graph-format design's 17.8 preamble and the
W1b review-log entry claimed the integration plan still said 17.6 after the
same commit corrected it; CLAUDE.md now says layout must be built before the
tests, not only graph-format; the D-NODE-FIRST row cites ci.yml steps by name
and records the widened no-subgroups pass; two missing blank lines separated
review-log entries again.
BODY
}

body_ci() {
    cat <<'BODY'
Since M5b removed the "!layout" negation, layout is a real dependency edge and
nx's ^build builds it on the T4 lane. The build step's name said the negations
kept layout out; the command was already right.
BODY
}

body_dispatch() {
    cat <<'BODY'
planGridStride was a throwing stub. It now plans
groups = min(ceil(items / wg), cap, the per-dimension limit), where cap is
maxGroups when given and otherwise 64 on a software adapter or 4096 on hardware,
and the kernel loops by stride = groups * wg. Zero items plan x: 0 with a null
stride. The cap is the one performance default in src/ that reads caps.software:
a grid-stride map is order-independent, so the result never depends on it.

src/types/algorithms.ts carries the P7 result types (GpuPageRankResult,
GpuScoresResult, GpuHitsResult, GpuLabelResult) and the GPU-side option records,
spelled member for member against the CPU seam types so M8a's import swap is
source-compatible. Nothing exports it yet; the barrel commit does.
BODY
}

body_residency() {
    cat <<'BODY'
view(s, "reverse") uploads the reverse CSR (rowPtr, colIdx, weights when the
snapshot has them) and view(s, "edgeList") the src / dst pair, both memoised on
the record like the degree views. packViews: true concatenates a view's arrays
into one buffer at 256-byte offsets, so a kernel binds one buffer three ways.

On an undirected snapshot the reverse view IS the forward core: the arena plan's
WeakMap key is the whole arena, so the case delegates to core() and uploads
nothing rather than copying the arrays under a second key.

A packed view is keyed on a record-owned object (packKeys), never on rev.rowPtr:
upload() memoises on the key without comparing byte lengths, so keying the packed
buffer on the same array as the plain view would hand back the wrong size.
BODY
}

body_kernels() {
    cat <<'BODY'
Seven kernel entries with their WGSL bodies: spmv-pull, pr-scale, pr-finalize,
wcc-link-sample, wcc-link-edges, wcc-compress and wcc-sample, plus the four
uniform blocks they read (SPMV_PARAMS, PR_PARAMS, PR_PARTIAL, WCC_PARAMS). They
widen the closed unions the registry tests pin: KernelId, KernelEntry.phase
(P7), the registry test's TABLE, the bind-group budget's STORAGE_COUNTS and the
override matrix (NORM_MODE, an expected-cases row for P7).

Storage-binding counts against design 8.10: spmv-pull 8, pr-scale 5,
pr-finalize 1, wcc-link-edges 3, wcc-compress 1, wcc-sample 2; wcc-link-sample,
absent from 8.10, is the four graph slots plus comp (5). The WCC changed flag is
the word at comp[flagIndex], so the link kernels bind three buffers and no
separate flag buffer is reset between rounds.

These are the package's first atomics: array<atomic<u32>>, atomicLoad,
atomicStore and atomicCompareExchangeWeak in a bounded link loop.

The pull kernel keeps its Kahan compensation across the sentinel branch with a
select() rather than an assignment inside the branch: both Tint and the NVIDIA
compiler folded the assigned form to a plain f32 sum. Measured on hub10k, one
pull gives 5028.3833 (the f32 Kahan emulation, bitwise) on both adapters where
the folded form gave 5028.3872.
BODY
}

body_spmv() {
    cat <<'BODY'
prepareSpmvPull plans and records y = A^T xNorm over a reverse core, one thread
per row, xNorm pre-scaled by the caller (PageRank divides by the out-weight sum
before the pull, so the kernel never divides). The perm slot is bound and
USE_PERM is false: the in-degree tiers remain a P4 deliverable, and
segmentedReduce still throws E_UNSUPPORTED for any non-null tiers.

It is its own kernel rather than a segmentedReduce VALUE snippet: the snippet
vocabulary is row, arc, nbr, weight, v, checked textually before compose, so a
snippet can never read xNorm[nbr]; and design 8.10 already gives spmvPull an
eight-binding row that a five-binding snippet variant cannot have.

core-shape.ts lifts rowCountOf and assertNotWindowed out of segmented-reduce.ts
(every existing error detail stays byte-identical), adds arcCountOf, and
coreOfView, the one ViewBinding -> CoreBinding adapter of the phase, which
rejects an arcCount that disagrees with the colIdx binding's size.

scope.ts is the per-call scratch scope: a Lease and a UniformRing over a context
that one dispose() releases.

The f64 oracle and the differential suite land here; the cross-adapter leg reads
noise fixtures that arrive with the gate record.
BODY
}

body_pagerank() {
    cat <<'BODY'
pageRank and personalizedPageRank run pr-scale, spmv-pull and pr-finalize in
batches of eight iterations with one readback per batch, on NetworkX semantics
against an f64 oracle of the same semantics.

The ping-pong is two buffers through two cached bind groups, never one buffer
with two ranges: Kernel.bind caches by buffer, offset and size, so two buffers
alternate exactly as two halves would, and the pool's size classes make the
one-buffer form never smaller. The out-weight sum is per-call Lease scratch
rather than a residency entry: GraphResidency.array keys on a CPU typed array
and a device-computed sum has none.

Convergence of iteration i - 1 is observed during dispatch i, so
firstConvergedIteration is recorded one late and reported as iteration - 1.
When the oracle converges exactly at maxIterations the device reports
converged: false; iterations agree within the one the design allows.

Every batch reads the iterate back with its header, so a second mapAsync after
the loop is not needed. The browser demo gains a Run PageRank control that runs
the device PageRank over the resident snapshot, checks the f32 scores against
the f64 oracle, and colours and sizes the nodes by score.
BODY
}

body_spectral() {
    cat <<'BODY'
power-iteration.ts is the shared driver: pull, normalise on the device through a
reduce into partials[0].norm, batch, read back. hits, eigenvectorCentrality and
katzCentrality are three configurations of it over the same spmv-pull kernel,
so the three stay batchable and no norm is computed on the host.

HITS runs two interleaved chains over a three-buffer ring (the config's
alternate flag and the run's previous slot): the design's single-adjacency form
iterates the dominant eigenvector of A, not the A A^T vector HITS defines, and
the CPU package updates both vectors from the previous iterate. Two runs and two
mapAsync remain.

The batch loop is the one duplicated loop between pagerank.ts and this driver;
PageRank's finalize step differs enough that sharing it would cost a third
abstraction.
BODY
}

body_wcc() {
    cat <<'BODY'
connectedComponents runs Afforest on the device: two link-sample rounds over
the first neighbours, a compress, a 1,024-word sample read back to find the
giant component on the host, then one link round over every edge that skips the
giant, and a final compress. The host loop stops when the changed flag reads 0.

The labels come back through renumberPartition, so the result is a dense
partition in first-seen order. E_PARTITION is not added to the pass-through
codes: a label that is still INVALID_INDEX after the last compress means the
kernel left a node unlabelled, which is E_VALIDATION, not a caller error.

No dedupe is built. Design 8.3 describes Afforest with a CAS link, a
pointer-jumping compress and an each-edge-once link round, and the link is
idempotent, so nothing needs deduplicating.
BODY
}

body_accelerator() {
    cat <<'BODY'
createAccelerator returns seven algorithm members (pageRank,
personalizedPageRank, hits, eigenvectorCentrality, katzCentrality,
connectedComponents and its alias weaklyConnectedComponents), each
ctx.assertReady() then a delegation. GpuAccelerator declares them non-optional.
Never a throwing stub: the CPU dispatchers test `acc.method !== undefined` and
route to the CPU when a member is absent, so a stub would be a silent wrong
answer.

The barrel exports the six functions and the nine P7 types; test/index.test.ts
moves them out of NEVER_EXPORTED in the same commit, because the barrel test
fails otherwise.

AlgorithmAccelerator stays a structural mirror of the CPU seam, so M8b lands
before M8a and M8a's import type swap is source-compatible.
BODY
}

body_bench() {
    cat <<'BODY'
Two groups: pagerank (T-8, 100 iterations at 100k / 1M and 1M / 10M) and wcc
(T-9, wall end to end including the upload and the label readback). run.ts
registers both and skips the bare `--` pnpm forwards ahead of the group names.

pagerank runs with tolerance: 0 so all 100 iterations run with the convergence
readback every eight: at the NetworkX tolerance of 1e-6 the seeded G(n, m) input
converges from the uniform start in one to four iterations, which would time one
pull and call it a hundred.
BODY
}

body_baseline() {
    cat <<'BODY'
nvidia-lovelace-driver580 gains one session carrying the five groups. Measured
on the RTX 4070 SUPER, medians of five runs:

T-8 PageRank 100 iterations, 100k / 1M: 17.204 ms (target 150 ms, met);
1M / 10M: 198.645 ms (target 1.5 s, met).

T-9 WCC 1M / 10M: 145.970 ms against a 100 ms target, MISSED. The row is wall
end to end from a released core, so it carries the 164 MB upload that T-1 alone
times at 125.7 ms; with the core resident the same call takes 11-16 ms. The
target is below the upload it includes, an owner decision recorded in G7.

The gpu-linux-t4 session is appended once the labelled PR's GPU lane has run;
the README's Performance table carries the new rows.
BODY
}

body_sabotage() {
    cat <<'BODY'
Eighteen mutations, three per P7 kernel except wcc-sample, which is
SABOTAGE_EXEMPT: its readback is a host-side mode over a 1,024-word sample and
the WCC result is identical whichever component the sample nominates, so no
mutation of it can change a label. SABOTAGE_PHASES gains P7 and the coverage
test asserts the exempt set.

Two check-set helpers (spmvWorstFactor / pageRankWorstFactor, wccWorstFactor)
measure each mutant against the oracle; the two suites assert every mutant is
caught. The browser smoke runs pageRank and connectedComponents on karate under
Playwright against the same oracles.
test/limits/pagerank-1m.test.ts is the first node-limits test: the T-8 fixture
at 1M nodes, which the GPU lane runs and the default lane never selects.
BODY
}

body_ci() {
    cat <<'BODY'
pr-scale and pr-finalize declare needs: ["subgroups"] (they call wg_reduce_vec4)
and their tests live under test/algorithms, so without that path the twin pass
never exercised the PageRank reduction on a device without the feature.
BODY
}

body_decisions() {
    cat <<'BODY'
Five records for the departures the M8b plan takes from the WebGPU design:
spmvPull is its own kernel (the snippet vocabulary cannot read xNorm[nbr]);
it ships the thread-per-row tier only (the tiers are P4's); Afforest needs no
dedupe (its link is idempotent); outWeightSum is per-call scratch (the
residency keys on a CPU array); and the PageRank ping-pong is two buffers
(bindable either way; the one-buffer form saves nothing and costs an offset).

The decisions index gains the five rows, design/README.md the file counts, and
the webgpu index a row for the plan. The plan's DEP-M8B-G row and PD-7 block
are corrected in place: HEAD said Kernel.bind rejects rankIn / rankOut on one
buffer, but those slots are never on the same kernel, so the argument rests on
the size classes and the offset cost instead.
BODY
}

body_g7() {
    cat <<'BODY'
docs/decisions/G7.md records the gate measured on the dev box: every item green
on NVIDIA-Dawn, lavapipe and Chromium, with two items open for the owner -- the
gpu-linux-t4 rows, which need the labelled PR's GPU lane, and the T-9 target,
which the 1M / 10M row misses because it includes the 164 MB upload.

The noise-floor row for spmv-pull lands with the two random1k fixtures (mesa
software and NVIDIA Lovelace, Node) in the same commit: noiseFloorFor throws on
an unknown id, so a fixture without its tolerance row turns the cross-adapter
leg red on every adapter.

CLAUDE.md's kernel list and "what exists" section gain the seven P7 kernels,
the six algorithms and the widened no-subgroups twin.
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
