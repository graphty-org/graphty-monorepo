import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
    ArcOrderOption,
    AstarResult,
    BetweennessOptions,
    BfsOptions,
    BfsResult,
    BipartiteOptions,
    BipartiteResult,
    ClosenessOptions,
    CondensationResult,
    DegreeCentralityOptions,
    DfsOptions,
    DfsResult,
    DirectionOptimizedBfsOptions,
    EdgeBetweennessOptions,
    EdgeScoresResult,
    IndexedApspOptions,
    IndexedApspResult,
    IndexedBellmanFordResult,
    IndexedEigenvectorOptions,
    IndexedEigenvectorResult,
    IndexedLabelPropagationOptions,
    IndexedLabelPropagationResult,
    LabelResult,
    PathOptions,
    PathResult,
    PrimOptions,
    PrimResult,
    ScoresResult,
} from "../../../src/index.js";

// process.cwd(), not import.meta.url: the default project runs under happy-dom, which rewrites
// import.meta.url to an http: URL (test/helpers/performance-regression.ts:46 locates its file the same way).
const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
};

describe("graph-format wiring", () => {
    it("declares @graphty/graph-format as a workspace dependency and a caret peer", () => {
        // workspace:^ and not workspace:*: pnpm publishes workspace:* as an EXACT pin, which would
        // lock every consumer of @graphty/algorithms to one graph-format patch (design 17.7 D-PEER-1X).
        expect(packageJson.dependencies?.["@graphty/graph-format"]).toBe("workspace:^");
        expect(packageJson.peerDependencies?.["@graphty/graph-format"]).toBe("^1.0.0");
    });

    it("resolves the format at runtime", async () => {
        const format = await import("@graphty/graph-format");
        expect(format.FORMAT_VERSION).toBe(1);
        expect(typeof format.GraphBuilder).toBe("function");
    });
});

describe("indexed label propagation exports", () => {
    it("reaches indexed.labelPropagation and its flat Indexed* types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        expect(typeof pkg.indexed.labelPropagation).toBe("function");
        const options: IndexedLabelPropagationOptions = { maxIterations: 5, randomSeed: 1, weighted: false };
        const format = await import("@graphty/graph-format");
        const s = new format.GraphBuilder({ directed: false }).freeze();
        const r: IndexedLabelPropagationResult = pkg.indexed.labelPropagation(s, options);
        expect(r.count).toBe(0);
    });
});

describe("indexed all-pairs shortest path exports", () => {
    it("reaches indexed.allPairsShortestPath and its flat Indexed* types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        expect(typeof pkg.indexed.allPairsShortestPath).toBe("function");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: true });
        b.addEdge(0, 1, 2);
        const options: IndexedApspOptions = { method: "floyd-warshall" };
        const r: IndexedApspResult = pkg.indexed.allPairsShortestPath(b.freeze(), options);
        expect(r.n).toBe(2);
        expect(Array.from(r.dist)).toEqual([0, 2, Infinity, 0]);
    });
});

describe("indexed eigenvector and personalized PageRank exports", () => {
    it("reaches both through the package barrel, with the eigenvector's flat Indexed* types", async () => {
        const pkg = await import("../../../src/index.js");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        const s = b.freeze();
        const options: IndexedEigenvectorOptions = { normalized: false };
        const r: IndexedEigenvectorResult = pkg.indexed.eigenvectorCentrality(s, options);
        expect(r.scores[0]).toBeCloseTo(Math.SQRT1_2, 12);
        const p = pkg.indexed.personalizedPageRank(s, Float64Array.of(1, 1));
        expect(p.scores[0]).toBeCloseTo(0.5, 12);
    });
});

describe("indexed traversal family exports", () => {
    it("reaches the traversal ports and their option and result types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: true });
        b.addEdge(0, 1);
        b.addEdge(1, 2);
        const s = b.freeze();
        const bfsOptions: BfsOptions = { target: 1 };
        const bfs: BfsResult = pkg.indexed.breadthFirstSearch(s, 0, bfsOptions);
        expect(bfs.visitedCount).toBe(2);
        const dobfsOptions: DirectionOptimizedBfsOptions = { alpha: 15 };
        expect(pkg.indexed.directionOptimizedBfs(s, 0, dobfsOptions).visitedCount).toBe(3);
        const dfsOptions: DfsOptions = { order: "post" };
        const dfs: DfsResult = pkg.indexed.depthFirstSearch(s, 0, dfsOptions);
        expect(Array.from(dfs.order)).toEqual([2, 1, 0]);
        expect(pkg.indexed.hasCycle(s)).toBe(false);
        expect(Array.from(pkg.indexed.topologicalSort(s) ?? [])).toEqual([0, 1, 2]);
        const bipartiteOptions: BipartiteOptions = { arcs: "out" };
        const bipartite: BipartiteResult = pkg.indexed.isBipartite(s, bipartiteOptions);
        expect(bipartite.bipartite).toBe(true);
        const arcOrder: ArcOrderOption = { arcOrder: new Uint32Array([0, 1]) };
        const scc: LabelResult = pkg.indexed.stronglyConnectedComponents(s, arcOrder);
        expect(scc.count).toBe(3);
        const condensed: CondensationResult = pkg.indexed.condensation(s, arcOrder);
        expect(condensed.condensed.snapshot.edgeCount).toBe(2);
    });
});

describe("indexed path and tree exports", () => {
    it("reaches Bellman-Ford, the point-to-point searches and Prim with their flat types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: false });
        b.addEdge(0, 1, 2);
        b.addEdge(1, 2, 3);
        const s = b.freeze();
        const bf: IndexedBellmanFordResult = pkg.indexed.bellmanFord(s, 0);
        expect(bf.dist[2]).toBe(5);
        const options: PathOptions = {};
        const bi: PathResult = pkg.indexed.bidirectionalDijkstra(s, 0, 2, options);
        expect(bi.distance).toBe(5);
        const a: AstarResult = pkg.indexed.astar(s, 0, 2, () => 0, options);
        expect(Array.from(a.path)).toEqual([0, 1, 2]);
        const primOptions: PrimOptions = { forest: true };
        const prim: PrimResult = pkg.indexed.primMST(s, primOptions);
        expect(prim.totalWeight).toBe(5);
    });
});

describe("indexed path centrality exports", () => {
    it("reaches the four ports and their flat types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: false });
        b.addEdge(0, 1);
        b.addEdge(1, 2);
        const s = b.freeze();
        const betweenness: BetweennessOptions = { normalized: false, sources: [0, 1, 2] };
        const node: ScoresResult = pkg.indexed.betweennessCentrality(s, betweenness);
        expect(Array.from(node.scores)).toEqual([0, 1, 0]);
        const edge: EdgeBetweennessOptions = { normalized: false };
        const edges: EdgeScoresResult = pkg.indexed.edgeBetweennessCentrality(s, edge);
        expect(Array.from(edges.scores)).toEqual([2, 2]);
        const closeness: ClosenessOptions = { harmonic: false };
        expect(Array.from(pkg.indexed.closenessCentrality(s, closeness).scores)).toEqual([1 / 3, 1 / 2, 1 / 3]);
        expect(pkg.indexed.nodeClosenessCentrality(s, 1, closeness)).toBe(1 / 2);
        const degree: DegreeCentralityOptions = { normalized: true };
        expect(Array.from(pkg.indexed.degreeCentrality(s, degree))).toEqual([0.5, 1, 0.5]);
    });
});
