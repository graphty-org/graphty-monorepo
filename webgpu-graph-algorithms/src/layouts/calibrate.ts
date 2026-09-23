/**
 * calibrateLayout (spec 2.2, 7.8, D26; contract 3.3): the layout-tier micro-benchmark a consumer runs ONCE, off the
 * critical path, to measure the exact / grid crossover on the actual device. For every probed size it builds a seeded
 * G(n, 10n) snapshot, runs ForceAtlas2 on the exact tier and on the grid tier -- one untimed `step(1)` after
 * `load()` (which warms every pipeline through `PipelineCache.warm` of the model's specs, so the first timed step
 * compiles nothing) and then TIMED_ITERATIONS timed `step(1)` calls whose `stats.msPerIteration` (the profiler's GPU
 * time when "timestamp-query" was granted, else the batch wall time) are averaged -- and releases the probe.
 *
 * PLAN DECISION PD-23 (P4-T14): `src/` cannot import `test/helpers` or `benchmarks/`, so the probe graphs are built
 * here from the package's own LCG (`Lcg`, seed.ts) with a fixed seed, and the spec 7.8 rule is re-implemented in
 * `suggestedExactMaxNodes` below; its twin is `exactMaxNodesFromLadder` in benchmarks/layout-exact.bench.ts (the
 * one copy the G3 / G4 records apply to the committed baselines), which test/layouts/calibrate.test.ts compares it
 * with. The function reads `caps` for nothing: never `caps.software` (spec 7.8, Q-6), so on a software adapter it
 * returns honest numbers a caller can compare in shape, never in value.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type CalibrateOptions, type GpuCalibration } from "../types/layout.js";
import { createForceAtlas2 } from "./forceatlas2.js";
import { Lcg } from "./seed.js";

/** The default probe sizes (spec 2.2): the 8k-65k subset of the exact ladder of spec 7.8 / 10.4 T-4. */
export const CALIBRATE_SIZES: readonly number[] = [8_192, 16_384, 32_768, 65_536];

/** The spec 7.8 per-iteration budget of the exact tier, milliseconds (the twin of EXACT_BUDGET_MS in benchmarks/layout-exact.bench.ts). */
const BUDGET_MS = 4;

/** Edges per node of every probe graph (E = 10n, the density of the exact ladder). */
const EDGES_PER_NODE = 10;

/** Timed iterations per size and tier (spec 2.2: "10 timed iterations"). */
const TIMED_ITERATIONS = 10;

/** The seed of every probe graph and of the simulation's own LCG. */
const SEED = 12345;

/**
 * A seeded G(n, 10n) probe snapshot (self-loops and parallels allowed, unweighted, undirected).
 * @param n - the node count
 * @returns the snapshot
 */
function probeSnapshot(n: number): GraphSnapshot {
    const m = EDGES_PER_NODE * n;
    const rng = new Lcg(SEED);
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let e = 0; e < m; e++) {
        src[e] = Math.floor(rng.next() * n);
        dst[e] = Math.floor(rng.next() * n);
    }
    return fromEdgeArrays({ directed: false, nodeCount: n, src, dst }, { label: `calibrate/${n}` });
}

/**
 * The mean ms per iteration of one tier at one size: one untimed step after load(), then TIMED_ITERATIONS timed
 * steps (reheat() before each so a settled simulation never short-circuits). With the profiler (a device that granted
 * "timestamp-query") the sample is the GPU time of the iteration's passes, the quantity the spec 7.8 rule reads; without
 * it the sample is the step's wall time, which also carries the JS submit and the 12n-byte readback -- a fixed cost of
 * ~1-2 ms on a discrete card that is the same for either tier, so the wall ratio understates the grid tier's
 * advantage at every size and the crossover it suggests is, if anything, too high.
 * @param ctx - the context
 * @param snapshot - the probe snapshot
 * @param tier - the repulsion tier to force
 * @returns milliseconds per iteration
 */
async function probeTier(ctx: GpuContext, snapshot: GraphSnapshot, tier: "exact" | "grid"): Promise<number> {
    const n = snapshot.nodeCount;
    const positions = new Float32Array(3 * n).fill(Number.NaN);
    const sim = createForceAtlas2(ctx, {
        dim: 2,
        seed: SEED,
        maxIter: 1_000_000,
        iterationsPerStep: 1,
        maxInFlight: 1,
        repulsion: tier,
        compat: "paper",
    });
    try {
        sim.load(snapshot, positions);
        await sim.step(1);
        let total = 0;
        for (let i = 0; i < TIMED_ITERATIONS; i++) {
            sim.reheat();
            const start = performance.now();
            await sim.step(1);
            const wall = performance.now() - start;
            total += sim.stats.msPerIteration ?? wall;
        }
        return total / TIMED_ITERATIONS;
    } finally {
        sim.dispose();
    }
}

