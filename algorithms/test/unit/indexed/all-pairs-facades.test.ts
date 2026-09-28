/**
 * The legacy all-pairs functions `floydWarshall`, `floydWarshallPath` and `transitiveClosure`
 * delegate to `indexed.allPairsShortestPath`. They are checked against repeated legacy single-source
 * Dijkstra -- the Floyd-Warshall legacy code is gone, and
 * running it hung vitest under coverage -- and every result change they make on purpose against a
 * hand-computed fixture.
 */

import { describe, expect, it } from "vitest";

import {
    floydWarshall,
    floydWarshallPath,
    transitiveClosure,
} from "../../../src/algorithms/shortest-path/floyd-warshall.js";
import { Graph } from "../../../src/core/graph.js";
import type { NodeId } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

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

/** Directed, with negative weights but no negative cycle. */
function negativeNoCycle(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge("a", "b", 4);
    g.addEdge("a", "c", 2);
    g.addEdge("c", "b", -1);
    g.addEdge("b", "d", 3);
    return g;
}

const fixtures: FacadeFixture[] = [
    ...undirectedFixtures(),
    ...directedFixtures(),
    { name: "numeric ids, f64 weights, an isolated node", graph: numericWeighted() },
    { name: "empty", graph: new Graph({ directed: false }) },
];

const ids = (g: Graph): NodeId[] => Array.from(g.nodes(), (n) => n.id);

/** Every pair's distance from repeated legacy Dijkstra, +Infinity where unreachable, in node order. */
function dijkstraMatrix(g: Graph): Map<NodeId, Map<NodeId, number>> {
    return new Map(
        ids(g).map((i) => {
            const reached = legacyResult<Map<NodeId, number>>();
            return [i, new Map(ids(g).map((j) => [j, reached.get(j) ?? Infinity]))];
        }),
    );
}

/** The weight of the edge u -> v (either orientation on an undirected graph). */
function weightOf(g: Graph, u: NodeId, v: NodeId): number {
    const edge = g.getEdge(u, v) ?? (g.isDirected ? undefined : g.getEdge(v, u));
    if (edge === undefined) {
        throw new Error(`no edge ${String(u)} -> ${String(v)}`);
    }
    return edge.weight ?? 1;
}

describe("floydWarshall facade", () => {
    it("gives repeated legacy Dijkstra's distances on every fixture", () => {
        // Floyd-Warshall adds d[i][k] + d[k][j] where Dijkstra extends a path one edge at a time, so
        // on f64 weights the two may round the same sum differently in the last bit.
        expectFacadeMatchesLegacy(fixtures, (g) => floydWarshall(g).distances, { tolerance: 1e-12 });
    });

    it("gives each reached pair a predecessor that closes its distance, and null elsewhere", () => {
        for (const { name, graph } of [...fixtures, { name: "negative, no cycle", graph: negativeNoCycle() }]) {
            const { distances, predecessors, hasNegativeCycle } = floydWarshall(graph);
            expect(hasNegativeCycle, name).toBe(false);
            expect([...predecessors.keys()], name).toEqual(ids(graph));
            for (const i of ids(graph)) {
                const row = predecessors.get(i);
                expect(row && [...row.keys()], name).toEqual(ids(graph));
                for (const j of ids(graph)) {
                    const d = distances.get(i)?.get(j);
                    const p = row?.get(j);
                    if (i === j || d === Infinity) {
                        expect(p, `${name}: ${String(i)} -> ${String(j)}`).toBeNull();
                        continue;
                    }
                    expect(p, `${name}: ${String(i)} -> ${String(j)}`).not.toBeNull();
                    const via = (distances.get(i)?.get(p as NodeId) ?? NaN) + weightOf(graph, p as NodeId, j);
                    expect(via, `${name}: ${String(i)} -> ${String(j)}`).toBeCloseTo(d ?? NaN, 12);
                }
            }
        }
    });

    it("finds the path through a negative edge when no cycle exists", () => {
        const g = negativeNoCycle();
        expect(floydWarshall(g).distances.get("a")?.get("d")).toBe(4);
        expect(floydWarshallPath(g, "a", "d")).toEqual({ path: ["a", "c", "b", "d"], distance: 4 });
    });

    it("keeps a node's distance to itself 0 under a positive self-loop", () => {
        const g = new Graph({ directed: true, allowSelfLoops: true });
        g.addEdge("a", "a", 5);
        g.addEdge("a", "b", 1);
        const { distances, predecessors } = floydWarshall(g);
        expect(distances.get("a")?.get("a")).toBe(0);
        expect(predecessors.get("a")?.get("a")).toBe("a");
        expect(floydWarshallPath(g, "a", "a")).toEqual({ path: ["a"], distance: 0 });
    });

    it("reports a negative undirected edge as a negative cycle, every distance NaN", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", -1);
        g.addEdge("b", "c", 2);
        const { distances, predecessors, hasNegativeCycle } = floydWarshall(g);
        expect(hasNegativeCycle).toBe(true);
        for (const row of distances.values()) {
            expect([...row.values()].every(Number.isNaN)).toBe(true);
        }
        for (const row of predecessors.values()) {
            expect([...row.values()].every((p) => p === null)).toBe(true);
        }
        expect(floydWarshallPath(g, "a", "c")).toBeNull();
    });

    it("treats a +Infinity weight as no edge, its source its predecessor while nothing reaches it", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", Infinity);
        g.addEdge("b", "c", 2);
        g.addEdge("c", "a", 1);
        const { distances, predecessors, hasNegativeCycle } = floydWarshall(g);
        expect(hasNegativeCycle).toBe(false);
        expect(distances.get("a")?.get("b")).toBe(Infinity);
        expect(predecessors.get("a")?.get("b")).toBe("a");
        expect(distances.get("b")?.get("a")).toBe(3);
        expect(floydWarshallPath(g, "a", "b")).toBeNull();
        expect(floydWarshallPath(g, "b", "a")).toEqual({ path: ["b", "c", "a"], distance: 3 });
        expect(transitiveClosure(g)).toEqual(
            new Map([
                ["a", new Set(["a"])],
                ["b", new Set(["b", "c", "a"])],
                ["c", new Set(["c", "a"])],
            ]),
        );
    });

    it("treats a +Infinity undirected edge as no edge in both orientations", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", Infinity);
        g.addNode("c");
        const { distances, predecessors } = floydWarshall(g);
        expect(distances.get("a")?.get("b")).toBe(Infinity);
        expect(distances.get("b")?.get("a")).toBe(Infinity);
        expect(predecessors.get("a")?.get("b")).toBe("a");
        expect(predecessors.get("b")?.get("a")).toBe("b");
        expect(predecessors.get("a")?.get("c")).toBeNull();
        expect(transitiveClosure(g).get("b")).toEqual(new Set(["b"]));
    });

    it("throws a RangeError on a NaN or -Infinity weight, which has no shortest-path reading", () => {
        for (const weight of [NaN, -Infinity]) {
            for (const directed of [true, false]) {
                const g = new Graph({ directed });
                g.addEdge("i", "a", 1);
                g.addEdge("a", "b", weight);
                expect(() => floydWarshall(g)).toThrow(RangeError);
                expect(() => floydWarshallPath(g, "i", "b")).toThrow(RangeError);
                expect(() => transitiveClosure(g)).toThrow(RangeError);
            }
        }
    });
});

