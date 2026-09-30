import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { ConvergenceError } from "../../../src/errors.js";
import { eigenvectorCentrality } from "../../../src/indexed/eigenvector.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
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

    it("starts from the given vector, index-aligned", () => {
        const g = grid(4);
        const s = checksummedSnapshot(g);
        const start = new Float64Array(s.nodeCount).fill(1);
        start[0] = 5;
        const ported = eigenvectorCentrality(s, { startVector: start, normalized: false, maxIterations: 1000 });
        const legacy = legacyResult() as CentralityResult;
        for (let u = 0; u < s.nodeCount; u++) {
            expect(ported.scores[u]).toBeCloseTo(legacy[String(s.ids.idOf(u))], 9);
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
                    for (let u = 0; u < s.nodeCount; u++) {
                        expect(Math.abs(ported.scores[u] - legacy[String(s.ids.idOf(u))])).toBeLessThan(1e-9);
                    }
                }
            }
            s.validate({ checksum: true });
        });
    }
});