/**
 * The largest power of two that is <= n (the twin of floorPow2 in benchmarks/layout-exact.bench.ts).
 * @param n - a number >= 1
 * @returns the largest power of two not above n
 */
function floorPow2(n: number): number {
    let p = 1;
    while (p * 2 <= n) {
        p *= 2;
    }
    return p;
}

/**
 * The spec 7.8 rule over the probed sizes (the twin of exactMaxNodesFromLadder(rows, budget, gridRows) in
 * benchmarks/layout-exact.bench.ts, which test/layouts/calibrate.test.ts compares it with): the largest probed n with
 * exactMs(n) <= BUDGET_MS and exactMs(n) <= gridMs(n), rounded down to a power of two.
 *
 * CONTRACT DECISION (the review of P4-T14; spec 2.2 is silent): when NO probed size satisfies the rule -- the grid
 * tier faster than the exact tier at every probe (the RTX 4070 SUPER with the default sizes: the grid beats the exact
 * tier from 4k up), or every probe over the budget -- the benchmark twin throws and hands the value to an owner
 * decision (spec 10.4), which a library call cannot do. The answer here is then the largest power of two STRICTLY
 * BELOW the smallest probe (1 when the smallest probe is 1): the exact tier runs at no probed size, the unprobed range
 * below keeps the exact tier (whose cost falls with n^2 and is the oracle), and the value is distinguishable from a
 * rule answer, which is never below floorPow2(min(sizes)). A caller that wants the crossover itself probes smaller
 * sizes (the T-4 ladder from 1k); one that wants the exact tier nowhere passes `repulsion: "grid"`.
 * @param sizes - the probed sizes (integers >= 1)
 * @param exactMs - ms per iteration of the exact tier per size
 * @param gridMs - ms per iteration of the grid tier per size
 * @returns the suggested exactMaxNodes
 */
export function suggestedExactMaxNodes(
    sizes: readonly number[],
    exactMs: Readonly<Record<number, number>>,
    gridMs: Readonly<Record<number, number>>,
): number {
    let best = 0;
    for (const n of sizes) {
        if (exactMs[n] <= BUDGET_MS && exactMs[n] <= gridMs[n] && n > best) {
            best = n;
        }
    }
    return floorPow2(best === 0 ? Math.max(1, Math.min(...sizes) - 1) : best);
}

/**
 * Spec 2.2 calibrateLayout, verbatim: measures ms per iteration of the exact and the grid repulsion tier at every
 * probed size on THIS device and suggests `exactMaxNodes` by the spec 7.8 rule (`suggestedExactMaxNodes` above, with
 * its below-the-range answer when no probed size qualifies). Every probe graph is built here and released before the
 * call returns; `firstCallMs` is the wall time of the whole call (pipeline compilation included the first time). The
 * app passes `suggestedExactMaxNodes` through `createAccelerator(ctx, { layout: { exactMaxNodes } })`; the package
 * never calls this implicitly and `"auto"` never depends on `caps.software`.
 * @param ctx - the context (E_DISPOSED / E_DEVICE_LOST through assertReady)
 * @param options - the probe sizes (positive integers; default CALIBRATE_SIZES)
 * @returns the calibration record
 */
export async function calibrateLayout(ctx: GpuContext, options?: CalibrateOptions): Promise<GpuCalibration> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const sizes = options?.sizes ?? CALIBRATE_SIZES;
    if (!Array.isArray(sizes) || sizes.length === 0 || !sizes.every((n) => Number.isInteger(n) && n >= 1)) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "sizes must be a non-empty list of integers >= 1", {
            argument: "sizes",
            value: sizes,
            expected: "a non-empty list of integers >= 1",
        });
    }
    const start = performance.now();
    const exactMsPerIter: Record<number, number> = {};
    const gridMsPerIter: Record<number, number> = {};
    for (const n of sizes) {
        const snapshot = probeSnapshot(n);
        try {
            exactMsPerIter[n] = await probeTier(ctx, snapshot, "exact");
            gridMsPerIter[n] = await probeTier(ctx, snapshot, "grid");
        } finally {
            ctx.release(snapshot);
        }
    }
    const largest = Math.max(...sizes);
    const pairs = largest * (largest - 1);
    return {
        pairsPerSecond: (pairs / exactMsPerIter[largest]) * 1000,
        exactMsPerIter,
        gridMsPerIter,
        suggestedExactMaxNodes: suggestedExactMaxNodes(sizes, exactMsPerIter, gridMsPerIter),
        firstCallMs: performance.now() - start,
    };
}
