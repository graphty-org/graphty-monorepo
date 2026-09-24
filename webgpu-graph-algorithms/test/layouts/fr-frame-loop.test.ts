/**
 * The element's frame loop against the GPU Fruchterman-Reingold simulation (spec 7.19, 7.20; 11.4 last bullet;
 * P5-T9): the three GPU runs of test/layouts/frame-loop.test.ts through the widened helper (PD-18) on an FR
 * simulation. The bridge logic itself is pinned there on a scripted simulation and is not repeated here.
 *
 * The 600-tick run on karate with the DEFAULT `iterations` (50): the budget settles it (submissions <= ticks, at
 * most maxInFlight in flight, iterationsDone monotone, settled reported, positions written back). The
 * setPosition-during-flight run and the pause run on random1k at gpuScale() with `iterations: 1_000_000` and
 * `settleThreshold: 0`, so nothing settles and the temperature (dt = 0.1 / 1_000_001) stays above 0.09 for the whole
 * run: every hold true, the pinned rows carry the written values, the reheat of D8 visible in the tick series; the
 * pause lands exactly the in-flight batches, flush() resolves, no submission for 100 ticks, and the temperature
 * trace continues from the landed value (no reheat on resume, 7.19): every sampled (iteration -> temperature,
 * meanDisplacement) equals an UNPAUSED run of the same simulation bitwise, and no sampled temperature is the
 * post-reheat value 0.1 - dt * floor(0.7 * iterations).
 *
 * The calibration idiom (calibrateHeavyStep, calibrateFlight, measureTickMs and the timed steps) is copied from
 * test/layouts/frame-loop.test.ts, where it is module-private, over createFruchtermanReingold.
 */

import { type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";

import { FR_REHEAT_FRACTION, FR_START_TEMPERATURE, MAX_ITERATIONS_PER_STEP } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { type FruchtermanReingoldStats, type GpuLayoutSimulation } from "../../src/types/layout.js";
import { type FruchtermanReingoldOptions } from "../../src/types/options.js";
import { type FrameLoopReport, runFrameLoop, runFrameLoopUntilSettled } from "../helpers/frame-loop.js";
import { fixture } from "../helpers/graphs.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

type FrSim = GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;

/** The budget of the flight-dependent runs: never reached, and its dt keeps the temperature above 0.09 throughout. */
const NEVER = 1_000_000;

/** The two per-iteration fields of an FR stats record the pause run compares (the "temperature trace" of spec 7.20). */
interface TemperatureSample {
    readonly temperature: number;
    readonly meanDisplacement: number;
}

/**
 * The compared fields of a stats record.
 * @param stats - the record
 * @returns the two fields
 */
function sampleOf(stats: FruchtermanReingoldStats): TemperatureSample {
    return { temperature: stats.temperature, meanDisplacement: stats.meanDisplacement };
}

/**
 * The seeded "random tick" of spec 7.19's pause case (test/layouts/frame-loop.test.ts lcgUnit): 0.49041 for seed 7.
 * @param seed - the seed
 * @returns a value in [0, 1)
 */
function lcgUnit(seed: number): number {
    return ((seed * 9301 + 49297) % 233280) / 233280;
}

/**
 * One macrotask, the helper's tick primitive.
 * @returns a promise resolved by a zero-delay timer
 */
function nextTick(): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, 0);
    });
}

/**
 * The median of 20 measured ticks, never below 0.5 ms (test/layouts/frame-loop.test.ts measureTickMs).
 * @returns milliseconds per tick
 */
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

/**
 * One batch of k iterations, timed from the call to the readback landing.
 * @param sim - the simulation
 * @param k - iterations per step
 * @returns milliseconds
 */
async function timedStep(sim: FrSim, k: number): Promise<number> {
    const start = performance.now();
    await sim.step(k);
    return performance.now() - start;
}

/**
 * The UNCONTENDED wall time of one batch: the minimum of three timings (contention only ever lengthens a batch).
 * @param sim - the simulation
 * @param k - iterations per step
 * @returns milliseconds
 */
