/**
 * The Frontier, the counters block, the indirect args and `frontier-finalize` (design 5.4, 6 row 7; P8-T4), driven
 * with a synthetic counters block and no graph, every readback naming its buffer: the two blocks have the pinned
 * layouts and `W` indexes the counters block by 4 x word; the BFS seed `{ nextFrontierCount: 1, level: U32_MAX }` is
 * rotated in by the first boundary (word 0 from word 1, `visitedCount` 1, `level` 0, slot 0 `(1, 1, 1, 1)`); the
 * boundary-index rule gates the two unvisited subtractions; `maxDepth` sets `done` and zeroes every slot; `swap()`
 * flips the two vertex queues; role 0 writes plan1d's `(x, y, 1, count)` for the count in word 1 and zero slots for
 * the rest; the 2,000-count ladder agrees bitwise with P4's `indirect-finalize` and with `planIndirect` (DEP-P8-C),
 * twice; the fused slot is one WORKGROUP per entry; role 1 sizes the contract slot or, on an overflow, the fused-retry
 * slot (PD-23), and does nothing after a done or a fused boundary; a boundary that finds `done` set moves no word and
 * zeroes its seven slots; a 17M count dispatches `fill` over every word through the 2D split (design 13's gate item,
 * on lavapipe); and a bad argument is E_INVALID_ARGUMENT naming it before anything is recorded.
 */

import { type TestContext } from "vitest";

