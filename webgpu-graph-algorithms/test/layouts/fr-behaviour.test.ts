/**
 * The behaviour pins of spec 11.4 applied to the Fruchterman-Reingold model (P5-T3; mirroring
 * test/layouts/fa2-behaviour.test.ts): the empty graph, a single node, two coincident nodes separating (PD-10), the
 * `fixed` option at creation with the output NOT rescaled (design 13 row P5: an analytic box, no tolerance), the
 * `iterations` budget, the temperature trace across a reheat and the settle after the temperature reaches 0
 * (DEP-P5-C, measured), the disconnected-components and completeGraph(6) pins, seed determinism, z === center.z in
 * 2D, the exact tier and the k trace records. No case compares a coordinate with the oracle and no case uses a
 * derived or a literal tolerance; every GPU case runs its layout twice and asserts the owner's arrays bitwise equal
 * first (spec 11.2).
 */

import { type F32, type GraphSnapshot, makeMask, maskSet, maskTest } from "@graphty/graph-format";

import { FR_REHEAT_FRACTION, FR_START_TEMPERATURE } from "../../src/constants.js";
import { GpuContext } from "../../src/context.js";
import { WebGpuGraphError } from "../../src/errors.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { type FruchtermanReingoldStats, type GpuLayoutSimulation } from "../../src/types/layout.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import { paritySnapshot, pinIndex, pinMask } from "../helpers/fa2-parity.js";
import { snapshotOf } from "../helpers/graphs.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { componentSeparation, spread } from "../helpers/metrics.js";
import { acquire, acquireRaw, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;

type FrSim = GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;

/** The options every case starts from: layout units = scene units, seeded, the exact tier. */
const BASE: FruchtermanReingoldOptions = Object.freeze({
    dim: 2,
    scale: 1,
    center: [0, 0, 0],
    seed: 7,
    settleThreshold: 0,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
});

/**
 * Runs `fn` with a fresh simulation and disposes it afterwards (also on throw). The caller releases the snapshot.
 */
async function withSim<T>(
    ctx: GpuContext,
    options: FruchtermanReingoldOptions,
    fn: (sim: FrSim) => Promise<T>,
): Promise<T> {
    const sim = createFruchtermanReingold(ctx, { ...options, repulsion: "exact" });
    try {
        return await fn(sim);
    } finally {
        sim.dispose();
    }
}

/**
 * The run-twice rule (spec 11.2): `layout` is run twice and the two owner arrays must be bitwise equal; the first is
 * returned for the case's own assertions.
 */
async function twice(layout: () => Promise<F32>): Promise<F32> {
    const a = await layout();
    const b = await layout();
    expectBitwiseEqual(a, b, "the same layout twice on the same device");
    return a;
}

function nanPositions(n: number): F32 {
    return new Float32Array(3 * n).fill(Number.NaN);
}

/** The bounding-box extent of one axis of a stride-3 array. */
function extent(positions: F32, n: number, axis: number): number {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < n; i++) {
        lo = Math.min(lo, positions[3 * i + axis]);
        hi = Math.max(hi, positions[3 * i + axis]);
    }
    return hi - lo;
}

/** The scene-unit distance between two rows. */
function distance(positions: F32, i: number, j: number): number {
    return Math.hypot(
        positions[3 * i] - positions[3 * j],
        positions[3 * i + 1] - positions[3 * j + 1],
        positions[3 * i + 2] - positions[3 * j + 2],
    );
}

