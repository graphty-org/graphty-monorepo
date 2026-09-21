/**
 * calibrateLayout (spec 2.2, 7.8; P4-T14, PD-23): on any adapter the call returns finite positive ms per iteration
 * for both tiers at both probed sizes, a `suggestedExactMaxNodes` equal to the spec 7.8 rule applied to the numbers
 * it reports (recomputed here with the benchmark twin `exactMaxNodesFromLadder`, the one copy the gate records
 * apply) or, when the twin has no answer, the largest power of two strictly below the smallest probe (the contract
 * decision of src/layouts/calibrate.ts, pinned over synthetic tables too), a positive `firstCallMs`; the first call
 * compiles the tiers' pipelines and a second call compiles nothing more (the pipeline cache grows on the first call
 * and not on the second); `sizes` that are not positive integers are E_INVALID_ARGUMENT; and every probe is released
 * (the allocator's live-buffer count and the residency's buffer count are back to their values before the call). The
 * values are compared in shape only: on lavapipe they are honest but meaningless (spec 7.8: never `caps.software`).
 */

import { EXACT_BUDGET_MS, exactMaxNodesFromLadder, floorPow2 } from "../../benchmarks/layout-exact.bench.js";
import { type GpuContext } from "../../src/context.js";
import { CALIBRATE_SIZES, calibrateLayout, suggestedExactMaxNodes } from "../../src/layouts/calibrate.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const SIZES = [1024, 2048];
const CASE_TIMEOUT = 300_000;

/** The twin's answer over a calibration's records, or null when it hands the value to an owner decision (throws). */
function twinAnswer(
    sizes: readonly number[],
    exactMs: Readonly<Record<number, number>>,
    gridMs: Readonly<Record<number, number>>,
): number | null {
    const rows = sizes.map((n) => ({ n, msPerIteration: exactMs[n] }));
    const gridRows = sizes.map((n) => ({ n, msPerIteration: gridMs[n] }));
    try {
        return exactMaxNodesFromLadder(rows, undefined, gridRows);
    } catch {
        return null;
    }
}

