/**
 * Browser leg of the Fruchterman-Reingold and spring-electrical simulations (spec 11.6 item 3; 13 row P5 "browser
 * smoke"; P5-T9) on the shape of test/browser/forceatlas2.test.ts: the 500-node smoke of each model -- load, step(10)
 * five times with maxInFlight 2, positions written back, setPosition / setFixed honoured, dispose clean -- with the
 * model's own trace checked (a strictly decreasing FR temperature; a spring-electrical kineticEnergy that is exactly 0
 * on the first record after load() and positive on every later one, PD-4's one-iteration lag), the FR frame loop
 * through the widened helper (PD-18), and the G5 settle item in Chromium: the preset settles on the story graph within
 * 1,000 iterations on SwiftShader at full size. Chromium on SwiftShader on the default lane, the NVIDIA card on the GPU
 * lane and the dev box; the frame loop's fixture follows browserScale(), the smokes keep the spec's 500 nodes and the
 * settle keeps the story's 150.
 *
 * `inspect` is absent on every simulation here: the browser context carries no debug flag.
 */

import { type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";

import { MAX_ITERATIONS_PER_STEP } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import {
    type FruchtermanReingoldStats,
    type GpuLayoutSimulation,
    type LayoutStatsBase,
    type SpringElectricalStats,
} from "../../src/types/layout.js";
import {
    type CommonLayoutOptions,
    type FruchtermanReingoldOptions,
    type SimulationOptions,
    type SpringElectricalOptions,
} from "../../src/types/options.js";
import { runFrameLoop, runFrameLoopUntilSettled } from "../helpers/frame-loop.js";
import { fixture, randomEdges, snapshotOf } from "../helpers/graphs.js";
import { storyGraph } from "../helpers/story-graph.js";
import {
    acquireBrowser,
    browserExpectedAdapter,
    browserExpectsSoftware,
    browserGrantedSoftware,
    browserScale,
    requireBrowserGpu,
} from "../setup/browser.js";

type FrSim = GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;

/** A stats record with a per-iteration trace (both P5 models have one; the smoke reads its length). */
type TracedStats = LayoutStatsBase & { readonly trace: ReadonlyArray<unknown> };

/** The FR budget of the flight-dependent runs: never reached, and its dt keeps the temperature above 0.09 throughout. */
const NEVER = 1_000_000;

/**
 * Pins the adapter the test ran on: requireBrowserGpu only enforces GRAPHTY_GPU_REQUIRE, and under the default
 * lane's `any` a run on the wrong adapter (or a silently different flag set) would pass without a trace.
 * @param ctx - the context acquireBrowser handed out
 */
function expectAdapterMatchesFlagSet(ctx: GpuContext): void {
    expect(ctx.caps.software).toBe(browserExpectsSoftware() ?? browserGrantedSoftware());
    const named = browserExpectedAdapter();
    if (named !== null) {
        expect(ctx.caps.vendor).toBe(named.vendor);
    }
}

function nextTick(): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, 0);
    });
}

/** Chromium clamps nested zero-delay timers to 4 ms; measured (the median of 20 ticks), never assumed. */
async function measureTickMs(): Promise<number> {
    const ticks: number[] = [];
    for (let i = 0; i < 20; i++) {
        const start = performance.now();
        await nextTick();
        ticks.push(performance.now() - start);
    }
    ticks.sort((a, b) => a - b);
    return Math.max(ticks[ticks.length / 2], 0.5);
}

/** One batch of k iterations, timed from the call to the readback landing. */
async function timedStep(sim: FrSim, k: number): Promise<number> {
    const start = performance.now();
    await sim.step(k);
    return performance.now() - start;
}

/** The UNCONTENDED wall time of one batch: the minimum of three timings (see test/layouts/fr-frame-loop.test.ts). */
async function minTimedStep(sim: FrSim, k: number): Promise<number> {
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
        best = Math.min(best, await timedStep(sim, k));
    }
    return best;
}

/**
 * iterationsPerStep that makes one FR batch outlast at least four ticks here (the calibration idiom of
 * test/layouts/fr-frame-loop.test.ts): the step(8) estimate VERIFIED and k doubled until a batch measures >= 4 ticks;
 * throws with the measured ratio when even MAX_ITERATIONS_PER_STEP stays under two ticks. Leaves ctx.pipelines warm
 * for the FR override set.
 */
