/**
 * The radixSort primitive (spec 6 row 6, 13 row P4 gate item 10; P4-T4, PD-5): for every key width 8 / 16 / 24 / 32
 * and every size of the ladder 0, 1, 255, 256, 257, 4097 and the scaled 65537 / 2^22, seeded random keys with
 * `vals = index` sort to radixSortOracle bitwise (keys AND vals: stability is what makes vals deterministic), two runs
 * bitwise identical; all-equal keys leave vals the identity permutation; sorted and reverse-sorted keys; the result
 * pair is the scratch pair for 8 / 24 bits and the input pair for 16 / 32; lastDispatches is passes x (2 + the scan's
 * dispatches); a short scratch.hist or scratch.offsets is E_INVALID_ARGUMENT before anything is recorded; and the
 * writer case records the 2^20 sort at 24 bits as the `radix-scatter` / `random1m-24` and `radix-hist` /
 * `random1m-24-table` u32 noise fixtures (strided, as the scan's random1m fixture is; the table is the raw last-pass
 * histogram, unscanned).
 */

import { type U32 } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { prepareRadixSort, type RadixBits, radixHistBytes } from "../../src/primitives/radix-sort.js";
import { prepareScan } from "../../src/primitives/scan.js";
import { bindingOf, uploadBuffer } from "../helpers/device.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { identityVals, RADIX_SEED, radixKeys, radixReport, runRadixSort } from "../helpers/radix-sort.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { testReduceScope } from "../helpers/segmented-reduce.js";
import { radixSortOracle } from "../oracle/radix-sort.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const BITS: readonly RadixBits[] = [8, 16, 24, 32];

/** The gate's sizes; only the two largest are scaled (the boundary sizes stay exact). */
function radixSizes(): number[] {
    return [0, 1, 255, 256, 257, 4097, Math.ceil(65_537 * gpuScale()), Math.ceil(2 ** 22 * gpuScale())];
}

/** Every 1024th word: the committed fixture of the 2^20 sort (the whole output would be 11 MB of JSON per adapter). */
const FIXTURE_STRIDE = 1024;

/**
 * Sorts once on the GPU and once on the oracle and asserts both pairs equal bitwise.
 * @param ctx - the context
 * @param keys - the keys
 * @param vals - the values
 * @param bits - the key width
 * @param label - the failure label
 */
async function expectSorted(ctx: GpuContext, keys: U32, vals: U32, bits: RadixBits, label: string): Promise<void> {
    const first = await runRadixSort(ctx, keys, vals, bits);
    const second = await runRadixSort(ctx, keys, vals, bits);
    expectBitwiseEqual(first.keys, second.keys, `${label}: keys twice`);
    expectBitwiseEqual(first.vals, second.vals, `${label}: vals twice`);
    const want = radixSortOracle(keys, vals, bits);
    expectBitwiseEqual(first.keys, want.keys, `${label}: keys vs oracle`);
    expectBitwiseEqual(first.vals, want.vals, `${label}: vals vs oracle`);
}

