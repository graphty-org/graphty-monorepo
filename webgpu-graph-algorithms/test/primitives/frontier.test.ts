/**
 * The Frontier, the counters block and `frontier-finalize` (design 5.4, 6 row 7; P8-T4), driven with a synthetic
 * counters block and no graph, every readback naming its buffer: the two blocks have the pinned layouts and `W`
 * indexes the counters block by 4 x word; the BFS seed `{ nextFrontierCount: 1, level: U32_MAX }` is rotated in by
 * the first boundary (word 0 from word 1, `visitedCount` 1, `level` 0, path 1); the boundary-index rule gates the
 * two unvisited subtractions; `maxDepth` sets `done` and path 0; `swap()` flips the two vertex queues; role 0
 * chooses the two-phase path for any count under `mode 1, fusedMax 0`; the fused path is chosen below `fusedMax`;
 * role 1 keeps the two-phase path and counts it, or, on an overflow, switches to the fused retry (PD-23), and does
 * nothing after a done or a fused boundary; a boundary that finds `done` set moves no word and zeroes a poisoned
 * path word; and a bad argument is E_INVALID_ARGUMENT naming it before anything is recorded. The selector's
 * decision is the block's `path` word alone (2026-09-25): the seven indirect slots it once wrote, their args
 * buffer, the 2,000-count ladder against `indirect-finalize` and the 17M-count 2D-split case that dispatched from
 * a slot are gone with them, and `indirect-finalize`'s own tests keep the split.
 */

import { type TestContext } from "vitest";

