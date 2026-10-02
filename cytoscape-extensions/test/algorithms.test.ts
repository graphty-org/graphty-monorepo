import cytoscape from "cytoscape";
import { beforeAll, describe, expect, it } from "vitest";

import graphtyCytoscape, { ALGORITHM_NAMES } from "../src/index";

beforeAll(() => {
    cytoscape.use(graphtyCytoscape);
});

type Edge = [string, string, number?];

/**
 * A headless core from an edge list; nodes are created in first-appearance order.
 * @param edges - [source, target, weight?]
 * @param extraNodes - nodes with no edge
 * @returns the core
 */
function graph(edges: Edge[], extraNodes: string[] = []): cytoscape.Core {
    const ids = [...new Set([...edges.flatMap(([s, t]) => [s, t]), ...extraNodes])];
    return cytoscape({
        headless: true,
        elements: [
            ...ids.map((id) => ({ data: { id } })),
            ...edges.map(([source, target, w], k) => ({ data: { id: `e${k}`, source, target, w } })),
        ],
    });
}

// Cytoscape's typings do not let a NodeCollection stand for a Collection, so the helpers take what they read.
interface Elements {
    toArray(): { id(): string }[];
}
const ids = (c: Elements): string[] => c.toArray().map((e) => e.id());
const sets = (groups: readonly Elements[]): string[][] => groups.map((g) => ids(g).sort()).sort();

// Two triangles joined by the bridge c-d.
const BARBELL: Edge[] = [
    ["a", "b"],
    ["b", "c"],
    ["a", "c"],
    ["c", "d"],
    ["d", "e"],
    ["e", "f"],
    ["d", "f"],
];
// The textbook Dijkstra graph.
const WEIGHTED: Edge[] = [
    ["a", "b", 4],
    ["a", "c", 1],
    ["c", "b", 2],
    ["b", "d", 5],
    ["c", "d", 8],
    ["d", "e", 3],
];
const SQUARE: Edge[] = [
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["d", "a"],
];
const DAG: Edge[] = [
    ["a", "b"],
    ["a", "c"],
    ["b", "d"],
    ["c", "d"],
];

describe("registration", () => {
    it("adds every algorithm to collections and the core, none colliding with a Cytoscape built-in", () => {
        const cy = graph(SQUARE);
        expect(ALGORITHM_NAMES.length).toBe(63);
        for (const name of ALGORITHM_NAMES) {
            expect(name.startsWith("graphty")).toBe(true);
            expect(typeof (cy.elements() as unknown as Record<string, unknown>)[name]).toBe("function");
            expect(typeof (cy as unknown as Record<string, unknown>)[name]).toBe("function");
        }
    });

    it("runs the core method over every element and the collection method over the collection", () => {
        const cy = graph(BARBELL);
        expect(sets(cy.graphtyConnectedComponents())).toEqual(sets(cy.elements().graphtyConnectedComponents()));
        expect(sets(cy.$("#a, #b, #e, #f, #ab, #e0, #e5").graphtyConnectedComponents())).toEqual([
            ["a", "b"],
            ["e", "f"],
        ]);
    });
});

