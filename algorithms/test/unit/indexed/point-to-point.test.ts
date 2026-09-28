import { expandEdges, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { dijkstraPath as legacyDijkstraPath } from "../../../src/algorithms/shortest-path/dijkstra.js";
import { Graph } from "../../../src/core/graph.js";
import { dijkstra } from "../../../src/indexed/dijkstra.js";
import { exactArcWeights, fromAdjacencyMap } from "../../../src/indexed/facade.js";
import { astar, bidirectionalDijkstra, type PathResult } from "../../../src/indexed/point-to-point.js";
import { astar as legacyAstar, astarWithDetails as legacyAstarWithDetails } from "../../../src/pathfinding/astar.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, offGridWeights, undirectedFixtures } from "./port-fixtures.js";

const fixtures = (): { name: string; graph: Graph }[] =>
    [...undirectedFixtures(), ...directedFixtures()].flatMap(({ name, graph }) => [
        { name, graph },
        { name: `${name}, off-grid weights`, graph: offGridWeights(graph) },
    ]);

/** The result's path and edges agree with each other, and the edges' weights sum to its distance. */
function expectConsistent(s: GraphSnapshot, r: PathResult, weights: ArrayLike<number> | null): void {
    expect(r.edges.length).toBe(Math.max(r.path.length - 1, 0));
    const { src, dst, arc } = s.edgeList();
    let total = 0;
    for (let k = 0; k < r.edges.length; k++) {
        const e = r.edges[k];
        const [u, v] = [r.path[k], r.path[k + 1]];
        expect((src[e] === u && dst[e] === v) || (!s.directed && src[e] === v && dst[e] === u)).toBe(true);
        total += weights === null ? 1 : weights[arc[e]];
    }
    if (r.path.length > 0) {
        expect(total).toBe(r.distance);
    }
}

/** A legacy Map-of-Maps adjacency with an entry per arc of the graph (both ways when undirected). */
function adjacencyOf(graph: Graph): Map<string, Map<string, number>> {
    const map = new Map<string, Map<string, number>>();
    for (const node of graph.nodes()) {
        map.set(String(node.id), new Map());
    }
    for (const e of graph.edges()) {
        map.get(String(e.source))?.set(String(e.target), e.weight ?? 1);
        if (!graph.isDirected) {
            map.get(String(e.target))?.set(String(e.source), e.weight ?? 1);
        }
    }
    return map;
}

describe("indexed.bidirectionalDijkstra", () => {
    it("equals legacy dijkstraPath exactly, from node 0 to every node, through the override", () => {
        for (const { name, graph } of fixtures()) {
            const s = checksummedSnapshot(graph);
            const weights = exactArcWeights(s);
            const offGrid = name.endsWith("off-grid weights");
            expect(weights !== undefined, name).toBe(offGrid);
            for (let t = 0; t < s.nodeCount; t++) {
                const r = bidirectionalDijkstra(s, 0, t, { weights });
                const legacy = legacyDijkstraPath(graph, s.ids.idOf(0), s.ids.idOf(t));
                const at = `${name}: 0 -> ${String(t)}`;
                if (legacy === null) {
                    expect(r.distance, at).toBe(Infinity);
                    expect(r.path.length, at).toBe(0);
                    expect(r.edges.length, at).toBe(0);
                    continue;
                }
                expect(r.distance, at).toBe(legacy.distance);
                expectConsistent(s, r, weights ?? s.weights);
                if (offGrid) {
                    // off-grid weights leave one shortest path, so the chosen path must be legacy's
                    expect(
                        Array.from(r.path, (i) => s.ids.idOf(i)),
                        at,
                    ).toEqual(legacy.path);
                }
            }
            s.validate({ checksum: true });
        }
    });

    it("agrees with the single-source port on every pair of a directed fixture", () => {
        for (const { name, graph } of directedFixtures()) {
            const s = checksummedSnapshot(offGridWeights(graph));
            const weights = exactArcWeights(s);
            for (let u = 0; u < s.nodeCount; u += 3) {
                const sssp = dijkstra(s, u, { weights });
                for (let t = 0; t < s.nodeCount; t++) {
                    const r = bidirectionalDijkstra(s, u, t, { weights });
                    expect(r.distance, `${name}: ${String(u)} -> ${String(t)}`).toBe(sssp.dist[t]);
                    // equal-length paths can still tie here (two offset sums can match), so the
                    // path is checked for consistency rather than compared
                    expectConsistent(s, r, weights ?? s.weights);
                    expect(r.path.length === 0, `${name}: ${String(u)} -> ${String(t)}`).toBe(
                        sssp.pathTo(t).length === 0,
                    );
                }
            }
        }
    });

    it("searches backward against edge direction", () => {
        // a -> b -> c, plus c -> a: the path a to c is forward only, c to a is the single arc.
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 1);
        g.addEdge("c", "a", 5);
        const s = checksummedSnapshot(g);
        expect(bidirectionalDijkstra(s, 0, 2).distance).toBe(2);
        expect(bidirectionalDijkstra(s, 2, 0).distance).toBe(5);
        expect(Array.from(bidirectionalDijkstra(s, 1, 0).path)).toEqual([1, 2, 0]);
    });

    it("returns the source alone for source === target", () => {
        const s = checksummedSnapshot(undirectedFixtures()[0].graph);
        const r = bidirectionalDijkstra(s, 2, 2);
        expect(r.distance).toBe(0);
        expect(Array.from(r.path)).toEqual([2]);
        expect(r.edges.length).toBe(0);
    });

    it("reports an unreachable target as Infinity with an empty path", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("c", "b", 1);
        const s = checksummedSnapshot(g);
        const r = bidirectionalDijkstra(s, 0, 2);
        expect(r.distance).toBe(Infinity);
        expect(r.path.length).toBe(0);
        expect(r.edges.length).toBe(0);
    });

    it("resolves a parallel edge to the exact cheapest edge, forward and override", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 4);
        b.addEdge("a", "b", 1);
        b.addEdge("b", "c", 1);
        b.addEdge("b", "c", 2);
        const s = b.freeze({ checksum: true });
        expect(Array.from(bidirectionalDijkstra(s, 0, 2).edges)).toEqual([1, 2]);
        expect(Array.from(bidirectionalDijkstra(s, 2, 0).edges)).toEqual([2, 1]);
        const r = bidirectionalDijkstra(s, 0, 2, { weights: expandEdges(s, Float64Array.of(0.5, 1, 3, 0.25)) });
        expect(Array.from(r.edges)).toEqual([0, 3]);
        expect(r.distance).toBe(0.75);
        s.validate({ checksum: true });
    });

    it("refuses a negative weight as legacy does", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", -1);
        const s = checksummedSnapshot(g);
        expect(() => bidirectionalDijkstra(s, 0, 1)).toThrow("does not support negative edge weights");
    });

    it("refuses a negative weight beyond the meeting point, as legacy does", () => {
        const g = new Graph({ directed: true });
        g.addEdge("s", "t", 1);
        g.addEdge("s", "x", 5);
        g.addEdge("x", "y", -1);
        for (let i = 0; i < 10; i++) {
            g.addNode(`pad${String(i)}`); // more than 10 nodes, so legacy dijkstraPath goes bidirectional
        }
        expect(() => legacyDijkstraPath(g, "s", "t")).toThrow("does not support negative edge weights");
        const s = checksummedSnapshot(g);
        const [from, to] = [s.ids.requireIndex("s"), s.ids.requireIndex("t")];
        expect(() => bidirectionalDijkstra(s, from, to)).toThrow("does not support negative edge weights");
    });
});

