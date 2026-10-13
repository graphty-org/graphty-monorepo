import { GraphBuilder } from "@graphty/graph-format";
import { plantedPartitionGraph } from "@graphty/graph-samples/generators";
import { describe, expect, it, vi } from "vitest";

import { syncClustering } from "../../../src/indexed/sync.js";
import { mulberry32 } from "../../../src/utils/math-utilities.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { NodeId, SynCConfig } from "../../helpers/legacy-types.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

// The golden records were taken with 2.x's generator, so this suite replays it in place of
// mulberry32 to check the arithmetic and the order of the draws against them.
//
// 2.x took the same fixed gradient step at every node (0.01 x lambda 0.1 = 0.001), so in its 100
// iterations a low-degree node hardly moved and two unconnected 4-cliques split on noise (issue
// #1600); the records encoded that bug. They were re-taken from the fixed port, which scales each
// node's step by its out-degree, still with 2.x's generator; "legacy" in the test names below now
// means that re-taken record, and the loss records keep 2.x's way of reporting the loss and the
// iteration count (the two loss tests check the port against it).
//
// The step of the fix for #1600 still pulled every node toward the origin, scaled by its degree, and
// the run went on until the loss settled, so connected communities blurred together and k-means split
// on degree (issue #1698); those records encoded that too. They were re-taken again, the same way,
// from the port that leaves the origin pull out of the step and stops once the cluster assignment has
// held for 10 iterations.
vi.mock("../../../src/utils/math-utilities.js", async () => {
    const { legacySeededRandom } = await import("../../helpers/legacy-random.js");
    return { mulberry32: vi.fn(legacySeededRandom) };
});

const fixtures: FacadeFixture[] = [...undirectedFixtures(), ...directedFixtures()];

/**
 * Runs `body` with the package generator, not the legacy one this file replays for the records.
 * @param body - The test body
 */
async function withPackageGenerator(body: () => void): Promise<void> {
    const actual = await vi.importActual<typeof import("../../../src/utils/math-utilities.js")>(
        "../../../src/utils/math-utilities.js",
    );
    vi.mocked(mulberry32).mockImplementation(actual.mulberry32);
    try {
        body();
    } finally {
        vi.mocked(mulberry32).mockImplementation((await import("../../helpers/legacy-random.js")).legacySeededRandom);
    }
}

/**
 * The port's result in the legacy shape, less `loss` and `iterations`, which the port reports for
 * the state it returns (see the loss test below).
 */
function portShape(g: Graph, config: SynCConfig): unknown {
    const s = checksummedSnapshot(g);
    const r = syncClustering(s, config);
    s.validate({ checksum: true });
    const clusters = new Map<NodeId, number>();
    const embeddings = new Map<NodeId, number[]>();
    for (let i = 0; i < s.nodeCount; i++) {
        clusters.set(s.ids.idOf(i), r.labels[i]);
        embeddings.set(s.ids.idOf(i), Array.from(r.embeddings.subarray(i * r.dimensions, (i + 1) * r.dimensions)));
    }
    return { clusters, embeddings, converged: r.converged };
}

