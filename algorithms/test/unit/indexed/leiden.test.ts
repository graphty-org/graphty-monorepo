import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { leiden as legacyLeiden } from "../../../src/algorithms/community/leiden.js";
import { calculateModularity } from "../../../src/algorithms/community/modularity-utils.js";
import { Graph } from "../../../src/core/graph.js";
import { connectedComponents } from "../../../src/indexed/components.js";
import { leiden } from "../../../src/indexed/leiden.js";
import { modularity } from "../../../src/indexed/modularity.js";
import type { NodeId } from "../../../src/types/index.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { gnm, undirectedFixtures } from "./port-fixtures.js";

function asMap(s: GraphSnapshot, labels: ArrayLike<number>): Map<NodeId, number> {
    const m = new Map<NodeId, number>();
    for (let u = 0; u < s.nodeCount; u++) {
        m.set(s.ids.idOf(u), labels[u]);
    }
    return m;
}

/** Every community induces a connected subgraph: Leiden's guarantee over Louvain. */
function communitiesConnected(s: GraphSnapshot, groups: readonly Uint32Array[]): boolean {
    for (const group of groups) {
        const sub = s.inducedSubgraph(Uint32Array.from(group)).snapshot;
        if (connectedComponents(sub).count !== 1) {
            return false;
        }
    }
    return true;
}

const SEEDS = [1, 7, 42, 99, 12345];
const MANY_SEEDS = Array.from({ length: 40 }, (_, i) => 7 * i + 1);

describe("indexed.leiden", () => {
    for (const { name, graph } of [
        ...undirectedFixtures(),
        { name: "random 300 nodes, 1200 weighted edges", graph: gnm(300, 1200, false, 31337, true) },
    ]) {
        it(`reaches at least the legacy leiden's modularity, at the default seed and on average, on ${name}`, () => {
            // Both are randomised heuristics with different random streams, so for one seed either
            // can come out ahead; the claim is the default seed and the mean over forty seeds.
            const s = checksummedSnapshot(graph);
            expect(leiden(s).modularity).toBeGreaterThanOrEqual(legacyLeiden(graph).modularity - 1e-12);
            let ported = 0;
            let legacy = 0;
            for (const randomSeed of MANY_SEEDS) {
                const r = leiden(s, { randomSeed });
                ported += r.modularity;
                legacy += legacyLeiden(graph, { randomSeed }).modularity;
                // The reported modularity is the package's own formula applied to the partition.
                expect(r.modularity).toBeCloseTo(calculateModularity(graph, asMap(s, r.labels)), 12);
                expect(communitiesConnected(s, r.groups())).toBe(true);
                s.validate({ checksum: true });
            }
            expect(ported).toBeGreaterThanOrEqual(legacy - 1e-9);
        });
    }

    it("finds the karate club's best-known modularity, 0.4197896, for some seed", () => {
        const graph = undirectedFixtures().find((f) => f.name === "Zachary's karate club")?.graph as Graph;
        const s = checksummedSnapshot(graph);
        const best = Math.max(...SEEDS.map((randomSeed) => leiden(s, { randomSeed }).modularity));
        expect(best).toBeCloseTo(0.4197896120973044, 9);
        s.validate({ checksum: true });
    });

    it("is deterministic per seed", () => {
        const s = checksummedSnapshot(gnm(300, 1200, false, 31337));
        const a = leiden(s, { randomSeed: 5 });
        const b = leiden(s, { randomSeed: 5 });
        expect(b.labels).toEqual(a.labels);
        expect(b.modularity).toBe(a.modularity);
        expect(b.iterations).toBe(a.iterations);
        s.validate({ checksum: true });
    });

    it("splits two disconnected five-cliques and leaves an isolated node alone", () => {
        const g = new Graph({ directed: false });
        for (const p of ["a", "b"]) {
            for (let i = 0; i < 5; i++) {
                for (let j = i + 1; j < 5; j++) {
                    g.addEdge(`${p}${i}`, `${p}${j}`);
                }
            }
        }
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = leiden(s);
        expect([...r.labels]).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2]);
        expect(r.count).toBe(3);
        expect(r.modularity).toBeCloseTo(0.5, 12);
        s.validate({ checksum: true });
    });

    it("keeps every node apart at a resolution that makes any merge a loss", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        const s = checksummedSnapshot(g);
        expect(leiden(s, { resolution: 100 }).count).toBe(3);
        expect(leiden(s).count).toBe(1);
        s.validate({ checksum: true });
    });

    it("follows the exact f64 weights the snapshot keeps", () => {
        // A four-cycle whose weights alternate 1 and 1 + 1e-9: the heavier pair of edges wins by a
        // margin an f32 weight array would round away.
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1 + 1e-9);
        g.addEdge("b", "c", 1);
        g.addEdge("c", "d", 1 + 1e-9);
        g.addEdge("d", "a", 1);
        const s = checksummedSnapshot(g);
        const r = leiden(s);
        expect([...r.labels]).toEqual([0, 0, 1, 1]);
        expect(r.modularity).toBeCloseTo(calculateModularity(g, asMap(s, r.labels)), 15);
        s.validate({ checksum: true });
    });

    it("counts a self-loop twice in a node's degree, as weightedDegree() does", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        b.addEdge("c", "a");
        b.addEdge("a", "a");
        const s = b.freeze({ checksum: true });
        const r = leiden(s);
        // Degrees a = 4, b = c = 2, 2m = 8. The loop counted once would make {a} alone score below
        // the whole triangle; counted twice, {a} | {b, c} and the whole triangle both score 0.
        expect(r.modularity).toBeCloseTo(0, 15);
        expect(r.modularity).toBeCloseTo(modularity(s, r.labels), 15);
        s.validate({ checksum: true });
    });

    it("sums parallel edges as weight", () => {
        const b = new GraphBuilder({ directed: false });
        // Two triangles joined by one edge; the joining pair doubled three times still loses.
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["d", "e"],
            ["e", "f"],
            ["f", "d"],
        ]) {
            b.addEdge(u, v);
        }
        b.addEdge("a", "d");
        const s = b.freeze({ checksum: true });
        expect([...leiden(s).labels]).toEqual([0, 0, 0, 1, 1, 1]);
        s.validate({ checksum: true });
    });

    it("answers an empty and an edgeless snapshot with singletons and modularity 0", () => {
        const empty = new GraphBuilder({ directed: false }).freeze({ checksum: true });
        expect(leiden(empty).count).toBe(0);
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c"]) {
            b.addNode(id);
        }
        const s = b.freeze({ checksum: true });
        const r = leiden(s);
        expect([...r.labels]).toEqual([0, 1, 2]);
        expect(r.modularity).toBe(0);
        expect(r.iterations).toBe(0);
        s.validate({ checksum: true });
    });

    it("rejects a directed snapshot, a fractional seed and a negative weight", () => {
        const directed = new GraphBuilder({ directed: true });
        directed.addEdge("a", "b");
        expect(() => leiden(directed.freeze())).toThrow("requires an undirected graph");
        const s = checksummedSnapshot(gnm(10, 20, false, 3));
        expect(() => leiden(s, { randomSeed: 0.5 })).toThrow(RangeError);
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", -1);
        expect(() => leiden(checksummedSnapshot(g))).toThrow(RangeError);
        s.validate({ checksum: true });
    });
});
