/**
 * The sabotage matrix (spec 11.9 item 1, 13 rule f; contract 5.2): named textual mutations of the normative kernel
 * bodies of 4.5, each with the minimum factor by which it must break the named test's tolerance. A test compiles a
 * mutant through `withSabotage` (the `setKernelBodyOverride` seam of kernels.ts and a FRESH context, because the
 * pipeline key does not include the body) and asserts that the SAME check that passes on the real kernel fails on
 * the mutant by at least `minFactor`. A mutation that survives is a bug in the test suite and blocks the gate.
 *
 * The `find` strings below are copied from the contract's 4.5 bodies; test/sabotage/coverage.test.ts asserts that
 * each occurs exactly once in the registry's body, so a re-formatted body is caught, never silently un-mutated.
 *
 * Rows: degree, reduce, K3 (fa2-repulsion-exact) and K4 (fa2-speed-finalize) at P1-T5; segmented-reduce at P2-T2
 * (which lists "P2"); P3-T5 adds K1 / K2 / K5 and lists "P3"; M8b-T10 adds the six non-exempt P7 kernels (spmv-pull,
 * pr-scale, pr-finalize and the three Afforest link / compress kernels) and lists "P7", measured by
 * test/sabotage/spmv.test.ts and test/sabotage/wcc.test.ts; P8-T3 adds the three compact / dedupe kernels, measured
 * by test/sabotage/compact.test.ts, P8-T4 the six frontier-finalize rows measured by test/sabotage/frontier.test.ts,
 * P8-T5 the five advance-expand rows measured by test/sabotage/advance.test.ts, P8-T6 the three bfs-contract and four
 * sssp-pred rows measured by test/sabotage/bfs.test.ts, P8-T7 the three bfs-fused rows and the seventh
 * frontier-finalize row (the inverted fused threshold), measured by test/sabotage/bfs.test.ts too, P8-T9 the four
 * sssp-relax rows and three f32-mode sssp-pred rows measured by test/sabotage/sssp.test.ts, P8-T10 the three bf-relax
 * rows measured by test/sabotage/bellman-ford.test.ts, P8-T11 the three closeness-sweep and three closeness-reduce rows
 * measured by test/sabotage/closeness.test.ts ("P8" is listed by P8-T15, when the last P8 kernel has its rows). SABOTAGE_P3_ADDENDUM carries the rows P3 adds on the P1
 * kernels (measured by the P3 checks of test/sabotage/fa2.test.ts only); SABOTAGE_P5 carries the rows of the FR and
 * spring-electrical BRANCHES P5 adds to K1 / K2 / K3 / K5 (PD-8; measured by test/sabotage/fr.test.ts and se.test.ts
 * only, since the FA2 checks never reach those lines).
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelEntry, type KernelId, KERNELS, setKernelBodyOverride } from "../../src/kernels.js";
import { acquire } from "../setup/gpu.js";

/** One named mutation of a kernel body: a unique `find` string replaced by `replace`, and the minimum factor by which it must break the named test's tolerance. */
export interface Mutation {
    readonly name: string;
    readonly find: string;
    readonly replace: string;
    readonly minFactor: number;
    readonly test: string;
}

const DEGREE_TEST = "test/algorithms/degree.test.ts";
const REDUCE_TEST = "test/primitives/reduce.test.ts";
const SKELETON_TEST = "test/layouts/skeleton.test.ts";
const SEGMENTED_REDUCE_TEST = "test/primitives/segmented-reduce.test.ts";
const INSPECT_TEST = "test/layouts/fa2-inspect.test.ts";
const TRACE_TEST = "test/layouts/fa2-trace-parity.test.ts";
const SPMV_TEST = "test/primitives/spmv.test.ts";
const PAGERANK_TEST = "test/algorithms/pagerank.test.ts";
const SPECTRAL_TEST = "test/algorithms/spectral.test.ts";
const COMPONENTS_TEST = "test/algorithms/components.test.ts";
const INDIRECT_TEST = "test/kernel/indirect.test.ts";
const SCAN_TEST = "test/primitives/scan.test.ts";
const HISTOGRAM_TEST = "test/primitives/histogram.test.ts";
const RADIX_TEST = "test/primitives/radix-sort.test.ts";
const GRID_TEST = "test/primitives/grid.test.ts";
const PYRAMID_TEST = "test/primitives/grid-pyramid.test.ts";
const GRID_INSPECT_TEST = "test/layouts/grid-inspect.test.ts";
const COMPACT_TEST = "test/primitives/compact.test.ts";
const FRONTIER_TEST = "test/primitives/frontier.test.ts";
const ADVANCE_TEST = "test/primitives/advance.test.ts";
const BFS_TEST = "test/algorithms/bfs.test.ts";
const SSSP_TEST = "test/algorithms/sssp.test.ts";
const BF_TEST = "test/algorithms/bellman-ford.test.ts";
const CLOSENESS_TEST = "test/algorithms/closeness.test.ts";

