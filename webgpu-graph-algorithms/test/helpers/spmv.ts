/**
 * The run driver of the spmvPull tests (test/primitives/spmv.test.ts and, from M8b-T10, the sabotage suite). IMPORT
 * RULE (the same as test/helpers/segmented-reduce.ts): only @graphty/graph-format types, src/** modules outside
 * src/node/**, test/oracle/** and the pure helpers -- never test/helpers/device.ts or test/setup/**, so the file
 * can be bundled for the browser leg. The scope is the package's own algorithmScope (src/algorithms/scope.ts): a
 * Lease for the scratch and a UniformRing slot per params record, flushed before the submit, disposed in a finally.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { pageRank } from "../../src/algorithms/pagerank.js";
import { type AlgorithmScope, algorithmScope } from "../../src/algorithms/scope.js";
import { eigenvectorCentrality } from "../../src/algorithms/spectral.js";
import { type GpuContext } from "../../src/context.js";
import { PR_PARTIAL } from "../../src/kernels.js";
import { type CoreBinding } from "../../src/memory/residency.js";
import { coreOfView } from "../../src/primitives/core-shape.js";
import {
    prepareSpmvPull,
    type SpmvCoefficients,
    type SpmvPullPlanner,
    type SpmvResources,
} from "../../src/primitives/spmv.js";
import { type Binding } from "../../src/types/memory.js";
import { pageRankOracle, type PageRankOracleOptions, pageRankOracleTo } from "../oracle/pagerank.js";
import { eigenvectorOracle } from "../oracle/spectral.js";
import { spmvPullOracle } from "../oracle/spmv.js";
import { type EdgeSpec, KARATE_EDGES, randomEdges, snapshotOf } from "./graphs.js";
import { maxRelError } from "./matchers.js";
import { weightedRandom } from "./segmented-reduce.js";

/** The value every rankOut slot holds before a dispatch: a row the kernel never writes keeps it and misses the oracle by ~1e30. */
const SPMV_SENTINEL = -1e30;

/**
 * Whole-buffer Binding (the device.ts helper of the same name, repeated here under the import rule above).
 * @param buffer - the buffer
 * @returns the binding over [0, buffer.size)
 */
function bindingOf(buffer: GPUBuffer): Binding {
    return { buffer, offset: 0, size: buffer.size, window: null };
}

/**
 * The reverse adjacency of a snapshot as the CoreBinding the pull kernel takes: the reverse view through the ONE
 * adapter, coreOfView. An empty snapshot has no per-node view to upload (residency.view() rejects it), and its
 * reverse IS its core, so the core binding stands in.
 * @param ctx - the context
 * @param s - the snapshot (left resident; the caller releases it)
 * @returns the reverse core
 */
export function reverseCore(ctx: GpuContext, s: GraphSnapshot): CoreBinding {
    if (s.nodeCount === 0) {
        return ctx.residency.core(s);
    }
    const view = ctx.residency.view(s, "reverse");
    return coreOfView(view, view.scalars.arcCount[0]);
}

/**
 * Options of runSpmvPull: the parameter type (knip: exported for the signature, not imported by name).
 * @public
 */
export interface SpmvRunOptions {
    /** The per-node personalization (HAS_PERSONALIZATION); omitted, the kernel uses coefficients.uniformP. */
    readonly personalization?: F32 | undefined;
    /** The dangling mass written into partials[0].danglingMass (USE_DANGLING); omitted, the kernel folds no dangling term. */
    readonly dangling?: number | undefined;
    /** The weights option of prepareSpmvPull: undefined takes the core's, null runs UNWEIGHTED. */
    readonly weights?: Binding | null | undefined;
    /** The reverse core to pull over (default: reverseCore(ctx, s)). */
    readonly rev?: CoreBinding | undefined;
}

/**
 * Uploads the reverse view, prepares the pull planner, records ONE dispatch into a fresh encoder, submits and reads
 * rankOut[0..n) back. rankOut starts as SPMV_SENTINEL so an unwritten row is visible. The snapshot stays resident
 * (the caller releases it).
 * @param ctx - the context
 * @param s - the snapshot
 * @param xNorm - the pre-scaled input vector (n values)
 * @param coefficients - alpha, beta, uniformP
 * @param options - personalization / dangling / weights / rev
 * @returns the n results and the dispatch count of the record
 */
