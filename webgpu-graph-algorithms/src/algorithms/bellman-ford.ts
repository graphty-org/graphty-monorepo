/**
 * Bellman-Ford with negative-cycle detection on the device (design 8.4, 3.3 line 809, 9.7; P8-T10, the P8 plan's
 * PD-12 / PD-19 / PD-22 / PD-27 / DEP-P8-E): the edge-parallel relaxation of `bf-relax` over the `edgeList()` view
 * -- every logical edge once, both directions on an undirected snapshot -- in batches of `ROUNDS_PER_BATCH` rounds
 * with the `BfFlags` block (`changed`, `retryExhausted`) zeroed before each batch and read back after it, one
 * `mapAsync` per batch. The loop stops when a batch changed nothing (a reachable negative cycle changes something
 * every round, so nothing has been missed) or when `n - 1` rounds have run, in which case ONE more round runs and
 * `changed` after it IS `hasNegativeCycle`; the last batch is clamped so the reported round count never exceeds
 * `n - 1`. `dist` holds f32 bit patterns and the claim is a BOUNDED compare-exchange (PD-12: `MAX_RETRIES`, because
 * with a negative distance the bit-pattern order reverses and `atomicMin` is wrong, and WGSL lets the exchange fail
 * spuriously): a lane that exhausts the bound raises `retryExhausted`, which the driver treats as changed and runs
 * on -- the lost update is retried by the next round, which examines every edge anyway -- and tallies for the tests;
 * raised in the decision round it is E_VALIDATION, never a guess.
 *
 * The routing is P8-T9's, by the RUN's weight vector (PD-22): `options.weights` when given (`arcCount` long or
 * E_INVALID_ARGUMENT; narrowed to `Float32Array` when it is not one -- a `U32` or `I32` value above 2^24, or the bits
 * of an `F64` value below the f32 ulp, is rounded silently, the package-wide f32 caveat and not a refusal), else the
 * snapshot's column, else none; a run whose vector is all ones, or has none, is the unit-weight BFS of P8-T6 with a
 * depth cap derived from `cutoff` (there is nothing negative to relax) and the flag false; a non-finite weight is
 * E_UNSUPPORTED `bellmanFord.nonFiniteWeights`; `cutoff: NaN` is E_INVALID_ARGUMENT (PD-19); every other cutoff goes
 * to the kernel's `nd <= cutoff` unchanged, a negative one yielding the source alone only when no negative weight
 * can satisfy it. One rule the kernel's shape forces: on an UNDIRECTED snapshot the kernel reads ONE weight per
 * logical edge (its forward arc's) and applies it in both directions, so a caller-supplied override whose two arcs
 * of one edge differ means the caller wanted a directed graph, and the driver REFUSES it (E_UNSUPPORTED
 * `bellmanFord.asymmetricUndirectedWeights`, before any device work) rather than half-honour it; the snapshot's own
 * column never trips it. `edgeToArc` is absent from the residency on a directed snapshot built from a sorted edge
 * list (`flags.arcToEdgeIsIdentity`): edge `e` IS arc `e` there, and the driver binds an `edgeCount`-word iota
 * scratch in that slot (the `fill` kernel's mode 1) so the kernel reads `weights[edgeToArc[e]]` unchanged.
 *
 * `predArc` is P8-T9's predecessor pass under PD-27's tight-subgraph rule (`P.mode 1`): the key is the hop count
 * from the source over every tight arc (`fround(dist[u] + w) == dist[v]`; a tight arc with a negative weight steps to
 * a LARGER distance, so `dist` is no key here), `hops[source] = 0` the only seed and no roots pass, so the chain
 * strictly decreases the key and ends at the source. An ORPHAN -- a reached node the tight subgraph never reaches --
 * can arise only when f32 rounding let a cycle improve a distance once (`s -> a` at 2^24, `a -> b` at +1, `b -> a` at
 * -1: `dist[a]` ends at `2^24 - 1` and the source's arc is no longer tight; exact arithmetic has no such run), and the
 * driver refuses it as E_UNSUPPORTED `bellmanFord.roundedCycle` rather than return a chain that ends short of the
 * source (the seam's walker would hand `arcSourceIn` an `INVALID_INDEX`). With `hasNegativeCycle` the result carries
 * the last round's `dist` and `predArc` and says so: the pass still runs, its chains are still acyclic, a node the
 * tight subgraph does not reach keeps `INVALID_INDEX`, and the orphan refusal is skipped. The tuning entry
 * `bellmanFordWithTuning` (PD-26's shape) is what the tests drive; nothing public exposes it.
 */

