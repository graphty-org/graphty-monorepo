/**
 * The P11 references check themselves against answers computable by hand (the P11 plan's P11-T2 Step 4), so a bug in
 * a reference is caught before it judges a kernel: the simple symmetric graph of a directed multigraph with
 * self-loops, and triangles on complete graphs, cycles, stars and karate (45 triangles). No device is touched.
 */

import { completeEdges, cycleEdges, KARATE_EDGES, snapshotOf, starEdges } from "../helpers/graphs.js";
import { csrOfArcs, simpleSymmetricOracle } from "./coo.js";
import { triangleOracle } from "./structure.js";

describe("simpleSymmetricOracle and csrOfArcs (pure)", () => {
    it("symmetrises, drops self-loops, merges parallel edges by summing their weights, sorts rows", () => {
        const s = snapshotOf(
            [
                [2, 0, 1.5],
                [0, 2, 2],
                [1, 1, 7],
                [0, 1, 0.25],
            ],
            { directed: true, nodeCount: 4 },
        );
        const csr = simpleSymmetricOracle(s);
        expect(Array.from(csr.rowPtr)).toEqual([0, 2, 3, 4, 4]);
        expect(Array.from(csr.colIdx)).toEqual([1, 2, 0, 0]);
        expect(Array.from(csr.weights ?? [])).toEqual([0.25, 3.5, 0.25, 3.5]);
    });

    it("csrOfArcs keeps arc order inside a row and handles trailing empty rows", () => {
        const csr = csrOfArcs(5, [0, 0, 2], [4, 1, 3], null);
        expect(Array.from(csr.rowPtr)).toEqual([0, 2, 2, 3, 3, 3]);
        expect(Array.from(csr.colIdx)).toEqual([4, 1, 3]);
        expect(csr.weights).toBeNull();
    });
});

describe("triangleOracle (pure)", () => {
    it("complete graphs: (s-1)(s-2)/2 per node, coefficient 1, transitivity 1", () => {
        for (const size of [3, 4, 6, 9]) {
            const r = triangleOracle(simpleSymmetricOracle(snapshotOf(completeEdges(size))));
            expect(Array.from(r.perNode)).toEqual(new Array<number>(size).fill(((size - 1) * (size - 2)) / 2));
            expect(r.total).toBe((size * (size - 1) * (size - 2)) / 6);
            expect(Array.from(r.coefficient)).toEqual(new Array<number>(size).fill(1));
            expect(r.transitivity).toBe(1);
        }
    });

    it("cycles and stars: no triangle, coefficient and transitivity 0", () => {
        for (const edges of [cycleEdges(8), starEdges(12)]) {
            const r = triangleOracle(simpleSymmetricOracle(snapshotOf(edges)));
            expect(r.total).toBe(0);
            expect(r.perNode.every((t) => t === 0)).toBe(true);
            expect(r.coefficient.every((c) => c === 0)).toBe(true);
            expect(r.transitivity).toBe(0);
        }
    });

    it("karate: the published 45 triangles and transitivity 0.2557", () => {
        const r = triangleOracle(simpleSymmetricOracle(snapshotOf(KARATE_EDGES)));
        expect(r.total).toBe(45);
        expect(r.transitivity).toBeCloseTo(0.2557, 4);
        expect(r.perNode[0]).toBe(18);
    });
});
