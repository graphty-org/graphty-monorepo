/**
 * Breadth-first search on the GPU frontier (design 8.4, 9.7, 11.3; P8-T6) against the FIFO oracle on the fixture
 * list of design 11.3, directed and undirected, from several sources including an isolated vertex and the LAST
 * index, every readback naming its buffer: `depth` EXACT (u32, bitwise); `parent` by the level rule and the
 * smallest-predecessor rule (PD-24: the oracle's FIFO parent is a valid predecessor but not this one, so never by
 * equality with the oracle) and bitwise against the host's spelling of that rule; `order` grouped by depth and
 * ascending by index within a depth (PD-14), bitwise against the host's sort of the oracle's depths and equal to the
 * oracle's level sets; `visitedCount`, `levels` and `switches` (0: top-down only until P8-T8); `maxDepth` as the CPU
 * port reads it and the normalisation cases (0, 2.5, -1, Infinity, NaN) compared with the oracle called with the
 * SAME raw value; run-twice bitwise on the four arrays and on the counters block after every submit; the device's
 * rowPtr / colIdx unchanged and the snapshot's checksums intact after a run; the inspect seam (`levelsPerSubmit: 1`,
 * `onLevel`) handing back every level's frontier as the oracle's set; the one-workgroup `sssp-pred` case that proves
 * the predecessor pass strides; the run options; and the gate's two named fixtures under the leak counter --
 * `ceil(levels / 32) + 1` mapAsync calls (PD-7), one per submit plus the result batch.
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { type BfsTuning, bfsWithTuning, breadthFirstSearch } from "../../src/algorithms/bfs.js";
import { FUSED_FRONTIER_MAX, MAX_LEVELS_PER_SUBMIT, U32_MAX } from "../../src/constants.js";
import { GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { type UniformValues } from "../../src/kernel/struct-block.js";
import { verifyDevice } from "../../src/primitives/verify.js";
import { type BfsOptions } from "../../src/types/accelerator.js";
import { type GpuBfsResult } from "../../src/types/traversal.js";
import { levelsOf } from "../helpers/advance.js";
import {
    bfsReport,
    levelCountOf,
    runPredOneWorkgroup,
    smallestParents,
    sortedOrder,
    STRIDE_PATH_NODES,
} from "../helpers/bfs.js";
import { readU32 } from "../helpers/device.js";
import {
    completeEdges,
    type EdgeSpec,
    gridEdges,
    KARATE_EDGES,
    pathEdges,
    randomEdges,
    randomEdgesLoose,
    rmatEdges,
    snapshotOf,
    starEdges,
} from "../helpers/graphs.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import {
    expectLevelConsistent,
    expectOrderGroupedByLevel,
    expectSmallestPredecessor,
} from "../helpers/traversal-check.js";
import { bfsOracle } from "../oracle/traversal.js";
import { acquire, acquireRaw, gpuScale, requireGpu } from "../setup/gpu.js";

/** One fixture of design 11.3: its edges, an optional node count (isolated vertices above the edges' indices) and the sources to run from (`-1` = the last index). */
interface Fixture {
    readonly name: string;
    readonly edges: readonly EdgeSpec[];
    readonly nodeCount?: number | undefined;
    readonly sources: readonly number[];
}

const FIXTURES: readonly Fixture[] = [
    { name: "one", edges: [], nodeCount: 1, sources: [0] },
    {
        name: "self-loop",
        edges: [
            [0, 0],
            [0, 1],
            [1, 2],
        ],
        sources: [0, -1],
    },
    { name: "karate", edges: KARATE_EDGES, sources: [0, 16, -1] },
    { name: "grid30", edges: gridEdges(30, 30), sources: [0, 465, -1] },
    { name: "path500", edges: pathEdges(500), sources: [0, 250, -1] },
    { name: "star10k", edges: starEdges(10_000), sources: [0, -1] },
    { name: "complete64", edges: completeEdges(64), sources: [0, -1] },
    // three isolated vertices above the random graph's indices: the last index is isolated
    { name: "random1k-isolated", edges: randomEdges(1000, 5000, 1001), nodeCount: 1003, sources: [0, -1] },
    // self-loops, parallels and integer weights (ignored by a traversal)
    { name: "loose", edges: randomEdgesLoose(600, 2400, 7), nodeCount: 600, sources: [0, -1] },
    { name: "rmat14", edges: rmatEdges(14, 10, 7), sources: [0, -1] },
];

