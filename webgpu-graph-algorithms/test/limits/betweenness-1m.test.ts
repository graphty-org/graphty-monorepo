/**
 * Sampled betweenness at the 1M / 10M tier (the GPU lane only): the benchmark's RMAT rung `rmatEdges(20, 10)`,
 * undirected, 64 sources spread over the vertices. At the device's own limits the batch planner's k decides the batch
 * count, which the test asserts together with the scores against the Brandes reference on the same sources (1e-4);
 * a faked maxBufferSize that forces eight sources per batch gives bitwise the same scores in eight batches. The
 * batch holds 16 bytes per (node, source): 1 GiB at k = 64, which is why the case lives here.
 */

import { fromEdgeArrays } from "@graphty/graph-format";

import { spreadSources } from "../../benchmarks/betweenness.bench.js";
import { rmatEdges } from "../../benchmarks/datasets.js";
import { betweennessWithTuning, planBatchSize } from "../../src/algorithms/betweenness.js";
import { scoreError, vertexConvention } from "../helpers/centrality-check.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { brandesOracle } from "../oracle/betweenness.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const SEED = 12345;
const SOURCES = 64;

describe("sampled betweenness at 1M nodes / 10M edges (node-limits)", () => {
    it("64 sources: the planned batch count, the reference's scores within 1e-4, and bitwise the same scores at k = 8", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/betweenness-1m" });
        try {
            const e = rmatEdges(20, 10, SEED);
            const s = fromEdgeArrays(
                { directed: false, nodeCount: e.nodeCount, src: e.src, dst: e.dst },
                { label: "limits/rmat20" },
            );
            const sources = spreadSources(s.nodeCount, SOURCES);
            const k = planBatchSize(s.nodeCount, SOURCES, ctx.caps.limits);
            let batches = 0;
            const planned = await betweennessWithTuning(ctx, s, { sources }, { onBatch: () => batches++ });
            expect(batches).toBe(Math.ceil(SOURCES / k));
            expect(planned.sourcesUsed).toBe(SOURCES);
            expect(planned.sigmaOverflow).toBe(false);
            const want = vertexConvention(s, brandesOracle(s, { sources }).vertex);
            expect(scoreError(planned.scores, want)).toBeLessThanOrEqual(1e-4);
            let small = 0;
            const eight = await betweennessWithTuning(
                ctx,
                s,
                { sources },
                {
                    limits: {
                        maxStorageBufferBindingSize: ctx.caps.limits.maxStorageBufferBindingSize,
                        maxBufferSize: 8 * 16 * s.nodeCount * 4,
                    },
                    onBatch: () => small++,
                },
            );
            expect(small).toBe(SOURCES / 8);
            expectBitwiseEqual(eight.scores, planned.scores);
            ctx.release(s);
        } finally {
            ctx.dispose();
        }
    }, 600_000);
});
