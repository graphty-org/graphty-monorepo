/**
 * The P8-T12 item at a REAL binding limit (spec 4.2, 4.6; DEP-P8-E lifted for the frontier family; the GPU lane
 * only): at the DEFAULT limits (a 128 MiB binding) the 2.5M-node / 50M-arc random snapshot of windowed-200mb.test.ts
 * has a 200 MB colIdx that no single binding holds, so `core()` executes the windowed plan (two windows) and
 * `breadthFirstSearch` dispatches every frontier-walking kernel once per window: `depth` (the depth buffer) is exact
 * against the FIFO oracle, `parent` obeys the level rule and `order` is grouped by depth, and a second run is bitwise
 * identical. The edge queue is capped at the binding limit too (33,554,432 entries under 50M arcs), so a level whose
 * degree sum exceeds it takes the fused retry (PD-23) inside the same run.
 */

import { fromEdgeArrays } from "@graphty/graph-format";

import { randomEdges } from "../../benchmarks/datasets.js";
import { breadthFirstSearch } from "../../src/algorithms/bfs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { expectLevelConsistent, expectOrderGroupedByLevel } from "../helpers/traversal-check.js";
import { bfsOracle } from "../oracle/traversal.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const NODES = 2_500_000;
/** 25M undirected edges are 50M arcs: 200 MB of colIdx against the 128 MiB default binding. */
const EDGES = 25_000_000;

describe("windowed breadth-first search at the default limits (node-limits, P8-T12)", () => {
    it("2.5M nodes / 50M arcs, core() in two windows: depth equals the oracle bitwise, parent and order obey their rules, twice", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/advance-windowed", limits: "default" });
        try {
            expect(ctx.caps.limits.maxStorageBufferBindingSize).toBe(128 * 2 ** 20);
            const e = randomEdges(NODES, EDGES, 41);
            const s = fromEdgeArrays(
                { directed: false, nodeCount: NODES, src: e.src, dst: e.dst },
                { label: "limits/random-2.5m-bfs" },
            );
            expect(4 * s.arcCount).toBeGreaterThan(ctx.caps.limits.maxStorageBufferBindingSize);
            const core = ctx.residency.core(s);
            expect(core.plan).toBe("windowed");
            expect(core.windows?.length).toBe(2);
            const t0 = performance.now();
            const first = await breadthFirstSearch(ctx, s, 0);
            console.warn(
                `[advance-windowed] windowed BFS in ${(performance.now() - t0).toFixed(0)} ms: ${first.levels} levels, ${first.switches} switches, ${first.visitedCount} visited`,
            );
            const want = bfsOracle(s, 0);
            expectBitwiseEqual(first.depth, want.depth, "windowed depth (the depth buffer) vs the oracle");
            expect(first.visitedCount).toBe(want.visitedCount);
            expectLevelConsistent(first, s, 0);
            expectOrderGroupedByLevel(first);
            const second = await breadthFirstSearch(ctx, s, 0);
            expectBitwiseEqual(second.depth, first.depth, "windowed depth (the depth buffer), twice");
            expectBitwiseEqual(second.parent, first.parent, "windowed parent (the pred buffer), twice");
            expectBitwiseEqual(second.order, first.order, "windowed order (the sorted vals buffer), twice");
            ctx.release(s);
        } finally {
            ctx.dispose();
        }
    });
});
