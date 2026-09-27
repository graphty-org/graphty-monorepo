/**
 * The label-propagation reference, the group-by-key reference and the partition helpers check themselves (the P11
 * plan's P11-T2 Step 4): the fixed-point rule of the group-by (ties to the lowest key, the power-of-two scale), the
 * adjusted Rand index on known partitions, label propagation on disjoint cliques, a complete graph, the two-node path
 * the direction rule exists for, and the planted partitions the gate names. No device is touched.
 */

import { completeEdges, type EdgeSpec, KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { adjustedRandIndex, plantedPartition } from "../helpers/partitions.js";
import { labelPropagationOracle, modularityOf } from "./community.js";
import { simpleSymmetricOracle } from "./coo.js";
import { groupByKeyOracle, quantize, rowScale } from "./group-by-key.js";

/**
 * Disjoint complete graphs of the given sizes.
 * @param sizes - the clique sizes
 * @returns the edges
 */
function cliques(sizes: readonly number[]): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    let base = 0;
    for (const size of sizes) {
        for (const [u, v] of completeEdges(size)) {
            edges.push([u + base, v + base]);
        }
        base += size;
    }
    return edges;
}

describe("groupByKeyOracle (pure)", () => {
    it("the weighted mode, the lowest key on a tie, INVALID_INDEX for an empty row", () => {
        // row 0: keys 5, 3, 5, 3 (tie of two each -> 3); row 1: empty; row 2: key 9 twice, key 1 once -> 9
        const rowPtr = [0, 4, 4, 7];
        const colIdx = [0, 1, 2, 3, 4, 4, 5];
        const keyIn = [5, 3, 5, 3, 9, 1];
        const r = groupByKeyOracle(rowPtr, colIdx, null, keyIn);
        expect(Array.from(r.bestKey)).toEqual([3, 0xffffffff, 9]);
        expect(Array.from(r.bestScore)).toEqual([2, 0, 2]);
    });

    it("the scale is the power of two that keeps maxW x d x scale below 2^30; negatives count 0", () => {
        expect(rowScale(1, 1)).toBe(2 ** 29);
        expect(rowScale(1, 3)).toBe(2 ** 28);
        expect(rowScale(0, 5)).toBe(2 ** 126);
        for (const [maxW, d] of [
            [1, 1],
            [3.5, 7],
            [1e-6, 1000],
            [1e6, 10000],
        ]) {
            expect(maxW * d * rowScale(maxW, d)).toBeLessThan(2 ** 30);
            expect(maxW * d * rowScale(maxW, d)).toBeGreaterThanOrEqual(2 ** 28);
        }
        expect(quantize(-2, 2 ** 20)).toBe(0);
        expect(quantize(0.75, 4)).toBe(3);
    });
});

describe("adjustedRandIndex and plantedPartition (pure)", () => {
    it("1 for identical partitions under renaming, below 0.1 for an unrelated one", () => {
        expect(adjustedRandIndex([0, 0, 1, 1, 2], [7, 7, 3, 3, 9])).toBe(1);
        const planted = plantedPartition(4, 25, 0.3, 0.01, 1).labels;
        const shuffled = planted.map((_, v) => (v * 7) % 4);
        expect(Math.abs(adjustedRandIndex(planted, shuffled))).toBeLessThan(0.1);
    });

    it("is seeded: one seed gives one graph, two seeds two", () => {
        expect(plantedPartition(3, 10, 0.5, 0.05, 4).edges).toEqual(plantedPartition(3, 10, 0.5, 0.05, 4).edges);
        expect(plantedPartition(3, 10, 0.5, 0.05, 4).edges).not.toEqual(plantedPartition(3, 10, 0.5, 0.05, 5).edges);
    });
});

describe("labelPropagationOracle (pure)", () => {
    it("disjoint cliques: every clique is one community; a single clique is one community", () => {
        const r = labelPropagationOracle(simpleSymmetricOracle(snapshotOf(cliques([4, 6, 3]))), {
            maxIterations: 100,
            weighted: true,
        });
        expect(Array.from(r.labels)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2]);
        const one = labelPropagationOracle(simpleSymmetricOracle(snapshotOf(completeEdges(7))), {
            maxIterations: 100,
            weighted: true,
        });
        expect(one.count).toBe(1);
    });

    it("the two-node path converges: the direction rule stops the two ends swapping", () => {
        const r = labelPropagationOracle(simpleSymmetricOracle(snapshotOf([[0, 1]])), {
            maxIterations: 100,
            weighted: true,
        });
        expect(r.count).toBe(1);
        expect(r.passes).toBeLessThan(5);
    });

    it("recovers the planted partitions (adjusted Rand index >= 0.9 on ten seeds)", () => {
        for (let seed = 1; seed <= 10; seed++) {
            const { edges, labels } = plantedPartition(4, 50, 0.3, 0.005, seed);
            const r = labelPropagationOracle(simpleSymmetricOracle(snapshotOf(edges, { nodeCount: 200 })), {
                maxIterations: 100,
                weighted: true,
            });
            expect(adjustedRandIndex(r.labels, labels), `seed ${seed}`).toBeGreaterThanOrEqual(0.9);
        }
    });

    it("karate: the result's modularity is above 0.35 and the identity's is not", () => {
        const csr = simpleSymmetricOracle(snapshotOf(KARATE_EDGES));
        const r = labelPropagationOracle(csr, { maxIterations: 100, weighted: true });
        expect(modularityOf(csr, r.labels)).toBeGreaterThan(0.35);
        expect(
            modularityOf(
                csr,
                Array.from({ length: 34 }, (_, v) => v),
            ),
        ).toBeLessThan(0);
    });
});