async function calibrateHeavyStep(ctx: GpuContext, snapshot: GraphSnapshot, tickMs: number): Promise<number> {
    const scratch = createFruchtermanReingold(ctx, { seed: 7, iterations: NEVER, settleThreshold: 0 });
    const positions = new Float32Array(3 * snapshot.nodeCount).fill(NaN);
    scratch.load(snapshot, positions);
    await scratch.step(8);
    const batchMs = Math.max(await minTimedStep(scratch, 8), 0.05);
    let k = Math.min(MAX_ITERATIONS_PER_STEP, Math.max(8, Math.ceil((8 * 4 * tickMs) / batchMs)));
    let measuredMs = await minTimedStep(scratch, k);
    while (measuredMs < 4 * tickMs && k < MAX_ITERATIONS_PER_STEP) {
        k = Math.min(MAX_ITERATIONS_PER_STEP, k * 2);
        measuredMs = await minTimedStep(scratch, k);
    }
    scratch.dispose();
    if (measuredMs < 2 * tickMs) {
        throw new Error(
            `calibrateHeavyStep: step(${k}) measured ${measuredMs.toFixed(3)} ms against ${tickMs.toFixed(3)} ms ticks ` +
                `(${(measuredMs / tickMs).toFixed(2)} ticks per batch): even MAX_ITERATIONS_PER_STEP iterations cannot ` +
                "keep a batch in flight across two tick starts on this adapter",
        );
    }
    return k;
}

/**
 * The graph and iterations-per-step of a flight-dependent run: calibrateHeavyStep on random1k at `scale`, then at
 * twice and four times the scale when a fast adapter behind slow timers cannot outlast the ticks there (the macOS
 * runner's Chromium, test/browser/forceatlas2.test.ts). An abandoned fixture is released again.
 */
async function calibrateFlight(
    ctx: GpuContext,
    scale: number,
    tickMs: number,
): Promise<{ readonly snapshot: GraphSnapshot; readonly k: number }> {
    let failure: unknown = null;
    for (const factor of [1, 2, 4]) {
        const { snapshot } = fixture("random1k", scale * factor);
        try {
            const k = await calibrateHeavyStep(ctx, snapshot, tickMs);
            if (factor > 1) {
                console.warn(
                    `[spring-layouts] calibrated on random1k at ${factor}x the scale (${snapshot.nodeCount} nodes): step(${k}) against ${tickMs.toFixed(1)} ms ticks`,
                );
            }
            return { snapshot, k };
        } catch (err: unknown) {
            failure = err;
            ctx.release(snapshot);
        }
    }
    throw failure;
}

function expectMonotone(values: readonly number[]): void {
    for (let i = 1; i < values.length; i++) {
        expect(values[i], `tick ${i}: ${values[i]} after ${values[i - 1]}`).toBeGreaterThanOrEqual(values[i - 1]);
    }
}

/** What one model's smoke needs beyond the shared body: the factory and the check of a landed batch's trace. */
interface SmokeModel<O extends CommonLayoutOptions & SimulationOptions, S extends TracedStats> {
    /** A simulation with seed 3, maxInFlight 2 and a budget the 60 iterations of the smoke never reach. */
    readonly create: (ctx: GpuContext) => GpuLayoutSimulation<O, S>;
    /** Checks the stats of the last completed batch; `first` is true for the batch that ran iterations 0..9. */
    readonly checkTrace: (stats: S, first: boolean) => void;
}

/**
 * The 11.6 item 3 smoke on 500 nodes / 1,500 edges: load, step(10) x 5 with maxInFlight 2 (the third call after the
 * first landed), iterationsDone 50, the model's trace after the first and the last landing, positions finite and
 * moved with z === 0, setFixed pinning node 7 over two step(5), setPosition(3, 5, -4, 0) honoured and reheating, an
 * unpin reheating, dispose returning allocator.liveBuffers to its value before the simulation existed (only the
 * context's staging ring may have grown).
 * @param ctx - the context
 * @param model - the factory and the trace check
 */
