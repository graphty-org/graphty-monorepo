/**
 * The G5 gate item of design 13 row P5 (P5-T5 Step 3; PD-14b): the spring-electrical preset settles within 1,000
 * steps on the 150-node / 249-edge "Performance/Large Graph" story graph to an edge-length distribution within 25%
 * of ngraph.forcelayout's (ngraph run on the CPU here, with its defaults and its own placement of new bodies, until
 * its `step()` returns true or 1,000 steps). The preset settles by the SHARED rule of spec 7.17 (DEP-P5-A), and the
 * comparison is distributional: the q10 / q50 / q90 edge-length quantiles of the two final layouts agree within 25%
 * relative (the gate's number, `rel(gpu, ngraph, 1e-3) <= 0.25`), never a coordinate. Runs at full size on every
 * adapter (150 nodes is under any gpuScale). The printed numbers go into the G5 record.
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
        "settles within 1,000 steps by the shared rule, the same run is bitwise repeatable, the kinetic energy fell 100x, and the edge-length quantiles agree with ngraph's within 25%",
        async (t) => {
            requireGpu(t);
            const s = storyGraph();
            try {
                const gpu = await gpuLayout(ctx);
                const again = await gpuLayout(ctx);
                expectBitwiseEqual(gpu.positions, again.positions, "the same run twice");
                expect(again.iterationsDone).toBe(gpu.iterationsDone);
                expect(gpu.positions.every((v) => Number.isFinite(v))).toBe(true);
                expect(gpu.settled, "settled").toBe(true);
                expect(gpu.iterationsDone, "the shared rule fired before the budget").toBeLessThan(MAX_STEPS);
                const last = gpu.stats.trace[gpu.stats.trace.length - 1];
                expect(last.settledCount).toBeGreaterThanOrEqual(10);
                expect(gpu.firstBatchEnergy).toBeGreaterThan(0);
                expect(gpu.stats.kineticEnergy * 100, "the system came to rest").toBeLessThanOrEqual(
                    gpu.firstBatchEnergy,
                );

                const cpu = ngraphLayout();
                const gpuQ = edgeLengthQuantiles(s, gpu.positions, 2, [...QUANTILES]);
                const cpuQ = edgeLengthQuantiles(s, cpu.positions, 2, [...QUANTILES]);
                const ratios = gpuQ.map((q, k) => rel(q, cpuQ[k], 1e-3));
                console.log(
                    `[se-settle] gpu stop ${gpu.iterationsDone} iterations (settled ${gpu.settled}); ngraph stop ${cpu.steps} steps (stable ${cpu.stable}); ` +
                        `edge length q10/q50/q90 gpu ${gpuQ.map((q) => q.toFixed(4)).join(" / ")} ngraph ${cpuQ.map((q) => q.toFixed(4)).join(" / ")} ` +
                        `rel ${ratios.map((r) => r.toFixed(4)).join(" / ")}; kineticEnergy first batch ${gpu.firstBatchEnergy} stop ${gpu.stats.kineticEnergy}`,
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