import { algorithmScope } from "../../src/algorithms/scope.js";
import { FRONTIER_CANDIDATES, MAX_LEVELS_PER_SUBMIT, U32_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { planIndirect } from "../../src/kernel/dispatch.js";
import { INDIRECT_ARGS_STRIDE } from "../../src/kernel/kernel.js";
import { FILL_PARAMS, FRONTIER_COUNTERS, FRONTIER_PARAMS, kernelSpec } from "../../src/kernels.js";
import { prepareFrontier, SLOT, W } from "../../src/primitives/frontier.js";
import { bindingOf, readU32, uploadBuffer } from "../helpers/device.js";
import {
    type CounterWord,
    expectedLadderArgs,
    FRONTIER_LADDER,
    frontierReport,
    POISON,
    runBoundary,
    runFinalizeLadder,
    runIndirectLadder,
    slotOf,
    ZERO_SLOT,
} from "../helpers/frontier.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** The gate's synthetic frontier: 66,407 workgroups of 256, above the 65,535 per-dimension limit. */
const BIG_COUNT = 17_000_000;

/** The counters words in W order. */
const WORDS = Object.keys(W) as CounterWord[];

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

/** `planIndirect`'s slot for a count. */
function planSlot(ctx: GpuContext, count: number): number[] {
    const plan = planIndirect(count, ctx.workgroupSize, ctx.caps);
    return [plan.x, plan.y, 1, count];
}

describe("Frontier, the counters block and frontier-finalize (design 5.4, 6 row 7; P8-T4)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "frontier" }));
        shared = ctx;
        return ctx;
    }

    it("FRONTIER_COUNTERS is a 112-byte storage block of 25 u32 words (the path word last, rounded to 16 bytes) indexed by W at 4 x word; FRONTIER_PARAMS an 80-byte uniform of twenty u32 fields", () => {
        expect(FRONTIER_COUNTERS.name).toBe("FrontierCounters");
        expect(FRONTIER_COUNTERS.layout).toBe("storage");
        expect(FRONTIER_COUNTERS.byteLength).toBe(112);
        expect(WORDS).toHaveLength(25);
        expect(FRONTIER_COUNTERS.fields.map((f) => f[0])).toEqual(WORDS);
        for (const name of WORDS) {
            expect(FRONTIER_COUNTERS.offsetOf(name), name).toBe(4 * W[name]);
        }
        expect(W.frontierCount).toBe(0);
        expect(W.nextFrontierCount).toBe(1);
        expect(W.level).toBe(11);
        expect(W.done).toBe(15);
        expect(W.deltaBits).toBe(23);
        expect(W.path).toBe(24);
        expect(SLOT).toEqual({ expand: 0, contract: 1, fused: 2, fillBits: 3, bitset: 4, bottomUp: 5, fusedRetry: 6 });
        expect(Object.keys(SLOT)).toHaveLength(FRONTIER_CANDIDATES);
        expect(FRONTIER_PARAMS.name).toBe("FrontierParams");
        expect(FRONTIER_PARAMS.layout).toBe("uniform");
        expect(FRONTIER_PARAMS.byteLength).toBe(80);
        const params = [
            "role",
            "slotBase",
            "wg",
            "alpha",
            "beta",
            "fusedMax",
            "edgeCapacity",
            "maxDepth",
            "n",
            "mode",
            "cutoffBits",
            "arcBase",
            "arcEnd",
            "predKind",
            "bitsBase",
            "source",
            "stride",
            "firstOfSubmit",
            "iteration",
            "pad1",
        ];
        expect(FRONTIER_PARAMS.fields.map((f) => f[0])).toEqual(params);
        params.forEach((name, k) => {
            expect(FRONTIER_PARAMS.offsetOf(name), name).toBe(4 * k);
        });
    });

    it("the BFS seed: reset writes vertices[0][0] and the block (zero but the seed); the first role 0 rotates word 1 into word 0, adds it to visitedCount, wraps level to 0, leaves done 0 and writes slot 0 = (1, 1, 1, 1)", async (t) => {
        const ctx = await context(t);
        const scope = algorithmScope(ctx, "frontier-seed", 8);
        try {
            const { frontier } = await prepareFrontier(scope, 16, 32);
            frontier.reset(ctx.device.queue, 7, { nextFrontierCount: 1, level: U32_MAX });
            const queue = await readU32(ctx, frontier.vertices[0].buffer, 1, frontier.vertices[0].offset);
            expect(queue[0], "vertices[0][0]").toBe(7);
            const block = await readU32(ctx, frontier.counters.buffer, 24, frontier.counters.offset);
            const seeded = new Uint32Array(24);
            seeded[W.nextFrontierCount] = 1;
            seeded[W.level] = U32_MAX;
            expectBitwiseEqual(block, seeded, "the counters block after reset");
        } finally {
            scope.dispose();
        }
        const run = await runBoundary(ctx, [{ role: 0 }], {
            source: 7,
            seed: { nextFrontierCount: 1, level: U32_MAX },
        });
        expect(run.input0).toBe(7);
        expect(run.counters).toMatchObject({
            frontierCount: 1,
            nextFrontierCount: 0,
            level: 0,
            visitedCount: 1,
            done: 0,
            unvisitedCount: 0,
            direction: 0,
            fusedLevels: 0,
            twoPhaseLevels: 0,
        });
        expect(slotOf(run.args, 0, SLOT.expand)).toEqual([1, 1, 1, 1]);
        for (const s of [SLOT.fused, SLOT.fillBits, SLOT.bitset, SLOT.bottomUp]) {
            expect(slotOf(run.args, 0, s), `slot ${s}`).toEqual([...ZERO_SLOT]);
        }
        // slots 1 and 6 are role 1's: role 0 leaves them as they were
        expect(slotOf(run.args, 0, SLOT.contract)).toEqual([POISON, POISON, POISON, POISON]);
        expect(slotOf(run.args, 0, SLOT.fusedRetry)).toEqual([POISON, POISON, POISON, POISON]);
    });

    it("the boundary-index rule: firstOfSubmit 0 subtracts nothing, 1 subtracts the count, 2 the count and the degree sum; maxDepth 0 sets done and zeroes every slot", async (t) => {
        const ctx = await context(t);
        const seed = {
            unvisitedCount: 5,
            unvisitedDegreeSum: 9,
            nextFrontierCount: 1,
            frontierDegreeSum: 4,
            level: U32_MAX,
        };
        const expected: readonly (readonly [number, number, number])[] = [
            [0, 5, 9],
            [1, 4, 9],
            [2, 4, 5],
        ];
        for (const [firstOfSubmit, unvisitedCount, unvisitedDegreeSum] of expected) {
            const run = await runBoundary(ctx, [{ role: 0, fields: { firstOfSubmit } }], { seed });
            expect(run.counters, `firstOfSubmit ${firstOfSubmit}`).toMatchObject({
                unvisitedCount,
                unvisitedDegreeSum,
                prevDegreeSum: 4,
                frontierDegreeSum: 0,
                frontierCount: 1,
                level: 0,
                done: 0,
            });
        }
        const capped = await runBoundary(ctx, [{ role: 0, fields: { maxDepth: 0 } }], { seed });
        expect(capped.counters.done).toBe(1);
        expect(capped.counters.level).toBe(0);
        expect(capped.counters.frontierCount).toBe(1);
        for (let s = 0; s < FRONTIER_CANDIDATES; s++) {
            expect(slotOf(capped.args, 0, s), `slot ${s}`).toEqual([...ZERO_SLOT]);
        }
    });

    it("swap() flips input and output between the two vertex buffers and twice returns to the start; reset puts the source back on side 0", async (t) => {
        const ctx = await context(t);
        const scope = algorithmScope(ctx, "frontier-swap", 8);
        try {
            const { frontier } = await prepareFrontier(scope, 4, 4);
            const [a, b] = frontier.vertices;
            expect(a.buffer).not.toBe(b.buffer);
            expect(frontier.side).toBe(0);
            expect(frontier.input).toBe(a);
            expect(frontier.output).toBe(b);
            frontier.swap();
            expect(frontier.side).toBe(1);
            expect(frontier.input).toBe(b);
            expect(frontier.output).toBe(a);
            frontier.swap();
            expect(frontier.side).toBe(0);
            expect(frontier.input).toBe(a);
            expect(frontier.output).toBe(b);
            frontier.swap();
            frontier.reset(ctx.device.queue, 3, {});
            expect(frontier.side).toBe(0);
            expect(frontier.input).toBe(a);
            expect(frontier.edgeCapacity).toBe(4);
            expect(frontier.args.size).toBe(MAX_LEVELS_PER_SUBMIT * FRONTIER_CANDIDATES * INDIRECT_ARGS_STRIDE);
            expect(frontier.counters.size).toBe(112);
        } finally {
            scope.dispose();
        }
    });

    it("role 0 with mode 1, fusedMax 0 writes planIndirect(count) into slot 0 for the count in word 1 and zero slots into 2-5; role 1 then writes planIndirect(edgeCount) into slot 1 and zeroes slot 6", async (t) => {
        const ctx = await context(t);
        for (const count of [1, 255, 256, 257, 4097, 16_776_961]) {
            const run = await runBoundary(ctx, [{ role: 0 }, { role: 1 }], {
                seed: { nextFrontierCount: count, level: U32_MAX },
            });
            expect(slotOf(run.args, 0, SLOT.expand), `count ${count}: slot 0`).toEqual(planSlot(ctx, count));
            expect(slotOf(run.args, 0, SLOT.contract), `count ${count}: slot 1`).toEqual(planSlot(ctx, 0));
            for (const s of [SLOT.fused, SLOT.fillBits, SLOT.bitset, SLOT.bottomUp, SLOT.fusedRetry]) {
                expect(slotOf(run.args, 0, s), `count ${count}: slot ${s}`).toEqual([...ZERO_SLOT]);
            }
            expect(run.counters).toMatchObject({
                frontierCount: count,
                twoPhaseLevels: 1,
                fusedLevels: 0,
                edgeCount: 0,
            });
        }
    });

    it("the 2,000-count ladder (0 and the largest u32 included): frontier-finalize, indirect-finalize and planIndirect write identical (x, y, 1, count) words, two runs bitwise equal", async (t) => {
        const ctx = await context(t);
        expect(FRONTIER_LADDER).toHaveLength(2000);
        expect(FRONTIER_LADDER[0]).toBe(0);
        expect(FRONTIER_LADDER[1999]).toBe(U32_MAX);
        expect(new Set(FRONTIER_LADDER).size).toBe(2000);
        const first = await runFinalizeLadder(ctx, FRONTIER_LADDER);
        const second = await runFinalizeLadder(ctx, FRONTIER_LADDER);
        expectBitwiseEqual(first, second, "the frontier ladder twice (args)");
        const twin = await runIndirectLadder(ctx, FRONTIER_LADDER);
        expectBitwiseEqual(first, twin, "frontier-finalize vs indirect-finalize (args)");
        expectBitwiseEqual(first, expectedLadderArgs(ctx, FRONTIER_LADDER), "frontier-finalize vs planIndirect");
        if (ctx.workgroupSize === 256) {
            const top = 4 * 1999;
            expect(Array.from(first.subarray(top, top + 4))).toEqual([65_535, 257, 1, U32_MAX]);
        }
    }, 120_000);

    it("the fused slot is one WORKGROUP per entry: word 1 = 300 under fusedMax U32_MAX writes (300, 1, 1, 300) into slot 2, 70,000 writes (65535, 2, 1, 70000)", async (t) => {
        const ctx = await context(t);
        const small = await runBoundary(ctx, [{ role: 0, fields: { fusedMax: U32_MAX } }], {
            seed: { nextFrontierCount: 300, level: U32_MAX },
        });
        expect(slotOf(small.args, 0, SLOT.fused)).toEqual([300, 1, 1, 300]);
        expect(slotOf(small.args, 0, SLOT.expand)).toEqual([...ZERO_SLOT]);
        expect(slotOf(small.args, 0, SLOT.contract)).toEqual([...ZERO_SLOT]);
        expect(slotOf(small.args, 0, SLOT.fusedRetry)).toEqual([...ZERO_SLOT]);
        expect(small.counters).toMatchObject({ fusedLevels: 1, twoPhaseLevels: 0, frontierCount: 300 });
        const large = await runBoundary(ctx, [{ role: 0, fields: { fusedMax: U32_MAX } }], {
            seed: { nextFrontierCount: 70_000, level: U32_MAX },
        });
        expect(slotOf(large.args, 0, SLOT.fused)).toEqual([65_535, 2, 1, 70_000]);
    });

    it("role 1 after a two-phase role 0: an unclamped total above the capacity writes (0,0,1,0) into slot 1, the frontier into slot 6 and counts an overflow; a total within it sizes slot 1 from edgeCount and counts a two-phase level, also for zero edges", async (t) => {
        const ctx = await context(t);
        const seed = { nextFrontierCount: 300, level: U32_MAX };
        const overflow = await runBoundary(
            ctx,
            [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 4096, edgeCountUnclamped: 50_000 } }],
            { seed, edgeCapacity: 4096 },
        );
        expect(slotOf(overflow.args, 0, SLOT.expand)).toEqual(planSlot(ctx, 300));
        expect(slotOf(overflow.args, 0, SLOT.contract)).toEqual([...ZERO_SLOT]);
        expect(slotOf(overflow.args, 0, SLOT.fusedRetry)).toEqual([300, 1, 1, 300]);
        expect(overflow.counters).toMatchObject({
            overflowLevels: 1,
            fusedLevels: 1,
            twoPhaseLevels: 0,
            edgeCount: 4096,
        });

        const fits = await runBoundary(
            ctx,
            [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 4096, edgeCountUnclamped: 4096 } }],
            { seed, edgeCapacity: 4096 },
        );
        expect(slotOf(fits.args, 0, SLOT.contract)).toEqual(planSlot(ctx, 4096));
        expect(slotOf(fits.args, 0, SLOT.fusedRetry)).toEqual([...ZERO_SLOT]);
        expect(fits.counters).toMatchObject({ overflowLevels: 0, fusedLevels: 0, twoPhaseLevels: 1, edgeCount: 4096 });

        const empty = await runBoundary(ctx, [{ role: 0 }, { role: 1 }], { seed, edgeCapacity: 4096 });
        expect(slotOf(empty.args, 0, SLOT.contract)).toEqual(planSlot(ctx, 0));
        expect(empty.counters).toMatchObject({ overflowLevels: 0, twoPhaseLevels: 1, edgeCount: 0 });

        // a clamped word above the capacity is clamped, never dispatched past the queue
        const clamped = await runBoundary(
            ctx,
            [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 5000, edgeCountUnclamped: 4096 } }],
            { seed, edgeCapacity: 4096 },
        );
        expect(slotOf(clamped.args, 0, SLOT.contract)).toEqual(planSlot(ctx, 4096));
        expect(clamped.counters.edgeCount).toBe(4096);
    });

    it("role 1 after a role 0 that set done, or that chose the fused slot, leaves twoPhaseLevels, overflowLevels and edgeCount unchanged and writes (0,0,1,0) into the poisoned slots 1 and 6", async (t) => {
        const ctx = await context(t);
        const afterDone = await runBoundary(ctx, [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 77 } }], {
            seed: { level: U32_MAX },
            edgeCapacity: 10,
        });
        expect(afterDone.counters).toMatchObject({ done: 1, twoPhaseLevels: 0, overflowLevels: 0, edgeCount: 77 });
        expect(slotOf(afterDone.args, 0, SLOT.contract)).toEqual([...ZERO_SLOT]);
        expect(slotOf(afterDone.args, 0, SLOT.fusedRetry)).toEqual([...ZERO_SLOT]);

        const afterFused = await runBoundary(
            ctx,
            [
                { role: 0, fields: { fusedMax: U32_MAX } },
                { role: 1, writeBefore: { edgeCount: 77, edgeCountUnclamped: 500 } },
            ],
            { seed: { nextFrontierCount: 300, level: U32_MAX }, edgeCapacity: 10 },
        );
        expect(afterFused.counters).toMatchObject({
            done: 0,
            fusedLevels: 1,
            twoPhaseLevels: 0,
            overflowLevels: 0,
            edgeCount: 77,
        });
        expect(slotOf(afterFused.args, 0, SLOT.fused)).toEqual([300, 1, 1, 300]);
        expect(slotOf(afterFused.args, 0, SLOT.contract)).toEqual([...ZERO_SLOT]);
        expect(slotOf(afterFused.args, 0, SLOT.fusedRetry)).toEqual([...ZERO_SLOT]);
    });

    it("a role 0 that finds done already set changes no word of the block and writes (0,0,1,0) into all seven poisoned slots of its level; maxDepth 3 at level 2 sets done, at level 1 it does not", async (t) => {
        const ctx = await context(t);
        const seed = {
            done: 1,
            level: 5,
            frontierCount: 0,
            visitedCount: 9,
            nextFrontierCount: 4,
            fusedLevels: 2,
            twoPhaseLevels: 3,
        };
        const run = await runBoundary(ctx, [{ role: 0, level: 3 }], { seed });
        const want: Record<string, number> = {};
        for (const name of WORDS) {
            want[name] = 0;
        }
        Object.assign(want, seed);
        expect(run.counters).toEqual(want);
        for (let s = 0; s < FRONTIER_CANDIDATES; s++) {
            expect(slotOf(run.args, 3, s), `level 3 slot ${s}`).toEqual([...ZERO_SLOT]);
        }
        // the other levels' slots are untouched
        expect(slotOf(run.args, 0, SLOT.expand)).toEqual([POISON, POISON, POISON, POISON]);

        const capped = await runBoundary(ctx, [{ role: 0, fields: { maxDepth: 3 } }], {
            seed: { nextFrontierCount: 1, level: 2 },
        });
        expect(capped.counters).toMatchObject({ done: 1, level: 3, frontierCount: 1 });
        const open = await runBoundary(ctx, [{ role: 0, fields: { maxDepth: 3 } }], {
            seed: { nextFrontierCount: 1, level: 1 },
        });
        expect(open.counters).toMatchObject({ done: 0, level: 2, frontierCount: 1 });
        expect(slotOf(open.args, 0, SLOT.expand)).toEqual([1, 1, 1, 1]);
    });

    it("a 17M count writes x = 65535, y = 2 and, dispatched through fill (iota) over a poisoned 17M-word buffer in the same pass, leaves no poison word (design 13's gate item)", async (t) => {
        const ctx = await context(t);
        const scope = algorithmScope(ctx, "frontier-17m", 8);
        const dst = uploadBuffer(ctx, new Uint32Array(BIG_COUNT).fill(POISON), "frontier/fill-dst");
        try {
            const planner = await prepareFrontier(scope, 16, 32);
            const { frontier } = planner;
            frontier.reset(ctx.device.queue, 0, { nextFrontierCount: BIG_COUNT, level: U32_MAX });
            const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
            const params = scope.params(FILL_PARAMS, { count: BIG_COUNT, value: 0, mode: 1 });
            const fillBound = fill.bind({ dst: bindingOf(dst), P: params.binding });
            const batch = new CommandBatch(ctx, "frontier-17m");
            const pass = batch.pass("finalize-then-fill");
            planner.recordFinalize(pass, 0, 0, { mode: 1, fusedMax: 0, maxDepth: U32_MAX });
            fill.dispatchIndirect(pass, fillBound, frontier.args, SLOT.expand, [params.offset]);
            scope.flush();
            const { dispatches } = batch;
            await batch.submit().readback;
            expect(dispatches).toBe(2);
            const args = await readU32(ctx, frontier.args.buffer, 4, frontier.args.offset);
            expect(Array.from(args)).toEqual(planSlot(ctx, BIG_COUNT));
            if (ctx.workgroupSize === 256) {
                expect(Array.from(args)).toEqual([65_535, 2, 1, BIG_COUNT]);
            }
            const words = await readU32(ctx, dst, BIG_COUNT);
            let wrong = -1;
            for (let i = 0; i < BIG_COUNT; i++) {
                if (words[i] !== i) {
                    wrong = i;
                    break;
                }
            }
            expect(wrong, `first wrong word of the fill destination (${wrong >= 0 ? words[wrong] : "-"})`).toBe(-1);
        } finally {
            dst.destroy();
            scope.dispose();
        }
    }, 300_000);

    it("the sabotage check passes on the real kernel (factor 0)", async (t) => {
        const ctx = await context(t);
        const report = await frontierReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    }, 120_000);

    it("a bad n, arcCount, edgeCapacity, source, seed word, level or role is E_INVALID_ARGUMENT naming it, before anything is recorded", async (t) => {
        const ctx = await context(t);
        const scope = algorithmScope(ctx, "frontier-errors", 8);
        try {
            await expect(prepareFrontier(scope, -1, 0)).rejects.toMatchObject({ details: { argument: "n" } });
            await expect(prepareFrontier(scope, 1.5, 0)).rejects.toMatchObject({ details: { argument: "n" } });
            await expect(prepareFrontier(scope, 4, -1)).rejects.toMatchObject({ details: { argument: "arcCount" } });
            await expect(prepareFrontier(scope, 4, 4, 0)).rejects.toMatchObject({
                details: { argument: "edgeCapacity" },
            });
            const planner = await prepareFrontier(scope, 4, 4);
            const { frontier } = planner;
            const { queue } = ctx.device;
            expect(argumentOf(() => frontier.reset(queue, 4, {}))).toBe("source");
            expect(argumentOf(() => frontier.reset(queue, -1, {}))).toBe("source");
            expect(argumentOf(() => frontier.reset(queue, 0, { level: -1 }))).toBe("level");
            expect(argumentOf(() => frontier.reset(queue, 0, { nope: 1 } as Record<string, number>))).toBe("values");
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            const record = (role: number, level: number): string | null =>
                argumentOf(() => planner.recordFinalize(pass, role, level, {}));
            expect(record(0, MAX_LEVELS_PER_SUBMIT)).toBe("level");
            expect(record(0, -1)).toBe("level");
            expect(record(0, 0.5)).toBe("level");
            expect(record(4, 0)).toBe("role");
            expect(record(-1, 0)).toBe("role");
            expect(record(0, MAX_LEVELS_PER_SUBMIT - 1)).toBeNull();
            pass.end();
        } finally {
            scope.dispose();
        }
    });
});