describe("floydWarshallPath facade", () => {
    it("gives legacy Dijkstra's distance and a path whose weights sum to it, on every connected pair", () => {
        for (const { name, graph } of fixtures) {
            const reference = dijkstraMatrix(graph);
            // every call runs the whole sweep, so the larger fixtures check the rows of six sources
            for (const i of ids(graph).slice(0, 6)) {
                for (const j of ids(graph)) {
                    const expected = reference.get(i)?.get(j) ?? Infinity;
                    const result = floydWarshallPath(graph, i, j);
                    if (expected === Infinity) {
                        expect(result, `${name}: ${String(i)} -> ${String(j)}`).toBeNull();
                        continue;
                    }
                    expect(result?.distance, `${name}: ${String(i)} -> ${String(j)}`).toBeCloseTo(expected, 12);
                    const path = result?.path ?? [];
                    expect(path[0]).toBe(i);
                    expect(path.at(-1)).toBe(j);
                    let sum = 0;
                    for (let k = 1; k < path.length; k++) {
                        sum += weightOf(graph, path[k - 1], path[k]);
                    }
                    expect(sum).toBeCloseTo(expected, 12);
                }
            }
        }
    });

    it("finds nodes by their exact id, so a numeric id given as a string is absent, as before", () => {
        const g = numericWeighted();
        expect(floydWarshallPath(g, 1, 4)?.path).toEqual([1, 2, 3, 4]);
        expect(floydWarshallPath(g, "1", 4)).toBeNull();
        expect(floydWarshallPath(g, 1, 9)).toBeNull();
        expect(floydWarshallPath(g, 1, "missing")).toBeNull();
    });
});

describe("transitiveClosure facade", () => {
    it("gives the nodes repeated legacy Dijkstra reaches, in node order", () => {
        expectFacadeMatchesLegacy(fixtures, transitiveClosure);
    });

    it("reads reachability, not distance: a sum that overflows to Infinity still reaches", () => {
        const g = new Graph({ directed: true, allowSelfLoops: true });
        g.addEdge(0, 1, 1e308);
        g.addEdge(0, 3, 1);
        g.addEdge(3, 0, 1e308);
        g.addEdge(3, 3, Infinity);
        expect(transitiveClosure(g).get(3)).toEqual(new Set([0, 1, 3]));
    });

    it("reads reachability, not distance, under a negative cycle", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "a", -3);
        g.addNode("c");
        expect(transitiveClosure(g)).toEqual(
            new Map([
                ["a", new Set(["a", "b"])],
                ["b", new Set(["a", "b"])],
                ["c", new Set(["c"])],
            ]),
        );
    });
});
