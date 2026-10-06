/**
 * Closeness centrality on the device (design 8.4, 3.3 line 810, 9.7): `score[s] = 1 / sumDist_s`, with `sumDist_s`
 * the exact sum of the finite distances from `s` to every OTHER node -- an unreached node adds nothing -- and `0` when
 * nothing is reached; or, with `harmonic`, `score[s] = sum of 1 / dist` over the same nodes (a zero distance adds
 * nothing). No reached factor and no Wasserman-Faust scaling: this is EXACTLY the legacy default (`normalized:
 * false`) of `closenessCentrality` in `@graphty/algorithms`, the number graphty-element's closeness panel shows.
 *
 * Three routes, chosen from the inputs before any device work:
 *
 * - ALL-PAIRS (an exact run whose `n x n` f32 matrix fits one binding, weighted, or unweighted up to
 *   `ALL_PAIRS_MAX_NODES`): `allPairsShortestPath`'s blocked Floyd-Warshall sweep, then `closeness-rowsum` folds each row on
 *   the device -- hop counts as exact integers, weighted distances and harmonic reciprocals in f32 -- and only `n`
 *   words come back. Weighted scores agree with the one-search-per-source route up to f32 rounding of the sums.
 * - LEVELS (unweighted, every other case): a bit-parallel multi-source breadth-first search, `32 x words` sources per
 *   batch (up to `MAX_WORDS` = 8 words, 256 sources), ONE `closeness-level` dispatch per level. Each level chooses on
 *   the device between pushing the frontier over the out-arcs (one invocation per arc) and pulling it over the
 *   in-arcs (one invocation per node, with an early exit once every source has reached the node), from the arcs the
 *   frontier would push against `pullAt`; a graph with a node of more than `PULL_MAX_DEGREE` in-arcs only pushes. The levels of a
 *   submit tally their claims per source into one count table, read back once per submit; the host folds the counts
 *   into exact sums in f64 (`count x distance`) and harmonic sums (`count / distance`). A level whose predecessor
 *   claimed nothing returns at once, so recording `MAX_LEVELS_PER_SUBMIT` levels costs little past a batch's depth.
 * - ONE SEARCH PER SOURCE (weighted above the all-pairs ceiling, or a weighted sampled run): one `sssp` per source,
 *   the sums reduced on the host between calls.
 *
 * `weighted` defaults to the snapshot's `flags.weighted`; `weighted: false` on a weighted snapshot ignores the column;
 * `weighted: true` over unit weights or no column is the unweighted problem. `maxIterations` and `tolerance` are the
 * seam's placeholder keys and an exact traversal has neither, so a defined value is REFUSED before any device work
 * (`E_UNSUPPORTED { option }`); `undefined` is legal. `iterations` reports the source batches run (the sources, on the
 * one-search-per-source route; 1 on the all-pairs route), `converged` is always true.
 *
 * A SAMPLED run (`sources`, undirected snapshots only) seeds its batches from the listed sources and adds every
 * claim's distance into a per-node sum, folded on the host into `1 / sum` per NODE: on an undirected graph the
 * distance from a source to a node is the distance from the node to the source, which is what the CPU port's sampled
 * closeness sums. A sampled harmonic run is refused (`E_UNSUPPORTED closenessCentrality.sampledHarmonic`): the
 * per-node reciprocal sums would need a float atomic.
 *
 * Cost, stated so nobody is surprised: closeness is O(n x m) on any device -- at 1M nodes it is 3,907 batches of a
 * full multi-source traversal. The level kernel binds the whole arc array (`assertWholeCore`) and, on a directed
 * snapshot, the whole reverse adjacency. `closenessWithTuning` is what the tests drive; nothing public exposes it.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { MAX_LEVELS_PER_SUBMIT } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, plan2d } from "../kernel/dispatch.js";
import { CLOSENESS_PARAMS, FILL_PARAMS, kernelSpec } from "../kernels.js";
import { assertWholeCore, coreOfView } from "../primitives/core-shape.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type ClosenessAcceleratorOptions, type HitsOptionsLike } from "../types/accelerator.js";
import { type GpuClosenessResult } from "../types/algorithms.js";
import { type GpuRunOptions } from "../types/run.js";
import { allPairsCeiling, DEFAULT_ROUNDS_PER_SUBMIT, sweepAllPairs } from "./all-pairs.js";
import { algorithmScope } from "./scope.js";
import { aborted, bindingOf, checkDest, sssp } from "./sssp.js";

const ALGORITHM = "closenessCentrality";

/**
 * The most 32-bit words per node of the level route: `32 x MAX_WORDS` = 256 sources per batch, the size of the
 * kernel's workgroup tally.
 * @internal
 */