/** The star hub's degree (the gate's workgroup-tier row). */
const HUB_DEGREE = 10_000;

/** Awaits a rejection and asserts its code; returns the error for detail assertions. */
async function expectRejection(promise: Promise<unknown>, code: string): Promise<WebGpuGraphError> {
    let caught: unknown = null;
    try {
        await promise;
    } catch (err) {
        caught = err;
    }
    expect(caught).toMatchObject({ code });
    return caught as WebGpuGraphError;
}

/** The reached nodes of `order` grouped by depth, each group sorted ascending. */
function levelSetsOf(order: U32, depth: U32): number[][] {
    const groups: number[][] = [];
    for (const v of order) {
        const d = depth[v];
        while (groups.length <= d) {
            groups.push([]);
        }
        groups[d].push(v);
    }
    return groups.map((group) => group.sort((a, b) => a - b));
}

/** The two forced candidate rules of P8-T7 Step 4 beside the default: `fusedMax 0` never fuses a level, `U32_MAX` fuses every level. */
const FORCED_THRESHOLDS: readonly (readonly [string, number])[] = [
    ["never fused (fusedMax 0)", 0],
    ["always fused (fusedMax U32_MAX)", U32_MAX],
];

/** The level sizes the oracle predicts (level 0 is the source alone), in level order. */
function levelSizesOf(s: GraphSnapshot, source: number): number[] {
    return levelsOf(s, source).map((level) => level.length);
}

/** The last element of a non-empty list. */
function lastOf<T>(items: readonly T[], label: string): T {
    expect(items.length, label).toBeGreaterThan(0);
    return items[items.length - 1];
}

/** The mapAsync count PD-7 predicts for `levels`: one per submit plus one for the result batch; a level count that is an exact multiple of the cadence needs one more submit for the done boundary. */
function expectedMaps(levels: number): number {
    return levels % MAX_LEVELS_PER_SUBMIT === 0
        ? Math.floor(levels / MAX_LEVELS_PER_SUBMIT) + 2
        : Math.ceil(levels / MAX_LEVELS_PER_SUBMIT) + 1;
}

