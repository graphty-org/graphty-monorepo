import { describe, expect, it } from "vitest";

import { katzCentrality as legacyKatz } from "../../../src/algorithms/centrality/katz.js";
import { Graph } from "../../../src/core/graph.js";
import { katzCentrality } from "../../../src/indexed/katz.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

describe("indexed.katzCentrality", () => {
    it("gives an undirected four-cycle four equal scores", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "d");
        g.addEdge("d", "a");
        const s = checksummedSnapshot(g);
        const r = katzCentrality(s, { normalized: false, tolerance: 1e-15, maxIterations: 500 });
        expect(r.converged).toBe(true);
        // x = alpha * 2x + beta with alpha 0.1, beta 1: x = 1 / (1 - 0.2) = 1.25.
        for (let u = 0; u < 4; u++) {
            expect(r.scores[u]).toBeCloseTo(1.25, 9);
        }
        s.validate({ checksum: true });
    });

    it("counts INCOMING arcs on a directed graph", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        const s = checksummedSnapshot(g);
        const r = katzCentrality(s, { normalized: false });
        expect(r.scores[0]).toBeCloseTo(1, 12); // nothing points at a
        expect(r.scores[1]).toBeCloseTo(1.1, 12); // 0.1 * a's 1 + 1
        s.validate({ checksum: true });
    });

    it("rescales to [0, 1] by default and leaves a flat graph alone", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        const s = checksummedSnapshot(g);
        const scaled = katzCentrality(s);
        expect(Math.min(...scaled.scores)).toBe(0);
        expect(Math.max(...scaled.scores)).toBe(1);
        const flat = new Graph({ directed: false });
        flat.addEdge("x", "y");
        const flatScores = katzCentrality(checksummedSnapshot(flat)).scores;
        expect(flatScores[0]).toBe(flatScores[1]);
        expect(flatScores[0]).toBeGreaterThan(1);
        s.validate({ checksum: true });
    });

    it("reports the iteration cap it stopped at", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        const s = checksummedSnapshot(g);
        const r = katzCentrality(s, { maxIterations: 2, tolerance: 0 });
        expect(r.iterations).toBe(2);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });

    it("weighted: true scales a neighbour's contribution by the arc weight", () => {
        const g = new Graph({ directed: true });
        g.addEdge("u", "x", 3);
        g.addEdge("v", "y", 1);
        const s = checksummedSnapshot(g);
        const weighted = katzCentrality(s, { weighted: true, normalized: false, maxIterations: 1 });
        // x gains 0.1 * 3 * 1, y gains 0.1 * 1 * 1, over the shared base of beta = 1.
        expect(weighted.scores[1] - 1).toBeCloseTo(3 * (weighted.scores[3] - 1), 12);
        const unweighted = katzCentrality(s, { normalized: false, maxIterations: 1 });
        expect(unweighted.scores[1]).toBeCloseTo(unweighted.scores[3], 12);
        s.validate({ checksum: true });
    });

    for (const { name, graph } of [...undirectedFixtures(), ...directedFixtures()]) {
        it(`agrees with the legacy katzCentrality on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            // Both sides run the same loop -- alpha * sum(neighbour scores) + beta, stopped by the
            // largest single-node change -- so they differ only in the order the neighbours are summed
            // in: the legacy side walks an insertion-ordered Map, the port walks a row sorted by node
            // index. That is a floating-point difference, not an algorithmic one.
            for (const options of [{}, { alpha: 0.05, beta: 0.5, normalized: false }, { maxIterations: 3 }]) {
                const ported = katzCentrality(s, options);
                const legacy = legacyKatz(graph, options);
                for (let u = 0; u < s.nodeCount; u++) {
                    expect(ported.scores[u]).toBeCloseTo(legacy[String(s.ids.idOf(u))], 9);
                }
            }
            s.validate({ checksum: true });
        });
    }
});
