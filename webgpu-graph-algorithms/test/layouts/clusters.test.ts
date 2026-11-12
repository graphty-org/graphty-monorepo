/**
 * The cluster force on the device (issue #3257): the stage against an f64 sum under every model's law, twice bitwise;
 * then whole runs of the three models on both repulsion tiers, in 2D and 3D, ending with each community tighter than
 * the same run without the pull; and a run with the pull taken off left exactly as it was.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { NO_CLUSTER } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { sortMembers } from "../../src/layouts/clusters.js";
import { createForceAtlas2 } from "../../src/layouts/forceatlas2.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutSimulation, type GpuLayoutTuning, type LayoutStatsBase } from "../../src/types/layout.js";
import { clusterReport, clusterScene, runClusters } from "../helpers/clusters.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { storyGraph } from "../helpers/story-graph.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** What the three models have in common here. */
type Simulation = Pick<
    GpuLayoutSimulation<never, LayoutStatsBase>,
    "load" | "step" | "flush" | "settled" | "setClusters" | "dispose"
>;

const TIERS = [
    ["exact", { repulsion: "exact" }],
    ["grid", { repulsion: "grid" }],
] as const;

const MODELS: readonly (readonly [string, (ctx: GpuContext, dim: 2 | 3, tier: GpuLayoutTuning) => Simulation])[] = [
    ["forceatlas2", (ctx, dim, tier) => createForceAtlas2(ctx, { dim, scale: 100, seed: 3, maxIter: 60, ...tier })],
    [
        "fruchtermanReingold",
        (ctx, dim, tier) => createFruchtermanReingold(ctx, { dim, scale: 100, seed: 3, iterations: 60, ...tier }),
    ],
    [
        "springElectrical",
        (ctx, dim, tier) => createSpringElectrical(ctx, { dim, scale: 100, seed: 3, maxIter: 60, ...tier }),
    ],
];

/** The mean distance of a row to its community's centroid, over the arrangement's own mean radius. */
function tightness(positions: F32, communities: Uint32Array): number {
    const sums = new Map<number, number[]>();
    const all = [0, 0, 0, 0];
    communities.forEach((community, i) => {
        const sum = sums.get(community) ?? [0, 0, 0, 0];
        for (let axis = 0; axis < 3; axis++) {
            sum[axis] += positions[3 * i + axis];
            all[axis] += positions[3 * i + axis];
        }
        sum[3]++;
        all[3]++;
        sums.set(community, sum);
    });
    let within = 0;
    let radius = 0;
    communities.forEach((community, i) => {
        const sum = sums.get(community) as number[];
        const row = [0, 1, 2].map((axis) => positions[3 * i + axis]);
        within += Math.hypot(...row.map((v, axis) => v - sum[axis] / sum[3]));
        radius += Math.hypot(...row.map((v, axis) => v - all[axis] / all[3]));
    });
    return within / radius;
}

/** Steps a loaded simulation until it settles. */
async function run(simulation: Simulation): Promise<void> {
    while (!simulation.settled) {
        await simulation.step(4);
        await simulation.flush();
    }
}

describe("the cluster force on the device (issue #3257)", () => {
    let ctx: GpuContext;
    const snapshot: GraphSnapshot = storyGraph();
    const n = snapshot.nodeCount;
    const communities = Uint32Array.from({ length: n }, (_, i) => i % 4);

    beforeAll(async () => {
        ctx = await acquire({ label: "clusters" });
    });

    afterAll(() => {
        ctx.dispose();
    });

    it("sorts the rows of each community, in row order, and leaves out a row in none", () => {
        const { members, start } = sortMembers(Uint32Array.of(1, NO_CLUSTER, 0, 1));
        expect([...members]).toEqual([2, 0, 3]);
        expect([...start]).toEqual([0, 1, 3]);
    });

    for (const law of [0, 1, 2] as const) {
        it(`the stage matches an f64 sum under law ${law}, twice bitwise`, async (t) => {
            requireGpu(t);
            const scene = clusterScene(3000, law);
            assertCheckPasses(await clusterReport(ctx, scene));
            expectBitwiseEqual(await runClusters(ctx, scene), await runClusters(ctx, scene));
        });
    }

    for (const [name, make] of MODELS) {
        for (const [tierName, tier] of TIERS) {
            for (const dim of [2, 3] as const) {
                it(`${name} on the ${tierName} tier in ${dim}D draws each community tighter`, async (t) => {
                    requireGpu(t);
                    const free = make(ctx, dim, tier);
                    const freePositions = new Float32Array(3 * n).fill(Number.NaN);
                    free.load(snapshot, freePositions);
                    await run(free);
                    free.dispose();

                    const pulled = make(ctx, dim, tier);
                    const positions = new Float32Array(3 * n).fill(Number.NaN);
                    pulled.load(snapshot, positions);
                    pulled.setClusters?.({ communities, strength: 4 });
                    await run(pulled);
                    pulled.dispose();

                    expect(tightness(positions, communities)).toBeLessThan(tightness(freePositions, communities) * 0.8);
                });
            }
        }
    }

    it("a pull taken off leaves the run as it was", async (t) => {
        requireGpu(t);
        const [, make] = MODELS[0];
        const free = make(ctx, 2, { repulsion: "exact" });
        const freePositions = new Float32Array(3 * n).fill(Number.NaN);
        free.load(snapshot, freePositions);
        await run(free);
        free.dispose();

        const off = make(ctx, 2, { repulsion: "exact" });
        const positions = new Float32Array(3 * n).fill(Number.NaN);
        off.load(snapshot, positions);
        off.setClusters?.({ communities });
        off.setClusters?.(null);
        await run(off);
        off.dispose();

        expectBitwiseEqual(positions, freePositions);
    });
});