describe("radixSort (spec 6 row 6; P4-T4): equals the stable oracle bitwise, twice bitwise", () => {
    for (const bits of BITS) {
        it(`bits ${bits}: the ladder 0, 1, 255, 256, 257, 4097 and the scaled 65537 / 2^22 of random keys with vals = index equal radixSortOracle; two runs bitwise equal`, async (t) => {
            requireGpu(t);
            const ctx = await acquire({ label: `radix-${bits}` });
            try {
                for (const count of radixSizes()) {
                    const keys = radixKeys(count, RADIX_SEED + count);
                    await expectSorted(ctx, keys, identityVals(count), bits, `bits ${bits} count ${count}`);
                }
            } finally {
                ctx.dispose();
            }
        });
    }

    it("all-equal keys (0x00ABCDEF everywhere at the scaled 2^20): vals come back as the identity permutation (stable)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "radix-equal" });
        try {
            const count = Math.ceil(2 ** 20 * gpuScale());
            const keys = new Uint32Array(count).fill(0x00abcdef);
            const vals = identityVals(count);
            for (const bits of BITS) {
                const run = await runRadixSort(ctx, keys, vals, bits);
                expectBitwiseEqual(run.keys, keys, `bits ${bits}: keys`);
                expectBitwiseEqual(run.vals, vals, `bits ${bits}: vals are the identity`);
            }
        } finally {
            ctx.dispose();
        }
    });

    it("keys already sorted and keys reverse-sorted (4097 pairs, every width)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "radix-sorted" });
        try {
            const count = 4097;
            const sorted = radixKeys(count, RADIX_SEED + count).sort();
            const reversed = Uint32Array.from(sorted).reverse();
            for (const bits of BITS) {
                await expectSorted(ctx, sorted, identityVals(count), bits, `bits ${bits} sorted`);
                await expectSorted(ctx, reversed, identityVals(count), bits, `bits ${bits} reversed`);
            }
        } finally {
            ctx.dispose();
        }
    });

    it("the result pair is the scratch pair for bits 8 / 24 and the input pair for 16 / 32", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "radix-pair" });
        const scope = testReduceScope(ctx);
        const count = 300;
        const keys = uploadBuffer(ctx, radixKeys(count, 1), "radix/keys");
        const vals = uploadBuffer(ctx, identityVals(count), "radix/vals");
        const sKeys = uploadBuffer(ctx, new Uint32Array(count), "radix/s-keys");
        const sVals = uploadBuffer(ctx, new Uint32Array(count), "radix/s-vals");
        const sHist = uploadBuffer(ctx, new Uint32Array(radixHistBytes(count, ctx.workgroupSize) / 4), "radix/s-hist");
        const sOffsets = uploadBuffer(
            ctx,
            new Uint32Array(radixHistBytes(count, ctx.workgroupSize) / 4),
            "radix/s-offsets",
        );
        try {
            const planner = await prepareRadixSort(scope);
            const scratch = {
                keys: bindingOf(sKeys),
                vals: bindingOf(sVals),
                hist: bindingOf(sHist),
                offsets: bindingOf(sOffsets),
            };
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            for (const bits of BITS) {
                const result = planner.record(pass, bindingOf(keys), bindingOf(vals), count, bits, scratch);
                const expectScratch = bits === 8 || bits === 24;
                expect(result.keys.buffer, `bits ${bits}: keys`).toBe(expectScratch ? sKeys : keys);
                expect(result.vals.buffer, `bits ${bits}: vals`).toBe(expectScratch ? sVals : vals);
            }
            pass.end();
            ctx.device.queue.submit([encoder.finish()]);
            await ctx.device.queue.onSubmittedWorkDone();
        } finally {
            scope.dispose();
            keys.destroy();
            vals.destroy();
            sKeys.destroy();
            sVals.destroy();
            sHist.destroy();
            sOffsets.destroy();
            ctx.dispose();
        }
    });

    it("lastDispatches is passes x (2 + the scan's dispatches over the 256 x groups table); 0 for count 0", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "radix-dispatches" });
        const scope = testReduceScope(ctx);
        try {
            const scan = await prepareScan(scope);
            const wg = ctx.workgroupSize;
            for (const count of [1, wg, wg + 1, 4097, wg * wg + 1]) {
                const table = 256 * Math.ceil(count / wg);
                const probeSrc = uploadBuffer(ctx, new Uint32Array(table), "radix/scan-probe-src");
                const probeOut = uploadBuffer(ctx, new Uint32Array(table), "radix/scan-probe-out");
                const encoder = ctx.device.createCommandEncoder();
                const pass = encoder.beginComputePass();
                scan.record(pass, bindingOf(probeSrc), table, bindingOf(probeOut)); // recorded, never submitted: only the count matters
                pass.end();
                probeSrc.destroy();
                probeOut.destroy();
                const scanDispatches = scan.lastDispatches;
                for (const bits of BITS) {
                    const run = await runRadixSort(ctx, radixKeys(count, count), identityVals(count), bits);
                    expect(run.dispatches, `count ${count} bits ${bits}`).toBe((bits / 8) * (2 + scanDispatches));
                }
            }
            const empty = await runRadixSort(ctx, new Uint32Array(0), new Uint32Array(0), 24);
            expect(empty.dispatches).toBe(0);
            expect(empty.resultPair).toBe("input");
            expect(empty.keys).toHaveLength(0);
        } finally {
            scope.dispose();
            ctx.dispose();
        }
    });

    it("a scratch.hist or scratch.offsets shorter than radixHistBytes, a short pair, a bad count or a bad width is E_INVALID_ARGUMENT before anything is recorded", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "radix-errors" });
        const scope = testReduceScope(ctx);
        const count = ctx.workgroupSize + 1; // two groups
        const okHist = uploadBuffer(
            ctx,
            new Uint32Array(radixHistBytes(count, ctx.workgroupSize) / 4),
            "radix/hist-ok",
        );
        const okOffsets = uploadBuffer(
            ctx,
            new Uint32Array(radixHistBytes(count, ctx.workgroupSize) / 4),
            "radix/offsets-ok",
        );
        const shortHist = uploadBuffer(
            ctx,
            new Uint32Array(radixHistBytes(count, ctx.workgroupSize) / 4 - 1),
            "radix/hist-short",
        );
        const pairs = [0, 1, 2, 3].map((i) => uploadBuffer(ctx, new Uint32Array(count), `radix/pair${i}`));
        const shortPair = uploadBuffer(ctx, new Uint32Array(count - 1), "radix/pair-short");
        try {
            const planner = await prepareRadixSort(scope);
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            const [keys, vals, sKeys, sVals] = pairs.map(bindingOf);
            const scratchOk = { keys: sKeys, vals: sVals, hist: bindingOf(okHist), offsets: bindingOf(okOffsets) };
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
            expect(
                argumentOf(() =>
                    planner.record(pass, keys, vals, count, 24, { ...scratchOk, hist: bindingOf(shortHist) }),
                ),
            ).toBe("scratch.hist");
            expect(
                argumentOf(() =>
                    planner.record(pass, keys, vals, count, 24, { ...scratchOk, offsets: bindingOf(shortHist) }),
                ),
            ).toBe("scratch.offsets");
            expect(argumentOf(() => planner.record(pass, bindingOf(shortPair), vals, count, 24, scratchOk))).toBe(
                "keys",
            );
            expect(argumentOf(() => planner.record(pass, keys, bindingOf(shortPair), count, 24, scratchOk))).toBe(
                "vals",
            );
            expect(
                argumentOf(() =>
                    planner.record(pass, keys, vals, count, 24, { ...scratchOk, keys: bindingOf(shortPair) }),
                ),
            ).toBe("scratch.keys");
            expect(
                argumentOf(() =>
                    planner.record(pass, keys, vals, count, 24, { ...scratchOk, vals: bindingOf(shortPair) }),
                ),
            ).toBe("scratch.vals");
            expect(argumentOf(() => planner.record(pass, keys, vals, -1, 24, scratchOk))).toBe("count");
            expect(argumentOf(() => planner.record(pass, keys, vals, 1.5, 24, scratchOk))).toBe("count");
            expect(argumentOf(() => planner.record(pass, keys, vals, 2 ** 32, 24, scratchOk))).toBe("count");
            expect(
                argumentOf(() => planner.record(pass, keys, vals, count, 12 as unknown as RadixBits, scratchOk)),
            ).toBe("bits");
            expect(planner.lastDispatches).toBe(0);
            // the boundary is accepted: exactly radixHistBytes
            expect(argumentOf(() => planner.record(pass, keys, vals, count, 8, scratchOk))).toBeNull();
            expect(planner.lastDispatches).toBeGreaterThan(0);
            pass.end();
        } finally {
            scope.dispose();
            okHist.destroy();
            okOffsets.destroy();
            shortHist.destroy();
            for (const p of pairs) {
                p.destroy();
            }
            shortPair.destroy();
            ctx.dispose();
        }
    });

    it("records the random1m-24 u32 fixtures of this adapter: every 1024th sorted key and every 1024th word of the last pass's raw (unscanned) histogram table (GRAPHTY_NOISE_FLOOR_WRITE=1 only)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "radix-noise" });
        try {
            const count = 2 ** 20;
            const keys = radixKeys(count, RADIX_SEED + count);
            const vals = identityVals(count);
            const run = await runRadixSort(ctx, keys, vals, 24);
            const want = radixSortOracle(keys, vals, 24);
            expectBitwiseEqual(run.keys, want.keys, "random1m-24 keys vs oracle");
            expectBitwiseEqual(run.vals, want.vals, "random1m-24 vals vs oracle");
            const sample = (words: Uint32Array): Uint32Array => {
                const out = new Uint32Array(Math.ceil(words.length / FIXTURE_STRIDE));
                for (let i = 0; i < out.length; i++) {
                    out[i] = words[i * FIXTURE_STRIDE];
                }
                return out;
            };
            const cls = adapterClass(ctx.caps);
            writeNoiseFixture("radix-scatter", "random1m-24", cls, sample(run.keys), "u32");
            writeNoiseFixture("radix-hist", "random1m-24-table", cls, sample(run.histTable), "u32");
        } finally {
            ctx.dispose();
        }
    });

    it("the sabotage report of the 4097 / 24-bit case is exact (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "radix-report" });
        try {
            const report = await radixReport(ctx, 4097, 24);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });
});
