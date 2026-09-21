/**
 * The layout property rows of spec 11.3 for the spring-electrical preset (fast-check, numRuns 200; CLAUDE.md step 6;
 * P5-T5 Step 3): fixed nodes never move and a pinned row's velocity is bitwise unchanged (the all-fixed mask settles
 * within settleWindow + 1 steps); setPosition visible in the next readback, never clobbered by an older batch, and
 * the dragged row's velocity NOT reset by the call; run({ maxIter }) stops at exactly maxIter (the preset has no
 * budget option, so `settled` is the 7.17 rule alone); reheat on unpin / setPosition / load, not on pin, with the
 * velocities bitwise unchanged across a reheat (the model's onReheat is empty); pin A, remove B < A, load(next) with
 * the remapped array -> A still fixed; z === center.z in 2D; the unit speed clamp: after one iteration every free
 * row's |v| <= 1 + 8 x 2^-23 (WGSL's 2.5-ULP division, G3-F6), |dt v| <= timeStep x that x (1 + 4 x 2^-24) from
 * the velocity buffer, and the stored |dp| the same plus the two f32 position roundings.
 *
 * No derived tolerance anywhere: every assertion is bitwise, an exact count, or an inequality with a stated f32
 * margin. Sizing: karate cannot shrink, so on a software adapter the per-run step counts shrink (STEPS 4 -> 2).
 */

import { type F32, type GraphSnapshot, INVALID_INDEX, makeMask, maskSet } from "@graphty/graph-format";
import fc from "fast-check";

import { type GpuContext } from "../../src/context.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutTuning, type SpringElectricalStats } from "../../src/types/layout.js";
import { type SpringElectricalOptions } from "../../src/types/options.js";
import { pinMask, xyzOf } from "../helpers/fa2-parity.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { seededScenePositions } from "../oracle/forceatlas2.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const NUM_RUNS = 200;
const CASE_TIMEOUT = 300_000;
/** Upper bound of the before / after step generators (gpuScale() sizing, file header). */
const STEPS = gpuScale() < 1 ? 2 : 4;

/** The smallest normal f32 (2^-126): WGSL permits flushing subnormals to zero. */
const MIN_NORMAL_F32 = 2 ** -126;

type SeSim = ForceSimulation<SpringElectricalOptions, SpringElectricalStats>;

/** The options every property starts from: layout units = scene units, seeded, settling disabled. */
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
 * A finite f32 in [min, max] that a correct kernel reads back bitwise: -0 and subnormals excluded.
 * @param min - the lower bound
 * @param max - the upper bound
 * @returns the arbitrary
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

function stageRunner(sim: SeSim): (upTo: string) => Promise<void> {
    const { debugRunStages } = sim;
    if (debugRunStages === undefined) {
        throw new Error("ctx.debug.inspect must be true before createSpringElectrical");
    }
    return (upTo) => debugRunStages.call(sim, upTo);
}

function asF32(x: Float32Array | Uint32Array): F32 {
    if (!(x instanceof Float32Array)) {
        throw new Error("expected a Float32Array readback");
    }
    return Float32Array.from(x);
}

function rowIs(a: ArrayLike<number>, b: ArrayLike<number>, i: number): boolean {
    return (
        Object.is(a[3 * i], b[3 * i]) && Object.is(a[3 * i + 1], b[3 * i + 1]) && Object.is(a[3 * i + 2], b[3 * i + 2])
    );
}

