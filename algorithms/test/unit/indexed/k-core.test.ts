import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { kCoreDecomposition } from "../../../src/indexed/k-core.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { undirectedFixtures } from "./port-fixtures.js";

function clique(size: number): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
            g.addEdge(`k${i}`, `k${j}`);
        }
    }
    return g;
}

describe("indexed.kCoreDecomposition", () => {
    it("throws on a directed snapshot", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        const s = checksummedSnapshot(g);
        expect(() => kCoreDecomposition(s)).toThrow("requires an undirected graph");
        s.validate({ checksum: true });
    });

    it("gives every node of a four-clique coreness 3", () => {
        const s = checksummedSnapshot(clique(4));
        const r = kCoreDecomposition(s);
        expect([...r.coreness]).toEqual([3, 3, 3, 3]);
        expect(r.maxCore).toBe(3);
        s.validate({ checksum: true });
    });

    it("gives a path coreness 1 and an isolated node coreness 0", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = kCoreDecomposition(s);
        expect([...r.coreness]).toEqual([1, 1, 1, 0]);
        expect(r.maxCore).toBe(1);
        s.validate({ checksum: true });
    });

    it("peels a triangle with a pendant node down to the triangle", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        g.addEdge("a", "tail");
        const s = checksummedSnapshot(g);
        const r = kCoreDecomposition(s);
        expect([...r.coreness]).toEqual([2, 2, 2, 1]);
        expect([...r.cores()[2]]).toEqual([0, 1, 2]);
        expect([...r.cores()[1]]).toEqual([3]);
        expect([...r.cores()[0]]).toEqual([]);
        s.validate({ checksum: true });
    });

    it("caches cores(), one entry per core number", () => {
        const s = checksummedSnapshot(clique(3));
        const r = kCoreDecomposition(s);
        expect(r.cores()).toBe(r.cores());
        expect(r.cores().length).toBe(r.maxCore + 1);
        s.validate({ checksum: true });
    });

    it("counts a parallel edge once and a self-loop not at all", () => {
        // Neither can be built through the legacy Graph, which forbids parallel edges and would count
        // a self-loop as a neighbour; a core number is defined on the simple graph underneath.
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c"]) {
            b.addNode(id);
        }
        b.addEdge("a", "b");
        b.addEdge("a", "b"); // parallel
        b.addEdge("b", "c");
        b.addEdge("c", "a");
        b.addEdge("a", "a"); // self-loop
        const s = b.freeze({ label: "multigraph", checksum: true });
        expect(s.flags.multigraph).toBe(true);
        const r = kCoreDecomposition(s);
        expect([...r.coreness]).toEqual([2, 2, 2]);
        s.validate({ checksum: true });
    });

    it("returns an empty decomposition for an empty graph", () => {
        const s = new GraphBuilder({ directed: false }).freeze({ label: "empty" });
        const r = kCoreDecomposition(s);
        expect(r.coreness.length).toBe(0);
        expect(r.maxCore).toBe(0);
    });

    for (const { name, graph } of undirectedFixtures()) {
        it(`agrees with the legacy kCoreDecomposition on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            const ported = kCoreDecomposition(s);
            const legacy = legacyResult() as KCoreResult<string>;
            expect(ported.maxCore).toBe(legacy.maxCore);
            for (let u = 0; u < s.nodeCount; u++) {
                expect(ported.coreness[u]).toBe(legacy.coreness.get(String(s.ids.idOf(u))));
            }
            s.validate({ checksum: true });
        });
    }
});