import { algorithmScope } from "../../src/algorithms/scope.js";
import { MAX_LEVELS_PER_SUBMIT, U32_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { FRONTIER_COUNTERS, FRONTIER_PARAMS } from "../../src/kernels.js";
import { PATH, prepareFrontier, W } from "../../src/primitives/frontier.js";
import { readU32 } from "../helpers/device.js";
import { type CounterWord, frontierReport, POISON, runBoundary } from "../helpers/frontier.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

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

describe("Frontier, the counters block and frontier-finalize (design 5.4, 6 row 7; P8-T4)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "frontier" }));
        shared = ctx;
        return ctx;
    }

    it("FRONTIER_COUNTERS is a 112-byte storage block of 26 u32 words (the nextDegreeSum word last, rounded to 16 bytes) indexed by W at 4 x word; FRONTIER_PARAMS an 80-byte uniform of twenty u32 fields; PATH names the path word's values", () => {
        expect(FRONTIER_COUNTERS.name).toBe("FrontierCounters");
        expect(FRONTIER_COUNTERS.layout).toBe("storage");
        expect(FRONTIER_COUNTERS.byteLength).toBe(112);
        expect(WORDS).toHaveLength(26);
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
        expect(PATH).toEqual({ none: 0, twoPhase: 1, fused: 2, bottomUp: 3, fusedRetry: 4, near: 5, far: 6 });
        expect(FRONTIER_PARAMS.name).toBe("FrontierParams");
        expect(FRONTIER_PARAMS.layout).toBe("uniform");
        expect(FRONTIER_PARAMS.byteLength).toBe(80);
        const params = [
            "role",
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
            "pad2",
        ];
        expect(FRONTIER_PARAMS.fields.map((f) => f[0])).toEqual(params);
        params.forEach((name, k) => {
            expect(FRONTIER_PARAMS.offsetOf(name), name).toBe(4 * k);
        });
    });

    it("the BFS seed: reset writes vertices[0][0] and the block (zero but the seed); the first role 0 rotates word 1 into word 0, adds it to visitedCount, wraps level to 0, leaves done 0 and chooses the two-phase path", async (t) => {
        const ctx = await context(t);
        const scope = algorithmScope(ctx, "frontier-seed", 8);
        try {
            const { frontier } = await prepareFrontier(scope, 16, 32);
            frontier.reset(ctx.device.queue, 7, { nextFrontierCount: 1, level: U32_MAX });
            const queue = await readU32(ctx, frontier.vertices[0].buffer, 1, frontier.vertices[0].offset);
            expect(queue[0], "vertices[0][0]").toBe(7);
            const block = await readU32(ctx, frontier.counters.buffer, 26, frontier.counters.offset);
            const seeded = new Uint32Array(26);
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
            path: PATH.twoPhase,
        });
    });

    it("the boundary-index rule: firstOfSubmit 0 subtracts nothing, 1 (and any larger index) subtracts the count and the next frontier's degree sum together (issue #391: both words exact from the second boundary on); nextDegreeSum is zeroed for the next level; maxDepth 0 sets done and path 0", async (t) => {
        const ctx = await context(t);
        // frontierDegreeSum is the EXPANDED sum (rotated into prevDegreeSum, never subtracted); nextDegreeSum is the
        // degree of the frontier rotated in, which is what the boundary subtracts and tests against
        const seed = {
            unvisitedCount: 5,
            unvisitedDegreeSum: 9,
            nextFrontierCount: 1,
            frontierDegreeSum: 4,
            nextDegreeSum: 3,
            level: U32_MAX,
        };
        const expected: readonly (readonly [number, number, number])[] = [
            [0, 5, 9],
            [1, 4, 6],
            [2, 4, 6],
        ];
        for (const [firstOfSubmit, unvisitedCount, unvisitedDegreeSum] of expected) {
            const run = await runBoundary(ctx, [{ role: 0, fields: { firstOfSubmit } }], { seed });
            expect(run.counters, `firstOfSubmit ${firstOfSubmit}`).toMatchObject({
                unvisitedCount,
                unvisitedDegreeSum,
                prevDegreeSum: 4,
                frontierDegreeSum: 0,
                nextDegreeSum: 0,
                frontierCount: 1,
                level: 0,
                done: 0,
                path: PATH.twoPhase,
            });
        }
        const capped = await runBoundary(ctx, [{ role: 0, fields: { maxDepth: 0 } }], { seed });
        expect(capped.counters).toMatchObject({ done: 1, level: 0, frontierCount: 1, path: PATH.none });
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
            expect(frontier.counters.size).toBe(112);
        } finally {
            scope.dispose();
        }
    });

    it("role 0 with mode 1, fusedMax 0 chooses the two-phase path for any count in word 1; role 1 then keeps it and counts one two-phase level with edgeCount 0", async (t) => {
        const ctx = await context(t);
        for (const count of [1, 255, 256, 257, 4097, 16_776_961]) {
            const run = await runBoundary(ctx, [{ role: 0 }, { role: 1 }], {
                seed: { nextFrontierCount: count, level: U32_MAX },
            });
            expect(run.counters, `count ${count}`).toMatchObject({
                frontierCount: count,
                path: PATH.twoPhase,
                twoPhaseLevels: 1,
                fusedLevels: 0,
                edgeCount: 0,
            });
        }
    });

    it("the fused path: word 1 = 300 under fusedMax U32_MAX chooses path 2 and counts a fused level; so does 70,000 (bfs-fused sizes itself from frontierCount, there is no slot to split)", async (t) => {
        const ctx = await context(t);
        const small = await runBoundary(ctx, [{ role: 0, fields: { fusedMax: U32_MAX } }], {
            seed: { nextFrontierCount: 300, level: U32_MAX },
        });
        expect(small.counters).toMatchObject({
            path: PATH.fused,
            fusedLevels: 1,
            twoPhaseLevels: 0,
            frontierCount: 300,
        });
        const large = await runBoundary(ctx, [{ role: 0, fields: { fusedMax: U32_MAX } }], {
            seed: { nextFrontierCount: 70_000, level: U32_MAX },
        });
        expect(large.counters).toMatchObject({ path: PATH.fused, fusedLevels: 1, frontierCount: 70_000 });
        // at the threshold the count is NOT below fusedMax: the two-phase path
        const at = await runBoundary(ctx, [{ role: 0, fields: { fusedMax: 300 } }], {
            seed: { nextFrontierCount: 300, level: U32_MAX },
        });
        expect(at.counters).toMatchObject({ path: PATH.twoPhase, fusedLevels: 0 });
    });

    it("role 1 after a two-phase role 0: an unclamped total above the capacity switches the path to the fused retry and counts an overflow; a total within it keeps the two-phase path and counts a two-phase level, also for zero edges", async (t) => {
        const ctx = await context(t);
        const seed = { nextFrontierCount: 300, level: U32_MAX };
        const overflow = await runBoundary(
            ctx,
            [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 4096, edgeCountUnclamped: 50_000 } }],
            { seed, edgeCapacity: 4096 },
        );
        expect(overflow.counters).toMatchObject({
            path: PATH.fusedRetry,
            frontierCount: 300,
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
        expect(fits.counters).toMatchObject({
            path: PATH.twoPhase,
            overflowLevels: 0,
            fusedLevels: 0,
            twoPhaseLevels: 1,
            edgeCount: 4096,
        });

        const empty = await runBoundary(ctx, [{ role: 0 }, { role: 1 }], { seed, edgeCapacity: 4096 });
        expect(empty.counters).toMatchObject({
            path: PATH.twoPhase,
            overflowLevels: 0,
            twoPhaseLevels: 1,
            edgeCount: 0,
        });

        // a clamped word above the capacity is clamped, never dispatched past the queue
        const clamped = await runBoundary(
            ctx,
            [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 5000, edgeCountUnclamped: 4096 } }],
            { seed, edgeCapacity: 4096 },
        );
        expect(clamped.counters).toMatchObject({ path: PATH.twoPhase, edgeCount: 4096 });
    });

    it("role 1 after a role 0 that set done, or that chose the fused path, leaves the path, twoPhaseLevels, overflowLevels and edgeCount unchanged", async (t) => {
        const ctx = await context(t);
        const afterDone = await runBoundary(ctx, [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 77 } }], {
            seed: { level: U32_MAX },
            edgeCapacity: 10,
        });
        expect(afterDone.counters).toMatchObject({
            done: 1,
            path: PATH.none,
            twoPhaseLevels: 0,
            overflowLevels: 0,
            edgeCount: 77,
        });

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
            path: PATH.fused,
            fusedLevels: 1,
            twoPhaseLevels: 0,
            overflowLevels: 0,
            edgeCount: 77,
        });
    });

    it("a role 0 that finds done already set changes no word of the block but a poisoned path word, which it zeroes; maxDepth 3 at level 2 sets done, at level 1 it does not", async (t) => {
        const ctx = await context(t);
        const seed = {
            done: 1,
            level: 5,
            frontierCount: 0,
            visitedCount: 9,
            nextFrontierCount: 4,
            fusedLevels: 2,
            twoPhaseLevels: 3,
            path: POISON,
        };
        const run = await runBoundary(ctx, [{ role: 0, level: 3 }], { seed });
        const want: Record<string, number> = {};
        for (const name of WORDS) {
            want[name] = 0;
        }
        Object.assign(want, seed, { path: PATH.none });
        expect(run.counters).toEqual(want);

        const capped = await runBoundary(ctx, [{ role: 0, fields: { maxDepth: 3 } }], {
            seed: { nextFrontierCount: 1, level: 2 },
        });
        expect(capped.counters).toMatchObject({ done: 1, level: 3, frontierCount: 1, path: PATH.none });
        const open = await runBoundary(ctx, [{ role: 0, fields: { maxDepth: 3 } }], {
            seed: { nextFrontierCount: 1, level: 1 },
        });
        expect(open.counters).toMatchObject({ done: 0, level: 2, frontierCount: 1, path: PATH.twoPhase });
    });

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
