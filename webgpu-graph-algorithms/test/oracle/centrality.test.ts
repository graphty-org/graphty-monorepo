/**
 * The Brandes reference checks ITSELF against answers computable by hand before it judges a kernel: the path
 * (`i (n - 1 - i)` at index i, edge (i, i + 1) at `(i + 1)(n - 1 - i)`), the star (the hub `L (L - 1) / 2`, every
 * leaf 0), the complete graph (0 everywhere), the cycle (one value everywhere), a disconnected graph (a two-node
 * component scores 0), Brandes' incident-edge identity on connected graphs, and the per-source sigma of the layered
 * fixture. It also measures the f32-against-f64 spread of the reference on randomEdges(2000, 8000, 7), the noise
 * floor the betweenness tolerance of 1e-4 (design 9.7) rests on. No device is acquired.
 */

import { arcPairGap, edgeConvention, scoreError, vertexConvention } from "../helpers/centrality-check.js";
import {
    completeEdges,
    cycleEdges,
    layeredEdges,
    pathEdges,
    randomEdges,
    snapshotOf,
    starEdges,
} from "../helpers/graphs.js";
import { brandesOracle } from "./betweenness.js";

describe("brandesOracle (design 11.3)", () => {
    it("the path: vertex i scores i (n - 1 - i), edge (i, i + 1) scores (i + 1)(n - 1 - i); the arcs of an edge agree", () => {
        const n = 9;
        const s = snapshotOf(pathEdges(n));
        const raw = brandesOracle(s);
        expect(Array.from(vertexConvention(s, raw.vertex))).toEqual(
            Array.from({ length: n }, (_, i) => i * (n - 1 - i)),
        );
        expect(Array.from(edgeConvention(s, raw.perArc))).toEqual(
            Array.from({ length: n - 1 }, (_, i) => (i + 1) * (n - 1 - i)),
        );
        expect(arcPairGap(s, raw.perArc)).toBe(0);
    });

    it("the three-node path: each edge scores 2 and vertex 1 scores 1 (a halved edge path would publish 1)", () => {
        const s = snapshotOf(pathEdges(3));
        const raw = brandesOracle(s);
        expect(Array.from(edgeConvention(s, raw.perArc))).toEqual([2, 2]);
        expect(Array.from(vertexConvention(s, raw.vertex))).toEqual([0, 1, 0]);
    });

    it("the star, the complete graph and the cycle", () => {
        const leaves = 12;
        const star = snapshotOf(starEdges(leaves));
        const starScores = vertexConvention(star, brandesOracle(star).vertex);
        expect(starScores[0]).toBe((leaves * (leaves - 1)) / 2);
        expect(Array.from(starScores.slice(1))).toEqual(new Array<number>(leaves).fill(0));
        const complete = snapshotOf(completeEdges(10));
        expect(Array.from(brandesOracle(complete).vertex)).toEqual(new Array<number>(10).fill(0));
        const cycle = snapshotOf(cycleEdges(11));
        const cycleScores = brandesOracle(cycle).vertex;
        expect(new Set(cycleScores).size).toBe(1);
    });

    it("a disconnected graph: a two-node component scores 0, the path beside it keeps its closed form", () => {
        const s = snapshotOf([...pathEdges(5), [5, 6]]);
        expect(Array.from(vertexConvention(s, brandesOracle(s).vertex))).toEqual([0, 3, 4, 3, 0, 0, 0]);
    });

    it("Brandes' incident-edge identity on connected undirected graphs: the edges at v sum to 2 x score(v) + (n - 1)", () => {
        for (const edges of [pathEdges(7), cycleEdges(9), completeEdges(6)]) {
            const s = snapshotOf(edges);
            const raw = brandesOracle(s);
            const vertex = vertexConvention(s, raw.vertex);
            const edge = edgeConvention(s, raw.perArc);
            const incident = new Float64Array(s.nodeCount);
            for (let e = 0; e < s.edgeCount; e++) {
                const a = s.edgeToArc[e];
                const u = s.colIdx[a];
                let w = 0;
                while (s.rowPtr[w + 1] <= a) {
                    w++;
                }
                incident[u] += edge[e];
                incident[w] += edge[e];
            }
            for (let v = 0; v < s.nodeCount; v++) {
                expect(incident[v]).toBeCloseTo(2 * vertex[v] + (s.nodeCount - 1), 9);
            }
        }
    });

    it("the layered fixture: the last group is reached by width^(layers - 2) shortest paths", () => {
        const s = snapshotOf(layeredEdges(4, 10), { directed: true });
        const { perSource } = brandesOracle(s, { sources: [0] });
        expect(perSource[0].sigma[s.nodeCount - 1]).toBe(4 ** 8);
        expect(perSource[0].depth[s.nodeCount - 1]).toBe(9);
    });

    it("the f32 reference differs from the f64 one on randomEdges(2000, 8000, 7) by less than 1e-4 (the noise floor of design 9.7)", () => {
        const s = snapshotOf(randomEdges(2000, 8000, 7));
        const f64 = brandesOracle(s);
        const f32 = brandesOracle(s, { precision: "f32" });
        const spread = scoreError(f32.vertex, f64.vertex);
        console.warn(`[noise-floor] brandes f32 vs f64 on randomEdges(2000, 8000, 7): ${spread.toExponential(3)}`);
        expect(spread).toBeGreaterThan(0);
        expect(spread).toBeLessThan(1e-4);
    });
});
