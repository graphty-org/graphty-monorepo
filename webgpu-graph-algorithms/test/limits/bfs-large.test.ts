/**
 * The P8 gate fixtures at their UNSCALED sizes (spec 10.4 T-10, 11.3; P8-T15 Step 5; the GPU lane only): the
 * 1000 x 1000 grid from its corner, 1,999 levels -- `depth` (the depth buffer) exact against the FIFO oracle and
 * exactly `ceil(levels / MAX_LEVELS_PER_SUBMIT) + 1` mapAsync calls (PD-7: one per submit plus one for the result
 * batch), counted on a device wrapped by the leak counter after the self-check has paid its two maps -- and the
 * 1M / 10M R-MAT tier of the benchmark (`rmatEdges(20, 10)`, undirected, so the edge queue the driver leases is
 * 4 x arcCount bytes, about 84 MB): `depth` exact, `order` grouped by level, and `switches > 0` (Beamer's rule took
 * the bottom-up sweep at that size). `test/algorithms/bfs.test.ts` runs the same two shapes at `gpuScale()`.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";

import { type EdgeArrays, gridEdges, rmatEdges } from "../../benchmarks/datasets.js";
import { breadthFirstSearch } from "../../src/algorithms/bfs.js";
import { MAX_LEVELS_PER_SUBMIT } from "../../src/constants.js";
import { GpuContext } from "../../src/context.js";
import { verifyDevice } from "../../src/primitives/verify.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { expectLevelConsistent, expectOrderGroupedByLevel } from "../helpers/traversal-check.js";
import { bfsOracle } from "../oracle/traversal.js";
import { acquire, acquireRaw, requireGpu } from "../setup/gpu.js";

const GRID_SIDE = 1000;
/** The 1M / 10M tier as an R-MAT scale and edge factor (benchmarks/bfs.bench.ts BFS_RMAT_RUNGS) and its seed. */
const RMAT_SCALE = 20;
const RMAT_EDGE_FACTOR = 10;
const RMAT_SEED = 12345;
/** The edge queue the driver leases at the default capacity: one u32 per arc (frontier.ts, `min(arcCount, limit / 4)`). */
const EDGE_QUEUE_BYTES_MIN = 80_000_000;

function unweightedSnapshotOf(edges: EdgeArrays, label: string): GraphSnapshot {
    return fromEdgeArrays({ directed: false, nodeCount: edges.nodeCount, src: edges.src, dst: edges.dst }, { label });
}

describe("breadthFirstSearch at the gate's unscaled sizes (node-limits, P8-T15)", () => {
    it("the 1000 x 1000 grid from the corner: 1,999 levels, depth exact, ceil(levels / 32) + 1 mapAsync calls after the self-check", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        try {
            await verifyDevice(own);
            const grid = unweightedSnapshotOf(gridEdges(GRID_SIDE, GRID_SIDE), "limits/grid1000");
            counter.resetMapAsync();
            const t0 = performance.now();
            const result = await breadthFirstSearch(own, grid, 0);
            const ms = performance.now() - t0;
            expect(result.levels).toBe(2 * GRID_SIDE - 1);
            const bound = Math.ceil(result.levels / MAX_LEVELS_PER_SUBMIT) + 1;
            expect(counter.mapAsyncCalls, `mapAsync calls of the ${result.levels}-level traversal (PD-7)`).toBe(bound);
            console.warn(
                `[bfs-large] grid ${GRID_SIDE}x${GRID_SIDE}: ${result.levels} levels, mapAsync ${counter.mapAsyncCalls} (bound ${bound}), ${ms.toFixed(0)} ms`,
            );
            expectBitwiseEqual(result.depth, bfsOracle(grid, 0).depth, "grid depth (the depth buffer) vs the oracle");
            expect(result.visitedCount).toBe(grid.nodeCount);
            expect(result.switches, "switches on the grid (every level is small)").toBe(0);
            own.release(grid);
        } finally {
            own.dispose();
        }
        counter.restore();
    }, 600_000);

    it("the 1M / 10M R-MAT tier from node 0: an 84 MB edge queue, depth exact, order grouped, at least one direction switch", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/bfs-1m" });
        try {
            const s = unweightedSnapshotOf(rmatEdges(RMAT_SCALE, RMAT_EDGE_FACTOR, RMAT_SEED), "limits/rmat20");
            expect(s.nodeCount).toBe(2 ** RMAT_SCALE);
            expect(4 * s.arcCount, "the edge queue's bytes at the default capacity").toBeGreaterThan(
                EDGE_QUEUE_BYTES_MIN,
            );
            expect(4 * s.arcCount).toBeLessThanOrEqual(ctx.caps.limits.maxStorageBufferBindingSize);
            const t0 = performance.now();
            const result = await breadthFirstSearch(ctx, s, 0);
            const ms = performance.now() - t0;
            const want = bfsOracle(s, 0);
            console.warn(
                `[bfs-large] rmat20 from 0: ${result.levels} levels, ${result.switches} switches, ${result.visitedCount} visited, ${ms.toFixed(0)} ms`,
            );
            expectBitwiseEqual(result.depth, want.depth, "rmat20 depth (the depth buffer) vs the oracle");
            expect(result.visitedCount).toBe(want.visitedCount);
            expect(result.switches, "switches (the counters block)").toBeGreaterThan(0);
            expectLevelConsistent(result, s, 0);
            expectOrderGroupedByLevel(result);
            ctx.release(s);
        } finally {
            ctx.dispose();
        }
    }, 600_000);
});
