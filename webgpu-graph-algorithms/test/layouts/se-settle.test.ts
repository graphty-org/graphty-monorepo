/**
 * The G5 gate item of design 13 row P5 (P5-T5 Step 3; PD-14b): the spring-electrical preset settles within 1,000
 * steps on the 150-node / 249-edge "Performance/Large Graph" story graph to an edge-length distribution within 25%
 * of ngraph.forcelayout's (ngraph run on the CPU here, with its defaults and its own placement of new bodies, until
 * its `step()` returns true or 1,000 steps). The preset settles by the SHARED rule of spec 7.17 (DEP-P5-A), and the
 * comparison is distributional: the q10 / q50 / q90 edge-length quantiles of the two final layouts agree within 25%
 * relative (the gate's number, `rel(gpu, ngraph, 1e-3) <= 0.25`), never a coordinate. Runs at full size on every
 * adapter (150 nodes is under any gpuScale). The kinetic energy at the stop is printed, not capped: the shared rule
 * is a displacement rule and the energy is still oscillating when it fires (finding G5-F12). Every number is printed
 * before the first assertion, so an adapter that misses one still reports the rest; they go into the G5 record.
 */

import type { F32 } from "@graphty/graph-format";
import createLayout from "ngraph.forcelayout";
import createGraph from "ngraph.graph";

import { type GpuContext } from "../../src/context.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type SpringElectricalStats } from "../../src/types/layout.js";
import { rel } from "../helpers/fa2-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { edgeLengthQuantiles } from "../helpers/metrics.js";
import { STORY_NODE_COUNT, storyEdges, storyGraph } from "../helpers/story-graph.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 600_000;
const MAX_STEPS = 1000;
const QUANTILES = [0.1, 0.5, 0.9] as const;
/** The gate's number: 25% relative per quantile. */
const GATE = 0.25;

/**
 * ngraph.forcelayout with its defaults on the story graph from its own placement: `step()` until it returns true or
 * MAX_STEPS; returns the stride-3 positions and the step count.
 * @returns the layout and how many steps it took
 */
function ngraphLayout(): { readonly positions: Float64Array; readonly steps: number; readonly stable: boolean } {
    const graph = createGraph();
    for (let i = 0; i < STORY_NODE_COUNT; i++) {
        graph.addNode(i);
    }
    for (const [a, b] of storyEdges()) {
        graph.addLink(a, b);
    }
    const layout = createLayout(graph, { dimensions: 2 });
    let steps = 0;
    let stable = false;
    while (!stable && steps < MAX_STEPS) {
        stable = layout.step();
        steps++;
    }
    const positions = new Float64Array(3 * STORY_NODE_COUNT);
    for (let i = 0; i < STORY_NODE_COUNT; i++) {
        const p = layout.getNodePosition(i);
        positions[3 * i] = p.x;
        positions[3 * i + 1] = p.y;
    }
    return { positions, steps, stable };
}

interface GpuRun {
    readonly positions: F32;
    readonly stats: SpringElectricalStats;
    readonly iterationsDone: number;
    readonly settled: boolean;
    readonly firstBatchEnergy: number;
}

/**
 * The GPU preset on the story graph from the FA2 seed range until settled or MAX_STEPS iterations.
 * @param ctx - the context
 * @returns the final owner's array, the stats and the stop count
 */
async function gpuLayout(ctx: GpuContext): Promise<GpuRun> {
    const s = storyGraph();
    const sim = createSpringElectrical(ctx, { seed: 42, maxInFlight: 1 });
    try {
        const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
        sim.load(s, positions);
        await sim.step(8);
        const firstBatchEnergy = sim.stats.kineticEnergy;
        const stats = await sim.run({ maxIter: MAX_STEPS, batch: 8 });
        return { positions, stats, iterationsDone: sim.iterationsDone, settled: sim.settled, firstBatchEnergy };
    } finally {
        sim.dispose();
        ctx.release(s);
    }
}