describe("calibrateLayout (spec 2.2; P4-T14)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "calibrate" });
    });

    it("the defaults are the 8k-65k subset of the exact ladder", () => {
        expect(CALIBRATE_SIZES).toEqual([8192, 16384, 32768, 65536]);
    });

    it("suggestedExactMaxNodes is the benchmark twin's rule; below the smallest probe when the twin has no answer", () => {
        const sizes = [1024, 2048, 4096, 8192];
        const table = (ms: readonly number[]): Record<number, number> =>
            Object.fromEntries(sizes.map((n, i) => [n, ms[i]]));
        // the RTX 4070 SUPER shape (the review's calibrate log): the exact tier wins at 1k and 2k, the grid from 4k
        const exact = table([0.102, 0.15, 0.262, 0.484]);
        const grid = table([0.191, 0.19, 0.192, 0.213]);
        const twin = (probes: readonly number[], e: Record<number, number>, g: Record<number, number>): number =>
            exactMaxNodesFromLadder(
                probes.map((n) => ({ n, msPerIteration: e[n] })),
                EXACT_BUDGET_MS,
                probes.map((n) => ({ n, msPerIteration: g[n] })),
            );
        expect(suggestedExactMaxNodes(sizes, exact, grid)).toBe(2048);
        expect(suggestedExactMaxNodes(sizes, exact, grid)).toBe(twin(sizes, exact, grid));
        // the grid slower everywhere: the budget clause alone (8k at 0.484 ms is within 4 ms)
        const slowGrid = table([1, 1, 1, 1]);
        expect(suggestedExactMaxNodes(sizes, exact, slowGrid)).toBe(8192);
        expect(suggestedExactMaxNodes(sizes, exact, slowGrid)).toBe(twin(sizes, exact, slowGrid));
        // a tie keeps the size (not SLOWER than the grid)
        expect(suggestedExactMaxNodes([4096], { 4096: 0.2 }, { 4096: 0.2 })).toBe(4096);
        // a non-power-of-two probe rounds down
        expect(suggestedExactMaxNodes([10_000], { 10_000: 0.5 }, { 10_000: 1 })).toBe(8192);
        // the grid faster at EVERY probe (the default sizes on the RTX 4070 SUPER): the twin throws, the function
        // answers strictly below the smallest probe -- 4096 for the defaults, distinguishable from any rule answer
        const defaults = [8192, 16384, 32768, 65536];
        const defaultExact = { 8192: 0.534, 16384: 1.169, 32768: 2.827, 65536: 9.225 };
        const defaultGrid = { 8192: 0.234, 16384: 0.255, 32768: 0.338, 65536: 0.461 };
        expect(() => twin(defaults, defaultExact, defaultGrid)).toThrow(/no rung within/);
        expect(suggestedExactMaxNodes(defaults, defaultExact, defaultGrid)).toBe(4096);
        expect(suggestedExactMaxNodes(defaults, defaultExact, defaultGrid)).toBeLessThan(floorPow2(defaults[0]));
        // every probe over the budget: the same below-the-range answer
        expect(suggestedExactMaxNodes([1000, 2000], { 1000: 5, 2000: 9 }, { 1000: 6, 2000: 10 })).toBe(512);
        // the smallest probe is 1: nothing lies strictly below it, the answer is 1
        expect(suggestedExactMaxNodes([1], { 1: 5 }, { 1: 1 })).toBe(1);
    });

    it(
        "reports finite positive times for both tiers at both sizes, the rule's answer, a positive firstCallMs; the first call compiles, a second call compiles nothing more and leaks nothing",
        async (t) => {
            requireGpu(t);
            // a fresh context (acquire): the first call compiles the tiers' pipelines
            const pipelinesAtStart = ctx.pipelines.size;
            const first = await calibrateLayout(ctx, { sizes: SIZES });
            expect(ctx.pipelines.size, "the first call compiled the tiers' pipelines").toBeGreaterThan(
                pipelinesAtStart,
            );
            expect(
                Object.keys(first.exactMsPerIter)
                    .map(Number)
                    .sort((a, b) => a - b),
            ).toEqual(SIZES);
            expect(
                Object.keys(first.gridMsPerIter)
                    .map(Number)
                    .sort((a, b) => a - b),
            ).toEqual(SIZES);
            for (const n of SIZES) {
                expect(Number.isFinite(first.exactMsPerIter[n]) && first.exactMsPerIter[n] > 0, `exact ${n}`).toBe(
                    true,
                );
                expect(Number.isFinite(first.gridMsPerIter[n]) && first.gridMsPerIter[n] > 0, `grid ${n}`).toBe(true);
            }
            expect(first.firstCallMs).toBeGreaterThan(0);
            expect(Number.isFinite(first.pairsPerSecond) && first.pairsPerSecond > 0).toBe(true);
            // the rate is pairs per second at the largest probed size; compare the quotient, not the ~1e10 value (an
            // absolute window would fail on the last ulp of a fast hardware timing)
            expect(first.pairsPerSecond / ((2048 * 2047 * 1000) / first.exactMsPerIter[2048])).toBeCloseTo(1, 12);
            // the rule: the twin's answer over the reported numbers (a power of two in [1024, 2048]), else (no probed
            // size qualifies) the largest power of two strictly below the smallest probe: 512
            const twin = twinAnswer(SIZES, first.exactMsPerIter, first.gridMsPerIter);
            expect(first.suggestedExactMaxNodes).toBe(twin ?? floorPow2(SIZES[0] - 1));
            expect(Math.log2(first.suggestedExactMaxNodes) % 1).toBe(0);
            if (twin !== null) {
                expect(first.suggestedExactMaxNodes).toBeGreaterThanOrEqual(1024);
                expect(first.suggestedExactMaxNodes).toBeLessThanOrEqual(2048);
            } else {
                expect(first.suggestedExactMaxNodes).toBe(512);
            }

            // the second call compiles nothing more (the pipeline cache does not grow; a wall-time comparison would
            // be noise on a loaded software adapter) and releases every probe
            const liveBefore = ctx.allocator.liveBuffers;
            const residentBefore = ctx.residency.stats().buffers;
            const pipelinesBefore = ctx.pipelines.size;
            const second = await calibrateLayout(ctx, { sizes: SIZES });
            expect(second.firstCallMs).toBeGreaterThan(0);
            expect(ctx.pipelines.size, "the second call compiled nothing more").toBe(pipelinesBefore);
            expect(ctx.allocator.liveBuffers, "every probe released").toBe(liveBefore);
            expect(ctx.residency.stats().buffers).toBe(residentBefore);
            expect(ctx.pool.liveBytes).toBe(0);
        },
        CASE_TIMEOUT,
    );

    it("rejects sizes that are not positive integers with E_INVALID_ARGUMENT", async (t) => {
        requireGpu(t);
        for (const sizes of [[0], [1.5], [], [-4], [Number.NaN]]) {
            await expect(calibrateLayout(ctx, { sizes })).rejects.toMatchObject({
                code: "E_INVALID_ARGUMENT",
                details: { argument: "sizes" },
            });
        }
    });
});
