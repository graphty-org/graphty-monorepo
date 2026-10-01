/**
 * A correctness test at scale (design section 15.4): 100k nodes and 1M directed edges pushed from
 * typed arrays and frozen yield a valid snapshot. How long that takes is measured by the freeze
 * benchmark (`npm run benchmark`, benchmarks/freeze.bench.ts), not asserted here.
 */

import { describe, expect, it } from "vitest";

import { GraphBuilder } from "../../src/builder/graph-builder.js";

/** A deterministic xorshift generator so the graph is the same on every run. */
function makeRandom(seed: number): () => number {
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        return state / 0x100000000;
    };
}

describe("freeze at scale", () => {
    it("freezes 100k nodes / 1M directed edges pushed from typed arrays", () => {
        const nodeCount = 100_000;
        const edgeCount = 1_000_000;
        const random = makeRandom(12345);
        const src = new Uint32Array(edgeCount);
        const dst = new Uint32Array(edgeCount);
        const weights = new Float32Array(edgeCount);
        for (let e = 0; e < edgeCount; e++) {
            src[e] = Math.floor(random() * nodeCount);
            dst[e] = Math.floor(random() * nodeCount);
            weights[e] = 1 + Math.floor(random() * 10);
        }
        const builder = new GraphBuilder({ directed: true, expectedNodes: nodeCount, expectedEdges: edgeCount });
        builder.addAnonymousNodes(nodeCount);
        builder.addEdges(src, dst, weights);
        const snapshot = builder.freeze();
        expect(snapshot.nodeCount).toBe(nodeCount);
        expect(snapshot.edgeCount).toBe(edgeCount);
        expect(snapshot.arcCount).toBe(edgeCount);
        expect(snapshot.flags.arcToEdgeIsIdentity).toBe(false);
        expect(snapshot.flags.weighted).toBe(true);
        expect(snapshot.arena?.byteLength).toBe(400_128 + 4 * 4_000_000);
        expect(snapshot.ids.kind).toBe("identity");
        snapshot.validate({ level: "full" });
        // a second, undirected freeze of the same edges through the builder path
        const undirected = new GraphBuilder({ directed: false, expectedNodes: nodeCount, expectedEdges: edgeCount });
        undirected.addAnonymousNodes(nodeCount);
        undirected.addEdges(src, dst, weights);
        const u = undirected.freeze();
        expect(u.arcCount).toBe(2 * edgeCount - u.selfLoopCount);
    }, 120_000);
});
