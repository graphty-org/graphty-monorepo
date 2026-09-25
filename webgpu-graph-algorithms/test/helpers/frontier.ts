/**
 * The frontier / `frontier-finalize` checks (design 5.4, 6 row 7; P8-T4) shared by test/primitives/frontier.test.ts
 * and test/sabotage/frontier.test.ts: a boundary run (a `prepareFrontier` planner over an `algorithmScope`, the args
 * poisoned or zeroed, one `reset`, a sequence of finalize roles with optional host writes into the counters block
 * between submits, and the readback of the counters block, the args and the seeded vertex queue by their OWN
 * bindings); the 2,000-count ladder that drives the selector's role 1 directly, one 256-byte-strided counters block
 * per count, beside P4's `indirect-finalize` over the same counts (DEP-P8-C's anti-drift check); and the report the
 * sabotage suite measures, bitwise (ratioOf(|a - b|, 0): any mismatch is Infinity) over the ladder and the four
 * boundary scenarios that pin the rotation, the fused slot, the done boundary and role 1's gate.
 */

import { type U32 } from "@graphty/graph-format";

import { algorithmScope } from "../../src/algorithms/scope.js";
import { FRONTIER_CANDIDATES, MAX_1D_ITEMS, STORAGE_ALIGN, U32_MAX, WORKGROUP_SIZE } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { plan1d, planIndirect } from "../../src/kernel/dispatch.js";
import { INDIRECT_ARGS_STRIDE } from "../../src/kernel/kernel.js";
import { FRONTIER_COUNTERS, FRONTIER_PARAMS, INDIRECT_PARAMS, kernelSpec } from "../../src/kernels.js";
import {
    type FrontierFinalizeFields,
    type FrontierPlanner,
    type FrontierSeed,
    prepareFrontier,
    SLOT,
    W,
} from "../../src/primitives/frontier.js";
import { type Binding } from "../../src/types/memory.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { INDIRECT_COUNTS } from "./indirect.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";

/** The word the args slots and the poisoned buffers start with: never a workgroup count the suites expect. */
export const POISON = 0xdeadbeef;

/** What `zero_slot` writes: a dispatch of no workgroups. */
export const ZERO_SLOT: readonly number[] = Object.freeze([0, 0, 1, 0]);

/** A counters-block word by name (the `W` record's keys). */
export type CounterWord = keyof typeof W;

/** One recorded finalize: the role, the fields (defaults: `mode 1, fusedMax 0, maxDepth U32_MAX`), the level, and the words the host writes into the block BEFORE it (a `FrontierSeed`, the same record `reset` takes) -- a write closes the open batch, because a queue write lands before the NEXT submit. */
interface FinalizeStep {
    readonly role: number;
    readonly fields?: FrontierFinalizeFields | undefined;
    readonly level?: number | undefined;
    readonly writeBefore?: FrontierSeed | undefined;
}

/** The knobs of a boundary run. */
interface BoundaryOptions {
    readonly n?: number | undefined;
    readonly arcCount?: number | undefined;
    readonly edgeCapacity?: number | undefined;
    readonly source?: number | undefined;
    /** The `reset` seed (every other word 0). */
    readonly seed?: FrontierSeed | undefined;
    /** What every args word holds before the roles run: the poison (default) or 0. */
    readonly args?: "poison" | "zero" | undefined;
}

/** One boundary run read back: the counters block by name, every args word, and word 0 of `vertices[0]`. */
interface BoundaryRun {
    readonly counters: Readonly<Record<CounterWord, number>>;
    readonly args: U32;
    readonly input0: number;
}

/** The default finalize fields of every step: the trivial candidate rule of P8-T4 (slot 0 always) and no depth cap. */
const DEFAULT_FIELDS: FrontierFinalizeFields = Object.freeze({ mode: 1, fusedMax: 0, maxDepth: U32_MAX });

/** The counters-block words in `W` order. */
const WORDS: readonly CounterWord[] = Object.freeze(Object.keys(W) as CounterWord[]);

/**
 * The four words of one args slot.
 * @param args - the args words of a run
 * @param level - the level (the 7-slot group)
 * @param slot - the slot inside the group (`SLOT.*`)
 * @returns `[x, y, z, count]`
 */
export function slotOf(args: U32, level: number, slot: number): number[] {
    const base = 4 * (level * FRONTIER_CANDIDATES + slot);
    return Array.from(args.subarray(base, base + 4));
}

/**
 * The counters block decoded by name through FRONTIER_COUNTERS.read (the host's decoder of the result copy).
 * @param words - the 24 words read back
 * @returns the block by name
 */