describe("compared with Cytoscape's built-in algorithms", () => {
    it("pageRank: the exact ranks, and Cytoscape's once its damping is converted", () => {
        const cy = graph([
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["a", "c"],
            ["c", "d"],
            ["d", "a"],
        ]);
        const ours = cy.elements().graphtyPageRank({ directed: true, dampingFactor: 0.85, tolerance: 1e-12 });
        // The fixed point of r = 0.15 / 4 + 0.85 * M r, solved by hand: a = c = 37 / 114, b = d = 20 / 114.
        expect(ours.rank("#a")).toBeCloseTo(37 / 114, 12);
        expect(ours.rank("#b")).toBeCloseTo(20 / 114, 12);
        expect(ours.converged).toBe(true);
        // Cytoscape adds the teleport (1 - d) / n to every column without scaling the links by d, then
        // renormalises, so its dampingFactor d behaves as the standard damping 1 / (2 - d).
        const theirs = cy.elements().pageRank({ dampingFactor: 0.85, precision: 1e-14, iterations: 10000 });
        const same = cy.elements().graphtyPageRank({ directed: true, dampingFactor: 1 / 1.15, tolerance: 1e-14 });
        for (const n of cy.nodes()) {
            expect(same.rank(n)).toBeCloseTo(theirs.rank(n), 6);
        }
    });

    it("betweennessCentrality: the same scores and normalized scores", () => {
        const cy = graph(BARBELL);
        const theirs = cy.elements().betweennessCentrality({});
        const ours = cy.elements().graphtyBetweennessCentrality();
        for (const n of cy.nodes()) {
            expect(ours.betweenness(n)).toBeCloseTo(theirs.betweenness(n), 9);
            expect(ours.betweennessNormalized(n)).toBeCloseTo(theirs.betweennessNormalized(n), 9);
        }
        // score() is the NetworkX convention (unordered pairs); betweenness() is Cytoscape's (ordered pairs).
        expect(ours.score("#c")).toBe(6);
        expect(ours.betweenness("#c")).toBe(12);
        const normalized = cy.elements().graphtyBetweennessCentrality({ normalized: true });
        expect(normalized.score("#c")).toBeCloseTo(0.6, 12);
        expect(normalized.betweenness("#c")).toBeCloseTo(12, 9);
        const directed = graph([
            ["a", "b"],
            ["b", "c"],
        ]);
        const dir = directed.elements().graphtyBetweennessCentrality({ directed: true });
        expect(dir.betweenness("#b")).toBe(
            directed.elements().betweennessCentrality({ directed: true }).betweenness(directed.$("#b")),
        );
    });

    it("dijkstra: the same distances and paths", () => {
        const cy = graph(WEIGHTED);
        const weight = (e: cytoscape.EdgeCollection): number => e.data("w") as number;
        const theirs = cy.elements().dijkstra({ root: "#a", weight });
        const ours = cy.elements().graphtyDijkstra({ root: "#a", weight: "w" });
        for (const n of cy.nodes()) {
            expect(ours.distanceTo(n)).toBe(theirs.distanceTo(n));
            expect(ids(ours.pathTo(n))).toEqual(ids(theirs.pathTo(n)));
        }
        expect(ids(ours.pathTo("#e"))).toEqual(["a", "e1", "c", "e2", "b", "e3", "d", "e5", "e"]);
        // A weight function, as the built-ins take it, gives the same answer.
        expect(cy.elements().graphtyDijkstra({ root: "#a", weight }).distanceTo("#e")).toBe(11);
    });

    it("dijkstra: directed edges, and an unreachable node", () => {
        const cy = graph(WEIGHTED, ["z"]);
        const r = cy.elements().graphtyDijkstra({ root: "#b", weight: "w", directed: true });
        expect(r.distanceTo("#e")).toBe(8);
        expect(r.distanceTo("#a")).toBe(Infinity);
        expect(r.pathTo("#z").length).toBe(0);
    });

    it("bellmanFord: the same distances with a negative weight", () => {
        const cy = graph([
            ["a", "b", 4],
            ["a", "c", 2],
            ["c", "b", -1],
            ["b", "d", 1],
        ]);
        const weight = (e: cytoscape.EdgeCollection): number => e.data("w") as number;
        const theirs = cy.elements().bellmanFord({ root: "#a", weight, directed: true });
        const ours = cy.elements().graphtyBellmanFord({ root: "#a", weight: "w", directed: true });
        for (const n of cy.nodes()) {
            expect(ours.distanceTo(n)).toBe(theirs.distanceTo(n));
        }
        expect(ours.hasNegativeWeightCycle).toBe(false);
        expect(ids(ours.pathTo("#d"))).toEqual(["a", "e1", "c", "e2", "b", "e3", "d"]);
    });

    it("aStar and bidirectionalDijkstra: the same path as aStar", () => {
        const cy = graph(WEIGHTED);
        const weight = (e: cytoscape.EdgeCollection): number => e.data("w") as number;
        const theirs = cy.elements().aStar({ root: "#a", goal: "#e", weight });
        const ours = cy.elements().graphtyAStar({ root: "#a", goal: "#e", weight: "w", heuristic: () => 0 });
        const bidi = cy.elements().graphtyBidirectionalDijkstra({ root: "#a", goal: "#e", weight: "w" });
        expect(ours.found).toBe(true);
        expect(ours.distance).toBe(theirs.distance);
        expect(ids(ours.path)).toEqual(ids(theirs.path));
        expect(bidi.distance).toBe(11);
        expect(ids(bidi.path)).toEqual(ids(theirs.path));
    });

    it("allPairsShortestPath: the same distances and paths as floydWarshall", () => {
        const cy = graph(WEIGHTED);
        const weight = (e: cytoscape.EdgeCollection): number => e.data("w") as number;
        const theirs = cy.elements().floydWarshall({ weight });
        const ours = cy.elements().graphtyAllPairsShortestPath({ weight: "w" });
        for (const u of cy.nodes()) {
            for (const v of cy.nodes()) {
                expect(ours.distance(u, v)).toBe(theirs.distance(u, v));
            }
        }
        expect(ids(ours.path("#a", "#d"))).toEqual(ids(theirs.path(cy.$("#a"), cy.$("#d"))));
        expect(ours.hasNegativeWeightCycle).toBe(false);
    });

    it("kruskalMST and primMST: the same tree as kruskal", () => {
        const cy = graph(WEIGHTED);
        const theirs = cy.elements().kruskal((e) => e.data("w") as number);
        const ours = cy.elements().graphtyKruskalMST({ weight: "w" });
        expect(ids(ours).sort()).toEqual(ids(theirs).sort());
        expect(ours.totalWeight).toBe(11);
        const prim = cy.elements().graphtyPrimMST({ weight: "w", root: "#e" });
        expect(ids(prim.edges()).sort()).toEqual(ids(theirs.edges()).sort());
        expect(prim.totalWeight).toBe(11);
    });

    it("connectedComponents: the same groups as components", () => {
        const cy = graph(
            [
                ["a", "b"],
                ["c", "d"],
            ],
            ["e"],
        );
        const parts = cy.elements().graphtyConnectedComponents({ field: "comp" });
        expect(sets(parts)).toEqual(
            sets(
                cy
                    .elements()
                    .components()
                    .map((c) => c.nodes()),
            ),
        );
        expect(parts.length).toBe(3);
        expect(parts.cluster("#b")).toBe(parts.cluster("#a"));
        expect(cy.$("#e").data("comp")).toBe(parts.cluster("#e"));
        expect(sets(cy.elements().graphtyWeaklyConnectedComponents({ directed: true }))).toEqual(sets(parts));
    });

    it("stronglyConnectedComponents and condensation: the same groups as tarjanStronglyConnected", () => {
        const cy = graph([
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["c", "d"],
        ]);
        const theirs = cy
            .elements()
            .tarjanStronglyConnected()
            .components.map((c) => c.nodes());
        expect(sets(cy.elements().graphtyStronglyConnectedComponents())).toEqual(sets(theirs));
        const cond = cy.elements().graphtyCondensation();
        expect(sets(cond)).toEqual(sets(theirs));
        expect(cond.condensed.snapshot.nodeCount).toBe(2);
        expect(cond.condensed.snapshot.edgeCount).toBe(1);
    });

    it("kargerMinCut, stoerWagner and minSTCut: the bridge, as kargerStein finds it", () => {
        const cy = graph(BARBELL);
        const theirs = cy.elements().kargerStein();
        const karger = cy.elements().graphtyKargerMinCut({ randomSeed: 1 });
        expect(ids(karger.cut)).toEqual(ids(theirs.cut));
        expect(karger.value).toBe(1);
        expect(sets([karger.partitionFirst, karger.partitionSecond])).toEqual([
            ["a", "b", "c"],
            ["d", "e", "f"],
        ]);
        const sw = cy.elements().graphtyStoerWagner();
        expect(ids(sw.cut)).toEqual(["e3"]);
        const st = cy.elements().graphtyMinSTCut({ source: "#a", sink: "#f", field: "side" });
        expect(st.value).toBe(1);
        expect(ids(st.partitionFirst).sort()).toEqual(["a", "b", "c"]);
        expect(cy.$("#a").data("side")).toBe(0);
        expect(cy.$("#f").data("side")).toBe(1);
    });

    it("markovClustering: the two triangles, as markovClustering finds them", () => {
        const cy = graph(BARBELL);
        const theirs = cy.elements().markovClustering({});
        const ours = cy.elements().graphtyMarkovClustering();
        expect(sets(ours)).toEqual(sets(theirs));
        expect(ours.converged).toBe(true);
    });

    it("breadthFirstSearch and depthFirstSearch: the same visit order as bfs and dfs", () => {
        const cy = graph(BARBELL);
        const theirs = cy.elements().bfs({ root: "#a" });
        const ours = cy.elements().graphtyBreadthFirstSearch({ root: "#a", goal: "#e" });
        expect(ids(ours.path.nodes())).toEqual(ids(theirs.path.nodes()));
        expect(ids(ours.path)).toEqual(ids(theirs.path));
        expect(ids(ours.found)).toEqual(["e"]);
        expect(ours.depth("#f")).toBe(3);
        expect(ours.parent("#d")?.id()).toBe("c");
        expect(ours.parent("#a")).toBeUndefined();

        // Depth-first order depends on which neighbour is tried first (graphty: edge order; Cytoscape: the last
        // one), so compare on a tree where every node has one child.
        const line = graph([
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
        ]);
        const dfs = line.elements().graphtyDepthFirstSearch({ root: "#a" });
        expect(ids(dfs.path)).toEqual(ids(line.elements().dfs({ root: "#a" }).path));

        const dobfs = cy.elements().graphtyDirectionOptimizedBfs({ root: "#a", field: "hops" });
        expect(dobfs.depth("#f")).toBe(3);
        expect(cy.$("#f").data("hops")).toBe(3);
    });

    it("closenessCentrality and nodeClosenessCentrality: known values, and the same order as closenessCentralityNormalized", () => {
        const cy = graph([
            ["a", "b"],
            ["b", "c"],
        ]);
        const raw = cy.elements().graphtyClosenessCentrality();
        expect(raw.closeness("#b")).toBe(1 / 2);
        expect(raw.score("#a")).toBe(1 / 3);
        // `normalized` scales by the fraction of the other nodes reached (Wasserman and Faust), which is 1 on a
        // connected graph; it is not NetworkX's (n - 1) / sum.
        const ours = cy.elements().graphtyClosenessCentrality({ normalized: true });
        expect(ours.closeness("#b")).toBe(1 / 2);
        expect(cy.elements().graphtyNodeClosenessCentrality({ root: "#a" })).toBe(1 / 3);
        expect(cy.$("#a, #b, #e0").graphtyNodeClosenessCentrality({ root: "#a", weight: "w" })).toBe(1);
        const theirs = cy.elements().closenessCentralityNormalized({});
        expect(theirs.closeness(cy.$("#b"))).toBe(1);
        expect(theirs.closeness(cy.$("#a"))).toBeLessThan(1);
    });

    it("degreeCentrality and degrees: the same degrees as degreeCentralityNormalized", () => {
        const cy = graph([
            ["a", "b"],
            ["a", "c"],
            ["a", "d"],
        ]);
        // Cytoscape's typings make `root` required here and return a union, though neither holds at run time.
        const theirs = cy
            .elements()
            .degreeCentralityNormalized(
                {} as cytoscape.SearchDegreeCentralityNormalizedOptions,
            ) as cytoscape.SearchDegreeCentralityNormalizedResultUndirected;
        const ours = cy.elements().graphtyDegreeCentrality();
        expect(ours.degree("#a")).toBe(3);
        expect(cy.elements().graphtyDegreeCentrality({ normalized: true }).degree("#a")).toBe(1);
        expect(theirs.degree(cy.$("#a"))).toBe(1);
        const d = cy.elements().graphtyDegrees({ directed: true });
        expect(d.outdegree("#a")).toBe(3);
        expect(d.indegree("#a")).toBe(0);
        expect(d.indegree("#b")).toBe(1);
    });
});

