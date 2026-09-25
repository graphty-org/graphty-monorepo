/**
 * The `advance` checks (design 6 row 8; P8-T5) shared by test/primitives/advance.test.ts and
 * test/sabotage/advance.test.ts: an expansion run (a `prepareFrontier` planner and a `prepareAdvance` planner over
 * one `algorithmScope`, the edge queue and the args poisoned, the frontier list written into the input queue with the
 * BFS-style seed `{ nextFrontierCount: count, level: U32_MAX }`, role 0 of `frontier-finalize`, the indirect
 * expansion, optionally role 1, and the readback of the counters block, the written span of the edge queue and the
 * word past it by their OWN bindings); the oracle's BFS levels of a fixture; a sub-multiset check; and the report
 * the sabotage suite measures, bitwise (ratioOf(|a - b|, 0): any mismatch is Infinity) over the sorted queue and the
 * three counters of the reversed karate vertex set (the reversed order is what makes a lower-bound search read the
 * wrong row at every block boundary: on an index-ordered frontier `rowStart[k - 1] + deg[k - 1]` IS `rowStart[k]`),
 * a few grid levels, the star hub, the overflow case with the faked capacity, and the star hub over arc windows under
 * a faked binding limit (P8-T12: the row straddles two windows, so an ignored clip re-counts it).
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { algorithmScope } from "../../src/algorithms/scope.js";
import { U32_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { FRONTIER_COUNTERS } from "../../src/kernels.js";
import { GraphResidency } from "../../src/memory/residency.js";
import { type AdvancePlanner, prepareAdvance } from "../../src/primitives/advance.js";
import {
    type FrontierFinalizeFields,
    type FrontierPlanner,
    prepareFrontier,
    SLOT,
} from "../../src/primitives/frontier.js";
import { advanceOracle } from "../oracle/advance.js";
import { fakeCaps } from "./caps-tables.js";
import { sortedU32 } from "./compact.js";
import { withResidency } from "./degree-check.js";
import { readU32 } from "./device.js";
import { bitwiseReports, type CounterWord, decodeCounters, POISON, slotOf, ZERO_SLOT } from "./frontier.js";
import { gridEdges, KARATE_EDGES, snapshotOf, starEdges } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";

/** The knobs of an expansion run. */
interface AdvanceOptions {
    /** A faked edge-queue capacity (the overflow case); omitted: `prepareFrontier`'s default. */
    readonly edgeCapacity?: number | undefined;
    /** Record `frontier-finalize` role 1 after the expansion (the clamp and the retry slot). */
    readonly role1?: boolean | undefined;
}

/** One expansion read back: the first `min(edgeCount, edgeCapacity)` words of the edge queue, the word past them (null at the capacity), the counters block by name and every args word. */
interface AdvanceRun {
    readonly queue: U32;
    readonly tail: number | null;
    readonly counters: Readonly<Record<CounterWord, number>>;
    readonly args: U32;
}

/** The trivial candidate rule of P8-T4 (slot 0 always) and no depth cap. */
const FIELDS: FrontierFinalizeFields = Object.freeze({ mode: 1, fusedMax: 0, maxDepth: U32_MAX });

/**
 * Expands every frontier of `frontiers` over `s`, one submit each, with the two planners prepared once: the edge
 * queue and the args poisoned before each, the list written into the input queue after `reset` (which seeds
 * `nextFrontierCount` with the count so role 0 rotates it in), then the three readbacks.
 * @param ctx - the context
 * @param s - the snapshot (uploaded through the context's residency)
 * @param frontiers - the frontier vertex lists
 * @param options - the knobs
 * @returns one run per frontier, in order
 */
