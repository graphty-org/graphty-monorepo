/**
 * The behaviour pins of the spring-electrical preset (spec 11.4; P5-T5 Step 3): the empty graph, a single node, two
 * coincident nodes separating (PD-10), a pinned node immobile while its neighbours move, the kinetic-energy trace
 * semantics of PD-4 (0 before the first batch and on the first record after load(), positive afterwards, always
 * finite and non-negative), a setPosition honoured with the dragged node's velocity NOT reset, the `velocity` buffer
 * name (PD-2: `inspect("oldForce")` is E_INVALID_ARGUMENT on this model), z === center.z in 2D, the same seed
 * bitwise, and the grid tier E_UNSUPPORTED. No derived tolerance and no literal one: every check is bitwise, a
 * count or a sign.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { GpuContext } from "../../src/context.js";
import { WebGpuGraphError } from "../../src/errors.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutTuning, type SpringElectricalStats } from "../../src/types/layout.js";
import { type SpringElectricalOptions } from "../../src/types/options.js";
import { pinMask } from "../helpers/fa2-parity.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { seededScenePositions } from "../oracle/forceatlas2.js";
import { acquire, acquireRaw, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;

type SeSim = ForceSimulation<SpringElectricalOptions, SpringElectricalStats>;

/** The options every case starts from: layout units = scene units, seeded, settling disabled. */
const BASE: SpringElectricalOptions = Object.freeze({
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
 * A spring-electrical simulation with ctx.debug.inspect set BEFORE construction, disposed after `fn`.
 * @param ctx - the context
 * @param options - the options (and tuning)
 * @param fn - the work
 * @returns whatever fn returns
 */
async function withSe<T>(
    ctx: GpuContext,
    options: SpringElectricalOptions & GpuLayoutTuning,
    fn: (sim: SeSim) => Promise<T>,
): Promise<T> {
    ctx.debug.inspect = true;
    const sim = createSpringElectrical(ctx, options);
    if (!(sim instanceof ForceSimulation)) {
        throw new Error("createSpringElectrical did not return a ForceSimulation");
    }
    try {
        return await fn(sim);
    } finally {
        sim.dispose();
    }
}

function inspector(sim: SeSim): (name: string) => Promise<Float32Array | Uint32Array> {
    const { inspect } = sim;
    if (inspect === undefined) {
        throw new Error("ctx.debug.inspect must be true before createSpringElectrical");
    }
    return (name) => inspect.call(sim, name);
}

function start(s: GraphSnapshot, seed: number): F32 {
    return seededScenePositions(s, seed, 2, 1, null);
}

/** Runs `run` twice on fresh simulations and asserts the owner's arrays are bitwise identical (spec 11.9 run twice). */
async function twice(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: SpringElectricalOptions,
    run: (sim: SeSim, positions: F32) => Promise<void>,
): Promise<F32> {
    const one = await withSe(ctx, options, async (sim) => {
        const positions = start(s, options.seed ?? 7);
        await run(sim, positions);
        return positions;
    });
    const two = await withSe(ctx, options, async (sim) => {
        const positions = start(s, options.seed ?? 7);
        await run(sim, positions);
        return positions;
    });
    expectBitwiseEqual(one, two, "the same run twice");
    return one;
}

function asF32(x: Float32Array | Uint32Array): F32 {
    if (!(x instanceof Float32Array)) {
        throw new Error("expected a Float32Array readback");
    }
    return Float32Array.from(x);
}

function rowMoved(a: F32, b: F32, i: number): boolean {
    return a[3 * i] !== b[3 * i] || a[3 * i + 1] !== b[3 * i + 1] || a[3 * i + 2] !== b[3 * i + 2];
}

describe("spring-electrical behaviour pins (spec 11.4, 7.20)", () => {
    let ctx: GpuContext;
    let karate: GraphSnapshot;

    beforeAll(async () => {
        ctx = await acquire({ label: "se-behaviour" });
        karate = snapshotOf(KARATE_EDGES, { label: "karate" });
    });

    afterAll(() => {
        ctx.release(karate);
    });

    it("the empty graph: load() and step() resolve, settled at once, no GPU work (mapAsync 0), dispose leaves no buffer", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        const s = snapshotOf([], { nodeCount: 0, label: "empty" });
        try {
            const sim = createSpringElectrical(own, BASE);
            const positions = new Float32Array(0);
            sim.load(s, positions);
            expect(sim.settled).toBe(true);
            counter.resetMapAsync();
            await sim.step();
            await sim.run();
            expect(counter.mapAsyncCalls, "no readback for an empty graph").toBe(0);
            expect(sim.iterationsDone).toBe(0);
            expect(sim.stats.kineticEnergy).toBe(0);
            sim.dispose();
        } finally {
            own.release(s);
            own.dispose();
        }
        expect(counter.live, "live buffers after dispose").toBe(0);
        counter.restore();
    });

    it("a single node never moves (no pair, no arc: every force is zero)", async (t) => {
        requireGpu(t);
        const s = snapshotOf([], { nodeCount: 1, label: "one" });
        try {
            const at = Float32Array.from([0.8, 0.6, 0]);
            await withSe(ctx, { ...BASE, settleWindow: 200 }, async (sim) => {
                const positions = Float32Array.from(at);
                sim.load(s, positions);
                await sim.run({ maxIter: 50, batch: 10 });
                expect(sim.iterationsDone).toBe(50);
                expectBitwiseEqual(positions, at, "one node stays put");
                expect(sim.stats.kineticEnergy).toBe(0);
            });
        } finally {
            ctx.release(s);
        }
    });

    it("two coincident nodes separate after one iteration (the antisymmetric Coulomb kick, PD-10)", async (t) => {
        requireGpu(t);
        const s = snapshotOf([], { nodeCount: 2, label: "two-coincident" });
        try {
            const positions = await twice(ctx, s, BASE, async (sim, p) => {
                p.set([0.3, 0.2, 0, 0.3, 0.2, 0]);
                sim.load(s, p);
                await sim.step(1);
            });
            const dx = positions[3] - positions[0];
            const dy = positions[4] - positions[1];
            expect(dx * dx + dy * dy, "the pair separated").toBeGreaterThan(0);
            expect(rowMoved(positions, Float32Array.from([0.3, 0.2, 0, 0.3, 0.2, 0]), 0)).toBe(true);
            expect(rowMoved(positions, Float32Array.from([0.3, 0.2, 0, 0.3, 0.2, 0]), 1)).toBe(true);
            // the kick is antisymmetric and both masses are 1: the pair moves in opposite directions
            const x0 = Math.fround(0.3);
            const y0 = Math.fround(0.2);
            expect((positions[0] - x0) * (positions[3] - x0)).toBeLessThanOrEqual(0);
            expect((positions[1] - y0) * (positions[4] - y0)).toBeLessThanOrEqual(0);
            expect(positions[2]).toBe(0);
            expect(positions[5]).toBe(0);
        } finally {
            ctx.release(s);
        }
    });

    it("a pinned node is immobile across 20 iterations while its neighbours move", async (t) => {
        requireGpu(t);
        const n = karate.nodeCount;
        const before = start(karate, 7);
        const positions = await twice(ctx, karate, BASE, async (sim, p) => {
            sim.load(karate, p);
            sim.setFixed(pinMask(n, 0));
            await sim.step(20);
        });
        expect(positions[0]).toBe(before[0]);
        expect(positions[1]).toBe(before[1]);
        expect(positions[2]).toBe(before[2]);
        let moved = 0;
        for (let i = 1; i < n; i++) {
            if (rowMoved(positions, before, i)) {
                moved++;
            }
        }
        expect(moved, "every free node moved").toBe(n - 1);
    });

    it("kineticEnergy: 0 before the first batch and on the first record after load(), positive afterwards, always finite and non-negative (PD-4)", async (t) => {
        requireGpu(t);
        await withSe(ctx, BASE, async (sim) => {
            const positions = start(karate, 7);
            sim.load(karate, positions);
            expect(sim.stats.kineticEnergy, "before the first batch").toBe(0);
            await sim.step(1);
            expect(sim.stats.trace).toHaveLength(1);
            expect(sim.stats.trace[0].kineticEnergy, "the first record folds nothing").toBe(0);
            expect(sim.stats.kineticEnergy, "still 0 after step(1)").toBe(0);
            await sim.step(2);
            const { trace } = sim.stats;
            expect(trace).toHaveLength(2);
            expect(trace[0].kineticEnergy, "iteration 0's integrate, folded by iteration 1's K1").toBeGreaterThan(0);
            expect(trace[1].kineticEnergy, "iteration 1's integrate").toBeGreaterThan(0);
            expect(sim.stats.kineticEnergy).toBe(trace[1].kineticEnergy);
            await sim.step(5);
            for (const record of sim.stats.trace) {
                expect(Number.isFinite(record.kineticEnergy)).toBe(true);
                expect(record.kineticEnergy).toBeGreaterThanOrEqual(0);
            }
        });
        // a first call of step(2): record 0 is 0, record 1 is the energy of iteration 0's integrate
        await withSe(ctx, BASE, async (sim) => {
            sim.load(karate, start(karate, 7));
            await sim.step(2);
            const { trace } = sim.stats;
            expect(trace).toHaveLength(2);
            expect(trace[0].kineticEnergy).toBe(0);
            expect(trace[1].kineticEnergy).toBeGreaterThan(0);
            expect(sim.stats.kineticEnergy).toBe(trace[1].kineticEnergy);
        });
    });

    it('setPosition during a run is honoured and the dragged node\'s velocity is NOT reset (inspect("velocity") unchanged by the call)', async (t) => {
        requireGpu(t);
        const n = karate.nodeCount;
        const i = 5;
        await withSe(ctx, BASE, async (sim) => {
            const read = inspector(sim);
            const positions = start(karate, 7);
            sim.load(karate, positions);
            await sim.step(3);
            const before = asF32(await read("velocity"));
            expect(before).toHaveLength(3 * n);
            const vx = before[3 * i];
            const vy = before[3 * i + 1];
            expect(vx !== 0 || vy !== 0, "the dragged node was moving").toBe(true);
            sim.setFixed(pinMask(n, i));
            sim.setPosition(i, 0.25, -0.5, 0);
            const after = asF32(await read("velocity"));
            expectBitwiseEqual(after, before, "the velocity buffer is untouched by setPosition");
            await sim.step(1);
            expect(positions[3 * i], "the drag reached the owner's array").toBe(0.25);
            expect(positions[3 * i + 1]).toBe(-0.5);
            expect(positions[3 * i + 2]).toBe(0);
            const later = await read("velocity");
            expect(later[3 * i], "a pinned row keeps its velocity across an iteration").toBe(vx);
            expect(later[3 * i + 1]).toBe(vy);
        });
    });

    it('the velocity buffer is named "velocity": inspect("velocity") resolves, inspect("oldForce") is E_INVALID_ARGUMENT', async (t) => {
        requireGpu(t);
        await withSe(ctx, BASE, async (sim) => {
            const read = inspector(sim);
            sim.load(karate, start(karate, 7));
            await sim.step(1);
            const velocity = await read("velocity");
            expect(velocity).toBeInstanceOf(Float32Array);
            expect(velocity).toHaveLength(3 * karate.nodeCount);
            expect(
                velocity.some((v) => v !== 0),
                "the velocity moved off zero",
            ).toBe(true);
            let caught: unknown = null;
            try {
                await read("oldForce");
            } catch (err) {
                caught = err;
            }
            expect(caught).toBeInstanceOf(WebGpuGraphError);
            if (caught instanceof WebGpuGraphError) {
                expect(caught.code).toBe("E_INVALID_ARGUMENT");
                expect(caught.details.argument).toBe("name");
            }
        });
    });

    it("2D writes z === center.z on every readback whatever z was uploaded (spec 7.13)", async (t) => {
        requireGpu(t);
        const options: SpringElectricalOptions = { ...BASE, center: [0, 0, 0.25] };
        await withSe(ctx, options, async (sim) => {
            const positions = seededScenePositions(karate, 7, 2, 1, [0, 0, 0.25]);
            for (let i = 0; i < karate.nodeCount; i++) {
                positions[3 * i + 2] = 5 + i;
            }
            sim.load(karate, positions);
            await sim.step(3);
            for (let i = 0; i < karate.nodeCount; i++) {
                expect(positions[3 * i + 2], `z of node ${i}`).toBe(Math.fround(0.25));
                expect(Number.isFinite(positions[3 * i])).toBe(true);
                expect(Number.isFinite(positions[3 * i + 1])).toBe(true);
            }
        });
    });

    it(
        "the same seed gives the same layout bitwise on the same device; a different seed gives a different layout",
        async (t) => {
            requireGpu(t);
            const layoutWith = async (seed: number): Promise<F32> =>
                await withSe(ctx, { ...BASE, seed }, async (sim) => {
                    const positions = new Float32Array(3 * karate.nodeCount).fill(Number.NaN);
                    sim.load(karate, positions);
                    await sim.run({ maxIter: 20, batch: 5 });
                    return positions;
                });
            const a = await layoutWith(42);
            const b = await layoutWith(42);
            const c = await layoutWith(43);
            expectBitwiseEqual(a, b, "seed 42 twice");
            expect(
                a.some((v, i) => v !== c[i]),
                "seed 43 differs",
            ).toBe(true);
        },
        CASE_TIMEOUT,
    );

    it('the grid tier is E_UNSUPPORTED at load() (repulsion: "grid", and "auto" above exactMaxNodes)', async (t) => {
        requireGpu(t);
        for (const tuning of [{ repulsion: "grid" as const }, { repulsion: "auto" as const, exactMaxNodes: 8 }]) {
            await withSe(ctx, { ...BASE, ...tuning }, (sim) => {
                let caught: unknown = null;
                try {
                    sim.load(karate, start(karate, 7));
                } catch (err) {
                    caught = err;
                }
                expect(caught).toBeInstanceOf(WebGpuGraphError);
                if (caught instanceof WebGpuGraphError) {
                    expect(caught.code).toBe("E_UNSUPPORTED");
                    expect(caught.details.feature).toBe("repulsion.grid");
                }
                expect(sim.state, "the failed load changed nothing").toBe("created");
                return Promise.resolve();
            });
        }
        await withSe(ctx, { ...BASE, repulsion: "exact", exactMaxNodes: 8 }, async (sim) => {
            sim.load(karate, start(karate, 7));
            await sim.step(1);
            expect(sim.stats.repulsionTier).toBe("exact");
        });
    });
});