export const MAX_WORDS = 8;

/**
 * A level pulls when the arcs its frontier would push exceed `words x arcCount / PULL_RATIO`: the push touches every
 * arc whatever the frontier, so it is the cheap step only while few of them claim anything, and the pull's early exit
 * pays once the frontier is large. Measured on the RTX 4070 SUPER (level route, eight words per node) against always
 * pushing and always pulling: uniform random graphs of 4,096 nodes at 64 to 512 arcs per node 9.9 / 13.5 / 19.9 ms
 * against 16.5 / 25.7 / 68.4 pushing and 12.4 / 18.9 / 36.7 pulling; 16,384 nodes at 32 arcs per node 52.7 against
 * 142.7 and 54.1; at 8 arcs per node and below, rings, a path, a grid and a star within noise of the better of the
 * two. 4 and 16 measured within a few percent of 64.
 */
const PULL_RATIO = 64;

/**
 * The most in-arcs a node may have for the level route to pull: a pull invocation walks one node's in-arcs, so its
 * loop count is about `in-degree x (words + 1)`, and llvmpipe silently ends every loop of an invocation past 65,535
 * iterations (`(65,535 - 512) / 9` is 7,225 at eight words). A graph with a larger hub runs every level as a push,
 * one invocation per arc.
 * @internal
 */
export const PULL_MAX_DEGREE = 4096;

/** The control ring at the end of the count table: three slots of four words (`any`, `arcs`, `pull`, pad). */
const CTRL_WORDS = 12;

/** Which route a run took. @internal */
export type ClosenessRoute = "levels" | "all-pairs" | "per-source";

/**
 * The knobs the tests and the measurements need and nothing public offers.
 * @internal
 */
export interface ClosenessTuning {
    /** Levels recorded per submit on the level route (default `MAX_LEVELS_PER_SUBMIT`). */
    readonly levelsPerSubmit?: number | undefined;
    /** Words per node on the level route (default: as many as the sources need, at most `MAX_WORDS`). */
    readonly words?: number | undefined;
    /** The frontier arcs above which a level pulls (default `words x arcCount / PULL_RATIO`); 0 pulls whenever the frontier has an arc, `0xFFFFFFFF` never pulls. A graph with a node of more than `PULL_MAX_DEGREE` in-arcs never pulls. */
    readonly pullAt?: number | undefined;
    /** Force a route of an exact run (the all-pairs route still needs the matrix to fit). */
    readonly route?: ClosenessRoute | undefined;
    /** Called with the route the run takes. */
    readonly onRoute?: ((route: ClosenessRoute) => void) | undefined;
    /** Level route, exact run: after every batch, its first source, the exact sum of distances and the nodes reached of each of its sources. */
    readonly onBatch?: ((batchStart: number, sums: Float64Array, reached: Uint32Array) => void) | undefined;
}

