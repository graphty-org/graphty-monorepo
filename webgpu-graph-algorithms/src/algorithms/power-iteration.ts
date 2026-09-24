/**
 * The power-iteration driver HITS, eigenvector centrality and Katz centrality share (spec 8.2 lines 2603-2605; M8b
 * plan PD-10): per iteration `pr-scale` at NORM_MODE 1 | 2 | 4 folds the norm term (and the L1 delta) into the
 * per-workgroup partials, `pr-finalize` folds them into the header at `partials[0]` (the square root for L2) and
 * records `firstConverged`, `pr-scale` at NORM_MODE 3 writes `xNorm[u] = x[u] / partials[0].norm` (skipped at
 * mode 4, the identity, where the first scale pass already wrote `xNorm[u] = x[u]`), and `spmv-pull` writes the
 * next iterate. Four dispatches (three for Katz), all on the device, NO readback inside the batch: the scalar
 * normaliser the host cannot supply without a readback is exactly what stays on the device, so these three batch
 * eight iterations per submit like PageRank does.
 *
 * The ping-pong is TWO buffers alternated through two cached bind groups (PD-7 / DEP-M8B-G), and `rankPrev` is the
 * buffer this iteration overwrites: it still holds x(i-2) when `pr-scale` reads it, because the scale runs before
 * the pull in the same pass (PD-9). With an `alternate` adjacency (HITS, spec 8.2: "alternates two pulls") the
 * iterations pull over `adjacency` and `alternate` in turn, and the ring is THREE buffers so the buffer being
 * overwritten holds x(i-3) -- the previous iterate of the same kind -- and the delta stays meaningful. The batch
 * loop duplicates src/algorithms/pagerank.ts, which its own task owns.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { U32_MAX } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { groupsOf, plan1d } from "../kernel/dispatch.js";
import { kernelSpec, PR_PARAMS, PR_PARTIAL } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { assertWholeCore, coreOfView } from "../primitives/core-shape.js";
import { prepareSpmvPull } from "../primitives/spmv.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type Binding } from "../types/memory.js";
import { algorithmScope } from "./scope.js";

/** Iterations per submit (spec 8.2: k = 8). */
const BATCH = 8;
/** Params slots of one batch: four blocks per iteration times the batch, plus a margin (the plan's `4 * 8 + 8`). */
const RING_SLOTS = 4 * BATCH + 8;

/**
 * What one power iteration run needs. `adjacency` is the CoreBinding the pull walks -- the forward core for hubs
 * and eigenvector, coreOfView(view(s, "reverse")) for authorities and Katz (spec 8.2 lines 2603-2606). Exported
 * for runPowerIteration's signature, not imported by name.
 * @public
 */
export interface PowerIterationConfig {
    /**
     * 1 = L1 (sum) normalise, 2 = L2 normalise, 4 = identity (Katz: no normaliser). Never 0 or 3 here: 0 is
     * PageRank's per-node divisor and 3 is the internal scale pass this driver issues itself.
     */
    readonly normMode: 1 | 2 | 4;
    readonly adjacency: CoreBinding;
    /**
     * Null: every iteration pulls over `adjacency`. Non-null: the odd iterations (1, 3, ...) pull over `adjacency`
     * and the even ones over `alternate`, so x(i) = A_alt * norm(A * norm(x(i-2))) -- one interleaved chain of HITS,
     * whose hubs and authorities are the last iterates of the two chains (forward-first and reverse-first). The
     * ring then has three buffers and `weights` must be null or undefined (each core's own weights).
     */
    readonly alternate: CoreBinding | null;
    readonly alpha: number;
    readonly beta: number;
    readonly uniformP: number;
    readonly maxIterations: number;
    readonly tolerance: number;
    /** undefined takes the adjacency's weights, null runs UNWEIGHTED on a weighted snapshot (T4 Step 4). */
    readonly weights: Binding | null | undefined;
    readonly label: string;
    readonly signal: AbortSignal | undefined;
    readonly onProgress: ((done: number, total: number) => void) | undefined;
}

/** The iterate, the device-recorded first converged iteration, and the number of iterations actually run. */
export interface PowerIterationRun {
    readonly scores: F32;
    /** x(m - 1) on an alternating run: the chain's last iterate of the OTHER kind (hub or authority); null otherwise. */
    readonly previous: F32 | null;
    readonly iterations: number;
    readonly converged: boolean;
    readonly iterationsRun: number;
}

/**
 * Validates `options.dest` for a score result of `n` elements.
 * @param dest - the caller's destination array, if any
 * @param n - the node count
 * @param algorithm - the caller's name, for the message
 * @returns the destination as an F32, or null when none was given
 */
