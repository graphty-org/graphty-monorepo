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
# The plan below is tailored to one specific change set: the P4 phase of the
# WebGPU work (the grid pyramid and the degree tiers, branch feat/gpu-p4,
# eighteen commits). It is data, not machinery -- STEPS, SUBJECTS, PATHS and
# one body_* function each. Re-point it at the next change set rather than
# reusing the messages, and read the diff before you write a message, not a
# summary of it.
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

# The P4 phase: one commit per P4 task in the plan's execution order (the four primitives, the
# tiers, the attraction gather, windowed execution, the grid build, the pyramid, the grid tier, its
# parity and sabotage suites, the two other models, calibration, the node-limits files, the decision
# records, the gate record), then the script itself.
STEPS=(indirect scan histogram radix tiers attraction windowed grid pyramid repulsion parity sabotage law calibrate limits decisions gate tools)

declare -A SUBJECTS=(
    [indirect]="feat(webgpu-graph-algorithms): add planIndirect, the indirect finalize kernel and dispatchIndirect"
    [scan]="feat(webgpu-graph-algorithms): add the exclusiveScan primitive"
    [histogram]="feat(webgpu-graph-algorithms): add the histogram and counting-sort primitives"
    [radix]="feat(webgpu-graph-algorithms): add the stable LSD radixSort primitive"
    [tiers]="feat(webgpu-graph-algorithms): add the mid and high degree tiers of the row-walking kernels"
    [attraction]="feat(webgpu-graph-algorithms): run the attraction kernel over the degree tiers in every layout model"
    [windowed]="feat(webgpu-graph-algorithms): execute windowed uploads for degree and segmentedReduce"
    [grid]="feat(webgpu-graph-algorithms): add the grid spec, the cell keys and the sorted cell ranges"
    [pyramid]="feat(webgpu-graph-algorithms): add the grid centroids, the hub-cell path and the pyramid"
    [repulsion]="feat(webgpu-graph-algorithms): add the grid repulsion tier of ForceAtlas2"
    [parity]="test(webgpu-graph-algorithms): add the grid parity suites and record their noise floors"
    [sabotage]="test(webgpu-graph-algorithms): add the grid sabotage suite and the settle and determinism checks"
    [law]="feat(webgpu-graph-algorithms): give the FR and spring-electrical models the grid tier through LAW"
    [calibrate]="feat(webgpu-graph-algorithms): add calibrateLayout, layout-grid and the crossover re-check"
    [limits]="test(webgpu-graph-algorithms): add the six node-limits files of the G4 gate"
    [decisions]="docs: record the P4 design decisions beside the WebGPU design"
    [gate]="docs(webgpu-graph-algorithms): close the G4 gate record"
    [tools]="chore(tools): point the commit script at the P4 phase"
)

W=webgpu-graph-algorithms
NOISE=$W/test/fixtures/noise