async function smoke<O extends CommonLayoutOptions & SimulationOptions, S extends TracedStats>(
    ctx: GpuContext,
    model: SmokeModel<O, S>,
): Promise<void> {
    const slotsBefore = ctx.readback.slots;
    const liveBefore = ctx.allocator.liveBuffers; // before the simulation's uniform ring exists (3.13)
    const n = 500;
    const snapshot = snapshotOf(randomEdges(n, 1500, 11), { nodeCount: n });
    expect(snapshot.nodeCount).toBe(n);
    const sim = model.create(ctx);
    expect(sim.inspect).toBeUndefined(); // the browser context carries no debug flag
    const positions = new Float32Array(3 * n).fill(NaN);
    sim.load(snapshot, positions);
    const seeded = Float32Array.from(positions);
    expect(seeded.every((v) => Number.isFinite(v))).toBe(true);

    // five step(10) calls with two batches in flight: the third call is made only once the first landed, so
    // nothing coalesces and every call runs its ten iterations; the first landing is the batch of iterations 0..9
    const pending: Promise<void>[] = [];
    let landed = 0;
    for (let i = 0; i < 5; i++) {
        pending.push(sim.step(10));
        expect(sim.inFlight).toBeLessThanOrEqual(2);
        if (pending.length === 2) {
            const oldest = pending.shift();
            if (oldest !== undefined) {
                await oldest;
                landed += 1;
                if (landed === 1) {
                    expect(sim.stats.iteration).toBe(10);
                    expect(sim.stats.trace).toHaveLength(10);
                    model.checkTrace(sim.stats, true);
                }
            }
        }
    }
    await Promise.all(pending);
    expect(sim.inFlight).toBe(0);
    expect(sim.iterationsDone).toBe(50);
    expect(sim.stats.iteration).toBe(50);
    expect(sim.stats.trace).toHaveLength(10); // the last completed batch's k records
    expect(sim.stats.repulsionTier).toBe("exact");
    model.checkTrace(sim.stats, false);

    // positions written back: every value finite, the array moved from the seeds, z == center.z in 2D
    let moved = 0;
    for (let i = 0; i < n; i++) {
        expect(Number.isFinite(positions[3 * i])).toBe(true);
        expect(Number.isFinite(positions[3 * i + 1])).toBe(true);
        expect(positions[3 * i + 2]).toBe(0);
        if (positions[3 * i] !== seeded[3 * i] || positions[3 * i + 1] !== seeded[3 * i + 1]) {
            moved += 1;
        }
    }
    expect(moved).toBeGreaterThan(n / 2);

    // setPosition: the owner's array at once (7.12), reheat (D8), carried through the batches computed after it
    const mask = makeMask(n);
    maskSet(mask, 3, true);
    sim.setFixed(mask); // pin node 3 first: adding a pin does not reheat
    sim.setPosition(3, 5, -4, 0);
    expect(Array.from(positions.subarray(9, 12))).toEqual([5, -4, 0]);
    expect(sim.iterationsDone).toBe(0);
    // setFixed: pin node 7 where it is
    maskSet(mask, 7, true);
    sim.setFixed(mask);
    const node7 = Array.from(positions.subarray(21, 24));
    const before = Float32Array.from(positions);
    await sim.step(5);
    await sim.step(5);
    expect(sim.iterationsDone).toBe(10);
    expect(Array.from(positions.subarray(9, 12))).toEqual([5, -4, 0]); // honoured, not restored by the GPU
    expect(Array.from(positions.subarray(21, 24))).toEqual(node7); // a pinned node never moves (7.12)
    let othersMoved = 0;
    for (let i = 0; i < n; i++) {
        if (i !== 3 && i !== 7 && (positions[3 * i] !== before[3 * i] || positions[3 * i + 1] !== before[3 * i + 1])) {
            othersMoved += 1;
        }
    }
    expect(othersMoved).toBeGreaterThan(0);
    maskSet(mask, 7, false);
    sim.setFixed(mask); // an unpin reheats (7.12)
    expect(sim.iterationsDone).toBe(0);
    await sim.step(5);
    expect(sim.iterationsDone).toBe(5);

    // dispose clean
    sim.dispose();
    sim.dispose(); // idempotent
    await expect(sim.step(1)).rejects.toMatchObject({ code: "E_DISPOSED" });
    expect(ctx.pool.liveBytes).toBe(0);
    ctx.release(snapshot);
    expect(ctx.residency.stats().buffers).toBe(0);
    expect(ctx.pool.idleBytes).toBe(0); // release trims the pool (4.4)
    // every simulation buffer is gone; only the staging ring may have grown (its slots are the context's)
    const grown = ctx.readback.slots - slotsBefore;
    expect(grown).toBeGreaterThanOrEqual(0);
    expect([liveBefore, liveBefore + grown]).toContain(ctx.allocator.liveBuffers);
}