export async function runSpmvPull(
    ctx: GpuContext,
    s: GraphSnapshot,
    xNorm: F32,
    coefficients: SpmvCoefficients,
    options?: SpmvRunOptions,
): Promise<{ readonly result: F32; readonly dispatches: number }> {
    const n = s.nodeCount;
    const rev = options?.rev ?? reverseCore(ctx, s);
    const scope: AlgorithmScope = algorithmScope(ctx, "spmv/test", 4);
    try {
        const bytes = Math.max(4, 4 * n);
        const xNormBuffer = scope.scratch(bytes, "xNorm");
        const rankOut = scope.scratch(bytes, "rankOut");
        const partials = scope.scratch(PR_PARTIAL.byteLength, "partials");
        let personalization: Binding | null = null;
        if (n > 0) {
            ctx.device.queue.writeBuffer(xNormBuffer, 0, xNorm);
            ctx.device.queue.writeBuffer(rankOut, 0, new Float32Array(n).fill(SPMV_SENTINEL));
            if (options?.personalization !== undefined) {
                const buffer = scope.scratch(bytes, "personalization");
                ctx.device.queue.writeBuffer(buffer, 0, options.personalization);
                personalization = bindingOf(buffer);
            }
        }
        const header = new ArrayBuffer(PR_PARTIAL.byteLength);
        PR_PARTIAL.write(new DataView(header), { danglingMass: options?.dangling ?? 0 });
        ctx.device.queue.writeBuffer(partials, 0, header);
        const planner: SpmvPullPlanner = await prepareSpmvPull(scope, rev, {
            personalization: options?.personalization !== undefined,
            dangling: options?.dangling !== undefined,
            weights: options?.weights,
            tiers: null,
        });
        const encoder = ctx.device.createCommandEncoder({ label: "spmv/test" });
        const pass = encoder.beginComputePass({ label: "spmv/test" });
        const resources: SpmvResources = {
            xNorm: bindingOf(xNormBuffer),
            rankOut: bindingOf(rankOut),
            personalization,
            partials: bindingOf(partials),
        };
        planner.record(pass, rev, resources, coefficients);
        pass.end();
        scope.flush();
        ctx.device.queue.submit([encoder.finish()]);
        const dispatches = planner.lastDispatches;
        if (n === 0) {
            return { result: new Float32Array(0), dispatches };
        }
        const result = new Float32Array(await ctx.readback.read(rankOut, 4 * n));
        return { result, dispatches };
    } finally {
        scope.dispose();
    }
}

/**
 * The analytic tolerance of the f32 pull against the f64 oracle: every term is non-negative (xNorm, weights,
 * alpha, beta, the masses), so no cancellation; a row of in-degree d rounds d products, the Kahan sum (2 roundings
 * of the total), the dangling product, the addition, the alpha product, the beta product and the final addition --
 * (d + 7) roundings of 2^-24 relative at most, so 2 x (dmax + 8) x 2^-24 covers the highest in-degree with a 2x
 * margin. dmax is over the REVERSE rows, which is what the pull walks.
 * @param s - the snapshot
 * @returns the relative tolerance
 */
export function spmvTolerance(s: GraphSnapshot): number {
    const { rowPtr } = s.reverse();
    let dmax = 0;
    for (let row = 0; row < s.nodeCount; row++) {
        dmax = Math.max(dmax, rowPtr[row + 1] - rowPtr[row]);
    }
    return 2 * (dmax + 8) * 2 ** -24;
}

/**
 * Seeded f32 values in [0, 1) from an LCG, one per node (the pre-scaled xNorm of a pull).
 * @param n - the node count
 * @param seed - the generator seed
 * @returns the values
 */
export function seededVector(n: number, seed: number): F32 {
    const out = new Float32Array(n);
    let state = seed % 4294967296;
    for (let i = 0; i < n; i++) {
        state = (state * 1664525 + 1013904223) % 4294967296;
        out[i] = Math.fround(state / 4294967296);
    }
    return out;
}

/**
 * A seeded directed G(n, m) without self-loops or parallels carrying f32 weights in [0.25, 4) from an LCG over the
 * edge index (the directed twin of test/helpers/segmented-reduce.ts weightedRandom).
 * @param n - nodes
 * @param m - edges
 * @param seed - the generator seed
 * @returns a directed weighted snapshot
 */