async function minTimedStep(sim: FrSim, k: number): Promise<number> {
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
        best = Math.min(best, await timedStep(sim, k));
    }
    return best;
}

/**
 * iterationsPerStep that makes one FR batch outlast at least four ticks here: the step(8) estimate is VERIFIED and k
 * doubled until a batch measures >= 4 ticks, clamped to [8, MAX_ITERATIONS_PER_STEP]; throws with the measured ratio
 * when even MAX_ITERATIONS_PER_STEP stays under two ticks. Leaves ctx.pipelines warm for the FR override set.
 * @param ctx - the context
 * @param snapshot - the graph of the run
 * @param tickMs - measureTickMs()
 * @returns the iterations per step
 */
async function calibrateHeavyStep(ctx: GpuContext, snapshot: GraphSnapshot, tickMs: number): Promise<number> {
    const scratch = createFruchtermanReingold(ctx, { seed: 7, iterations: NEVER, settleThreshold: 0 });
    const positions = new Float32Array(3 * snapshot.nodeCount).fill(NaN);
    scratch.load(snapshot, positions);
    await scratch.step(8);
    const batchMs = Math.max(await minTimedStep(scratch, 8), 0.05);
    let k = Math.min(MAX_ITERATIONS_PER_STEP, Math.max(1, Math.ceil((8 * 4 * tickMs) / batchMs)));
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
 * twice and four times the scale when a fast adapter behind slow timers cannot outlast the ticks there. An abandoned
 * fixture is released again.
 * @param ctx - the context
 * @param scale - the fixture scale of the first attempt
 * @param tickMs - measureTickMs()
 * @returns the graph and the iterations per step
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
                    `[fr-frame-loop] calibrated on random1k at ${factor}x the scale (${snapshot.nodeCount} nodes): step(${k}) against ${tickMs.toFixed(1)} ms ticks`,
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

/**
 * Warms ctx.pipelines for the FR override set on a throwaway simulation, so the loop's own simulation starts with
 * untouched counters and a bind promise that resolves inside its first tick (contract 3.13).
 * @param ctx - the context
 * @param snapshot - the graph of the run
 */
async function warmPipelines(ctx: GpuContext, snapshot: GraphSnapshot): Promise<void> {
    const scratch = createFruchtermanReingold(ctx, { seed: 7, iterations: NEVER, settleThreshold: 0 });
    scratch.load(snapshot, new Float32Array(3 * snapshot.nodeCount).fill(NaN));
    await scratch.step(1);
    scratch.dispose();
}

/**
 * Asserts a tick series never decreases, except across the ticks in `except` (a reheat resets iterationsDone).
 * @param values - the per-tick series
 * @param except - ticks after which a drop is allowed
 */
function expectMonotone(values: readonly number[], except: ReadonlySet<number> = new Set()): void {
    for (let i = 1; i < values.length; i++) {
        if (except.has(i - 1)) {
            continue;
        }
        expect(values[i], `tick ${i}: ${values[i]} after ${values[i - 1]}`).toBeGreaterThanOrEqual(values[i - 1]);
    }
}

describe("frame loop on the GPU Fruchterman-Reingold simulation (spec 7.19, 7.20; 11.4 last bullet; PD-18)", () => {
    it("600 ticks on karate with the default iterations: submissions <= ticks, at most maxInFlight in flight, iterationsDone monotone, the budget settles it, positions written back", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const { snapshot } = fixture("karate");
        const n = snapshot.nodeCount;
        await warmPipelines(ctx, snapshot);
        const positions = new Float32Array(3 * n).fill(NaN);
        // the default budget of spec 7.20: iterations 50, so 13 batches of 4 settle the run
        const sim = createFruchtermanReingold(ctx, { seed: 7, iterationsPerStep: 4, maxInFlight: 2 });
        sim.load(snapshot, positions);
        const seeded = Float32Array.from(positions);
        expect(seeded.every((v) => Number.isFinite(v))).toBe(true);
        const rounds: readonly FrameLoopReport[] = await runFrameLoopUntilSettled(sim, positions, {
            ticks: 600,
            iterationsPerStep: 4,
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
            expect(report.submissionsDuringPause).toBe(0);
        }
        const last = rounds[rounds.length - 1];
        expect(last.settledAtTick, `settled within ${rounds.length} rounds of 600 ticks`).not.toBeNull();
        await sim.flush();
        expect(sim.inFlight).toBe(0);
        expect(sim.settled).toBe(true);
        // every batch carried 4 iterations; at most the one batch in flight when the budget was reached overshoots
        const submissions = rounds.reduce((sum, report) => sum + report.submissions, 0);
        expect(sim.iterationsDone).toBe(submissions * 4);
        expect(sim.iterationsDone).toBeLessThanOrEqual(56); // ceil(50 / 4) * 4 + one batch in flight
        expect(sim.stats.repulsionTier).toBe("exact");
        let moved = 0;
        for (let i = 0; i < n; i++) {
            expect(Number.isFinite(positions[3 * i])).toBe(true);
            expect(Number.isFinite(positions[3 * i + 1])).toBe(true);
            expect(positions[3 * i + 2]).toBe(0); // 2D: z === center.z (7.13)
            if (positions[3 * i] !== seeded[3 * i] || positions[3 * i + 1] !== seeded[3 * i + 1]) {
                moved += 1;
            }
        }
        expect(moved).toBeGreaterThan(0);
        sim.dispose();
        ctx.release(snapshot);
    });

    it("a setPosition during flight lands in the following batch and is never overwritten by an older one", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const { snapshot, k } = await calibrateFlight(ctx, gpuScale(), await measureTickMs());
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
        const seeded = Float32Array.from(positions);
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
                    // a drag: pinned in the frame the pointer moves it (7.12); the pin does not reheat, the write does
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
        expect(inFlightAtWrite).toHaveLength(WRITES);
        expect(Math.max(...inFlightAtWrite)).toBeGreaterThanOrEqual(1);
        expect(report.maxObservedInFlight).toBeLessThanOrEqual(2);
        expect(report.settledAtTick).toBeNull();
        expectMonotone(report.iterationsDoneByTick, new Set(writes.map((w) => w.tick)));
        await sim.flush();
        expect(sim.inFlight).toBe(0);
        for (const w of writes) {
            expect(positions[3 * w.index], `x of node ${w.index}`).toBe(w.x);
            expect(positions[3 * w.index + 1], `y of node ${w.index}`).toBe(w.y);
            expect(positions[3 * w.index + 2], `z of node ${w.index}`).toBe(0);
        }
        let moved = 0;
        for (let i = WRITES; i < n; i++) {
            if (positions[3 * i] !== seeded[3 * i] || positions[3 * i + 1] !== seeded[3 * i + 1]) {
                moved += 1;
            }
        }
        expect(moved).toBeGreaterThan(0);
        sim.dispose();
        ctx.release(snapshot);
    });

    it("pause: exactly the in-flight batches land, flush() resolves, no submission for 100 ticks, the temperature trace continues from the landed value", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const { snapshot } = fixture("random1k", gpuScale());
        const n = snapshot.nodeCount;
        // No calibrated batch length and no measured tick rate: what this case pins is a COUNT and an ORDER --
        // exactly the batches in flight land, nothing is submitted while the caller is paused, and the run
        // resumes where it stopped. runFrameLoop fills the flight at the pause tick instead of waiting for a
        // tick that happens to start saturated, so none of that depends on a batch outlasting a tick gap.
        const k = 4;
        await warmPipelines(ctx, snapshot); // the loop's own simulation below is never stepped before the loop
        const options = {
            seed: 7,
            iterations: NEVER,
            settleThreshold: 0,
            iterationsPerStep: k,
            maxInFlight: 2,
        } as const;
        const positions = new Float32Array(3 * n).fill(NaN);
        const sim = createFruchtermanReingold(ctx, options);
        sim.load(snapshot, positions);
        const pauseAt = 40 + Math.floor(lcgUnit(7) * 60); // 69 for seed 7
        const PAUSE = 100;
        const inFlightByTick: number[] = [];
        const sampled = new Map<number, TemperatureSample>();
        const report = await runFrameLoop(sim, positions, {
            ticks: 600,
            iterationsPerStep: k,
            maxInFlight: 2,
            pauseAt,
            pauseTicks: PAUSE,
            onTick: () => {
                inFlightByTick.push(sim.inFlight);
                const { stats } = sim; // the LAST COMPLETED batch (7.19)
                if (stats.iteration > 0 && !sampled.has(stats.iteration)) {
                    sampled.set(stats.iteration, sampleOf(stats));
                }
            },
        });
        expect(report.errors.map(String)).toEqual([]);
        expect(report.submissionsDuringPause).toBe(0);
        expect(report.settledAtTick).toBeNull();
        expect(report.maxObservedInFlight).toBe(2);
        const [pauseStart, pauseEnd] = [report.pauseStartTick ?? -1, report.pauseEndTick ?? -1];
        expect(pauseStart).toBeGreaterThanOrEqual(pauseAt);
        expect(pauseEnd).toBeGreaterThanOrEqual(pauseStart + PAUSE); // the window's floor; longer if the box stalled
        const atPause = report.iterationsDoneByTick[pauseStart];
        const afterPause = report.iterationsDoneByTick[pauseEnd];
        expect(afterPause - atPause).toBe(2 * k); // exactly the two in-flight batches landed inside the window
        expect(inFlightByTick[pauseEnd]).toBe(0);
        for (let i = pauseStart + 1; i <= pauseEnd; i++) {
            expect(report.iterationsDoneByTick[i]).toBeLessThanOrEqual(afterPause);
        }
        expectMonotone(report.iterationsDoneByTick); // no reheat anywhere: the pause is not a reset (7.19)
        expect(report.iterationsDoneByTick.at(-1)).toBeGreaterThan(afterPause);
        await sim.flush();
        expect(sim.iterationsDone).toBe(report.submissions * k);
        // the temperature trace is continuous across the pause: every sampled (iteration -> temperature,
        // meanDisplacement) equals an UNPAUSED run of the same simulation bitwise, and no sample carries the
        // post-reheat temperature (a reheat would restart the schedule at floor(0.7 iterations) dt, PD-5)
        const dt = FR_START_TEMPERATURE / (NEVER + 1);
        const reheated = Math.fround(FR_START_TEMPERATURE - dt * Math.floor(FR_REHEAT_FRACTION * NEVER));
        const maxIteration = Math.max(...sampled.keys());
        const referencePositions = new Float32Array(3 * n).fill(NaN);
        const reference = createFruchtermanReingold(ctx, options);
        reference.load(snapshot, referencePositions);
        const referenceByIteration = new Map<number, TemperatureSample>();
        while (reference.stats.iteration < maxIteration) {
            await reference.step(k);
            referenceByIteration.set(reference.stats.iteration, sampleOf(reference.stats));
        }
        expect(sampled.size).toBeGreaterThan(2);
        let checkedAfterPause = 0;
        for (const [iteration, sample] of sampled) {
            const expected = referenceByIteration.get(iteration);
            if (expected === undefined) {
                throw new Error(`the unpaused reference never reported iteration ${iteration}`);
            }
            for (const key of ["temperature", "meanDisplacement"] as const) {
                expect(
                    Object.is(sample[key], expected[key]),
                    `${key} at iteration ${iteration}: ${sample[key]} vs ${expected[key]}`,
                ).toBe(true);
            }
            expect(sample.temperature).toBeGreaterThan(reheated);
            if (iteration > afterPause) {
                checkedAfterPause += 1;
            }
        }
        expect(checkedAfterPause).toBeGreaterThan(0);
        reference.dispose();
        sim.dispose();
        ctx.release(snapshot);
    });
});
