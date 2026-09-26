/**
 * The compact / dedupe primitive (spec 6 row 4, 11.3; P8-T3): the ladder 0, 1, 255, 256, 257, 4097 and the scaled
 * 4 x 65536 under the four flag patterns equals compactOracle bitwise on `out` and on the count word, two runs
 * bitwise identical; the same ladder under the three dedupe patterns, with `owner` poisoned once and NEVER cleared
 * between cases, has exactly the oracle's surviving SET (sorted, since which index survives is last-writer-wins),
 * two runs identical in sorted form; `outIndex` writes one word of a 24-word block and leaves the other 23 alone;
 * `countIndex` reads the entry count from a device word clamped to `count`, through the direct and the indirect
 * form; count 0 records nothing and the count word keeps its prior value; a bad argument is E_INVALID_ARGUMENT
 * naming it before anything is recorded; and COMPACT_PARAMS has the pinned 16-byte layout.
 */

import { U32_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { COMPACT_PARAMS } from "../../src/kernels.js";
import { type DedupeRecord, prepareCompact } from "../../src/primitives/compact.js";
import {
    compactQueue,
    compactReport,
    DEDUPE_PATTERNS,
    dedupeQueue,
    dedupeReport,
    FLAG_PATTERNS,
    flagsOf,
    POISON,
    runCompact,
    runDedupe,
    sortedU32,
} from "../helpers/compact.js";
import { bindingOf, uploadBuffer } from "../helpers/device.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { testReduceScope } from "../helpers/segmented-reduce.js";
import { compactOracle, dedupeOracle } from "../oracle/compact.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The 11.3 sizes; only the largest is scaled (the boundary sizes must stay exact). */
function sizes(): number[] {
    return [0, 1, 255, 256, 257, 4097, Math.ceil(4 * 65_536 * gpuScale())];
}

/** compact's dispatches: the scan's `2 x levels - 1` plus the scatter, so 2 x levels; 0 for count 0. */
function expectedCompactDispatches(ctx: GpuContext, count: number): number {
    const wg = ctx.workgroupSize;
    if (count === 0) {
        return 0;
    }
    if (count <= wg) {
        return 2;
    }
    return count <= wg * wg ? 4 : 6;
}

/** A 24-word block: every word poisoned except `zeroAt`, which dedupe's atomicAdd needs at 0. */
function block24(zeroAt?: number): Uint32Array<ArrayBuffer> {
    const block = new Uint32Array(24).fill(POISON);
    if (zeroAt !== undefined) {
        block[zeroAt] = 0;
    }
    return block;
}

/** The argument name of the E_INVALID_ARGUMENT `fn` throws, or null when it does not throw. */
function argumentOf(fn: () => void): string | null {
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

describe("compact / dedupe (spec 6 row 4; P8-T3): equals the oracle, twice bitwise", () => {
    it("COMPACT_PARAMS is a 16-byte uniform: count @0, outIndex @4, countIndex @8, stride @12", () => {
        expect(COMPACT_PARAMS.name).toBe("CompactParams");
        expect(COMPACT_PARAMS.layout).toBe("uniform");
        expect(COMPACT_PARAMS.byteLength).toBe(16);
        expect(COMPACT_PARAMS.fields.map((f) => f[0])).toEqual(["count", "outIndex", "countIndex", "stride"]);
        expect(["count", "outIndex", "countIndex", "stride"].map((f) => COMPACT_PARAMS.offsetOf(f))).toEqual([
            0, 4, 8, 12,
        ]);
    });

    it("compact: the ladder under the four flag patterns equals compactOracle on out and on the count word, two runs bitwise equal, 2 x scan levels dispatches", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "compact" });
        try {
            for (const count of sizes()) {
                const queue = compactQueue(count);
                for (const pattern of FLAG_PATTERNS) {
                    const flags = flagsOf(count, pattern);
                    const label = `count ${count} ${pattern}`;
                    const first = await runCompact(ctx, queue, flags);
                    const second = await runCompact(ctx, queue, flags);
                    expectBitwiseEqual(first.out, second.out, `${label}: out twice`);
                    expect(first.count, `${label}: count twice`).toBe(second.count);
                    const want = compactOracle(queue, flags);
                    // count 0 records nothing, so the count word keeps the poison it was uploaded with
                    expect(first.count, `${label}: count word`).toBe(count === 0 ? POISON : want.count);
                    expectBitwiseEqual(first.out.subarray(0, want.count), want.out, `${label}: out vs oracle`);
                    for (let i = want.count; i < count; i++) {
                        expect(first.out[i], `${label}: out[${i}] past the prefix`).toBe(POISON);
                    }
                    expect(first.dispatches, `${label}: dispatches`).toBe(expectedCompactDispatches(ctx, count));
                }
            }
            assertCheckPasses(await compactReport(ctx, 4097));
        } finally {
            ctx.dispose();
        }
    });

    it("dedupe: the ladder under the three patterns, owner poisoned once and never cleared: the surviving set equals dedupeOracle's, sorted output bitwise equal twice, 2 dispatches", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "dedupe" });
        const ladder = sizes();
        const owner = uploadBuffer(ctx, new Uint32Array(Math.max(...ladder, 1)).fill(POISON), "dedupe/owner-shared");
        try {
            for (const count of ladder) {
                for (const pattern of DEDUPE_PATTERNS) {
                    const queue = dedupeQueue(count, pattern);
                    const label = `count ${count} ${pattern}`;
                    const first = await runDedupe(ctx, queue, count, { owner });
                    const second = await runDedupe(ctx, queue, count, { owner });
                    const want = sortedU32(dedupeOracle(queue));
                    expect(first.count, `${label}: count word`).toBe(want.length);
                    expect(second.count, `${label}: count twice`).toBe(want.length);
                    const survivors = sortedU32(first.out.subarray(0, first.count));
                    expectBitwiseEqual(survivors, want, `${label}: survivors vs oracle`);
                    expectBitwiseEqual(
                        survivors,
                        sortedU32(second.out.subarray(0, second.count)),
                        `${label}: sorted twice`,
                    );
                    for (let i = first.count; i < count; i++) {
                        expect(first.out[i], `${label}: out[${i}] past the prefix`).toBe(POISON);
                    }
                    expect(first.dispatches, `${label}: dispatches`).toBe(count === 0 ? 0 : 2);
                }
            }
            assertCheckPasses(await dedupeReport(ctx, 4097));
        } finally {
            owner.destroy();
            ctx.dispose();
        }
    });

    it("outIndex: a 24-word block bound whole as outCount, word 7 alone changes (compact and dedupe)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "compact-out-index" });
        try {
            const count = 4097;
            const queue = compactQueue(count);
            const flags = flagsOf(count, "alternating");
            const compact = await runCompact(ctx, queue, flags, { block: block24(), outIndex: 7 });
            expect(compact.count).toBe(compactOracle(queue, flags).count);
            expect(compact.block[7]).toBe(2049);
            compact.block.forEach((word, k) => {
                if (k !== 7) {
                    expect(word, `compact block[${k}]`).toBe(POISON);
                }
            });
            const vertices = dedupeQueue(count, "repeat1000");
            const dedupe = await runDedupe(ctx, vertices, count, { block: block24(7), outIndex: 7 });
            expect(dedupe.block[7]).toBe(dedupeOracle(vertices).length);
            dedupe.block.forEach((word, k) => {
                if (k !== 7) {
                    expect(word, `dedupe block[${k}]`).toBe(POISON);
                }
            });
        } finally {
            ctx.dispose();
        }
    });

    it("countIndex: word 1 = 1,000 with count 4,097 considers the first 1,000 entries; count 500 clamps to 500; the indirect form reads the same word", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "dedupe-count-index" });
        try {
            const count = 4097;
            const queue = dedupeQueue(count, "distinct");
            const block = block24(7);
            block[1] = 1000;
            const cases: { readonly capacity: number; readonly considered: number }[] = [
                { capacity: count, considered: 1000 },
                { capacity: 500, considered: 500 },
            ];
            for (const c of cases) {
                const label = `capacity ${c.capacity}`;
                const run = await runDedupe(ctx, queue, count, {
                    block,
                    outIndex: 7,
                    countIndex: 1,
                    capacity: c.capacity,
                });
                const want = sortedU32(dedupeOracle(queue.subarray(0, c.considered)));
                expect(run.count, `${label}: count word`).toBe(c.considered);
                expectBitwiseEqual(sortedU32(run.out.subarray(0, run.count)), want, `${label}: survivors`);
                expect(run.block[1], `${label}: the count word is read, not written`).toBe(1000);
                expect(run.dispatches, `${label}: dispatches`).toBe(2);
            }
        } finally {
            ctx.dispose();
        }
    });

    it("count 0 records nothing and outCount[outIndex] keeps its prior value", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "compact-empty" });
        try {
            const compact = await runCompact(ctx, new Uint32Array(0), new Uint32Array(0), {
                block: Uint32Array.of(42),
            });
            expect(compact.dispatches).toBe(0);
            expect(compact.out).toHaveLength(0);
            expect(compact.count).toBe(42);
            const dedupe = await runDedupe(ctx, new Uint32Array(0), 0, { block: Uint32Array.of(42) });
            expect(dedupe.dispatches).toBe(0);
            expect(dedupe.out).toHaveLength(0);
            expect(dedupe.count).toBe(42);
        } finally {
            ctx.dispose();
        }
    });

    it("a bad count, a short binding, an out-of-block index, a count word that is the output word or lives in another block, or a slot outside args is E_INVALID_ARGUMENT naming it, before anything is recorded", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "compact-errors" });
        const scope = testReduceScope(ctx);
        const eight = uploadBuffer(ctx, new Uint32Array(8), "compact/eight");
        const flags8 = uploadBuffer(ctx, new Uint32Array(8), "compact/flags8");
        const out8 = uploadBuffer(ctx, new Uint32Array(8), "compact/out8");
        const four = uploadBuffer(ctx, new Uint32Array(4), "compact/four");
        const one = uploadBuffer(ctx, new Uint32Array(1), "compact/one");
        try {
            const planner = await prepareCompact(scope);
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            const b8 = bindingOf(eight);
            const f8 = bindingOf(flags8);
            const o8 = bindingOf(out8);
            const b4 = bindingOf(four);
            const b1 = bindingOf(one);
            // distinct buffers in the three slots: Kernel.bind refuses one buffer bound read-only and read-write at once
            const compactWith = (count: number, flags = f8, out = o8, outIndex = 0): string | null =>
                argumentOf(() => planner.record(pass, { queue: b8, flags, count, out, outCount: b1, outIndex }));
            expect(compactWith(-1)).toBe("count");
            expect(compactWith(1.5)).toBe("count");
            expect(compactWith(2 ** 32)).toBe("count");
            expect(compactWith(9)).toBe("queue");
            expect(compactWith(8, b4)).toBe("flags");
            expect(compactWith(8, b8, b4)).toBe("out");
            expect(compactWith(8, b8, b8, 1)).toBe("outIndex");
            const record: DedupeRecord = {
                queue: b8,
                count: 8,
                countIndex: U32_MAX,
                counters: b4,
                owner: f8,
                out: o8,
                outCount: b4,
                outIndex: 0,
            };
            const dedupeWith = (patch: Partial<DedupeRecord>): string | null =>
                argumentOf(() => planner.recordDedupe(pass, { ...record, ...patch }));
            expect(dedupeWith({ count: -1 })).toBe("count");
            expect(dedupeWith({ count: 9 })).toBe("queue");
            expect(dedupeWith({ out: b4 })).toBe("out");
            expect(dedupeWith({ outIndex: 4 })).toBe("outIndex");
            expect(dedupeWith({ countIndex: 4 })).toBe("countIndex");
            expect(dedupeWith({ countIndex: 0 })).toBe("countIndex");
            expect(dedupeWith({ countIndex: 1, counters: b8 })).toBe("counters");
            expect(planner.lastDispatches).toBe(0);
            // the boundaries are accepted: 8 words into an 8-word out, the count word beside the output word
            expect(compactWith(8)).toBeNull();
            expect(planner.lastDispatches).toBe(2);
            expect(dedupeWith({ countIndex: 1 })).toBeNull();
            expect(planner.lastDispatches).toBe(2);
            pass.end();
        } finally {
            scope.dispose();
            eight.destroy();
            flags8.destroy();
            out8.destroy();
            four.destroy();
            one.destroy();
            ctx.dispose();
        }
    });
});