export function checkDest(dest: Float32Array | Uint32Array | undefined, n: number, algorithm: string): F32 | null {
    if (dest === undefined) {
        return null;
    }
    if (dest instanceof Float32Array && dest.length === n && dest.buffer instanceof ArrayBuffer) {
        return dest as F32;
    }
    throw new WebGpuGraphError(
        "E_INVALID_ARGUMENT",
        `${algorithm}: dest must be a Float32Array of length ${n} over an ArrayBuffer`,
        {
            argument: "dest",
            value: `${dest.constructor.name}(${dest.length})`,
            expected: `Float32Array(${n}) over an ArrayBuffer`,
        },
    );
}

/**
 * The resident core; a windowed plan is refused with `E_TOO_LARGE { path: "windowed", algorithm }` (spec 3.8, 3.12;
 * DEP-P4-B: only degree and segmentedReduce execute windows).
 * @param ctx - the context
 * @param s - the snapshot
 * @param algorithm - the caller's name
 * @returns the core binding
 */
export function coreOf(ctx: GpuContext, s: GraphSnapshot, algorithm: string): CoreBinding {
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, algorithm);
    return core;
}

/**
 * The reverse adjacency as the CoreBinding the pull walks (the forward buffers on an undirected snapshot, PD-13).
 * @param ctx - the context
 * @param s - the snapshot (n > 0)
 * @returns the reverse core
 */
export function reverseOf(ctx: GpuContext, s: GraphSnapshot): CoreBinding {
    const view = ctx.residency.view(s, "reverse");
    return coreOfView(view, view.scalars.arcCount[0]);
}

/**
 * The E_ABORTED error of a signal.
 * @param algorithm - the caller's name
 * @param batchId - the last submitted batch, when one exists
 * @returns the error
 */
export function aborted(algorithm: string, batchId?: number): WebGpuGraphError {
    return new WebGpuGraphError(
        "E_ABORTED",
        `${algorithm}: the signal was aborted`,
        batchId === undefined ? {} : { batchId },
    );
}

/**
 * Whole-buffer binding of a scratch buffer over its first `size` bytes.
 * @param buffer - the buffer
 * @param size - the bound byte length
 * @returns the binding
 */
function whole(buffer: GPUBuffer, size: number): Binding {
    return { buffer, offset: 0, size, window: null };
}

/**
 * Runs the power iteration of `config` over `n` nodes from x(0) = 1 / n, in batches of eight iterations with ONE
 * readback per batch (the header and the iterate together), stopping at the first batch whose header records a
 * converged iteration or at `maxIterations`. The returned iterate is RAW: the last `spmv-pull` output, which the
 * caller normalises once on the host. The iterate travels with the header in EVERY batch, not once after the loop:
 * whether a batch terminates the run is known only from its header, and a second readback for the iterate would
 * be a second mapAsync (the plan's case 8 counts exactly one). The cost is 4n bytes (8n on an alternating run) of
 * staging per batch of 8 that the loop then discards when it continues -- 40 MB per 8 iterations at 10M nodes;
 * pagerank.ts pays the same.
 * @param ctx - the context
 * @param n - the node count (> 0)
 * @param config - the recurrence, the adjacency and the run options
 * @returns the raw iterate, the first converged iteration, whether it converged and the iterations actually run
 */
