/**
 * Weighted single-source shortest paths at the 1M / 10M tier (spec 11.3; P8-T15 Step 5; the GPU lane only): the
 * benchmark's SSSP row -- `rmatEdges(20, 10)` with one random f32 weight per edge in [0.1, 10) -- from node 0.
 * The near-far queue binds `8 x roundUp(arcCount, 64)` bytes whole (DEP-P8-E: the relax is never windowed), above
 * lavapipe's 128 MiB, which is why the case lives here. `dist` (the dist buffer) is bitwise the f32 oracle's (PD-9),
 * satisfies the triangle inequality on every arc, and `reachedCount` is the oracle's.
 */

import { fromEdgeArrays } from "@graphty/graph-format";

import { rmatEdges } from "../../benchmarks/datasets.js";
import { makeRandom } from "../../benchmarks/harness.js";
import { sssp } from "../../src/algorithms/sssp.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { distBits } from "../helpers/sssp.js";
import { expectTriangleInequality } from "../helpers/traversal-check.js";
import { dijkstraOracle } from "../oracle/traversal.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const RMAT_SCALE = 20;
const RMAT_EDGE_FACTOR = 10;
const SEED = 12345;
const WEIGHT_RANGE: readonly [number, number] = [0.1, 10];

describe("sssp at 1M nodes / 10M edges (node-limits, P8-T15)", () => {
    it("random f32 weights: dist bitwise the f32 oracle's, the triangle inequality, reachedCount", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/sssp-1m" });
        try {
            const e = rmatEdges(RMAT_SCALE, RMAT_EDGE_FACTOR, SEED);
            const random = makeRandom(SEED);
            const weights = new Float32Array(e.src.length);
            for (let i = 0; i < weights.length; i++) {
                weights[i] = WEIGHT_RANGE[0] + random() * (WEIGHT_RANGE[1] - WEIGHT_RANGE[0]);
            }
            const s = fromEdgeArrays(
                { directed: false, nodeCount: e.nodeCount, src: e.src, dst: e.dst, weights },
                { label: "limits/rmat20-weighted" },
            );
            expect(s.flags.allWeightsOne).toBe(false);
            expect(8 * s.arcCount, "the near-far queue is above the default 128 MiB binding").toBeGreaterThan(
                128 * 2 ** 20,
            );
            const t0 = performance.now();
            const result = await sssp(ctx, s, 0);
            const ms = performance.now() - t0;
            const want = dijkstraOracle(s, 0, "f32");
            console.warn(`[sssp-1m] rmat20 from 0: reached ${result.reachedCount}, ${ms.toFixed(0)} ms`);
            expectBitwiseEqual(
                distBits(result.dist),
                distBits(want.dist),
                "rmat20 dist (the dist buffer) vs the f32 oracle",
            );
            expect(result.reachedCount).toBe(want.reachedCount);
            expectTriangleInequality(result.dist, s);
            ctx.release(s);
        } finally {
            ctx.dispose();
        }
    }, 600_000);
});
