import { GraphBuilder } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { dijkstra } from "../../../src/indexed/dijkstra.js";
import { countShortestPaths, timeOrderedPaths } from "../../../src/indexed/shortest-routes.js";

/**
 * A snapshot of nodes 0..n-1 and the listed edges, weighted.
 * @param directed - Whether the edges are directed.
 * @param n - The node count.
 * @param edges - [source, target, weight] triples.
 * @returns The snapshot.
 */
function graph(directed: boolean, n: number, edges: readonly (readonly [number, number, number])[]) {
    const b = new GraphBuilder({ directed, weighted: true });
    for (let i = 0; i < n; i++) {
        b.addNode(i);
    }
    for (const [u, v, w] of edges) {
        b.addEdge(u, v, w);
    }
    return b.freeze({ checksum: true });
}

/**
 * Each arc's time, from its logical edge's time.
 * @param s - The snapshot.
 * @param edgeTimes - One time per edge, in insertion order.
 * @returns arcCount times.
 */
function arcTimes(s: ReturnType<typeof graph>, edgeTimes: readonly number[]): Float64Array<ArrayBuffer> {
    return Float64Array.from(s.arcToEdge, (edge) => edgeTimes[edge]);
}

describe("countShortestPaths", () => {
    it("counts two tied routes through a square and one route past it", () => {
        // 0-1-3 and 0-2-3 both cost 2; 3-4 adds a single step.
        const s = graph(false, 5, [
            [0, 1, 1],
            [0, 2, 1],
            [1, 3, 1],
            [2, 3, 1],
            [3, 4, 1],
        ]);
        const count = countShortestPaths(s, dijkstra(s, 0).dist, 0);
        assert.deepEqual([...count], [1, 1, 1, 2, 2]);
        s.validate({ checksum: true });
    });

    it("counts one route when the tie is broken by weight, and none for an unreached node", () => {
        const s = graph(false, 5, [
            [0, 1, 1],
            [0, 2, 2],
            [1, 3, 1],
            [2, 3, 1],
        ]);
        const count = countShortestPaths(s, dijkstra(s, 0).dist, 0);
        assert.strictEqual(count[3], 1);
        assert.strictEqual(count[4], 0);
    });

    it("follows edge direction on a directed graph", () => {
        // 0->1->3 and 0->2->3, but 2->3 points the other way.
        const s = graph(true, 4, [
            [0, 1, 1],
            [0, 2, 1],
            [1, 3, 1],
            [3, 2, 1],
        ]);
        const count = countShortestPaths(s, dijkstra(s, 0).dist, 0);
        assert.strictEqual(count[3], 1);
    });

    it("counts a node behind a zero-weight cycle as endless ties", () => {
        const s = graph(true, 3, [
            [0, 1, 1],
            [1, 2, 0],
            [2, 1, 0],
        ]);
        const count = countShortestPaths(s, dijkstra(s, 0).dist, 0);
        assert.strictEqual(count[1], Infinity);
        assert.strictEqual(count[0], 1);
    });
});

describe("timeOrderedPaths", () => {
    it("refuses a cheaper route whose edges go back in time", () => {
        // Cheap 0-1-2 leaves at 5 and arrives at 3: out of order. Dear 0-2 direct is the only route.
        const s = graph(true, 3, [
            [0, 1, 1],
            [1, 2, 1],
            [0, 2, 10],
        ]);
        const r = timeOrderedPaths(s, 0, { times: arcTimes(s, [5, 3, 1]) });
        assert.strictEqual(r.dist[2], 10);
        assert.deepEqual([...r.pathTo(2)], [0, 2]);
        assert.deepEqual([...r.pathEdges(2)], [2]);
        // Without the time order the cheap route wins.
        assert.strictEqual(dijkstra(s, 0).dist[2], 2);
        s.validate({ checksum: true });
    });

    it("takes the cheap route when its times are in order, equal times included", () => {
        const s = graph(true, 3, [
            [0, 1, 1],
            [1, 2, 1],
            [0, 2, 10],
        ]);
        const r = timeOrderedPaths(s, 0, { times: arcTimes(s, [3, 3, 1]) });
        assert.strictEqual(r.dist[2], 2);
        assert.deepEqual([...r.pathTo(2)], [0, 1, 2]);
    });

    it("keeps a late, cheap arrival apart from an early, dear one", () => {
        // Node 1 is reached early via 0-1 (cost 5, t=1) or late via 0-3-1 (cost 2, t=8).
        // Leaving 1 to 2 is at t=4, so only the early arrival can continue.
        const s = graph(true, 4, [
            [0, 1, 5],
            [0, 3, 1],
            [3, 1, 1],
            [1, 2, 1],
        ]);
        const r = timeOrderedPaths(s, 0, { times: arcTimes(s, [1, 7, 8, 4]) });
        assert.strictEqual(r.dist[1], 2);
        assert.strictEqual(r.dist[2], 6);
        assert.deepEqual([...r.pathTo(2)], [0, 1, 2]);
    });

    it("never takes an edge with no time, and reports the source and unreached nodes", () => {
        const s = graph(false, 3, [
            [0, 1, 1],
            [1, 2, 1],
        ]);
        const r = timeOrderedPaths(s, 0, { times: arcTimes(s, [1, Number.NaN]) });
        assert.strictEqual(r.dist[0], 0);
        assert.deepEqual([...r.pathTo(0)], [0]);
        assert.strictEqual(r.dist[1], 1);
        assert.strictEqual(r.dist[2], Infinity);
        assert.strictEqual(r.pathTo(2).length, 0);
        assert.strictEqual(r.pathEdges(2).length, 0);
    });
});