function decodeCounters(words: U32): Readonly<Record<CounterWord, number>> {
    const values = FRONTIER_COUNTERS.read(new DataView(words.buffer, words.byteOffset, words.byteLength));
    const out: Partial<Record<CounterWord, number>> = {};
    for (const name of WORDS) {
        const value = values[name];
        if (typeof value !== "number") {
            throw new Error(`decodeCounters: ${name} is not a scalar`);
        }
        out[name] = value;
    }
    return out as Readonly<Record<CounterWord, number>>;
}

/**
 * One boundary run: a planner over a fresh scope, the args pre-filled, one reset, the steps recorded (a step with a
 * host write closes the batch first), then the three readbacks by their own bindings.
 * @param ctx - the context
 * @param steps - the finalize roles in order
 * @param options - the knobs
 * @returns the run
 */
export async function runBoundary(
    ctx: GpuContext,
    steps: readonly FinalizeStep[],
    options?: BoundaryOptions,
): Promise<BoundaryRun> {
    const scope = algorithmScope(ctx, "frontier-test", 64);
    try {
        const planner: FrontierPlanner = await prepareFrontier(
            scope,
            options?.n ?? 16,
            options?.arcCount ?? 32,
            options?.edgeCapacity,
        );
        const { frontier } = planner;
        const { queue } = ctx.device;
        const argWords = frontier.args.size / 4;
        queue.writeBuffer(
            frontier.args.buffer,
            frontier.args.offset,
            new Uint32Array(argWords).fill(options?.args === "zero" ? 0 : POISON),
        );
        frontier.reset(queue, options?.source ?? 0, options?.seed ?? {});
        let batch: CommandBatch | null = null;
        let pass: GPUComputePassEncoder | null = null;
        for (const step of steps) {
            if (step.writeBefore !== undefined) {
                if (batch !== null) {
                    scope.flush();
                    await batch.submit().readback;
                    batch = null;
                    pass = null;
                }
                for (const name of WORDS) {
                    const value = step.writeBefore[name];
                    if (value !== undefined) {
                        queue.writeBuffer(
                            frontier.counters.buffer,
                            frontier.counters.offset + 4 * W[name],
                            Uint32Array.of(value),
                        );
                    }
                }
            }
            if (batch === null || pass === null) {
                batch = new CommandBatch(ctx, "frontier-test");
                pass = batch.pass("finalize");
            }
            planner.recordFinalize(pass, step.role, step.level ?? 0, { ...DEFAULT_FIELDS, ...step.fields });
        }
        if (batch !== null) {
            scope.flush();
            await batch.submit().readback;
        }
        const block = await readU32(
            ctx,
            frontier.counters.buffer,
            FRONTIER_COUNTERS.byteLength / 4,
            frontier.counters.offset,
        );
        const args = await readU32(ctx, frontier.args.buffer, argWords, frontier.args.offset);
        const input0 = await readU32(ctx, frontier.vertices[0].buffer, 1, frontier.vertices[0].offset);
        return { counters: decodeCounters(block), args, input0: input0[0] };
    } finally {
        scope.dispose();
    }
}

/**
 * The 2,000-count ladder: the nine INDIRECT_COUNTS, the workgroup boundaries of the first eight blocks, the 1D / 2D
 * boundary of the 16,776,960 rule and every multiple of it up to the u32 range (each with its two neighbours: the y
 * boundaries of the 2D split), the top 300 u32 values, and a spread over the whole range up to 2,000 distinct counts,
 * ascending.
 * @returns the counts
 */
function buildLadder(): readonly number[] {
    const set = new Set<number>(INDIRECT_COUNTS);
    for (let k = 0; k < 8; k++) {
        for (const d of [-1, 0, 1]) {
            const count = WORKGROUP_SIZE * k + d;
            if (count >= 0) {
                set.add(count);
            }
        }
    }
    for (let d = -300; d <= 300; d += 3) {
        set.add(MAX_1D_ITEMS + d);
    }
    for (let m = 2; m * MAX_1D_ITEMS <= U32_MAX; m++) {
        for (const d of [-1, 0, 1]) {
            set.add(m * MAX_1D_ITEMS + d);
        }
    }
    for (let k = 0; k < 300; k++) {
        set.add(U32_MAX - k);
    }
    for (let j = 0; set.size < 2000; j++) {
        set.add(Math.floor((j * U32_MAX) / 1237) % (U32_MAX + 1));
    }
    return Object.freeze(Array.from(set).sort((a, b) => a - b));
}

/** The 2,000 counts of the anti-drift ladder (DEP-P8-C), 0 and the largest u32 included. */
export const FRONTIER_LADDER: readonly number[] = buildLadder();

/**
 * The `(x, y, 1, count)` the host twin writes for a ladder.
 * @param ctx - the context (its workgroup size and caps)
 * @param counts - the counts
 * @returns four words per count
 */
