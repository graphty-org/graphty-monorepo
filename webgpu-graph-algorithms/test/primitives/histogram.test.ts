/**
 * The histogram and countingSortByKey primitives (spec 6 row 5, 11.3, 13 row P4 "equal their oracles with one hot
 * bucket"; P4-T3): 2^20 x gpuScale seeded keys over 4096 bins equal histogramOracle bitwise, twice bitwise; ONE HOT
 * BUCKET (every key = bins - 1, the 1M-entry hub cell) over bins 1 / 256 / 4096 / 262146 puts `count` in the last bin
 * and 0 elsewhere; the counting sort's outStart equals the oracle's bitwise, outIndex is a permutation and the key
 * sequence keys[outIndex[j]] is non-decreasing and equals the stable oracle's bitwise (the index order inside a bin is
 * set-deterministic and never asserted); count 0 records the fills and the scan and leaves hist / outStart zero; a
 * short hist / outIndex is E_INVALID_ARGUMENT before anything is recorded; the writer case records the two u32 noise
 * fixtures of this adapter.
 */

import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { prepareCountingSort, prepareHistogram } from "../../src/primitives/histogram.js";
import { bindingOf, uploadBuffer } from "../helpers/device.js";
import {
    countingSortReport,
    HIST_SEED,
    histKeys,
    histogramReport,
    isPermutation,
    keySequence,
    runCountingSort,
    runHistogram,
} from "../helpers/histogram.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { testReduceScope } from "../helpers/segmented-reduce.js";
import { countingSortOracle, histogramOracle } from "../oracle/histogram.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The bins of the seeded cases (the radix digit range of a 12-bit key). */
const BINS = 4096;

/** The hot-bucket bin counts: one bin, a radix digit range, BINS, and the 2D grid's cells + 2 at G = 512. */
const HOT_BINS: readonly number[] = [1, 256, 4096, 262146];

/** Every 1024th word of the 2^20 key sequence: the committed fixture (the whole sequence would be megabytes of JSON, the scan precedent). */
const FIXTURE_STRIDE = 1024;

/** The scaled key count of the seeded cases. */
function keyCount(): number {
    return Math.ceil(2 ** 20 * gpuScale());
}

/** The scan's dispatch count over `bins` words on this context: 1 / 3 / 5 by level count (the scan test's rule). */
function scanDispatches(ctx: GpuContext, bins: number): number {
    const wg = ctx.workgroupSize;
    if (bins <= wg) {
        return 1;
    }
    return bins <= wg * wg ? 3 : 5;
}

