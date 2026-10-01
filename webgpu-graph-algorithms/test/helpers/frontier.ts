/**
 * The frontier / `frontier-finalize` checks (design 5.4, 6 row 7; P8-T4) shared by test/primitives/frontier.test.ts
 * and test/sabotage/frontier.test.ts: a boundary run (a `prepareFrontier` planner over an `algorithmScope`, one
 * `reset`, a sequence of finalize roles with optional host writes into the counters block between submits, and the
 * readback of the counters block and the seeded vertex queue by their OWN bindings), and the report the sabotage
 * suite measures, bitwise (ratioOf(|a - b|, 0): any mismatch is Infinity) over the boundary scenarios that pin the
 * rotation, the fused path, the retry, the done boundary and role 1's gate. The selector's decision is the block's
 * `path` word (2026-09-25; the seven indirect slots it once wrote, and the 2,000-count ladder that held their
 * arithmetic against `indirect-finalize`, went with them: nothing dispatches from a slot any more).
 */

import { type U32 } from "@graphty/graph-format";

import { algorithmScope } from "../../src/algorithms/scope.js";
import { U32_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { FRONTIER_COUNTERS } from "../../src/kernels.js";
import {
    type FrontierFinalizeFields,
    type FrontierPlanner,
    type FrontierSeed,
    PATH,
    prepareFrontier,
    W,
} from "../../src/primitives/frontier.js";
import { readU32 } from "./device.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";

/** The word the poisoned buffers start with: never a count the suites expect. */
export const POISON = 0xdeadbeef;

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
}

/** One boundary run read back: the counters block by name and word 0 of `vertices[0]`. */
interface BoundaryRun {
    readonly counters: Readonly<Record<CounterWord, number>>;
    readonly input0: number;
}

/** The default finalize fields of every step: the trivial path rule of P8-T4 (two-phase always) and no depth cap. */
const DEFAULT_FIELDS: FrontierFinalizeFields = Object.freeze({ mode: 1, fusedMax: 0, maxDepth: U32_MAX });

/** The counters-block words in `W` order. */
const WORDS: readonly CounterWord[] = Object.freeze(Object.keys(W) as CounterWord[]);

/**
 * The counters block decoded by name through FRONTIER_COUNTERS.read (the host's decoder of the result copy).
 * @param words - the 25 words read back
 * @returns the block by name
 */
export function decodeCounters(words: U32): Readonly<Record<CounterWord, number>> {
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
 * One boundary run: a planner over a fresh scope, one reset, the steps recorded (a step with a host write closes
 * the batch first), then the two readbacks by their own bindings.
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
        const input0 = await readU32(ctx, frontier.vertices[0].buffer, 1, frontier.vertices[0].offset);
        return { counters: decodeCounters(block), input0: input0[0] };
    } finally {
        scope.dispose();
    }
}

/**
 * One bitwise sample per word of `got` against `want`.
 * @param label - the label prefix
 * @param got - the words read back
 * @param want - the expected words
 * @returns the reports
 */
export function bitwiseReports(label: string, got: ArrayLike<number>, want: ArrayLike<number>): CheckReport[] {
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
 * The sabotage check of `frontier-finalize` (spec 11.9 item 1): the five boundary scenarios -- the seed rotation
 * (word 0 rotated from word 1, `visitedCount`, `level` wrapped to 0, path 1), the fused path (path 2, `fusedLevels`
 * 1), role 1's retry after an overflow (path 4, `overflowLevels` 1), a boundary that finds `done` set (no word moves,
 * a poisoned path word zeroed), and role 1 after a `done` boundary (no count, `edgeCount` kept, path 0).
 * @param ctx - the context
 * @returns the report
 */
export async function frontierReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];

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
            path: PATH.twoPhase,
        }),
        { worst: ratioOf(Math.abs(rotate.input0 - 7), 0), worstLabel: "rotate.vertices[0][0]", samples: 1 },
    );

    const fused = await runBoundary(ctx, [{ role: 0, fields: { fusedMax: U32_MAX } }], {
        seed: { nextFrontierCount: 300, level: U32_MAX },
    });
    reports.push(...counterReports("fused", fused, { path: PATH.fused, fusedLevels: 1, twoPhaseLevels: 0 }));

    const retry = await runBoundary(
        ctx,
        [{ role: 0 }, { role: 1, writeBefore: { edgeCount: 4096, edgeCountUnclamped: 50_000 } }],
        { seed: { nextFrontierCount: 300, level: U32_MAX }, edgeCapacity: 4096 },
    );
    reports.push(
        ...counterReports("retry", retry, {
            path: PATH.fusedRetry,
            overflowLevels: 1,
            fusedLevels: 1,
            twoPhaseLevels: 0,
            edgeCount: 4096,
        }),
    );

    const doneSeed: FrontierSeed = {
        done: 1,
        level: 5,
        frontierCount: 0,
        visitedCount: 9,
        nextFrontierCount: 4,
        fusedLevels: 2,
        twoPhaseLevels: 3,
        path: POISON,
    };
    const already = await runBoundary(ctx, [{ role: 0 }], { seed: doneSeed });
    reports.push(...counterReports("already-done", already, { ...doneSeed, path: PATH.none }));

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
            path: PATH.none,
        }),
    );
    return mergeReports(reports);
}