export function expectedLadderArgs(ctx: GpuContext, counts: readonly number[]): U32 {
    const out = new Uint32Array(4 * counts.length);
    counts.forEach((count, i) => {
        const plan = planIndirect(count, ctx.workgroupSize, ctx.caps);
        out.set([plan.x, plan.y, 1, count], 4 * i);
    });
    return out;
}

/**
 * `frontier-finalize` role 1 over a ladder, driven directly (not through a planner): one 256-byte-strided counters
 * block per count whose `edgeCount` word is the count and whose `edgeCountUnclamped` is 0, `edgeCapacity` the
 * largest u32 (so the two-phase branch is taken and `write_slot(1, count)` runs for EVERY count, 0 included), the
 * args pre-filled with 1 so slot 0's x is non-zero (role 1's gate), and slot 1 of each group read back: four words
 * per count, from the args buffer.
 * @param ctx - the context
 * @param counts - the counts
 * @returns four words per count
 */
export async function runFinalizeLadder(ctx: GpuContext, counts: readonly number[]): Promise<U32> {
    const stride = STORAGE_ALIGN / 4;
    const blocks = new Uint32Array(stride * counts.length);
    counts.forEach((count, i) => {
        blocks[stride * i + W.edgeCount] = count;
    });
    const groupWords = (FRONTIER_CANDIDATES * INDIRECT_ARGS_STRIDE) / 4;
    const counters = uploadBuffer(ctx, blocks, "frontier-ladder/counters");
    const args = uploadBuffer(ctx, new Uint32Array(groupWords * counts.length).fill(1), "frontier-ladder/args");
    const scope = algorithmScope(ctx, "frontier-ladder", counts.length);
    try {
        const kernel = await scope.pipelines.kernel(kernelSpec("frontier-finalize"));
        const batch = new CommandBatch(ctx, "frontier-ladder");
        const pass = batch.pass("finalize");
        const argsBinding = bindingOf(args);
        const plan = plan1d(1, ctx.workgroupSize, ctx.caps);
        counts.forEach((_count, i) => {
            const params = scope.params(FRONTIER_PARAMS, {
                role: 1,
                slotBase: FRONTIER_CANDIDATES * i,
                wg: ctx.workgroupSize,
                edgeCapacity: U32_MAX,
            });
            const block: Binding = {
                buffer: counters,
                offset: STORAGE_ALIGN * i,
                size: FRONTIER_COUNTERS.byteLength,
                window: null,
            };
            const bound = kernel.bind({ counters: block, args: argsBinding, P: params.binding });
            kernel.dispatch(pass, bound, plan, [params.offset]);
        });
        scope.flush();
        await batch.submit().readback;
        const words = await readU32(ctx, args, groupWords * counts.length);
        const out = new Uint32Array(4 * counts.length);
        counts.forEach((_count, i) => {
            out.set(words.subarray(groupWords * i + 4 * SLOT.contract, groupWords * i + 4 * SLOT.contract + 4), 4 * i);
        });
        return out;
    } finally {
        scope.dispose();
        counters.destroy();
        args.destroy();
    }
}

/**
 * P4's `indirect-finalize` over the same ladder: the counts as one array, one dispatch per count writing slot `i`
 * from `counters[i]`; four words per count, from the args buffer.
 * @param ctx - the context
 * @param counts - the counts
 * @returns four words per count
 */
export async function runIndirectLadder(ctx: GpuContext, counts: readonly number[]): Promise<U32> {
    const counters = uploadBuffer(ctx, new Uint32Array(counts), "indirect-ladder/counters");
    const args = uploadBuffer(ctx, new Uint32Array(4 * counts.length).fill(POISON), "indirect-ladder/args");
    const scope = algorithmScope(ctx, "indirect-ladder", counts.length);
    try {
        const kernel = await scope.pipelines.kernel(kernelSpec("indirect-finalize"));
        const batch = new CommandBatch(ctx, "indirect-ladder");
        const pass = batch.pass("finalize");
        const plan = plan1d(1, ctx.workgroupSize, ctx.caps);
        const bindings = { counters: bindingOf(counters), args: bindingOf(args) };
        counts.forEach((_count, i) => {
            const params = scope.params(INDIRECT_PARAMS, { countIndex: i, wg: ctx.workgroupSize, slot: i });
            const bound = kernel.bind({ ...bindings, P: params.binding });
            kernel.dispatch(pass, bound, plan, [params.offset]);
        });
        scope.flush();
        await batch.submit().readback;
        return await readU32(ctx, args, 4 * counts.length);
    } finally {
        scope.dispose();
        counters.destroy();
        args.destroy();
    }
}

/**
 * One bitwise sample per word of `got` against `want`.
 * @param label - the label prefix
 * @param got - the words read back
 * @param want - the expected words
 * @returns the reports
 */