declare -A PATHS=(
    [indirect]="$W/src/kernel/dispatch.ts $W/src/kernel/kernel.ts $W/src/kernels.ts $W/src/wgsl/indirect-finalize.wgsl.ts $W/test/helpers/indirect.ts $W/test/helpers/override-matrix.ts $W/test/helpers/sabotage.ts $W/test/kernel/dispatch.test.ts $W/test/kernel/indirect.test.ts $W/test/kernel/registry.test.ts $W/test/kernel/bind-group-budget.test.ts $W/test/kernel/wgsl-compile.test.ts $W/test/sabotage/indirect.test.ts $NOISE/indirect-finalize-counts9-nvidia-lovelace-node.json $NOISE/indirect-finalize-counts9-mesa-software-node.json"
    [scan]="$W/src/wgsl/scan-block.wgsl.ts $W/src/wgsl/scan-add.wgsl.ts $W/src/primitives/scan.ts $W/test/oracle/scan.ts $W/test/oracle/oracles.test.ts $W/test/helpers/scan.ts $W/test/primitives/scan.test.ts $W/test/sabotage/scan.test.ts $NOISE/scan-block-random1m-nvidia-lovelace-node.json $NOISE/scan-block-random1m-mesa-software-node.json"
    [histogram]="$W/src/wgsl/histogram.wgsl.ts $W/src/wgsl/counting-scatter.wgsl.ts $W/src/primitives/histogram.ts $W/test/oracle/histogram.ts $W/test/helpers/histogram.ts $W/test/primitives/histogram.test.ts $W/test/sabotage/histogram.test.ts $NOISE/histogram-random1m-4096-nvidia-lovelace-node.json $NOISE/histogram-random1m-4096-mesa-software-node.json $NOISE/counting-scatter-random1m-4096-keys-nvidia-lovelace-node.json $NOISE/counting-scatter-random1m-4096-keys-mesa-software-node.json"
    [radix]="$W/src/kernel/prelude.ts $W/src/wgsl/radix-hist.wgsl.ts $W/src/wgsl/radix-scatter.wgsl.ts $W/src/primitives/radix-sort.ts $W/src/constants.ts $W/test/oracle/radix-sort.ts $W/test/helpers/radix-sort.ts $W/test/primitives/radix-sort.test.ts $W/test/sabotage/radix-sort.test.ts $NOISE/radix-hist-random1m-24-table-nvidia-lovelace-node.json $NOISE/radix-hist-random1m-24-table-mesa-software-node.json $NOISE/radix-scatter-random1m-24-nvidia-lovelace-node.json $NOISE/radix-scatter-random1m-24-mesa-software-node.json"
    [tiers]="$W/src/wgsl/segmented-reduce.wgsl.ts $W/src/wgsl/fa2-attraction.wgsl.ts $W/src/wgsl/spmv-pull.wgsl.ts $W/src/primitives/core-shape.ts $W/src/primitives/segmented-reduce.ts $W/src/primitives/spmv.ts $W/src/layouts/forceatlas2.ts $W/src/layouts/fruchterman-reingold.ts $W/src/layouts/spring-electrical.ts $W/test/helpers/graphs.ts $W/test/helpers/segmented-reduce.ts $W/test/helpers/spmv.ts $W/test/kernel/wgsl.test.ts $W/test/layouts/fa2-options.test.ts $W/test/primitives/segmented-reduce.test.ts $W/test/primitives/spmv.test.ts $W/test/primitives/tiers.test.ts $W/test/sabotage/tiers.test.ts $NOISE/segmented-reduce-hub10k-tiers-nvidia-lovelace-node.json $NOISE/segmented-reduce-hub10k-tiers-mesa-software-node.json $NOISE/segmented-reduce-hub10k-tiers-oracle-f64.json $NOISE/spmv-pull-hub10k-tiers-nvidia-lovelace-node.json $NOISE/spmv-pull-hub10k-tiers-mesa-software-node.json $NOISE/spmv-pull-hub10k-tiers-oracle-f64.json"
    [attraction]="$W/src/layouts/force-simulation.ts $W/src/layouts/model-common.ts $W/test/helpers/fa2-parity.ts $W/test/helpers/attraction-check.ts $W/test/layouts/tiers-inspect.test.ts $W/test/layouts/attraction-windowed.test.ts $NOISE/fa2-attraction-hub10k-K2-tiers-nvidia-lovelace-node.json $NOISE/fa2-attraction-hub10k-K2-tiers-mesa-software-node.json $NOISE/fa2-attraction-hub10k-K2-tiers-oracle-f64.json"
    [windowed]="$W/src/memory/residency.ts $W/src/algorithms/degree.ts $W/src/algorithms/components.ts $W/src/algorithms/pagerank.ts $W/src/algorithms/power-iteration.ts $W/test/memory/windowed.test.ts $W/test/memory/residency.test.ts $W/test/algorithms/degree.test.ts $W/test/algorithms/components.test.ts $W/test/algorithms/pagerank.test.ts $W/test/algorithms/spectral.test.ts $W/test/helpers/degree-check.ts design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md"
    [grid]="$W/src/wgsl/grid-cell-key.wgsl.ts $W/src/primitives/grid.ts $W/test/oracle/grid.ts $W/test/helpers/grid.ts $W/test/primitives/grid.test.ts $W/test/sabotage/grid-build.test.ts $W/test/kernel/state-roundtrip.test.ts $W/test/device/constants.test.ts $NOISE/grid-cell-key-random20k-nvidia-lovelace-node.json $NOISE/grid-cell-key-random20k-mesa-software-node.json $NOISE/grid-cell-key-random20k-oracle-f64.json $NOISE/histogram-random20k-cellHist-nvidia-lovelace-node.json $NOISE/histogram-random20k-cellHist-mesa-software-node.json $NOISE/histogram-random20k-cellHist-oracle-f64.json $NOISE/scan-add-random20k-cellStart-nvidia-lovelace-node.json $NOISE/scan-add-random20k-cellStart-mesa-software-node.json $NOISE/scan-add-random20k-cellStart-oracle-f64.json"
    [pyramid]="$W/src/wgsl/grid-centroid.wgsl.ts $W/src/wgsl/grid-centroid-hub.wgsl.ts $W/src/wgsl/grid-downsample.wgsl.ts $W/src/primitives/grid-pyramid.ts $W/test/oracle/grid-pyramid.ts $W/test/helpers/grid-pyramid.ts $W/test/primitives/grid-pyramid.test.ts $W/test/sabotage/grid-pyramid.test.ts $NOISE/grid-downsample-random20k-L1-nvidia-lovelace-node.json $NOISE/grid-downsample-random20k-L1-mesa-software-node.json $NOISE/grid-downsample-random20k-L1-oracle-f64.json $NOISE/grid-centroid-hub-hubcell-L0-nvidia-lovelace-node.json $NOISE/grid-centroid-hub-hubcell-L0-mesa-software-node.json $NOISE/grid-centroid-hub-hubcell-L0-oracle-f64.json"
    [repulsion]="$W/src/wgsl/grid-far-field.wgsl.ts $W/src/wgsl/grid-near-field.wgsl.ts $W/src/wgsl/fa2-stats-finalize.wgsl.ts $W/src/layouts/repulsion-grid.ts $W/src/kernel/profiler.ts $W/test/kernel/profiler.test.ts $W/test/layouts/grid-behaviour.test.ts $W/test/layouts/grid-lifecycle.test.ts $W/test/layouts/force-simulation.test.ts $W/test/layouts/fr-lifecycle.test.ts $W/test/layouts/se-behaviour.test.ts"
    [parity]="$W/test/oracle/grid-field.ts $W/test/helpers/grid-parity.ts $W/test/layouts/grid-unbiased.test.ts $W/test/layouts/grid-inspect.test.ts $W/test/layouts/grid-twins.test.ts $W/test/layouts/grid-exact.test.ts $W/test/noise-floor.test.ts $W/benchmarks/results/noise-floor.json $NOISE/grid-centroid-random20k-pyramid-nvidia-lovelace-node.json $NOISE/grid-centroid-random20k-pyramid-mesa-software-node.json $NOISE/grid-centroid-random20k-pyramid-oracle-f64.json $NOISE/grid-far-field-random20k-far-nvidia-lovelace-node.json $NOISE/grid-far-field-random20k-far-mesa-software-node.json $NOISE/grid-far-field-random20k-far-oracle-f64.json $NOISE/grid-near-field-random20k-near-nvidia-lovelace-node.json $NOISE/grid-near-field-random20k-near-mesa-software-node.json $NOISE/grid-near-field-random20k-near-oracle-f64.json $NOISE/grid-near-field-random20k-near-nvidia-lovelace-node-no-subgroups.json $NOISE/grid-near-field-random20k-near-mesa-software-node-no-subgroups.json $NOISE/fa2-stats-finalize-random20k-K1-grid-nvidia-lovelace-node.json $NOISE/fa2-stats-finalize-random20k-K1-grid-mesa-software-node.json $NOISE/fa2-stats-finalize-random20k-K1-grid-oracle-f64.json $NOISE/fa2-stats-finalize-isolated-K1-grid-nvidia-lovelace-node.json $NOISE/fa2-stats-finalize-isolated-K1-grid-mesa-software-node.json $NOISE/fa2-stats-finalize-isolated-K1-grid-oracle-f64.json $NOISE/fa2-integrate-random20k-K5-grid-nvidia-lovelace-node.json $NOISE/fa2-integrate-random20k-K5-grid-mesa-software-node.json $NOISE/fa2-integrate-random20k-K5-grid-oracle-f64.json $NOISE/grid-centroid-hub-hubcell-L0-nvidia-lovelace-node-no-subgroups.json $NOISE/grid-centroid-hub-hubcell-L0-mesa-software-node-no-subgroups.json $NOISE/grid-exact-random20k-rms-nvidia-lovelace-node.json $NOISE/grid-exact-random20k-rms-mesa-software-node.json $NOISE/grid-exact-random20k-rms-oracle-f64.json $NOISE/grid-exact-random20k-p99-nvidia-lovelace-node.json $NOISE/grid-exact-random20k-p99-mesa-software-node.json $NOISE/grid-exact-random20k-p99-oracle-f64.json $NOISE/grid-expansion-random20k-spread200-nvidia-lovelace-node.json $NOISE/grid-expansion-random20k-spread200-mesa-software-node.json $NOISE/grid-expansion-random20k-spread200-oracle-f64.json $NOISE/grid-distributional-random20k-metrics200-nvidia-lovelace-node.json $NOISE/grid-distributional-random20k-metrics200-mesa-software-node.json $NOISE/grid-distributional-random20k-metrics200-oracle-f64.json $NOISE/grid-unbiased-hubcell-mean4096-nvidia-lovelace-node.json $NOISE/grid-unbiased-hubcell-mean4096-mesa-software-node.json $NOISE/grid-unbiased-hubcell-mean4096-oracle-f64.json $W/test/helpers/matchers.ts"
    [sabotage]="$W/test/sabotage/coverage.test.ts $W/test/sabotage/grid.test.ts $W/test/layouts/grid-settle.test.ts"
    [law]="$W/test/helpers/grid-law.ts $W/test/layouts/grid-law.test.ts $W/test/layouts/fr-options.test.ts $W/test/layouts/se-options.test.ts"
    [calibrate]="$W/src/layouts/calibrate.ts $W/src/types/layout.ts $W/src/index.ts $W/test/layouts/calibrate.test.ts $W/test/index.test.ts $W/test/types/public-api.test-d.ts $W/test/benchmarks.test.ts $W/test/browser/bench.test.ts $W/test/layouts/frame-loop.test.ts $W/benchmarks/layout-grid.bench.ts $W/benchmarks/layout-exact.bench.ts $W/benchmarks/layout-fr.bench.ts $W/benchmarks/run.ts $W/benchmarks/layout-run.ts $W/benchmarks/results/nvidia-lovelace-driver580.json $W/README.md"
    [limits]="$W/test/limits/binding-2gib.test.ts $W/test/limits/windowed-200mb.test.ts $W/test/limits/dispatch-2d-100m.test.ts $W/test/limits/oom-scope.test.ts $W/test/limits/vendor-features.test.ts $W/test/limits/layout-1m.test.ts $W/test/limits/README.md"
    [decisions]="design/decisions/2026-09-20-compact-lands-with-the-frontier-phase.md design/decisions/2026-09-20-windowed-execution-covers-degree-and-segmented-reduce.md design/decisions/2026-09-20-sort-scratch-is-model-owned.md design/decisions/2026-09-20-scan-has-no-subgroup-variant.md design/decisions/2026-09-20-far-field-levels-are-a-uniform.md design/decisions/2026-09-20-cell-histogram-is-zeroed-by-a-fill-dispatch.md design/decisions/2026-09-20-workgroup-row-tiers-fold-without-kahan.md design/decisions/README.md design/README.md"
    [gate]="$W/docs/decisions/G4.md $W/CLAUDE.md $W/test/browser/state-roundtrip.test.ts $W/test/memory/upload-plan.test.ts"
    [tools]="tools/commit-changes.sh"
)

