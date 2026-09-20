import { expandEdges } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { kruskalMST as legacyKruskalMST } from "../../../src/algorithms/mst/kruskal.js";
import { Graph } from "../../../src/core/graph.js";
import { kruskalMST } from "../../../src/indexed/mst.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

// a = 0, b = 1, c = 2, d = 3; edges e0 a-b, e1 a-c, e2 b-d, e3 c-d (insertion order, invariant I14).
function diamond(weights: readonly [number, number, number, number] = [1, 4, 1, 1]): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", weights[0]);
    g.addEdge("a", "c", weights[1]);
    g.addEdge("b", "d", weights[2]);
    g.addEdge("c", "d", weights[3]);
    return g;
}

describe("indexed.kruskalMST", () => {
    it("takes the three cheap edges of the weighted diamond", () => {
        const s = checksummedSnapshot(diamond());
        const r = kruskalMST(s);
        expect(r.edges.length).toBe(3);
        expect([...r.edges].sort()).toEqual([0, 2, 3]);
        expect(r.totalWeight).toBe(3);
        s.validate({ checksum: true });
    });

    it("returns a forest on a disconnected input", () => {
        const g = diamond();
        g.addEdge("x", "y", 2);
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = kruskalMST(s);
        const componentCount = 3;
        expect(r.edges.length).toBe(s.nodeCount - componentCount);
        expect(r.totalWeight).toBe(5);
        s.validate({ checksum: true });
    });

    it("breaks equal weights by edge index, deterministically", () => {
        const s = checksummedSnapshot(diamond([1, 1, 1, 1]));
        const first = kruskalMST(s);
        const second = kruskalMST(s);
        expect([...first.edges]).toEqual([0, 1, 2]);
        expect([...second.edges]).toEqual([...first.edges]);
        s.validate({ checksum: true });
    });

    it("honours a per-arc weight override", () => {
        const s = checksummedSnapshot(diamond([1, 1, 1, 1]));
        // Make e0 (a-b) the most expensive edge; the override is per ARC, so expand per-edge keys.
        const perEdge = Float64Array.of(10, 1, 1, 1);
        const r = kruskalMST(s, { weights: expandEdges(s, perEdge) });
        expect([...r.edges]).toEqual([1, 2, 3]);
        expect(r.totalWeight).toBe(3);
        expect([...kruskalMST(s).edges]).toEqual([0, 1, 2]);
        s.validate({ checksum: true });
    });

    it("agrees with the legacy kruskalMST on totalWeight", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 0.3);
        g.addEdge("a", "c", 2.75);
        g.addEdge("b", "c", 1.1);
        g.addEdge("b", "d", 4.2);
        g.addEdge("c", "d", 0.9);
        g.addEdge("c", "e", 3.3);
        g.addEdge("d", "e", 1.7);
        g.addEdge("e", "f", 0.05);
        g.addEdge("d", "f", 2.2);
        const s = checksummedSnapshot(g);
        const legacy = legacyKruskalMST(g);
        // The default path sums the f32 arc weights, so it agrees with the legacy f64 sum only to
        // about 1e-7 on these values. The f64 shadow column toSnapshot keeps (weightDtype: "f64")
        // reaches the port through the per-arc override, and that is what agrees to 1e-12.
        const viaF32 = kruskalMST(s);
        expect(viaF32.edges.length).toBe(legacy.edges.length);
        expect(Math.abs(viaF32.totalWeight - legacy.totalWeight)).toBeLessThan(1e-6);
        const shadow = s.edges.byRole("weight");
        if (shadow === null || shadow.dtype !== "f64") {
            throw new Error("expected an f64 shadow weight column");
        }
        const ported = kruskalMST(s, { weights: expandEdges(s, shadow.data) });
        expect(ported.edges.length).toBe(legacy.edges.length);
        expect([...ported.edges].sort()).toEqual([...viaF32.edges].sort());
        expect(Math.abs(ported.totalWeight - legacy.totalWeight)).toBeLessThan(1e-12);
        s.validate({ checksum: true });
    });
});
