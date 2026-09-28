import { expandEdges, GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { bellmanFord as legacyBellmanFord } from "../../../src/algorithms/shortest-path/bellman-ford.js";
import { Graph } from "../../../src/core/graph.js";
import { bellmanFord } from "../../../src/indexed/bellman-ford.js";
import { dijkstra } from "../../../src/indexed/dijkstra.js";
import { exactArcWeights } from "../../../src/indexed/facade.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, offGridWeights, undirectedFixtures } from "./port-fixtures.js";

/** Every predecessor arc is tight: it ends at its node and its source's distance plus its weight is the node's. */
function expectTightPredecessors(
    s: GraphSnapshot,
    dist: ArrayLike<number>,
    predArc: Uint32Array,
    w: ArrayLike<number> | null,
): void {
    for (let v = 0; v < s.nodeCount; v++) {
        const arc = predArc[v];
        if (arc === INVALID_INDEX) {
            continue;
        }
        expect(s.colIdx[arc]).toBe(v);
        expect(dist[s.arcSource(arc)] + (w === null ? 1 : w[arc])).toBe(dist[v]);
    }
}

describe("indexed.bellmanFord", () => {
    it("equals legacy Bellman-Ford distances exactly on every fixture", () => {
        for (const { name, graph } of [...undirectedFixtures(), ...directedFixtures()]) {
            for (const g of [graph, offGridWeights(graph)]) {
                const s = checksummedSnapshot(g);
                const weights = exactArcWeights(s);
                expect(weights === undefined, name).toBe(g === graph);
                const source = 0;
                const r = bellmanFord(s, source, { weights });
                const legacy = legacyBellmanFord(g, s.ids.idOf(source));
                expect(r.hasNegativeCycle, name).toBe(false);
                expect(legacy.hasNegativeCycle, name).toBe(false);
                for (let i = 0; i < s.nodeCount; i++) {
                    expect(r.dist[i], `${name} node ${String(s.ids.idOf(i))}`).toBe(
                        legacy.distances.get(s.ids.idOf(i)),
                    );
                }
                expectTightPredecessors(s, r.dist, r.predArc, weights ?? s.weights);
                s.validate({ checksum: true });
            }
        }
    });

    it("needs the override to reproduce an off-grid f64 total", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 0.1);
        g.addEdge("b", "c", 0.2);
        const s = checksummedSnapshot(g);
        expect(bellmanFord(s, 0).dist[2]).toBe(Math.fround(0.1) + Math.fround(0.2));
        expect(bellmanFord(s, 0, { weights: exactArcWeights(s) }).dist[2]).toBe(0.1 + 0.2);
    });

    it("agrees with the SSSP port on non-negative weights", () => {
        for (const { name, graph } of directedFixtures()) {
            const s = checksummedSnapshot(graph);
            const r = bellmanFord(s, 1);
            expect(Array.from(r.dist), name).toEqual(Array.from(dijkstra(s, 1).dist));
        }
    });

    it("takes a negative arc on a directed graph", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 4);
        g.addEdge("a", "c", 1);
        g.addEdge("b", "d", -3);
        g.addEdge("c", "d", 2);
        const s = checksummedSnapshot(g);
        const r = bellmanFord(s, 0);
        expect(r.hasNegativeCycle).toBe(false);
        expect(r.dist[s.ids.requireIndex("d")]).toBe(1);
        expect(Array.from(r.pathTo(s.ids.requireIndex("d")), (i) => s.ids.idOf(i))).toEqual(["a", "b", "d"]);
        expect(r.pathEdges(s.ids.requireIndex("d")).length).toBe(2);
    });

    it("relaxes an undirected edge both ways", () => {
        // c is reachable from a only by crossing b-c against its declared orientation.
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 2);
        g.addEdge("c", "b", 3);
        const s = checksummedSnapshot(g);
        const r = bellmanFord(s, s.ids.requireIndex("a"));
        expect(r.dist[s.ids.requireIndex("c")]).toBe(5);
        expect(legacyBellmanFord(g, "a").distances.get("c")).toBe(5);
    });

    it("reports a negative cycle as legacy does, directed and undirected", () => {
        const directed = new Graph({ directed: true });
        directed.addEdge("a", "b", 1);
        directed.addEdge("b", "c", -2);
        directed.addEdge("c", "b", 1);
        // one negative undirected edge is a negative cycle: it can be crossed back and forth
        const undirected = new Graph({ directed: false });
        undirected.addEdge("a", "b", 1);
        undirected.addEdge("b", "c", -1);
        for (const g of [directed, undirected]) {
            const s = checksummedSnapshot(g);
            expect(bellmanFord(s, 0).hasNegativeCycle).toBe(true);
            expect(legacyBellmanFord(g, "a").hasNegativeCycle).toBe(true);
        }
    });

    it("does not report a negative cycle the source cannot reach", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("c", "d", -2);
        g.addEdge("d", "c", 1);
        const s = checksummedSnapshot(g);
        const r = bellmanFord(s, 0);
        expect(r.hasNegativeCycle).toBe(false);
        expect(legacyBellmanFord(g, "a").hasNegativeCycle).toBe(false);
        expect(r.dist[s.ids.requireIndex("c")]).toBe(Infinity);
    });

    it("leaves an unreachable node at Infinity with empty path accessors", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = bellmanFord(s, 0);
        const z = s.ids.requireIndex("z");
        expect(r.dist[z]).toBe(Infinity);
        expect(r.predArc[z]).toBe(INVALID_INDEX);
        expect(r.pathTo(z).length).toBe(0);
        expect(r.pathEdges(z).length).toBe(0);
        expect(Array.from(r.pathTo(0))).toEqual([0]);
    });

    it("resolves a parallel edge to the exact cheaper edge", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b", 5);
        b.addEdge("a", "b", -1);
        b.addEdge("a", "b", 3);
        const s = b.freeze({ checksum: true });
        const r = bellmanFord(s, 0);
        expect(r.dist[1]).toBe(-1);
        const [edge] = r.pathEdges(1);
        expect(edge).toBe(1);
        // an override that makes the third edge the cheapest moves the path to it
        const r2 = bellmanFord(s, 0, { weights: expandEdges(s, Float64Array.of(5, 2, -4)) });
        expect(r2.dist[1]).toBe(-4);
        expect(Array.from(r2.pathEdges(1))).toEqual([2]);
        s.validate({ checksum: true });
    });

    it("honours cutoff", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 1);
        const s = checksummedSnapshot(g);
        const r = bellmanFord(s, 0, { cutoff: 1 });
        expect(Array.from(r.dist)).toEqual([0, 1, Infinity]);
    });

    it("runs all nodeCount - 1 rounds before deciding there is a negative cycle", () => {
        // A path from the highest index down to 0: the ascending scan moves it one node per round.
        const n = 12;
        const b = new GraphBuilder({ directed: true });
        for (let i = 0; i < n; i++) {
            b.addNode(`v${String(i)}`);
        }
        for (let i = n - 1; i > 0; i--) {
            b.addEdgeByIndex(i, i - 1, 1);
        }
        const r = bellmanFord(b.freeze(), n - 1);
        expect(r.hasNegativeCycle).toBe(false);
        expect(r.dist[0]).toBe(n - 1);
    });

    it("handles a single isolated node", () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("only");
        const r = bellmanFord(b.freeze(), 0);
        expect(Array.from(r.dist)).toEqual([0]);
        expect(r.hasNegativeCycle).toBe(false);
    });
});