describe("FR behaviour pins (spec 11.4, 7.20; the CPU layout test's pins on the GPU)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "fr-behaviour" });
    });

    it("the empty graph: load() and step() resolve, settled at once, no GPU work (mapAsync 0), dispose leaves no buffer", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        const s = snapshotOf([], { nodeCount: 0, label: "empty" });
        try {
            const sim = createFruchtermanReingold(own, BASE);
            const positions = new Float32Array(0);
            sim.load(s, positions);
            expect(sim.settled).toBe(true);
            counter.resetMapAsync();
            await sim.step();
            await sim.run();
            expect(counter.mapAsyncCalls, "no readback for an empty graph").toBe(0);
            expect(positions).toHaveLength(0);
            expect(sim.iterationsDone).toBe(0);
            sim.dispose();
        } finally {
            own.release(s);
            own.dispose();
        }
        expect(counter.live, "live buffers after dispose").toBe(0);
        counter.restore();
    });

    it("a single node never moves: no pair, no arc, every force is zero", async (t) => {
        requireGpu(t);
        const s = snapshotOf([], { nodeCount: 1, label: "one" });
        try {
            const start = Float32Array.from([0.8, 0.6, 0]);
            const positions = await twice(() =>
                withSim(ctx, { ...BASE, iterations: 20, settleThreshold: 0.001 }, async (sim) => {
                    const out = Float32Array.from(start);
                    sim.load(s, out);
                    await sim.run({ batch: 5 });
                    expect(sim.settled).toBe(true);
                    expect(sim.iterationsDone).toBeGreaterThan(0);
                    expect(sim.stats.meanDisplacement).toBe(0);
                    return out;
                }),
            );
            expectBitwiseEqual(positions, start, "one node stays put");
        } finally {
            ctx.release(s);
        }
    });

    it("two coincident nodes separate after one iteration (the antisymmetric kick of PD-10 at the temperature cap)", async (t) => {
        requireGpu(t);
        const s = snapshotOf([], { nodeCount: 2, label: "coincident" });
        try {
            const start = Float32Array.from([0.3, 0.3, 0, 0.3, 0.3, 0]);
            const positions = await twice(() =>
                withSim(ctx, BASE, async (sim) => {
                    const out = Float32Array.from(start);
                    sim.load(s, out);
                    await sim.step(1);
                    return out;
                }),
            );
            expect(distance(positions, 0, 1)).toBeGreaterThan(0);
            for (const i of [0, 1]) {
                expect(
                    Math.hypot(positions[3 * i] - 0.3, positions[3 * i + 1] - 0.3),
                    `node ${i} moved`,
                ).toBeGreaterThan(0);
            }
            // antisymmetric: the two kicks are opposite, so the midpoint stays where the pair was
            expect(Math.abs((positions[0] + positions[3]) / 2 - 0.3)).toBeLessThan(Math.abs(positions[0] - 0.3));
        } finally {
            ctx.release(s);
        }
    });

    it(
        "fixed at creation: the pinned row is bitwise where the seed put it after run({ maxIter: 20 }) and the other rows are NOT rescaled (design 13 row P5); a bool column with role fixed pins the same rows; a missing column is E_INVALID_ARGUMENT",
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            const n = s.nodeCount;
            const pin = pinIndex(n);
            const mask = pinMask(n, pin);
            const columned = s.withColumns({ pinned: { data: mask, decl: { dtype: "bool", role: "fixed" } } });
            try {
                // scale 3, center [10, 20, 0]: every row is seeded in [0, 1) layout units (the "fr" range), i.e. x in
                // [10, 13) and y in [20, 23); K5 moves a free row by at most temperature <= 0.1 layout units per
                // iteration, so after 20 iterations every free row lies in x [4, 19], y [14, 29], z === 0. A rescale
                // to the [-1, 1] box (what the legacy CPU layout applies and 7.18 forbids) would miss it on every row.
                const options: FruchtermanReingoldOptions = { ...BASE, scale: 3, center: [10, 20, 0], fixed: mask };
                const check = (positions: F32, seeded: F32): void => {
                    for (let i = 0; i < n; i++) {
                        const x = positions[3 * i];
                        const y = positions[3 * i + 1];
                        const z = positions[3 * i + 2];
                        if (i === pin) {
                            expect(x, "pinned x").toBe(seeded[3 * i]);
                            expect(y, "pinned y").toBe(seeded[3 * i + 1]);
                            expect(z, "pinned z").toBe(seeded[3 * i + 2]);
                            continue;
                        }
                        expect(x >= 4 && x <= 19, `row ${i}: x ${x} in [4, 19]`).toBe(true);
                        expect(y >= 14 && y <= 29, `row ${i}: y ${y} in [14, 29]`).toBe(true);
                        expect(z, `row ${i}: z`).toBe(0);
                    }
                };
                const layoutWith =
                    (snapshot: GraphSnapshot, fixed: FruchtermanReingoldOptions["fixed"]) => async (): Promise<F32> =>
                        withSim(ctx, { ...options, fixed }, async (sim) => {
                            const positions = nanPositions(n);
                            sim.load(snapshot, positions);
                            const seeded = Float32Array.from(positions);
                            for (const v of seeded) {
                                expect(Number.isFinite(v)).toBe(true);
                            }
                            expect(seeded[3 * pin] >= 10 && seeded[3 * pin] < 13, "seeded in the fr range").toBe(true);
                            await sim.run({ maxIter: 20 });
                            expect(sim.iterationsDone).toBe(20);
                            check(positions, seeded);
                            // the free rows moved
                            expect(
                                Array.from(positions).some((v, i) => Math.floor(i / 3) !== pin && v !== seeded[i]),
                            ).toBe(true);
                            return positions;
                        });
                const byMask = await twice(layoutWith(s, mask));
                const byColumn = await twice(layoutWith(columned, "pinned"));
                expectBitwiseEqual(byColumn, byMask, 'fixed: "pinned" pins the same rows as the mask');
                const byRole = await twice(layoutWith(columned, null));
                expectBitwiseEqual(byRole, byMask, "the role-fixed column is taken when fixed is null");
                await withSim(ctx, { ...options, fixed: "absent" }, async (sim) => {
                    let caught: unknown = null;
                    try {
                        sim.load(s, nanPositions(n));
                    } catch (err) {
                        caught = err;
                    }
                    expect(caught).toBeInstanceOf(WebGpuGraphError);
                    if (caught instanceof WebGpuGraphError) {
                        expect(caught.code).toBe("E_INVALID_ARGUMENT");
                        expect(caught.details.argument).toBe("fixed");
                    }
                    // the failed load() left the simulation unloaded
                    await expect(sim.step(1)).rejects.toMatchObject({ code: "E_NOT_LOADED" });
                });
            } finally {
                ctx.release(s);
                ctx.release(columned);
            }
        },
        CASE_TIMEOUT,
    );

    it("iterations is the budget: run({ batch: 1 }) stops at exactly iterations with settled true; a later step() submits nothing", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        try {
            const positions = await twice(() =>
                withSim(ctx, { ...BASE, iterations: 7 }, async (sim) => {
                    const out = nanPositions(s.nodeCount);
                    sim.load(s, out);
                    const stats = await sim.run({ batch: 1 });
                    expect(sim.iterationsDone).toBe(7);
                    expect(stats.iteration).toBe(7);
                    expect(sim.settled).toBe(true);
                    const frozen = Float32Array.from(out);
                    await sim.step();
                    expect(sim.iterationsDone, "a settled simulation submits nothing").toBe(7);
                    expect(sim.inFlight).toBe(0);
                    expectBitwiseEqual(out, frozen, "positions untouched after the settled step()");
                    return out;
                }),
            );
            expect(positions.every((v) => Number.isFinite(v))).toBe(true);
        } finally {
            ctx.release(s);
        }
    });

    it("the temperature trace: f32(0.1 - i dt) per record, the reheat restarts it at floor(0.7 iterations) dt, and the run settles within settleWindow of the temperature reaching 0 (DEP-P5-C)", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        const iterations = 20;
        const settleWindow = 10;
        const dt = FR_START_TEMPERATURE / (iterations + 1);
        const reheatIndex = Math.floor(FR_REHEAT_FRACTION * iterations);
        try {
            await twice(() =>
                withSim(ctx, { ...BASE, iterations, settleWindow, settleThreshold: 0.001 }, async (sim) => {
                    const out = nanPositions(s.nodeCount);
                    sim.load(s, out);
                    await sim.step(5);
                    const { trace } = sim.stats;
                    expect(trace).toHaveLength(5);
                    for (let i = 0; i < 5; i++) {
                        expect(trace[i].temperature, `record ${i}`).toBe(Math.fround(FR_START_TEMPERATURE - dt * i));
                    }
                    expect(sim.stats.temperature).toBe(trace[4].temperature);
                    sim.reheat();
                    expect(sim.iterationsDone).toBe(0);
                    await sim.step(1);
                    expect(sim.stats.trace[0].temperature, "the reheated temperature").toBe(
                        Math.fround(FR_START_TEMPERATURE - dt * reheatIndex),
                    );
                    await sim.run({ batch: 1 });
                    expect(sim.settled).toBe(true);
                    expect(sim.stats.temperature, "the temperature reached exactly 0").toBe(0);
                    expect(sim.stats.trace[0].temperature).toBe(0);
                    // after the reheat the schedule has iterations - floor(0.7 iterations) + 1 positive temperatures
                    // (the indices floor(0.7 iterations) .. iterations; index iterations still carries dt because
                    // dt = 0.1 / (iterations + 1)), then one iteration at 0 that K1 folds one iteration later, then
                    // settleWindow folds of a zero displacement: the stop lands at most at
                    // (iterations - reheatIndex + 1) + 1 + settleWindow
                    const bound = iterations - reheatIndex + 1 + 1 + settleWindow;
                    expect(sim.iterationsDone, `settled within ${bound} iterations of the reheat`).toBeLessThanOrEqual(
                        bound,
                    );
                    expect(sim.iterationsDone).toBeGreaterThan(iterations - reheatIndex);
                    return out;
                }),
            );
        } finally {
            ctx.release(s);
        }
    });

    it("two disconnected triangles end up separated by more than 0.03 after 50 iterations; completeGraph(6) spreads > 0.3 in width and height", async (t) => {
        requireGpu(t);
        const triangles = snapshotOf(
            [
                [0, 1],
                [1, 2],
                [0, 2],
                [3, 4],
                [4, 5],
                [3, 5],
            ],
            { nodeCount: 6, label: "two-triangles" },
        );
        const complete6 = paritySnapshot("complete6", 1, false);
        try {
            const separated = await twice(() =>
                withSim(ctx, { ...BASE, iterations: 50 }, async (sim) => {
                    const out = nanPositions(6);
                    sim.load(triangles, out);
                    await sim.run({ batch: 10 });
                    expect(sim.iterationsDone).toBe(50);
                    return out;
                }),
            );
            expect(separated.every((v) => Number.isFinite(v))).toBe(true);
            expect(componentSeparation(triangles, separated, 2)).toBeGreaterThan(0.03);
            const spreadOut = await twice(() =>
                withSim(ctx, { ...BASE, iterations: 50 }, async (sim) => {
                    const out = nanPositions(6);
                    sim.load(complete6, out);
                    await sim.run({ batch: 10 });
                    return out;
                }),
            );
            expect(extent(spreadOut, 6, 0), "width").toBeGreaterThan(0.3);
            expect(extent(spreadOut, 6, 1), "height").toBeGreaterThan(0.3);
            expect(spread(spreadOut, 6, 2)).toBeGreaterThan(0.3);
        } finally {
            ctx.release(triangles);
            ctx.release(complete6);
        }
    });

    it(
        "the same seed gives the same layout bitwise on the same device; a different seed gives a different layout",
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            try {
                const layoutWith = (seed: number) => (): Promise<F32> =>
                    withSim(ctx, { ...BASE, seed, iterations: 20 }, async (sim) => {
                        const positions = nanPositions(s.nodeCount);
                        sim.load(s, positions);
                        await sim.run({ batch: 5 });
                        return positions;
                    });
                const a = await twice(layoutWith(42));
                const c = await layoutWith(43)();
                expect(
                    a.some((v, i) => v !== c[i]),
                    "seed 43 differs",
                ).toBe(true);
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it("2D writes z === center.z on every readback whatever z was uploaded (spec 7.13); a 3D run moves z", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        const n = s.nodeCount;
        try {
            const flat = await twice(() =>
                withSim(ctx, { ...BASE, center: [0, 0, 0.25] }, async (sim) => {
                    const positions = nanPositions(n);
                    sim.load(s, positions);
                    for (let i = 0; i < n; i++) {
                        positions[3 * i + 2] = 5 + i;
                    }
                    await sim.step(3);
                    return positions;
                }),
            );
            for (let i = 0; i < n; i++) {
                expect(flat[3 * i + 2], `z of node ${i}`).toBe(Math.fround(0.25));
                expect(Number.isFinite(flat[3 * i])).toBe(true);
                expect(Number.isFinite(flat[3 * i + 1])).toBe(true);
            }
            let seededZ: F32 = new Float32Array(0);
            const solid = await twice(() =>
                withSim(ctx, { ...BASE, dim: 3 }, async (sim) => {
                    const positions = nanPositions(n);
                    sim.load(s, positions);
                    seededZ = Float32Array.from(positions);
                    await sim.step(3);
                    return positions;
                }),
            );
            expect(
                Array.from({ length: n }, (_, i) => solid[3 * i + 2]).some((z, i) => z !== seededZ[3 * i + 2]),
                "a 3D run moves z",
            ).toBe(true);
        } finally {
            ctx.release(s);
        }
    });

    it("stats.repulsionTier is exact and stats.trace has k records after step(k); a masked row set through setFixed stays put", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        const n = s.nodeCount;
        try {
            const mask = makeMask(n);
            maskSet(mask, 5, true);
            const positions = await twice(() =>
                withSim(ctx, BASE, async (sim) => {
                    const out = nanPositions(n);
                    sim.load(s, out);
                    sim.setFixed(mask);
                    const pinned = [out[15], out[16], out[17]];
                    await sim.step(4);
                    const { stats } = sim;
                    expect(stats.repulsionTier).toBe("exact");
                    expect(stats.maxCellOccupancy).toBeNull();
                    expect(stats.outsideGrid).toBeNull();
                    expect(stats.trace).toHaveLength(4);
                    expect(stats.iteration).toBe(4);
                    expect(stats.centroid).toHaveLength(3);
                    for (const record of stats.trace) {
                        expect(Number.isFinite(record.temperature)).toBe(true);
                        expect(Number.isFinite(record.meanDisplacement)).toBe(true);
                        expect(Number.isInteger(record.settledCount)).toBe(true);
                    }
                    expect(maskTest(mask, 5)).toBe(true);
                    expect([out[15], out[16], out[17]]).toEqual(pinned);
                    await sim.step(2);
                    expect(sim.stats.trace).toHaveLength(2);
                    expect(sim.stats.iteration).toBe(6);
                    return out;
                }),
            );
            expect(positions.every((v) => Number.isFinite(v))).toBe(true);
        } finally {
            ctx.release(s);
        }
    });
});
