import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { connectedComponents as indexedComponents } from "../../../src/indexed/components.js";
import { dijkstra as indexedDijkstra } from "../../../src/indexed/dijkstra.js";
import {
    edgesToLegacy,
    exactArcWeights,
    labelsToGroups,
    resolveNode,
    ssspToShortestPaths,
} from "../../../src/indexed/facade.js";
import { kruskalMST as indexedKruskal } from "../../../src/indexed/mst.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";
import type { NodeId, ShortestPathResult } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, expectSame, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { undirectedFixtures } from "./port-fixtures.js";

/** Numeric ids with f64 weights that f32 would round, plus an isolated node. */
function numericWeighted(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge(1, 2, 0.1);
    g.addEdge(2, 3, 0.2);
    g.addEdge(1, 3, 0.7);
    g.addEdge(3, 4, 0.3);
    g.addNode(9);
    return g;
}

const fixtures: FacadeFixture[] = [
    ...undirectedFixtures(),
    { name: "numeric ids, f64 weights, an isolated node", graph: numericWeighted() },
    { name: "empty", graph: new Graph({ directed: false }) },
];

describe("expectFacadeMatchesLegacy", () => {
    it("passes connectedComponents through labelsToGroups", () => {
        expectFacadeMatchesLegacy(fixtures, (g) => {
            const s = toSnapshot(g);
            const { labels, count } = indexedComponents(s);
            return labelsToGroups(s.ids, labels, count);
        });
    });

    it("passes dijkstra through ssspToShortestPaths with exact f64 weights, the same source on both sides", () => {
        const withSource = fixtures.filter((f) => f.graph.nodeCount > 0);
        const sourceOf = (g: Graph): NodeId => [...g.nodes()][0].id;
        const facade = (g: Graph): Map<NodeId, ShortestPathResult> => {
            const s = toSnapshot(g);
            const source = resolveNode(s.ids, sourceOf(g));
            return ssspToShortestPaths(s, indexedDijkstra(s, source, { weights: exactArcWeights(s) }));
        };
        const distances = (r: Map<NodeId, ShortestPathResult>): Map<NodeId, number> =>
            new Map([...r].map(([id, { distance }]) => [id, distance]));
        // Distances agree everywhere. Paths and predecessors agree only where no two shortest paths
        // tie: on the random and karate fixtures the port settles equal-distance nodes in a
        // different order than the legacy priority queue and so records a different, equally short
        // predecessor.
        expectFacadeMatchesLegacy(withSource, (g) => distances(facade(g)));
        const tieFree = withSource.filter((f) => !/random|karate/.test(f.name));
        expect(tieFree.length).toBe(6);
        expectFacadeMatchesLegacy(tieFree, facade);
    });

    it("passes kruskalMST through edgesToLegacy on the connected fixtures", () => {
        const connected = fixtures.filter((f) => f.graph.nodeCount > 0 && (legacyResult() as NodeId[][]).length === 1);
        expect(connected.length).toBeGreaterThan(3);
        expectFacadeMatchesLegacy(connected, (g) => {
            const s = toSnapshot(g);
            return edgesToLegacy(s, indexedKruskal(s, { weights: exactArcWeights(s) }).edges);
        });
    });

    it("fails on a real difference and tolerates one within the relative bound", () => {
        expect(() => {
            expectSame(new Map([["a", 1 + 1e-6]]), new Map([["a", 1]]), 1e-9, "r");
        }).toThrow(/r\.get\(a\)/);
        expectSame(
            { scores: new Map([["a", 1 + 1e-12]]), list: [2 + 1e-12] },
            { scores: new Map([["a", 1]]), list: [2] },
            1e-9,
            "r",
        );
    });

    it("fails on a discrete difference with no tolerance", () => {
        expect(() => {
            expectSame([[2, 1]], [[1, 2]], 0, "r");
        }).toThrow(/r\[0\]\[0\]: 2 vs 1/);
    });

    it("fails on a different Map or Set iteration order", () => {
        const pairs: [number, number][] = [
            [1, 1],
            [2, 2],
        ];
        expect(() => {
            expectSame(new Map([...pairs].reverse()), new Map(pairs), 0, "r");
        }).toThrow(/keys in order/);
        expect(() => {
            expectSame(new Set(["b", "a"]), new Set(["a", "b"]), 0, "r");
        }).toThrow(/r in order\[0\]/);
    });

    it("fails on a property set to undefined against a missing one, and on a different prototype", () => {
        expect(() => {
            expectSame({ source: 1 }, { source: 1, data: undefined }, 0, "r");
        }).toThrow(/keys/);
        expect(() => {
            expectSame(Float64Array.of(1, 2), [1, 2], 0, "r");
        }).toThrow(/prototype/);
    });

    it("fails on an infinite number against a finite one whatever the tolerance", () => {
        expect(() => {
            expectSame(new Map([[1, Infinity]]), new Map([[1, 0.5]]), 1e-9, "r");
        }).toThrow(/Infinity vs 0.5/);
        expect(() => {
            expectSame([-Infinity], [0], 1e-9, "r");
        }).toThrow(/-Infinity vs 0/);
        expectSame([Infinity, Number.NaN], [Infinity, Number.NaN], 1e-9, "r");
    });

    const one = (): FacadeFixture[] => [{ name: "path", graph: numericWeighted() }];

    it("fails when the facade mutates the graph", () => {
        expect(() => {
            expectFacadeMatchesLegacy(one(), (g) => {
                g.addNode("added");
                return 0;
            });
        }).toThrow(/mutated/);
    });

    it("fails when the facade writes into the shared snapshot", () => {
        expect(() => {
            expectFacadeMatchesLegacy(one(), (g) => {
                const { colIdx } = toSnapshot(g);
                colIdx[0] = colIdx.length - 1;
                return 0;
            });
        }).toThrow(/checksum/i);
    });
});
