/**
 * The adaptive cooling schedule of the Fruchterman-Reingold model (`cooling: "adaptive"`; Yifan Hu 2005, section
 * 3.2): the option's resolution, the temperature trace against the f32 oracle while the energy falls decisively (the
 * first iterations after load), the structure of the whole trace (every step is x0.9, x1/0.9 or unchanged, never the
 * linear schedule's decrement), the reheat restart at 0.1, and the point of it -- random1k settles on its own well
 * inside a budget the linear schedule would spend in full, with the layout expanded past what 50 linear iterations
 * reach. Every GPU case runs twice and asserts the owner's arrays bitwise equal first (spec 11.2).
 */

import { type F32 } from "@graphty/graph-format";

import { FR_ADAPTIVE_MAX_ITERATIONS, FR_COOLING_STEP, FR_START_TEMPERATURE } from "../../src/constants.js";
import { GpuContext } from "../../src/context.js";
import { WebGpuGraphError } from "../../src/errors.js";
import {
    createFruchtermanReingold,
    resolveFruchtermanReingoldOptions,
} from "../../src/layouts/fruchterman-reingold.js";
import { type FruchtermanReingoldStats, type GpuLayoutSimulation } from "../../src/types/layout.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import { layoutStart, paritySnapshot, startPositions } from "../helpers/fa2-parity.js";
import { frOracleOptions } from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { FruchtermanReingoldOracle } from "../oracle/fruchterman-reingold.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;

type FrSim = GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;

/** Layout units = scene units, seeded, one iteration per step, settling off unless a case turns it on. */
const BASE: FruchtermanReingoldOptions = Object.freeze({
    dim: 2,
    scale: 1,
    center: [0, 0, 0],
    seed: 7,
    settleThreshold: 0,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
    cooling: "adaptive",
});

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

async function twice<T>(run: () => Promise<{ positions: F32; result: T }>): Promise<T> {
    const a = await run();
    const b = await run();
    expectBitwiseEqual(a.positions, b.positions, "the same layout twice on the same device");
    return a.result;
}

/** Classifies one temperature ratio: unchanged, the growth factor, the shrink factor, or something the rule never produces. */
function stepKind(ratio: number, grow: number): "same" | "grow" | "shrink" | "other" {
    if (Math.abs(ratio - 1) < 1e-6) {
        return "same";
    }
    if (Math.abs(ratio - grow) < 1e-5) {
        return "grow";
    }
    if (Math.abs(ratio - FR_COOLING_STEP) < 1e-5) {
        return "shrink";
    }
    return "other";
}

/** The temperature K1 traced for each of `count` single-iteration steps. */
async function traceTemperatures(sim: FrSim, count: number): Promise<number[]> {
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
        await sim.step(1);
        out.push(sim.stats.trace[0].temperature);
    }
    return out;
}