import { type F32, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import { F32_INF_BITS, MAX_LEVELS_PER_SUBMIT } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, planGridStride } from "../kernel/dispatch.js";
import { BF_FLAGS, BF_PARAMS, FILL_PARAMS, graphBindings, graphOverrides, kernelSpec } from "../kernels.js";
import { assertWholeCore } from "../primitives/core-shape.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type SsspOptions } from "../types/accelerator.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { type GpuBellmanFordResult } from "../types/traversal.js";
import { algorithmScope } from "./scope.js";
import {
    aborted,
    assertSource,
    bindingOf,
    bitsOf,
    checkDest,
    normaliseCutoff,
    predBufferWords,
    predecessorPass,
    resolveWeights,
    unitWeightRoute,
    type WeightVector,
} from "./sssp.js";

const ALGORITHM = "bellmanFord";

/** Design 8.4: the changed flag is read every 8 rounds (one `mapAsync` per batch). */
const ROUNDS_PER_BATCH = 8;

/** PD-12: the compare-exchange retry bound per lane (contention is per vertex, not global); `components.ts`'s `MAX_STEPS` idiom. */
const MAX_RETRIES = 16;

/**
 * Params slots of the ring, COUNTED (`UniformRing.reserve` wraps silently): a batch of rounds shares ONE `BfParams`
 * record across its dispatches; the setup batch is three `fill`s; the predecessor batch is `MAX_LEVELS_PER_SUBMIT`
 * hop passes, one `fill` and the predecessor pass (34).
 */
const RING_SLOTS = MAX_LEVELS_PER_SUBMIT + 16;

/**
 * The knobs the tests need and nothing public offers (PD-26's shape): the retry bound and the batch cadence.
 * @internal
 */
export interface BellmanFordTuning {
    /** The compare-exchange retry bound per lane (default `MAX_RETRIES`); 1 makes every failed exchange exhaust it. */
    readonly maxRetries?: number | undefined;
    /** Rounds recorded per batch (default `ROUNDS_PER_BATCH`), each batch one readback of the flags. */
    readonly roundsPerBatch?: number | undefined;
}

/**
 * The tuning entry's answer: the result plus what the tests pin.
 * @internal
 */
export interface BellmanFordRun {
    readonly result: GpuBellmanFordResult;
    /** The rounds dispatched before the decision round (at most `n - 1`; 0 on the unit-weight route). */
    readonly rounds: number;
    /** The batches in which some lane exhausted the retry bound (PD-12); 0 on every fixture of the suite. */
    readonly retryExhaustedRounds: number;
}

/**
 * The undirected rule (see the file comment): every arc's weight equals its edge's forward arc's, else E_UNSUPPORTED.
 * @param s - the snapshot (undirected)
 * @param vector - the caller's override, narrowed
 */
function assertSymmetric(s: GraphSnapshot, vector: F32): void {
    const { arcToEdge, edgeToArc } = s;
    for (let a = 0; a < s.arcCount; a++) {
        const forward = edgeToArc[arcToEdge[a]];
        if (vector[a] !== vector[forward]) {
            throw new WebGpuGraphError(
                "E_UNSUPPORTED",
                `${ALGORITHM}: weights[${a}] = ${vector[a]} differs from weights[${forward}] = ${vector[forward]}, the forward arc of the same undirected edge; the kernel reads one weight per edge`,
                { feature: "bellmanFord.asymmetricUndirectedWeights", hint: "use a directed snapshot" },
            );
        }
    }
}

/**
 * Bellman-Ford with the test knobs of PD-26's shape; `bellmanFord` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param source - the source node index
 * @param options - `cutoff` and `weights`, plus dest / signal / onProgress
 * @param tuning - the knobs
 * @returns the result, the rounds run and the retry-exhausted tally
 */
