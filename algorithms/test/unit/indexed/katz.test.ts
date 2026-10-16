import { describe, expect, it } from "vitest";

import { katzCentrality } from "../../../src/indexed/katz.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/**
 * Whether one of the first `max` iterates equals `want` to 1e-9.
 * @param iterate - The scores after a given number of passes
 * @param want - The scores to find
 * @param max - The last pass to try
 * @returns True when some iterate matches
 */
function someIterateMatches(iterate: (passes: number) => ArrayLike<number>, want: number[], max: number): boolean {
    for (let passes = 1; passes <= max; passes++) {
        const got = iterate(passes);
        if (want.every((value, u) => Math.abs(got[u] - value) < 1e-9)) {
            return true;
        }
    }
    return false;
}

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

    it("reads the arc weights by default and scales a neighbour's contribution by them", () => {
        const g = new Graph({ directed: true });
        g.addEdge("u", "x", 3);
        g.addEdge("v", "y", 1);
        const s = checksummedSnapshot(g);
        const weighted = katzCentrality(s, { normalized: false, maxIterations: 1 });
        // x gains 0.1 * 3 * 1, y gains 0.1 * 1 * 1, over the shared base of beta = 1.
        expect(weighted.scores[1] - 1).toBeCloseTo(3 * (weighted.scores[3] - 1), 12);
        expect([...katzCentrality(s, { weighted: true, normalized: false, maxIterations: 1 }).scores]).toEqual([
            ...weighted.scores,
        ]);
        const unweighted = katzCentrality(s, { weighted: false, normalized: false, maxIterations: 1 });
        expect(unweighted.scores[1]).toBeCloseTo(unweighted.scores[3], 12);
        s.validate({ checksum: true });
    });

    for (const { name, graph } of [...undirectedFixtures(), ...directedFixtures()]) {
        it(`agrees with the legacy katzCentrality on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            // Both sides run the same loop -- alpha * sum(neighbour scores) + beta, unweighted -- and differ in
            // the order the neighbours are summed in (a floating-point difference) and in where they stop: the
            // legacy side at the largest single-node change below the tolerance, the port at the summed change
            // below nodeCount * tolerance. So the legacy answer is one of the port's iterates.
            for (const options of [{}, { alpha: 0.05, beta: 0.5, normalized: false }, { maxIterations: 3 }]) {
                const legacy = legacyResult() as CentralityResult;
                const want = Array.from({ length: s.nodeCount }, (_, u) => legacy[String(s.ids.idOf(u))]);
                const iterate = (passes: number): ArrayLike<number> =>
                    katzCentrality(s, { ...options, weighted: false, maxIterations: passes, tolerance: 0 }).scores;
                expect(someIterateMatches(iterate, want, options.maxIterations ?? 100), name).toBe(true);
            }
            s.validate({ checksum: true });
        });
    }
});