describe("histogram and countingSortByKey (spec 6 row 5; P4-T3): equal their oracles bitwise, twice bitwise", () => {
    it("2^20 x gpuScale seeded keys over 4096 bins: hist equals histogramOracle bitwise; two runs bitwise equal", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "histogram" });
        try {
            const count = keyCount();
            const keys = histKeys(count, BINS, HIST_SEED + count);
            const first = await runHistogram(ctx, keys, BINS);
            const second = await runHistogram(ctx, keys, BINS);
            expectBitwiseEqual(first.hist, second.hist, "twice");
            expectBitwiseEqual(first.hist, histogramOracle(keys, BINS), "vs oracle");
            expect(first.dispatches).toBe(2);
            assertCheckPasses(await histogramReport(ctx, count, BINS));
        } finally {
            ctx.dispose();
        }
    });

    it("one hot bucket (every key = bins - 1) over bins 1 / 256 / 4096 / 262146: hist[bins - 1] = count, 0 elsewhere, bitwise, twice", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "histogram-hot" });
        try {
            const count = keyCount();
            for (const bins of HOT_BINS) {
                const keys = new Uint32Array(count).fill(bins - 1);
                const first = await runHistogram(ctx, keys, bins);
                const second = await runHistogram(ctx, keys, bins);
                expectBitwiseEqual(first.hist, second.hist, `bins ${bins}: twice`);
                const want = new Uint32Array(bins);
                want[bins - 1] = count;
                expectBitwiseEqual(first.hist, want, `bins ${bins}: vs the hot bucket`);
            }
        } finally {
            ctx.dispose();
        }
    });

    it("countingSortByKey: outStart equals the oracle's bitwise, outIndex is a permutation, the key sequence is non-decreasing and equals the stable oracle's bitwise; two runs give the same key sequence", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "counting-sort" });
        try {
            const count = keyCount();
            const keys = histKeys(count, BINS, HIST_SEED + count);
            const first = await runCountingSort(ctx, keys, BINS);
            const second = await runCountingSort(ctx, keys, BINS);
            const want = countingSortOracle(keys, BINS);
            expectBitwiseEqual(first.outStart, second.outStart, "outStart twice");
            expectBitwiseEqual(first.outStart, want.outStart, "outStart vs oracle");
            expect(isPermutation(first.outIndex, count), "outIndex is a permutation").toBe(true);
            const seq = keySequence(keys, first.outIndex);
            for (let j = 1; j < count; j++) {
                if (!(seq[j] >= seq[j - 1])) {
                    throw new Error(`key sequence decreases at ${j}: ${seq[j - 1]} then ${seq[j]}`);
                }
            }
            expectBitwiseEqual(seq, keySequence(keys, second.outIndex), "key sequence twice");
            expectBitwiseEqual(seq, keySequence(keys, want.outIndex), "key sequence vs oracle");
            expect(first.dispatches).toBe(2 + scanDispatches(ctx, BINS) + 1 + 1);
            assertCheckPasses(await countingSortReport(ctx, count, BINS));
        } finally {
            ctx.dispose();
        }
    });

    it("count 0: the histogram records only the fill (hist is zero); the sort records the fills and the scan (outStart is zero)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "histogram-empty" });
        try {
            const hist = await runHistogram(ctx, new Uint32Array(0), 7);
            expect(hist.dispatches).toBe(1);
            expectBitwiseEqual(hist.hist, new Uint32Array(7), "hist zero");
            const sort = await runCountingSort(ctx, new Uint32Array(0), 7);
            expect(sort.dispatches).toBe(1 + scanDispatches(ctx, 7) + 1);
            expectBitwiseEqual(sort.outStart, new Uint32Array(7), "outStart zero");
            expect(sort.outIndex).toHaveLength(0);
        } finally {
            ctx.dispose();
        }
    });

    it("a hist shorter than 4 x bins, an outIndex shorter than 4 x count, or a bad count / bins is E_INVALID_ARGUMENT before anything is recorded", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "histogram-errors" });
        const scope = testReduceScope(ctx);
        const eight = uploadBuffer(ctx, new Uint32Array(8), "hist/eight");
        const four = uploadBuffer(ctx, new Uint32Array(4), "hist/four");
        try {
            const histogram = await prepareHistogram(scope);
            const sort = await prepareCountingSort(scope);
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
            const b8 = bindingOf(eight);
            const b4 = bindingOf(four);
            expect(argumentOf(() => histogram.record(pass, b8, 8, 5, b4))).toBe("hist");
            expect(argumentOf(() => histogram.record(pass, b4, 5, 4, b8))).toBe("keys");
            expect(argumentOf(() => histogram.record(pass, b8, 8, 0, b8))).toBe("bins");
            expect(argumentOf(() => histogram.record(pass, b8, -1, 4, b8))).toBe("count");
            expect(argumentOf(() => histogram.record(pass, b8, 1.5, 4, b8))).toBe("count");
            expect(argumentOf(() => histogram.record(pass, b8, 2 ** 32, 4, b8))).toBe("count");
            expect(histogram.lastDispatches).toBe(0);
            const scratch = { hist: b4, cursor: b4 };
            expect(argumentOf(() => sort.record(pass, b8, 8, 4, scratch, b4, b4))).toBe("outIndex");
            expect(argumentOf(() => sort.record(pass, b8, 8, 5, scratch, b8, b8))).toBe("hist");
            expect(argumentOf(() => sort.record(pass, b8, 8, 5, { hist: b8, cursor: b4 }, b8, b8))).toBe("cursor");
            expect(argumentOf(() => sort.record(pass, b8, 8, 5, { hist: b8, cursor: b8 }, b8, b4))).toBe("outStart");
            expect(sort.lastDispatches).toBe(0);
            // the boundaries are accepted: 8 keys over 4 bins into a 4-word hist
            expect(argumentOf(() => histogram.record(pass, b8, 8, 4, b4))).toBeNull();
            expect(histogram.lastDispatches).toBe(2);
            pass.end();
        } finally {
            scope.dispose();
            eight.destroy();
            four.destroy();
            ctx.dispose();
        }
    });

    it("records the random1m-4096 u32 fixtures of this adapter: the histogram and every 1024th word of the sorted key sequence (GRAPHTY_NOISE_FLOOR_WRITE=1 only)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "histogram-noise" });
        try {
            const count = 2 ** 20;
            const keys = histKeys(count, BINS, HIST_SEED + count);
            const hist = await runHistogram(ctx, keys, BINS);
            expectBitwiseEqual(hist.hist, histogramOracle(keys, BINS), "random1m-4096 vs oracle");
            const sort = await runCountingSort(ctx, keys, BINS);
            const seq = keySequence(keys, sort.outIndex);
            expectBitwiseEqual(
                seq,
                keySequence(keys, countingSortOracle(keys, BINS).outIndex),
                "key sequence vs oracle",
            );
            const sample = new Uint32Array(count / FIXTURE_STRIDE);
            for (let i = 0; i < sample.length; i++) {
                sample[i] = seq[i * FIXTURE_STRIDE];
            }
            const cls = adapterClass(ctx.caps);
            writeNoiseFixture("histogram", "random1m-4096", cls, hist.hist, "u32");
            writeNoiseFixture("counting-scatter", "random1m-4096-keys", cls, sample, "u32");
        } finally {
            ctx.dispose();
        }
    });
});
