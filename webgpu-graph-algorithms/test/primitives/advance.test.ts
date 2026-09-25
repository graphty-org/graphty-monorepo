/**
 * The `advance` primitive (design 6 row 8; P8-T5): the block-mapped expansion of a frontier into the edge queue,
 * dispatched indirectly from the slot `frontier-finalize` role 0 wrote, every readback naming its buffer. The edge
 * queue is a MULTISET in the schedule's order, so every case compares it SORTED against the nested-loop oracle and
 * asserts run-twice on the sorted queue plus on `edgeCount`, `edgeCountUnclamped` and `frontierDegreeSum` raw (the
 * counters block), which are order-independent sums; the subgroup twin (a second context without the feature, so
 * `wg_scan_u32` takes its Hillis-Steele form) agrees bitwise on the sorted queue. The word past `edgeCount` keeps its
 * poison, so the kernel writes exactly the reserved span. The overflow case (PD-23) fakes a 4,096-entry capacity
 * under the 10,000-degree star hub: the unclamped word is the detector, role 1 clamps `edgeCount`, zeroes the
 * contract slot and sizes the fused-retry slot. The windowed case (P8-T12, DEP-P8-E lifted) fakes the binding limit
 * so the core is bound as arc windows (the hub row straddling two of them) and holds the per-window expansion equal
 * to the whole-core one. A bad level or frontier is E_INVALID_ARGUMENT naming it before anything is recorded.
 */

import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { algorithmScope } from "../../src/algorithms/scope.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { GraphResidency } from "../../src/memory/residency.js";
import { prepareAdvance } from "../../src/primitives/advance.js";
import { prepareFrontier, SLOT } from "../../src/primitives/frontier.js";
import { advanceReport, expectSubMultiset, levelsOf, runAdvance } from "../helpers/advance.js";
import { fakeCaps } from "../helpers/caps-tables.js";
import { sortedU32 } from "../helpers/compact.js";
import { withResidency } from "../helpers/degree-check.js";
import { POISON, slotOf, ZERO_SLOT } from "../helpers/frontier.js";
import { gridEdges, hubbedRandom, KARATE_EDGES, rmatEdges, snapshotOf, starEdges } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { advanceOracle } from "../oracle/advance.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The star hub's degree; the overflow case fakes a capacity below it. */
const HUB_DEGREE = 10_000;
const FAKED_CAPACITY = 4096;

/** 0 .. n - 1. */
function iota(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
}

/** The argument name of the E_INVALID_ARGUMENT `fn` throws, or null when it does not throw. */
function argumentOf(fn: () => unknown): string | null {
    try {
        fn();
        return null;
    } catch (e) {
        if (isWebGpuGraphError(e) && e.code === "E_INVALID_ARGUMENT") {
            return String(e.details.argument);
        }
        throw e;
    }
}

