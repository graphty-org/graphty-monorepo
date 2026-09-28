import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { allPairsShortestPath } from "../../src/indexed/all-pairs.js";

describe("indexed.allPairsShortestPath in Chromium", () => {
    // The default bound's worst case: 8 n^2 + 4 n^2 bytes = 384 MiB. Edgeless, so the BFS strategy
    // runs and the call is a fill, not a sweep.
    it("allocates the default 5,792-node bound with paths", () => {
        const n = 5792;
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < n; i++) {
            b.addNode(i);
        }
        const s = b.freeze();
        const r = allPairsShortestPath(s, { paths: true });
        expect(r.dist.length).toBe(n * n);
        expect(r.predArc?.length).toBe(n * n);
        expect(r.dist[0]).toBe(0);
        expect(r.dist[1]).toBe(Infinity);
    });
});