describe("indexed.syncClustering", () => {
    it("returns an empty, converged result for an empty graph", () => {
        const r = syncClustering(toSnapshot(new Graph({ directed: false })), { numClusters: 2 });
        expect(r.labels.length).toBe(0);
        expect(r.embeddings.length).toBe(0);
        expect(r.converged).toBe(true);
        expect(r.iterations).toBe(0);
        expect(r.loss).toBe(0);
    });

    it("refuses a cluster count outside 1..n with the legacy message", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        expect(() => syncClustering(toSnapshot(g), { numClusters: 0 })).toThrow(
            "Invalid number of clusters: 0. Must be between 1 and 2",
        );
        expect(() => syncClustering(toSnapshot(g), { numClusters: 3 })).toThrow("Must be between 1 and 2");
    });

    it("refuses a cluster count that is not an integer with the same message", () => {
        const g = new Graph({ directed: false });
        for (let i = 0; i < 6; i++) {
            g.addEdge(i, (i + 1) % 6);
        }
        expect(() => syncClustering(toSnapshot(g), { numClusters: 1.5 })).toThrow(
            "Invalid number of clusters: 1.5. Must be between 1 and 6",
        );
        expect(() => syncClustering(toSnapshot(g), { numClusters: NaN })).toThrow("Invalid number of clusters: NaN");
    });

    it("draws from the package generator, seeded with the seed option", () => {
        vi.mocked(mulberry32).mockClear();
        syncClustering(toSnapshot(undirectedFixtures()[2].graph), { numClusters: 2, seed: 7 });
        expect(vi.mocked(mulberry32)).toHaveBeenCalledWith(7);
    });

    it("leaves Math.random alone", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        const before = Math.random;
        syncClustering(toSnapshot(g), { numClusters: 1 });
        expect(Math.random).toBe(before);
    });

    for (const numClusters of [2, 3]) {
        it(`equals legacy on every fixture with ${String(numClusters)} clusters`, () => {
            expectFacadeMatchesLegacy(fixtures, (g) => portShape(g, { numClusters }), { tolerance: 1e-9 });
        });
    }

    it("equals legacy with every option set", () => {
        const config = { numClusters: 4, maxIterations: 7, tolerance: 1e-9, seed: 7, learningRate: 0.05, lambda: 0.3 };
        expectFacadeMatchesLegacy(fixtures, (g) => portShape(g, config), { tolerance: 1e-9 });
    });

    it("equals legacy on an undirected graph with a self-loop, which counts once in the seeding degree", () => {
        const g = new Graph({ directed: false });
        for (let i = 0; i < 6; i++) {
            g.addEdge(i, (i + 1) % 6);
        }
        g.addEdge(0, 0);
        expectFacadeMatchesLegacy(
            [{ name: "6-cycle with a self-loop", graph: g }],
            (graph) => portShape(graph, { numClusters: 2 }),
            { tolerance: 1e-9 },
        );
    });

    it("splits two unconnected cliques of any size with the default options (issue #1600)", async () => {
        await withPackageGenerator(() => {
            for (const m of [3, 4, 5, 8, 16, 30]) {
                const b = new GraphBuilder({ directed: false });
                for (const offset of [0, m]) {
                    for (let i = 0; i < m; i++) {
                        for (let j = i + 1; j < m; j++) {
                            b.addEdge(offset + i, offset + j);
                        }
                    }
                }
                const s = b.freeze();
                // A 30-clique costs most of the test's time, so it runs one seed; the others five.
                for (let seed = 1; seed <= (m === 30 ? 1 : 5); seed++) {
                    const r = syncClustering(s, { numClusters: 2, seed });
                    const side = (from: number): number[] =>
                        Array.from({ length: m }, (_, i) => r.labels[s.ids.requireIndex(from + i)]);
                    const [left, right] = [side(0), side(m)];
                    const at = `m=${String(m)} seed=${String(seed)}`;
                    expect(new Set(left).size, at).toBe(1);
                    expect(new Set(right).size, at).toBe(1);
                    expect(left[0], at).not.toBe(right[0]);
                    expect(r.converged, at).toBe(true);
                }
            }
        });
    });

    it("finds planted communities with the default options instead of blurring them (issue #1698)", async () => {
        // Run to a settled loss, smoothing blurred each connected community into its neighbors: mean purity
        // 0.68 for 4 groups of 20, with every community spread over several clusters.
        await withPackageGenerator(() => {
            for (const groups of [2, 4]) {
                let purity = 0;
                const seeds = 10;
                for (let seed = 1; seed <= seeds; seed++) {
                    const sample = plantedPartitionGraph({ groups, groupSize: 20, pIn: 0.5, pOut: 0.02, seed });
                    const community = sample.nodeColumns?.community;
                    if (!(community instanceof Uint32Array)) {
                        throw new Error("planted partition graph has no u32 community column");
                    }
                    const b = new GraphBuilder({ directed: false });
                    for (let i = 0; i < sample.nodeCount; i++) {
                        b.addNode(i);
                    }
                    for (let e = 0; e < sample.src.length; e++) {
                        b.addEdge(sample.src[e], sample.dst[e]);
                    }
                    const s = b.freeze();
                    const r = syncClustering(s, { numClusters: groups, seed });
                    expect(r.converged, `groups=${String(groups)} seed=${String(seed)}`).toBe(true);
                    // Purity: the nodes that share the label most common in their own community.
                    for (let c = 0; c < groups; c++) {
                        const counts = new Map<number, number>();
                        for (let u = 0; u < s.nodeCount; u++) {
                            if (community[Number(s.ids.idOf(u))] === c) {
                                counts.set(r.labels[u], (counts.get(r.labels[u]) ?? 0) + 1);
                            }
                        }
                        purity += Math.max(...counts.values()) / s.nodeCount;
                    }
                }
                expect(purity / seeds, `groups=${String(groups)}`).toBeGreaterThan(0.95);
            }
        });
    });

    it("reports the loss of the converging iteration, not the one before it", () => {
        // Legacy reports the loss of the iteration before. The run ends when the loss settles within the
        // tolerance or when the cluster assignment has held for 10 iterations, so the two may differ by more.
        const config = { numClusters: 2, tolerance: 1e-3 };
        let converged = 0;
        for (const { graph } of fixtures) {
            const s = toSnapshot(graph);
            const port = syncClustering(s, config);
            if (port.converged && port.iterations > 1) {
                converged++;
                const before = syncClustering(s, { ...config, maxIterations: port.iterations - 1 });
                expect(port.loss).not.toBe(before.loss);
                expect((legacyResult() as SynCResult).loss).toBe(before.loss);
                expect(port.previousLoss).toBe(before.loss);
            }
        }
        expect(converged).toBeGreaterThan(0);
    });

    it("reports the loss and the iteration count of the state it returns", () => {
        // Legacy returns the loss of the iteration BEFORE the converging one, and one iteration more
        // than it ran when it hits maxIterations. The port reports the last loss it computed (and the one
        // before as previousLoss) and the iterations it ran, so the two agree up to that off-by-one.
        for (const { graph } of fixtures) {
            for (const config of [
                { numClusters: 2, tolerance: 1e-3 },
                { numClusters: 3, maxIterations: 3 },
            ]) {
                const legacy = legacyResult() as SynCResult;
                const port = syncClustering(toSnapshot(graph), config);
                expect(port.converged).toBe(legacy.converged);
                if (port.converged) {
                    expect(port.iterations).toBe(legacy.iterations);
                    expect(port.previousLoss).toBe(legacy.loss);
                } else {
                    expect(port.iterations).toBe(config.maxIterations ?? 100);
                    expect(legacy.iterations).toBe(port.iterations + 1);
                    expect(port.loss).toBeCloseTo(legacy.loss, 9);
                }
            }
        }
    });
});