# ---------------------------------------------------------------------------
# The message bodies. One function each, a quoted heredoc so backticks, `$` and
# `${...}` in the prose stay literal. Keep every line at or under 100 characters:
# that is commitlint's body-max-line-length, and it is checked before staging.
# ---------------------------------------------------------------------------

body_indirect() {
    cat <<'BODY'
The device-side dispatch of spec 5.4: planIndirect(count, wg, caps) is plan1d's
rule on a u32 count through the same grid() the other planners use, so the
host twin and the kernel cannot drift; the indirect-finalize kernel (one lane,
ceil without the u32 wrap, the 2D split above 65,535 workgroups) writes the
16-byte slot (x, y, 1, count) of an args buffer from a count another kernel
left in a storage word; Kernel.dispatchIndirect(pass, bound, args, slot)
records the same setPipeline / setBindGroup prefix as dispatch() and then
dispatchWorkgroupsIndirect at args.offset + 16 * slot, with a slot beyond the
binding rejected as E_INVALID_ARGUMENT. INDIRECT_ARGS_STRIDE is exported beside
it and IndirectParams (countIndex, wg, slot) is the kernel's uniform.

The kernel registry gains the "P4" phase and its first entry; the registry,
storage-count, compile-matrix and override-matrix tests gain their rows, and
the sabotage table its first three rows (the ceil dropped, the 2D split never
taken, a 12-byte slot stride). kernels.ts, sabotage.ts, override-matrix.ts and
the three registry-shaped tests are shared by every kernel commit of this
phase; they are claimed here, in the first commit that touches them, so the
later commits' rows in them land with this one.

indirect.test.ts runs the finalize against planIndirect bitwise over nine
counts, twice, fills 4M words through an indirect dispatch on slot 7 and a
count of 0 on slot 0 over a poisoned buffer in one pass, and covers the slot,
bound-kernel and offset errors; sabotage/indirect.test.ts measures every
mutant at factor Infinity. The counts9 noise fixtures were recorded on the RTX
4070 SUPER and on lavapipe and are bitwise identical.
BODY
}