describe("indexed.astar", () => {
    it("equals legacy astar exactly with the zero heuristic and with a consistent one", () => {
        for (const { name, graph } of fixtures()) {
            const adjacency = adjacencyOf(graph);
            const s = fromAdjacencyMap(adjacency);
            const weights = exactArcWeights(s);
            const reverse = s.directed ? null : s;
            for (let t = 0; t < s.nodeCount; t += 5) {
                // Half the true distance to the target is consistent, so A* stays exact.
                const toTarget = dijkstra(reverse ?? s.transpose().snapshot, t, {
                    weights: reverse === null ? undefined : weights,
                });
                const half = (i: number): number => (Number.isFinite(toTarget.dist[i]) ? toTarget.dist[i] / 2 : 0);
                for (const [label, h, legacyH] of [
                    ["zero", (): number => 0, (): number => 0],
                    ["half", (i: number): number => half(i), (id: string): number => half(s.ids.requireIndex(id))],
                ] as const) {
                    const r = astar(s, 0, t, h, { weights });
                    const legacy = legacyAstar(adjacency, String(s.ids.idOf(0)), String(s.ids.idOf(t)), legacyH);
                    const at = `${name}, ${label}: 0 -> ${String(t)}`;
                    if (legacy === null) {
                        expect(r.distance, at).toBe(Infinity);
                        expect(r.path.length, at).toBe(0);
                        continue;
                    }
                    expect(r.distance, at).toBe(legacy.cost);
                    expectConsistent(s, r, weights ?? s.weights);
                    if (name.endsWith("off-grid weights")) {
                        expect(
                            Array.from(r.path, (i) => s.ids.idOf(i)),
                            at,
                        ).toEqual(legacy.path);
                    }
                }
            }
        }
    });

    it("gives the scores astarWithDetails reports", () => {
        const { graph } = undirectedFixtures()[5];
        const adjacency = adjacencyOf(offGridWeights(graph));
        const s = fromAdjacencyMap(adjacency);
        const target = 7;
        const r = astar(s, 0, target, () => 0, { weights: exactArcWeights(s) });
        const legacy = legacyAstarWithDetails(adjacency, String(s.ids.idOf(0)), String(s.ids.idOf(target)), () => 0);
        for (const [id, g] of legacy.gScores) {
            expect(r.gScore[s.ids.requireIndex(id)]).toBe(g);
        }
        for (let i = 0; i < s.nodeCount; i++) {
            if (!legacy.gScores.has(String(s.ids.idOf(i)))) {
                expect(r.gScore[i]).toBe(Infinity);
            }
        }
        expect(new Set(Array.from(r.visited, (i) => String(s.ids.idOf(i))))).toEqual(legacy.visited);
    });

    it("never reopens an expanded node, as legacy astarWithDetails, under an inconsistent heuristic", () => {
        // a is expanded at cost 4 before b offers it at cost 2; legacy keeps the cost-4 route.
        const adjacency = new Map([
            ["s", new Map([["a", 4], ["b", 1]])],
            ["b", new Map([["a", 1]])],
            ["a", new Map([["t", 10]])],
            ["t", new Map<string, number>()],
        ]);
        const h = new Map([["b", 5]]);
        const legacy = legacyAstarWithDetails(adjacency, "s", "t", (id) => h.get(id) ?? 0);
        const s = fromAdjacencyMap(adjacency);
        const r = astar(s, s.ids.requireIndex("s"), s.ids.requireIndex("t"), (i) => h.get(String(s.ids.idOf(i))) ?? 0);
        expect(legacy.cost).toBe(14);
        expect(r.distance).toBe(legacy.cost);
        expect(Array.from(r.path, (i) => s.ids.idOf(i))).toEqual(legacy.path);
        for (let i = 0; i < s.nodeCount; i++) {
            const id = String(s.ids.idOf(i));
            expect(r.gScore[i], id).toBe(legacy.gScores.get(id) ?? Infinity);
            expect(r.fScore[i], id).toBe(legacy.fScores.get(id) ?? Infinity);
        }
    });

    it("refuses a node index outside the graph", () => {
        const s = fromAdjacencyMap(new Map([["a", new Map([["b", 1]])]]));
        expect(() => astar(s, 0, 99, () => 0)).toThrow(RangeError);
        expect(() => astar(s, 99, 0, () => 0)).toThrow(RangeError);
        expect(() => bidirectionalDijkstra(s, 0, 99)).toThrow(RangeError);
    });

    it("returns the start alone when start is the goal", () => {
        const s = fromAdjacencyMap(new Map([["a", new Map([["b", 1]])]]));
        const r = astar(s, 0, 0, () => 0);
        expect(r.distance).toBe(0);
        expect(Array.from(r.path)).toEqual([0]);
    });

    it("reports an unreachable goal as Infinity with an empty path", () => {
        const s = fromAdjacencyMap(
            new Map([
                ["a", new Map([["b", 1]])],
                ["c", new Map()],
            ]),
        );
        const r = astar(s, 0, s.ids.requireIndex("c"), () => 0);
        expect(r.distance).toBe(Infinity);
        expect(r.path.length).toBe(0);
        expect(r.edges.length).toBe(0);
    });

    it("resolves a parallel edge to the exact cheapest edge", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b", 3);
        b.addEdge("a", "b", 2);
        b.addEdge("a", "b", 7);
        const s = b.freeze();
        const r = astar(s, 0, 1, () => 0);
        expect(r.distance).toBe(2);
        expect(Array.from(r.edges)).toEqual([1]);
        const o = astar(s, 0, 1, () => 0, { weights: expandEdges(s, Float64Array.of(3, 2, 1.5)) });
        expect(Array.from(o.edges)).toEqual([2]);
    });

    it("passes node indices and the goal to the heuristic", () => {
        const s = fromAdjacencyMap(
            new Map([
                ["a", new Map([["b", 1]])],
                ["b", new Map([["c", 1]])],
            ]),
        );
        const seen: [number, number][] = [];
        astar(s, 0, 2, (i, goal) => {
            seen.push([i, goal]);
            return 0;
        });
        expect(seen.every(([, goal]) => goal === 2)).toBe(true);
        expect(seen.map(([i]) => i).sort()).toEqual([0, 1, 2]);
    });
});