export async function bellmanFordWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    options: (SsspOptions & GpuRunOptions) | undefined,
    tuning: BellmanFordTuning,
): Promise<BellmanFordRun> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const n = s.nodeCount;
    assertSource(ALGORITHM, source, n);
    const maxRetries = tuning.maxRetries ?? MAX_RETRIES;
    if (!Number.isInteger(maxRetries) || maxRetries < 1) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${ALGORITHM}: maxRetries must be an integer >= 1`, {
            argument: "maxRetries",
            value: maxRetries,
            expected: "an integer >= 1",
        });
    }
    const roundsPerBatch = tuning.roundsPerBatch ?? ROUNDS_PER_BATCH;
    if (!Number.isInteger(roundsPerBatch) || roundsPerBatch < 1 || roundsPerBatch > MAX_LEVELS_PER_SUBMIT) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${ALGORITHM}: roundsPerBatch must be an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            {
                argument: "roundsPerBatch",
                value: roundsPerBatch,
                expected: `an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            },
        );
    }
    const dest = checkDest(ALGORITHM, options?.dest, n);
    const vector: WeightVector | null = resolveWeights(ALGORITHM, s, options?.weights);
    const cutoff = normaliseCutoff(ALGORITHM, options?.cutoff);
    if (options?.signal?.aborted) {
        throw aborted(ALGORITHM);
    }
    if (vector === null || vector.allOne) {
        const unit = await unitWeightRoute(ctx, s, source, cutoff, dest, options);
        return { result: { ...unit, hasNegativeCycle: false }, rounds: 0, retryExhaustedRounds: 0 };
    }
    if (!vector.finite) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: a NaN or infinite weight has no shortest path`, {
            feature: "bellmanFord.nonFiniteWeights",
        });
    }
    if (!s.directed && vector.override !== null) {
        assertSymmetric(s, vector.override);
    }
    const { arcCount } = s;
    const core = ctx.residency.core(s, ["rowPtr", "colIdx", "weights", "edgeToArc"]);
    assertWholeCore(core, arcCount, ctx.caps.limits.maxStorageBufferBindingSize, ALGORITHM);
    const edges = ctx.residency.view(s, "edgeList");
    const edgeCount = edges.scalars.edgeCount[0];
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const wg = ctx.workgroupSize;
        const bytes = 4 * n;
        const dist = bindingOf(scope.scratch(bytes, "dist"), bytes);
        const predWords = predBufferWords(n);
        const pred = bindingOf(scope.scratch(4 * predWords, "pred"), 4 * predWords);
        const flags = bindingOf(scope.scratch(BF_FLAGS.byteLength, "flags"), BF_FLAGS.byteLength);
        // the directed identity snapshot has no edgeToArc segment: edge e IS arc e, so an iota stands in the slot
        let iota: Binding | null = null;
        let { edgeToArc } = core;
        if (edgeToArc === null) {
            iota = bindingOf(scope.scratch(4 * edgeCount, "iota"), 4 * edgeCount);
            edgeToArc = iota;
        }
        const { queue } = ctx.device;
        let weightsBinding: Binding | undefined;
        if (vector.override !== null) {
            const uploaded = scope.scratch(4 * arcCount, "weights");
            queue.writeBuffer(uploaded, 0, vector.override);
            weightsBinding = bindingOf(uploaded, 4 * arcCount);
        }
        await ctx.allocator.check();
        const overrides = graphOverrides(core, null, weightsBinding);
        const relax = await ctx.pipelines.kernel(kernelSpec("bf-relax", { UNDIRECTED: !s.directed }));
        const predKernel = await ctx.pipelines.kernel(kernelSpec("sssp-pred", { ...overrides, MODE: 0 }));
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const graph = graphBindings(core, null, weightsBinding);
        const recordFill = (
            pass: GPUComputePassEncoder,
            dst: Binding,
            count: number,
            value: number,
            mode = 0,
        ): void => {
            const params = scope.params(FILL_PARAMS, { count, value, mode, pad0: 0 });
            fill.dispatch(pass, fill.bind({ dst, P: params.binding }), plan1d(count, wg, ctx.caps), [params.offset]);
        };
        const submit = (batch: CommandBatch): ReturnType<CommandBatch["submit"]> => {
            scope.flush();
            return batch.submit();
        };

        // setup: dist = +Inf everywhere, the pred buffer INVALID_INDEX, the iota when needed; then the source at 0
        const setup = new CommandBatch(ctx, `${ALGORITHM}/setup`);
        const setupPass = setup.pass("fill");
        recordFill(setupPass, dist, n, F32_INF_BITS);
        recordFill(setupPass, pred, predWords, INVALID_INDEX);
        if (iota !== null) {
            recordFill(setupPass, iota, edgeCount, 0, 1);
        }
        setup.endPass();
        await submit(setup).readback;
        ctx.assertReady();
        queue.writeBuffer(dist.buffer, dist.offset + 4 * source, Uint32Array.of(0));

        // the rounds: roundsPerBatch per batch, the flags zeroed before and read after; the last batch clamped to
        // n - 1 rounds in all, then the decision round
        const edgePlan = planGridStride(edgeCount, wg, ctx.caps);
        const relaxBindings = {
            edgeSrc: edges.bindings.src,
            edgeDst: edges.bindings.dst,
            edgeToArc,
            weights: graph.weights,
            dist,
            flags,
        };
        const relaxFields = {
            edgeCount,
            stride: edgePlan.stride ?? edgeCount,
            maxRetries,
            cutoffBits: bitsOf(cutoff),
        };
        const zero = new Uint32Array(BF_FLAGS.byteLength / 4);
        const runRounds = async (
            count: number,
            label: string,
        ): Promise<{ readonly changed: number; readonly retryExhausted: number; readonly id: number }> => {
            queue.writeBuffer(flags.buffer, flags.offset, zero);
            const batch = new CommandBatch(ctx, `${ALGORITHM}/${label}`);
            const pass = batch.pass("relax");
            const params = scope.params(BF_PARAMS, relaxFields);
            const bound = relax.bind({ ...relaxBindings, P: params.binding });
            for (let round = 0; round < count; round++) {
                relax.dispatch(pass, bound, edgePlan, [params.offset]);
            }
            batch.endPass();
            const request = batch.readback(flags.buffer, flags.offset, BF_FLAGS.byteLength);
            const submitted = submit(batch);
            const back = await submitted.readback;
            ctx.assertReady();
            const block = BF_FLAGS.read(new DataView(back), request.offset);
            return { changed: Number(block.changed), retryExhausted: Number(block.retryExhausted), id: submitted.id };
        };
        let rounds = 0;
        let retryExhaustedRounds = 0;
        let hasNegativeCycle = false;
        for (;;) {
            const remaining = n - 1 - rounds;
            if (remaining <= 0) {
                // the decision round: a change after n - 1 rounds is a negative cycle reachable from the source
                const decision = await runRounds(1, "decision");
                if (decision.retryExhausted !== 0) {
                    throw new WebGpuGraphError(
                        "E_VALIDATION",
                        `${ALGORITHM}: a lane exhausted the ${maxRetries}-retry compare-exchange bound in the decision round, so its change is not a verdict`,
                        {
                            label: `${ALGORITHM}/retry`,
                            message: "retryExhausted in the decision round",
                            batchId: decision.id,
                        },
                    );
                }
                hasNegativeCycle = decision.changed !== 0;
                break;
            }
            const count = Math.min(roundsPerBatch, remaining);
            const batch = await runRounds(count, "rounds");
            rounds += count;
            if (batch.retryExhausted !== 0) {
                retryExhaustedRounds += 1;
            }
            if (options?.signal?.aborted) {
                throw aborted(ALGORITHM, batch.id);
            }
            options?.onProgress?.(rounds, n);
            if (batch.changed === 0 && batch.retryExhausted === 0) {
                break;
            }
        }

        // the predecessor pass (PD-11, PD-27) under the tight-subgraph rule; the flags block was read after the
        // decision round, so the batch reads dist, the arcs and the pass's two words
        const passed = await predecessorPass({
            algorithm: ALGORITHM,
            ctx,
            scope,
            predKernel,
            recordFill,
            graph,
            dist,
            pred,
            n,
            arcCount,
            source,
            mode: 1,
        });
        if (passed.orphans !== 0 && !hasNegativeCycle) {
            throw new WebGpuGraphError(
                "E_UNSUPPORTED",
                `${ALGORITHM}: ${passed.orphans} reached node(s) the tight subgraph never reaches (a cycle of weights below one f32 ulp relaxed once)`,
                {
                    feature: "bellmanFord.roundedCycle",
                    hint: "a cycle of weights below one f32 ulp relaxed once at a distance above 2^24; scale the weights or shorten the distances",
                },
            );
        }
        const distOut = dest ?? new Float32Array(n);
        distOut.set(passed.dist);
        let reachedCount = 0;
        for (const d of distOut) {
            if (d !== Infinity) {
                reachedCount += 1;
            }
        }
        return {
            result: { dist: distOut, predArc: passed.predArc, reachedCount, hasNegativeCycle },
            rounds,
            retryExhaustedRounds,
        };
    } finally {
        scope.dispose();
    }
}

/**
 * Bellman-Ford on the device (spec 3.3 line 809, design 8.4, 9.7): `dist` in f32 (bitwise the f32 Bellman-Ford
 * fixed point, which is `sssp`'s where the weights are non-negative), `predArc` a tight arc one hop of the tight
 * subgraph below each reached node (the chain always ends at the source), `reachedCount`, and `hasNegativeCycle` --
 * true when a negative cycle is reachable from the source, in which case `dist` and `predArc` are the last round's
 * values, not shortest paths; `cutoff` and `weights` as `sssp` reads them (the seam's `SsspOptions`).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param source - the source node index (E_INVALID_ARGUMENT outside `[0, n)`)
 * @param options - `cutoff` and `weights`, plus dest (a Float32Array of length n for `dist`) / signal / onProgress
 * @returns the distances, the predecessor arcs, the reached count and the negative-cycle flag
 */
export async function bellmanFord(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    options?: SsspOptions & GpuRunOptions,
): Promise<GpuBellmanFordResult> {
    return (await bellmanFordWithTuning(ctx, s, source, options, {})).result;
}