export async function runAdvance(
    ctx: GpuContext,
    s: GraphSnapshot,
    frontiers: readonly ArrayLike<number>[],
    options?: AdvanceOptions,
): Promise<AdvanceRun[]> {
    // the ring holds the finalize records and one advance record PER WINDOW of the core (P8-T12); the run asserts
    // no reservation wrapped over a dirty record, the overrun the counter exists to name
    const core = ctx.residency.core(s);
    const scope = algorithmScope(ctx, "advance-test", 4 + (core.windows?.length ?? 1));
    try {
        const planner: FrontierPlanner = await prepareFrontier(scope, s.nodeCount, s.arcCount, options?.edgeCapacity);
        const advance: AdvancePlanner = await prepareAdvance(scope, core);
        const { frontier } = planner;
        const { queue } = ctx.device;
        const argWords = frontier.args.size / 4;
        const runs: AdvanceRun[] = [];
        for (const list of frontiers) {
            const count = list.length;
            queue.writeBuffer(
                frontier.edgeQueue.buffer,
                frontier.edgeQueue.offset,
                new Uint32Array(frontier.edgeCapacity).fill(POISON),
            );
            queue.writeBuffer(frontier.args.buffer, frontier.args.offset, new Uint32Array(argWords).fill(POISON));
            frontier.reset(queue, 0, { nextFrontierCount: count, level: U32_MAX });
            if (count > 0) {
                queue.writeBuffer(frontier.input.buffer, frontier.input.offset, Uint32Array.from(list));
            }
            const batch = new CommandBatch(ctx, "advance-test");
            const pass = batch.pass("advance");
            planner.recordFinalize(pass, 0, 0, FIELDS);
            advance.record(pass, frontier);
            if (options?.role1 === true) {
                planner.recordFinalize(pass, 1, 0, FIELDS);
            }
            scope.flush();
            expect(scope.ringOverruns(), "advance-test ring overruns").toBe(0);
            await batch.submit().readback;
            const block = await readU32(
                ctx,
                frontier.counters.buffer,
                FRONTIER_COUNTERS.byteLength / 4,
                frontier.counters.offset,
            );
            const counters = decodeCounters(block);
            const written = Math.min(counters.edgeCount, frontier.edgeCapacity);
            const span = written < frontier.edgeCapacity ? written + 1 : written;
            const words =
                span > 0
                    ? await readU32(ctx, frontier.edgeQueue.buffer, span, frontier.edgeQueue.offset)
                    : new Uint32Array(0);
            const args = await readU32(ctx, frontier.args.buffer, argWords, frontier.args.offset);
            runs.push({
                queue: words.slice(0, written),
                tail: span > written ? words[written] : null,
                counters,
                args,
            });
        }
        return runs;
    } finally {
        scope.dispose();
    }
}

/**
 * The levels of a breadth-first search from `source` (the FIFO oracle's depths), each ascending by index: the
 * frontier the GPU's sorted `order` would present at that level.
 * @param s - the snapshot
 * @param source - the source vertex
 * @returns the levels, level 0 the source alone
 */
export function levelsOf(s: GraphSnapshot, source: number): number[][] {
    const depth = new Uint32Array(s.nodeCount).fill(INVALID_INDEX);
    const levels: number[][] = [[source]];
    depth[source] = 0;
    for (let d = 0; d < levels.length; d++) {
        const next: number[] = [];
        for (const u of levels[d]) {
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                const v = s.colIdx[a];
                if (depth[v] === INVALID_INDEX) {
                    depth[v] = d + 1;
                    next.push(v);
                }
            }
        }
        next.sort((a, b) => a - b);
        if (next.length > 0) {
            levels.push(next);
        }
    }
    return levels;
}

/**
 * The words of `got` (sorted) that `want` (sorted) cannot supply with multiplicity: 0 when `got` is a sub-multiset.
 * @param got - the sorted words read back
 * @param want - the sorted oracle multiset
 * @returns how many words of `got` are not covered
 */
function uncovered(got: U32, want: U32): number {
    let j = 0;
    let missing = 0;
    for (let i = 0; i < got.length; i++) {
        while (j < want.length && want[j] < got[i]) {
            j++;
        }
        if (j < want.length && want[j] === got[i]) {
            j++;
        } else {
            missing++;
        }
    }
    return missing;
}

/**
 * Asserts `got` is a sub-multiset of `want` (both sorted ascending).
 * @param got - the sorted words read back
 * @param want - the sorted oracle multiset
 * @param label - the assertion's label
 */
export function expectSubMultiset(got: U32, want: U32, label: string): void {
    expect(uncovered(got, want), `${label}: words not in the oracle's multiset`).toBe(0);
}