/**
 * The most nodes an unweighted exact run sends to the all-pairs route: the blocked sweep's `n^3` work beats the level
 * route's `n / 256` batches of a full traversal only on small graphs. Measured on the RTX 4070 SUPER: a ring with
 * chords takes 2.7 ms on the all-pairs route against 3.5 to 4 ms on the level route at 1,024 nodes, 11 against 4.4
 * at 2,048 and 71 against 10 at 4,096; a graph with `n^2 / 12` arcs 0.9 against 1.4 at 512, 2.5 against 2.6 at
 * 1,024, 11 against 6 to 9 at 2,048 and 73 against 24 at 4,096. A deep sparse graph is the exception this does not
 * see: a 4,096-node path takes 70 ms on the all-pairs route and 0.7 s on the level route, one dispatch per level for
 * 4,095 levels.
 * @internal
 */
export const ALL_PAIRS_MAX_NODES = 1024;

/**
 * The score of a sum: `1 / sum`, `0` when nothing was reached.
 * @param sum - the sum of distances
 * @returns the score
 */
function inverse(sum: number): number {
    return sum === 0 ? 0 : 1 / sum;
}

/**
 * The one-search-per-source route: one `sssp` per source, the sums reduced on the host. With `sources` (a sampled run
 * on an undirected snapshot) each search adds its distances into the sums of the nodes it reaches instead of its own.
 * @param ctx - the context
 * @param s - the snapshot
 * @param scores - the destination
 * @param sources - a sampled run's sources, or null for every node
 * @param harmonic - sum reciprocal distances (exact runs only)
 * @param options - the run options
 * @returns the result
 */
async function perSourceRoute(
    ctx: GpuContext,
    s: GraphSnapshot,
    scores: F32,
    sources: readonly number[] | null,
    harmonic: boolean,
    options: GpuRunOptions | undefined,
): Promise<GpuClosenessResult> {
    const n = s.nodeCount;
    const count = sources?.length ?? n;
    const totals = sources === null ? null : new Float64Array(n);
    for (let i = 0; i < count; i++) {
        if (options?.signal?.aborted) {
            throw aborted(ALGORITHM);
        }
        const source = sources === null ? i : sources[i];
        const { dist } = await sssp(ctx, s, source, { signal: options?.signal });
        let sum = 0;
        for (let v = 0; v < n; v++) {
            const d = dist[v];
            if (v !== source && d !== Infinity) {
                if (totals !== null) {
                    totals[v] += d;
                } else if (!harmonic) {
                    sum += d;
                } else if (d > 0) {
                    sum += 1 / d;
                }
            }
        }
        if (totals === null) {
            scores[source] = harmonic ? sum : inverse(sum);
        }
        options?.onProgress?.(i + 1, count);
    }
    totals?.forEach((sum, v) => {
        scores[v] = inverse(sum);
    });
    return { scores, iterations: count, converged: true, precision: "f32", sourcesUsed: count };
}

/**
 * The all-pairs route (see the file comment). The caller checked that the matrix fits.
 * @param ctx - the context
 * @param s - the snapshot
 * @param scores - the destination
 * @param weighted - sum the weights, or count hops
 * @param harmonic - sum reciprocal distances
 * @param options - the run options
 * @returns the result
 */
async function allPairsRoute(
    ctx: GpuContext,
    s: GraphSnapshot,
    scores: F32,
    weighted: boolean,
    harmonic: boolean,
    options: GpuRunOptions | undefined,
): Promise<GpuClosenessResult> {
    const n = s.nodeCount;
    const scope = algorithmScope(ctx, ALGORITHM, Math.min(DEFAULT_ROUNDS_PER_SUBMIT, Math.ceil(n / 32)) + 3);
    try {
        const matrix = await sweepAllPairs(
            ctx,
            s,
            scope,
            weighted,
            DEFAULT_ROUNDS_PER_SUBMIT,
            { signal: options?.signal },
            ALGORITHM,
        );
        const rowsum = await ctx.pipelines.kernel(kernelSpec("closeness-rowsum"));
        const out = bindingOf(scope.scratch(4 * n, "row-sums"), 4 * n);
        const role = harmonic ? 2 : Number(weighted);
        const params = scope.params(CLOSENESS_PARAMS, { role, n });
        const batch = new CommandBatch(ctx, `${ALGORITHM}/row-sums`);
        rowsum.dispatch(
            batch.pass("row-sums"),
            rowsum.bind({ dist: matrix, out, P: params.binding }),
            plan2d(n, ctx.caps),
            [params.offset],
        );
        batch.endPass();
        const request = batch.readback(out.buffer, out.offset, 4 * n);
        scope.flush();
        const back = await batch.submit().readback;
        ctx.assertReady();
        if (role === 0) {
            new Uint32Array(back, request.offset, n).forEach((sum, v) => {
                scores[v] = inverse(sum);
            });
        } else {
            new Float32Array(back, request.offset, n).forEach((sum, v) => {
                scores[v] = harmonic ? sum : inverse(sum);
            });
        }
        options?.onProgress?.(n, n);
        return { scores, iterations: 1, converged: true, precision: "f32", sourcesUsed: n };
    } finally {
        scope.dispose();
    }
}

