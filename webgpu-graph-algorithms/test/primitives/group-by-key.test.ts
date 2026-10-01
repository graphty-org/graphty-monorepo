/**
 * The per-row group-by-key (design 8.6; the P11 plan's P11-T5) against a Map per row: rows of 0, 1, 31, 32, 33, 128,
 * 129, 300 and 2,000 arcs whose keys repeat and tie, a row of 200 distinct keys, weights spanning six decades,
 * weighted and not. The tier agreement is the check that matters: the same rows with every row in the workgroup tier,
 * with every row up to the thread tier's limit in the thread tier and at the default split must be BITWISE the same,
 * and the same run twice. Plus the host planner of the tiers.
 */

import { type TestContext } from "vitest";

import { GROUP_HASH_LOAD_FACTOR, GROUP_ROW_THREAD_LIMIT, GROUP_ROW_THREAD_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { planGroupRows } from "../../src/primitives/group-by-key.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { groupRows, runGroupBy } from "../helpers/structure.js";
import { groupByKeyOracle } from "../oracle/group-by-key.js";
import { acquire, requireGpu } from "../setup/gpu.js";

describe("planGroupRows (pure)", () => {
    it("splits rows by the bound, lays the workgroup tier's regions out after the flag word", () => {
        const plan = planGroupRows([0, 40, 3, 33, 32]);
        expect(plan.threadCount).toBe(3);
        expect(plan.hashCount).toBe(2);
        expect(Array.from(plan.words)).toEqual([0, 2, 4, 1, 3, 1, 1 + 2 * GROUP_HASH_LOAD_FACTOR * 40]);
        expect(plan.regionWords).toBe(1 + 2 * GROUP_HASH_LOAD_FACTOR * (40 + 33));
        expect(GROUP_ROW_THREAD_MAX).toBe(32);
    });

    it("threadMax 0 sends every row with arcs to the workgroup tier; above the limit is refused", () => {
        const plan = planGroupRows([1, 0, 2], 0);
        expect(plan.threadCount).toBe(1);
        expect(plan.hashCount).toBe(2);
        expect(() => planGroupRows([1], GROUP_ROW_THREAD_LIMIT + 1)).toThrow(/threadMax/);
        expect(() => planGroupRows([1], -1)).toThrow(/threadMax/);
    });
});

describe("group-by-key-row (GPU, design 8.6)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "group-by-key" }));
        shared = ctx;
        return ctx;
    }

    for (const weighted of [false, true]) {
        it(`${weighted ? "weighted" : "unweighted"}: the reference, bitwise, in every tier split, twice`, async (t) => {
            const ctx = await context(t);
            const rows = groupRows();
            const w = weighted ? rows.weights : null;
            const want = groupByKeyOracle(rows.rowPtr, rows.colIdx, w, rows.keyIn);
            const runs = [];
            for (const threadMax of [undefined, 0, GROUP_ROW_THREAD_LIMIT]) {
                const run = await runGroupBy(ctx, rows.rowPtr, rows.colIdx, w, rows.keyIn, threadMax);
                expect(run.exhausted).toBe(0);
                runs.push(run);
            }
            const again = await runGroupBy(ctx, rows.rowPtr, rows.colIdx, w, rows.keyIn);
            expectBitwiseEqual(again.bestKey, runs[0].bestKey, "run-twice bestKey");
            expectBitwiseEqual(again.bestScore, runs[0].bestScore, "run-twice bestScore");
            for (const run of runs) {
                expectBitwiseEqual(run.bestKey, want.bestKey, "bestKey");
                expectBitwiseEqual(run.bestScore, want.bestScore, "bestScore");
            }
        });
    }

    it("ties go to the lowest key in both tiers; an empty row is INVALID_INDEX with score 0", async (t) => {
        const ctx = await context(t);
        // row 0: keys 9, 4, 9, 4, 7 -> 9 and 4 tie at 2 -> 4; row 1: empty; row 2: 40 arcs, keys 5 and 2 alternating -> 2
        const keyIn = [9, 4, 9, 4, 7, 5, 2];
        const colIdx = [0, 1, 2, 3, 4];
        for (let i = 0; i < 40; i++) {
            colIdx.push(5 + (i % 2));
        }
        const rowPtr = [0, 5, 5, 45, 45, 45, 45, 45];
        for (const threadMax of [0, GROUP_ROW_THREAD_LIMIT]) {
            const run = await runGroupBy(ctx, rowPtr, colIdx, null, keyIn, threadMax);
            expect(Array.from(run.bestKey.subarray(0, 3))).toEqual([4, 0xffffffff, 2]);
            expect(Array.from(run.bestScore.subarray(0, 3))).toEqual([2, 0, 20]);
        }
    });

    afterAll(() => {
        shared?.dispose();
    });
});
