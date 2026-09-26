import { expandEdges, GraphBuilder, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { dijkstra as legacyDijkstra } from "../../../src/algorithms/shortest-path/dijkstra.js";
import { Graph } from "../../../src/core/graph.js";
import { PathWalkError } from "../../../src/errors.js";
import { dijkstra, walkPredArcs, walkPredEdges } from "../../../src/indexed/dijkstra.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

// a = 0, b = 1, c = 2, d = 3 (insertion order, invariant I14); z = 4 when isolated.
function diamond(directed: boolean, withIsolated = false): Graph {
    const g = new Graph({ directed });
    g.addEdge("a", "b", 1);
    g.addEdge("a", "c", 4);
    g.addEdge("b", "d", 1);
    g.addEdge("c", "d", 1);
    if (withIsolated) {
        g.addNode("z");
    }
    return g;
}

describe("indexed.dijkstra", () => {
    it("finds the cheap path through the diamond", () => {
        const s = checksummedSnapshot(diamond(false));
        const r = dijkstra(s, 0);
        expect(r.dist[3]).toBe(2);
        expect([...r.pathTo(3)]).toEqual([0, 1, 3]);
        expect(r.pathEdges(3).length).toBe(2);
        // the edges on the path are a-b and b-d
        const el = s.edgeList();
        const onPath = [...r.pathEdges(3)].map((e) => `${s.ids.idOf(el.src[e])}-${s.ids.idOf(el.dst[e])}`);
        expect(onPath).toEqual(["a-b", "b-d"]);
        s.validate({ checksum: true });
    });

    it("leaves an unreached node at Infinity with empty accessors", () => {
        const s = checksummedSnapshot(diamond(false, true));
        const r = dijkstra(s, 0);
        expect(r.dist[4]).toBe(Infinity);
        expect(r.predArc[4]).toBe(INVALID_INDEX);
        expect(r.pathTo(4).length).toBe(0);
        expect(r.pathEdges(4).length).toBe(0);
        s.validate({ checksum: true });
    });

    it("returns [source] and no edges for the source itself", () => {
        const s = checksummedSnapshot(diamond(true));
        const r = dijkstra(s, 0);
        expect(r.dist[0]).toBe(0);
        expect(r.predArc[0]).toBe(INVALID_INDEX);
        expect([...r.pathTo(0)]).toEqual([0]);
        expect(r.pathEdges(0).length).toBe(0);
        s.validate({ checksum: true });
    });

    it("honours cutoff", () => {
        const s = checksummedSnapshot(diamond(false));
        const r = dijkstra(s, 0, { cutoff: 1.5 });
        expect(r.dist[1]).toBe(1);
        expect(r.dist[3]).toBe(Infinity);
        expect(r.pathTo(3).length).toBe(0);
        s.validate({ checksum: true });
    });

    it("records the exact parallel edge that relaxed the node", () => {
        // The legacy Graph forbids parallel edges, so build through GraphBuilder directly.
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b", 5);
        b.addEdge("a", "b", 1);
        const s = b.freeze({ checksum: true });
        const r = dijkstra(s, 0);
        expect(r.dist[1]).toBe(1);
        const edges = r.pathEdges(1);
        expect(edges.length).toBe(1);
        const el = s.edgeList();
        expect(el.weights).not.toBeNull();
        expect(el.weights?.[edges[0]]).toBe(1);
        s.validate({ checksum: true });
    });

    it("reproduces an f64 total exactly through the weights override", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 0.1);
        g.addEdge("b", "c", 0.2);
        const s = checksummedSnapshot(g);
        const shadow = s.edges.byRole("weight");
        if (shadow === null || shadow.dtype !== "f64") {
            throw new Error("expected an f64 shadow weight column");
        }
        const exact = 0.1 + 0.2;
        const viaF32 = dijkstra(s, 0);
        expect(viaF32.dist[2]).not.toBe(exact);
        expect(viaF32.dist[2]).toBe(Math.fround(0.1) + Math.fround(0.2));
        const viaF64 = dijkstra(s, 0, { weights: expandEdges(s, shadow.data) });
        expect(viaF64.dist[2]).toBe(exact);
        s.validate({ checksum: true });
    });

    it("agrees with the legacy dijkstra on every finite distance", () => {
        for (const directed of [false, true]) {
            const graph = diamond(directed, true);
            graph.addEdge("d", "a", 7);
            graph.addEdge("c", "b", 2);
            const s = checksummedSnapshot(graph);
            const r = dijkstra(s, 0);
            const legacy = legacyDijkstra(graph, "a");
            for (let i = 0; i < s.nodeCount; i++) {
                const expected = legacy.get(s.ids.idOf(i))?.distance;
                if (expected === undefined || !Number.isFinite(expected)) {
                    expect(r.dist[i]).toBe(Infinity);
                } else {
                    expect(Math.abs(r.dist[i] - expected)).toBeLessThanOrEqual(1e-12);
                }
            }
            s.validate({ checksum: true });
        }
    });
});

describe("predecessor walk on a corrupted predArc (an accelerator's result is not trusted)", () => {
    // a -> b -> c -> d: arc 0 is a->b, arc 1 is b->c, arc 2 is c->d.
    function path(): ReturnType<typeof checksummedSnapshot> {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "d");
        return checksummedSnapshot(g);
    }
    const INV = INVALID_INDEX;
    const cases: [string, number[], "cycle" | "gap"][] = [
        // d <- c (arc 2), c <- b (arc 1), b <- c (arc 2 has source c): b and c point at each other
        ["a 2-cycle", [INV, 2, 1, 2], "cycle"],
        ["an INVALID_INDEX before the source", [INV, 0, INV, 2], "gap"],
        ["an arc index past arcCount", [INV, 0, 99, 2], "gap"],
    ];
    for (const [label, pred, reason] of cases) {
        for (const walk of [walkPredArcs, walkPredEdges]) {
            it(`${walk.name} throws PathWalkError on ${label}`, () => {
                const s = path();
                let caught: unknown;
                try {
                    walk(s, Uint32Array.from(pred), 0, 3);
                } catch (e) {
                    caught = e;
                }
                expect(caught).toBeInstanceOf(PathWalkError);
                expect(caught).toMatchObject({ source: 0, target: 3, reason });
            });
        }
    }

    it("still walks a well-formed predArc", () => {
        const s = path();
        const pred = Uint32Array.from([INV, 0, 1, 2]);
        expect([...walkPredArcs(s, pred, 0, 3)]).toEqual([0, 1, 2, 3]);
        expect(walkPredEdges(s, pred, 0, 3)).toHaveLength(3);
    });
});