describe("centrality with known answers", () => {
    it("personalizedPageRank ranks the teleport node first; deltaPageRank agrees with pageRank", () => {
        const cy = graph(SQUARE);
        const ppr = cy.elements().graphtyPersonalizedPageRank({ personalization: "#a" });
        expect(ppr.rank("#a")).toBeGreaterThan(ppr.rank("#c") ?? 1);
        const byFn = cy.elements().graphtyPersonalizedPageRank({ personalization: (n) => (n.id() === "a" ? 1 : 0) });
        expect(byFn.rank("#a")).toBeCloseTo(ppr.rank("#a") ?? 0, 12);

        const dir = graph([
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["a", "c"],
        ]);
        const pr = dir.elements().graphtyPageRank({ directed: true, tolerance: 1e-12 });
        const delta = dir.elements().graphtyDeltaPageRank({ tolerance: 1e-12, maxIterations: 100000 });
        const priority = dir
            .elements()
            .graphtyDeltaPageRank({ priority: true, tolerance: 1e-12, maxIterations: 100000 });
        for (const n of dir.nodes()) {
            const exact = pr.rank(n) ?? 0;
            expect(delta.rank(n)).toBeCloseTo(exact, 5);
            expect(priority.rank(n)).toBeCloseTo(exact, 5);
        }
    });

    it("personalization and initial ranks reach the delta and personalized variants", () => {
        const cy = graph(SQUARE);
        const ppr = cy.elements().graphtyPersonalizedPageRank({ personalization: "#a", initialRanks: () => 1 });
        expect(ppr.converged).toBe(true);
        const dir = graph([...SQUARE, ...SQUARE.map(([s, t]): Edge => [t, s])]);
        const delta = dir.elements().graphtyDeltaPageRank({ personalization: "#a" });
        expect(delta.rank("#a")).toBeGreaterThan(delta.rank("#c") ?? 1);
    });

    it("pageRank with initial ranks and a weight", () => {
        const cy = graph([
            ["a", "b", 3],
            ["a", "c", 1],
            ["b", "a", 1],
            ["c", "a", 1],
        ]);
        const r = cy.elements().graphtyPageRank({ directed: true, weight: "w", initialRanks: () => 0.25, field: "pr" });
        expect(r.rank("#b")).toBeGreaterThan(r.rank("#c") ?? 1);
        expect(cy.$("#b").data("pr")).toBe(r.rank("#b"));
    });

    it("eigenvector, katz and hits on symmetric and star graphs", () => {
        const tri = graph([
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
        ]);
        const ev = tri.elements().graphtyEigenvectorCentrality({ startVector: () => 1 });
        expect(ev.score("#a")).toBeCloseTo(ev.score("#b") ?? 0, 9);
        const katz = tri.elements().graphtyKatzCentrality();
        expect(katz.score("#a")).toBeCloseTo(katz.score("#c") ?? 0, 9);

        const star = graph([
            ["a", "x"],
            ["b", "x"],
            ["c", "x"],
        ]);
        const h = star.elements().graphtyHits({ directed: true });
        expect(h.authority("#x")).toBeCloseTo(1, 9);
        expect(h.hub("#x")).toBeCloseTo(0, 9);
        expect(h.score("#x")).toBe(h.authority("#x"));
        expect(h.hub("#a")).toBeGreaterThan(0);
    });

    it("edgeBetweennessCentrality scores the bridge highest and writes edge data", () => {
        const cy = graph(BARBELL);
        const r = cy.elements().graphtyEdgeBetweennessCentrality({ normalized: false, field: "eb" });
        expect(r.score("#e3")).toBe(9);
        expect(cy.$("#e3").data("eb")).toBe(9);
        expect(r.score("#a")).toBeUndefined();
    });

    it("kCoreDecomposition and triangleCount", () => {
        const cy = graph([...BARBELL, ["f", "g"]]);
        const k = cy.elements().graphtyKCoreDecomposition();
        expect(k.score("#a")).toBe(2);
        expect(k.score("#g")).toBe(1);
        expect(k.maxCore).toBe(2);
        expect(ids(k.core(2)).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
        const t = cy.elements().graphtyTriangleCount();
        expect(t.total).toBe(2);
        expect(t.score("#a")).toBe(1);
        expect(t.coefficient("#a")).toBe(1);
        expect(t.coefficient("#c")).toBeCloseTo(1 / 3, 12);
    });
});

describe("communities and clustering", () => {
    const halves = [
        ["a", "b", "c"],
        ["d", "e", "f"],
    ];

    it("louvain, leiden, label propagation, girvan-newman and spectral find the two triangles", () => {
        const cy = graph(BARBELL);
        const e = cy.elements();
        expect(sets(e.graphtyLouvain())).toEqual(halves);
        expect(sets(e.graphtyLeiden())).toEqual(halves);
        expect(sets(e.graphtyLabelPropagation())).toEqual(halves);
        expect(sets(e.graphtySpectralClustering({ k: 2, seed: 1 }))).toEqual(halves);
        const gn = e.graphtyGirvanNewman();
        expect(sets(gn)).toEqual(halves);
        expect(gn.modularity).toBeCloseTo(5 / 14, 12);
        expect(gn.levels).toBe(gn.modularities.length);
        expect(gn.level(0).length).toBeGreaterThan(0);
        expect(e.graphtyLouvain().modularity).toBeCloseTo(5 / 14, 12);
    });

    it("labelPropagationSynchronous, the semi-supervised variant, teraHAC, grsbm and syncClustering return partitions", () => {
        const cy = graph(BARBELL);
        const e = cy.elements();
        const all = ["a", "b", "c", "d", "e", "f"];
        for (const p of [
            e.graphtyLabelPropagationSynchronous(),
            e.graphtyTeraHAC({ numClusters: 2 }),
            e.graphtyGrsbm(),
            e.graphtySyncClustering({ numClusters: 2, seed: 1 }),
        ]) {
            expect(sets(p).flat().sort()).toEqual(all);
        }
        // TeraHAC merges by hop distance, where the bridge ends tie with their own triangles.
        expect(e.graphtyTeraHAC({ numClusters: 2 }).length).toBe(2);
        const semi = e.graphtyLabelPropagationSemiSupervised({ seeds: ["#a", "#f"] });
        expect(sets(semi)).toEqual(halves);
        cy.$("#a").data("seed", "left");
        cy.$("#f").data("seed", "right");
        expect(sets(e.graphtyLabelPropagationSemiSupervised({ seeds: "seed" }))).toEqual(halves);
    });

    it("hierarchicalClustering cuts the dendrogram", () => {
        const cy = graph(BARBELL);
        const h = cy.elements().graphtyHierarchicalClustering({ linkage: "average" });
        expect(h.merges).toBe(5);
        expect(sets(h.cut(0))).toEqual(["a", "b", "c", "d", "e", "f"].map((x) => [x]));
        expect(sets(h.cut(Infinity)).length).toBe(1);
    });

    it("modularity of a partition result, of selections and of a data field", () => {
        const cy = graph(BARBELL);
        const e = cy.elements();
        expect(e.graphtyModularity({ clusters: e.graphtyLouvain() })).toBeCloseTo(5 / 14, 12);
        expect(e.graphtyModularity({ clusters: ["#a, #b, #c", "#d, #e, #f"] })).toBeCloseTo(5 / 14, 12);
        e.graphtyLouvain({ field: "community" });
        expect(e.graphtyModularity({ clusters: "community" })).toBeCloseTo(5 / 14, 12);
    });
});

describe("structure", () => {
    it("topologicalSort and hasCycle", () => {
        const cy = graph(DAG);
        const order = ids(cy.elements().graphtyTopologicalSort() ?? cy.collection());
        expect(order[0]).toBe("a");
        expect(order[3]).toBe("d");
        expect(cy.elements().graphtyHasCycle({ directed: true })).toBe(false);
        expect(cy.elements().graphtyHasCycle()).toBe(true);
        const cyclic = graph([...DAG, ["d", "a"]]);
        expect(cyclic.elements().graphtyTopologicalSort()).toBeNull();
    });

    it("isBipartite", () => {
        const sq = graph(SQUARE).elements().graphtyIsBipartite();
        expect(sq.bipartite).toBe(true);
        expect(sets([sq.partitionFirst, sq.partitionSecond])).toEqual([
            ["a", "c"],
            ["b", "d"],
        ]);
        const tri = graph([
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
        ]);
        expect(tri.elements().graphtyIsBipartite().bipartite).toBe(false);
    });

    it("isGraphIsomorphic and findAllIsomorphisms map nodes to nodes", () => {
        const cy = graph([
            ["a", "b"],
            ["b", "c"],
            ["x", "y"],
            ["y", "z"],
        ]);
        const left = cy.$("#a, #b, #c").closedNeighborhood();
        const right = cy.$("#x, #y, #z").closedNeighborhood();
        const r = left.graphtyIsGraphIsomorphic({ other: right });
        expect(r.isomorphic).toBe(true);
        expect(r.mapping("#b")?.id()).toBe("y");
        expect(left.graphtyFindAllIsomorphisms({ other: right }).length).toBe(2);
        const none = left.graphtyIsGraphIsomorphic({ other: right, nodeMatch: (p, q) => p.id() === q.id() });
        expect(none.isomorphic).toBe(false);
        expect(none.mapping("#a")).toBeUndefined();
    });

    it("maxFlow, with the flow per edge", () => {
        const cy = graph([
            ["s", "a", 3],
            ["s", "b", 2],
            ["a", "t", 2],
            ["b", "t", 3],
            ["a", "b", 1],
        ]);
        const r = cy.elements().graphtyMaxFlow({ source: "#s", sink: "#t", weight: "w", directed: true });
        expect(r.value).toBe(5);
        expect(r.value).toBe(5);
        expect(r.flow("#e4")).toBe(1);
        expect(ids(r.partitionFirst)).toContain("s");
    });

    it("maximum and greedy bipartite matching", () => {
        const cy = graph([
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
        ]);
        const m = cy.elements().graphtyMaximumBipartiteMatching();
        expect(m.size).toBe(2);
        expect(m.mate("#a")?.id()).toBe("b");
        expect(m.mate("#b")?.id()).toBe("a");
        const g = cy.elements().graphtyGreedyBipartiteMatching({ left: "#a, #c", right: "#b, #d" });
        expect(g.size).toBeGreaterThan(0);
    });
});

describe("link prediction", () => {
    it("scores, predictions, pairs, candidates and evaluations", () => {
        const cy = graph(SQUARE);
        const e = cy.elements();
        expect(e.graphtyCommonNeighborsScore({ source: "#a", target: "#c" })).toBe(2);
        expect(e.graphtyAdamicAdarScore({ source: "#a", target: "#c" })).toBeCloseTo(2 / Math.log(2), 6);
        // @graphty/algorithms lists every candidate pair of an undirected graph twice, once per orientation, so
        // topK: 2 is one pair; topK: 4 is the two pairs.
        const top = e.graphtyCommonNeighborsPrediction({ topK: 4 });
        expect(top.map((p) => [p.source.id(), p.target.id()].sort().join()).sort()).toEqual([
            "a,c",
            "a,c",
            "b,d",
            "b,d",
        ]);
        expect(top[0]?.score).toBe(2);
        expect(e.graphtyAdamicAdarPrediction({ topK: 1 }).length).toBe(1);
        expect(
            e.graphtyCommonNeighborsForPairs({
                pairs: [
                    ["#a", "#c"],
                    ["#a", "#b"],
                ],
            }),
        ).toEqual([2, 0]);
        expect(e.graphtyAdamicAdarForPairs({ pairs: [["#b", "#d"]] })[0]).toBeCloseTo(2 / Math.log(2), 6);
        expect(e.graphtyTopCandidatesForNode({ root: "#a" }).map((p) => p.target.id())).toEqual(["c"]);
        expect(e.graphtyTopAdamicAdarCandidatesForNode({ root: "#a", candidates: "#c" })[0]?.target.id()).toBe("c");
        const held = { edges: [["#a", "#c"]] as const, nonEdges: [["#a", "#b"]] as const };
        expect(e.graphtyEvaluateCommonNeighbors(held).auc).toBe(1);
        expect(e.graphtyEvaluateAdamicAdar(held).auc).toBe(1);
        expect(e.graphtyCompareAdamicAdarWithCommonNeighbors(held).commonNeighbors.auc).toBe(1);
    });
});

describe("errors", () => {
    it("throws when a weight is given to an algorithm that reads none", () => {
        const cy = graph(WEIGHTED);
        expect(() => cy.elements().graphtyBetweennessCentrality({ weight: "w" })).toThrow(
            /graphtyBetweennessCentrality: this algorithm reads no edge weights/,
        );
    });

    it("throws when a required node is missing or matches nothing", () => {
        const cy = graph(WEIGHTED);
        expect(() => cy.elements().graphtyDijkstra({} as never)).toThrow(
            /graphtyDijkstra: the root option is required/,
        );
        expect(() => cy.elements().graphtyDijkstra({ root: "#nope" })).toThrow(/root matches no node/);
        expect(() => cy.elements().graphtyCommonNeighborsForPairs({} as never)).toThrow(/pairs option is required/);
        expect(() => cy.elements().graphtyModularity({} as never)).toThrow(/clusters option is required/);
        expect(() => cy.elements().graphtyIsGraphIsomorphic({})).toThrow(/other option/);
        expect(() => cy.elements().graphtyPersonalizedPageRank({} as never)).toThrow(/personalization option/);
    });

    it("lets the algorithm's own errors through", () => {
        const cy = graph(DAG);
        expect(() => cy.elements().graphtyConnectedComponents({ directed: true })).toThrow(/undirected/);
        expect(() => cy.elements().graphtyTopologicalSort({ directed: false })).toThrow(/directed/);
    });

    it("answers undefined for an element outside the collection", () => {
        const cy = graph(BARBELL);
        const r = cy.$("#a, #b, #c").graphtyPageRank();
        expect(r.rank("#d")).toBeUndefined();
        expect(r.rank("#nothing")).toBeUndefined();
        expect(cy.$("#a, #b").graphtyDijkstra({ root: "#a" }).distanceTo("#f")).toBe(Infinity);
    });
});
