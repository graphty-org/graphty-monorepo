/**
 * The compact / dedupe checks (spec 6 row 4; P8-T3) shared by test/primitives/compact.test.ts and
 * test/sabotage/compact.test.ts: the seeded inputs (a distinct-valued queue, the four flag patterns, the three dedupe
 * patterns), one recorded run of either primitive through testReduceScope on a plain encoder with the `out` buffer
 * poisoned (so an unwritten word is visible), the readback of `out` and of the whole counters block by their own
 * bindings, and the two reports the sabotage suite measures: compact's is bitwise over `out` and the count word
 * (ratioOf(|a - b|, 0): any mismatch is Infinity); dedupe's compares the SORTED survivors as a set, because which
 * index of a repeated vertex survives is last-writer-wins and only the set is fixed.
 */

import { type U32 } from "@graphty/graph-format";

import { U32_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { INDIRECT_ARGS_STRIDE } from "../../src/kernel/kernel.js";
import {
    type CompactPlanner,
    type CompactRecord,
    type DedupeRecord,
    prepareCompact,
} from "../../src/primitives/compact.js";
import { compactOracle, dedupeOracle } from "../oracle/compact.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { testReduceScope } from "./segmented-reduce.js";

/** The word every `out` buffer and every fresh `owner` buffer starts with: never a vertex index the suites use, never a count. */
export const POISON = 0xdeadbeef;

/** The four flag patterns of the compact ladder (spec 11.3 "Primitive differential"). */
type FlagPattern = "none" | "all" | "alternating" | "last";
export const FLAG_PATTERNS: readonly FlagPattern[] = Object.freeze(["none", "all", "alternating", "last"]);

/** The three dedupe patterns: every entry distinct (a derangement), every entry the same vertex, one vertex 1,000 times. */
type DedupePattern = "distinct" | "identical" | "repeat1000";
export const DEDUPE_PATTERNS: readonly DedupePattern[] = Object.freeze(["distinct", "identical", "repeat1000"]);

/** How many times the repeated vertex of `repeat1000` appears (for a queue at least that long). */
const REPEATS = 1000;

/**
 * A queue of `count` distinct u32 words: Knuth's multiplicative hash of the index (an odd multiplier is a bijection
 * on u32, so no two entries collide and a scatter that lands the wrong entry is visible).
 * @param count - the entry count
 * @returns the words
 */
export function compactQueue(count: number): U32 {
    const out = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
        out[i] = Math.imul(i, 2654435761) >>> 0;
    }
    return out;
}

/**
 * The flags of a pattern: none set, all set, every even index set (so the last index of an odd count is set), or the
 * last index alone.
 * @param count - the entry count
 * @param pattern - the pattern
 * @returns one word per entry, 0 or 1
 */
export function flagsOf(count: number, pattern: FlagPattern): U32 {
    const flags = new Uint32Array(count);
    switch (pattern) {
        case "none":
            break;
        case "all":
            flags.fill(1);
            break;
        case "alternating":
            for (let i = 0; i < count; i += 2) {
                flags[i] = 1;
            }
            break;
        case "last":
            if (count > 0) {
                flags[count - 1] = 1;
            }
            break;
        default:
            throw new Error(`flagsOf: unknown pattern ${String(pattern)}`);
    }
    return flags;
}

/**
 * A dedupe queue of `count` vertices in [0, max(count, 1)): `distinct` is the rotation `(i + 1) mod n` (a derangement
 * for n > 1, so a claim written at the entry's own index instead of its vertex's keeps nothing); `identical` is the
 * vertex `5 mod n` everywhere; `repeat1000` is that vertex at the first REPEATS positions and the REVERSED tail
 * `count + REPEATS - 1 - i` after them, distinct from each other and from the repeated vertex, reversed so that the
 * tail is a derangement too and the own-index claim keeps exactly one tail entry (its fixed point) instead of all.
 * @param count - the entry count
 * @param pattern - the pattern
 * @returns the vertices
 */
export function dedupeQueue(count: number, pattern: DedupePattern): U32 {
    const n = Math.max(count, 1);
    const repeated = 5 % n;
    const queue = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
        switch (pattern) {
            case "distinct":
                queue[i] = (i + 1) % n;
                break;
            case "identical":
                queue[i] = repeated;
                break;
            case "repeat1000":
                queue[i] = i < REPEATS ? repeated : count + REPEATS - 1 - i;
                break;
            default:
                throw new Error(`dedupeQueue: unknown pattern ${String(pattern)}`);
        }
    }
    return queue;
}