/** The FR smoke: a budget of 1,000 (never reached), a strictly decreasing temperature on every landed batch. */
const FR_SMOKE: SmokeModel<FruchtermanReingoldOptions, FruchtermanReingoldStats> = {
    create: (ctx) => createFruchtermanReingold(ctx, { seed: 3, iterations: 1000, maxInFlight: 2 }),
    checkTrace: ({ trace, temperature }) => {
        expect(trace).toHaveLength(10);
        expect(temperature).toBe(trace[9].temperature);
        for (let i = 0; i < trace.length; i++) {
            expect(Number.isFinite(trace[i].temperature), `record ${i}`).toBe(true);
            expect(trace[i].temperature, `record ${i}`).toBeGreaterThan(0);
            if (i > 0) {
                expect(trace[i].temperature, `record ${i} cooler than ${i - 1}`).toBeLessThan(trace[i - 1].temperature);
            }
        }
    },
};

/** The spring-electrical smoke: no budget (the preset has none), the kinetic energy of PD-4 on every landed batch. */
const SE_SMOKE: SmokeModel<SpringElectricalOptions, SpringElectricalStats> = {
    create: (ctx) => createSpringElectrical(ctx, { seed: 3, maxInFlight: 2 }),
    checkTrace: ({ trace, kineticEnergy }, first) => {
        expect(trace).toHaveLength(10);
        expect(kineticEnergy).toBe(trace[9].kineticEnergy);
        for (let i = 0; i < trace.length; i++) {
            expect(Number.isFinite(trace[i].kineticEnergy), `record ${i}`).toBe(true);
            expect(trace[i].kineticEnergy, `record ${i}`).toBeGreaterThanOrEqual(0);
        }
        // PD-4's one-iteration lag: the first record after load() folds nothing, every later record the energy of
        // the previous iteration's integrate
        if (first) {
            expect(trace[0].kineticEnergy, "the first record of the first batch").toBe(0);
        }
        for (let i = first ? 1 : 0; i < trace.length; i++) {
            expect(trace[i].kineticEnergy, `record ${i}`).toBeGreaterThan(0);
        }
    },
};

describe("createFruchtermanReingold in Chromium: the 11.6 item 3 smoke", () => {
    it("500 nodes: load, step(10) x 5 with maxInFlight 2, a strictly decreasing temperature trace, positions written back, setPosition / setFixed honoured, dispose clean", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser();
        expectAdapterMatchesFlagSet(ctx);
        await smoke(ctx, FR_SMOKE);
    });
});

describe("createSpringElectrical in Chromium: the 11.6 item 3 smoke", () => {
    it("500 nodes: load, step(10) x 5 with maxInFlight 2, kineticEnergy 0 on the first record then positive, positions written back, setPosition / setFixed honoured, dispose clean", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser();
        expectAdapterMatchesFlagSet(ctx);
        await smoke(ctx, SE_SMOKE);
    });
});

