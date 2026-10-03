/**
 * One shape per idea across the result types: every partition reads as a `LabelResult`, the traversals
 * return the tree edge they followed, betweenness states the divisor its scores carry, and every error an
 * algorithm throws on purpose carries a stable `code`.
 */
import { GraphBuilder, type GraphSnapshot, INVALID_INDEX, maskTest } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    type AlgorithmErrorCode,
    betweennessCentrality,
    breadthFirstSearch,
    connectedComponents,
    ConvergenceError,
    depthFirstSearch,
    directionOptimizedBfs,
    edgeBetweennessCentrality,
    girvanNewman,
    hierarchicalClustering,
    kargerMinCut,
    type LabelResult,
    maxFlow,
    minSTCut,
    PathCountOverflowError,
    PathWalkError,
    stoerWagner,
    stronglyConnectedComponents,
    syncClustering,
    topologicalSort,
} from "../../../src/index.js";

function build(directed: boolean, edges: readonly (readonly [string, string])[]): GraphSnapshot {
    const b = new GraphBuilder({ directed });
    for (const [u, v] of edges) {
        b.addEdge(u, v);
    }
    return b.freeze();
}

/** Two triangles joined by one bridge: a-b-c and d-e-f, bridge c-d. */
const BARBELL = build(false, [
    ["a", "b"],
    ["b", "c"],
    ["c", "a"],
    ["c", "d"],
    ["d", "e"],
    ["e", "f"],
    ["f", "d"],
]);

/** The LabelResult contract: dense labels in first-seen order, `count` of them, and `groups()` agreeing. */
function expectLabelResult(r: LabelResult, n: number): void {
    expect(r.labels.length).toBe(n);
    let next = 0;
    for (let i = 0; i < n; i++) {
        expect(r.labels[i]).toBeLessThanOrEqual(next);
        if (r.labels[i] === next) {
            next++;
        }
    }
    expect(r.count).toBe(next);
    const groups = r.groups();
    expect(groups.length).toBe(r.count);
    groups.forEach((g, label) => g.forEach((i) => expect(r.labels[i]).toBe(label)));
    expect(groups.reduce((sum, g) => sum + g.length, 0)).toBe(n);
}

function groupIds(s: GraphSnapshot, r: LabelResult): string[][] {
    return r.groups().map((g) => Array.from(g, (i) => String(s.ids.idOf(i))));
}