/** At least three mutations per kernel that has rows (spec 13 rule f); PARTIAL so a phase's kernels can land before its rows (the coverage test below gates by phase). */
export const SABOTAGE: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({
    degree: Object.freeze([
        {
            // the last row of the dispatch range is never written: `n - 1` instead of `n` in the bound (spec 11.9)
            name: "last-row-skipped",
            find: "if (row >= P.end) { return; }",
            replace: "if (row >= P.end - 1u) { return; }",
            minFactor: 10,
            test: DEGREE_TEST,
        },
        {
            // the USE_PERM select reads the dummy (rowPtr) as the row index when USE_PERM is false
            name: "use-perm-select-swapped",
            find: "select(row, perm[row], USE_PERM)",
            replace: "select(perm[row], row, USE_PERM)",
            minFactor: 10,
            test: DEGREE_TEST,
        },
        {
            // the rebase uniform is ignored: visible only through the row-window leg of the degree check (arcBase != 0)
            name: "rebase-ignored",
            find: "colIdx[arc - P.arcBase]",
            replace: "colIdx[arc]",
            minFactor: 10,
            test: DEGREE_TEST,
        },
        {
            // a neighbour == n is impossible on a valid CSR, so the bounds check is sabotaged by counting each target twice
            name: "target-counted-twice",
            find: "select(0u, 1u, nbr < P.n)",
            replace: "select(0u, 2u, nbr < P.n)",
            minFactor: 10,
            test: DEGREE_TEST,
        },
    ]),
    reduce: Object.freeze([
        {
            // the FINAL level writes out[0] instead of out[P.outOffset]
            name: "final-writes-out-zero",
            find: "let o = P.outOffset + g;",
            replace: "let o = g;",
            minFactor: 10,
            test: REDUCE_TEST,
        },
        {
            // the u32 min identity becomes 0: every u32 min collapses to 0
            name: "u32-min-identity-zero",
            find: "return U32_MAX;",
            replace: "return 0u;",
            minFactor: 10,
            test: REDUCE_TEST,
        },
        {
            // the f32 min identity becomes 0.0: every f32 / vec4f min of positive inputs collapses to 0
            name: "f32-min-identity-zero",
            find: "return F32_MAX;",
            replace: "return 0.0;",
            minFactor: 10,
            test: REDUCE_TEST,
        },
        {
            // the level-1 bound admits i == count: the element past the range (the check's poison tail) is folded in
            name: "level-bound-inclusive",
            find: "if (i < P.count) {",
            replace: "if (i <= P.count) {",
            minFactor: 10,
            test: REDUCE_TEST,
        },
    ]),
    "fa2-repulsion-exact": Object.freeze([
        {
            // regular gravity pushes away from the centre instead of towards it (7.9)
            name: "gravity-sign-flipped",
            find: "return -P.gravity * pi.w * q / d;",
            replace: "return P.gravity * pi.w * q / d;",
            minFactor: 10,
            test: SKELETON_TEST,
        },
        {
            // |F| = k m_i m_j / d^2 instead of the 7.2 law k m_i m_j / d
            name: "inverse-square-law",
            find: "f = f + d * (k / d2);",
            replace: "f = f + d * (k / (d2 * length(d)));",
            minFactor: 10,
            test: SKELETON_TEST,
        },
        {
            // the self pair is no longer excluded: it takes the coincident kick of magnitude k m_i m_i / 0.01
            name: "self-pair-guard-removed",
            find: "if (o.w > 0.0 && jj != i) {",
            replace: "if (o.w > 0.0) {",
            minFactor: 10,
            test: SKELETON_TEST,
        },
        {
            // the mass lane read as .x (4.4 rule 5)
            name: "mass-lane-x",
            find: "let k = P.scalingRatio * pi.w * o.w;",
            replace: "let k = P.scalingRatio * pi.x * o.x;",
            minFactor: 10,
            test: SKELETON_TEST,
        },
    ]),
    "fa2-speed-finalize": Object.freeze([
        {
            // the CPU's conditional halving of the efficiency (7.2) weakened; visible when swing / traction > 2 and eff > 0.05
            name: "efficiency-halving-weakened",
            find: "eff = eff * 0.5;",
            replace: "eff = eff * 0.9;",
            minFactor: 10,
            test: SKELETON_TEST,
        },
        {
            // the 1.3 rise removed; visible when swing <= jitter * traction and S.speed < 1000
            name: "efficiency-rise-removed",
            find: "eff = eff * 1.3;",
            replace: "eff = eff * 1.0;",
            minFactor: 10,
            test: SKELETON_TEST,
        },
        {
            // swing and traction swapped before the reduction: S and T both see the swap, in both SWING_MODEs
            name: "swing-traction-swapped",
            find: "vec4f(st, 0.0, 0.0)",
            replace: "vec4f(st.yx, 0.0, 0.0)",
            minFactor: 10,
            test: SKELETON_TEST,
        },
    ]),
    "segmented-reduce": Object.freeze([
        {
            // contract 5.5 spells this row `row >= P.end` -> `row > P.end`; that mutant's extra invocation writes
            // out[n], an in-bounds slot under the pool's size classes, so it is not reliably caught. The form here
            // skips the last row deterministically (spec 11.9 item 1: "n - 1 instead of n in the bound"). Pending
            // owner confirmation, docs/decisions/G2.md.
            name: "last-row-skipped",
            find: "row >= P.end",
            replace: "row + 1u >= P.end",
            minFactor: 10,
            test: SEGMENTED_REDUCE_TEST,
        },
        {
            // the weight read under HAS_WEIGHTS dropped: every arc weighs 1.0 (the check set's weights average 2.1).
            // In row_fold_dense, the fold TIER 0 runs and the one this suite's thread-per-row dispatches reach
            name: "weight-read-dropped",
            find: "weight = weights[k]",
            replace: "weight = 1.0",
            minFactor: 10,
            test: SEGMENTED_REDUCE_TEST,
        },
        {
            // the HAS_WEIGHTS select inverted: a weighted core folds 1.0 per arc (row_fold_dense, as above)
            name: "has-weights-inverted",
            find: "if (HAS_WEIGHTS) { weight = weights[k]; }",
            replace: "if (!HAS_WEIGHTS) { weight = weights[k]; }",
            minFactor: 10,
            test: SEGMENTED_REDUCE_TEST,
        },
        {
            // the min identity becomes 0.0: every row's min collapses to 0 against weights >= 0.25
            name: "min-identity-zero",
            find: "return F32_MAX;",
            replace: "return 0.0;",
            minFactor: 10,
            test: SEGMENTED_REDUCE_TEST,
        },
        {
            // a row with no arcs is never written: the check's 100 empty rows keep the sentinel (the row names the
            // TIER 0 call, where the fold and the write live in row_fold_dense / finish and a1 / a0 are out of scope)
            name: "empty-rows-skipped",
            find: "finish(i, row_fold_dense(i));",
            replace: "if (rowPtr[i + 1u] > rowPtr[i]) { finish(i, row_fold_dense(i)); }",
            minFactor: 10,
            test: SEGMENTED_REDUCE_TEST,
        },
        {
            // the USE_PERM select reads the dummy (rowPtr) as the row index when USE_PERM is false
            name: "perm-select-swapped",
            find: "select(row, perm[row], USE_PERM)",
            replace: "select(perm[row], row, USE_PERM)",
            minFactor: 10,
            test: SEGMENTED_REDUCE_TEST,
        },
    ]),
    "fa2-stats-finalize": Object.freeze([
        {
            // the settle counter is never reset: with settleThreshold 0 the oracle keeps 0, the mutant counts every iteration (visible at the K1 fold of iteration 2)
            name: "settled-count-never-reset",
            find: "S.settledCount = select(0u, S.settledCount + 1u, meanDisp <= P.settleThreshold * S.rmsRadius);",
            replace: "S.settledCount = S.settledCount + 1u;",
            minFactor: 10,
            test: INSPECT_TEST,
        },
        {
            // the centroid divides by n - 1: a 1 / (n - 1) relative error on every component (3% on karate)
            name: "centroid-over-n-minus-1",
            find: "let c = tSum.xyz / n;",
            replace: "let c = tSum.xyz / (n - 1.0);",
            minFactor: 10,
            test: INSPECT_TEST,
        },
        {
            // the RMS radius without its square root: r^2 instead of r (tens of percent on every layout)
            name: "rms-radius-without-sqrt",
            find: "S.rmsRadius = sqrt(max(tSum.w, 0.0) / n);",
            replace: "S.rmsRadius = max(tSum.w, 0.0) / n;",
            minFactor: 10,
            test: INSPECT_TEST,
        },
    ]),
    "fa2-attraction": Object.freeze([
        {
            // attraction pushes away from the neighbour instead of towards it (row_force_dense: karate reaches no
            // degree of 32, so every check in this suite folds through TIER 0)
            name: "attraction-sign-flipped",
            find: "total = total + d * mag;",
            replace: "total = total - d * mag;",
            minFactor: 10,
            test: INSPECT_TEST,
        },
        {
            // the LINLOG select arguments swapped: the linear law runs the linlog magnitude and vice versa (30% at |d| = 1)
            name: "linlog-select-swapped",
            find: "let mag = select(weight, weight * log(1.0 + len) / len, LINLOG);",
            replace: "let mag = select(weight * log(1.0 + len) / len, weight, LINLOG);",
            minFactor: 10,
            test: INSPECT_TEST,
        },
        {
            // PLAN DECISION 2 (replaces the inert self-loop row): the row bound off by one reads the next row's first
            // arc into every row; on row_force_dense, since TIER 0 is the fold this suite's karate load runs
            name: "row-bound-inclusive",
            find: "arc < hi; arc = arc + 1u",
            replace: "arc <= hi; arc = arc + 1u",
            minFactor: 10,
            test: INSPECT_TEST,
        },
        {
            // spec 11.9 item 1: select arguments swapped in the USE_PERM read; with USE_PERM false the dummy rowPtr is read as the row index
            name: "use-perm-select-swapped",
            find: "return select(row, perm[row], USE_PERM);",
            replace: "return select(perm[row], row, USE_PERM);",
            minFactor: 10,
            test: INSPECT_TEST,
        },
    ]),
    "fa2-integrate": Object.freeze([
        {
            // a displacement clamp inserted (D25 forbids one): the first iteration's O(1..10) steps collapse to 0.01
            name: "dp-clamped",
            find: "dp = select(f * factor, vec3f(0.0), fixed);",
            replace: "dp = select(clamp(f * factor, vec3f(-0.01), vec3f(0.01)), vec3f(0.0), fixed);",
            minFactor: 10,
            test: INSPECT_TEST,
        },
        {
            // oldForce never stored: iteration 2's swing becomes m |F| instead of m |F - F_old| (paper mode)
            name: "store-old-skipped",
            find: "if (SWING_MODE == 0u) { store_old(i, f); }",
            replace: "if (SWING_MODE == 2u) { store_old(i, f); }",
            minFactor: 10,
            test: TRACE_TEST,
        },
        {
            // PLAN DECISION 2 (replaces the inert 2D-z row): the stale oldForce read in place of the force (spec 11.9 item 1); iteration 1 then moves nothing
            name: "stale-force-read",
            find: "let f = load_force(i);",
            replace: "let f = load_old(i);",
            minFactor: 10,
            test: INSPECT_TEST,
        },
        {
            // the fixed select swapped: free nodes stay, fixed nodes would move
            name: "fixed-select-swapped",
            find: "dp = select(f * factor, vec3f(0.0), fixed);",
            replace: "dp = select(vec3f(0.0), f * factor, fixed);",
            minFactor: 10,
            test: INSPECT_TEST,
        },
    ]),
    "spmv-pull": Object.freeze([
        {
            // the damping and the teleport swapped: beta scales the pull and alpha the personalization
            name: "alpha-beta-swapped",
            find: "(P.beta * pv) + (P.alpha * (acc + (dangling * pv)))",
            replace: "(P.alpha * pv) + (P.beta * (acc + (dangling * pv)))",
            minFactor: 10,
            test: PAGERANK_TEST,
        },
        {
            // the row end of row_sum_dense read from rowPtr[v]: every TIER 0 row folds nothing (the tiers keep the
            // strided fold's own bound, which no check in this suite reaches)
            name: "row-end-off-by-one",
            find: "let hi = min(rowPtr[v + 1u], P.arcEnd);",
            replace: "let hi = min(rowPtr[v], P.arcEnd);",
            minFactor: 10,
            test: SPMV_TEST,
        },
        {
            // the dangling mass never redistributed (USE_DANGLING is set and the header carries a non-zero mass)
            name: "dangling-dropped",
            find: "(dangling * pv)",
            replace: "(0.0 * pv)",
            minFactor: 10,
            test: PAGERANK_TEST,
        },
    ]),
    "pr-scale": Object.freeze([
        {
            // a node with no out-weight contributes nothing to the dangling mass: the mass leaks out of the system
            name: "dangling-not-accumulated",
            find: "if (divisor <= 0.0) { dangling = x; xNorm[u] = 0.0; }",
            replace: "if (divisor <= 0.0) { dangling = 0.0; xNorm[u] = 0.0; }",
            minFactor: 10,
            test: PAGERANK_TEST,
        },
        {
            // the L1 delta is the L1 norm of the iterate (1 for PageRank): convergence is never recorded
            name: "delta-ignores-previous",
            find: "delta = abs(x - prev);",
            replace: "delta = abs(x);",
            minFactor: 10,
            test: PAGERANK_TEST,
        },
        {
            // group 0 writes the header and the last group's partial is never written: the fold reads a stale slot
            name: "partial-slot-off-by-one",
            find: "let slot = 1u + group_id(wid);",
            replace: "let slot = group_id(wid);",
            minFactor: 10,
            test: PAGERANK_TEST,
        },
    ]),
    "pr-finalize": Object.freeze([
        {
            // the one-iteration-late guard dropped: iteration 1 (whose delta is |x0 - 0|) can record firstConverged = 0
            name: "converged-recorded-at-one",
            find: "P.iteration >= 2u",
            replace: "P.iteration >= 0u",
            minFactor: 10,
            test: PAGERANK_TEST,
        },
        {
            // the header's dangling mass is the folded delta: the pull redistributes the wrong mass
            name: "dangling-takes-the-delta",
            find: "partials[0].danglingMass = folded.x;",
            replace: "partials[0].danglingMass = folded.y;",
            minFactor: 10,
            test: PAGERANK_TEST,
        },
        {
            // the L2 norm without its square root: the eigenvector iterate alternates in magnitude and never converges
            name: "l2-sqrt-dropped",
            find: "norm = sqrt(max(0.0, folded.z));",
            replace: "norm = max(0.0, folded.z);",
            minFactor: 10,
            test: SPECTRAL_TEST,
        },
    ]),
    "wcc-link-sample": Object.freeze([
        {
            // a row of degree exactly r links the NEXT row's first neighbour (colIdx[rowPtr[v + 1]])
            name: "degree-guard-inclusive",
            find: "if (a0 + P.r < a1) {",
            replace: "if (a0 + P.r <= a1) {",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
        {
            // PLAN DECISION (replaces the plan's inert `high-low-swapped`, measured 0: a sampled round that links
            // NOTHING is repaired by the each-edge-once round): the CAS lands on the root's neighbour by index, so
            // an unrelated node joins lo's tree and the real pair stays apart
            name: "root-off-by-one",
            find: "let hi = max(p1, p2);",
            replace: "let hi = max(p1, p2) + 1u;",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
        {
            // PLAN DECISION (replaces the plan's inert `changed-flag-never-set`, measured 0: the host clears the
            // flag before every edge batch and never reads the one the setup batch sets): every row of degree > r
            // links the NEXT row instead of its r-th neighbour, chaining the blocks together
            name: "neighbour-is-next-row",
            find: "link_pair(v, colIdx[a0 + P.r]);",
            replace: "link_pair(v, v + 1u);",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
    ]),
    "wcc-link-edges": Object.freeze([
        {
            // an edge with ONE endpoint in the giant is skipped: a node hanging off the giant never joins it
            name: "giant-guard-widened",
            find: "if (atomicLoad(&comp[u]) == P.giant && atomicLoad(&comp[v]) == P.giant) { continue; }",
            replace: "if (atomicLoad(&comp[u]) == P.giant || atomicLoad(&comp[v]) == P.giant) { continue; }",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
        {
            // every edge in canonical orientation (u < v) is skipped, not just the self-edges
            name: "self-edge-skip-widened",
            find: "if (u == v) { continue; }",
            replace: "if (u <= v) { continue; }",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
        {
            // lo is the higher root: the CAS precondition never holds and the edge round links nothing
            name: "low-high-swapped",
            find: "let lo = min(p1, p2);",
            replace: "let lo = max(p1, p2);",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
    ]),
    "wcc-compress": Object.freeze([
        {
            // the compress writes the node's own index: every round resets the forest to singletons
            name: "root-not-stored",
            find: "atomicStore(&comp[v], root);",
            replace: "atomicStore(&comp[v], v);",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
        {
            // the walk stops at the first NON-fixed point: the compress is a no-op and the labels are parents, not roots
            name: "fixed-point-inverted",
            find: "if (parent == root) { break; }",
            replace: "if (parent != root) { break; }",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
        {
            // PLAN DECISION (replaces the plan's inert `starts-at-self`, measured 0: a walk that starts at v takes
            // one more hop to the same root): the parent is read from v itself, so the walk ends where it began
            // and every label is an immediate parent, not a root
            name: "parent-read-from-self",
            find: "let parent = atomicLoad(&comp[root]);",
            replace: "let parent = atomicLoad(&comp[v]);",
            minFactor: 10,
            test: COMPONENTS_TEST,
        },
    ]),
    "indirect-finalize": Object.freeze([
        {
            // the ceil is dropped: a count that is not a multiple of wg loses its last workgroup
            name: "ceil-dropped",
            find: "let groups = count / P.wg + select(0u, 1u, count % P.wg != 0u);",
            replace: "let groups = count / P.wg;",
            minFactor: 10,
            test: INDIRECT_TEST,
        },
        {
            // the 2D split is never taken: x exceeds MAX_WORKGROUPS_PER_DIM above 16,776,960 items
            name: "split-never-taken",
            find: "if (groups > MAX_WORKGROUPS_PER_DIM) {",
            replace: "if (groups > U32_MAX) {",
            minFactor: 10,
            test: INDIRECT_TEST,
        },
        {
            // a 12-byte slot stride: every slot past the first lands on the wrong words
            name: "slot-stride-twelve",
            find: "let base = 4u * P.slot;",
            replace: "let base = 3u * P.slot;",
            minFactor: 10,
            test: INDIRECT_TEST,
        },
    ]),
    "scan-block": Object.freeze([
        {
            // the inclusive sum is written: every word is off by its own value
            name: "inclusive-not-exclusive",
            find: "if (i < P.count) { out[i] = inclusive - v; }",
            replace: "if (i < P.count) { out[i] = inclusive; }",
            minFactor: 10,
            test: SCAN_TEST,
        },
        {
            // the block sum is lane 0's own value: every block after the first starts from the wrong offset
            name: "block-sum-from-lane-zero",
            find: "if (lid.x == WG - 1u) { blockSums[g] = inclusive; }",
            replace: "if (lid.x == 0u) { blockSums[g] = inclusive; }",
            minFactor: 10,
            test: SCAN_TEST,
        },
        {
            // every other Hillis-Steele round is skipped: the in-block prefix misses half its terms
            name: "round-doubling-dropped",
            find: "for (var s = 1u; s < WG; s = s * 2u) {",
            replace: "for (var s = 1u; s < WG; s = s * 4u) {",
            minFactor: 10,
            test: SCAN_TEST,
        },
    ]),
    "scan-add": Object.freeze([
        {
            // the add-back is a no-op: every block after the first keeps its in-block prefix
            name: "add-back-skipped",
            find: "out[i] = out[i] + blockOffsets[g];",
            replace: "out[i] = out[i];",
            minFactor: 10,
            test: SCAN_TEST,
        },
        {
            // the next block's offset is added: every block is shifted by its own sum
            name: "offset-of-next-block",
            find: "blockOffsets[g];",
            replace: "blockOffsets[g + 1u];",
            minFactor: 10,
            test: SCAN_TEST,
        },
        {
            // the last block is never added back
            name: "last-block-skipped",
            find: "if (i >= P.count) { return; }",
            replace: "if (i >= P.count - WG) { return; }",
            minFactor: 10,
            test: SCAN_TEST,
        },
    ]),
    histogram: Object.freeze([
        {
            // the design's named mutation (11.9 item 1): a store instead of an add, so every hit bin counts 1
            name: "plain-store",
            find: "if (k < P.bins) { atomicAdd(&hist[k], 1u); }",
            replace: "if (k < P.bins) { atomicStore(&hist[k], 1u); }",
            minFactor: 10,
            test: HISTOGRAM_TEST,
        },
        {
            // the last key is never counted (the three-line find documents the intent; the body has one such line)
            name: "last-key-skipped",
            find: "if (i >= P.count) { return; }                                  // no barrier follows\n    let k = keys[i];\n    if (k < P.bins)",
            replace: "if (i + 1u >= P.count) { return; }                             // no barrier follows\n    let k = keys[i];\n    if (k < P.bins)",
            minFactor: 10,
            test: HISTOGRAM_TEST,
        },
        {
            // every key lands one bin up
            name: "bin-off-by-one",
            find: "atomicAdd(&hist[k], 1u)",
            replace: "atomicAdd(&hist[k + 1u], 1u)",
            minFactor: 10,
            test: HISTOGRAM_TEST,
        },
    ]),
    "counting-scatter": Object.freeze([
        {
            // the cursor never advances: every element of a bin takes slot 0 (duplicates, unwritten slots: outIndex is no permutation)
            name: "cursor-not-advanced",
            find: "let slot = atomicAdd(&cursor[k], 1u);",
            replace: "let slot = atomicLoad(&cursor[k]);",
            minFactor: 10,
            test: HISTOGRAM_TEST,
        },
        {
            // the bin start is ignored: every bin scatters from 0
            name: "start-ignored",
            find: "outIndex[start[k] + slot] = i;",
            replace: "outIndex[slot] = i;",
            minFactor: 10,
            test: HISTOGRAM_TEST,
        },
        {
            // the written index is off by one
            name: "index-off-by-one",
            find: "+ slot] = i;",
            replace: "+ slot] = i + 1u;",
            minFactor: 10,
            test: HISTOGRAM_TEST,
        },
    ]),
    "radix-hist": Object.freeze([
        {
            // the table is stored group-major: the scan yields offsets in the wrong order for every digit but the first
            name: "group-major-table",
            find: "hist[b * P.groups + g] = atomicLoad(&local[b]);",
            replace: "hist[g * RADIX_BINS + b] = atomicLoad(&local[b]);",
            minFactor: 10,
            test: RADIX_TEST,
        },
        {
            // the pass's shift is ignored: every pass histograms the low byte
            name: "shift-ignored",
            find: "let d = (keys[i] >> P.shift) & RADIX_DIGIT_MASK;",
            replace: "let d = keys[i] & RADIX_DIGIT_MASK;",
            minFactor: 10,
            test: RADIX_TEST,
        },
        {
            // the last key is never counted: its digit's offsets are one short
            name: "last-key-uncounted",
            find: "if (i < P.count) {\n        let d = (keys[i] >> P.shift) & RADIX_DIGIT_MASK;",
            replace: "if (i + 1u < P.count) {\n        let d = (keys[i] >> P.shift) & RADIX_DIGIT_MASK;",
            minFactor: 10,
            test: RADIX_TEST,
        },
    ]),
    "radix-scatter": Object.freeze([
        {
            // the rank never advances: every key of a digit lands on the same slot
            name: "rank-not-advanced",
            find: "cnt[ds] = cnt[ds] + 1u;",
            replace: "cnt[ds] = cnt[ds];",
            minFactor: 10,
            test: RADIX_TEST,
        },
        {
            // the values are read at the destination: they are never permuted with their keys
            name: "values-not-permuted",
            find: "valsOut[dst] = vals[i];",
            replace: "valsOut[dst] = vals[dst];",
            minFactor: 10,
            test: RADIX_TEST,
        },
        {
            // every workgroup uses group 0's offset: the blocks overwrite each other
            name: "offset-of-group-zero",
            find: "let dst = offsets[d * P.groups + g] + rank[lid.x];",
            replace: "let dst = offsets[d * P.groups] + rank[lid.x];",
            minFactor: 10,
            test: RADIX_TEST,
        },
    ]),
    "grid-cell-key": Object.freeze([
        {
            // the design's named mutation: an outside node lands in the last real cell instead of the pseudo-cell
            name: "pseudo-cell-dropped",
            find: "var key = cells;",
            replace: "var key = cells - 1u;",
            minFactor: 10,
            test: GRID_TEST,
        },
        {
            // x and y swapped in the linearisation: the key of every off-diagonal cell changes
            name: "axes-swapped",
            find: "key = u32(c.x) + P.gridMax * u32(c.y);",
            replace: "key = u32(c.y) + P.gridMax * u32(c.x);",
            minFactor: 10,
            test: GRID_TEST,
        },
        {
            // round instead of floor: every node past the half of its cell moves one cell up
            name: "floor-replaced-by-round",
            find: "let c = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));",
            replace: "let c = vec3<i32>(round(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));",
            minFactor: 10,
            test: GRID_TEST,
        },
    ]),

    "grid-centroid": Object.freeze([
        {
            // the comment keeps the find unique against G4b's identical sum line (a find is checked within its own body)
            name: "mass-lane-x",
            find: "acc = acc + vec4f(p.xyz * p.w, p.w);                       // (sum m x, sum m y, sum m z, sum m)",
            replace: "acc = acc + vec4f(p.xyz * p.x, p.x);                       // (sum m x, sum m y, sum m z, sum m)",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
        {
            name: "pseudo-cell-skipped",
            find: "if (c > grid_cells()) { return; }",
            replace: "if (c >= grid_cells()) { return; }",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
        {
            // every hub cell's level-0 entry goes stale (never written): a whole-cell miss on the hub fixture
            name: "hub-not-appended",
            find: "hubList[atomicAdd(&hubCounters[0], 1u)] = c;\n        return;",
            replace: "return;",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
    ]),
    "grid-centroid-hub": Object.freeze([
        {
            name: "hub-stride-off-by-one",
            find: "k = k + WG) {",
            replace: "k = k + WG + 1u) {",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
        {
            name: "hub-lane-partial-written",
            find: "if (valid && lid.x == 0u) { pyramid[c] = t; }",
            replace: "if (valid && lid.x == 0u) { pyramid[c] = acc; }",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
        {
            name: "hub-range-start-ignored",
            find: "for (var k = start + lid.x; k < start + count; k = k + WG) {",
            replace: "for (var k = lid.x; k < start + count; k = k + WG) {",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
    ]),
    "grid-downsample": Object.freeze([
        {
            // the design's named mutation
            name: "wrong-level-offset",
            find: "acc = acc + pyramid[P.childBase + child];",
            replace: "acc = acc + pyramid[P.childBase + child + 1u];",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
        {
            name: "three-children",
            find: "for (var dx = 0u; dx < 2u; dx = dx + 1u) {",
            replace: "for (var dx = 0u; dx < 1u; dx = dx + 1u) {",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
        {
            name: "parent-index-shifted",
            find: "pyramid[P.parentBase + pc] = acc;",
            replace: "pyramid[P.parentBase + pc + 1u] = acc;",
            minFactor: 10,
            test: PYRAMID_TEST,
        },
    ]),
    // P4-T12: G6 / G7 (spec 11.9 item 1: "the outside pseudo-cell dropped", "the last workgroup's rows skipped");
    // measured by test/sabotage/grid.test.ts through the far-field / near-field stages of grid-inspect.test.ts on
    // the fixture each row's comment names (random20k in 2D unless said otherwise)
    "grid-far-field": Object.freeze([
        {
            // the design's named mutation: measured on outside5, whose five far nodes ARE the pseudo-cell
            name: "pseudo-cell-term-dropped",
            find: "f = f + cell_force(pi, pyramid[grid_cells()]);",
            replace: "f = f + vec3f(0.0);",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // eps^2 dropped from every far-field denominator: the nearest cells of every level are over-weighted
            name: "softening-dropped",
            find: "let d2 = dot(d, d) + S.eps * S.eps;",
            replace: "let d2 = dot(d, d);",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // the finer level's own 3x3 (the near field's and the next level's work) is summed again at every level
            name: "own-neighbourhood-double-counted",
            find: "if (abs(cx - cl.x) <= 1 && abs(cy - cl.y) <= 1 && abs(cz - cl.z) <= 1) { continue; }",
            replace: "if (false) { continue; }",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // 2D keys a node by its (zero) z into plane floor(-gridMin.z * invCellSize): a cell that is not the
            // sorted one (measured in 2D; in 3D the line is dead and the row's report is the noise floor)
            name: "2d-z-plane-not-collapsed",
            find: "if (P.dim == 2u) { c0.z = 0; }",
            replace: "if (false) { c0.z = 0; }",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
    ]),
    "grid-near-field": Object.freeze([
        {
            // the own cell's Horvitz-Thompson scale counts the node itself: measured on the one-cell fixtures at
            // nearMax 8 (hubcell and onecell1025), where the sampling runs
            name: "own-cell-scale-off-by-one",
            find: "let others = select(count, count - 1u, own);",
            replace: "let others = count;",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // every over-full cell samples its first nearMax entries: not the oracle's draws (hubcell at nearMax 8)
            name: "window-not-hashed",
            find: "let jj = sortedIdx[start + (lowbias32(base ^ (k * 0x85EBCA6Bu)) % count)];",
            replace: "let jj = sortedIdx[start + (k % count)];",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // the contiguous window of P4-T10 (`[h, h + nearMax) mod count` from one hash): the sample the G4-F2 fix
            // replaced with independent draws; not the oracle's draws (hubcell at nearMax 8)
            name: "window-contiguous",
            find: "let jj = sortedIdx[start + (lowbias32(base ^ (k * 0x85EBCA6Bu)) % count)];",
            replace: "let jj = sortedIdx[start + ((lowbias32(base) + k) % count)];",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // the design's named mutation: the sorted-last node keeps K2's force (no near field, no gravity)
            name: "last-row-skipped",
            find: "let valid = t < P.n;",
            replace: "let valid = t + 1u < P.n;",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
    ]),
    "compact-scatter": Object.freeze([
        {
            // the flag test inverted: the UNflagged entries are scattered (at the flagged ones' offsets)
            name: "flag-test-inverted",
            find: "if (flags[i] != 0u) { out[offsets[i]] = queue[i]; }",
            replace: "if (flags[i] == 0u) { out[offsets[i]] = queue[i]; }",
            minFactor: 10,
            test: COMPACT_TEST,
        },
        {
            // the total drops the last flag: one short whenever the last entry is flagged (the alternating case's 4096 is)
            name: "total-from-offsets-only",
            find: "offsets[P.count - 1u] + flags[P.count - 1u]",
            replace: "offsets[P.count - 1u]",
            minFactor: 10,
            test: COMPACT_TEST,
        },
        {
            // the last entry is never scattered: its slot keeps the poison
            name: "last-element-skipped",
            find: "if (i >= P.count) { return; }",
            replace: "if (i >= P.count - 1u) { return; }",
            minFactor: 10,
            test: COMPACT_TEST,
        },
    ]),
    "dedupe-claim": Object.freeze([
        {
            // the claim lands at the entry's own index instead of its vertex's: the repeated vertex survives once
            // (owner[5] = 5) but the reversed tail keeps only its fixed point, so the surviving set is wrong
            name: "claims-own-slot",
            find: "atomicStore(&owner[queue[i]], i);",
            replace: "atomicStore(&owner[i], i);",
            minFactor: 10,
            test: COMPACT_TEST,
        },
        {
            // every claim writes 0: only entry 0 owns its vertex, so one entry survives
            name: "claims-zero",
            find: "atomicStore(&owner[queue[i]], i);",
            replace: "atomicStore(&owner[queue[i]], 0u);",
            minFactor: 10,
            test: COMPACT_TEST,
        },
        {
            // the last entry never claims: its vertex (a tail vertex nobody else names) is dropped
            name: "last-entry-unclaimed",
            find: "if (i >= count) { return; }",
            replace: "if (i >= count - 1u) { return; }",
            minFactor: 10,
            test: COMPACT_TEST,
        },
    ]),
    "dedupe-filter": Object.freeze([
        {
            // every entry is kept: the repeats survive and the count is the queue's length
            name: "keeps-everything",
            find: "select(0u, 1u, atomicLoad(&owner[v]) == i)",
            replace: "1u",
            minFactor: 10,
            test: COMPACT_TEST,
        },
        {
            // the inclusive rank written as an exclusive one: slot 0 keeps the poison and the last write lands past the count
            name: "inclusive-off-by-one",
            find: "out[base + inclusive - 1u] = v;",
            replace: "out[base + inclusive] = v;",
            minFactor: 10,
            test: COMPACT_TEST,
        },
        {
            // the block's aggregate is lane 0's own keep bit: the count word and every base are wrong
            name: "aggregate-from-lane-zero",
            find: "if (lid.x == WG - 1u) { base = atomicAdd(&outCount[P.outIndex], inclusive); }",
            replace: "if (lid.x == 0u) { base = atomicAdd(&outCount[P.outIndex], inclusive); }",
            minFactor: 10,
            test: COMPACT_TEST,
        },
    ]),
    // P8-T4: every row is measured by frontierReport (test/helpers/frontier.ts) through the frontier test; the
    // rotation and fused-slot rows are measured again by the BFS suites of P8-T6 / P8-T7 once those land
    "frontier-finalize": Object.freeze([
        {
            // the ceil that wraps above 2^32 - wg: the largest u32 count yields 0 groups (caught by the ladder)
            name: "ceil-wraps",
            find: "count / P.wg + select(0u, 1u, count % P.wg != 0u)",
            replace: "(count + P.wg - 1u) / P.wg",
            minFactor: 10,
            test: FRONTIER_TEST,
        },
        {
            // the second row of the 2D split floored: a group count that is not a multiple of the per-dimension
            // limit loses its last row (the ladder, and the 17M poison case)
            name: "second-row-floored",
            find: "(groups + MAX_WORKGROUPS_PER_DIM - 1u) / MAX_WORKGROUPS_PER_DIM",
            replace: "groups / MAX_WORKGROUPS_PER_DIM",
            minFactor: 10,
            test: FRONTIER_TEST,
        },
        {
            // the rotation writes 0: the first boundary rotates nothing in and every traversal is the source alone
            name: "rotation-dropped",
            find: "atomicStore(&counters[0], next);                               // the rotation",
            replace: "atomicStore(&counters[0], 0u);",
            minFactor: 10,
            test: FRONTIER_TEST,
        },
        {
            // the fused slot sized per invocation: a fused level of `next` entries expands only its first ceil(next / wg)
            name: "fused-slot-per-invocation",
            find: "write_slot_groups(2u, next, next);",
            replace: "write_slot(2u, next);",
            minFactor: 10,
            test: FRONTIER_TEST,
        },
        {
            // a boundary that finds done set keeps counting: level and visitedCount move on every recorded level past the end
            name: "done-boundary-keeps-counting",
            find: "if (atomicLoad(&counters[15]) != 0u) {                         // done already: a no-op level the host recorded past the end",
            replace: "if (false) {",
            minFactor: 10,
            test: FRONTIER_TEST,
        },
        {
            // role 1 counts a two-phase level whether or not role 0 chose one
            name: "role-1-counts-every-level",
            find: "if (args[4u * P.slotBase] == 0u) {                             // role 0 did not choose the two-phase path (done, fused or bottom-up): nothing to size, nothing to count",
            replace: "if (false) {",
            minFactor: 10,
            test: FRONTIER_TEST,
        },
        {
            // P8-T7: the fused threshold inverted -- every depth stays right (both paths are exact), so only the
            // exact fusedLevels / twoPhaseLevels count against the oracle's level sizes catches it (bfsReport's
            // rmat14 run at the default threshold; a counter, never a timing)
            name: "fused-threshold-inverted",
            find: "} else if (next < P.fusedMax) {",
            replace: "} else if (next >= P.fusedMax) {",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // P8-T8: the growing half of Beamer's switch-into-bottom-up test inverted -- every depth stays right
            // (both directions are exact), so only the direction model of bfsReport (rmat14's per-boundary direction
            // words and switch count against the host replay) catches it; a counter, never a timing
            name: "growing-test-inverted",
            find: "&& next > finished) { direction = 1u; }",
            replace: "&& next < finished) { direction = 1u; }",
            minFactor: 10,
            test: BFS_TEST,
        },
    ]),
    // P8-T5: every row is measured by advanceReport (test/helpers/advance.ts) through the advance test
    "advance-expand": Object.freeze([
        {
            // the unscanned degrees are stored: the binary search walks a non-monotone array and every lane gets the
            // wrong source (the helper itself is prelude code and is not a per-kernel row)
            name: "scan-result-dropped",
            find: "sh[lid.x] = inclusive;",
            replace: "sh[lid.x] = deg;",
            minFactor: 10,
            test: ADVANCE_TEST,
        },
        {
            // lower_bound instead of upper_bound: off by one at every block boundary (the reversed frontier and the
            // grid levels read a neighbouring row's arc there)
            name: "lower-bound-not-upper",
            find: "if (sh[mid] > p) { hi = mid; } else { lo = mid + 1u; }",
            replace: "if (sh[mid] >= p) { hi = mid; } else { lo = mid + 1u; }",
            minFactor: 10,
            test: ADVANCE_TEST,
        },
        {
            // the aggregate is reserved once per LANE: the queue interleaves and the three counters explode
            name: "per-lane-reservation",
            find: "if (lid.x == 0u) {\n        base = atomicAdd(&counters[8], aggregate);",
            replace: "{\n        base = atomicAdd(&counters[8], aggregate);",
            minFactor: 10,
            test: ADVANCE_TEST,
        },
        {
            // the last entry of the frontier is never loaded: its arcs are missing from the queue and the counters
            name: "last-entry-skipped",
            find: "if (i < count) {                                                 // guarded loads into locals (3.5 rule 1)",
            replace: "if (i + 1u < count) {",
            minFactor: 10,
            test: ADVANCE_TEST,
        },
        {
            // the overflow detector counts nothing: caught by the unclamped word, which every case pins
            name: "unclamped-not-counted",
            find: "atomicAdd(&counters[9], aggregate);",
            replace: "atomicAdd(&counters[9], 0u);",
            minFactor: 10,
            test: ADVANCE_TEST,
        },
        {
            // the row is not clipped to the bound window (P8-T12; the twin of degree's rebase-ignored): invisible on the
            // first window, wrong on every later one -- the windowed star hub of advanceReport re-counts the whole row
            name: "clip-ignored",
            find: "let lo = max(rowPtr[v], P.arcBase);",
            replace: "let lo = rowPtr[v];",
            minFactor: 10,
            test: ADVANCE_TEST,
        },
    ]),
    // P8-T6: every row is measured by bfsReport (test/helpers/bfs.ts) through the BFS test
    "bfs-contract": Object.freeze([
        {
            // the claim is an exchange, not a min: a later level overwrites a smaller depth (a depth miss)
            name: "claim-not-a-min",
            find: "let old = atomicMin(&depth[v], claim);",
            replace: "let old = atomicExchange(&depth[v], claim);",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // every same-level claimant appends: duplicates in the next frontier (visitedCount and order miss)
            name: "same-level-claimants-append",
            find: "won = select(0u, 1u, old == INVALID_INDEX);",
            replace: "won = select(0u, 1u, old >= claim);",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the claim writes the level itself: every depth from level 1 on is one too small
            name: "claim-is-the-level",
            find: "let claim = atomicLoad(&counters[11]) + 1u;",
            replace: "let claim = atomicLoad(&counters[11]);",
            minFactor: 10,
            test: BFS_TEST,
        },
    ]),
    "sssp-pred": Object.freeze([
        {
            // a same-depth neighbour attains: level consistency breaks (parent miss against the host rule)
            name: "same-depth-attains",
            find: "tight = (du + 1u) == dv;",
            replace: "tight = du == dv;",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the largest predecessor wins: the grid's interior nodes have two (parent miss)
            name: "largest-predecessor",
            find: "atomicMin(&pred[v], select(a, u, P.predKind == 1u));",
            replace: "atomicMax(&pred[v], select(a, u, P.predKind == 1u));",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the last row is never visited: from the LAST index of the path its one child keeps INVALID_INDEX
            name: "last-row-skipped",
            find: "for (var u = first; u < P.n; u = u + P.stride) {",
            replace: "for (var u = first; u + 1u < P.n; u = u + P.stride) {",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the per-invocation form: every traversal under the dispatch cap passes, so the one-workgroup case of
            // the BFS test is what catches it (rows 256 and up keep INVALID_INDEX)
            name: "stride-dropped",
            find: "for (var u = first; u < P.n; u = u + P.stride) {",
            replace: "for (var u = first; u < P.n; u = P.n) {",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // P8-T9: every arc from a reached node into a reached node is "tight" (du + w >= dv always holds on a
            // settled dist, so <= would be a no-op; >= admits every non-tight arc): predArc names a non-tight arc
            name: "attains-is-ge",
            find: "tight = (dv != F32_INF_BITS) && (bitcast<u32>(bitcast<f32>(du) + w) == dv);",
            replace: "tight = (dv != F32_INF_BITS) && (bitcast<u32>(bitcast<f32>(du) + w) >= dv);",
            minFactor: 10,
            test: SSSP_TEST,
        },
        {
            // P8-T9: the 2026-09-23 rule brought back inside a plateau -- any equal-distance tight arc is admitted,
            // so zeroPlateau walks j -> j - 1 into the 0 <-> 1 cycle (the chain check fails at its bound)
            name: "plateau-step-ignored",
            find: "admit = (du == dv) && (hu + 1u == hv);",
            replace: "admit = (du == dv);",
            minFactor: 10,
            test: SSSP_TEST,
        },
        {
            // P8-T9: no root but the source, so every node above distance 0 keeps hops INVALID_INDEX and the orphan
            // word is non-zero: the driver refuses the result as E_VALIDATION
            name: "roots-unseeded",
            find: "if (P.mode == 0u && below) { atomicMin(&pred[hb + v], 0u); }",
            replace: "if (false) { atomicMin(&pred[hb + v], 0u); }",
            minFactor: 10,
            test: SSSP_TEST,
        },
    ]),
    // P8-T7: every row is measured by bfsReport's always-fused runs (fusedMax U32_MAX) through the BFS test
    "bfs-fused": Object.freeze([
        {
            // the claim runs past the row's end: the lanes beyond the degree read the next rows' arcs (the robustness
            // clamp at the end of colIdx) and claim their targets at this level (a depth miss)
            name: "claim-outside-the-guard",
            find: "if (p < deg) {                                               // guarded claim into locals",
            replace: "if (true) {",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // a scan round dropped: the appends land at the wrong slots and the strip's total is wrong
            name: "fused-scan-round-dropped",
            find: "for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan of won (bfs-contract's, verbatim)",
            replace: "for (var s = 1u; s < WG; s = s * 4u) {",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the claim writes the level itself: every fused depth from level 1 on is one too small
            name: "fused-claim-is-the-level",
            find: "let claim = atomicLoad(&counters[11]) + 1u;\n    if (lid.x == 0u) {",
            replace: "let claim = atomicLoad(&counters[11]);\n    if (lid.x == 0u) {",
            minFactor: 10,
            test: BFS_TEST,
        },
    ]),
    // P8-T8: every row is measured by bfsReport's forced-bottom-up runs (alpha U32_MAX, beta 0: the 500-node path
    // from its middle, the hub-clique fixture) and its rmat14 runs at the default rule, through the BFS test
    "bfs-bottom-up": Object.freeze([
        {
            // the early exit removed: every depth stays right, so the answer never catches it -- the arcsScanned word
            // does: on the hub-clique fixture each of the 253 claims reads one in-arc with the exit and the whole
            // 254-arc row without it (the check allows one extra read per claim)
            name: "early-exit-removed",
            find: "{ won = 1u; break; }",
            replace: "{ won = 1u; }",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // a stale entry (claimed since the rebuild) is claimed again at a later level: a depth miss on the path
            // from its middle, whose list is stale from the second bottom-up level on
            name: "stale-entries-claimed",
            find: "if (atomicLoad(&depth[v]) == INVALID_INDEX) {                // a stale entry, claimed since the rebuild, is skipped",
            replace: "if (true) {",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the claim writes the level itself: every bottom-up depth is one too small
            name: "bottom-up-claim-is-the-level",
            find: "let claim = atomicLoad(&counters[11]) + 1u;\n    var won = 0u;\n    var v = 0u;\n    var reads = 0u;",
            replace: "let claim = atomicLoad(&counters[11]);\n    var won = 0u;\n    var v = 0u;\n    var reads = 0u;",
            minFactor: 10,
            test: BFS_TEST,
        },
    ]),
    "bfs-bitset-build": Object.freeze([
        {
            // a store instead of an or: two frontier vertices in one word keep one bit (the path's two ends of a
            // level share a word near the middle), so a vertex goes unclaimed at its level
            name: "or-is-a-store",
            find: "atomicOr(&bits[P.bitsBase + (v >> 5u)], 1u << (v & 31u));",
            replace: "atomicStore(&bits[P.bitsBase + (v >> 5u)], 1u << (v & 31u));",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the bit lands in the wrong word: the sweep tests word u >> 5 and finds nothing (or a stranger's bit)
            name: "bit-of-the-wrong-word",
            find: "(v >> 5u)",
            replace: "(v >> 4u)",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the last frontier entry's bit is never set: the vertices only it reaches go unclaimed (one side of the
            // path from its middle)
            name: "last-frontier-entry-unset",
            find: "if (i >= atomicLoad(&counters[0])) { return; }                   // frontierCount; no barrier follows",
            replace: "if (i + 1u >= atomicLoad(&counters[0])) { return; }",
            minFactor: 10,
            test: BFS_TEST,
        },
    ]),
    "bfs-unvisited-flags": Object.freeze([
        {
            // every vertex with an in-arc is listed, claimed or not: unvisitedListLen misses the oracle's complement
            // on every rebuild but the first
            name: "everyone-listed",
            find: "let listed = unv && (inDegree[v] != 0u);",
            replace: "let listed = (inDegree[v] != 0u);",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // only the vertices nobody points at are listed: unvisitedListLen misses, and no bottom-up level claims
            name: "in-degree-test-inverted",
            find: "let listed = unv && (inDegree[v] != 0u);",
            replace: "let listed = unv && (inDegree[v] == 0u);",
            minFactor: 10,
            test: BFS_TEST,
        },
        {
            // the in-degree is summed instead of the out-degree: caught on a DIRECTED fixture (the path built from
            // vertex 0, whose in-degree 0 differs from its out-degree 1), where unvisitedDegreeSum misses the model
            name: "in-degree-summed",
            find: "select(0u, outDegree[v], unv)",
            replace: "select(0u, inDegree[v], unv)",
            minFactor: 10,
            test: BFS_TEST,
        },
    ]),
    "sssp-relax": Object.freeze([
        {
            // the claim is an exchange, not a min: a later larger candidate overwrites a smaller distance (dist miss)
            name: "min-is-a-store",
            find: "let old = atomicMin(&dist[v], bits);",
            replace: "let old = atomicExchange(&dist[v], bits);",
            minFactor: 10,
            test: SSSP_TEST,
        },
        {
            // the weight is ignored: dist is the hop count (dist miss on every non-unit fixture)
            name: "hop-counts",
            find: "let nd = du + select(1.0, weights[a], HAS_WEIGHTS);",
            replace: "let nd = du + 1.0;",
            minFactor: 10,
            test: SSSP_TEST,
        },
        {
            // the cutoff excludes the node that attains it exactly (the <= case of the integer-cutoff fixture)
            name: "cutoff-exclusive",
            find: "if (nd > cutoff) { continue; }",
            replace: "if (nd >= cutoff) { continue; }",
            minFactor: 10,
            test: SSSP_TEST,
        },
        {
            // the pass-through never returns a far entry to the near pile: on the weight-2 path only the first
            // bucket is reached and 48 nodes stay at +Inf (dist miss; no round-count timing needed)
            name: "far-never-returns",
            find: "if (du < threshold) {\n                let q = atomicAdd(&counters[1], 1u);",
            replace: "if (false) {\n                let q = atomicAdd(&counters[1], 1u);",
            minFactor: 10,
            test: SSSP_TEST,
        },
    ]),
    "bf-relax": Object.freeze([
        {
            // the compare-exchange result is ignored: a lane whose exchange failed gives up as if it had changed
            // something; the next round repairs the lost update, so dist never misses -- the witness is the retry
            // bound, which the real kernel's losing lanes exhaust under maxRetries 1 and this mutant never reaches
            name: "exchange-result-ignored",
            find: "if (r.exchanged) { atomicStore(&flags[0], 1u); break; }",
            replace: "{ atomicStore(&flags[0], 1u); break; }",
            minFactor: 10,
            test: BF_TEST,
        },
        {
            // relaxes only when NOT improving: everything but the source stays +Inf (dist miss everywhere)
            name: "improvement-test-inverted",
            find: "if (!(nd < bitcast<f32>(cur))) { break; }",
            replace: "if (nd < bitcast<f32>(cur)) { break; }",
            minFactor: 10,
            test: BF_TEST,
        },
        {
            // the reverse direction of an undirected edge is never relaxed (dist miss on every undirected fixture)
            name: "reverse-direction-dropped",
            find: "if (UNDIRECTED) {",
            replace: "if (false) {",
            minFactor: 10,
            test: BF_TEST,
        },
    ]),
    "closeness-sweep": Object.freeze([
        {
            // a claim is counted without its atomicOr result: every lane whose SIMD group loaded the visited word
            // together counts the vertex (the funnel's middle layer reaches one vertex from four lanes of every
            // subgroup at once; newCount, reached and sum then overshoot)
            name: "already-visited-recounted",
            find: "let fresh = mask & ~old;",
            replace: "let fresh = mask;",
            minFactor: 10,
            test: CLOSENESS_TEST,
        },
        {
            // the won bits never reach the next region: the level-1 list is compacted from the flags but every
            // frontier mask is 0, so nothing at distance 2 or beyond is ever claimed
            name: "next-bits-not-set",
            find: "atomicOr(&bits[nextBase + x], fresh);",
            replace: "atomicOr(&bits[nextBase + x], 0u);",
            minFactor: 10,
            test: CLOSENESS_TEST,
        },
        {
            // every fresh bit is tallied to source 0: the other sources' counts stay 0 and source 0's overshoot
            name: "source-word-not-bit",
            find: "let s = firstTrailingBit(b);",
            replace: "let s = 0u;",
            minFactor: 10,
            test: CLOSENESS_TEST,
        },
    ]),
    "closeness-reduce": Object.freeze([
        {
            // the claims of a level are summed at the level instead of the distance (one short everywhere)
            name: "distance-is-the-level",
            find: "let d = level + 1u;",
            replace: "let d = level;",
            minFactor: 10,
            test: CLOSENESS_TEST,
        },
        {
            // reached never accumulates (stays 0 for every source)
            name: "reached-not-accumulated",
            find: "atomicLoad(&perSource[32u + s]) + c",
            replace: "atomicLoad(&perSource[32u + s])",
            minFactor: 10,
            test: CLOSENESS_TEST,
        },
        {
            // the carry of the 64-bit add is dropped: caught by the hand-seeded role-0 dispatch alone (no runnable
            // fixture's per-source sum crosses 2^32), whose BigInt sum reads 4295028736n instead of 8589996032n
            name: "carry-dropped",
            find: "select(0u, 1u, lo < before)",
            replace: "0u",
            minFactor: 10,
            test: CLOSENESS_TEST,
        },
    ]),
});

/**
 * Rows added on the P1 kernels by P3-T5's review fix (docs/decisions/G3.md, the review of 2026-09-16), kept out of
 * SABOTAGE because test/sabotage/coverage.test.ts pins the P1 rows by name and test/sabotage/fa2-skeleton.test.ts
 * requires every K4 row to name the skeleton test (both P1-T5 files): test/sabotage/fa2.test.ts runs these rows with
 * the P3 checks (the re-synchronised trace legs) exactly as it runs SABOTAGE's, with the same find-uniqueness check.
 */
export const SABOTAGE_P3_ADDENDUM: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({
    "fa2-speed-finalize": Object.freeze([
        {
            // CONTRACT DECISION K4-1 (G3-F6): the halving predicate at its exact-equality knife edge. After load() the
            // paper-mode traction is EXACTLY half the swing (oldForce = 0), so `>=` halves the efficiency at every
            // first iteration where `>` (the port's `swing / traction > 2`) never does; the difference is a factor 2
            // in speedEfficiency from iteration 1 on, measured 7.4e+3x the re-synchronised f32 tolerance on karate
            name: "halving-at-exact-equality",
            find: "swing > 2.0 * tr",
            replace: "swing >= 2.0 * tr",
            minFactor: 10,
            test: TRACE_TEST,
        },
    ]),
});

const FR_INSPECT_TEST = "test/layouts/fr-inspect.test.ts";
const FR_TRACE_TEST = "test/layouts/fr-trace.test.ts";
const SE_INSPECT_TEST = "test/layouts/se-inspect.test.ts";
const SE_TRACE_TEST = "test/layouts/se-trace.test.ts";

/** The P5 rows (PD-8): the FR and spring-electrical BRANCHES of the four FA2 kernels; measured by test/sabotage/fr.test.ts and se.test.ts only, never against the FA2 checks (which never reach these lines). */
export const SABOTAGE_P5: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({
    "fa2-attraction": Object.freeze([
        {
            name: "fr-attraction-k-multiplied",
            find: "if (LAW == 1u) { weight = length(d) / P.frK; }",
            replace: "if (LAW == 1u) { weight = length(d) * P.frK; }",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "fr-attraction-linear",
            find: "weight = length(d) / P.frK;",
            replace: "weight = 1.0 / P.frK;",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "fr-attraction-law-skipped",
            find: "if (LAW == 1u) { weight = length(d) / P.frK; }",
            replace: "if (LAW == 3u) { weight = length(d) / P.frK; }",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "spring-rest-length-dropped",
            find: "weight = P.springCoefficient * (len - P.springLength) / len;",
            replace: "weight = P.springCoefficient;",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
        {
            name: "spring-sign-flipped",
            find: "weight = P.springCoefficient * (len - P.springLength) / len;",
            replace: "weight = P.springCoefficient * (P.springLength - len) / len;",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
        {
            name: "spring-law-skipped",
            find: "if (LAW == 2u) { weight = P.springCoefficient",
            replace: "if (LAW == 3u) { weight = P.springCoefficient",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
    ]),
    "fa2-repulsion-exact": Object.freeze([
        {
            name: "fr-repulsion-inverse-square",
            find: "f = f + d * (P.frK * P.frK / d2);",
            replace: "f = f + d * (P.frK * P.frK / (d2 * sqrt(d2)));",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "fr-repulsion-k-linear",
            find: "(P.frK * P.frK / d2)",
            replace: "(P.frK / d2)",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "fr-repulsion-law-skipped",
            find: "if (LAW == 1u) { f = f + d",
            replace: "if (LAW == 3u) { f = f + d",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "coulomb-sign-flipped",
            find: "(-P.coulomb * pi.w * o.w / (d2 * sqrt(d2)))",
            replace: "(P.coulomb * pi.w * o.w / (d2 * sqrt(d2)))",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
        {
            name: "coulomb-inverse-linear",
            find: "pi.w * o.w / (d2 * sqrt(d2))",
            replace: "pi.w * o.w / d2",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
        {
            name: "coulomb-mass-dropped",
            find: "(-P.coulomb * pi.w * o.w /",
            replace: "(-P.coulomb /",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
    ]),
    "fa2-integrate": Object.freeze([
        {
            name: "fr-temperature-cap-dropped",
            find: "dp = f * (min(mag, t) / mag);",
            replace: "dp = f;",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "fr-fixed-moves",
            find: "if (mag > 0.0 && !fixed) {",
            replace: "if (mag > 0.0) {",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "fr-apply-skipped",
            find: "if (APPLY == 1u) {",
            replace: "if (APPLY == 3u) {",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "euler-drag-sign",
            find: "let fd = f - P.dragCoefficient * v;",
            replace: "let fd = f + P.dragCoefficient * v;",
            minFactor: 10,
            test: SE_TRACE_TEST,
        },
        // measured through the 10-iteration trajectory, not the one-iteration stages: from v = 0 the step (dt / m) F exceeds
        // ngraph's unit speed clamp on every karate node in iteration 1, so the clamped velocity, dp and 0.5 m |v|^2 are the
        // same whatever the mass; the mass reaches the output only once a node's |dt F / m| falls under 1 (P5-T7 finding)
        {
            name: "euler-mass-ignored",
            find: "v = v + (P.timeStep / p.w) * fd;",
            replace: "v = v + P.timeStep * fd;",
            minFactor: 10,
            test: SE_TRACE_TEST,
        },
        {
            name: "euler-clamp-dropped",
            find: "if (sp > 1.0) { v = v / sp; }",
            replace: "if (sp > 1.0e30) { v = v / sp; }",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
        {
            name: "euler-velocity-not-stored",
            find: "if (!fixed) { store_old(i, v); }",
            replace: "if (fixed) { store_old(i, v); }",
            minFactor: 10,
            test: SE_TRACE_TEST,
        },
    ]),
    "fa2-stats-finalize": Object.freeze([
        {
            name: "fr-temperature-not-traced",
            find: "T[P.iterationIndex].modelScalar = S.temperature;",
            replace: "T[P.iterationIndex].modelScalar = 0.0;",
            minFactor: 10,
            test: FR_TRACE_TEST,
        },
        {
            name: "fr-temperature-state-stale",
            find: "S.temperature = P.temperature;",
            replace: "S.temperature = S.temperature;",
            minFactor: 10,
            test: FR_INSPECT_TEST,
        },
        {
            name: "fr-stats-mode-skipped",
            find: "if (STATS_MODE == 1u) {",
            replace: "if (STATS_MODE == 3u) {",
            minFactor: 10,
            test: FR_TRACE_TEST,
        },
        {
            name: "ke-not-folded",
            find: "ke = ke + q.swingTraction.x;",
            replace: "ke = ke + 0.0 * q.swingTraction.x;",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
        {
            name: "ke-state-not-written",
            find: "S.kineticEnergy = tKe;",
            replace: "S.kineticEnergy = 0.0;",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
        {
            name: "ke-stats-mode-skipped",
            find: "if (STATS_MODE == 2u) {",
            replace: "if (STATS_MODE == 3u) {",
            minFactor: 10,
            test: SE_INSPECT_TEST,
        },
    ]),
});

const TIERS_TEST = "test/primitives/tiers.test.ts";
const TIERS_INSPECT_TEST = "test/layouts/tiers-inspect.test.ts";
const ATTRACTION_WINDOWED_TEST = "test/layouts/attraction-windowed.test.ts";

/** The P4 tier rows (PD-21): the TIER 1 / 2 branches of the three row-walking kernels; measured by test/sabotage/tiers.test.ts only (the thread-per-row suites never reach these lines). The K2 rows are appended by P4-T6 and measured by the K2 stage check of test/layouts/tiers-inspect.test.ts; the window row by P4-T7; the fa2-stats-finalize rows (K1's grid block) by P4-T12, measured by test/sabotage/grid.test.ts. */
export const SABOTAGE_P4_TIERS: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({
    "segmented-reduce": Object.freeze([
        {
            // every lane walks every arc of its row: a 32-lane row is summed 32 times over
            name: "tier1-lane-stride-one",
            find: "for (var arc = a0 + lane; arc < a1; arc = arc + step) {",
            replace: "for (var arc = a0 + lane; arc < a1; arc = arc + 1u) {",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // the tree skips the 8-, 2- and 1-lane steps: lane 0 holds a partial of the row
            name: "tier1-tree-step-quartered",
            find: "for (var s = 16u; s >= 1u; s = s / 2u) {",
            replace: "for (var s = 16u; s >= 1u; s = s / 4u) {",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // a workgroup claims 16 rows it can only fold 8 of: every other mid-tier row keeps the sentinel
            name: "tier1-rows-per-group-doubled",
            find: "row = P.start + g * (WG / 32u) + lid / 32u;",
            replace: "row = P.start + g * (WG / 16u) + lid / 32u;",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // lane 0's own partial is written instead of the workgroup total
            name: "tier2-lane-partial-written",
            find: "if (valid && lid == 0u) { finish(i, t); }",
            replace: "if (valid && lid == 0u) { finish(i, acc); }",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // the last row of every tier range is skipped and keeps the sentinel (the plan's `row <= P.end` form is
            // inert: plan1d issues exactly one workgroup per TIER 2 row, so no workgroup ever sees row == P.end, and a
            // TIER 1 lane past the end folds a real row correctly)
            name: "tier-last-row-skipped",
            find: "let valid = row < P.end;",
            replace: "let valid = row + 1u < P.end;",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // the workgroup tree always sums: min / max of a hub row become its sum
            name: "tier2-reduce-op-sum",
            find: "let t = wg_reduce_f32(acc, lid, OP);",
            replace: "let t = wg_reduce_f32(acc, lid, 0u);",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // the rebase uniform's accumulate flag is ignored: a row split across windows keeps its last window's
            // partial, and under the tiers every window overwrites every row outside it with the identity (P4-T7,
            // PD-8; measured by the windowed leg, test/sabotage/tiers.test.ts dispatches on the `test` field)
            name: "accumulate-ignored",
            find: "fn finish(i: u32, acc: f32) { out[i] = select(acc, comb(out[i], acc), P.accumulate == 1u); }",
            replace: "fn finish(i: u32, acc: f32) { out[i] = acc; }",
            minFactor: 10,
            test: SEGMENTED_REDUCE_TEST,
        },
    ]),
    "spmv-pull": Object.freeze([
        {
            // every lane walks every in-arc of its row: a 32-lane row is summed 32 times over
            name: "tier1-lane-stride-one",
            find: "for (var arc = a0 + lane; arc < a1; arc = arc + step) {",
            replace: "for (var arc = a0 + lane; arc < a1; arc = arc + 1u) {",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // the tree skips the 8-, 2- and 1-lane steps: lane 0 holds a partial of the row
            name: "tier1-tree-step-quartered",
            find: "for (var s = 16u; s >= 1u; s = s / 2u) {",
            replace: "for (var s = 16u; s >= 1u; s = s / 4u) {",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // a workgroup claims 16 rows it can only fold 8 of: every other mid-tier row keeps the sentinel
            name: "tier1-rows-per-group-doubled",
            find: "row = P.start + g * (WG / 32u) + lid / 32u;",
            replace: "row = P.start + g * (WG / 16u) + lid / 32u;",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // lane 0's own partial is written instead of the workgroup total
            name: "tier2-lane-partial-written",
            find: "if (valid && lid == 0u) { finish(v, t); }",
            replace: "if (valid && lid == 0u) { finish(v, acc); }",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // the last row of every tier range is skipped and keeps the sentinel (the plan's `row <= P.n` form is
            // inert, as segmented-reduce's row of the same name explains)
            name: "tier-last-row-skipped",
            find: "let valid = row < P.n;",
            replace: "let valid = row + 1u < P.n;",
            minFactor: 10,
            test: TIERS_TEST,
        },
        {
            // TIER 0 starts at 2 P.start: the rows [P.start, 2 P.start) are never visited and keep the sentinel (dropping
            // P.start altogether is inert: the grid-stride loop re-walks the tier rows and still reaches every row below n)
            name: "tier0-start-doubled",
            find: "for (var row = linear_id(wid, lane) + P.start; row < P.n; row = row + P.stride) {",
            replace: "for (var row = linear_id(wid, lane) + 2u * P.start; row < P.n; row = row + P.stride) {",
            minFactor: 10,
            test: TIERS_TEST,
        },
    ]),
    // P4-T6: the K2 tier branches, measured by the layout's K2 stage on rmat14 against the f64 oracle within the
    // analytic per-node bound (test/helpers/attraction-check.ts attractionTierWorstFactor); the window row by the
    // kernel-level window check (attractionWindowedWorstFactor), whose poison tail the mutant folds
    "fa2-attraction": Object.freeze([
        {
            // every lane walks every arc of its row: a 32-lane row is summed 32 times over (TIER 0 steps by 1 already)
            name: "tier1-lane-stride-one",
            find: "for (var a = a0 + lane; a < a1; a = a + step) {",
            replace: "for (var a = a0 + lane; a < a1; a = a + 1u) {",
            minFactor: 10,
            test: TIERS_INSPECT_TEST,
        },
        {
            // the tree skips the 8-, 2- and 1-lane steps: lane 0 holds a partial of the row
            name: "tier1-tree-step-quartered",
            find: "for (var s = 16u; s >= 1u; s = s / 2u) {",
            replace: "for (var s = 16u; s >= 1u; s = s / 4u) {",
            minFactor: 10,
            test: TIERS_INSPECT_TEST,
        },
        {
            // a workgroup claims 16 rows it can only fold 8 of: every other mid-tier row keeps the previous force
            name: "tier1-rows-per-group-doubled",
            find: "row = P.hiEnd + g * (WG / 32u) + lid / 32u;",
            replace: "row = P.hiEnd + g * (WG / 16u) + lid / 32u;",
            minFactor: 10,
            test: TIERS_INSPECT_TEST,
        },
        {
            // lane 0's own partial is written instead of the workgroup total
            name: "tier2-lane-partial-written",
            find: "if (valid && lid == 0u) { finish(i, t.xyz); }",
            replace: "if (valid && lid == 0u) { finish(i, f); }",
            minFactor: 10,
            test: TIERS_INSPECT_TEST,
        },
        {
            // the last TIER 2 row is never folded and keeps the zero the buffer held (the plan's `end = P.midEnd` form
            // is inert: the TIER 2 dispatch issues exactly hiEnd workgroups, every one below midEnd as well)
            name: "tier2-end-off-by-one",
            find: "var end = P.hiEnd;",
            replace: "var end = P.hiEnd - 1u;",
            minFactor: 10,
            test: TIERS_INSPECT_TEST,
        },
        {
            // the arc window's rebase ignored: a windowed dispatch reads past its copy into the poison tail, whose
            // INVALID_INDEX neighbours read pos out of bounds (WGSL clamps) and change the force by order 1. The
            // rebase of row_force_dense, the fold the windowed check's TIER 0 dispatch runs
            name: "tier0-rebase-ignored",
            find: "let k = arc - P.arcBase;",
            replace: "let k = arc;",
            minFactor: 10,
            test: ATTRACTION_WINDOWED_TEST,
        },
    ]),
    // P4-T12: K1's grid block (PD-14), measured by test/sabotage/grid.test.ts through the k1 stage of
    // grid-inspect.test.ts (the K1 grid block of iteration 2) on the fixture each row's comment names
    "fa2-stats-finalize": Object.freeze([
        {
            // the extent floor dropped: on an all-coincident, all-fixed start the fold's bbox and rms radius are 0,
            // so the extent is 0, invCellSize 1 / 0 and eps 0 (the floor is what keeps the frame finite)
            name: "grid-extent-unfloored",
            find: "let extent = max(min(bboxExtent, P.extentFactor * S.rmsRadius), GRID_EXTENT_FLOOR);",
            replace: "let extent = min(bboxExtent, P.extentFactor * S.rmsRadius);",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // the rms bound dropped: on isolated with its strays started 5,000 units out (grid.test.ts strayStart) the
            // strays' bounding box becomes the extent and the core collapses into a few cells
            name: "grid-rms-bound-dropped",
            find: "min(bboxExtent, P.extentFactor * S.rmsRadius)",
            replace: "bboxExtent",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
        {
            // the softening zeroed from iteration 2 on (the first build takes the host's eps): the k1 stage reads it
            name: "grid-eps-zero",
            find: "S.eps = 0.25 * cellSize;",
            replace: "S.eps = 0.0;",
            minFactor: 10,
            test: GRID_INSPECT_TEST,
        },
    ]),
});

const GRID_LAW_TEST = "test/layouts/grid-law.test.ts";

/**
 * The P4 LAW rows (PD-21, PD-22; P4-T13): the LAW 1 / 2 branches of grid-far-field (the per-cell law of G6) and
 * grid-near-field (K3's pair law in G7, the six K3 rows of P5-T7 transcribed onto `pair_force`), measured by
 * test/sabotage/grid.test.ts through the exact-vs-grid comparison of the FR / spring simulations
 * (test/helpers/grid-law.ts lawCheck): a law mutation moves the RMS by order 1 against the 5 % tolerance.
 */
export const SABOTAGE_P4_LAW: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({
    "grid-far-field": Object.freeze([
        {
            name: "fr-far-k-linear",
            find: "(P.frK * P.frK * q.w / d2)",
            replace: "(P.frK * q.w / d2)",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "fr-far-law-skipped",
            find: "if (LAW == 1u) { return d * (P.frK",
            replace: "if (LAW == 3u) { return d * (P.frK",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "fr-far-count-dropped",
            find: "P.frK * P.frK * q.w / d2",
            replace: "P.frK * P.frK / d2",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "coulomb-far-sign",
            find: "(-P.coulomb * pi.w * q.w / (d2 * sqrt(d2)))",
            replace: "(P.coulomb * pi.w * q.w / (d2 * sqrt(d2)))",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "coulomb-far-inverse-linear",
            find: "pi.w * q.w / (d2 * sqrt(d2))",
            replace: "pi.w * q.w / d2",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "coulomb-far-law-skipped",
            find: "if (LAW == 2u) { return d * (-P.coulomb",
            replace: "if (LAW == 3u) { return d * (-P.coulomb",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
    ]),
    "grid-near-field": Object.freeze([
        {
            name: "fr-near-inverse-square",
            find: "if (LAW == 1u) { return d * (P.frK * P.frK / d2); }",
            replace: "if (LAW == 1u) { return d * (P.frK * P.frK / (d2 * sqrt(d2))); }",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "fr-near-k-linear",
            find: "(P.frK * P.frK / d2)",
            replace: "(P.frK / d2)",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "fr-near-law-skipped",
            find: "if (LAW == 1u) { return d",
            replace: "if (LAW == 3u) { return d",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "coulomb-near-sign",
            find: "(-P.coulomb * pi.w * o.w / (d2 * sqrt(d2)))",
            replace: "(P.coulomb * pi.w * o.w / (d2 * sqrt(d2)))",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "coulomb-near-inverse-linear",
            find: "pi.w * o.w / (d2 * sqrt(d2))",
            replace: "pi.w * o.w / d2",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
        {
            name: "coulomb-near-mass-dropped",
            find: "(-P.coulomb * pi.w * o.w /",
            replace: "(-P.coulomb /",
            minFactor: 10,
            test: GRID_LAW_TEST,
        },
    ]),
});

/** The phases whose kernels ALL have their rows: ["P1"] at P1-T5, + "P2" at P2-T2, + "P3" at P3-T5, + "P7" at M8b-T10, + "P4" at P4-T12 (PD-1: when the last P4 kernel has its rows), + "P8" at P8-T15 (the fifteen frontier-family kernels, 59 rows written by the tasks that wrote the kernels); test/sabotage/coverage.test.ts asserts every KERNELS entry whose `phase` is listed here has >= 3 rows, except SABOTAGE_EXEMPT. */
export const SABOTAGE_PHASES: readonly KernelEntry["phase"][] = Object.freeze(["P1", "P2", "P3", "P7", "P4", "P8"]);

/**
 * Kernels with no oracle-sensitive arithmetic to mutate: a wrong fill / toScene fails the exact-equality tests
 * directly, and `wcc-sample` (M8b plan PD-6) only selects WHICH component is called the giant -- Afforest is correct
 * for any choice, so a mutated sampler makes the last rounds slower and changes no label, and no mutation of it can
 * break a tolerance by the `minFactor >= 10` the table demands.
 */
export const SABOTAGE_EXEMPT: readonly KernelId[] = Object.freeze(["fill", "fa2-to-scene", "wcc-sample"]);

/**
 * The mutated body (throws when `find` is absent or not unique in the normative body).
 * @param id - the kernel
 * @param mutation - the row to apply
 * @returns the registry body with the one occurrence of `find` replaced by `replace`
 */
export function sabotagedBody(id: KernelId, mutation: Mutation): string {
    const { body } = KERNELS[id];
    const first = body.indexOf(mutation.find);
    if (first < 0) {
        throw new Error(`sabotage ${id}/${mutation.name}: the find string is absent from the normative body`);
    }
    if (body.indexOf(mutation.find, first + mutation.find.length) >= 0) {
        throw new Error(`sabotage ${id}/${mutation.name}: the find string is not unique in the normative body`);
    }
    return body.slice(0, first) + mutation.replace + body.slice(first + mutation.find.length);
}

/**
 * Installs the mutation through setKernelBodyOverride, runs `fn` with a FRESH context, restores.
 * @param id - the kernel
 * @param mutation - the row to apply
 * @param fn - the check to run against the mutant (the context is disposed afterwards)
 * @returns whatever `fn` returns
 */
export async function withSabotage<T>(
    id: KernelId,
    mutation: Mutation,
    fn: (ctx: GpuContext) => Promise<T>,
): Promise<T> {
    setKernelBodyOverride(id, sabotagedBody(id, mutation));
    try {
        const ctx = await acquire({ label: `sabotage/${id}/${mutation.name}` });
        try {
            return await fn(ctx);
        } finally {
            ctx.dispose();
        }
    } finally {
        setKernelBodyOverride(id, null);
    }
}

/** The outcome of one measured check: the largest error / tolerance ratio over its samples (Infinity for a mismatch under a tolerance of 0). */
export interface CheckReport {
    readonly worst: number;
    readonly worstLabel: string;
    readonly samples: number;
}

/**
 * The error / tolerance ratio of one sample: 0 for an exact match, Infinity for any mismatch under a tolerance of 0
 * (a bitwise test), NaN counts as Infinity.
 * @param error - the measured error (absolute or relative, the caller's choice, the same as the tolerance's)
 * @param tolerance - the test's tolerance in the same units
 * @returns the ratio the sabotage tests compare with `minFactor`
 */
export function ratioOf(error: number, tolerance: number): number {
    if (Number.isNaN(error)) {
        return Infinity;
    }
    if (tolerance <= 0) {
        return error === 0 ? 0 : Infinity;
    }
    return error / tolerance;
}

/**
 * The report of several checks: the largest ratio and the label it came from.
 * @param reports - the reports to merge
 * @returns one report
 */
export function mergeReports(reports: readonly CheckReport[]): CheckReport {
    let worst = 0;
    let worstLabel = "(no samples)";
    let samples = 0;
    for (const r of reports) {
        samples += r.samples;
        const w = Number.isNaN(r.worst) ? Infinity : r.worst;
        if (w > worst) {
            worst = w;
            ({ worstLabel } = r);
        }
    }
    return { worst, worstLabel, samples };
}

/**
 * THE assertion of a check (spec 11.9 item 1: the sabotage test asserts this same function fails on the mutant).
 * @param report - the measured report
 */
export function assertCheckPasses(report: CheckReport): void {
    if (!(report.worst <= 1)) {
        throw new Error(
            `check failed: worst error / tolerance ratio ${report.worst} > 1 at ${report.worstLabel} (${report.samples} samples)`,
        );
    }
}
