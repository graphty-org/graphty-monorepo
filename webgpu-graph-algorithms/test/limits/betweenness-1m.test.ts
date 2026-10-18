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
import { progressLine } from "../helpers/progress.js";
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
            // A progress line after each step (test/helpers/progress.ts): this case ran 70-84 s without a line on the
            // Tesla T4, and the wrapper fails a run silent for 90 s (issue #2158). The reference runs in slices so it
            // can print between them.
            const progress = (step: string): Promise<void> => progressLine(`[betweenness-1m] ${step}`);
            await progress(`rmat20 built: ${s.nodeCount} nodes / ${s.arcCount} arcs`);
            const sources = spreadSources(s.nodeCount, SOURCES);
            const k = planBatchSize(s.nodeCount, SOURCES, ctx.caps.limits);
            let batches = 0;
            const planned = await betweennessWithTuning(ctx, s, { sources }, { onBatch: () => batches++ });
            await progress(`the planned run: ${batches} batch(es) of k = ${k}`);
            expect(batches).toBe(Math.ceil(SOURCES / k));
            expect(planned.sourcesUsed).toBe(SOURCES);
            expect(planned.sigmaOverflow).toBe(false);
            // The reference's vertex sums are sums over the sources, so slices of eight add up to the whole.
            const sums = new Float64Array(s.nodeCount);
            for (let first = 0; first < SOURCES; first += 8) {
                const slice = brandesOracle(s, { sources: sources.slice(first, first + 8) }).vertex;
                for (let v = 0; v < sums.length; v++) {
                    sums[v] += slice[v];
                }
                await progress(`the Brandes reference: ${first + 8} of ${SOURCES} sources`);
            }
            const want = vertexConvention(s, sums);
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
                    onBatch: () => {
                        small++;
                        console.warn(`[betweenness-1m] k = 8: batch ${small} of ${SOURCES / 8}`);
                    },
                },
            );
            expect(small).toBe(SOURCES / 8);
            expectBitwiseEqual(eight.scores, planned.scores);
            ctx.release(s);
        } finally {
            ctx.dispose();
        }
    });
});