body_scan() {
    cat <<'BODY'
exclusiveScan over u32 words: scan-block is a Hillis-Steele exclusive scan of
one workgroup-wide block that writes the block's total to a sums array, and
scan-add folds the scanned sums back into every block. prepareScan(scope)
returns a planner whose record(pass, src, count, out) validates the count and
both bindings before recording anything, builds the level list recursively
while a level has more than one block, dispatches scan-block bottom-up and
scan-add top-down (2 x levels - 1 dispatches, exposed as lastDispatches) and
returns the binding and index of the top level's one sums word, the grand
total. A count of 0 records nothing and returns a one-word scratch zeroed at
prepare time. There is no subgroup variant (the decision record of the docs
commit below says why).

The two entries take the registry's next rows; oracles.test.ts gains three
hand-computed scan cases, primitives/scan.test.ts the ladder 0 / 1 / 255 / 256
/ 257 / 4097 / 65537 / 2^20 (scaled on a software adapter), each run twice
with bitwise equality first and then against the sequential oracle, plus the
dispatch counts, the count-0 path and the argument errors. The six sabotage
rows all report Infinity on both adapters. The random1m noise fixtures were
recorded on the RTX 4070 SUPER and on lavapipe and are bitwise identical, as a
u32 scan must be.
BODY
}

body_histogram() {
    cat <<'BODY'
histogram and countingSortByKey, the two primitives the grid build sorts with
when determinism is off. The histogram kernel counts keys into bins with one
global atomicAdd per key (a fill of the bins runs first, so the count needs no
clearBuffer); counting-scatter places every key at outStart[key] plus an
atomically advanced cursor, so the sort is stable within a bin only by chance
and is the non-deterministic path. prepareHistogram and prepareCountingSort
return planners whose record() validates count, bins and every binding before
recording, chain histogram -> exclusiveScan -> fill -> scatter, and expose
lastDispatches.

The oracle is a sequential histogram and a stable counting sort; the primitive
suite runs 2^20 seeded keys over 4096 bins twice bitwise, a hot bucket over
1 / 256 / 4096 / 262,146 bins, the sort's start offsets bitwise with the index
array a permutation and the key sequence non-decreasing, the count-0 path and
the argument errors. The six sabotage rows (a plain store for the atomic, the
last key skipped, a bin off by one; the cursor not advanced, the start
ignored, the index off by one) all report Infinity. The four u32 noise
fixtures are bitwise identical across the two adapters.
BODY
}