export async function runPowerIteration(
    ctx: GpuContext,
    n: number,
    config: PowerIterationConfig,
): Promise<PowerIterationRun> {
    await assertDeviceComputes(ctx);
    const scope = algorithmScope(ctx, config.label, RING_SLOTS);
    try {
        const bytes = 4 * n;
        // x(i) lives in ring[i % ring.length]: two buffers for one pull per iteration, three for the alternating pair
        const ring = (config.alternate === null ? ["rankA", "rankB"] : ["rankA", "rankB", "rankC"]).map((label) =>
            whole(scope.scratch(bytes, label), bytes),
        );
        const xNorm = whole(scope.scratch(bytes, "xNorm"), bytes);
        const scalePlan = plan1d(n, ctx.workgroupSize, ctx.caps);
        const groups = groupsOf(scalePlan);
        const partialsBytes = PR_PARTIAL.byteLength * (1 + groups);
        const partialsBuffer = scope.scratch(partialsBytes, "partials");
        const partials = whole(partialsBuffer, partialsBytes);
        await ctx.allocator.check();
        const pullOptions = { personalization: false, dangling: false, weights: config.weights, tiers: null };
        const pulls = [{ core: config.adjacency, pull: await prepareSpmvPull(scope, config.adjacency, pullOptions) }];
        if (config.alternate !== null) {
            pulls.push({ core: config.alternate, pull: await prepareSpmvPull(scope, config.alternate, pullOptions) });
        }
        const scaleNorm = await ctx.pipelines.kernel(kernelSpec("pr-scale", { NORM_MODE: config.normMode }));
        const scaleApply =
            config.normMode === 4 ? null : await ctx.pipelines.kernel(kernelSpec("pr-scale", { NORM_MODE: 3 }));
        const finalize = await ctx.pipelines.kernel(kernelSpec("pr-finalize", { NORM_MODE: config.normMode }));
        const finalizePlan = plan1d(1, ctx.workgroupSize, ctx.caps);
        const { queue } = ctx.device;
        queue.writeBuffer(ring[0].buffer, 0, new Float32Array(n).fill(1 / n));
        for (const slot of ring.slice(1)) {
            queue.writeBuffer(slot.buffer, 0, new Float32Array(n));
        }
        const header = new ArrayBuffer(PR_PARTIAL.byteLength);
        PR_PARTIAL.write(new DataView(header), { firstConverged: U32_MAX, iteration: 0 });
        queue.writeBuffer(partialsBuffer, 0, header);
        const coefficients = { alpha: config.alpha, beta: config.beta, uniformP: config.uniformP };
        let iterationsRun = 0;
        for (;;) {
            const k = Math.min(BATCH, config.maxIterations - iterationsRun);
            const batch = new CommandBatch(ctx, config.label);
            const pass = batch.pass("iterations");
            for (let i = 0; i < k; i++) {
                const iteration = iterationsRun + i + 1;
                const params = scope.params(PR_PARAMS, {
                    n,
                    groups,
                    iteration,
                    trackConvergence: 1,
                    convergeThreshold: config.tolerance * n,
                });
                const rankIn = ring[(iteration - 1) % ring.length];
                // the slot the pull overwrites still holds x(iteration - ring.length): that is rankPrev (PD-9)
                const rankOut = ring[iteration % ring.length];
                const { core, pull } = pulls[(iteration - 1) % pulls.length];
                // outWeightSum takes rankIn as its dummy: storage-ro, read only under NORM_MODE 0, never compiled here
                const scaleBindings = {
                    rankIn,
                    rankPrev: rankOut,
                    outWeightSum: rankIn,
                    xNorm,
                    partials,
                    P: params.binding,
                };
                scaleNorm.dispatch(pass, scaleNorm.bind(scaleBindings), scalePlan, [params.offset]);
                finalize.dispatch(pass, finalize.bind({ partials, P: params.binding }), finalizePlan, [params.offset]);
                if (scaleApply !== null) {
                    scaleApply.dispatch(pass, scaleApply.bind(scaleBindings), scalePlan, [params.offset]);
                }
                pull.record(pass, core, { xNorm, rankOut, personalization: null, partials }, coefficients);
            }
            batch.endPass();
            const headerRequest = batch.readback(partialsBuffer, 0, PR_PARTIAL.byteLength);
            const scoresRequest = batch.readback(ring[(iterationsRun + k) % ring.length].buffer, 0, bytes);
            // x(m - 1) on an alternating run: the other kind, still intact in the third ring slot
            const previousRequest =
                config.alternate === null
                    ? null
                    : batch.readback(ring[(iterationsRun + k - 1) % ring.length].buffer, 0, bytes);
            scope.flush();
            const submitted = batch.submit();
            const back = await submitted.readback; // the ONE mapAsync of the batch (G7 item 5)
            iterationsRun += k;
            ctx.assertReady();
            if (config.signal?.aborted === true) {
                throw aborted(config.label, submitted.id);
            }
            config.onProgress?.(iterationsRun, config.maxIterations);
            const folded = PR_PARTIAL.read(new DataView(back), headerRequest.offset);
            const firstConverged = folded.firstConverged as number;
            const converged = firstConverged !== U32_MAX;
            if (converged || iterationsRun >= config.maxIterations) {
                if (converged && iterationsRun < config.maxIterations) {
                    config.onProgress?.(config.maxIterations, config.maxIterations);
                }
                return {
                    scores: new Float32Array(back, scoresRequest.offset, n).slice(),
                    previous:
                        previousRequest === null ? null : new Float32Array(back, previousRequest.offset, n).slice(),
                    iterations: converged ? firstConverged : iterationsRun,
                    converged,
                    iterationsRun,
                };
            }
        }
    } finally {
        scope.dispose();
    }
}