export function weightedDirected(n: number, m: number, seed: number): GraphSnapshot {
    let state = seed % 4294967296;
    const weighted: EdgeSpec[] = randomEdges(n, m, seed).map(([u, v]): EdgeSpec => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return [u, v, Math.fround(0.25 + 3.75 * (state / 4294967296))];
    });
    return snapshotOf(weighted, { weighted: true, directed: true, label: `weighted-directed-${n}-${m}-${seed}` });
}

/**
 * One check of the spmv sabotage set: a snapshot, the coefficients, and the xNorm vector to fold -- the element
 * type of spmvChecks() and the parameter type of spmvWorstFactor (knip: exported for the signatures, not imported
 * by name).
 * @public
 */
export interface SpmvCheck {
    readonly name: string;
    readonly snapshot: GraphSnapshot;
    /** The f32 input the kernel reads; the oracle folds these same (f32-rounded) values in f64. */
    readonly xNorm: F32;
    readonly coefficients: { alpha: number; beta: number; uniformP: number; dangling: number };
}

/**
 * The check set both the primitive test and the sabotage test run, built with weightedRandom from
 * test/helpers/segmented-reduce.ts: a weighted random1k (weights are not 1, so a dropped weight read is a ~50%
 * error), the same graph with a dangling mass (so USE_DANGLING is exercised; the per-node mass is 1, not 1 / n, so
 * the dangling term is a visible share of a row's sum and not lost under the fold's own tolerance), and a 300-row
 * graph whose last 100 rows have no arcs (a skipped empty row keeps the sentinel).
 * @returns the checks
 */
export function spmvChecks(): readonly SpmvCheck[] {
    const random1k = weightedRandom(1000, 5000, 7);
    const holes = weightedRandom(200, 600, 5, 300); // 300 rows, the last 100 with no arcs at all
    const uniform = (n: number): F32 => Float32Array.from({ length: n }, (_, i) => 1 / (1 + (i % 7)));
    return [
        {
            name: "random1k weighted pull, alpha 0.85",
            snapshot: random1k,
            xNorm: uniform(random1k.nodeCount),
            coefficients: { alpha: 0.85, beta: 0.15, uniformP: 1 / random1k.nodeCount, dangling: 0 },
        },
        {
            name: "random1k weighted pull with a dangling mass",
            snapshot: random1k,
            xNorm: uniform(random1k.nodeCount),
            coefficients: { alpha: 0.85, beta: 0.15, uniformP: 1, dangling: 0.25 },
        },
        {
            name: "300 rows / 100 with no in-arcs, alpha 1 beta 0",
            snapshot: holes,
            xNorm: uniform(holes.nodeCount),
            coefficients: { alpha: 1, beta: 0, uniformP: 0, dangling: 0 },
        },
    ];
}

/**
 * The worst error factor over the checks: max relative error against the f64 oracle, divided by the tolerance the
 * package documents for the pull at that in-degree (spmvTolerance). A factor of 1 is "exactly at tolerance";
 * minFactor 10 therefore means "ten times the tolerance" -- the same meaning it has in segmented-reduce's set. A
 * check whose dangling mass is 0 runs the kernel WITHOUT USE_DANGLING, so both variants are compiled.
 * @param ctx - the context (a fresh one per mutation under withSabotage)
 * @param checks - the checks
 * @returns max over checks of maxRelError(actual, expected) / spmvTolerance(snapshot)
 */
export async function spmvWorstFactor(ctx: GpuContext, checks: readonly SpmvCheck[]): Promise<number> {
    let worst = 0;
    for (const check of checks) {
        const { alpha, beta, uniformP, dangling } = check.coefficients;
        const { result } = await runSpmvPull(
            ctx,
            check.snapshot,
            check.xNorm,
            { alpha, beta, uniformP },
            { dangling: dangling === 0 ? undefined : dangling },
        );
        const expected = spmvPullOracle(check.snapshot, Float64Array.from(check.xNorm), check.coefficients);
        // maxRelError(actual, expected, absFloor) -- test/helpers/matchers.ts; the 1e-12 floor on the tolerance is
        // the SR_FACTOR_FLOOR analogue: a tolerance of 0 would make every factor Infinity.
        const err = maxRelError(result, expected, 1e-6);
        const tolerance = Math.max(spmvTolerance(check.snapshot), 1e-12);
        worst = Math.max(worst, Number.isNaN(err) ? Number.POSITIVE_INFINITY : err / tolerance);
    }
    for (const check of checks) {
        ctx.release(check.snapshot);
    }
    return worst;
}