body_radix() {
    cat <<'BODY'
radixSort, the stable LSD sort of (key, value) pairs the grid build orders its
cells with: 8 bits per pass, so bits 8 / 16 / 24 / 32 mean one to four passes.
radix-hist builds each workgroup's 256-bin digit histogram in workgroup memory
and stores it digit-major (hist[digit * groups + group]) so one exclusiveScan
over the table yields every (digit, group) offset at once; radix-scatter ranks
its block serially on lane 0 with a counter table -- 256 steps, deterministic,
no atomics -- and every lane writes at offsets[digit * groups + group] + rank.
prepareRadixSort(scope).record(pass, keys, vals, count, bits, scratch)
validates the width, the count, the four pair bindings and the histogram
scratch before recording, alternates the pairs per pass and returns the pair
holding the result (the scratch pair after an odd pass count); radixHistBytes
sizes the table. The bin count comes from a new RADIX_BINS constant. The WGSL
prelude (src/kernel/prelude.ts) interpolates it as RADIX_BINS and
RADIX_DIGIT_MASK and gains the grid constants GRID_HUB_CELL, GRID_EXTENT_FLOOR
and GRID_BBOX_MARGIN beside them. Its six adaptive-cooling lines (FA2_FLAG_ADAPTIVE,
FR_COOLING_STEP, FR_COOLING_PATIENCE) ride along unchanged: they are the lines
origin/master already carries (da33fa61), which this branch does not yet contain.

constants.ts is shared by the grid and calibration commits below and is
claimed here, so it also carries the grid geometry constants (GRID_MIN_SIDE,
GRID_COARSEST_SIDE, GRID_HUB_CELL, GRID_EXTENT_FLOOR, GRID_BBOX_MARGIN,
GRID_SORT_BITS) and the JSDoc of EXACT_MAX_NODES, which keeps 32768 by owner
decision G4-D1 although the crossover rule re-checked at G4 computes 1024
(the calibration commit records the measurement).

The oracle is a stable Array.sort on the masked key with the index as the
tie-break. The suite runs the ladder 0 .. 2^22 at every width twice with
bitwise equality first, all-equal, sorted and reverse-sorted keys, the
result-pair identity, the dispatch counts and the argument errors. The six
sabotage rows (a group-major table, the shift ignored, the last key uncounted;
the rank not advanced, values not permuted, group 0's offset for every group)
all report Infinity. The noise fixtures are bitwise identical across the two
adapters.
BODY
}

body_tiers() {
    cat <<'BODY'
The row-walking kernels -- segmented-reduce, the attraction kernel and
spmv-pull -- gain two degree tiers under a uniform TIER override: TIER 1 gives
a row of degree 32..1023 thirty-two lanes, WG / 32 rows per workgroup and a
five-step tree in workgroup memory (no subgroup builtin, so bitwise the same
on every subgroup size); TIER 2 gives a row of degree >= 1024 a whole
workgroup through the prelude's wg_reduce. The tier bodies are functions
called under the override, so every barrier is reached in uniform control
flow; the three entries declare needs: ["subgroups"] and get a twin.
prepareSegmentedReduce and prepareSpmvPull accept the tiers, compile only the
populated ones, dispatch TIER 2 over [0, hiEnd), TIER 1 over [hiEnd, midEnd)
and TIER 0 over [midEnd, n) with a params record each, and expose
lastDispatches. DegreeTiers and degreeTiersOf(view) move to core-shape.ts.

Fa2Params takes arcBase, arcEnd, accumulate, hiEnd and midEnd in the bytes of
the previous phase's padding, so no offset moves; SpmvParams.pad0 becomes
start. The three layout models write zeros / arcCount for the new fields; the
next commit is where they dispatch over the tiers. The compile-matrix pins
move (P2 148, P3 157, P7 69), the registry rows and block offsets follow, and
the attraction kernel's needs pin in fa2-options moves with them.

test/helpers/graphs.ts gains rmat14 and the ten positioned fixtures the grid
suites share (random20k, clumpy10 / 100 / 1000, line, polyline163, onecell1k,
onecell1025, outside5, hubcell). tiers.test.ts checks four fixtures against
the f64 oracle with the tier keys asserted, the twins in one process, the pull
over the in-degree tiers of hub10k and a directed R-MAT, and the rejections;
the twelve tier sabotage rows all measure >= 1.1e3x on both adapters; the two
E_UNSUPPORTED cases of the old suites became acceptance cases. The hub10k
noise fixtures were recorded on the RTX 4070 SUPER, on lavapipe and in f64.
BODY
}

body_attraction() {
    cat <<'BODY'
ForceAtlas2, Fruchterman-Reingold and the spring-electrical preset dispatch
the attraction kernel over the degree tiers of the snapshot's degreeOrder
view. ForceSimulation.load() reads the view's segmentOffsets on the CPU and,
only when a row of degree >= 32 exists, uploads the view and binds the
permutation; otherwise the rowPtr dummy stays bound with USE_PERM false, so
every low-degree fixture runs the pipelines it ran before. The recompile path
of setParams now passes the permutation too (it passed null, which would have
flipped USE_PERM off after a law change). model-common.ts holds the shared
bindAttraction / recordAttraction pair: TIER 0 always, TIER 1 when
[hiEnd, midEnd) is non-empty, TIER 2 when hiEnd > 0, dispatched 2, 1, 0; a
workgroup size under 32 with a permutation is E_UNSUPPORTED. Each model's
paramsFor writes hiEnd / midEnd from the offsets and its TIER 0 range as
[midEnd, n); the spec lists stay at the one TIER 0 attraction spec.

tiers-inspect.test.ts runs hub10k and rmat14, weighted and unweighted: every
stage bitwise twice, the attraction force within the analytic per-node bound
deg x 2^-22 (measured at 0.07-0.26 of the bound on both adapters), and the
pipeline keys exactly the tiers the degrees populate on all three models;
attraction-windowed.test.ts runs the TIER 0 kernel over hand-built 64-arc
windows of karate with poison tails and matches the one-dispatch result
bitwise on unsplit rows. Six attraction rows join the tier sabotage table
(1.8e3x to Infinity). Every committed FA2 / FR / spring noise fixture still
matches. The hub10k K2 fixtures were recorded on both adapters and in f64.
BODY
}

body_windowed() {
    cat <<'BODY'
A core whose arc arrays exceed the storage-binding limit is now uploaded as
the windows the upload planner already computed, instead of being refused:
residency.core() uploads colIdx, weights and arcToEdge as per-window buffer
ranges, keeps rowPtr and edgeToArc whole, and returns a CoreBinding with
plan "windowed", the window list and an arcBuffers record; windowBinding(core,
name, w) in core-shape.ts gives the binding of one window. degree runs a fill
of zeros then one accumulating dispatch per window over the window's rows;
segmentedReduce fills the identity (0, +max or -max) and dispatches per
window, the untiered dispatch over the window's rows and arcs, every tier
dispatch over its full tier range but folding only [w.start, nextWindow.start)
-- consecutive windows overlap by up to 63 arcs because the next one opens at
the aligned-down end of this one, and a tier dispatch visits every row, so
without that partition the overlap was folded twice (a mid-tier row measured
40 % high). The plan document's windowed-execution decision is amended to say
so; the same file also carries the hub-path correction of the pyramid commit
below (the finalize plans one workgroup per hub cell, not per WG cells).

spmvPull, PageRank, the power-iteration algorithms and connected components
keep refusing a windowed core, now through assertWholeCore in core-shape.ts
instead of re-throwing the residency's error, since the residency no longer
throws; their suites pin E_TOO_LARGE { path: "windowed", algorithm } on a
karate core forced windowed by a faked 256-byte limit, directed and
undirected (Katz over a directed graph walks the per-array reverse view and
completes).

windowed.test.ts covers the shapes at faked limits of 256 and 512 bytes, the
placements, the release and the memoisation; degree.test.ts runs the 1 MiB
faked-limit case (20,992 B on a software adapter) with a 300k-leaf hub row
spanning two or more windows, bitwise equal to outDegree() twice;
segmented-reduce.test.ts runs sum / min / max x weight over a 2048-node
windowedHub fixture with a 30k-arc hub row, untiered and tiered, at the
smallest limit its rowPtr fits. The accumulate-ignored sabotage row measures
2.28e46x on both adapters.
BODY
}

body_grid() {
    cat <<'BODY'
The first half of the grid build of spec 7.7. gridSpecFor(n, dim, tuning)
computes the geometry on the host: G = clamp(nextPow2(2 n^(1/dim)), 8,
floorPow2(gridMax)) (a gridMax that is not a power of two rounds down),
levels = log2(G / 4) + 1, the per-level cell offsets with the outside
pseudo-cell after level 0, and gridPyramidBytes at 16 bytes per cell (38.3 MB
at the 3D cap). The grid-cell-key kernel keys a node by floor((p - gridMin) *
invCellSize) with the clamp before the floor and the outside pseudo-cell for a
node beyond the box, and writes cellVal[i] = i; a multiply is correctly
rounded on every adapter where a division is not, so an f64 oracle reading the
GPU's gridMin / invCellSize reproduces every key bitwise (the nine noise
fixtures -- keys, cell histogram, cell starts -- are identical on the RTX 4070
SUPER, on lavapipe and in f64). Fa2State gains invCellSize (f32 @128) in the
reserved bytes; the state round-trip pins follow.

prepareGridBuild(scope, spec) returns a planner: bind(bindings) takes the
sort's scratch from the scope once (the buffers are model-owned, per the
decision record of the docs commit), record(pass, n, paramsOffset, upTo?)
runs cell keys -> radixSort (24 bits) -> histogram over cells + 2 ->
exclusiveScan into cellStart on the deterministic path, or cell keys ->
countingSortByKey otherwise, and rejects n outside [1, capacity].

