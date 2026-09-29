import { expandEdges, GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { kruskalMST, primMST, type PrimResult } from "../../../src/indexed/mst.js";
import { exactArcWeights } from "../../helpers/facade.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { Edge } from "../../helpers/legacy-types.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { offGridWeights, undirectedFixtures } from "./port-fixtures.js";

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
        const legacy = legacyResult() as MSTResult;
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

/** An edge as an orientation-free key with its weight. */
const pairKey = (a: unknown, b: unknown, w: number): string =>
    `${[String(a), String(b)].sort().join("|")}:${String(w)}`;

function portKeys(s: GraphSnapshot, r: PrimResult, weights: ArrayLike<number> | null): string[] {
    const { src, dst, arc } = s.edgeList();
    return Array.from(r.edges, (e) =>
        pairKey(s.ids.idOf(src[e]), s.ids.idOf(dst[e]), weights === null ? 1 : weights[arc[e]]),
    );
}

const legacyKeys = (edges: Edge[]): string[] => edges.map((e) => pairKey(e.source, e.target, e.weight ?? 1));

/** The node sets of the components, each in index order, ordered by their lowest index. */
function componentsByIndex(s: GraphSnapshot): number[][] {
    const seen = new Uint8Array(s.nodeCount);
    const out: number[][] = [];
    for (let root = 0; root < s.nodeCount; root++) {
        if (seen[root] === 1) {
            continue;
        }
        const members: number[] = [];
        const stack = [root];
        seen[root] = 1;
        while (stack.length > 0) {
            const u = stack.pop() ?? 0;
            members.push(u);
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                if (seen[s.colIdx[a]] === 0) {
                    seen[s.colIdx[a]] = 1;
                    stack.push(s.colIdx[a]);
                }
            }
        }
        out.push(members.sort((x, y) => x - y));
    }
    return out;
}

describe("indexed.primMST", () => {
    const fixtures = undirectedFixtures().flatMap(({ name, graph }) => [
        { name, graph, offGrid: false },
        { name: `${name}, off-grid weights`, graph: offGridWeights(graph), offGrid: true },
    ]);

    it("equals legacy primMST exactly on every connected fixture, and refuses the rest as legacy does", () => {
        for (const { name, graph, offGrid } of fixtures) {
            const s = checksummedSnapshot(graph);
            const weights = exactArcWeights(s);
            expect(weights !== undefined, name).toBe(offGrid);
            let legacy: MSTResult | null = null;
            try {
                legacy = legacyResult() as MSTResult;
            } catch (e) {
                expect((e as Error).message, name).toBe("Graph is not connected");
            }
            if (legacy === null) {
                expect(() => primMST(s, { weights }), name).toThrow("Graph is not connected");
                continue;
            }
            const r = primMST(s, { weights });
            expect(r.edges.length, name).toBe(legacy.edges.length);
            expect(r.totalWeight, name).toBe(legacy.totalWeight);
            if (offGrid) {
                // distinct weights leave one tree, taken in one order
                expect(portKeys(s, r, weights ?? null), name).toEqual(legacyKeys(legacy.edges));
            }
            s.validate({ checksum: true });
        }
    });

    it("spans every component with the forest option, as legacy Prim run per component", () => {
        for (const { name, graph, offGrid } of fixtures) {
            const s = checksummedSnapshot(graph);
            const weights = exactArcWeights(s);
            const r = primMST(s, { weights, forest: true });
            const components = componentsByIndex(s);
            const expected: Edge[] = [];
            let total = 0;
            for (const _component of components) {
                // legacy: primMST on the component's subgraph
                const part = legacyResult() as MSTResult;
                expected.push(...part.edges);
                total += part.totalWeight;
            }
            expect(r.edges.length, name).toBe(s.nodeCount - components.length);
            expect(r.edges.length, name).toBe(expected.length);
            expect(r.totalWeight, name).toBe(total);
            if (offGrid) {
                expect(portKeys(s, r, weights ?? null), name).toEqual(legacyKeys(expected));
            }
            // one root per component, the component's lowest index
            const roots = Array.from(r.predArc.keys()).filter((v) => r.predArc[v] === INVALID_INDEX);
            expect(roots, name).toEqual(components.map((c) => c[0]));
        }
    });

    it("records each tree node's discovery arc as predArc", () => {
        const { graph } = undirectedFixtures()[7];
        const s = checksummedSnapshot(graph);
        const r = primMST(s, { start: 5 });
        expect(r.predArc[5]).toBe(INVALID_INDEX);
        const onTree = new Set(r.edges);
        for (let v = 0; v < s.nodeCount; v++) {
            if (v === 5) {
                continue;
            }
            const arc = r.predArc[v];
            expect(s.colIdx[arc]).toBe(v);
            expect(onTree.has(s.arcToEdge[arc])).toBe(true);
        }
        expect(r.totalWeight).toBe(s.nodeCount - 1);
    });

    it("starts where legacy is told to start", () => {
        const g = offGridWeights(undirectedFixtures()[6].graph);
        const s = checksummedSnapshot(g);
        const weights = exactArcWeights(s);
        const r = primMST(s, { weights, start: 9 });
        const legacy = legacyResult() as MSTResult;
        expect(portKeys(s, r, weights ?? null)).toEqual(legacyKeys(legacy.edges));
        expect(r.totalWeight).toBe(legacy.totalWeight);
    });

    it("takes the exact cheapest parallel edge, and follows the override", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 4);
        b.addEdge("a", "b", 1);
        b.addEdge("b", "c", 2);
        const s = b.freeze({ checksum: true });
        expect(Array.from(primMST(s).edges)).toEqual([1, 2]);
        const r = primMST(s, { weights: expandEdges(s, Float64Array.of(0.5, 3, 2)) });
        expect(Array.from(r.edges)).toEqual([0, 2]);
        expect(r.totalWeight).toBe(2.5);
        s.validate({ checksum: true });
    });

    it("takes the lowest-indexed of equal-weight parallel edges", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 2);
        b.addEdge("a", "b", 2);
        const s = b.freeze();
        expect(Array.from(primMST(s).edges)).toEqual([0]);
        expect(Array.from(primMST(s, { start: 1 }).edges)).toEqual([0]);
    });

    it("refuses a start index outside the graph", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 1);
        b.addNode("z");
        expect(() => primMST(b.freeze(), { start: 99, forest: true })).toThrow(RangeError);
    });

    it("refuses a directed snapshot and returns nothing for an empty one", () => {
        const directed = new GraphBuilder({ directed: true });
        directed.addEdge("a", "b", 1);
        expect(() => primMST(directed.freeze())).toThrow("Prim's algorithm requires an undirected graph");
        const empty = primMST(new GraphBuilder({ directed: false }).freeze());
        expect(empty.edges.length).toBe(0);
        expect(empty.totalWeight).toBe(0);
    });
});