/**
 * The samples of one run against the oracle: the sorted queue word by word and the three counters, all bitwise.
 * @param label - the scenario
 * @param run - the run
 * @param s - the snapshot
 * @param list - the frontier
 * @returns the reports
 */
function differentialReports(label: string, run: AdvanceRun, s: GraphSnapshot, list: readonly number[]): CheckReport[] {
    const want = sortedU32(advanceOracle(s, list));
    return [
        ...bitwiseReports(`${label}.queue`, sortedU32(run.queue), want),
        ...bitwiseReports(
            `${label}.counters`,
            [run.counters.edgeCount, run.counters.edgeCountUnclamped, run.counters.frontierDegreeSum],
            [want.length, want.length, want.length],
        ),
    ];
}

/**
 * The sabotage check of `advance-expand` (spec 11.9 item 1): the reversed karate vertex set, a handful of the
 * 20 x 20 grid's levels and the star hub against the oracle, and the overflow case -- the unclamped word, the clamped
 * word after role 1, the sub-multiset of the 4,096 words, the zeroed contract slot, the retry slot and the overflow
 * count -- every sample bitwise.
 * @param ctx - the context
 * @returns the report
 */
export async function advanceReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    const karate = snapshotOf(KARATE_EDGES);
    const reversed = Array.from({ length: karate.nodeCount }, (_, i) => karate.nodeCount - 1 - i);
    const [karateRun] = await runAdvance(ctx, karate, [reversed]);
    reports.push(...differentialReports("karate-reversed", karateRun, karate, reversed));

    const grid = snapshotOf(gridEdges(20, 20));
    const levels = levelsOf(grid, 0).filter((_level, d) => [1, 2, 7, 19, 30].includes(d));
    const gridRuns = await runAdvance(ctx, grid, levels);
    levels.forEach((level, k) => {
        reports.push(...differentialReports(`grid-level${k}`, gridRuns[k], grid, level));
    });

    const star = snapshotOf(starEdges(10_000));
    const [hub] = await runAdvance(ctx, star, [[0]]);
    reports.push(...differentialReports("star-hub", hub, star, [0]));

    // the hub over arc windows (P8-T12): the smallest faked binding limit that still holds the star's rowPtr splits
    // the 10,000-arc hub row across two windows (9,984 arcs fit the first), the case the clip exists for; the
    // clip-ignored row re-counts the whole row in the second window
    const limit = 4 * (star.nodeCount + 1);
    const residency = new GraphResidency(
        ctx.device,
        fakeCaps(ctx.caps, { maxStorageBufferBindingSize: limit }),
        ctx.allocator,
        {
            warnUnreleasedSnapshots: 2,
        },
    );
    try {
        const hubWindows = residency.core(star).windows?.filter((w) => w.rowFirst <= 0 && w.rowLast >= 0) ?? [];
        if (hubWindows.length < 2) {
            throw new Error("advance sabotage precondition: the hub row must straddle two windows");
        }
        const [windowedHub] = await runAdvance(withResidency(ctx, residency), star, [[0]]);
        reports.push(...differentialReports("star-hub-windowed", windowedHub, star, [0]));
    } finally {
        residency.destroyAll();
    }

    const oracle = sortedU32(advanceOracle(star, [0]));
    const [overflow] = await runAdvance(ctx, star, [[0]], { edgeCapacity: 4096, role1: true });
    reports.push(
        {
            worst: ratioOf(uncovered(sortedU32(overflow.queue), oracle), 0),
            worstLabel: "overflow.queue",
            samples: 1,
        },
        ...bitwiseReports(
            "overflow.counters",
            [
                overflow.counters.edgeCount,
                overflow.counters.edgeCountUnclamped,
                overflow.counters.frontierDegreeSum,
                overflow.counters.overflowLevels,
            ],
            [4096, 10_000, 10_000, 1],
        ),
        ...bitwiseReports("overflow.slot1", slotOf(overflow.args, 0, SLOT.contract), ZERO_SLOT),
        ...bitwiseReports("overflow.slot6", slotOf(overflow.args, 0, SLOT.fusedRetry), [1, 1, 1, 1]),
    );
    return mergeReports(reports);
}