describe("the FR frame loop in Chromium (spec 11.4 last bullet through the widened helper, PD-18)", () => {
    it("600 ticks on random1k with the calibrated iterationsPerStep: at most maxInFlight in flight, iterationsDone monotone, settled reported", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser();
        expectAdapterMatchesFlagSet(ctx);
        const { snapshot, k } = await calibrateFlight(ctx, browserScale(), await measureTickMs());
        const n = snapshot.nodeCount;
        const BATCHES = 12;
        const positions = new Float32Array(3 * n).fill(NaN);
        // the budget is BATCHES batches of the calibrated k, so every batch outlasts the ticks and the budget
        // settles the run inside the spec's 600 ticks (further rounds of 600 on an adapter whose batches outlast it)
        const sim = createFruchtermanReingold(ctx, {
            seed: 7,
            iterations: BATCHES * k,
            iterationsPerStep: k,
            maxInFlight: 2,
        });
        sim.load(snapshot, positions);
        const seeded = Float32Array.from(positions);
        const rounds = await runFrameLoopUntilSettled(sim, positions, {
            ticks: 600,
            iterationsPerStep: k,
            maxInFlight: 2,
        });
        expect(rounds[0].submissions).toBeGreaterThanOrEqual(1);
        for (const report of rounds) {
            expect(report.errors).toEqual([]);
            expect(report.submissions).toBeLessThanOrEqual(600);
            expect(report.maxObservedInFlight).toBeLessThanOrEqual(2);
            expect(report.iterationsDoneByTick).toHaveLength(600);
            expectMonotone(report.iterationsDoneByTick);
            expect(report.positionHolds).toEqual([]);
        }
        const last = rounds[rounds.length - 1];
        expect(last.settledAtTick, `settled within ${rounds.length} rounds of 600 ticks`).not.toBeNull();
        if (rounds.length > 1) {
            console.warn(`[spring-layouts] the settle took ${rounds.length} rounds of 600 ticks on this adapter`);
        }
        await sim.flush();
        expect(sim.settled).toBe(true);
        const submissions = rounds.reduce((sum, report) => sum + report.submissions, 0);
        expect(sim.iterationsDone).toBe(submissions * k);
        expect(sim.iterationsDone).toBeLessThanOrEqual((BATCHES + 1) * k); // at most one batch in flight overshoots
        let moved = 0;
        for (let i = 0; i < n; i++) {
            expect(Number.isFinite(positions[3 * i])).toBe(true);
            expect(positions[3 * i + 2]).toBe(0);
            if (positions[3 * i] !== seeded[3 * i] || positions[3 * i + 1] !== seeded[3 * i + 1]) {
                moved += 1;
            }
        }
        expect(moved).toBeGreaterThan(0);
        sim.dispose();
        ctx.release(snapshot);
    });

    it("a setPosition during flight lands in the following batch and is never overwritten by an older one", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser();
        expectAdapterMatchesFlagSet(ctx);
        const { snapshot, k } = await calibrateFlight(ctx, browserScale(), await measureTickMs());
        const n = snapshot.nodeCount;
        const positions = new Float32Array(3 * n).fill(NaN);
        const sim = createFruchtermanReingold(ctx, {
            seed: 7,
            iterations: NEVER,
            settleThreshold: 0,
            iterationsPerStep: k,
            maxInFlight: 2,
        });
        sim.load(snapshot, positions);
        const WRITES = 10;
        const writes = Array.from({ length: WRITES }, (_, j) => ({
            tick: 20 + 20 * j,
            index: j,
            x: 100 + j,
            y: -100 - j,
            z: 0,
        }));
        const mask = makeMask(n);
        const inFlightAtWrite: number[] = [];
        const report = await runFrameLoop(sim, positions, {
            ticks: 600,
            iterationsPerStep: k,
            maxInFlight: 2,
            setPositionAt: writes,
            onTick: (tick) => {
                const write = writes.find((w) => w.tick === tick);
                if (write !== undefined) {
                    maskSet(mask, write.index, true);
                    sim.setFixed(mask);
                    inFlightAtWrite.push(sim.inFlight);
                }
            },
        });
        expect(report.errors).toEqual([]);
        expect(report.positionHolds).toHaveLength(WRITES);
        for (const hold of report.positionHolds) {
            expect(hold.held, `write at tick ${hold.tick} on node ${hold.index}`).toBe(true);
        }
        expect(Math.max(...inFlightAtWrite)).toBeGreaterThanOrEqual(1);
        expect(report.maxObservedInFlight).toBeLessThanOrEqual(2);
        await sim.flush();
        for (const w of writes) {
            expect(Array.from(positions.subarray(3 * w.index, 3 * w.index + 3)), `node ${w.index}`).toEqual([
                w.x,
                w.y,
                0,
            ]);
        }
        sim.dispose();
        ctx.release(snapshot);
    });
});

describe("the spring-electrical preset in Chromium: the G5 settle item on the story graph", () => {
    it("settles on the 150-node story graph within 1,000 iterations by the shared rule (DEP-P5-A)", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser();
        expectAdapterMatchesFlagSet(ctx);
        const snapshot = storyGraph();
        const sim = createSpringElectrical(ctx, { seed: 42, maxInFlight: 1 });
        const positions = new Float32Array(3 * snapshot.nodeCount).fill(NaN);
        sim.load(snapshot, positions);
        const stats = await sim.run({ maxIter: 1000, batch: 8 });
        expect(sim.settled, "settled").toBe(true);
        expect(sim.iterationsDone, "the shared rule fired before the budget").toBeLessThan(1000);
        expect(stats.iteration).toBe(sim.iterationsDone);
        expect(stats.trace[stats.trace.length - 1].settledCount).toBeGreaterThanOrEqual(10);
        expect(stats.kineticEnergy).toBeGreaterThanOrEqual(0);
        expect(positions.every((v) => Number.isFinite(v))).toBe(true);
        console.log(`[spring-layouts] the preset settled at ${sim.iterationsDone} iterations on the story graph`);
        sim.dispose();
        ctx.release(snapshot);
    });
});
