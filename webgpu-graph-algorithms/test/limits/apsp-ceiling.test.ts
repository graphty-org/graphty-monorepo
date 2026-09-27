/**
 * The all-pairs ceiling at real limits (design 8.7): under `limits: "raise"` a hardware device binds far more than the
 * 128 MiB spec default, so an 8,192-node matrix (268 MB, which the default refuses) runs and every row equals one
 * breadth-first search from that row's node, exactly; and one node more than the raised ceiling is `E_TOO_LARGE` with
 * the node count, the ceiling, the limit and `GpuContextOptions.limits` in the message. A software adapter cannot raise
 * the binding limit (lavapipe stays at 128 MiB), so there the 8,192-node run must be the refusal instead.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

import { allPairsCeiling, allPairsShortestPath } from "../../src/algorithms/all-pairs.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { randomEdges, snapshotOf } from "../helpers/graphs.js";
import { bfsOracle } from "../oracle/traversal.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** Above the 5,792-node default ceiling, far below a 2 GiB binding's 23,170. */
const N = 8192;

/** Awaits a rejection and returns it. */
async function rejection(promise: Promise<unknown>): Promise<WebGpuGraphError> {
    let caught: unknown = null;
    try {
        await promise;
    } catch (err) {
        caught = err;
    }
    expect(caught).not.toBeNull();
    return caught as WebGpuGraphError;
}

describe("all-pairs shortest paths at the real ceiling (node-limits, design 8.7)", () => {
    it("8,192 nodes run under raised limits and match one BFS per source; the ceiling + 1 is E_TOO_LARGE with all four facts", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/apsp-ceiling", limits: "raise" });
        try {
            const { maxNodes, limit, limitName } = allPairsCeiling(ctx.caps.limits);
            console.warn(`[apsp-ceiling] ${limitName}=${limit}: at most ${maxNodes} nodes`);
            const s = snapshotOf(randomEdges(N, 3 * N, 8192), { nodeCount: N });
            try {
                if (N > maxNodes) {
                    expect(ctx.caps.software, "a hardware device raises the binding limit past 8,192 nodes").toBe(true);
                    expect((await rejection(allPairsShortestPath(ctx, s))).code).toBe("E_TOO_LARGE");
                } else {
                    const { dist } = await allPairsShortestPath(ctx, s);
                    expect(dist.length).toBe(N * N);
                    let mismatches = 0;
                    for (let i = 0; i < N; i++) {
                        const { depth } = bfsOracle(s, i);
                        for (let j = 0; j < N; j++) {
                            const want = depth[j] === INVALID_INDEX ? Infinity : depth[j];
                            if (dist[i * N + j] !== want) {
                                mismatches += 1;
                            }
                        }
                    }
                    expect(mismatches, "entries that differ from the BFS rows").toBe(0);
                }
            } finally {
                ctx.release(s);
            }
            const over = snapshotOf([], { nodeCount: maxNodes + 1 });
            const err = await rejection(allPairsShortestPath(ctx, over));
            expect(err.code).toBe("E_TOO_LARGE");
            expect(err.message).toContain(`${maxNodes + 1} nodes`);
            expect(err.message).toContain(`at most ${maxNodes} nodes`);
            expect(err.message).toContain(`${limitName} of ${limit} bytes`);
            expect(err.message).toContain("GpuContextOptions.limits");
        } finally {
            ctx.dispose();
        }
    }, 300_000);
});
