/**
 * The G4 windowed-upload item (spec 4.2, 11.1, 11.3; P4-T7, P4-T15): at the DEFAULT limits (a 128 MiB binding) a
 * 2.5M-node / 50M-arc random snapshot has a 200 MB colIdx that no single binding holds, so `core()` executes the
 * windowed plan (`plan === "windowed"`, two windows of at most 33,554,432 arcs) and `degree` folds the windows into
 * one result that equals `outDegree()` bitwise, twice; and `exclusiveScan` at exactly 16,776,961 items (the `+ 1`
 * case of 11.3: the first count whose block scan needs a 2D dispatch) equals its oracle bitwise, twice. The edges come
 * from the benchmarks' typed-array generator (self-loops and parallels allowed; a degree counts arcs either way): the
 * test helpers' parallel-free generator keeps a 25M-entry Set and a 25M-element array of pairs, several GB of JS heap
 * at this size.
 */

import { fromEdgeArrays } from "@graphty/graph-format";

import { randomEdges } from "../../benchmarks/datasets.js";
import { degree } from "../../src/algorithms/degree.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { runScan, SCAN_SEED, scanInput } from "../helpers/scan.js";
import { scanOracle } from "../oracle/scan.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const NODES = 2_500_000;
/** 25M undirected edges are 50M arcs: 200 MB of colIdx against the 128 MiB default binding. */
const EDGES = 25_000_000;
/** The arcs one 128 MiB binding holds (upload-plan.ts: floor(2^27 / 4) is already 64-aligned). */
const ARCS_PER_WINDOW = 2 ** 25;
/** MAX_1D_ITEMS + 1: the 11.3 `+ 1` case. */
const SCAN_ITEMS = 16_776_961;

describe("a 200 MB per-array upload bound windowed at the default limits (node-limits, spec 4.2)", () => {
    it("2.5M nodes / 50M arcs: core() is windowed in two windows; degree equals outDegree() bitwise, twice", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/windowed-200mb", limits: "default" });
        try {
            expect(ctx.caps.limits.maxStorageBufferBindingSize).toBe(128 * 2 ** 20);
            const t0 = performance.now();
            const e = randomEdges(NODES, EDGES, 41);
            const s = fromEdgeArrays(
                { directed: false, nodeCount: NODES, src: e.src, dst: e.dst },
                { label: "limits/random-2.5m" },
            );
            console.warn(`[windowed-200mb] snapshot built in ${(performance.now() - t0).toFixed(0)} ms`);
            expect(s.nodeCount).toBe(NODES);
            // a self-loop of the generator is one arc: the count is within a few of 2 x EDGES and above one window
            expect(s.arcCount).toBeGreaterThan(ARCS_PER_WINDOW);
            expect(s.arcCount).toBeLessThanOrEqual(2 * EDGES);
            expect(4 * s.arcCount).toBeGreaterThan(ctx.caps.limits.maxStorageBufferBindingSize);
            const core = ctx.residency.core(s);
            expect(core.plan).toBe("windowed");
            expect(core.windows).not.toBeNull();
            expect(core.windows?.length).toBe(2);
            for (const w of core.windows ?? []) {
                expect(w.end - w.start).toBeLessThanOrEqual(ARCS_PER_WINDOW);
            }
            const t1 = performance.now();
            const first = await degree(ctx, s);
            console.warn(`[windowed-200mb] windowed degree ${(performance.now() - t1).toFixed(0)} ms`);
            const second = await degree(ctx, s);
            expectBitwiseEqual(first, second, "windowed degree twice");
            expectBitwiseEqual(first, s.outDegree(), "windowed degree vs outDegree()");
            ctx.release(s);
        } finally {
            ctx.dispose();
        }
    });

    it("exclusiveScan at 16,776,961 items equals scanOracle bitwise with its total, twice", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/scan-17m", limits: "default" });
        try {
            const values = scanInput(SCAN_ITEMS, SCAN_SEED + SCAN_ITEMS);
            const t0 = performance.now();
            const first = await runScan(ctx, values);
            console.warn(
                `[windowed-200mb] scan of ${SCAN_ITEMS} words in ${first.dispatches} dispatches, ${(performance.now() - t0).toFixed(0)} ms`,
            );
            const second = await runScan(ctx, values);
            expectBitwiseEqual(first.out, second.out, "scan twice");
            expect(first.total).toBe(second.total);
            const want = scanOracle(values);
            expectBitwiseEqual(first.out, want.out, "scan vs oracle");
            expect(first.total).toBe(want.total);
        } finally {
            ctx.dispose();
        }
    });
});