constants.test.ts pins the six new grid constants; it is shared with the
calibration commit, so it also carries that commit's EXACT_MAX_NODES pin. The
suite runs six fixtures in 2D and 3D against the oracle and twice bitwise,
the counting path, the empty-cell fraction of clumpy10, the upTo stops, n = 0
and record-before-bind; the three cell-key sabotage rows report Infinity.
BODY
}

body_pyramid() {
    cat <<'BODY'
The second half of the grid build: the level-0 centroids and the pyramid
above them. grid-centroid is thread-per-cell over cells + 1 and sums a cell
serially; a cell with more than GRID_HUB_CELL entries is appended to a hub
list with an atomic counter instead, and atomicMax records the largest
population so the stats finalize can report it next iteration. The
indirect-finalize kernel then plans one workgroup per hub cell (wg = 1 in
IndirectParams: the finalize counts items, and a hub cell is one item), and
grid-centroid-hub sums each hub cell with a workgroup-strided loop and the
prelude's vec4 reduction, guarding its work by h < hubCount instead of
returning early so the reduction stays in uniform control flow; it needs
subgroups and has a twin. grid-downsample folds 2^dim children into each
parent cell of the coarser level with GridLevelParams written once per level.
preparePyramid(scope, spec) binds all four and record(pass, paramsOffset,
upTo?) dispatches centroid, finalize, the indirect hub pass and one
downsample per coarser level (3 + levels - 1 dispatches).

The f64 oracle computes every level, the hub list, the occupancy max and the
analytic forward-error bound of every value; the suite runs seven fixtures in
2D and 3D twice bitwise and within the bound with both counters checked, the
pseudo-cell of outside5, the in-process subgroup twins on hubcell, the upTo
dispatch counts and record-before-bind. The nine sabotage rows measure 25x to
Infinity on both adapters. The level-1 and hub-cell noise fixtures were
recorded on the RTX 4070 SUPER, on lavapipe and in f64.
BODY
}

body_repulsion() {
    cat <<'BODY'
ForceAtlas2 runs its repulsion on the grid above exactMaxNodes (or under
repulsion: "grid"). grid-far-field walks the pyramid per node: the coarsest
level minus the node's 3x3 (3x3x3) neighbourhood, then per finer level the
parent's neighbourhood refined minus the level's own, with the pseudo-cell's
mass for a node inside the box and the coarsest level in full for a node
outside; the level count is a uniform, not an override. grid-near-field
applies the exact pair law and its fused epilogue over the 9 / 27 finest
cells, sampling nearMax independent draws with replacement from a crowded
cell (the node itself skipped) and scaling by others / sampled over the
realised draws -- a Horvitz-Thompson estimate whose mean is the exact cell
sum; it needs subgroups. The stats finalize gains
the grid block: the frame from the fold with a 1 % margin and the extent
floor, the outside count from the cell histogram, the largest cell population
from the hub counters, and the counter reset; it binds cellHist and
hubCounters (dummies on the exact tier).

repulsion-grid.ts composes the build and pyramid planners of the two previous
commits over a ReduceScope backed by one pool lease taken at create() and
released by dispose(); forceatlas2.ts allocates the grid buffers on the grid
tier, records the passes k1 / attraction / grid / toScene there, writes
gridMax and levels into the params, reports repulsionTier, maxCellOccupancy
and outsideGrid, and requires nearMax >= 2. force-simulation.ts drops the
E_UNSUPPORTED refusal of the grid tier, exports tierFor, calls the model's
dispose() after in-flight batches settle, exposes the last batch's pass
timings and reads the grid's u32 buffers back as Uint32Array. A grid batch
has more passes than the profiler's query set holds at a high iteration count,
so the profiler now marks such a batch partial(request) and the simulation
falls back to wall time instead of summing a prefix; profiler.test.ts pins
that.

grid-behaviour.test.ts runs the ten behaviour cases with bitwise equality
first, grid-lifecycle.test.ts the three lifecycle cases on rmat14 with the
pool back at 0 bytes after dispose; the grid-refusal pins of the FR and
spring suites are deleted and the tier rule of force-simulation.test.ts now
selects the grid.
BODY
}

