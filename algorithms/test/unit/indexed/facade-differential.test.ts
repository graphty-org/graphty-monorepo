import { describe, expect, it } from "vitest";

import { connectedComponents } from "../../../src/algorithms/components/connected.js";
import { kruskalMST } from "../../../src/algorithms/mst/kruskal.js";
import { dijkstra } from "../../../src/algorithms/shortest-path/dijkstra.js";
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
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
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
        expectFacadeMatchesLegacy(fixtures, connectedComponents, (g) => {
            const s = toSnapshot(g);
            const { labels, count } = indexedComponents(s);
            return labelsToGroups(s.ids, labels, count);
        });
    });

    it("passes dijkstra through ssspToShortestPaths with exact f64 weights, source given as a string", () => {
        const withSource = fixtures.filter((f) => f.graph.nodeCount > 0);
        const sourceOf = (g: Graph): NodeId => [...g.nodes()][0].id;
        const facade = (g: Graph): Map<NodeId, ShortestPathResult> => {
            const s = toSnapshot(g);
            const source = resolveNode(s.ids, String(sourceOf(g)));
            return ssspToShortestPaths(s, indexedDijkstra(s, source, { weights: exactArcWeights(s) }));
        };
        const distances = (r: Map<NodeId, ShortestPathResult>): Map<NodeId, number> =>
            new Map([...r].map(([id, { distance }]) => [id, distance]));
        // Distances agree everywhere. Paths and predecessors agree only where no two shortest paths
        // tie: on the random and karate fixtures the port settles equal-distance nodes in a
        // different order than the legacy priority queue and so records a different, equally short
        // predecessor.
        expectFacadeMatchesLegacy(
            withSource,
            (g) => distances(dijkstra(g, sourceOf(g))),
            (g) => distances(facade(g)),
        );
        const tieFree = withSource.filter((f) => !/random|karate/.test(f.name));
        expect(tieFree.length).toBe(6);
        expectFacadeMatchesLegacy(tieFree, (g) => dijkstra(g, sourceOf(g)), facade);
    });

    it("passes kruskalMST through edgesToLegacy on the connected fixtures", () => {
        const connected = fixtures.filter((f) => f.graph.nodeCount > 0 && connectedComponents(f.graph).length === 1);
        expect(connected.length).toBeGreaterThan(3);
        expectFacadeMatchesLegacy(
            connected,
            (g) => kruskalMST(g).edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
            (g) => {
                const s = toSnapshot(g);
                return edgesToLegacy(s, indexedKruskal(s, { weights: exactArcWeights(s) }).edges);
            },
        );
    });

    it("fails on a real difference and tolerates one within the relative bound", () => {
        const one = [{ name: "path", graph: numericWeighted() }];
        expect(() => {
            expectFacadeMatchesLegacy(
                one,
                () => new Map([["a", 1]]),
                () => new Map([["a", 1 + 1e-6]]),
                { tolerance: 1e-9 },
            );
        }).toThrow();
        expectFacadeMatchesLegacy(
            one,
            () => ({ scores: new Map([["a", 1]]), list: [2] }),
            () => ({ scores: new Map([["a", 1 + 1e-12]]), list: [2 + 1e-12] }),
            { tolerance: 1e-9 },
        );
    });

    const one = (): FacadeFixture[] => [{ name: "path", graph: numericWeighted() }];

    it("fails on a discrete difference with no tolerance", () => {
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => [[1, 2]],
                () => [[2, 1]],
            );
        }).toThrow();
    });

    it("fails on a different Map or Set iteration order", () => {
        const pairs: [number, number][] = [
            [1, 1],
            [2, 2],
        ];
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => new Map(pairs),
                () => new Map([...pairs].reverse()),
            );
        }).toThrow(/keys in order/);
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => new Set(["a", "b"]),
                () => new Set(["b", "a"]),
            );
        }).toThrow();
    });

    it("fails on a property set to undefined against a missing one, and on a different prototype", () => {
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => ({ source: 1, data: undefined }),
                () => ({ source: 1 }),
            );
        }).toThrow(/keys/);
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => [1, 2],
                () => Float64Array.of(1, 2),
            );
        }).toThrow(/prototype/);
    });

    it("fails on an infinite number against a finite one whatever the tolerance", () => {
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => new Map([[1, 0.5]]),
                () => new Map([[1, Infinity]]),
                { tolerance: 1e-9 },
            );
        }).toThrow();
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => [0],
                () => [-Infinity],
                { tolerance: 1e-9 },
            );
        }).toThrow();
        expectFacadeMatchesLegacy(
            one(),
            () => [Infinity, Number.NaN],
            () => [Infinity, Number.NaN],
            { tolerance: 1e-9 },
        );
    });

    it("fails when the facade mutates the graph", () => {
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => 0,
                (g) => {
                    g.addNode("added");
                    return 0;
                },
            );
        }).toThrow(/mutated/);
    });

    it("fails when the facade writes into the shared snapshot", () => {
        expect(() => {
            expectFacadeMatchesLegacy(
                one(),
                () => 0,
                (g) => {
                    const { colIdx } = toSnapshot(g);
                    colIdx[0] = colIdx.length - 1;
                    return 0;
                },
            );
        }).toThrow(/checksum/i);
    });
});