describe("the story graph (test/helpers/story-graph.ts)", () => {
    it("has 150 nodes and 249 unordered edges (seed 42 draws one reversed pair among 250 ordered keys)", () => {
        expect(storyEdges()).toHaveLength(249);
        const s = storyGraph();
        expect(s.nodeCount).toBe(150);
        expect(s.arcCount).toBe(498);
        expect(s.directed).toBe(false);
        const keys = new Set(storyEdges().map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`)));
        expect(keys.size).toBe(249);
        for (const [a, b] of storyEdges()) {
            expect(a).not.toBe(b);
        }
        const degree = s.outDegree();
        for (let i = 0; i < 150; i++) {
            expect(degree[i], `node ${i} has at least one edge`).toBeGreaterThanOrEqual(1);
        }
    });
});

describe("G5: the spring-electrical preset vs ngraph on the story graph (design 13 row P5; DEP-P5-A; PD-14b)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "se-settle" });
    });

    it(
        "settles within 1,000 steps by the shared rule, the same run is bitwise repeatable, and the edge-length quantiles agree with ngraph's within 25%",
        async (t) => {
            requireGpu(t);
            const s = storyGraph();
            try {
                const gpu = await gpuLayout(ctx);
                const again = await gpuLayout(ctx);
                const cpu = ngraphLayout();
                const gpuQ = edgeLengthQuantiles(s, gpu.positions, 2, [...QUANTILES]);
                const cpuQ = edgeLengthQuantiles(s, cpu.positions, 2, [...QUANTILES]);
                const ratios = gpuQ.map((q, k) => rel(q, cpuQ[k], 1e-3));
                const stopBatch = gpu.stats.trace.map((r) => r.kineticEnergy);
                // Printed BEFORE the first assertion (finding G5-F12): an adapter that misses one of them still
                // reports every number the record is written from. The Windows leg's failure of 2026-09-23 printed
                // nothing at all, so neither the stop iteration nor the layout quality could be read from the log.
                console.log(
                    `[se-settle] gpu stop ${gpu.iterationsDone} iterations (settled ${gpu.settled}); ngraph stop ${cpu.steps} steps (stable ${cpu.stable}); ` +
                        `edge length q10/q50/q90 gpu ${gpuQ.map((q) => q.toFixed(4)).join(" / ")} ngraph ${cpuQ.map((q) => q.toFixed(4)).join(" / ")} ` +
                        `rel ${ratios.map((r) => r.toFixed(4)).join(" / ")}; kineticEnergy first batch ${gpu.firstBatchEnergy} stop ${gpu.stats.kineticEnergy} ` +
                        `(fell ${(gpu.firstBatchEnergy / gpu.stats.kineticEnergy).toFixed(1)}x; the stop batch's eight iterations span ` +
                        `${Math.min(...stopBatch).toFixed(4)} .. ${Math.max(...stopBatch).toFixed(4)})`,
                );
                expectBitwiseEqual(gpu.positions, again.positions, "the same run twice");
                expect(again.iterationsDone).toBe(gpu.iterationsDone);
                expect(gpu.positions.every((v) => Number.isFinite(v))).toBe(true);
                expect(gpu.settled, "settled").toBe(true);
                expect(gpu.iterationsDone, "the shared rule fired before the budget").toBeLessThan(MAX_STEPS);
                const last = gpu.stats.trace[gpu.stats.trace.length - 1];
                expect(last.settledCount).toBeGreaterThanOrEqual(10);
                // The kinetic energy is PRINTED, not capped (finding G5-F12). The 7.17 rule stops the run on mean
                // DISPLACEMENT, and around that stop the energy is still swinging over one to two orders of
                // magnitude -- 0.286 .. 25.06 over the last 120 iterations on lavapipe, 0.446 .. 8.32 on the RTX
                // 4070 SUPER -- so which point of the swing the rule happens to fire on is arithmetic, not layout
                // quality. What holds on every adapter is the direction and the distribution below.
                expect(gpu.firstBatchEnergy).toBeGreaterThan(0);
                expect(gpu.stats.kineticEnergy, "the run cooled rather than diverged").toBeLessThan(
                    gpu.firstBatchEnergy,
                );
                QUANTILES.forEach((q, k) => {
                    expect(
                        ratios[k],
                        `q${Math.round(q * 100)}: gpu ${gpuQ[k]} vs ngraph ${cpuQ[k]}`,
                    ).toBeLessThanOrEqual(GATE);
                });
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );
});
