import type { GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { ConvergenceError } from "../../../src/errors.js";
import { katzCentrality, type KatzOptions, type KatzResult } from "../../../src/indexed/katz.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { CentralityResult } from "../../helpers/legacy-types.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/**
 * Katz centrality, or the ConvergenceError it throws.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The result or the error
 */
function katzOrError(s: GraphSnapshot, o: KatzOptions): KatzResult | ConvergenceError {
    try {
        return katzCentrality(s, o);
    } catch (error) {
        if (error instanceof ConvergenceError) {
            return error;
        }
        throw error;
    }
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

    it("throws ConvergenceError at the iteration cap instead of returning the unconverged scores", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        const s = checksummedSnapshot(g);
        expect(() => katzCentrality(s, { maxIterations: 2, tolerance: 1e-12 })).toThrow(ConvergenceError);
        s.validate({ checksum: true });
    });

    it("throws on a graph of spectral radius 10 at the default alpha, and converges below 1 / 10", () => {
        // The complete graph on 11 nodes has spectral radius 10, so alpha 0.1 sits on the divergence bound.
        const g = new Graph({ directed: false });
        for (let u = 0; u < 11; u++) {
            for (let v = u + 1; v < 11; v++) {
                g.addEdge(String(u), String(v));
            }
        }
        const s = checksummedSnapshot(g);
        expect(() => katzCentrality(s)).toThrow(expect.objectContaining({ code: "E_NOT_CONVERGED" }));
        const r = katzCentrality(s, { alpha: 0.05, normalized: false });
        expect(r.converged).toBe(true);
        // x = alpha * 10x + beta: x = 1 / (1 - 0.5) = 2.
        expect(r.scores[0]).toBeCloseTo(2, 5);
    });

    it("refuses an alpha, maxIterations or tolerance out of range with E_BAD_OPTION", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        const s = checksummedSnapshot(g);
        for (const o of [
            { alpha: Number.NaN },
            { alpha: -0.1 },
            { maxIterations: 0 },
            { maxIterations: 1.5 },
            { tolerance: 0 },
            { tolerance: Number.POSITIVE_INFINITY },
            { beta: Number.NaN },
        ]) {
            expect(() => katzCentrality(s, o)).toThrow(expect.objectContaining({ code: "E_BAD_OPTION" }));
        }
    });

    it("weighted: true scales a neighbour's contribution by the arc weight", () => {
        const g = new Graph({ directed: true });
        g.addEdge("u", "x", 3);
        g.addEdge("v", "y", 1);
        const s = checksummedSnapshot(g);
        const weighted = katzCentrality(s, { weighted: true, normalized: false });
        // x gains 0.1 * 3 * 1, y gains 0.1 * 1 * 1, over the shared base of beta = 1.
        expect(weighted.scores[1] - 1).toBeCloseTo(3 * (weighted.scores[3] - 1), 12);
        const unweighted = katzCentrality(s, { normalized: false });
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
            // Where the series does not converge, legacy returned the rescaled diverged vector and the
            // port throws, so only the converged runs are compared.
            for (const options of [{}, { alpha: 0.05, beta: 0.5, normalized: false }]) {
                const ported = katzOrError(s, options);
                const legacy = legacyResult() as CentralityResult;
                const expected = ported instanceof ConvergenceError ? [] : Object.keys(legacy);
                for (const id of expected) {
                    const u = s.ids.indexOf(id);
                    expect((ported as KatzResult).scores[u]).toBeCloseTo(legacy[id], 9);
                }
            }
            // Three passes: legacy returned whatever they reached; the port answers only a graph it
            // converges on by then.
            const capped = katzOrError(s, { maxIterations: 3 });
            expect(capped instanceof ConvergenceError || capped.iterations <= 3).toBe(true);
            s.validate({ checksum: true });
        });
    }
});
