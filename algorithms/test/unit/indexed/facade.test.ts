import { GraphBuilder, INVALID_INDEX, makeMask, maskSet } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { edgeBetweennessCentrality } from "../../../src/algorithms/centrality/betweenness.js";
import { Graph } from "../../../src/core/graph.js";
import { dijkstra, type SsspResult } from "../../../src/indexed/dijkstra.js";
import {
    edgeScoresToPairMap,
    edgesToLegacy,
    exactArcWeights,
    fromAdjacencyMap,
    labelsToGroups,
    maskToStringSet,
    resolveNode,
    ssspToShortestPaths,
} from "../../../src/indexed/facade.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";

function empty(): Graph {
    return new Graph({ directed: false });
}

/** Numeric ids 1..4 in a path, plus isolated 7 and 9. */
function numeric(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge(1, 2, 0.1);
    g.addEdge(2, 3, 0.2);
    g.addEdge(3, 4, 0.3);
    g.addNode(7);
    g.addNode(9);
    return g;
}

describe("resolveNode", () => {
    it("finds an id exactly", () => {
        const s = toSnapshot(numeric());
        expect(s.ids.idOf(resolveNode(s.ids, 3))).toBe(3);
    });

    it("finds a numeric id passed as a string, isolated or not", () => {
        const s = toSnapshot(numeric());
        expect(s.ids.idOf(resolveNode(s.ids, "4"))).toBe(4);
        expect(s.ids.idOf(resolveNode(s.ids, "9"))).toBe(9);
    });

    it("prefers the exact id when both spellings exist", () => {
        const g = new Graph();
        g.addNode(5);
        g.addNode("5");
        const s = toSnapshot(g);
        expect(s.ids.idOf(resolveNode(s.ids, "5"))).toBe("5");
        expect(s.ids.idOf(resolveNode(s.ids, 5))).toBe(5);
    });

    it("does not turn a number into a string id, which the legacy graph never did", () => {
        const g = new Graph();
        g.addNode("5");
        expect(resolveNode(toSnapshot(g).ids, 5)).toBe(INVALID_INDEX);
    });

    it("returns INVALID_INDEX for a missing id and on the empty graph", () => {
        expect(resolveNode(toSnapshot(numeric()).ids, "nope")).toBe(INVALID_INDEX);
        expect(resolveNode(toSnapshot(empty()).ids, "1")).toBe(INVALID_INDEX);
    });
});

describe("labelsToGroups", () => {
    it("groups by label in label order, members in index order, numeric ids kept as numbers", () => {
        const s = toSnapshot(numeric()); // indices 0..5 hold ids 1, 2, 3, 4, 7, 9
        const labels = Uint32Array.of(0, 0, 1, 1, 2, 3);
        expect(labelsToGroups(s.ids, labels, 4)).toEqual([[1, 2], [3, 4], [7], [9]]);
    });

    it("skips an unlabelled node", () => {
        const s = toSnapshot(numeric());
        const labels = Uint32Array.of(0, 0, 0, 0, INVALID_INDEX, 1);
        expect(labelsToGroups(s.ids, labels, 2)).toEqual([[1, 2, 3, 4], [9]]);
    });

    it("gives nothing on the empty graph", () => {
        const s = toSnapshot(empty());
        expect(labelsToGroups(s.ids, new Uint32Array(0), 0)).toEqual([]);
    });
});

describe("maskToStringSet", () => {
    it("names the included nodes by String(id)", () => {
        const s = toSnapshot(numeric());
        const mask = makeMask(s.nodeCount);
        maskSet(mask, 1, true);
        maskSet(mask, 5, true); // the isolated 9
        expect(maskToStringSet(s.ids, mask)).toEqual(new Set(["2", "9"]));
    });

    it("gives the empty set on the empty graph", () => {
        const s = toSnapshot(empty());
        expect(maskToStringSet(s.ids, makeMask(0)).size).toBe(0);
    });
});

describe("exactArcWeights", () => {
    it("returns the f64 values per arc when the f32 arc array rounded them", () => {
        const s = toSnapshot(numeric());
        const w = exactArcWeights(s);
        expect(w).toBeDefined();
        const seen = new Set<number>();
        for (let a = 0; a < s.arcCount; a++) {
            seen.add(w?.[a] ?? Number.NaN);
        }
        expect(seen).toEqual(new Set([0.1, 0.2, 0.3]));
    });

    it("returns undefined when every weight is f32-exact, so the arc array is already exact", () => {
        const g = new Graph();
        g.addEdge("a", "b", 2);
        expect(exactArcWeights(toSnapshot(g))).toBeUndefined();
        expect(exactArcWeights(toSnapshot(empty()))).toBeUndefined();
    });
});

