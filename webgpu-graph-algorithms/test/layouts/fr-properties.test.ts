/**
 * The layout property rows of spec 11.3 / CLAUDE.md step 6 for the Fruchterman-Reingold model (fast-check, numRuns
 * 200; P5-T3; mirroring test/layouts/fa2-properties.test.ts): fixed nodes never move (random masks through setFixed
 * and through the `fixed` option, PD-6; the all-fixed mask settles within settleWindow + 1 steps); setPosition visible
 * in the next readback and never clobbered by an older batch; settled within maxIter and within the FR budget; reheat
 * on unpin / setPosition / load, not on pin, with the temperature index of PD-5 restarting at floor(0.7 iterations)
 * on every reheat and continuing unbroken across a pin; pin A, remove B < A, load(next) with the remapped array ->
 * A still fixed; z === center.z in 2D; the FR displacement bound |dp| <= temperature (K5's min(|F|, t) cap).
 *
 * Every simulation runs with iterations 1,000,000 and settleThreshold 0 unless a case says otherwise: a budget of a
 * million keeps the temperature positive through every generated step count (dt is 1e-7 per iteration). No derived
 * tolerance is used anywhere in this file: every assertion is bitwise, an exact count, or an inequality with a
 * stated f32 margin. Sizing (spec 11.3): karate cannot shrink, so on a software adapter the per-run step counts
 * shrink instead (STEPS); numRuns stays at 200 on every adapter.
 */

import { INVALID_INDEX, makeMask, maskSet } from "@graphty/graph-format";
import fc from "fast-check";

import { FR_REHEAT_FRACTION, FR_START_TEMPERATURE } from "../../src/constants.js";
import type { GpuContext } from "../../src/context.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import type { FruchtermanReingoldStats } from "../../src/types/layout.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import { asF32, paritySnapshot, pinMask, startPositions, xyzOf } from "../helpers/fa2-parity.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const NUM_RUNS = 200;
const CASE_TIMEOUT = 300_000;
/** Upper bound of the before / after step generators of the fixed-node property (gpuScale() sizing, file header). */
const STEPS = gpuScale() < 1 ? 2 : 4;
/** The budget every case runs under: the temperature stays positive through every generated step count. */
const BUDGET = 1_000_000;
/** dt of that budget (PD-5). */
const DT = FR_START_TEMPERATURE / (BUDGET + 1);
/** The temperature index a reheat restarts at (PD-5). */
const REHEAT_INDEX = Math.floor(FR_REHEAT_FRACTION * BUDGET);

/** The smallest normal f32 (2^-126): WGSL permits flushing subnormals to zero. */
const MIN_NORMAL_F32 = 2 ** -126;
/** One f32 ulp at 1: the relative margin unit of the displacement bound. */
const ULP = 2 ** -24;
/**
 * The absolute margin of the displacement bound: the observed dp is `fround(p + dp) - p`, so each component carries
 * up to half an ulp of a coordinate below 2 (2^-23 / 2 = 2^-24) on top of the cap's rounding; 2^-22 covers the
 * three components with room.
 */
const POSITION_ROUNDING = 2 ** -22;

type FrSim = ForceSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;

const BASE: FruchtermanReingoldOptions = Object.freeze({
    dim: 2,
    scale: 1,
    center: [0, 0, 0],
    seed: 7,
    iterations: BUDGET,
    settleThreshold: 0,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
});

/** The temperature of a temperature index as the uniform slot carries it (the model's f64 arithmetic, then f32). */
function temperatureOf(index: number): number {
    return Math.fround(Math.max(0, FR_START_TEMPERATURE - DT * index));
}

function createSim(ctx: GpuContext, options: FruchtermanReingoldOptions): FrSim {
    ctx.debug.inspect = true;
    const sim = createFruchtermanReingold(ctx, { ...options, repulsion: "exact" });
    if (!(sim instanceof ForceSimulation)) {
        throw new Error("createFruchtermanReingold did not return a ForceSimulation");
    }
    return sim;
}