describe("spring-electrical properties (spec 11.3; fast-check numRuns 200)", () => {
    let ctx: GpuContext;
    let s: GraphSnapshot;
    let n: number;
    let start: F32;

    beforeAll(async () => {
        ctx = await acquire({ label: "se-properties" });
        s = snapshotOf(KARATE_EDGES, { label: "karate" });
        n = s.nodeCount;
        start = seededScenePositions(s, 7, 2, 1, null);
    });

    afterAll(() => {
        ctx.release(s);
    });

    it(
        "fixed nodes never move: a random mask set between steps keeps every pinned row and its velocity bitwise where they were",
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
                        await withSe(ctx, BASE, async (sim) => {
                            const read = inspector(sim);
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            await sim.step(before);
                            const pinnedAt = Float32Array.from(positions);
                            sim.setFixed(mask);
                            const velocityAt = asF32(await read("velocity"));
                            await sim.step(after);
                            const velocityNow = asF32(await read("velocity"));
                            for (let i = 0; i < n; i++) {
                                if (!bits[i]) {
                                    continue;
                                }
                                if (!rowIs(positions, pinnedAt, i)) {
                                    throw new Error(`pinned node ${i} moved`);
                                }
                                if (!rowIs(velocityNow, velocityAt, i)) {
                                    throw new Error(`pinned node ${i}'s velocity changed`);
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

    it("the all-fixed mask: nothing moves and settled is reported within settleWindow + 1 single-iteration steps", async (t) => {
        requireGpu(t);
        const settleWindow = 3;
        const mask = makeMask(n);
        for (let i = 0; i < n; i++) {
            maskSet(mask, i, true);
        }
        await withSe(ctx, { ...BASE, settleThreshold: 1e-3, settleWindow }, async (sim) => {
            const positions = Float32Array.from(start);
            sim.load(s, positions);
            sim.setFixed(mask);
            let steps = 0;
            while (!sim.settled && steps < settleWindow + 1) {
                await sim.step(1);
                steps++;
            }
            expect(sim.settled, `settled after ${steps} steps`).toBe(true);
            expect(sim.stats.meanDisplacement).toBe(0);
            expect(sim.stats.kineticEnergy, "no free row: no kinetic energy").toBe(0);
            expectBitwiseEqual(positions, start, "nothing moved under the all-fixed mask");
        });
    });

    it(
        "setPosition is visible in the next readback, never clobbered by an older batch, and does not reset the dragged row's velocity",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0, max: n - 1 }),
                    bitwiseStableFloat(-2, 2),
                    bitwiseStableFloat(-2, 2),
                    async (i, x, y) => {
                        await withSe(ctx, { ...BASE, maxInFlight: 2 }, async (sim) => {
                            const read = inspector(sim);
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            sim.setFixed(pinMask(n, i));
                            await sim.step(1);
                            // the velocity is not reset by the call (the spring analogue of "speed is not reset")
                            const velocityBefore = asF32(await read("velocity"));
                            sim.setPosition(i, x, y, 0);
                            const velocityAfter = asF32(await read("velocity"));
                            expectBitwiseEqual(velocityAfter, velocityBefore, "velocity untouched by setPosition");
                            // the override list: a write between two in-flight batches lands in both readbacks
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
        "run({ maxIter, batch: 1 }) stops at maxIter exactly with stats.iteration agreeing; the preset has no budget option, so `settled` is the shared rule alone (false with settling disabled)",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(fc.integer({ min: 1, max: 30 }), async (maxIter) => {
                    await withSe(ctx, BASE, async (sim) => {
                        const positions = Float32Array.from(start);
                        sim.load(s, positions);
                        const stats = await sim.run({ maxIter, batch: 1 });
                        expect(sim.iterationsDone).toBe(maxIter);
                        expect(stats.iteration).toBe(maxIter);
                        expect(stats.trace).toHaveLength(1);
                        expect(sim.inFlight).toBe(0);
                        // SpringElectricalOptions carries no maxIter / iterations: the run-level cap ends the
                        // run() call, and `settled` reports the 7.17 rule only (settleThreshold 0 never fires)
                        expect(sim.settled).toBe(false);
                        // a later step() continues the layout from where run() stopped
                        await sim.step(1);
                        expect(sim.iterationsDone).toBe(maxIter + 1);
                    });
                }),
                { numRuns: NUM_RUNS },
            );
        },
        CASE_TIMEOUT,
    );

    it(
        "reheat on unpin, setPosition and load, not on pin (D8); the velocities are bitwise unchanged across a reheat (onReheat is empty)",
        async (t) => {
            requireGpu(t);
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0, max: n - 1 }),
                    fc.integer({ min: 1, max: STEPS + 1 }),
                    async (row, steps) => {
                        await withSe(ctx, BASE, async (sim) => {
                            const read = inspector(sim);
                            const positions = Float32Array.from(start);
                            sim.load(s, positions);
                            await sim.step(steps);
                            expect(sim.iterationsDone).toBe(steps);
                            const velocity = asF32(await read("velocity"));
                            sim.setFixed(pinMask(n, row));
                            expect(sim.iterationsDone, "a pin does not reheat").toBe(steps);
                            sim.setFixed(makeMask(n));
                            expect(sim.iterationsDone, "an unpin reheats").toBe(0);
                            expectBitwiseEqual(asF32(await read("velocity")), velocity, "velocity across the unpin");
                            sim.reheat();
                            expect(sim.iterationsDone).toBe(0);
                            expectBitwiseEqual(asF32(await read("velocity")), velocity, "velocity across reheat()");
                            await sim.step(1);
                            expect(sim.iterationsDone).toBe(1);
                            sim.setPosition(row, 0.1, 0.2, 0);
                            expect(sim.iterationsDone, "setPosition reheats").toBe(0);
                            await sim.step(1);
                            expect(sim.iterationsDone).toBe(1);
                            sim.load(s, positions);
                            expect(sim.iterationsDone, "load reheats").toBe(0);
                            const rest = asF32(await read("velocity"));
                            expect(
                                rest.every((v) => v === 0),
                                "load() starts every velocity at 0",
                            ).toBe(true);
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
                            await withSe(ctx, BASE, async (sim) => {
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
                fc.asyncProperty(
                    fc.float({ min: -10, max: 10, noNaN: true }).filter((v) => !Object.is(v, -0)),
                    fc.integer({ min: 0, max: 1000 }),
                    async (cz, zSeed) => {
                        const options: SpringElectricalOptions = { ...BASE, center: [0, 0, cz] };
                        await withSe(ctx, options, async (sim) => {
                            const positions = seededScenePositions(s, 7, 2, 1, [0, 0, cz]);
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
        "the unit speed clamp: after one iteration every velocity row's |v| <= 1 + 8 x 2^-23 (the 2.5-ULP division, G3-F6), every free row's |dt v| <= timeStep x that x (1 + 4 x 2^-24), and its stored |dp| adds the two f32 position roundings",
        async (t) => {
            requireGpu(t);
            // K5: v = v / sp after the clamp, sp = length(v). WGSL grants a compute shader's f32 division and
            // inverse square root 2.5 ULP each (Vulkan; measured on the RTX 4070 SUPER, G3 finding G3-F6: lavapipe
            // divides exactly), so a stored component sits within (2.5 + 2.5) x 2^-23 of the exact unit vector and
            // |v| within 8 x 2^-23 of 1 -- the stated margin. dp = dt v is one more rounding per component, and the
            // position store p + dp rounds once more on each side of the difference below, by at most half an ulp
            // of |p| and of |p + dp| (2^-24 relative each), which at |p| ~ 1 and a small dt exceeds the dt-relative
            // margin -- so the stored displacement carries that term explicitly and the velocity form does not.
            const vMargin = 1 + 8 * 2 ** -23;
            const dpMargin = vMargin * (1 + 4 * 2 ** -24);
            const storeRounding = 2 ** -24;
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 100_000 }),
                    fc.double({ min: 0.05, max: 2, noNaN: true }),
                    async (seed, timeStep) => {
                        const options: SpringElectricalOptions = { ...BASE, seed, timeStep };
                        await withSe(ctx, options, async (sim) => {
                            const run = stageRunner(sim);
                            const read = inspector(sim);
                            const positions = seededScenePositions(s, seed, 2, 1, null);
                            sim.load(s, positions);
                            await run("K5");
                            const after = xyzOf(asF32(await read("positions")), n);
                            const velocity = asF32(await read("velocity"));
                            const dt = Math.fround(timeStep);
                            for (let i = 0; i < n; i++) {
                                const v = Math.hypot(velocity[3 * i], velocity[3 * i + 1], velocity[3 * i + 2]);
                                expect(v, `|v| of node ${i}`).toBeLessThanOrEqual(vMargin);
                                const dtv = Math.hypot(
                                    Math.fround(dt * velocity[3 * i]),
                                    Math.fround(dt * velocity[3 * i + 1]),
                                );
                                expect(dtv, `|dt v| of node ${i}`).toBeLessThanOrEqual(dt * dpMargin);
                                const before = Math.hypot(positions[3 * i], positions[3 * i + 1]);
                                const now = Math.hypot(after[3 * i], after[3 * i + 1]);
                                const dp = Math.hypot(
                                    after[3 * i] - positions[3 * i],
                                    after[3 * i + 1] - positions[3 * i + 1],
                                );
                                expect(dp, `stored |dp| of node ${i}`).toBeLessThanOrEqual(
                                    dt * dpMargin + storeRounding * (before + now),
                                );
                                expect(velocity[3 * i + 2], "2D never integrates z").toBe(0);
                                expect(after[3 * i + 2]).toBe(0);
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
