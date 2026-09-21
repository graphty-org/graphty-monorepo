/**
 * The A1 differential harness (graph-format design 14.6 row A1): a legacy `Graph` and the snapshot
 * `toSnapshot` builds from it are compared on every property a snapshot can answer DIRECTLY --
 * the node set, the neighbour sets, the out-degrees, the edge multiset with weights, the self-loop
 * count, and topological determinism. It deliberately does NOT compare algorithm results: no legacy
 * algorithm consumes a snapshot until A2 widens its first parameter.
 */

import { equalsTopology, type GraphSnapshot } from "@graphty/graph-format";
import { expect } from "vitest";

import type { Graph } from "../../src/core/graph.js";
import { toSnapshot } from "../../src/indexed/to-snapshot.js";

function edgeKey(u: string, v: string, weight: number, directed: boolean): string {
    const [a, b] = directed || u <= v ? [u, v] : [v, u];
    // Six significant digits: enough to separate distinct fixture weights, loose enough that an f32
    // arc array and an f64 shadow agree. A weighted port's own tests assert exact equality.
    return `${a}|${b}|${weight.toPrecision(6)}`;
}

/**
 * Assert that `toSnapshot(graph)` reproduces every property of `graph` a snapshot can answer.
 * @param graph - The legacy graph under test
 * @returns The snapshot that was compared, so a caller can make further assertions on it
 */
export function assertSnapshotMatchesGraph(graph: Graph): GraphSnapshot {
    // checksum: true is the design's rule for the differential suite (graph-format-design.md:3776-3781):
    // FNV-1a over the core arrays at freeze, compared again at the end of this function, so a port
    // that wrote into a shared view fails a test instead of corrupting the next call.
    const s = toSnapshot(graph, { checksum: true });

    // ---- 1. shape
    expect(s.directed).toBe(graph.isDirected);
    expect(s.nodeCount).toBe(graph.nodeCount);
    expect(s.edgeCount).toBe(graph.totalEdgeCount);

    // ---- 2. the node set, as a bijection over [0, nodeCount)
    const seen = new Set<string>();
    for (let i = 0; i < s.nodeCount; i++) {
        const id = s.ids.idOf(i);
        expect(graph.hasNode(id)).toBe(true);
        seen.add(String(id));
    }
    expect(seen.size).toBe(graph.nodeCount);

    // ---- 3. the edge multiset, with weights, in id space
    const el = s.edgeList();
    const fromSnapshot: string[] = [];
    for (let e = 0; e < s.edgeCount; e++) {
        const weight = el.weights === null ? 1 : el.weights[e];
        fromSnapshot.push(edgeKey(String(s.ids.idOf(el.src[e])), String(s.ids.idOf(el.dst[e])), weight, s.directed));
    }
    const fromGraph: string[] = [];
    for (const edge of graph.edges()) {
        fromGraph.push(edgeKey(String(edge.source), String(edge.target), edge.weight ?? 1, graph.isDirected));
    }
    expect(fromSnapshot.sort()).toEqual(fromGraph.sort());

    // ---- 4. neighbour sets and out-degrees, per node
    const outDegree = s.outDegree();
    for (let u = 0; u < s.nodeCount; u++) {
        const id = s.ids.idOf(u);
        const [start, end] = s.outArcs(u);
        const fromArcs: string[] = [];
        for (let a = start; a < end; a++) {
            fromArcs.push(String(s.ids.idOf(s.colIdx[a])));
        }
        const fromGraphNeighbours = [...graph.outNeighbors(id)].map((v) => String(v));
        expect(fromArcs.sort()).toEqual(fromGraphNeighbours.sort());
        // outDegree() counts ARCS, and the legacy graph forbids parallel edges by default
        // (`allowParallelEdges: false`, graph.ts:24), so arcs and distinct neighbours coincide.
        expect(outDegree[u]).toBe(fromArcs.length);
    }

    // ---- 5. self-loops. graph-format's degree() follows the NetworkX convention (a self-loop counts
    // twice on an undirected graph, `graph-format/src/types/snapshot.ts:591-593`) while the legacy
    // `Graph.degree` counts a self-loop once (it is one entry in the adjacency Map, graph.ts:310-311).
    // The two are NOT expected to agree; the self-loop COUNT is what both can state.
    let legacySelfLoops = 0;
    for (const edge of graph.edges()) {
        if (edge.source === edge.target) {
            legacySelfLoops++;
        }
    }
    expect(s.selfLoopCount).toBe(legacySelfLoops);

    // ---- 6. arc accounting (invariants I6 and I7)
    expect(s.arcCount).toBe(s.directed ? s.edgeCount : 2 * s.edgeCount - s.selfLoopCount);

    // ---- 7. determinism and memoisation
    expect(toSnapshot(graph)).toBe(s);
    expect(equalsTopology(s, toSnapshot(graph.clone()))).toBe(true);

    // ---- 8. nothing above wrote into the snapshot or into one of its cached views (I17)
    s.validate({ checksum: true });

    return s;
}

/**
 * The same checksummed fixture a port test needs: freeze once, run the port, assert nothing moved.
 * Every `test/unit/indexed/*.test.ts` fixture goes through this rather than through bare
 * `toSnapshot`, so the I17 guard is on by default for the ports too.
 * @param graph - The legacy graph to convert
 * @returns A checksummed snapshot
 */
export function checksummedSnapshot(graph: Graph): GraphSnapshot {
    return toSnapshot(graph, { checksum: true });
}