/**
 * A copy of `words` in ascending order (the set comparison of a dedupe output).
 * @param words - the words
 * @returns the sorted copy
 */
export function sortedU32(words: U32): U32 {
    return Uint32Array.from(words).sort();
}

/** One run of either primitive: the whole `out` buffer (poisoned past the written prefix), the count word, the whole counters block and the dispatch count. */
interface PrimitiveRun {
    readonly out: U32;
    readonly count: number;
    readonly block: U32;
    readonly dispatches: number;
}

/** The counters block a run binds whole as `outCount` (default: one poisoned word for compact, one zero word for dedupe) and the word it writes. */
interface CompactOptions {
    readonly block?: U32 | undefined;
    readonly outIndex?: number | undefined;
}

/** The dedupe run's knobs: the block and its output word, the device count word (U32_MAX = none), the capacity passed as `count`, a persistent `owner` buffer (never cleared), and the indirect form. */
interface DedupeOptions extends CompactOptions {
    readonly countIndex?: number | undefined;
    readonly capacity?: number | undefined;
    readonly owner?: GPUBuffer | undefined;
    readonly indirect?: boolean | undefined;
}

/**
 * Uploads `queue` and `flags`, compacts once into a poisoned `out` and reads `out`, the block and the count word back.
 * @param ctx - the context
 * @param queue - the entries
 * @param flags - one word per entry
 * @param options - the block and its output word
 * @returns the run
 */
export async function runCompact(ctx: GpuContext, queue: U32, flags: U32, options?: CompactOptions): Promise<PrimitiveRun> {
    const count = queue.length;
    const words = Math.max(count, 1);
    const outIndex = options?.outIndex ?? 0;
    const blockWords = options?.block ?? Uint32Array.of(POISON);
    const src = uploadBuffer(ctx, count > 0 ? queue : new Uint32Array(1), "compact/queue");
    const flagBuffer = uploadBuffer(ctx, count > 0 ? flags : new Uint32Array(1), "compact/flags");
    const out = uploadBuffer(ctx, new Uint32Array(words).fill(POISON), "compact/out");
    const block = uploadBuffer(ctx, blockWords, "compact/outCount");
    const scope = testReduceScope(ctx);
    try {
        const planner: CompactPlanner = await prepareCompact(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "compact/test" });
        const pass = encoder.beginComputePass({ label: "compact/test" });
        const record: CompactRecord = {
            queue: bindingOf(src),
            flags: bindingOf(flagBuffer),
            count,
            out: bindingOf(out),
            outCount: bindingOf(block),
            outIndex,
        };
        planner.record(pass, record);
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const result = count > 0 ? await readU32(ctx, out, count) : new Uint32Array(0);
        const blockResult = await readU32(ctx, block, blockWords.length);
        return { out: result, count: blockResult[outIndex], block: blockResult, dispatches: planner.lastDispatches };
    } finally {
        scope.dispose();
        src.destroy();
        flagBuffer.destroy();
        out.destroy();
        block.destroy();
    }
}

/**
 * Uploads `queue`, dedupes it once over an `owner` of `n` words (a fresh poisoned one unless `options.owner` is
 * given, which is then never touched between runs) into a poisoned `out`, and reads `out`, the block and the count
 * word back. `options.capacity` is the `count` the planner receives (the queue's length by default); the indirect
 * form dispatches both kernels from a two-slot args buffer sized for that capacity.
 * @param ctx - the context
 * @param queue - the entries (vertex indices below n)
 * @param n - the vertex count (the owner's length)
 * @param options - the knobs
 * @returns the run
 */
