import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { connectedComponents as legacyConnectedComponents } from "../../../src/algorithms/components/connected.js";
import { Graph } from "../../../src/core/graph.js";
import { connectedComponents, weaklyConnectedComponents } from "../../../src/indexed/components.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

/** Two disjoint triangles a-b-c and d-e-f plus the isolated node z. Indices follow insertion order. */
function twoTriangles(directed = false): Graph {
    const g = new Graph({ directed });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    g.addEdge("d", "e");
    g.addEdge("e", "f");
    g.addEdge("f", "d");
    g.addNode("z");
    return g;
}

describe("indexed.connectedComponents", () => {
    it("throws on a directed snapshot, while weaklyConnectedComponents does not", () => {
        const s = checksummedSnapshot(twoTriangles(true));
        expect(() => connectedComponents(s)).toThrow("requires an undirected graph");
        const r = weaklyConnectedComponents(s);
        expect(r.count).toBe(3);
        s.validate({ checksum: true });
    });

    it("finds two triangles and an isolated node", () => {
        const s = checksummedSnapshot(twoTriangles());
        const r = connectedComponents(s);
        expect(r.count).toBe(3);
        expect(r.labels.length).toBe(7);
        expect(r.groups().map((g) => g.length)).toEqual([3, 3, 1]);
        expect([...r.groups()[0]]).toEqual([0, 1, 2]);
        expect([...r.groups()[2]]).toEqual([6]);
        s.validate({ checksum: true });
    });

    it("labels in first-seen order", () => {
        const s = checksummedSnapshot(twoTriangles());
        const r = connectedComponents(s);
        expect(r.labels[0]).toBe(0);
        expect([...r.labels]).toEqual([0, 0, 0, 1, 1, 1, 2]);
        s.validate({ checksum: true });
    });

    it("caches groups()", () => {
        const s = checksummedSnapshot(twoTriangles());
        const r = connectedComponents(s);
        expect(r.groups()).toBe(r.groups());
        s.validate({ checksum: true });
    });

    it("makes every node its own component when there are no arcs", () => {
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c", "d"]) {
            b.addNode(id);
        }
        const s = b.freeze({ label: "isolated", checksum: true });
        expect(s.arcCount).toBe(0);
        const r = connectedComponents(s);
        expect(r.count).toBe(s.nodeCount);
        expect(r.groups().map((g) => g.length)).toEqual([1, 1, 1, 1]);
        s.validate({ checksum: true });
    });

    it("agrees with the legacy connectedComponents as a set of id sets", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("d", "e");
        g.addEdge("f", "f");
        g.addEdge("g", "h");
        g.addEdge("h", "i");
        g.addEdge("i", "g");
        g.addEdge("j", "g");
        g.addNode("k");
        const s = checksummedSnapshot(g);
        const r = connectedComponents(s);
        const key = (ids: readonly string[]): string => [...ids].sort().join(",");
        const ported = r
            .groups()
            .map((group) => key([...group].map((u) => String(s.ids.idOf(u)))))
            .sort();
        const legacy = legacyConnectedComponents(g)
            .map((component) => key(component.map((id) => String(id))))
            .sort();
        expect(ported).toEqual(legacy);
        s.validate({ checksum: true });
    });
});