describe("resolveFruchtermanReingoldOptions: cooling", () => {
    it('defaults to "linear", accepts "adaptive", patches, and rejects anything else', () => {
        expect(resolveFruchtermanReingoldOptions(undefined).cooling).toBe("linear");
        expect(resolveFruchtermanReingoldOptions({ cooling: "adaptive" }).cooling).toBe("adaptive");
        const previous = resolveFruchtermanReingoldOptions({ cooling: "adaptive" });
        expect(resolveFruchtermanReingoldOptions({ k: 0.5 }, previous).cooling).toBe("adaptive");
        expect(resolveFruchtermanReingoldOptions({ cooling: "linear" }, previous).cooling).toBe("linear");
        // iterations is only a cap under adaptive cooling: a fresh adaptive record gets the adaptive budget, an explicit value or a patch keeps its own
        expect(previous.iterations).toBe(FR_ADAPTIVE_MAX_ITERATIONS);
        expect(resolveFruchtermanReingoldOptions({ cooling: "adaptive", iterations: 300 }).iterations).toBe(300);
        expect(
            resolveFruchtermanReingoldOptions(
                { cooling: "adaptive" },
                resolveFruchtermanReingoldOptions({ iterations: 40 }),
            ).iterations,
        ).toBe(40);
        expect(resolveFruchtermanReingoldOptions({ cooling: "linear" }).iterations).toBe(50);
        let caught: unknown;
        try {
            resolveFruchtermanReingoldOptions({ cooling: "fast" as unknown as "linear" });
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(WebGpuGraphError);
        expect((caught as WebGpuGraphError).details).toMatchObject({ argument: "cooling" });
    });
});

describe("FR adaptive cooling (Yifan Hu's step control on the GPU)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "fr-adaptive" });
    });

    it(
        "karate: the traced temperature follows the f32 oracle through the first 12 iterations, and every later step is x0.9, x1/0.9 or unchanged",
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            try {
                const options: FruchtermanReingoldOptions = { ...BASE, iterations: 50 };
                const gpu = await twice(async () => {
                    const positions = startPositions(s, options, false);
                    return withSim(ctx, options, async (sim) => {
                        sim.load(s, positions);
                        const result = await traceTemperatures(sim, 200);
                        return { positions, result };
                    });
                });
                const start = startPositions(s, options, false);
                const oracle = new FruchtermanReingoldOracle(
                    s,
                    layoutStart(start, s.nodeCount, 2),
                    frOracleOptions(options, null, "f32"),
                );
                for (let i = 0; i < 12; i++) {
                    const record = oracle.step();
                    expect(gpu[i], `iteration ${i}`).toBeCloseTo(record.temperature, 7);
                }
                expect(gpu[0]).toBe(Math.fround(FR_START_TEMPERATURE));
                const grow = 1 / FR_COOLING_STEP;
                let grew = 0;
                let shrank = 0;
                for (let i = 1; i < gpu.length; i++) {
                    const ratio = gpu[i] / gpu[i - 1];
                    const kind = stepKind(ratio, grow);
                    expect(kind, `iteration ${i}: ${gpu[i - 1]} -> ${gpu[i]}`).not.toBe("other");
                    if (kind === "grow") {
                        grew++;
                    }
                    if (kind === "shrink") {
                        shrank++;
                    }
                }
                expect(grew, "the temperature grew at least once").toBeGreaterThan(0);
                expect(shrank, "the temperature shrank at least once").toBeGreaterThan(0);
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "reheat() restarts the temperature at 0.1 and the controller from scratch",
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            try {
                await withSim(ctx, BASE, async (sim) => {
                    sim.load(s, startPositions(s, BASE, false));
                    const before = await traceTemperatures(sim, 60);
                    expect(before[before.length - 1]).not.toBe(Math.fround(FR_START_TEMPERATURE));
                    sim.reheat();
                    const after = await traceTemperatures(sim, 2);
                    expect(after[0]).toBe(Math.fround(FR_START_TEMPERATURE));
                    expect(sim.stats.temperature).toBe(after[1]);
                });
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "random1k settles on its own under the shared rule, well inside the budget, with the layout expanded past 50 linear iterations",
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("random1k", 1, false);
            try {
                const settle = { settleThreshold: 1e-3, settleWindow: 20, iterationsPerStep: 50 };
                const linear = await withSim(
                    ctx,
                    { ...BASE, ...settle, cooling: "linear", iterations: 50 },
                    async (sim) => {
                        sim.load(s, startPositions(s, BASE, false));
                        await sim.run({ batch: 50 });
                        return sim.stats.rmsRadius;
                    },
                );
                const adaptive = await twice(async () => {
                    const positions = startPositions(s, BASE, false);
                    return withSim(ctx, { ...BASE, ...settle }, async (sim) => {
                        sim.load(s, positions);
                        await sim.run({ batch: 50, maxIter: 3000 });
                        expect(sim.settled, "settled before the 3000-iteration cap").toBe(true);
                        return {
                            positions,
                            result: { iterations: sim.iterationsDone, rmsRadius: sim.stats.rmsRadius },
                        };
                    });
                });
                expect(adaptive.iterations).toBeLessThan(2000);
                expect(adaptive.rmsRadius).toBeGreaterThan(linear);
                console.log(
                    `[fr-adaptive] random1k settled at ${adaptive.iterations} iterations, rmsRadius ${adaptive.rmsRadius.toFixed(3)} (linear after 50: ${linear.toFixed(3)})`,
                );
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );
});