describe("partitions read as LabelResult", () => {
    it("girvanNewman returns its most modular level as its labels", () => {
        const r = girvanNewman(BARBELL);
        expectLabelResult(r, BARBELL.nodeCount);
        let best = 0;
        r.modularity.forEach((q, i) => {
            if (q > r.modularity[best]) {
                best = i;
            }
        });
        expect(r.bestLevel).toBe(best);
        expect([...r.labels]).toEqual([...r.levels[best]]);
        expect(groupIds(BARBELL, r)).toEqual([
            ["a", "b", "c"],
            ["d", "e", "f"],
        ]);
    });

    it("hierarchicalClustering cuts by cluster count and by merge distance", () => {
        // complete linkage's merges come at distances 1, 1, 1, 2, 3; a cut applies them in that order
        const r = hierarchicalClustering(BARBELL, { linkage: "complete" });
        expect([...r.distance]).toEqual([1, 1, 1, 2, 3]);
        const two = r.cutAt({ clusters: 2 });
        expectLabelResult(two, BARBELL.nodeCount);
        expect(groupIds(BARBELL, two)).toEqual([
            ["a", "b", "c", "d"],
            ["e", "f"],
        ]);
        expect(r.cutAt({ clusters: 6 }).count).toBe(6);
        expect(r.cutAt({ clusters: 1 }).count).toBe(1);
        expect(r.cutAt({ distance: 0.5 }).count).toBe(6);
        expect(r.cutAt({ distance: 1 }).count).toBe(3);
        expect(groupIds(BARBELL, r.cutAt({ distance: 2 }))).toEqual(groupIds(BARBELL, two));
        expect(r.cutAt({ distance: Infinity }).count).toBe(1);
        expect(() => r.cutAt({ clusters: 0 })).toThrow(expect.objectContaining({ code: "E_BAD_OPTION" }));
        expect(() => r.cutAt({ clusters: 7 })).toThrow(expect.objectContaining({ code: "E_BAD_OPTION" }));
        expect(() => r.cutAt({ distance: Number.NaN })).toThrow(expect.objectContaining({ code: "E_BAD_OPTION" }));
    });

    it("hierarchicalClustering cannot cut a disconnected graph to fewer clusters than its parts", () => {
        const s = build(false, [
            ["a", "b"],
            ["c", "d"],
        ]);
        const r = hierarchicalClustering(s);
        expect(groupIds(s, r.cutAt({ clusters: 2 }))).toEqual([
            ["a", "b"],
            ["c", "d"],
        ]);
        expect(() => r.cutAt({ clusters: 1 })).toThrow(expect.objectContaining({ code: "E_BAD_OPTION" }));
    });

    it("syncClustering offers groups()", () => {
        const r = syncClustering(BARBELL, { numClusters: 2, seed: 1 });
        const groups = r.groups();
        expect(groups.length).toBe(r.count);
        groups.forEach((g, label) => g.forEach((i) => expect(r.labels[i]).toBe(label)));
    });

    it("the cuts and the maximum flow label their two sides", () => {
        const a = BARBELL.ids.indexOf("a");
        const f = BARBELL.ids.indexOf("f");
        for (const r of [stoerWagner(BARBELL), kargerMinCut(BARBELL, { randomSeed: 1 }), minSTCut(BARBELL, a, f)]) {
            expectLabelResult(r, BARBELL.nodeCount);
            expect(r.count).toBe(2);
            for (let i = 0; i < BARBELL.nodeCount; i++) {
                expect(r.labels[i] === r.labels[0]).toBe(maskTest(r.side, i) === maskTest(r.side, 0));
            }
        }
        const flow = maxFlow(BARBELL, a, f);
        expectLabelResult(flow, BARBELL.nodeCount);
        expect(groupIds(BARBELL, flow)).toEqual([
            ["a", "b", "c"],
            ["d", "e", "f"],
        ]);
    });
});

describe("traversals return the tree edge", () => {
    // a and b are joined by three parallel edges; only the tree edge's index tells them apart
    const multi = build(false, [
        ["a", "b"],
        ["a", "b"],
        ["a", "b"],
        ["b", "c"],
        ["x", "y"],
    ]);
    const a = multi.ids.indexOf("a");
    const c = multi.ids.indexOf("c");
    const x = multi.ids.indexOf("x");

    for (const [name, run] of [
        ["breadthFirstSearch", breadthFirstSearch],
        ["depthFirstSearch", depthFirstSearch],
    ] as const) {
        it(`${name} records the arc that discovered each node`, () => {
            const r = run(multi, a);
            expect(r.predArc[a]).toBe(INVALID_INDEX);
            expect(r.predArc[x]).toBe(INVALID_INDEX);
            for (let v = 0; v < multi.nodeCount; v++) {
                if (r.parent[v] !== INVALID_INDEX) {
                    expect(multi.arcSource(r.predArc[v])).toBe(r.parent[v]);
                    expect(multi.colIdx[r.predArc[v]]).toBe(v);
                }
            }
            expect(Array.from(r.pathTo(c), (i) => multi.ids.idOf(i))).toEqual(["a", "b", "c"]);
            const edges = r.pathEdges(c);
            expect(edges.length).toBe(2);
            const el = multi.edgeList();
            expect(Array.from(edges, (e) => [el.src[e], el.dst[e]].map((i) => multi.ids.idOf(i)).sort())).toEqual([
                ["a", "b"],
                ["b", "c"],
            ]);
            expect(edges[0]).toBe(multi.arcToEdge[r.predArc[multi.ids.indexOf("b")]]);
            expect(r.pathTo(x).length).toBe(0);
            expect(r.pathEdges(x).length).toBe(0);
        });
    }

    it("directionOptimizedBfs records forward arcs in its bottom-up steps too", () => {
        const directed = build(true, [
            ["a", "b"],
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["a", "d"],
            ["d", "c"],
        ]);
        for (const s of [multi, directed]) {
            // alpha and beta so large that every step runs bottom-up
            for (const options of [{}, { alpha: 1e9, beta: 1e9 }]) {
                const r = directionOptimizedBfs(s, 0, options);
                for (let v = 0; v < s.nodeCount; v++) {
                    if (r.parent[v] === INVALID_INDEX) {
                        expect(r.predArc[v]).toBe(INVALID_INDEX);
                    } else {
                        expect(s.arcSource(r.predArc[v])).toBe(r.parent[v]);
                        expect(s.colIdx[r.predArc[v]]).toBe(v);
                    }
                }
            }
        }
    });

    it("follows an arcOrder when it picks the tree edge", () => {
        const s = build(false, [
            ["a", "b"],
            ["a", "b"],
        ]);
        const row = s.rowPtr[0];
        const reversed = Uint32Array.from(s.colIdx, (_, i) => i);
        reversed[row] = row + 1;
        reversed[row + 1] = row;
        expect(breadthFirstSearch(s, 0).predArc[1]).toBe(row);
        expect(breadthFirstSearch(s, 0, { arcOrder: reversed }).predArc[1]).toBe(row + 1);
        expect(depthFirstSearch(s, 0, { arcOrder: reversed }).predArc[1]).toBe(row + 1);
    });
});

