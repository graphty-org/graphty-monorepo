/** The cluster force on the CPU simulations: LayoutSimulation.setClusters. */
import { type F32, fromEdgeArrays, type GraphSnapshot, type U32 } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { ForceAtlas2Simulation } from "../../src/simulation/forceatlas2.js";
import { FruchtermanReingoldSimulation } from "../../src/simulation/fruchterman-reingold.js";
import { type LayoutSimulation, NO_CLUSTER } from "../../src/simulation/index.js";
import { seedPositions } from "../../src/simulation/seed.js";

const N = 60;

/**
 * A ring; the test pulls its two halves into lumps.
 * @returns the snapshot
 */
function ring(): GraphSnapshot {
    return fromEdgeArrays({
        directed: false,
        nodeCount: N,
        src: Uint32Array.from({ length: N }, (_, i) => i),
        dst: Uint32Array.from({ length: N }, (_, i) => (i + 1) % N),
    });
}

/**
 * The mean distance of rows to their own community's centroid, over the distance between the centroids: small when
 * the communities are separate lumps.
 * @param positions - stride-3 positions
 * @param communities - the two-community partition
 * @returns the ratio
 */
function spread(positions: ArrayLike<number>, communities: Uint32Array): number {
    const c = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
    communities.forEach((community, i) => {
        if (community !== NO_CLUSTER) {
            for (let axis = 0; axis < 3; axis++) {
                c[community][axis] += positions[3 * i + axis];
            }
            c[community][3]++;
        }
    });
    const centre = c.map(([x, y, z, count]) => [x / count, y / count, z / count]);
    let within = 0;
    let rows = 0;
    communities.forEach((community, i) => {
        if (community !== NO_CLUSTER) {
            within += Math.hypot(...centre[community].map((v, axis) => v - positions[3 * i + axis]));
            rows++;
        }
    });
    return within / rows / Math.hypot(...centre[0].map((v, axis) => v - centre[1][axis]));
}

/**
 * One seeded start, the same for every run.
 * @returns stride-3 positions
 */
function start(): F32 {
    const positions = new Float32Array(3 * N).fill(Number.NaN);
    seedPositions(ring(), positions, 7, 2, 1, null, "fa2");
    return positions;
}

/**
 * Runs a simulation to its end.
 * @param simulation - the simulation
 * @param communities - what to pull together, or null for no pull
 * @param strength - the pull's strength
 * @returns the final positions
 */
function run(simulation: LayoutSimulation, communities: U32 | null, strength = 1): F32 {
    const positions = start();
    simulation.load(ring(), positions);
    if (communities !== null) {
        simulation.setClusters?.({ communities, strength });
    }
    for (let i = 0; i < 2000 && !simulation.settled; i++) {
        void simulation.step();
    }
    return positions;
}

const blocks: Uint32Array<ArrayBuffer> = Uint32Array.from({ length: N }, (_, i) => Math.floor((i / N) * 2));
const models: readonly (readonly [string, () => LayoutSimulation])[] = [
    ["ForceAtlas2", () => new ForceAtlas2Simulation({ dim: 2, seed: 7, maxIter: 300 })],
    ["Fruchterman-Reingold", () => new FruchtermanReingoldSimulation({ dim: 2, seed: 7, iterations: 300 })],
];

describe.each(models)("%s clusters", (_, make) => {
    it("draws each community tighter than the same run without the pull", () => {
        const free = spread(run(make(), null), blocks);
        const pulled = spread(run(make(), blocks, 2), blocks);
        assert.isBelow(pulled, free * 0.75);
    });

    it("pulls harder with a larger strength", () => {
        assert.isBelow(spread(run(make(), blocks, 8), blocks), spread(run(make(), blocks, 1), blocks));
    });

    it("runs exactly as before at strength 0 and after setClusters(null)", () => {
        const free = run(make(), null);
        assert.deepEqual(run(make(), blocks, 0), free);

        const simulation = make();
        const positions = start();
        simulation.load(ring(), positions);
        simulation.setClusters?.({ communities: blocks });
        simulation.setClusters?.(null);
        for (let i = 0; i < 2000 && !simulation.settled; i++) {
            void simulation.step();
        }
        assert.deepEqual(positions, free);
    });

    it("leaves a row in no community to the other forces, and counts it in no centroid", () => {
        const communities = blocks.slice();
        communities[0] = NO_CLUSTER;
        const positions = run(make(), communities, 2);
        assert.isTrue(positions.every((v) => Number.isFinite(v)));
        assert.isBelow(spread(positions, communities), spread(run(make(), null), communities));
    });

    it("refuses communities that do not fit the graph", () => {
        const simulation = make();
        simulation.load(ring(), new Float32Array(3 * N));
        assert.throws(() => simulation.setClusters?.({ communities: new Uint32Array(N - 1) }), RangeError);
        assert.throws(() => simulation.setClusters?.({ communities: new Uint32Array(N).fill(N) }), RangeError);
        assert.throws(() => simulation.setClusters?.({ communities: blocks, strength: -1 }), RangeError);
    });
});