async function withSim<T>(
    ctx: GpuContext,
    options: FruchtermanReingoldOptions,
    fn: (sim: FrSim) => Promise<T>,
): Promise<T> {
    const sim = createSim(ctx, options);
    try {
        return await fn(sim);
    } finally {
        sim.dispose();
    }
}

/**
 * A finite f32 in [min, max] that a correct kernel reads back bitwise: -0 excluded (toScene computes pos * scale +
 * center = -0 * 1 + 0 = +0 under IEEE) and subnormals excluded (WGSL may flush them to zero); 0 itself is kept.
 */
function bitwiseStableFloat(min: number, max: number): fc.Arbitrary<number> {
    return fc
        .float({ min, max, noNaN: true })
        .filter((v) => !Object.is(v, -0) && (v === 0 || Math.abs(v) >= MIN_NORMAL_F32));
}

/** One macrotask, so a submission started by step() lands before the caller continues. */
function tick(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

/** Throws unless every pinned row of `positions` is bitwise where `pinnedAt` holds it. */
function expectPinnedStill(positions: Float32Array, pinnedAt: Float32Array, bits: readonly boolean[]): void {
    for (let i = 0; i < bits.length; i++) {
        if (!bits[i]) {
            continue;
        }
        for (let k = 0; k < 3; k++) {
            if (!Object.is(positions[3 * i + k], pinnedAt[3 * i + k])) {
                throw new Error(`pinned node ${i} moved on component ${k}`);
            }
        }
    }
}

describe("FR properties (spec 11.3; fast-check numRuns 200)", () => {
    let ctx: GpuContext;
    const s = paritySnapshot("karate", 1, false);
    const n = s.nodeCount;
    const start = startPositions(s, BASE, false);

    beforeAll(async () => {
        ctx = await acquire({ label: "fr-properties" });
    });

    afterAll(() => {
        ctx.release(s);
    });

    it(
        "fixed nodes never move: a random mask set through setFixed between steps, or given as the fixed option at creation (PD-6), keeps every pinned row bitwise where it was; the all-fixed mask settles within settleWindow + 1 steps",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.boolean(), { minLength: n, maxLength: n }),
                    fc.integer({ min: 1, max: STEPS }),
                    fc.integer({ min: 1, max: STEPS }),
                    async (bits, before, after) => {
                        const mask = makeMask(n);
                        bits.forEach((b, i) => {
                            maskSet(mask, i, b);
                        });
                        await withSim(ctx, BASE, async (sim) => {
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            await sim.step(before);
                            const pinnedAt = Float32Array.from(positions);
                            sim.setFixed(mask);
                            await sim.step(after);
                            expectPinnedStill(positions, pinnedAt, bits);
                        });
                        await withSim(ctx, { ...BASE, fixed: mask }, async (sim) => {
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            await sim.step(before + after);
                            expectPinnedStill(positions, start, bits);
                        });
                    },
                ),
                { numRuns: NUM_RUNS },
            );
            const settleWindow = 3;
            const all = makeMask(n);
            for (let i = 0; i < n; i++) {
                maskSet(all, i, true);
            }
            await withSim(ctx, { ...BASE, settleThreshold: 1e-3, settleWindow, fixed: all }, async (sim) => {
                const positions = Float32Array.from(start);
                sim.load(s, positions);
                let steps = 0;
                while (!sim.settled && steps < settleWindow + 1) {
                    await sim.step(1);
                    steps++;
                }
                expect(sim.settled, `settled after ${steps} steps`).toBe(true);
                expect(sim.stats.meanDisplacement).toBe(0);
                for (let i = 0; i < 3 * n; i++) {
                    if (!Object.is(positions[i], start[i])) {
                        throw new Error(`component ${i} moved under the all-fixed mask`);
                    }
                }
            });
        },
        CASE_TIMEOUT,
    );

    it(
        "setPosition is visible in the next readback and never clobbered by an older batch (the override list, spec 7.12)",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0, max: n - 1 }),
                    bitwiseStableFloat(-2, 2),
                    bitwiseStableFloat(-2, 2),
                    async (i, x, y) => {
                        await withSim(ctx, { ...BASE, maxInFlight: 2 }, async (sim) => {
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            sim.setFixed(pinMask(n, i));
                            await sim.step(1);
                            const submittedBefore = sim.lastSubmittedBatchId;
                            const older = sim.step(2);
                            while (sim.lastSubmittedBatchId === submittedBefore) {
                                await tick();
                            }
                            sim.setPosition(i, x, y, 0);
                            expect(sim.overrides.get(i), "the override records the last submitted batch").toBe(
                                sim.lastSubmittedBatchId,
                            );
                            const newer = sim.step(2);
                            await older;
                            expect(positions[3 * i], "x after the older batch landed").toBe(x);
                            expect(positions[3 * i + 1], "y after the older batch landed").toBe(y);
                            await newer;
                            expect(positions[3 * i], "x after the newer batch (pinned, computed from the write)").toBe(
                                x,
                            );
                            expect(positions[3 * i + 1], "y after the newer batch").toBe(y);
                            expect(positions[3 * i + 2]).toBe(0);
                            expect(
                                sim.overrides.has(i),
                                "the override is cleared by a batch newer than the write",
                            ).toBe(false);
                        });
                    },
                ),
                { numRuns: NUM_RUNS },
            );
        },
        CASE_TIMEOUT,
    );

    it(
        "settled within maxIter: run({ maxIter, batch: 1 }) stops at maxIter exactly; settled within the FR budget: run({ batch: 1 }) stops at exactly iterations",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 30 }),
                    fc.integer({ min: 1, max: 30 }),
                    async (maxIter, iterations) => {
                        await withSim(ctx, BASE, async (sim) => {
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            const stats = await sim.run({ maxIter, batch: 1 });
                            // run()'s maxIter caps the run; the simulation's own budget (a million) is untouched
                            expect(sim.settled).toBe(false);
                            expect(sim.iterationsDone).toBe(maxIter);
                            expect(stats.iteration).toBe(maxIter);
                            expect(stats.trace).toHaveLength(1);
                        });
                        await withSim(ctx, { ...BASE, iterations }, async (sim) => {
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            const stats = await sim.run({ batch: 1 });
                            expect(sim.settled).toBe(true);
                            expect(sim.iterationsDone).toBe(iterations);
                            expect(stats.iteration).toBe(iterations);
                            expect(stats.trace).toHaveLength(1);
                            expect(stats.temperature).toBe(
                                Math.fround(
                                    FR_START_TEMPERATURE - (FR_START_TEMPERATURE / (iterations + 1)) * (iterations - 1),
                                ),
                            );
                        });
                    },
                ),
                { numRuns: NUM_RUNS },
            );
        },
        CASE_TIMEOUT,
    );

    it(
        "reheat on unpin, setPosition and load, not on pin (D8): every reheat restarts the temperature index at floor(0.7 iterations) (PD-5), a pin continues the schedule unbroken, a load restarts it at 0",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0, max: n - 1 }),
                    fc.integer({ min: 0, max: n - 1 }),
                    fc.boolean(),
                    bitwiseStableFloat(-2, 2),
                    async (a, b, pinFirst, x) => {
                        await withSim(ctx, BASE, async (sim) => {
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            // the expected temperature index of the NEXT iteration
                            let index = 0;
                            const stepAndCheck = async (k: number, label: string): Promise<void> => {
                                await sim.step(k);
                                const { trace } = sim.stats;
                                expect(trace).toHaveLength(k);
                                for (let i = 0; i < k; i++) {
                                    expect(trace[i].temperature, `${label}: record ${i}`).toBe(
                                        temperatureOf(index + i),
                                    );
                                }
                                index += k;
                            };
                            await stepAndCheck(3, "after load");
                            expect(sim.iterationsDone).toBe(3);
                            const first = pinFirst ? a : b;
                            const second = pinFirst ? b : a;
                            sim.setFixed(pinMask(n, first));
                            expect(sim.iterationsDone, "a pin does not reheat").toBe(3);
                            await stepAndCheck(2, "after a pin");
                            expect(sim.iterationsDone).toBe(5);
                            if (second !== first) {
                                // a new pin (no bit went 1 -> 0): still no reheat
                                const both = pinMask(n, first);
                                maskSet(both, second, true);
                                sim.setFixed(both);
                                expect(sim.iterationsDone, "a second pin does not reheat").toBe(5);
                                await stepAndCheck(1, "after two pins");
                            }
                            sim.setFixed(makeMask(n));
                            expect(sim.iterationsDone, "an unpin reheats").toBe(0);
                            index = REHEAT_INDEX;
                            await stepAndCheck(2, "after an unpin");
                            expect(sim.iterationsDone).toBe(2);
                            sim.setPosition(a, x, 0.5, 0);
                            expect(sim.iterationsDone, "setPosition reheats").toBe(0);
                            index = REHEAT_INDEX;
                            await stepAndCheck(2, "after setPosition");
                            sim.load(s, Float32Array.from(start));
                            expect(sim.iterationsDone, "load reheats").toBe(0);
                            index = 0;
                            await stepAndCheck(1, "after a reload");
                        });
                    },
                ),
                { numRuns: NUM_RUNS },
            );
        },
        CASE_TIMEOUT,
    );

    it(
        "pin A, remove B < A, load(next) with the remapped array and a re-issued mask -> A is still fixed",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: n - 1 }),
                    fc.integer({ min: 0, max: n - 2 }),
                    async (a, bRaw) => {
                        const b = Math.min(bRaw, a - 1);
                        const keep = Uint32Array.from(Array.from({ length: n }, (_, i) => i).filter((i) => i !== b));
                        const derived = s.inducedSubgraph(keep);
                        const next = derived.snapshot;
                        const remap = derived.nodeRemap;
                        if (remap === null) {
                            throw new Error("inducedSubgraph without a node remap");
                        }
                        try {
                            await withSim(ctx, BASE, async (sim) => {
                                const positions = Float32Array.from(start);
                                sim.load(s, positions);
                                sim.setFixed(pinMask(n, a));
                                await sim.step(2);
                                const nextPositions = new Float32Array(3 * next.nodeCount);
                                for (let i = 0; i < n; i++) {
                                    const j = remap[i];
                                    if (j === INVALID_INDEX) {
                                        continue;
                                    }
                                    nextPositions[3 * j] = positions[3 * i];
                                    nextPositions[3 * j + 1] = positions[3 * i + 1];
                                    nextPositions[3 * j + 2] = positions[3 * i + 2];
                                }
                                const aNew = remap[a];
                                expect(aNew).toBe(a - 1);
                                sim.load(next, nextPositions);
                                sim.setFixed(pinMask(next.nodeCount, aNew));
                                const held = [
                                    nextPositions[3 * aNew],
                                    nextPositions[3 * aNew + 1],
                                    nextPositions[3 * aNew + 2],
                                ];
                                await sim.step(3);
                                expect(nextPositions[3 * aNew]).toBe(held[0]);
                                expect(nextPositions[3 * aNew + 1]).toBe(held[1]);
                                expect(nextPositions[3 * aNew + 2]).toBe(held[2]);
                                // the node that took B's old index is NOT fixed (the mask was re-issued for the new index space)
                                if (b !== aNew) {
                                    const moved = [nextPositions[3 * b], nextPositions[3 * b + 1]];
                                    expect(
                                        moved[0] !== positions[3 * (b + 1)] || moved[1] !== positions[3 * (b + 1) + 1],
                                        "the remapped neighbour moves",
                                    ).toBe(true);
                                }
                            });
                        } finally {
                            ctx.release(next);
                        }
                    },
                ),
                { numRuns: NUM_RUNS },
            );
        },
        CASE_TIMEOUT,
    );

    it(
        "2D writes z === center.z whatever z was uploaded, for random z and random center.z",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                // -0 is excluded from cz: toScene's z is 0 * scale + center.z = +0 for cz = -0 (IEEE), and the
                // read below is bitwise (toBe is Object.is)
                fc.asyncProperty(
                    fc.float({ min: -10, max: 10, noNaN: true }).filter((v) => !Object.is(v, -0)),
                    fc.integer({ min: 0, max: 1000 }),
                    async (cz, zSeed) => {
                        const options: FruchtermanReingoldOptions = { ...BASE, center: [0, 0, cz] };
                        await withSim(ctx, options, async (sim) => {
                            const positions = startPositions(s, options, false);
                            for (let i = 0; i < n; i++) {
                                positions[3 * i + 2] = ((zSeed + 7 * i) % 13) - 6;
                            }
                            sim.load(s, positions);
                            await sim.step(2);
                            for (let i = 0; i < n; i++) {
                                expect(positions[3 * i + 2]).toBe(Math.fround(cz));
                            }
                        });
                    },
                ),
                { numRuns: NUM_RUNS },
            );
        },
        CASE_TIMEOUT,
    );

    it(
        "the FR displacement bound: after one iteration every free row moved by at most the temperature, a row with |F| < t by exactly |F| (up to four f32 roundings and the position rounding), a pinned row by 0",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 100_000 }),
                    fc.integer({ min: 0, max: n - 1 }),
                    async (seed, pin) => {
                        const options: FruchtermanReingoldOptions = { ...BASE, seed, fixed: pinMask(n, pin) };
                        await withSim(ctx, options, async (sim) => {
                            const positions = new Float32Array(3 * n).fill(Number.NaN);
                            sim.load(s, positions);
                            const before = xyzOf(asF32((await sim.inspect?.("positions")) ?? new Float32Array(0)), n);
                            const run = sim.debugRunStages;
                            const read = sim.inspect;
                            if (run === undefined || read === undefined) {
                                throw new Error("ctx.debug.inspect was not honoured");
                            }
                            await run.call(sim, "K5");
                            const force = asF32(await read.call(sim, "force"));
                            const after = xyzOf(asF32(await read.call(sim, "positions")), n);
                            const temperature = temperatureOf(0);
                            expect(temperature).toBe(Math.fround(FR_START_TEMPERATURE));
                            const margin = temperature * 4 * ULP + POSITION_ROUNDING;
                            for (let i = 0; i < n; i++) {
                                const f = Math.hypot(force[3 * i], force[3 * i + 1], force[3 * i + 2]);
                                const dp = Math.hypot(
                                    after[3 * i] - before[3 * i],
                                    after[3 * i + 1] - before[3 * i + 1],
                                );
                                expect(after[3 * i + 2], `2D never integrates z (node ${i})`).toBe(0);
                                if (i === pin) {
                                    expect(dp, `pinned node ${i} moved`).toBe(0);
                                    continue;
                                }
                                expect(dp, `node ${i}: |dp| <= t`).toBeLessThanOrEqual(temperature + margin);
                                if (f < temperature) {
                                    expect(
                                        Math.abs(dp - f),
                                        `node ${i}: |dp| == |F| below the cap`,
                                    ).toBeLessThanOrEqual(f * 4 * ULP + POSITION_ROUNDING);
                                } else {
                                    expect(dp, `node ${i}: |dp| == t at the cap`).toBeGreaterThanOrEqual(
                                        temperature - margin,
                                    );
                                }
                            }
                        });
                    },
                ),
                { numRuns: NUM_RUNS },
            );
        },
        CASE_TIMEOUT,
    );
});
