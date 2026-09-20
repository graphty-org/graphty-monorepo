/**
 * The first node-limits test (spec 11.1; M8b-T10, gate G7): PageRank over a 1M-node / 10M-arc random snapshot
 * completes on the GPU lane, returns 1M finite scores summing to 1, and reports a boolean `converged`. The size is
 * what puts it here: on lavapipe the run is slow or exhausts memory, which is why the default lane never selects
 * this project (vitest.config.ts, the `node-limits` project).
 */

import { pageRank } from "../../src/algorithms/pagerank.js";
import { randomEdges, snapshotOf } from "../helpers/graphs.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const NODES = 1_000_000;
/** 5M undirected edges are 10M arcs. */
const EDGES = 5_000_000;

describe("pageRank at 1M nodes / 10M arcs (node-limits)", () => {
    it("completes within maxIterations 100 with finite scores summing to 1 and a boolean converged", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/pagerank-1m" });
        try {
            const s = snapshotOf(randomEdges(NODES, EDGES, 41), { nodeCount: NODES, label: "limits/random-1m" });
            expect(s.nodeCount).toBe(NODES);
            expect(s.arcCount).toBe(2 * EDGES);
            const result = await pageRank(ctx, s, { maxIterations: 100 });
            expect(result.scores.length).toBe(NODES);
            expect(result.precision).toBe("f32");
            expect(typeof result.converged).toBe("boolean");
            expect(result.iterations).toBeGreaterThanOrEqual(1);
            expect(result.iterations).toBeLessThanOrEqual(100);
            let sum = 0;
            for (let v = 0; v < NODES; v++) {
                const score = result.scores[v];
                if (!Number.isFinite(score) || score < 0) {
                    throw new Error(`scores[${v}] = ${score} is not a finite non-negative number`);
                }
                sum += score;
            }
            expect(Math.abs(sum - 1)).toBeLessThan(1e-3);
            ctx.release(s);
        } finally {
            ctx.dispose();
        }
    });
});
