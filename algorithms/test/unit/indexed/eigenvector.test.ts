import { GraphBuilder, type U32 } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { ConvergenceError } from "../../../src/errors.js";
import { eigenvectorCentrality } from "../../../src/indexed/eigenvector.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { CentralityResult } from "../../helpers/legacy-types.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

function grid(size: number): Graph {
    const g = new Graph({ directed: false });
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (col < size - 1) {
                g.addEdge(`${row},${col}`, `${row},${col + 1}`);
            }
            if (row < size - 1) {
                g.addEdge(`${row},${col}`, `${row + 1},${col}`);
            }
        }
    }
    return g;
}

describe("indexed.eigenvectorCentrality", () => {
    it("returns an empty vector for the empty graph", () => {
        const r = eigenvectorCentrality(checksummedSnapshot(new Graph()));
        expect(r.scores.length).toBe(0);
        expect(r.converged).toBe(true);
    });

    it("scores every node 0 on a directed acyclic graph, with no iteration run", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        const s = checksummedSnapshot(g);
        const r = eigenvectorCentrality(s);
        expect([...r.scores]).toEqual([0, 0, 0]);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(true);
        s.validate({ checksum: true });
    });

    it("converges on a bipartite graph, where unshifted power iteration oscillates", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "d");
        const s = checksummedSnapshot(g);
        const r = eigenvectorCentrality(s, { normalized: false });
        expect(r.converged).toBe(true);
        expect(r.scores[1]).toBeGreaterThan(r.scores[0]);
        expect(r.scores[1]).toBeCloseTo(r.scores[2], 6);
        s.validate({ checksum: true });
    });

    it("counts a parallel edge once, as the legacy neighbour set does", () => {
        const plain = new GraphBuilder({ directed: false });
        plain.addEdge("a", "b");
        plain.addEdge("b", "c");
        const multi = new GraphBuilder({ directed: false });
        multi.addEdge("a", "b");
        multi.addEdge("a", "b");
        multi.addEdge("b", "c");
        const multiSnapshot = multi.freeze();
        expect(multiSnapshot.flags.multigraph).toBe(true);
        const once = eigenvectorCentrality(plain.freeze(), { normalized: false });
        const twice = eigenvectorCentrality(multiSnapshot, { normalized: false });
        for (let u = 0; u < 3; u++) {
            expect(twice.scores[u]).toBeCloseTo(once.scores[u], 12);
        }
    });

    it("throws ConvergenceError when the cap is reached before the tolerance, as legacy does", () => {
        const g = grid(30);
        const s = checksummedSnapshot(g);
        let ported: unknown;
        try {
            eigenvectorCentrality(s, { maxIterations: 20 });
        } catch (error) {
            ported = error;
        }
        let legacy: unknown;
        try {
            legacyResult() as CentralityResult;
        } catch (error) {
            legacy = error;
        }
        expect(ported).toBeInstanceOf(ConvergenceError);
        expect(legacy).toBeInstanceOf(ConvergenceError);
        expect((ported as ConvergenceError).message).toBe((legacy as ConvergenceError).message);
        expect((ported as ConvergenceError).iterations).toBe(20);
        expect(() => eigenvectorCentrality(s)).toThrow(ConvergenceError);
        expect(() => legacyResult() as CentralityResult).toThrow(ConvergenceError);
        expect(eigenvectorCentrality(s, { maxIterations: 1000 }).converged).toBe(true);
        s.validate({ checksum: true });
    });

    /**
     * An undirected snapshot over anonymous nodes from index pairs.
     * @param n - The node count
     * @param src - Source indices
     * @param dst - Target indices
     * @returns The frozen snapshot
     */
    function indexGraph(n: number, src: U32, dst: U32): ReturnType<GraphBuilder["freeze"]> {
        const b = new GraphBuilder({ directed: false });
        b.addAnonymousNodes(n);
        b.addEdges(src, dst);
        return b.freeze();
    }

    it("leaves a small relative error on a 100,000-node graph at the default tolerance", () => {
        // A seeded random graph with 5n arcs: the stop that scaled with n left 1.4e-3 summed and 1.6e-2 at the worst node.
        const n = 100_000;
        const m = (5 * n) / 2;
        // mulberry32, seeded
        let seed = 1;
        const next = (): number => {
            seed = (seed + 0x6d2b79f5) >>> 0;
            let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4_294_967_296) * n);
        };
        const src = new Uint32Array(m);
        const dst = new Uint32Array(m);
        for (let e = 0; e < m; e++) {
            src[e] = next();
            dst[e] = next();
        }
        const s = indexGraph(n, src, dst);
        const loose = eigenvectorCentrality(s, { normalized: false, maxIterations: 1000 });
        const exact = eigenvectorCentrality(s, { normalized: false, maxIterations: 10_000, tolerance: 1e-13 });
        let error = 0;
        let size = 0;
        let worst = 0;
        for (let v = 0; v < n; v++) {
            const d = Math.abs(loose.scores[v] - exact.scores[v]);
            error += d;
            size += exact.scores[v];
            if (exact.scores[v] > 1e-9) {
                worst = Math.max(worst, d / exact.scores[v]);
            }
        }
        expect(error / size).toBeLessThan(2e-5);
        expect(worst).toBeLessThan(1e-3);
    });

    it("converges on a 50,000-node star well inside graphty-element's 1,000-pass cap", () => {
        const n = 50_000;
        const src = new Uint32Array(n - 1);
        const dst = Uint32Array.from({ length: n - 1 }, (_, i) => i + 1);
        const r = eigenvectorCentrality(indexGraph(n, src, dst), { normalized: false, maxIterations: 1000 });
        expect(r.iterations).toBeLessThan(50);
        // The hub holds half the weight of the unit vector, every leaf an equal share of the rest.
        expect(r.scores[0]).toBeCloseTo(Math.SQRT1_2, 6);
        expect(r.scores[1] * Math.sqrt(2 * (n - 1))).toBeCloseTo(1, 5);
    });

    it("stops at the pass webgpu-graph-algorithms stops at on the device (karate 29, a 10 x 10 grid 83)", () => {
        // webgpu-graph-algorithms' spectral test pins the same two counts against its f64 oracle and the device.
        const karate = undirectedFixtures().find(({ name }) => name === "Zachary's karate club");
        expect(eigenvectorCentrality(checksummedSnapshot(karate?.graph ?? new Graph())).iterations).toBe(29);
        expect(eigenvectorCentrality(checksummedSnapshot(grid(10))).iterations).toBe(83);
    });

    it("starts from the given vector, index-aligned", () => {
        const g = grid(4);
        const s = checksummedSnapshot(g);
        const start = new Float64Array(s.nodeCount).fill(1);
        start[0] = 5;
        const ported = eigenvectorCentrality(s, { startVector: start, normalized: false, maxIterations: 1000 });
        const legacy = legacyResult() as CentralityResult;
        for (let u = 0; u < s.nodeCount; u++) {
            // The legacy run stopped at a summed change below n * tolerance, so it is only that close.
            expect(ported.scores[u]).toBeCloseTo(legacy[String(s.ids.idOf(u))], 5);
        }
    });

    it("refuses a start vector of the wrong length", () => {
        const s = checksummedSnapshot(grid(3));
        expect(() => eigenvectorCentrality(s, { startVector: new Float64Array(2) })).toThrow(/startVector/);
    });

    const modes = [undefined, "in", "out", "total"] as const;
    for (const { name, graph } of [...undirectedFixtures(), ...directedFixtures()]) {
        it(`agrees with the legacy eigenvectorCentrality on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            for (const mode of modes) {
                for (const normalized of [true, false]) {
                    const options = { mode, normalized, maxIterations: 2000 };
                    let legacy: Record<string, number> | ConvergenceError;
                    try {
                        legacy = legacyResult() as CentralityResult;
                    } catch (error) {
                        legacy = error as ConvergenceError;
                    }
                    if (legacy instanceof ConvergenceError) {
                        expect(() => eigenvectorCentrality(s, options)).toThrow(ConvergenceError);
                        continue;
                    }
                    const ported = eigenvectorCentrality(s, options);
                    expect(ported.converged).toBe(true);
                    // The legacy run stopped once its summed change fell below n * 1e-6, so it is only that close
                    // to the eigenvector the port now reaches.
                    for (let u = 0; u < s.nodeCount; u++) {
                        expect(Math.abs(ported.scores[u] - legacy[String(s.ids.idOf(u))])).toBeLessThan(1e-4);
                    }
                }
            }
            s.validate({ checksum: true });
        });
    }
});