function bitwiseReports(label: string, got: ArrayLike<number>, want: ArrayLike<number>): CheckReport[] {
    const reports: CheckReport[] = [];
    for (let i = 0; i < want.length; i++) {
        reports.push({ worst: ratioOf(Math.abs(got[i] - want[i]), 0), worstLabel: `${label}[${i}]`, samples: 1 });
    }
    if (got.length !== want.length) {
        reports.push({ worst: Infinity, worstLabel: `${label}.length`, samples: 1 });
    }
    return reports;
}

/**
 * The counters words of a run against expected values, one sample each.
 * @param label - the scenario
 * @param run - the run
 * @param want - the words to check
 * @returns the reports
 */
function counterReports(label: string, run: BoundaryRun, want: FrontierSeed): CheckReport[] {
    const reports: CheckReport[] = [];
    for (const name of WORDS) {
        const value = want[name];
        if (value !== undefined) {
            reports.push({
                worst: ratioOf(Math.abs(run.counters[name] - value), 0),
                worstLabel: `${label}.${name}`,
                samples: 1,
            });
        }
    }
    return reports;
}

/**
 * The sabotage check of `frontier-finalize` (spec 11.9 item 1): the ladder against the host twin, and the four
 * boundary scenarios -- the seed rotation (word 0 rotated from word 1, `visitedCount`, `level` wrapped to 0, slot 0
 * `(1, 1, 1, 1)`), the fused slot `(300, 1, 1, 300)`, role 1's retry after an overflow, a boundary that finds
 * `done` set (no word moves, seven zero slots), and role 1 after a `done` boundary (no count, `edgeCount` kept).
 * @param ctx - the context
 * @returns the report
 */
export async function frontierReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    const ladder = await runFinalizeLadder(ctx, FRONTIER_LADDER);
    reports.push(...bitwiseReports("ladder", ladder, expectedLadderArgs(ctx, FRONTIER_LADDER)));

    const rotate = await runBoundary(ctx, [{ role: 0 }], {
        source: 7,
        seed: { nextFrontierCount: 1, level: U32_MAX },
    });
    reports.push(
        ...counterReports("rotate", rotate, {
            frontierCount: 1,
            nextFrontierCount: 0,
            level: 0,
            visitedCount: 1,
            done: 0,
        }),
        { worst: ratioOf(Math.abs(rotate.input0 - 7), 0), worstLabel: "rotate.vertices[0][0]", samples: 1 },
        ...bitwiseReports("rotate.slot0", slotOf(rotate.args, 0, SLOT.expand), [1, 1, 1, 1]),
    );

    const fused = await runBoundary(ctx, [{ role: 0, fields: { fusedMax: U32_MAX } }], {
        seed: { nextFrontierCount: 300, level: U32_MAX },
    });
    reports.push(
        ...bitwiseReports("fused.slot2", slotOf(fused.args, 0, SLOT.fused), [300, 1, 1, 300]),
        ...counterReports("fused", fused, { fusedLevels: 1, twoPhaseLevels: 0 }),
    );

    const retry = await runBoundary(
        ctx,
        [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 4096, edgeCountUnclamped: 50_000 } }],
        { seed: { nextFrontierCount: 300, level: U32_MAX }, edgeCapacity: 4096 },
    );
    reports.push(
        ...bitwiseReports("retry.slot1", slotOf(retry.args, 0, SLOT.contract), ZERO_SLOT),
        ...bitwiseReports("retry.slot6", slotOf(retry.args, 0, SLOT.fusedRetry), [300, 1, 1, 300]),
        ...counterReports("retry", retry, { overflowLevels: 1, fusedLevels: 1, twoPhaseLevels: 0, edgeCount: 4096 }),
    );

    const doneSeed: FrontierSeed = {
        done: 1,
        level: 5,
        frontierCount: 0,
        visitedCount: 9,
        nextFrontierCount: 4,
        fusedLevels: 2,
        twoPhaseLevels: 3,
    };
    const already = await runBoundary(ctx, [{ role: 0 }], { seed: doneSeed });
    reports.push(...counterReports("already-done", already, doneSeed));
    for (let s = 0; s < FRONTIER_CANDIDATES; s++) {
        reports.push(...bitwiseReports(`already-done.slot${s}`, slotOf(already.args, 0, s), ZERO_SLOT));
    }

    const afterDone = await runBoundary(ctx, [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 77 } }], {
        seed: { level: U32_MAX },
        edgeCapacity: 10,
    });
    reports.push(
        ...counterReports("role1-after-done", afterDone, {
            done: 1,
            twoPhaseLevels: 0,
            overflowLevels: 0,
            edgeCount: 77,
        }),
        ...bitwiseReports("role1-after-done.slot1", slotOf(afterDone.args, 0, SLOT.contract), ZERO_SLOT),
        ...bitwiseReports("role1-after-done.slot6", slotOf(afterDone.args, 0, SLOT.fusedRetry), ZERO_SLOT),
    );
    return mergeReports(reports);
}