body_parity() {
    cat <<'BODY'
The parity layer of the grid tier and the one recording run that derives its
tolerances. test/oracle/grid-field.ts holds the f64 far field, the near field
reproducing the independent hashed draws of a crowded cell, gravity,
attraction, the stats finalize in f32 and the integrate step; test/helpers/grid-parity.ts the
fixtures, the eight-stage capture, the stage reports and the caps table.
grid-inspect.test.ts compares every stage per kernel on seven fixtures in 2D
and 3D plus a pinned hub; grid-twins.test.ts the subgroup twins;
grid-exact.test.ts the grid tier against the exact tier (the floored per-node
RMS and p99 after one iteration, the expansion and the distributional
comparison after 200) and the unbiasedness of the sampled near field as the
whole-field ratio |mean - exact| / |exact| (fieldRelError, in
test/helpers/matchers.ts) of the mean over 4,096 seeds, with the ladder from
32 seeds printed.

noise-floor.test.ts gains 9 u32 members recording cross rows, 11 f32 stage
members, 5 approximation members and three metrics (floored-rms,
floored-p99, field-ratio);
noise-floor.json gains 43 rows and 32 tolerances, all written by the
recording run on the RTX 4070 SUPER and lavapipe, never by hand. Every u32
row has maxRelError 0 and every f32 stage floor is under its 1e-4 cap (worst
3.2e-6).

The exact-vs-grid caps are asserted on the uniform and hub fixtures on a
hardware adapter (random20k at 0.87 %, clumpy1000, hub10k) and printed with
their RMS, p99 and whole-field ratio on the clumpy and degenerate ones
(clumpy10, polyline, one-cell, line, coincident, isolated) and on every
fixture on a software adapter, where the far field's per-cell approximation
misses the 5 % cap (owner decision G4-F1: the misses are recorded, the caps
untouched). The unbiasedness member is the whole-field ratio of the
4,096-seed mean, 2.41e-2 on the hub cell against the unchanged 5 % cap (its
floor 2.378e-2, factor 2.10); the 32-seed per-node RMS the plan first named
(0.93) is the sampling variance of eight draws of a 20,000-entry cell and
falls as 1 / sqrt(seeds), not bias (owner decision G4-F2). One finding
besides, kept in grid-exact.test.ts: the exact tier on lavapipe sums only the
first 65,536 nodes, so the 100k size never runs there.
BODY
}