/** The defaults of pageRank, spelled for the oracle (test/algorithms/pagerank.test.ts OPTS). */
const PR_OPTS: PageRankOracleOptions = { alpha: 0.85, tolerance: 1e-6, maxIterations: 100, weighted: true };
/** Spec 9.7: the relative parity after equal iterations, and the tolerance of the iteration count (+-1). */
const PR_PARITY = 1e-5;
const PR_ITERATION_TOLERANCE = 1;

/**
 * A directed 200-node random graph whose last 50 nodes have no out-arcs (every arc's source is below 150), so the
 * dangling path of pr-scale / spmv-pull carries a visible mass.
 * @returns the snapshot
 */
function directedWithSinks(): GraphSnapshot {
    const edges = randomEdges(200, 800, 3).filter(([u]) => u < 150);
    return snapshotOf(edges, { directed: true, nodeCount: 200, label: "sabotage/sinks" });
}

/**
 * The error factor of an iteration count: a `converged` mismatch is Infinity (a boolean has tolerance 0), an
 * iteration count of 0 against a positive one is Infinity (0 means "no iteration ran", which the one-iteration-late
 * recording of pr-finalize must never report on a graph with arcs), and otherwise |actual - expected| / 1.
 * @param actual - the device's converged flag and iteration count
 * @param expected - the oracle's
 * @returns the factor
 */
function iterationFactor(
    actual: { readonly converged: boolean; readonly iterations: number },
    expected: { readonly converged: boolean; readonly iterations: number },
): number {
    if (actual.converged !== expected.converged || (actual.iterations === 0) !== (expected.iterations === 0)) {
        return Number.POSITIVE_INFINITY;
    }
    return Math.abs(actual.iterations - expected.iterations) / PR_ITERATION_TOLERANCE;
}

/**
 * The check set of the pr-scale and pr-finalize rows, which the pull kernel alone cannot exercise: PageRank on
 * karate and on a directed graph with sinks -- the iterate after exactly 8 iterations within 1e-5 of the oracle's,
 * `converged` identical, `iterations` within 1 and the dangling mass within 1e-5 -- then karate at a tolerance
 * every iterate meets (so iteration 1 must be reported as 1, never as 0), and eigenvector centrality on karate
 * (the L2 norm pass and its square root) after 8 iterations and to convergence. The factor is the worst
 * error / tolerance ratio over all of it, on the scale of the sabotage table's minFactor.
 * @param ctx - the context (a fresh one per mutation under withSabotage)
 * @returns the worst factor
 */
export async function pageRankWorstFactor(ctx: GpuContext): Promise<number> {
    const karate = snapshotOf(KARATE_EDGES, { label: "sabotage/karate" });
    const sinks = directedWithSinks();
    let worst = 0;
    const bump = (factor: number): void => {
        worst = Math.max(worst, Number.isNaN(factor) ? Number.POSITIVE_INFINITY : factor);
    };
    for (const s of [karate, sinks]) {
        const eight = await pageRank(ctx, s, { maxIterations: 8 });
        bump(maxRelError(eight.scores, pageRankOracleTo(s, PR_OPTS, 8), 1e-12) / PR_PARITY);
        const full = await pageRank(ctx, s);
        const expected = pageRankOracle(s, PR_OPTS);
        bump(iterationFactor(full, expected));
        bump(Math.abs(full.danglingMass - expected.danglingMass) / PR_PARITY);
    }
    const loose = await pageRank(ctx, karate, { tolerance: 1 });
    bump(iterationFactor(loose, pageRankOracle(karate, { ...PR_OPTS, tolerance: 1 })));
    const eigenOpts = { maxIterations: 100, tolerance: 1e-6, weighted: true };
    const eigenEight = await eigenvectorCentrality(ctx, karate, { maxIterations: 8 });
    const eigenExpected = eigenvectorOracle(karate, { ...eigenOpts, maxIterations: 8 });
    bump(maxRelError(eigenEight.scores, eigenExpected.scores, 1e-9) / PR_PARITY);
    const eigenFull = await eigenvectorCentrality(ctx, karate);
    bump(iterationFactor(eigenFull, eigenvectorOracle(karate, eigenOpts)));
    ctx.release(karate);
    ctx.release(sinks);
    return worst;
}
