import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { labelPropagation } from "../../../src/indexed/label-propagation.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

function twoTrianglesAndAnIsolatedNode(): GraphSnapshot {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    g.addEdge("d", "e");
    g.addEdge("e", "f");
    g.addEdge("f", "d");
    g.addNode("z");
    return checksummedSnapshot(g);
}

function edgeless(n: number): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    for (let i = 0; i < n; i++) {
        b.addNode(`n${i}`);
    }
    return b.freeze({ checksum: true });
}

describe("indexed.labelPropagation: options and trivial results", () => {
    it("returns an empty partition on an empty snapshot", () => {
        const s = new GraphBuilder({ directed: false }).freeze({ checksum: true });
        const r = labelPropagation(s);
        expect(r.count).toBe(0);
        expect(r.labels.length).toBe(0);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(true);
        expect(r.groups()).toEqual([]);
        s.validate({ checksum: true });
    });

    it("returns the identity labelling, not converged, when maxIterations is 0", () => {
        const s = twoTrianglesAndAnIsolatedNode();
        const r = labelPropagation(s, { maxIterations: 0 });
        expect([...r.labels]).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(r.count).toBe(7);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });

    it("reports the identity as converged at maxIterations 0 when no node has a voting neighbour", () => {
        const s = edgeless(5);
        expect(labelPropagation(s, { maxIterations: 0 }).converged).toBe(true);
        s.validate({ checksum: true });

        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 0);
        b.addEdge("b", "c", 0);
        const zero = b.freeze({ checksum: true });
        const r = labelPropagation(zero, { maxIterations: 0 });
        expect(r.converged).toBe(true);
        expect(r.count).toBe(3);
        zero.validate({ checksum: true });
    });

    it("rejects a maxIterations that is negative, fractional or NaN, or a cap above 2^53 - 1 visits", () => {
        const s = twoTrianglesAndAnIsolatedNode();
        for (const maxIterations of [-1, 1.5, NaN]) {
            expect(() => labelPropagation(s, { maxIterations })).toThrow(RangeError);
        }
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        const pair = b.freeze({ checksum: true });
        expect(() => labelPropagation(pair, { maxIterations: 2 ** 53 })).toThrow(RangeError);
        s.validate({ checksum: true });
        pair.validate({ checksum: true });
    });

    it("rejects a randomSeed that is fractional, NaN or infinite", () => {
        const s = twoTrianglesAndAnIsolatedNode();
        for (const randomSeed of [1.5, NaN, Infinity]) {
            expect(() => labelPropagation(s, { randomSeed })).toThrow(RangeError);
        }
        s.validate({ checksum: true });
    });

    it("rejects a negative or an infinite arc weight before doing any work", () => {
        for (const weight of [-1, Infinity]) {
            const b = new GraphBuilder({ directed: false });
            b.addEdge("a", "b", 1);
            b.addEdge("b", "c", weight);
            const s = b.freeze({ checksum: true });
            expect(() => labelPropagation(s)).toThrow(RangeError);
            // weighted: false never reads the weights, so it has nothing to reject
            expect(() => labelPropagation(s, { weighted: false })).not.toThrow();
            s.validate({ checksum: true });
        }
    });

    it("rejects a NaN arc weight", () => {
        // GraphBuilder refuses a NaN weight (E_INVALID_WEIGHT), so no real snapshot carries one;
        // the check still guards snapshots from other producers. Overlay a weight array on a real
        // snapshot to reach it.
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 1);
        const real = b.freeze({ checksum: true });
        const fake = Object.create(real, { weights: { value: new Float32Array([NaN, NaN]) } }) as GraphSnapshot;
        expect(() => labelPropagation(fake)).toThrow(RangeError);
        real.validate({ checksum: true });
    });
});