/**
 * The level route (see the file comment).
 * @param ctx - the context
 * @param s - the snapshot
 * @param scores - the destination
 * @param sources - a sampled run's sources, or null for every node
 * @param harmonic - sum reciprocal distances (exact runs only)
 * @param levelsPerSubmit - the submit cadence
 * @param options - the run options
 * @param tuning - the knobs
 * @returns the result
 */
async function levelRoute(
    ctx: GpuContext,
    s: GraphSnapshot,
    scores: F32,
    sources: readonly number[] | null,
    harmonic: boolean,
    levelsPerSubmit: number,
    options: GpuRunOptions | undefined,
    tuning: ClosenessTuning,
): Promise<GpuClosenessResult> {
    const n = s.nodeCount;
    const seedCount = sources?.length ?? n;
    if (seedCount === 0) {
        return { scores, iterations: 0, converged: true, precision: "f32", sourcesUsed: 0 };
    }
    const limit = Math.min(ctx.caps.limits.maxStorageBufferBindingSize, ctx.caps.limits.maxBufferSize);
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, ALGORITHM);
    if (s.directed && 4 * s.arcCount > limit) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${ALGORITHM}: the reverse adjacency of a directed snapshot (${4 * s.arcCount} bytes) does not fit one binding`,
            { needed: 4 * s.arcCount, limit, path: "closeness.reverse", algorithm: ALGORITHM },
        );
    }
    const reverse = s.directed ? coreOfView(ctx.residency.view(s, "reverse"), s.arcCount) : core;
    // words per node: as many as the sources need, within one binding of four regions (plus a sampled run's per-node
    // sums) and, for a sampled run, so a node's per-batch distance sum (at most 32 words (n - 1)) fits a u32
    const extra = sources === null ? 0 : n;
    const fitWords = Math.floor((limit / 4 - extra) / (4 * n));
    const sumWords = sources === null ? MAX_WORDS : Math.floor(0xffffffff / (32 * Math.max(1, n - 1)));
    const words = tuning.words ?? Math.max(1, Math.min(MAX_WORDS, Math.ceil(seedCount / 32), fitWords, sumWords));
    if (!Number.isInteger(words) || words < 1 || words > MAX_WORDS) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${ALGORITHM}: words must be an integer in [1, ${MAX_WORDS}]`,
            {
                argument: "words",
                value: words,
                expected: `an integer in [1, ${MAX_WORDS}]`,
            },
        );
    }
    const base = n * words;
    const bitsWords = 4 * base + extra;
    if (4 * bitsWords > limit) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${ALGORITHM}: ${n} nodes need a ${4 * bitsWords}-byte search state in one binding of at most ${limit} bytes`,
            { needed: 4 * bitsWords, limit, path: "closeness.bits", algorithm: ALGORITHM },
        );
    }
    const lanes = 32 * words;
    const rowWords = levelsPerSubmit * lanes;
    const ctrl = rowWords;
    const sourcesAt = sources === null ? 0 : ctrl + CTRL_WORDS;
    const tableWords = ctrl + CTRL_WORDS + (sources?.length ?? 0);
    const pullAt = tuning.pullAt ?? Math.min(0xffffffff, Math.floor((words * s.arcCount) / PULL_RATIO));
    // slots: the row fill and the levels of one submit, plus the two seed records of a batch's first submit
    const scope = algorithmScope(ctx, ALGORITHM, levelsPerSubmit + 4);
    try {
        const wg = ctx.workgroupSize;
        const bits = bindingOf(scope.scratch(4 * bitsWords, "bits"), 4 * bitsWords);
        const table = bindingOf(scope.scratch(4 * tableWords, "table"), 4 * tableWords);
        const rows = { ...table, size: 4 * rowWords };
        if (sources !== null) {
            ctx.device.queue.writeBuffer(table.buffer, table.offset + 4 * sourcesAt, Uint32Array.from(sources));
        }
        await ctx.allocator.check();
        const level = await ctx.pipelines.kernel(kernelSpec("closeness-level"));
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const state = {
            rowPtr: core.rowPtr,
            colIdx: core.colIdx ?? core.rowPtr,
            inRowPtr: reverse.rowPtr,
            inColIdx: reverse.colIdx ?? reverse.rowPtr,
            bits,
            table,
        };
        const levelPlan = plan1d(Math.max(n, s.arcCount), wg, ctx.caps);
        const pullOk = s.inDegree().every((d) => d <= PULL_MAX_DEGREE) ? 1 : 0;
        const totals = sources === null ? null : new Float64Array(n);
        const shared = {
            n,
            words,
            base,
            ctrl,
            pullAt,
            perNode: sources === null ? 0 : 1,
            sourcesAt,
            arcCount: s.arcCount,
            pullOk,
        };

        let batches = 0;
        for (let batchStart = 0; batchStart < seedCount; batchStart += lanes) {
            const count = Math.min(lanes, seedCount - batchStart);
            const sums = new Float64Array(count);
            const reciprocal = new Float64Array(count);
            const reached = new Uint32Array(count);
            for (let firstLevel = 0, done = false; !done; firstLevel += levelsPerSubmit) {
                if (firstLevel > n + 1) {
                    // a batch claims at most n - 1 levels deep, then one level claims nothing
                    throw new WebGpuGraphError(
                        "E_VALIDATION",
                        `${ALGORITHM}: the batch at ${batchStart} still claimed at level ${firstLevel}`,
                        { label: ALGORITHM, message: `the batch still claimed at level ${firstLevel}` },
                    );
                }
                const batch = new CommandBatch(ctx, `${ALGORITHM}/levels`);
                const pass = batch.pass("closeness");
                if (firstLevel === 0) {
                    const clear = scope.params(CLOSENESS_PARAMS, { ...shared, role: 1, total: bitsWords, count });
                    const bound = level.bind({ ...state, P: clear.binding });
                    level.dispatch(pass, bound, plan1d(bitsWords, wg, ctx.caps), [clear.offset]);
                    const seed = scope.params(CLOSENESS_PARAMS, { ...shared, role: 2, count, source: batchStart });
                    level.dispatch(pass, bound, plan1d(count, wg, ctx.caps), [seed.offset]);
                }
                const zero = scope.params(FILL_PARAMS, { count: rowWords, value: 0, mode: 0, pad0: 0 });
                fill.dispatch(pass, fill.bind({ dst: rows, P: zero.binding }), plan1d(rowWords, wg, ctx.caps), [
                    zero.offset,
                ]);
                let bound: ReturnType<typeof level.bind> | null = null;
                for (let row = 0; row < levelsPerSubmit; row++) {
                    const params = scope.params(CLOSENESS_PARAMS, {
                        ...shared,
                        role: 0,
                        count,
                        level: firstLevel + row,
                        row,
                    });
                    bound ??= level.bind({ ...state, P: params.binding });
                    level.dispatch(pass, bound, levelPlan, [params.offset]);
                }
                batch.endPass();
                const rowRequest = batch.readback(table.buffer, table.offset, 4 * rowWords);
                const nodeRequest =
                    totals === null ? null : batch.readback(bits.buffer, bits.offset + 16 * base, 4 * n);
                scope.flush();
                const submitted = batch.submit();
                const back = await submitted.readback;
                ctx.assertReady();
                if (options?.signal?.aborted) {
                    throw aborted(ALGORITHM, submitted.id);
                }
                const counts = new Uint32Array(back, rowRequest.offset, rowWords);
                for (let row = 0; row < levelsPerSubmit && !done; row++) {
                    const distance = firstLevel + row + 1;
                    let claimed = 0;
                    for (let lane = 0; lane < count; lane++) {
                        const c = counts[row * lanes + lane];
                        sums[lane] += c * distance;
                        reciprocal[lane] += c / distance;
                        reached[lane] += c;
                        claimed += c;
                    }
                    done = claimed === 0;
                }
                if (done && totals !== null && nodeRequest !== null) {
                    new Uint32Array(back, nodeRequest.offset, n).forEach((sum, v) => {
                        totals[v] += sum;
                    });
                }
            }
            if (sources === null) {
                for (let lane = 0; lane < count; lane++) {
                    scores[batchStart + lane] = harmonic ? reciprocal[lane] : inverse(sums[lane]);
                }
                tuning.onBatch?.(batchStart, sums, reached);
            }
            batches += 1;
            options?.onProgress?.(batchStart + count, seedCount);
        }
        totals?.forEach((sum, v) => {
            scores[v] = inverse(sum);
        });
        return { scores, iterations: batches, converged: true, precision: "f32", sourcesUsed: seedCount };
    } finally {
        scope.dispose();
    }
}

/**
 * A sampled run's sources, checked: node indices of `s`, on an undirected snapshot only.
 * @param s - the snapshot
 * @param sources - the caller's list, or undefined for every node
 * @returns the list, or null for every node
 * @throws WebGpuGraphError E_INVALID_ARGUMENT for an index outside the snapshot, E_UNSUPPORTED on a directed snapshot
 */
function checkSources(s: GraphSnapshot, sources: readonly number[] | undefined): readonly number[] | null {
    if (sources === undefined) {
        return null;
    }
    if (s.directed) {
        // a search FROM a source measures distance to the nodes it reaches, which is the distance FROM them to the
        // source only when every edge runs both ways
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: sampled sources need an undirected snapshot`, {
            feature: "closenessCentrality.directedSources",
            hint: "run the CPU port, which searches the in-arcs",
        });
    }
    for (const v of sources) {
        if (!Number.isInteger(v) || v < 0 || v >= s.nodeCount) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${ALGORITHM}: a source is not a node index`, {
                argument: "sources",
                value: v,
                expected: `an integer in [0, ${s.nodeCount})`,
            });
        }
    }
    return sources;
}

/**
 * Closeness with the test knobs; `closenessCentrality` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - `weighted`, `harmonic` and a sampled run's `sources` honoured, the placeholder `maxIterations` / `tolerance` refused when defined, plus dest / signal / onProgress
 * @param tuning - the knobs
 * @returns the scores, the batches run, `converged: true`, `precision: "f32"` and `sourcesUsed`
 */
export async function closenessWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: (ClosenessAcceleratorOptions & HitsOptionsLike & GpuRunOptions) | undefined,
    tuning: ClosenessTuning,
): Promise<GpuClosenessResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    for (const key of ["maxIterations", "tolerance"] as const) {
        if (options?.[key] !== undefined) {
            throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: ${key} has no meaning for an exact traversal`, {
                option: key,
                hint: "closeness is an exact traversal; the option has no meaning here",
            });
        }
    }
    const n = s.nodeCount;
    const sources = checkSources(s, options?.sources);
    const harmonic = options?.harmonic === true;
    if (harmonic && sources !== null) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: harmonic closeness from sampled sources`, {
            feature: "closenessCentrality.sampledHarmonic",
            hint: "run the CPU port, or drop the sources for the exact harmonic score",
        });
    }
    const levelsPerSubmit = tuning.levelsPerSubmit ?? MAX_LEVELS_PER_SUBMIT;
    if (!Number.isInteger(levelsPerSubmit) || levelsPerSubmit < 1 || levelsPerSubmit > MAX_LEVELS_PER_SUBMIT) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${ALGORITHM}: levelsPerSubmit must be an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            {
                argument: "levelsPerSubmit",
                value: levelsPerSubmit,
                expected: `an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            },
        );
    }
    const scores = checkDest(ALGORITHM, options?.dest, n) ?? new Float32Array(n);
    const weighted = (options?.weighted ?? s.flags.weighted) && s.weights !== null && !s.flags.allWeightsOne;
    if (options?.signal?.aborted) {
        throw aborted(ALGORITHM);
    }
    if (weighted && !s.flags.nonNegativeWeights) {
        throw new WebGpuGraphError(
            "E_UNSUPPORTED",
            `${ALGORITHM}: a negative weight has no shortest-path distance to sum`,
            {
                feature: "closenessCentrality.negativeWeights",
                hint: "pass weighted: false to ignore the column",
            },
        );
    }
    if (weighted && !s.flags.finiteWeights) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: a NaN or infinite weight has no shortest path`, {
            feature: "closenessCentrality.nonFiniteWeights",
        });
    }
    const fits = n > 0 && n <= allPairsCeiling(ctx.caps.limits).maxNodes;
    let route: ClosenessRoute;
    if (sources !== null || !fits) {
        route = weighted ? "per-source" : "levels";
    } else {
        route = tuning.route ?? (weighted || n <= ALL_PAIRS_MAX_NODES ? "all-pairs" : "levels");
    }
    if (route === "levels" && weighted) {
        route = "per-source";
    }
    tuning.onRoute?.(route);
    if (route === "all-pairs") {
        return allPairsRoute(ctx, s, scores, weighted, harmonic, options);
    }
    if (route === "per-source") {
        return perSourceRoute(ctx, s, scores, sources, harmonic, options);
    }
    return levelRoute(ctx, s, scores, sources, harmonic, levelsPerSubmit, options, tuning);
}

/**
 * Closeness centrality on the device (spec 3.3 line 810, design 8.4, 9.7): `scores[s] = 1 / sumDist_s` over the finite
 * distances from `s` to every other node, `0` when nothing is reached -- the legacy default of `@graphty/algorithms`'
 * `closenessCentrality` -- or, with `harmonic`, the sum of `1 / dist` over the same nodes. Small and weighted
 * graphs whose all-pairs matrix fits one binding run the all-pairs sweep and a row sum; other unweighted graphs run a
 * bit-parallel multi-source search of up to 256 sources per batch; weighted graphs above the all-pairs ceiling run one
 * `sssp` per source. `weighted` defaults to the snapshot's flag, `maxIterations` / `tolerance` are refused when
 * defined. `iterations` is the source batches run and `converged` is always true.
 *
 * SAMPLED (`sources`, node indices, duplicates run twice; undirected snapshots only, E_UNSUPPORTED
 * `closenessCentrality.directedSources` otherwise; not with `harmonic`, E_UNSUPPORTED
 * `closenessCentrality.sampledHarmonic`): the batches seed the listed sources instead of every node, and each node's
 * score is `1 / sum` of its distances to the sources that reach it (itself excluded), `0` when none does: the sampled
 * score of the CPU port, unscaled. `sourcesUsed` is the list's length (`n` exact).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - `weighted`, `harmonic`, `sources`, plus dest (a Float32Array of length n for `scores`) / signal / onProgress
 * @returns the scores, the batches run, `converged: true`, `precision: "f32"` and `sourcesUsed`
 */
export function closenessCentrality(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: ClosenessAcceleratorOptions & HitsOptionsLike & GpuRunOptions,
): Promise<GpuClosenessResult> {
    return closenessWithTuning(ctx, s, options, {});
}
