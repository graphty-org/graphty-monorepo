/**
 * The exclusiveScan primitive (spec 6 row 2, 11.3; P4-T2): the row ladder 0, 1, 255, 256, 257, 4097, 65537 and 2^20
 * (the last two scaled by gpuScale) of seeded u32 in [0, 2^16) equals scanOracle bitwise with the returned total word,
 * two runs bitwise identical; all-equal values scan to 7 i; lastDispatches is 1 / 3 / 5 by level count; count 0
 * records nothing and its total word is 0; a short src / out is E_INVALID_ARGUMENT before anything is recorded; and the
 * writer case records a strided sample of the 2^20 scan as the `scan-block` / `random1m` u32 noise fixture.
 */

import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { prepareScan } from "../../src/primitives/scan.js";
import { bindingOf, uploadBuffer } from "../helpers/device.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { runScan, SCAN_SEED, scanInput, scanReport } from "../helpers/scan.js";
import { testReduceScope } from "../helpers/segmented-reduce.js";
import { scanOracle } from "../oracle/scan.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The 11.3 sizes; only the two largest are scaled (the boundary sizes must stay exact; the scaled ones keep at least two levels). */
function scanSizes(): number[] {
    return [0, 1, 255, 256, 257, 4097, Math.ceil(65_537 * gpuScale()), Math.ceil(2 ** 20 * gpuScale())];
}

/** 1 for one block, 3 for two levels, 5 for three (spec 6 row 2: one block scan per level, one add-back below the top). */
function expectedDispatches(ctx: GpuContext, count: number): number {
    const wg = ctx.workgroupSize;
    if (count === 0) {
        return 0;
    }
    if (count <= wg) {
        return 1;
    }
    return count <= wg * wg ? 3 : 5;
}

/** Every 1024th word of `out` and the total: the committed fixture of the 2^20 scan (the whole output would be 18 MB of JSON). */
const FIXTURE_STRIDE = 1024;

describe("exclusiveScan (spec 6 row 2; P4-T2): equals the oracle bitwise, twice bitwise", () => {
    it("the row ladder 0, 1, 255, 256, 257, 4097 and the scaled 65537 / 2^20: out and the total word equal scanOracle; two runs bitwise equal", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan" });
        try {
            for (const count of scanSizes()) {
                const values = scanInput(count, SCAN_SEED + count);
                const first = await runScan(ctx, values);
                const second = await runScan(ctx, values);
                expectBitwiseEqual(first.out, second.out, `count ${count}: twice`);
                expect(first.total, `count ${count}: total twice`).toBe(second.total);
                const want = scanOracle(values);
                expectBitwiseEqual(first.out, want.out, `count ${count}: vs oracle`);
                expect(first.total, `count ${count}: total`).toBe(want.total);
                expect(first.dispatches, `count ${count}: dispatches`).toBe(expectedDispatches(ctx, count));
                assertCheckPasses(await scanReport(ctx, count));
            }
        } finally {
            ctx.dispose();
        }
    });

    it("all-equal values (7 everywhere, 4097 items): out[i] = 7 i, total 7 x 4097", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan-equal" });
        try {
            const values = new Uint32Array(4097).fill(7);
            const run = await runScan(ctx, values);
            for (let i = 0; i < values.length; i++) {
                if (run.out[i] !== 7 * i) {
                    throw new Error(`out[${i}] = ${run.out[i]}, expected ${7 * i}`);
                }
            }
            expect(run.total).toBe(7 * 4097);
        } finally {
            ctx.dispose();
        }
    });

    it("lastDispatches is 1 for one block, 3 for two levels, 5 for three", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan-levels" });
        try {
            const wg = ctx.workgroupSize;
            const cases: [number, number][] = [
                [1, 1],
                [wg, 1],
                [wg + 1, 3],
                [wg * wg, 3],
                [wg * wg + 1, 5],
            ];
            for (const [count, dispatches] of cases) {
                const run = await runScan(ctx, scanInput(count, SCAN_SEED + count));
                expect(run.dispatches, `count ${count}`).toBe(dispatches);
            }
        } finally {
            ctx.dispose();
        }
    });

    it("count 0 records nothing and the total word is 0", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan-empty" });
        try {
            const run = await runScan(ctx, new Uint32Array(0));
            expect(run.dispatches).toBe(0);
            expect(run.out).toHaveLength(0);
            expect(run.total).toBe(0);
        } finally {
            ctx.dispose();
        }
    });

    it("a short src / out or a bad count is E_INVALID_ARGUMENT before anything is recorded", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan-errors" });
        const scope = testReduceScope(ctx);
        const small = uploadBuffer(ctx, new Uint32Array(8), "scan/small");
        const out = uploadBuffer(ctx, new Uint32Array(4), "scan/out-small");
        try {
            const planner = await prepareScan(scope);
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            const argumentOf = (fn: () => void): string | null => {
                try {
                    fn();
                    return null;
                } catch (e) {
                    if (isWebGpuGraphError(e) && e.code === "E_INVALID_ARGUMENT") {
                        return String(e.details.argument);
                    }
                    throw e;
                }
            };
            expect(argumentOf(() => planner.record(pass, bindingOf(small), 8, bindingOf(out)))).toBe("out");
            expect(argumentOf(() => planner.record(pass, bindingOf(small), 9, bindingOf(small)))).toBe("src");
            expect(argumentOf(() => planner.record(pass, bindingOf(small), -1, bindingOf(small)))).toBe("count");
            expect(argumentOf(() => planner.record(pass, bindingOf(small), 1.5, bindingOf(small)))).toBe("count");
            expect(argumentOf(() => planner.record(pass, bindingOf(small), 2 ** 32, bindingOf(small)))).toBe("count");
            expect(planner.lastDispatches).toBe(0);
            // the boundary is accepted: 4 words into a 4-word out
            expect(argumentOf(() => planner.record(pass, bindingOf(small), 4, bindingOf(out)))).toBeNull();
            expect(planner.lastDispatches).toBe(1);
            pass.end();
        } finally {
            scope.dispose();
            small.destroy();
            out.destroy();
            ctx.dispose();
        }
    });

    it("records the random1m u32 fixture of this adapter: every 1024th word of the 2^20 scan and its total (GRAPHTY_NOISE_FLOOR_WRITE=1 only)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan-noise" });
        try {
            const count = 2 ** 20;
            const values = scanInput(count, SCAN_SEED + count);
            const run = await runScan(ctx, values);
            const want = scanOracle(values);
            expectBitwiseEqual(run.out, want.out, "random1m vs oracle");
            expect(run.total).toBe(want.total);
            const sample = new Uint32Array(count / FIXTURE_STRIDE + 1);
            for (let i = 0; i < count / FIXTURE_STRIDE; i++) {
                sample[i] = run.out[i * FIXTURE_STRIDE];
            }
            sample[sample.length - 1] = run.total;
            writeNoiseFixture("scan-block", "random1m", adapterClass(ctx.caps), sample, "u32");
        } finally {
            ctx.dispose();
        }
    });
});