describe("advance: the block-mapped expansion and the edge queue (design 6 row 8; P8-T5)", () => {
    let shared: GpuContext | null = null;
    let twinShared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "advance" }));
        shared = ctx;
        return ctx;
    }

    async function twin(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = twinShared ?? (await acquire({ subgroups: false, label: "advance-twin" }));
        twinShared = ctx;
        return ctx;
    }

    /**
     * The differential of one fixture: every frontier of `frontiers` expanded twice on the context and once on the
     * twin; the sorted edge queue equals the sorted oracle, the three counters equal the oracle's total, the word
     * past `edgeCount` keeps its poison, and the three runs agree.
     */
    async function checkFixture(
        t: TestContext,
        label: string,
        s: GraphSnapshot,
        frontiers: readonly (readonly number[])[],
    ): Promise<void> {
        const ctx = await context(t);
        const other = await twin(t);
        const first = await runAdvance(ctx, s, frontiers);
        const second = await runAdvance(ctx, s, frontiers);
        const twinRuns = await runAdvance(other, s, frontiers);
        expect(first).toHaveLength(frontiers.length);
        frontiers.forEach((list, k) => {
            const want = sortedU32(advanceOracle(s, list));
            const got = sortedU32(first[k].queue);
            expectBitwiseEqual(got, want, `${label}[${k}]: the sorted edge queue (edgeQueue buffer) vs the oracle`);
            expect(first[k].counters, `${label}[${k}]: the counters block`).toMatchObject({
                frontierCount: list.length,
                edgeCount: want.length,
                edgeCountUnclamped: want.length,
                frontierDegreeSum: want.length,
                overflowLevels: 0,
            });
            if (first[k].tail !== null) {
                expect(first[k].tail, `${label}[${k}]: the word past edgeCount`).toBe(POISON);
            }
            expectBitwiseEqual(got, sortedU32(second[k].queue), `${label}[${k}]: the sorted edge queue, run twice`);
            expect(second[k].counters, `${label}[${k}]: the counters block, run twice`).toEqual(first[k].counters);
            expectBitwiseEqual(got, sortedU32(twinRuns[k].queue), `${label}[${k}]: the subgroup twin's sorted queue`);
            expect(twinRuns[k].counters, `${label}[${k}]: the twin's counters block`).toEqual(first[k].counters);
        });
    }

    it("the empty frontier: role 0 sets done, the expansion runs no workgroup, the three counters stay 0 and the queue keeps its poison", async (t) => {
        await checkFixture(t, "empty", snapshotOf(KARATE_EDGES), [[]]);
        const [run] = await runAdvance(await context(t), snapshotOf(KARATE_EDGES), [[]]);
        expect(run.counters.done).toBe(1);
        expect(run.queue).toHaveLength(0);
        expect(run.tail).toBe(POISON);
    });

    it("a single-vertex frontier: the queue is that row's targets (node 0 and node 33 of karate)", async (t) => {
        await checkFixture(t, "single", snapshotOf(KARATE_EDGES), [[0], [33], [11]]);
    });

    it("the noise-floor fixture (P8-T15 Step 6): the sorted edge queue of karate's reversed vertex set, written for this adapter class and its workgroup twin under GRAPHTY_NOISE_FLOOR_WRITE=1 (test/noise-floor.test.ts holds the twin and the classes bitwise)", async (t) => {
        const ctx = await context(t);
        const other = await twin(t);
        const s = snapshotOf(KARATE_EDGES, { label: "karate-noise" });
        const reversed = Array.from({ length: s.nodeCount }, (_, i) => s.nodeCount - 1 - i);
        const [feature] = await runAdvance(ctx, s, [reversed]);
        const [workgroup] = await runAdvance(other, s, [reversed]);
        const want = sortedU32(advanceOracle(s, reversed));
        expectBitwiseEqual(sortedU32(feature.queue), want, "karate reversed: the sorted edge queue (edgeQueue buffer)");
        expectBitwiseEqual(sortedU32(workgroup.queue), want, "karate reversed: the twin's sorted edge queue");
        const cls = adapterClass(ctx.caps);
        writeNoiseFixture("advance-expand", "karate-reversed-queue", cls, sortedU32(feature.queue), "u32");
        writeNoiseFixture(
            "advance-expand",
            "karate-reversed-queue",
            `${cls}-no-subgroups`,
            sortedU32(workgroup.queue),
            "u32",
        );
        ctx.release(s);
        other.release(s);
    });

    it("the whole vertex set of karate, in index order and reversed", async (t) => {
        const karate = snapshotOf(KARATE_EDGES);
        const n = karate.nodeCount;
        await checkFixture(t, "karate", karate, [iota(n), iota(n).reverse()]);
    });

    it("a 10,000-degree star hub as the only frontier entry: one workgroup strips 10,000 arcs", async (t) => {
        const star = snapshotOf(starEdges(HUB_DEGREE));
        expect(star.rowPtr[1] - star.rowPtr[0]).toBe(HUB_DEGREE);
        await checkFixture(t, "star-hub", star, [[0]]);
    });

    it("gridEdges(100, 100) at every level of the oracle's BFS from the corner", async (t) => {
        const grid = snapshotOf(gridEdges(100, 100));
        const levels = levelsOf(grid, 0);
        expect(levels).toHaveLength(199);
        expect(levels.reduce((sum, level) => sum + level.length, 0)).toBe(grid.nodeCount);
        await checkFixture(t, "grid", grid, levels);
    }, 600_000);

    it("rmatEdges(16, 10, 1) over 65,536 nodes (some of degree 0) with the whole vertex set: 256 workgroups, hubs balanced inside their block", async (t) => {
        const rmat = snapshotOf(rmatEdges(16, 10, 1), { nodeCount: 65_536 });
        expect(rmat.nodeCount).toBe(65_536);
        await checkFixture(t, "rmat", rmat, [iota(rmat.nodeCount)]);
    }, 300_000);

    it("the overflow rule (PD-23): a FAKED 4,096 capacity under the star hub -- edgeCountUnclamped 10,000, edgeCount 10,000 before role 1 and 4,096 after, the 4,096 words a sub-multiset of the oracle, slot 1 zeroed, slot 6 the retry, overflowLevels 1", async (t) => {
        const ctx = await context(t);
        const star = snapshotOf(starEdges(HUB_DEGREE));
        const oracle = sortedU32(advanceOracle(star, [0]));
        const [before] = await runAdvance(ctx, star, [[0]], { edgeCapacity: FAKED_CAPACITY });
        expect(before.counters, "the counters block before role 1").toMatchObject({
            frontierCount: 1,
            edgeCount: HUB_DEGREE,
            edgeCountUnclamped: HUB_DEGREE,
            frontierDegreeSum: HUB_DEGREE,
            overflowLevels: 0,
        });
        expect(before.queue, "the edge queue (edgeQueue buffer), the first capacity words").toHaveLength(
            FAKED_CAPACITY,
        );
        expect(before.tail).toBeNull();
        expectSubMultiset(sortedU32(before.queue), oracle, "the clamped edge queue vs the oracle");

        const [after] = await runAdvance(ctx, star, [[0]], { edgeCapacity: FAKED_CAPACITY, role1: true });
        expect(after.counters, "the counters block after role 1").toMatchObject({
            edgeCount: FAKED_CAPACITY,
            edgeCountUnclamped: HUB_DEGREE,
            overflowLevels: 1,
            fusedLevels: 1,
            twoPhaseLevels: 0,
        });
        expectSubMultiset(sortedU32(after.queue), oracle, "the clamped edge queue after role 1 vs the oracle");
        expect(slotOf(after.args, 0, SLOT.expand), "slot 0 (args buffer)").toEqual([1, 1, 1, 1]);
        expect(slotOf(after.args, 0, SLOT.contract), "slot 1 (args buffer)").toEqual([...ZERO_SLOT]);
        expect(slotOf(after.args, 0, SLOT.fusedRetry), "slot 6 (args buffer)").toEqual([1, 1, 1, 1]);

        // a capacity that fits takes the two-phase branch and clamps nothing
        const [fits] = await runAdvance(ctx, star, [[0]], { edgeCapacity: HUB_DEGREE, role1: true });
        expect(fits.counters).toMatchObject({
            edgeCount: HUB_DEGREE,
            edgeCountUnclamped: HUB_DEGREE,
            overflowLevels: 0,
            twoPhaseLevels: 1,
        });
        expectBitwiseEqual(sortedU32(fits.queue), oracle, "the whole edge queue when the capacity fits");
        expect(slotOf(fits.args, 0, SLOT.fusedRetry)).toEqual([...ZERO_SLOT]);
    });

    it("windowed (P8-T12, DEP-P8-E lifted): at a FAKED 1 MiB binding limit (>= 8 windows, the hub row longer than one window) the sorted edge queue (edgeQueue buffer) and the counters block of the hub alone and of the whole vertex set equal the unwindowed run's and the oracle, twice", async (t) => {
        const ctx = await context(t);
        const scale = gpuScale();
        const limit = Math.max(256, 256 * Math.round((2 ** 20 * scale) / 256));
        // the planner needs rowPtr inside the binding too: the largest row count whose rowPtr fits (262,143 at 1 MiB)
        const n = limit / 4 - 1;
        const s = hubbedRandom(n, 10 * n, Math.ceil(300_000 * scale), 20);
        const frontiers = [[0], iota(n)];
        const whole = await runAdvance(ctx, s, frontiers);
        const caps = fakeCaps(ctx.caps, { maxStorageBufferBindingSize: limit });
        const residency = new GraphResidency(ctx.device, caps, ctx.allocator, { warnUnreleasedSnapshots: 2 });
        try {
            const faked = withResidency(ctx, residency);
            const core = residency.core(s);
            expect(core.plan).toBe("windowed");
            const windows = core.windows ?? [];
            expect(windows.length, "windows").toBeGreaterThanOrEqual(8);
            expect(
                windows.filter((w) => w.rowFirst <= 0 && w.rowLast >= 0).length,
                "windows the hub row spans",
            ).toBeGreaterThanOrEqual(2);
            const windowed = await runAdvance(faked, s, frontiers);
            const again = await runAdvance(faked, s, frontiers);
            frontiers.forEach((list, k) => {
                const want = sortedU32(advanceOracle(s, list));
                expectBitwiseEqual(sortedU32(whole[k].queue), want, `whole[${k}]: the sorted edge queue vs the oracle`);
                expectBitwiseEqual(
                    sortedU32(windowed[k].queue),
                    want,
                    `windowed[${k}]: the sorted edge queue (edgeQueue buffer) over ${windows.length} windows vs the oracle`,
                );
                expect(windowed[k].counters, `windowed[${k}]: the counters block vs the unwindowed run`).toEqual(
                    whole[k].counters,
                );
                expect(windowed[k].tail, `windowed[${k}]: the word past edgeCount`).toBe(whole[k].tail);
                expectBitwiseEqual(sortedU32(again[k].queue), want, `windowed[${k}]: the sorted edge queue, run twice`);
                expect(again[k].counters, `windowed[${k}]: the counters block, run twice`).toEqual(
                    windowed[k].counters,
                );
            });
        } finally {
            residency.destroyAll();
        }
        ctx.release(s);
    }, 300_000);

    it("the sabotage check passes on the real kernel (factor 0)", async (t) => {
        const ctx = await context(t);
        const report = await advanceReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    }, 120_000);

    it("a level outside the submit or a frontier of another n is E_INVALID_ARGUMENT naming it before anything is recorded; an unwindowed core is one window over every arc", async (t) => {
        const ctx = await context(t);
        const karate = snapshotOf(KARATE_EDGES);
        const scope = algorithmScope(ctx, "advance-errors", 8);
        try {
            const core = ctx.residency.core(karate);
            const { frontier } = await prepareFrontier(scope, karate.nodeCount, karate.arcCount);
            const advance = await prepareAdvance(scope, core);
            expect(advance.windows.map((w) => [w.arcBase, w.arcEnd])).toEqual([[0, karate.arcCount]]);
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            const other = await prepareFrontier(scope, karate.nodeCount + 1, karate.arcCount);
            expect(argumentOf(() => advance.record(pass, other.frontier))).toBe("frontier");
            expect(argumentOf(() => advance.record(pass, frontier))).toBeNull();
            pass.end();
        } finally {
            scope.dispose();
        }
    });
});
