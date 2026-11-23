import assert from "node:assert";

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { spectral } from "../src";

// Past V8's argument limit, spreading a node-sized array into Math.max threw RangeError (issue #7032).
const N = 500_000;

describe("spectral on a large graph", () => {
    it("lays out a graph larger than V8's argument limit", () => {
        // disjoint edges: a large graph whose Laplacian's eigenvectors the solver finds in a few steps
        const src = Uint32Array.from({ length: N / 2 }, (_, i) => 2 * i);
        const dst = Uint32Array.from({ length: N / 2 }, (_, i) => 2 * i + 1);
        const r = spectral(fromEdgeArrays({ directed: false, nodeCount: N, src, dst }), { seed: 1 });
        assert.strictEqual(r.positions.length, 2 * N);
        assert.ok(r.positions.every(Number.isFinite));
    });
});