describe("betweenness states its divisor", () => {
    it("reports what the summed ordered-pair counts were divided by", () => {
        const n = BARBELL.nodeCount;
        expect(betweennessCentrality(BARBELL).divisor).toBe(2);
        expect(betweennessCentrality(BARBELL, { normalized: true }).divisor).toBe((n - 1) * (n - 2));
        expect(betweennessCentrality(BARBELL, { normalized: true, endpoints: true }).divisor).toBe(n * (n - 1));
        expect(edgeBetweennessCentrality(BARBELL).divisor).toBe(2);
        const directed = build(true, [
            ["a", "b"],
            ["b", "c"],
        ]);
        expect(betweennessCentrality(directed).divisor).toBe(1);
        // c lies on the one shortest path between each of a, b and each of d, e, f: 6 pairs, 12 ordered
        const raw = betweennessCentrality(BARBELL);
        const c = BARBELL.ids.indexOf("c");
        expect(raw.scores[c] * raw.divisor).toBe(12);
    });
});

describe("errors carry a stable code", () => {
    const directed = build(true, [
        ["a", "b"],
        ["b", "a"],
    ]);
    const cases: [string, () => unknown, AlgorithmErrorCode][] = [
        ["connectedComponents on a directed graph", () => connectedComponents(directed), "E_NEEDS_UNDIRECTED"],
        ["girvanNewman on a directed graph", () => girvanNewman(directed), "E_NEEDS_UNDIRECTED"],
        ["topologicalSort on an undirected graph", () => topologicalSort(BARBELL), "E_NEEDS_DIRECTED"],
        ["stronglyConnectedComponents undirected", () => stronglyConnectedComponents(BARBELL), "E_NEEDS_DIRECTED"],
        ["a start node out of range", () => breadthFirstSearch(BARBELL, 99), "E_BAD_NODE"],
        ["an unknown linkage", () => hierarchicalClustering(BARBELL, { linkage: "x" as "single" }), "E_BAD_OPTION"],
    ];
    for (const [name, call, code] of cases) {
        it(`${name}: ${code}`, () => {
            expect(call).toThrow(expect.objectContaining({ code }));
        });
    }

    it("the error classes carry codes too", () => {
        expect(new ConvergenceError("pageRank", 10, 1e-6).code).toBe("E_NOT_CONVERGED");
        expect(new PathWalkError(0, 1, "gap").code).toBe("E_BAD_PATH");
        expect(new PathCountOverflowError("betweennessCentrality").code).toBe("E_PATH_COUNT_OVERFLOW");
    });
});