describe("ssspToShortestPaths", () => {
    it("reproduces the legacy result shape with exact f64 distances and numeric ids", () => {
        const s = toSnapshot(numeric());
        const source = resolveNode(s.ids, "1");
        const out = ssspToShortestPaths(s, dijkstra(s, source, { weights: exactArcWeights(s) }));
        expect([...out.keys()]).toEqual([1, 2, 3, 4]); // isolated 7 and 9 are unreached, so absent
        expect(out.get(4)?.distance).toBe(0.1 + 0.2 + 0.3);
        expect(out.get(4)?.path).toEqual([1, 2, 3, 4]);
        expect(out.get(1)?.path).toEqual([1]);
        const pred = out.get(1)?.predecessor;
        expect(pred).toEqual(
            new Map<number, number | null>([
                [1, null],
                [2, 1],
                [3, 2],
                [4, 3],
                [7, null],
                [9, null],
            ]),
        );
        expect(out.get(4)?.predecessor).toEqual(pred);
    });

    it("gives each entry its own predecessor Map, as legacy dijkstra does", () => {
        const s = toSnapshot(numeric());
        const out = ssspToShortestPaths(s, dijkstra(s, resolveNode(s.ids, 1)));
        const first = out.get(1)?.predecessor;
        expect(out.get(4)?.predecessor).not.toBe(first);
        first?.set(4, 1);
        expect(out.get(4)?.predecessor.get(4)).toBe(3);
    });

    it("gives the empty map for a search that reached nothing, the only result an empty graph has", () => {
        const s = toSnapshot(empty());
        const none: SsspResult = {
            dist: new Float64Array(0),
            predArc: new Uint32Array(0),
            pathTo: () => new Uint32Array(0),
            pathEdges: () => new Uint32Array(0),
        };
        expect(ssspToShortestPaths(s, none).size).toBe(0);
    });

    it("gives only the source for an isolated source", () => {
        const s = toSnapshot(numeric());
        const out = ssspToShortestPaths(s, dijkstra(s, resolveNode(s.ids, "7")));
        expect([...out.keys()]).toEqual([7]);
        expect(out.get(7)?.distance).toBe(0);
    });
});

describe("edgesToLegacy", () => {
    it("rebuilds source, target and the exact weight in declared orientation", () => {
        const s = toSnapshot(numeric());
        expect(edgesToLegacy(s, Uint32Array.of(2, 0))).toEqual([
            { source: 3, target: 4, weight: 0.3 },
            { source: 1, target: 2, weight: 0.1 },
        ]);
    });

    it("gives weight 1 on an unweighted snapshot and nothing for no edges", () => {
        const b = new GraphBuilder({ directed: true, weighted: false });
        b.addEdge("x", "y");
        b.addNode("z");
        const s = b.freeze();
        expect(edgesToLegacy(s, Uint32Array.of(0))).toEqual([{ source: "x", target: "y", weight: 1 }]);
        expect(edgesToLegacy(toSnapshot(empty()), new Uint32Array(0))).toEqual([]);
    });
});

describe("edgeScoresToPairMap", () => {
    it("keys each edge as source-target, then its reverse on an undirected graph", () => {
        const s = toSnapshot(numeric());
        expect([...edgeScoresToPairMap(s, Float64Array.of(0.5, 1, 1.5))]).toEqual([
            ["1-2", 0.5],
            ["2-3", 1],
            ["3-4", 1.5],
            ["2-1", 0.5],
            ["3-2", 1],
            ["4-3", 1.5],
        ]);
    });

    it("keys only the declared orientation on a directed graph", () => {
        const g = new Graph({ directed: true });
        g.addEdge(1, 2);
        g.addEdge(3, 2);
        expect([...edgeScoresToPairMap(toSnapshot(g), Float64Array.of(1, 2))]).toEqual([
            ["1-2", 1],
            ["3-2", 2],
        ]);
    });

    it("has the key set and values of legacy edgeBetweennessCentrality on an undirected graph", () => {
        const g = new Graph({ directed: false });
        g.addEdge("b", "a");
        g.addEdge("c", "b");
        g.addEdge("c", "d");
        const legacy = edgeBetweennessCentrality(g);
        const s = toSnapshot(g);
        const { src, dst } = s.edgeList();
        const scores = Float64Array.from({ length: s.edgeCount }, (_, e) => {
            return legacy.get(`${String(s.ids.idOf(src[e]))}-${String(s.ids.idOf(dst[e]))}`) ?? Number.NaN;
        });
        const out = edgeScoresToPairMap(s, scores);
        expect(legacy.size).toBe(6);
        expect(new Map([...out].sort())).toEqual(new Map([...legacy].sort()));
    });

    it("gives the empty map on the empty graph and on isolated nodes", () => {
        expect(edgeScoresToPairMap(toSnapshot(empty()), new Float64Array(0)).size).toBe(0);
        const g = new Graph();
        g.addNode(1);
        expect(edgeScoresToPairMap(toSnapshot(g), new Float64Array(0)).size).toBe(0);
    });
});

describe("fromAdjacencyMap", () => {
    it("builds a directed snapshot with every key and every target as a node", () => {
        const s = fromAdjacencyMap(
            new Map([
                ["a", new Map([["b", 2]])],
                ["iso", new Map()],
            ]),
        );
        expect(s.directed).toBe(true);
        expect(s.ids.toArray()).toEqual(["a", "iso", "b"]);
        expect(s.edgeCount).toBe(1);
        expect(edgesToLegacy(s, Uint32Array.of(0))).toEqual([{ source: "a", target: "b", weight: 2 }]);
    });

    it("keeps a numeric-looking key a string id and the weights exact", () => {
        const s = fromAdjacencyMap(new Map([["5", new Map([["6", 0.1 + 0.2]])]]));
        expect(s.ids.idOf(resolveNode(s.ids, "5"))).toBe("5");
        expect(resolveNode(s.ids, 5)).toBe(INVALID_INDEX);
        expect(edgesToLegacy(s, Uint32Array.of(0))[0].weight).toBe(0.1 + 0.2);
    });

    it("gives the empty snapshot for the empty map", () => {
        const s = fromAdjacencyMap(new Map());
        expect(s.nodeCount).toBe(0);
        expect(s.edgeCount).toBe(0);
    });
});