export async function runDedupe(ctx: GpuContext, queue: U32, n: number, options?: DedupeOptions): Promise<PrimitiveRun> {
    const capacity = options?.capacity ?? queue.length;
    const words = Math.max(capacity, 1);
    const outIndex = options?.outIndex ?? 0;
    const countIndex = options?.countIndex ?? U32_MAX;
    const blockWords = options?.block ?? Uint32Array.of(0);
    const src = uploadBuffer(ctx, queue.length > 0 ? queue : new Uint32Array(1), "dedupe/queue");
    const out = uploadBuffer(ctx, new Uint32Array(words).fill(POISON), "dedupe/out");
    const block = uploadBuffer(ctx, blockWords, "dedupe/counters");
    const ownedOwner = options?.owner === undefined;
    const owner = options?.owner ?? uploadBuffer(ctx, new Uint32Array(Math.max(n, 1)).fill(POISON), "dedupe/owner");
    const scope = testReduceScope(ctx);
    let args: GPUBuffer | null = null;
    try {
        const planner: CompactPlanner = await prepareCompact(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "dedupe/test" });
        const pass = encoder.beginComputePass({ label: "dedupe/test" });
        const record: DedupeRecord = {
            queue: bindingOf(src),
            count: capacity,
            countIndex,
            counters: bindingOf(block),
            owner: bindingOf(owner),
            out: bindingOf(out),
            outCount: bindingOf(block),
            outIndex,
        };
        if (options?.indirect === true) {
            const plan = plan1d(capacity, ctx.workgroupSize, ctx.caps);
            const slots = new Uint32Array((2 * INDIRECT_ARGS_STRIDE) / 4);
            slots.set([plan.x, plan.y, 1, 0], 0);
            slots.set([plan.x, plan.y, 1, 0], INDIRECT_ARGS_STRIDE / 4);
            args = uploadBuffer(ctx, slots, "dedupe/args", BufferUsage.INDIRECT);
            planner.recordDedupeIndirect(pass, record, bindingOf(args), 0, 1);
        } else {
            planner.recordDedupe(pass, record);
        }
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const result = capacity > 0 ? await readU32(ctx, out, capacity) : new Uint32Array(0);
        const blockResult = await readU32(ctx, block, blockWords.length);
        return { out: result, count: blockResult[outIndex], block: blockResult, dispatches: planner.lastDispatches };
    } finally {
        scope.dispose();
        src.destroy();
        out.destroy();
        block.destroy();
        args?.destroy();
        if (ownedOwner) {
            owner.destroy();
        }
    }
}

/**
 * The bitwise check of one compact of `count` distinct entries under the alternating flags (spec 11.9 item 1: the
 * sabotage suite asserts the same report fails on a mutant): ratioOf(|a - b|, 0) for the count word and for every
 * word of the oracle's output.
 * @param ctx - the context
 * @param count - the entry count
 * @returns the report
 */
export async function compactReport(ctx: GpuContext, count: number): Promise<CheckReport> {
    const queue = compactQueue(count);
    const flags = flagsOf(count, "alternating");
    const got = await runCompact(ctx, queue, flags);
    const want = compactOracle(queue, flags);
    const reports: CheckReport[] = [{ worst: ratioOf(Math.abs(got.count - want.count), 0), worstLabel: "count", samples: 1 }];
    for (let i = 0; i < want.count; i++) {
        reports.push({ worst: ratioOf(Math.abs(got.out[i] - want.out[i]), 0), worstLabel: `out[${i}]`, samples: 1 });
    }
    return mergeReports(reports);
}

/**
 * The set check of one dedupe of the `repeat1000` queue of `count` entries over `count` vertices: the count word
 * against the oracle's distinct count, then the sorted survivors word for word against the sorted oracle (a
 * different length is Infinity at "count"; a poisoned or duplicated slot sorts to a mismatch).
 * @param ctx - the context
 * @param count - the entry count
 * @returns the report
 */
export async function dedupeReport(ctx: GpuContext, count: number): Promise<CheckReport> {
    const queue = dedupeQueue(count, "repeat1000");
    const got = await runDedupe(ctx, queue, count);
    const want = sortedU32(dedupeOracle(queue));
    const survivors = sortedU32(got.out.subarray(0, Math.min(got.count, got.out.length)));
    const reports: CheckReport[] = [
        { worst: ratioOf(Math.abs(got.count - want.length), 0), worstLabel: "count", samples: 1 },
        { worst: ratioOf(Math.abs(survivors.length - want.length), 0), worstLabel: "survivors", samples: 1 },
    ];
    for (let i = 0; i < Math.min(survivors.length, want.length); i++) {
        reports.push({ worst: ratioOf(Math.abs(survivors[i] - want[i]), 0), worstLabel: `sorted[${i}]`, samples: 1 });
    }
    return mergeReports(reports);
}