body_sabotage() {
    cat <<'BODY'
The sabotage rows of the far and near field (four and three), the three rows
of the stats finalize's grid block, and SABOTAGE_PHASES now naming P4, so
coverage.test.ts requires at least three rows for each of the thirteen new
kernels. grid.test.ts measures every row through the stage capture of the
parity commit against a pristine baseline first; the smallest ratio is 35.5x
(the near field's own-cell scale off by one, on the RTX 4070 SUPER), the
extent floor dropped is Infinity. The law rows of the next commit run through
the same file's law loop.

grid-settle.test.ts pins what the grid tier promises beyond one iteration:
the isolated fixture settles by the shared rule with the giant component's
mean displacement under the threshold, two 100-iteration rmat14 runs are
bitwise identical in positions, stats and trace, gridMax2D 32 is honoured on
random20k, the 3D pyramid stays under 40 MB up to 10M nodes, and hubcell at
nearMax 8 disperses its hub cell within the first iterations (occupancy 2 at
the end) and settles by the rule from both starts (960 iterations under the
independent-draw sampler, 900 with the contiguous window). The grid suite
runs in 73 s on lavapipe with the 4,096-seed unbiasedness cases, under the
240 s gate, once the grid-exact noise writer skips without
GRAPHTY_NOISE_FLOOR_WRITE=1 (336 s while it ran the 20k ladder on every
run: G4-F12 in the record).
BODY
}

body_law() {
    cat <<'BODY'
Fruchterman-Reingold and the spring-electrical preset reach the grid tier
through the LAW override the previous phase gave the exact kernels: the far
field gains the per-cell FR and Coulomb branches, the near field takes the
exact kernel's kick and three-way pair law verbatim, and both entries declare
LAW with default 0. RepulsionGrid takes the override and the three models pass
0 / 1 / 2; the FR and spring models get the union stage list, the grid
buffers by tier, the grid frame at load, the passes k1 / attraction / grid
before toScene, the grid stats and dispose(), with the exact kernel compiled
only on the exact tier. The compile pins move (far field 4, near field 25,
P4 40) and the spec and buffer pins of the three option suites carry LAW.

grid-law.test.ts compares each model's grid repulsion against its own exact
tier on random20k and a one-cell karate placement, 2D and 3D, twice bitwise
(FR rms 2.1e-3 / 1.3e-2, spring 2.5e-2 / 5.4e-3 on the RTX 4070 SUPER), the
far field alone against an f64 traversal on a 257-node sample, the FR run on
the story graph finite and cooling, the spring run settled with the kinetic
energy fallen 360x, the LAW keys on both grid kernels, and "auto" sending both
models to the grid above exactMaxNodes. The twelve LAW sabotage rows detect at
>= 14.2x on both adapters.

Two findings for the gate record: the pseudo-cell term is unsound when
outside nodes lie on opposite edges of the box (their centroid can land inside
the grid next to a node, a 30x far field under the Coulomb law at n = 2,000),
and the Coulomb law at the software scale of 400 nodes sits at the 5 % / 25 %
caps, so the suite runs at 1/10 scale on a software adapter.
BODY
}

body_calibrate() {
    cat <<'BODY'
calibrateLayout(ctx, options?) of spec 2.2: seeded G(n, 10n) probes at 8k /
16k / 32k / 65k (or the caller's sizes), ForceAtlas2 on the exact and the grid
tier per size with one untimed and ten timed steps each, every probe released,
and pairsPerSecond, the per-size ms per iteration of both tiers, the
suggested exactMaxNodes by the spec 7.8 rule and the wall time of the call.
CalibrateOptions and GpuCalibration are exported with it; the export pins and
the public-api type test follow. calibrate.test.ts covers the shape, the
rule, bad sizes, the release of every buffer and a second call compiling
nothing.

The layout-grid benchmark group times step(1) of the grid tier on the ladder
32k / 65k / 100k / 262k / 1M in 2D and 3D, the attraction pass of the 1M 2D
iteration from the profiler, and the exact ladder's 1k / 4k / 8k / 16k rungs
in 2D so the crossover rule has a grid row at every exact rung;
exactMaxNodesFromLadder gains the grid clause and layout-run.ts a --repulsion
flag with the scale-feasible metrics of the final positions. Two dev-box
sessions on the RTX 4070 SUPER are appended to the results file; the second
(2026-09-21T06:15Z, the one with the exact rungs) is the baseline the README
and the gate record read: grid 2D 0.298 ms per iteration at 32k, 0.634 at
100k, 5.414 at 1M; 3D 1.306 at 100k; attraction 1.493 ms at 1M; Chromium
3.700 ms per frame at 100k on the grid. T-5 at 100k, T-6 and T-7 are met.

The crossover re-check by the rule in full -- under 4 ms per iteration AND
not slower than the grid tier at the same n -- computes 1024: the grid costs
a near-constant 0.19-0.3 ms per iteration up to 32k, so the exact tier is
faster only at 1k. EXACT_MAX_NODES keeps 32768 by owner decision G4-D1 (the
exact tier is the accurate one and "auto" is every consumer's default) until
the far-field accuracy work G4-F1 leaves closes; the constant's JSDoc and
its pin landed with the radix-sort and grid commits, which claim those shared
files. The README's tables and status paragraph carry the decision and the
new rows here, its two pre-P4 sentences that still called the grid tier
E_UNSUPPORTED are rewritten (G4-F11) and its status names G4.md as this
phase's record; the frame-loop tests pin repulsion: "exact" so their flight
calibration keeps the n^2 cost it relies on. The T4 rows of the README stay OPEN markers until
the labelled PR runs the GPU lane.
BODY
}

body_limits() {
    cat <<'BODY'
The six node-limits files the G4 gate names, run on the GPU lane only:
binding-2gib (the raised maxStorageBufferBindingSize, 2,147,483,644 on the
RTX 4070 SUPER -- four bytes under 2^31, so the plan's ">= 2^31" cannot hold
-- and a 1.5 GiB buffer bound whole and read back in 17 ms), windowed-200mb
(a 200 MB per-array upload bound as two windows with the windowed degree
equal to outDegree() in 454 ms, and the 16,776,961-item scan in five
dispatches), dispatch-2d-100m (100M items in 65535 x 6 workgroups, filled and
read back in 140 ms), oom-scope (a buffer of exactly maxBufferSize yields
E_OUT_OF_MEMORY with requested / resident and the context stays usable),
vendor-features (the adapter's feature and limit table) and layout-1m (the
262k and 1M ForceAtlas2 fixtures: exact-vs-grid rms 3.1e-3 / p99 8.8e-3 at
1M, the 262k 200-iteration distributional difference 1.06e-2, the 1M grid run
at 5.31 ms per iteration). The README's rows say which have landed.

The 1M unbiasedness item is the re-scoped one (owner decision G4-F2): the
whole-field ratio of a 1,024-seed mean on the hub cell, 2.52e-2 against the
unchanged 5 % cap, with the 20k / 100k / 250k rungs and the ladder from 32
seeds printed. The files require a hardware adapter (GRAPHTY_GPU_REQUIRE
nvidia) and run on the GPU lane only.
BODY
}

body_decisions() {
    cat <<'BODY'
Seven decision records for the P4 departures from the WebGPU design, each
quoting the design text it sets aside and the conditions that would reverse
it: compact and dedupe land with the frontier phase rather than the grid;
windowed execution covers degree and segmentedReduce only; the grid's sort
scratch is model-owned rather than a pool lease per batch; exclusiveScan has
no subgroup variant; the far field's level count is a uniform, not an
override; the cell histogram is zeroed by a fill dispatch, not clearBuffer;
and the workgroup-per-row tiers fold plainly, without Kahan compensation.

design/decisions/README.md indexes the seven; design/README.md's decisions
count moves from 13 to 20.
BODY
}

body_gate() {
    cat <<'BODY'
docs/decisions/G4.md records the gate as measured on the dev box: the
deliverables mapped to their evidence, the adapters exercised, the T-5 / T-6
/ T-7 numbers, the 1M 200-iteration comparison of both tiers (exact 1663.6
ms per iteration against grid 8.283, within 1.72 % of each other after 200),
the crossover re-check and the owner's decision on the value, the knob
sweep (the defaults stay), the 74 sabotage rows all >= 10x, the 43 noise
rows, coverage over the thresholds, the lavapipe and browser runs, and the
findings. All twenty-five items are green on the dev box after the owner's
two decisions: G4-F1 splits the exact-vs-grid suite into the
fixtures it asserts (uniform, hub) and the ones it prints with their numbers
(clumpy, degenerate, every fixture on a software adapter), and G4-F2 fixes
the near-field sampler (independent draws) and re-scopes the unbiasedness
item to the whole-field ratio of a 4,096-seed mean under the unchanged 5 %
cap; exactMaxNodes keeps 32768 by G4-D1 while the rule computes 1024. Item
20 was red on time (G4-F12: 336 s against 240 s, the grid-exact noise writer
running its 4,096-seed ladder without the write flag) and reads 73 s now
that the writer skips without the flag; the GPU lane rows carry OPEN markers
until the labelled PR runs. The two exports G4-F4 named file-local are, and so are
the re-scope's UnbiasedRung / UnbiasedLadder.

CLAUDE.md names the thirteen kernels in the wgsl inventory, the new
primitives and layout files, the layout-grid benchmark group, the re-fixed
exactMaxNodes paragraph and a Settled-at-G4 table. Two pins the whole-project
runs found stale are fixed: the browser state round trip mirrors the node
twin's new Fa2State fields, and the upload-plan fixture count moves from 13
to the 24 fixtures graphs.ts now holds.
BODY
}

body_tools() {
    cat <<'BODY'
The step list now names the eighteen commits of the P4 phase: the seventeen
P4 task areas in the plan's execution order, then this script; the prelude's
adaptive-cooling fix is already on origin/master, so its lines ride with the
radix commit.
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
