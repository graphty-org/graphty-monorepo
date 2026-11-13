import { describe, expect, it } from "vitest";

import { checkNumber, checkWeights } from "../../../src/errors.js";
import { DeltaPageRank, PriorityDeltaPageRank } from "../../../src/indexed/delta-pagerank.js";
import { girvanNewman } from "../../../src/indexed/girvan-newman.js";
import { hits } from "../../../src/indexed/hits.js";
import { louvain } from "../../../src/indexed/louvain.js";
import { modularity } from "../../../src/indexed/modularity.js";
import { kruskalMST, primMST } from "../../../src/indexed/mst.js";
import { pageRank } from "../../../src/indexed/pagerank.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";

/**
 * A matcher for a thrown error carrying `code`.
 * @param code - The expected code
 * @returns The matcher
 */
function coded(code: string): Error {
    return expect.objectContaining({ code }) as Error;
}

const badOption = coded("E_BAD_OPTION");
const badWeight = coded("E_BAD_WEIGHT");

function triangle(directed: boolean, weight = 1): ReturnType<typeof toSnapshot> {
    const g = new Graph({ directed });
    g.addEdge("a", "b", weight);
    g.addEdge("b", "c", 1);
    g.addEdge("c", "a", 1);
    return toSnapshot(g);
}

describe("checkNumber and checkWeights", () => {
    it("refuse NaN, infinities, out-of-range values and non-integers", () => {
        expect(() => checkNumber("f", "x", Number.NaN, {})).toThrow(badOption);
        expect(() => checkNumber("f", "x", Infinity, {})).toThrow(badOption);
        expect(() => checkNumber("f", "x", 1.5, { integer: true })).toThrow(badOption);
        expect(() => checkNumber("f", "x", 2, { max: 1 })).toThrow(badOption);
        expect(() => checkNumber("f", "x", 0, { above: 0 })).toThrow(badOption);
        expect(() => checkNumber("f", "x", 0.5, { min: 0, max: 1 })).not.toThrow();
        expect(() => checkWeights("f", [1, Number.NaN])).toThrow(badWeight);
        expect(() => checkWeights("f", [1, -1])).toThrow(badWeight);
        expect(() => checkWeights("f", [1, -1], undefined, true)).not.toThrow();
        expect(() => checkWeights("f", [1], 2)).toThrow(badOption);
        expect(() => checkWeights("f", null, 2)).not.toThrow();
    });
});

describe("numeric options and weights are refused with a code", () => {
    it("pageRank: a damping factor outside [0, 1] or NaN, and a NaN weight when weighted", () => {
        const s = triangle(true);
        for (const dampingFactor of [1.5, -0.1, Number.NaN]) {
            expect(() => pageRank(s, { dampingFactor })).toThrow(badOption);
        }
        expect(() => pageRank(s, { tolerance: Number.NaN })).toThrow(badOption);
        expect(() => pageRank(triangle(true, -1), { weighted: true })).toThrow(badWeight);
        expect(pageRank(triangle(true, -1)).converged).toBe(true);
    });

    it("DeltaPageRank and PriorityDeltaPageRank: a NaN damping factor", () => {
        const s = triangle(true);
        expect(() => new DeltaPageRank(s).compute({ dampingFactor: Number.NaN })).toThrow(badOption);
        expect(() => new PriorityDeltaPageRank(s).computeWithPriority({ dampingFactor: 2 })).toThrow(badOption);
    });

    it("DeltaPageRank: ranks that overflow at a large maxIterations throw instead of turning NaN", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        g.addEdge("c", "d"); // d is dangling: its whole score is spread back every round
        const engine = new DeltaPageRank(toSnapshot(g));
        expect(() => engine.compute({ maxIterations: 5000 })).toThrow(badOption);
        const ranks = new DeltaPageRank(toSnapshot(g)).compute();
        expect(ranks.every((x) => Number.isFinite(x))).toBe(true);
    });

    it("hits: a NaN tolerance and a negative weight when weighted", () => {
        expect(() => hits(triangle(true), { tolerance: Number.NaN })).toThrow(badOption);
        expect(() => hits(triangle(true, -1), { weighted: true })).toThrow(badWeight);
    });

    it("louvain: an infinite weight and a NaN resolution", () => {
        expect(() => louvain(triangle(false, Infinity))).toThrow(badWeight);
        expect(() => louvain(triangle(false), { resolution: Number.NaN })).toThrow(badOption);
    });

    it("kruskalMST and primMST: a NaN or infinite weight and an override of the wrong length; negatives are fine", () => {
        const s = triangle(false);
        const nan = { weights: new Float64Array(s.arcCount).fill(Number.NaN) };
        expect(() => kruskalMST(s, nan)).toThrow(badWeight);
        expect(() => primMST(s, nan)).toThrow(badWeight);
        expect(() => kruskalMST(triangle(false, Infinity))).toThrow(badWeight);
        expect(() => kruskalMST(s, { weights: new Float64Array(1) })).toThrow(badOption);
        expect(() => primMST(s, { weights: new Float64Array(1) })).toThrow(badOption);
        expect(kruskalMST(triangle(false, -2)).totalWeight).toBe(-1);
    });

    it("modularity and girvanNewman: a NaN weight and counts that are not integers", () => {
        const s = triangle(false);
        const labels = new Uint32Array(s.nodeCount);
        expect(() => modularity(s, labels, { weights: new Float64Array(s.arcCount).fill(Number.NaN) })).toThrow(
            badWeight,
        );
        expect(() => girvanNewman(s, { maxCommunities: 1.5 })).toThrow(badOption);
        expect(() => girvanNewman(s, { minCommunitySize: 0 })).toThrow(badOption);
        expect(() => girvanNewman(triangle(false, -1))).toThrow(badWeight);
    });
});