describe("breadthFirstSearch (design 8.4 / 9.7; P8-T6)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "bfs" }));
        shared = ctx;
        return ctx;
    }

    /**
     * The differential of one run: twice through the tuning entry (which reads the counters block after every
     * submit), every array against the oracle and the host rules, the two runs bitwise.
     */
    async function checkRun(
        ctx: GpuContext,
        label: string,
        s: GraphSnapshot,
        source: number,
        options?: BfsOptions,
    ): Promise<GpuBfsResult> {
        const want = bfsOracle(s, source, options?.maxDepth);
        const blocks: UniformValues[] = [];
        const first = await bfsWithTuning(ctx, s, source, options, {
            onLevel: (_level, block) => {
                blocks.push(block);
            },
        });
        const again: UniformValues[] = [];
        const second = await bfsWithTuning(ctx, s, source, options, {
            onLevel: (_level, block) => {
                again.push(block);
            },
        });
        expect(first.depth).toBeInstanceOf(Uint32Array);
        expectBitwiseEqual(first.depth, want.depth, `${label}: depth (the depth buffer) vs the oracle`);
        expectLevelConsistent(first, s, source);
        expectSmallestPredecessor(first, s);
        expectBitwiseEqual(
            first.parent,
            smallestParents(s, want.depth),
            `${label}: parent (the pred buffer) vs the host rule`,
        );
        expectOrderGroupedByLevel(first);
        expectBitwiseEqual(
            first.order,
            sortedOrder(want.depth),
            `${label}: order (the sorted vals buffer) vs the host sort`,
        );
        expect(levelSetsOf(first.order, first.depth), `${label}: the level sets of order`).toEqual(
            levelSetsOf(want.order, want.depth),
        );
        expect(first.visitedCount, `${label}: visitedCount (the counters block)`).toBe(want.visitedCount);
        expect(first.levels, `${label}: levels (the counters block)`).toBe(levelCountOf(want.depth));
        expect(first.switches, `${label}: switches (the counters block)`).toBe(0);
        expectBitwiseEqual(second.depth, first.depth, `${label}: depth, run twice`);
        expectBitwiseEqual(second.parent, first.parent, `${label}: parent, run twice`);
        expectBitwiseEqual(second.order, first.order, `${label}: order, run twice`);
        expect(second.visitedCount).toBe(first.visitedCount);
        expect(second.levels).toBe(first.levels);
        expect(blocks.length, `${label}: submits`).toBeGreaterThan(0);
        expect(again, `${label}: the counters block after every submit, run twice`).toEqual(blocks);
        // P8-T7 Step 4: the two forced candidate rules agree with the default bitwise (PD-14)
        for (const [name, fusedMax] of FORCED_THRESHOLDS) {
            const forced = await bfsWithTuning(ctx, s, source, options, { fusedMax });
            expectBitwiseEqual(forced.depth, first.depth, `${label}: depth, ${name} vs the default`);
            expectBitwiseEqual(forced.parent, first.parent, `${label}: parent, ${name} vs the default`);
            expectBitwiseEqual(forced.order, first.order, `${label}: order, ${name} vs the default`);
            expect(forced.visitedCount, `${label}: visitedCount, ${name}`).toBe(first.visitedCount);
            expect(forced.levels, `${label}: levels, ${name}`).toBe(first.levels);
        }
        return first;
    }

    /** One run through the tuning entry with the counters block as its LAST submit left it: the choice counters freeze at the done boundary. */
    async function runWithCounters(
        ctx: GpuContext,
        s: GraphSnapshot,
        source: number,
        options: BfsOptions | undefined,
        tuning: BfsTuning,
    ): Promise<{ result: GpuBfsResult; block: UniformValues }> {
        const blocks: UniformValues[] = [];
        const result = await bfsWithTuning(ctx, s, source, options, {
            ...tuning,
            onLevel: (_level, block) => {
                blocks.push(block);
            },
        });
        return { result, block: lastOf(blocks, "submits") };
    }

    /** P8-T7 Step 4's invariant: the three choice counters count the boundaries that dispatched a level, which is the level word. */
    function expectChoicesSumToLevel(block: UniformValues, label: string): void {
        const fused = block.fusedLevels;
        const twoPhase = block.twoPhaseLevels;
        const bottomUp = block.bottomUpLevels;
        expect(bottomUp, `${label}: bottomUpLevels (the counters block)`).toBe(0);
        expect(
            Number(fused) + Number(twoPhase) + Number(bottomUp),
            `${label}: fusedLevels + twoPhaseLevels + bottomUpLevels vs the level word`,
        ).toBe(block.level);
    }

    for (const fixture of FIXTURES) {
        for (const directed of [false, true]) {
            const kind = directed ? "directed" : "undirected";
            it(`${fixture.name} (${kind}): depth exact, parent by the smallest-predecessor rule, order grouped and sorted, counts, run twice`, async (t) => {
                const ctx = await context(t);
                const s = snapshotOf(fixture.edges, {
                    directed,
                    nodeCount: fixture.nodeCount,
                    label: `${fixture.name}-${kind}`,
                });
                for (const raw of fixture.sources) {
                    const source = raw < 0 ? s.nodeCount - 1 : raw;
                    await checkRun(ctx, `${fixture.name} ${kind} from ${source}`, s, source);
                }
                ctx.release(s);
            }, 300_000);
        }
    }

    it("the empty graph is E_INVALID_ARGUMENT { argument: 'source' } for any source; so is a source outside [0, n)", async (t) => {
        const ctx = await context(t);
        const empty = snapshotOf([], { nodeCount: 0, label: "empty" });
        for (const source of [0, 1, -1]) {
            const err = await expectRejection(breadthFirstSearch(ctx, empty, source), "E_INVALID_ARGUMENT");
            expect(err.details).toMatchObject({ argument: "source" });
        }
        const karate = snapshotOf(KARATE_EDGES, { label: "karate-source" });
        for (const source of [34, -1, 1.5, Number.NaN]) {
            const err = await expectRejection(breadthFirstSearch(ctx, karate, source), "E_INVALID_ARGUMENT");
            expect(err.details).toMatchObject({ argument: "source" });
        }
    });

    it("maxDepth 2 on the star (from the hub and from a leaf) and on the grid: a node at the cap is reached and not expanded, visitedCount equals the oracle's under the same cap, no depth exceeds 2", async (t) => {
        const ctx = await context(t);
        const star = snapshotOf(starEdges(HUB_DEGREE), { label: "star-cap" });
        const grid = snapshotOf(gridEdges(30, 30), { label: "grid-cap" });
        for (const [label, s, source] of [
            ["star from the hub", star, 0],
            ["star from a leaf", star, HUB_DEGREE],
            ["grid from the corner", grid, 0],
        ] as const) {
            const result = await checkRun(ctx, `${label} maxDepth 2`, s, source, { maxDepth: 2 });
            let deepest = 0;
            for (const d of result.depth) {
                if (d !== INVALID_INDEX) {
                    deepest = Math.max(deepest, d);
                }
            }
            expect(deepest, `${label}: the deepest reached node`).toBeLessThanOrEqual(2);
            expect(result.levels).toBe(deepest + 1);
        }
        const leaf = await breadthFirstSearch(ctx, star, HUB_DEGREE, { maxDepth: 1 });
        expect(leaf.visitedCount).toBe(2);
        expect(leaf.levels).toBe(2);
        ctx.release(star);
        ctx.release(grid);
    });

    it("the maxDepth normalisation cases on the grid, each compared with the oracle under the SAME raw value: 0 and -1 are the source alone, 2.5 is 3, Infinity and NaN are no cap; none throws", async (t) => {
        const ctx = await context(t);
        const grid = snapshotOf(gridEdges(30, 30), { label: "grid-normalise" });
        const uncapped = await checkRun(ctx, "grid uncapped", grid, 0);
        const three = await checkRun(ctx, "grid maxDepth 3", grid, 0, { maxDepth: 3 });
        for (const raw of [0, -1]) {
            const alone = await checkRun(ctx, `grid maxDepth ${raw}`, grid, 0, { maxDepth: raw });
            expect(alone.visitedCount).toBe(1);
            expect(alone.levels).toBe(1);
            expect(Array.from(alone.order)).toEqual([0]);
        }
        const half = await checkRun(ctx, "grid maxDepth 2.5", grid, 0, { maxDepth: 2.5 });
        expectBitwiseEqual(half.depth, three.depth, "maxDepth 2.5 vs 3: depth");
        expect(half.visitedCount).toBe(three.visitedCount);
        for (const raw of [Number.POSITIVE_INFINITY, Number.NaN]) {
            const same = await checkRun(ctx, `grid maxDepth ${raw}`, grid, 0, { maxDepth: raw });
            expectBitwiseEqual(same.depth, uncapped.depth, `maxDepth ${raw} vs no cap: depth`);
            expect(same.visitedCount).toBe(uncapped.visitedCount);
            expect(same.levels).toBe(uncapped.levels);
        }
        ctx.release(grid);
    });

    it("the inspect seam: levelsPerSubmit 1 hands back every level's frontier (the next level's input queue) as the oracle's set, with frontierCount and level from the block", async (t) => {
        const ctx = await context(t);
        const grid = snapshotOf(gridEdges(30, 30), { label: "grid-inspect" });
        const levels = levelsOf(grid, 0);
        const seen: { level: number; block: UniformValues; frontier: number[] }[] = [];
        const result = await bfsWithTuning(ctx, grid, 0, undefined, {
            levelsPerSubmit: 1,
            onLevel: (level, block, frontier) => {
                seen.push({ level, block, frontier: Array.from(frontier).sort((a, b) => a - b) });
            },
        });
        expect(result.levels).toBe(levels.length);
        // one submit per level, plus the boundary that finds the frontier empty
        expect(seen).toHaveLength(levels.length + 1);
        seen.forEach((entry, k) => {
            expect(entry.level).toBe(k);
            expect(entry.block.level, `level word after submit ${k}`).toBe(k);
            if (k < levels.length) {
                expect(entry.block.frontierCount, `frontierCount after submit ${k}`).toBe(levels[k].length);
                expect(entry.frontier, `the frontier handed back after submit ${k}`).toEqual(levels[k + 1] ?? []);
                expect(entry.block.done).toBe(0);
            } else {
                expect(entry.block.frontierCount).toBe(0);
                expect(entry.block.done).toBe(1);
                expect(entry.frontier).toEqual([]);
            }
        });
        ctx.release(grid);
    });

    it("the run options: dest is filled and returned as depth, a wrong dest is E_INVALID_ARGUMENT, an aborted signal is E_ABORTED, onProgress reports per submit up to n, a bad levelsPerSubmit is refused", async (t) => {
        const ctx = await context(t);
        const path = snapshotOf(pathEdges(100), { label: "path-options" });
        const n = path.nodeCount;
        const dest = new Uint32Array(n);
        const seen: number[] = [];
        let total = -1;
        const result = await breadthFirstSearch(ctx, path, 0, {
            dest,
            onProgress: (done, max) => {
                seen.push(done);
                total = max;
            },
        });
        expect(result.depth).toBe(dest);
        expectBitwiseEqual(dest, bfsOracle(path, 0).depth, "dest (the depth buffer) vs the oracle");
        expect(total).toBe(n);
        expect(seen).toHaveLength(expectedMaps(result.levels) - 1);
        for (let i = 1; i < seen.length; i++) {
            expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
        }
        expect(seen[seen.length - 1]).toBeLessThanOrEqual(n);
        const wrong = await expectRejection(
            breadthFirstSearch(ctx, path, 0, { dest: new Float32Array(n) }),
            "E_INVALID_ARGUMENT",
        );
        expect(wrong.details).toMatchObject({ argument: "dest" });
        const short = await expectRejection(
            breadthFirstSearch(ctx, path, 0, { dest: new Uint32Array(n - 1) }),
            "E_INVALID_ARGUMENT",
        );
        expect(short.details).toMatchObject({ argument: "dest" });
        const controller = new AbortController();
        controller.abort();
        await expectRejection(breadthFirstSearch(ctx, path, 0, { signal: controller.signal }), "E_ABORTED");
        for (const levelsPerSubmit of [0, MAX_LEVELS_PER_SUBMIT + 1, 1.5]) {
            const err = await expectRejection(
                bfsWithTuning(ctx, path, 0, undefined, { levelsPerSubmit }),
                "E_INVALID_ARGUMENT",
            );
            expect(err.details).toMatchObject({ argument: "levelsPerSubmit" });
        }
        ctx.release(path);
    });

    it("no kernel writes into a view: the device's rowPtr and colIdx read back equal the snapshot's after a run, and validate({ checksum: true }) passes", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES, { checksum: true, label: "karate-checksum" });
        await checkRun(ctx, "karate checksum", s, 0);
        const core = ctx.residency.core(s);
        const rowPtr = await readU32(ctx, core.rowPtr.buffer, s.nodeCount + 1, core.rowPtr.offset);
        expectBitwiseEqual(rowPtr, s.rowPtr, "the device rowPtr after the run");
        expect(core.colIdx).not.toBeNull();
        if (core.colIdx !== null) {
            const colIdx = await readU32(ctx, core.colIdx.buffer, s.arcCount, core.colIdx.offset);
            expectBitwiseEqual(colIdx, s.colIdx, "the device colIdx after the run");
        }
        expect(() => {
            s.validate({ checksum: true });
        }).not.toThrow();
        ctx.release(s);
    });

    it("the predecessor pass strides: sssp-pred (MODE 1) over ONE workgroup with the 1,000-node path's depths writes pred[v] = v - 1 for every v >= 1", async (t) => {
        const ctx = await context(t);
        const pred = await runPredOneWorkgroup(ctx);
        expect(pred).toHaveLength(STRIDE_PATH_NODES);
        expect(pred[0]).toBe(INVALID_INDEX);
        let wrong = -1;
        for (let v = 1; v < STRIDE_PATH_NODES; v++) {
            if (pred[v] !== v - 1) {
                wrong = v;
                break;
            }
        }
        expect(wrong, `first wrong pred word (${wrong >= 0 ? pred[wrong] : "-"})`).toBe(-1);
    });

    it("the device-side per-level choice (P8-T7): on rmat14 at the default fusedMax the selector picks the fused path and the two-phase path each at least once, fusedLevels equals the number of oracle levels below FUSED_FRONTIER_MAX and twoPhaseLevels the number at or above it, and the choices sum to the level word", async (t) => {
        const ctx = await context(t);
        for (const directed of [false, true]) {
            const kind = directed ? "directed" : "undirected";
            const s = snapshotOf(rmatEdges(14, 10, 7), { directed, label: `rmat14-choice-${kind}` });
            const sizes = levelSizesOf(s, 0);
            const fused = sizes.filter((size) => size < FUSED_FRONTIER_MAX).length;
            const { result, block } = await runWithCounters(ctx, s, 0, undefined, {});
            console.warn(
                `[bfs] rmat14 ${kind} from 0: level sizes ${sizes.join(" ")} -> fused ${fused}, two-phase ${sizes.length - fused}`,
            );
            expect(block.fusedLevels, `${kind}: fusedLevels (the counters block)`).toBeGreaterThan(0);
            expect(block.twoPhaseLevels, `${kind}: twoPhaseLevels (the counters block)`).toBeGreaterThan(0);
            expect(block.fusedLevels, `${kind}: fusedLevels vs the oracle's level sizes`).toBe(fused);
            expect(block.twoPhaseLevels, `${kind}: twoPhaseLevels vs the oracle's level sizes`).toBe(
                sizes.length - fused,
            );
            expect(block.overflowLevels, `${kind}: overflowLevels`).toBe(0);
            expect(block.level, `${kind}: the level word`).toBe(sizes.length);
            expectChoicesSumToLevel(block, kind);
            expectBitwiseEqual(result.depth, bfsOracle(s, 0).depth, `${kind}: depth (the depth buffer) vs the oracle`);
            ctx.release(s);
        }
    }, 120_000);

    it("the overflow retry (PD-23, P8-T7): with edgeCapacity 4096 and the two-phase path forced (fusedMax 0) the undirected star from the hub overflows on both levels and the directed star on one, rmat14 on at least one; depth stays exact, every fused level is a retry, and the choices sum to the level word (levels - 1 when maxDepth stopped the run)", async (t) => {
        const ctx = await context(t);
        const tuning: BfsTuning = { edgeCapacity: 4096, fusedMax: 0 };
        for (const [label, edges, directed, overflows] of [
            ["undirected star from the hub", starEdges(HUB_DEGREE), false, 2],
            ["directed star from the hub", starEdges(HUB_DEGREE), true, 1],
            ["rmat14 from 0", rmatEdges(14, 10, 7), false, null],
        ] as const) {
            const s = snapshotOf(edges, { directed, label: `overflow-${label}` });
            const want = bfsOracle(s, 0);
            const { result, block } = await runWithCounters(ctx, s, 0, undefined, tuning);
            expectBitwiseEqual(result.depth, want.depth, `${label}: depth (the depth buffer) vs the oracle`);
            expect(result.visitedCount, `${label}: visitedCount`).toBe(want.visitedCount);
            if (overflows === null) {
                expect(block.overflowLevels, `${label}: overflowLevels (the counters block)`).toBeGreaterThan(0);
            } else {
                expect(block.overflowLevels, `${label}: overflowLevels (the counters block)`).toBe(overflows);
            }
            // fusedMax 0 never chooses the fused slot at a boundary, so every fused level is role 1's retry
            expect(block.fusedLevels, `${label}: fusedLevels vs overflowLevels`).toBe(block.overflowLevels);
            expect(block.twoPhaseLevels, `${label}: twoPhaseLevels`).toBe(
                Number(block.level) - Number(block.overflowLevels),
            );
            expect(block.level, `${label}: the level word`).toBe(result.levels);
            expectChoicesSumToLevel(block, label);
            ctx.release(s);
        }
        // maxDepth stops the run with a reached-but-unexpanded level: the capped boundary chose nothing
        const star = snapshotOf(starEdges(HUB_DEGREE), { label: "star-capped-choice" });
        const capped = await runWithCounters(ctx, star, 0, { maxDepth: 1 }, {});
        expect(capped.result.levels).toBe(2);
        expect(capped.block.level, "the level word under maxDepth 1").toBe(1);
        expect(capped.block.fusedLevels, "fusedLevels under maxDepth 1 (the hub alone is below the threshold)").toBe(1);
        expectChoicesSumToLevel(capped.block, "star maxDepth 1");
        ctx.release(star);
    }, 120_000);

    it("the sabotage check passes on the real kernels (factor 0)", async (t) => {
        const ctx = await context(t);
        const report = await bfsReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    }, 120_000);

    it("gate (PD-7): the scaled 1,000 x 1,000 grid and the 10,000-degree star from the hub map exactly ceil(levels / 32) + 1 staging buffers each, on an adopted device after the self-check", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        try {
            // the device self-check runs once per device and maps two staging buffers of its own; pay it first
            await verifyDevice(own);
            const side = Math.max(4, Math.round(1000 * gpuScale()));
            const grid = snapshotOf(gridEdges(side, side), { label: "grid-gate" });
            counter.resetMapAsync();
            const result = await breadthFirstSearch(own, grid, 0);
            expect(result.levels).toBe(2 * side - 1);
            expect(counter.mapAsyncCalls, `mapAsync calls of a ${result.levels}-level traversal`).toBe(
                expectedMaps(result.levels),
            );
            expectBitwiseEqual(result.depth, bfsOracle(grid, 0).depth, "grid depth (the depth buffer) vs the oracle");
            own.release(grid);

            const star = snapshotOf(starEdges(HUB_DEGREE), { label: "star-gate" });
            counter.resetMapAsync();
            const hub = await breadthFirstSearch(own, star, 0);
            expect(hub.levels).toBe(2);
            expect(counter.mapAsyncCalls, "mapAsync calls of the star from the hub").toBe(expectedMaps(2));
            expectBitwiseEqual(hub.depth, bfsOracle(star, 0).depth, "star depth (the depth buffer) vs the oracle");
            expect(hub.visitedCount).toBe(HUB_DEGREE + 1);
            own.release(star);
            expect(own.residency.stats().buffers).toBe(0);
        } finally {
            own.dispose();
        }
        expect(counter.live, "live buffers after release + dispose").toBe(0);
        counter.restore();
    }, 600_000);
});
