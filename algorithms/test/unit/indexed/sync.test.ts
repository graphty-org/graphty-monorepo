import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { syncClustering } from "../../../src/indexed/sync.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";
import { syncClustering as legacySync,type SynCConfig } from "../../../src/research/sync.js";
import type { NodeId } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

const fixtures: FacadeFixture[] = [...undirectedFixtures(), ...directedFixtures()];

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

function legacyShape(g: Graph, config: SynCConfig): unknown {
    const { clusters, embeddings, converged } = legacySync(g, config);
    return { clusters, embeddings, converged };
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

    it("leaves Math.random alone", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        const before = Math.random;
        syncClustering(toSnapshot(g), { numClusters: 1 });
        expect(Math.random).toBe(before);
    });

    for (const numClusters of [2, 3]) {
        it(`equals legacy on every fixture with ${String(numClusters)} clusters`, () => {
            expectFacadeMatchesLegacy(
                fixtures,
                (g) => legacyShape(g, { numClusters }),
                (g) => portShape(g, { numClusters }),
                { tolerance: 1e-9 },
            );
        });
    }

    it("equals legacy with every option set", () => {
        const config = { numClusters: 4, maxIterations: 7, tolerance: 1e-9, seed: 7, learningRate: 0.05, lambda: 0.3 };
        expectFacadeMatchesLegacy(
            fixtures,
            (g) => legacyShape(g, config),
            (g) => portShape(g, config),
            { tolerance: 1e-9 },
        );
    });

    it("reports the loss and the iteration count of the state it returns", () => {
        // Legacy returns the loss of the iteration BEFORE the converging one, and one iteration more
        // than it ran when it hits maxIterations. The port reports the last loss it computed and the
        // iterations it ran, so the two agree up to the convergence tolerance and that off-by-one.
        for (const { graph } of fixtures) {
            for (const config of [{ numClusters: 2 }, { numClusters: 3, maxIterations: 3 }]) {
                const legacy = legacySync(graph, config);
                const port = syncClustering(toSnapshot(graph), config);
                expect(port.converged).toBe(legacy.converged);
                if (port.converged) {
                    expect(port.iterations).toBe(legacy.iterations);
                    expect(Math.abs(port.loss - legacy.loss)).toBeLessThan(1e-6);
                } else {
                    expect(port.iterations).toBe(config.maxIterations ?? 100);
                    expect(legacy.iterations).toBe(port.iterations + 1);
                    expect(port.loss).toBeCloseTo(legacy.loss, 9);
                }
            }
        }
    });
});
