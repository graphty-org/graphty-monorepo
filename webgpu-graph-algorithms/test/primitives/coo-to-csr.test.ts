/**
 * `cooToCsr` and the simple symmetric graph build (design 6 row 10; the P11 plan's P11-T3). The order-preserving mode
 * against the counting build of the same arcs -- bitwise, and bitwise run to run, because it is a pure function of its
 * input; the cursor mode's `rowPtr` bitwise and its rows as sorted sets (their order is the schedule's); the
 * precondition flag raised by out-of-order arcs; and the simple symmetric build of every named fixture, of a directed
 * weighted multigraph with self-loops and of a graph whose last vertices have no arcs, against the reference built
 * from the definition, handed to graph-format's `fromCsr` and validated at the "full" level (the gate's item).
 */

import { fromCsr } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { fixture, randomEdgesLoose, rmatEdges, snapshotOf } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { messyEdges, runCooToCsr, runSimpleSymmetric } from "../helpers/structure.js";
import { csrOfArcs, simpleSymmetricOracle } from "../oracle/coo.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** Arcs sorted by (source, target) from a seeded list. */
function sortedArcs(n: number, m: number, seed: number): { src: number[]; dst: number[]; w: number[] } {
    const arcs = randomEdgesLoose(n, m, seed)
        .map(([u, v]) => [u, v] as const)
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return {
        src: arcs.map((a) => a[0]),
        dst: arcs.map((a) => a[1]),
        w: arcs.map((a) => 0.25 + ((a[0] + 3 * a[1]) % 9)),
    };
}

const FIXTURES = [
    "empty",
    "one",
    "self-loop",
    "karate",
    "grid10",
    "path1k",
    "star200",
    "complete6",
    "random1k",
    "hub10k",
    "isolated",
    "parallel",
    "rmat14",
] as const;

describe("cooToCsr (GPU, design 6 row 10)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "coo-to-csr" }));
        shared = ctx;
        return ctx;
    }

    it("sorted input: rows in input order, bitwise the counting build, bitwise run to run; the flag stays 0", async (t) => {
        const ctx = await context(t);
        const n = Math.max(40, Math.round(3000 * gpuScale()));
        for (const [label, arcs] of [
            ["random", sortedArcs(n, 6 * n, 3)],
            ["trailing-empty", sortedArcs(n, 3 * n, 4)],
        ] as const) {
            const nodes = label === "trailing-empty" ? n + 25 : n;
            const want = csrOfArcs(nodes, arcs.src, arcs.dst, arcs.w);
            const a = await runCooToCsr(ctx, nodes, arcs.src, arcs.dst, arcs.w, true);
            const b = await runCooToCsr(ctx, nodes, arcs.src, arcs.dst, arcs.w, true);
            expectBitwiseEqual(a.rowPtr, b.rowPtr, `${label} rowPtr run-twice`);
            expectBitwiseEqual(a.colIdx, b.colIdx, `${label} colIdx run-twice`);
            expectBitwiseEqual(
                a.weights ?? new Float32Array(0),
                b.weights ?? new Float32Array(0),
                `${label} weights run-twice`,
            );
            expectBitwiseEqual(a.rowPtr, want.rowPtr, `${label} rowPtr`);
            expectBitwiseEqual(a.colIdx, want.colIdx, `${label} colIdx`);
            expectBitwiseEqual(
                a.weights ?? new Float32Array(0),
                want.weights ?? new Float32Array(0),
                `${label} weights`,
            );
            expect(a.flag).toBe(0);
        }
    });

    it("zero arcs, one arc and an isolated vertex: rowPtr of zeros, one row of one", async (t) => {
        const ctx = await context(t);
        const none = await runCooToCsr(ctx, 5, [], [], null, true);
        expect(Array.from(none.rowPtr)).toEqual([0, 0, 0, 0, 0, 0]);
        const one = await runCooToCsr(ctx, 3, [1], [2], [0.5], true);
        expect(Array.from(one.rowPtr)).toEqual([0, 0, 1, 1]);
        expect(Array.from(one.colIdx)).toEqual([2]);
        expect(Array.from(one.weights ?? [])).toEqual([0.5]);
        const cursor = await runCooToCsr(ctx, 3, [1], [2], null, false);
        expect(Array.from(cursor.rowPtr)).toEqual([0, 0, 1, 1]);
        expect(Array.from(cursor.colIdx)).toEqual([2]);
    });

    it("cursor mode on shuffled arcs: rowPtr bitwise (run twice too), every row the right set of targets", async (t) => {
        const ctx = await context(t);
        const n = Math.max(40, Math.round(2000 * gpuScale()));
        const arcs = randomEdgesLoose(n, 5 * n, 9);
        const src = arcs.map((e) => e[0]);
        const dst = arcs.map((e) => e[1]);
        const order = src.map((_, i) => i).sort((a, b) => src[a] - src[b] || dst[a] - dst[b]);
        const want = csrOfArcs(
            n,
            order.map((i) => src[i]),
            order.map((i) => dst[i]),
            null,
        );
        const a = await runCooToCsr(ctx, n, src, dst, null, false);
        const b = await runCooToCsr(ctx, n, src, dst, null, false);
        expectBitwiseEqual(a.rowPtr, b.rowPtr, "cursor rowPtr run-twice");
        expectBitwiseEqual(a.rowPtr, want.rowPtr, "cursor rowPtr");
        for (let v = 0; v < n; v++) {
            const row = Array.from(a.colIdx.subarray(a.rowPtr[v], a.rowPtr[v + 1])).sort((x, y) => x - y);
            expect(row, `row ${v}`).toEqual(Array.from(want.colIdx.subarray(want.rowPtr[v], want.rowPtr[v + 1])));
        }
    });

    it("the sorted-input precondition is checked: out-of-order sources raise the flag", async (t) => {
        const ctx = await context(t);
        const run = await runCooToCsr(ctx, 4, [2, 0, 1, 3], [0, 1, 2, 0], null, true);
        expect(run.flag).toBe(1);
    });

    afterAll(() => {
        shared?.dispose();
    });
});

describe("the simple symmetric graph (GPU, the P11 plan's PD-4)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "simple-symmetric" }));
        shared = ctx;
        return ctx;
    }

    for (const name of FIXTURES) {
        it(`${name}: bitwise the reference, twice; fromCsr validates it at the full level`, async (t) => {
            const ctx = await context(t);
            const { snapshot } = fixture(name, gpuScale());
            const want = simpleSymmetricOracle(snapshot);
            const a = await runSimpleSymmetric(ctx, snapshot, true);
            const b = await runSimpleSymmetric(ctx, snapshot, true);
            expectBitwiseEqual(a.rowPtr, b.rowPtr, `${name} rowPtr run-twice`);
            expectBitwiseEqual(a.colIdx, b.colIdx, `${name} colIdx run-twice`);
            expectBitwiseEqual(
                a.weights ?? new Float32Array(0),
                b.weights ?? new Float32Array(0),
                `${name} weights run-twice`,
            );
            expectBitwiseEqual(a.rowPtr, want.rowPtr, `${name} rowPtr`);
            expectBitwiseEqual(a.colIdx, want.colIdx, `${name} colIdx`);
            if (want.colIdx.length > 0) {
                expectBitwiseEqual(
                    a.weights ?? new Float32Array(0),
                    want.weights ?? new Float32Array(0),
                    `${name} weights`,
                );
            }
            for (let v = 0; v < want.n; v++) {
                for (let arc = a.rowPtr[v]; arc < a.rowPtr[v + 1]; arc++) {
                    expect(a.src[arc]).toBe(v);
                }
            }
            if (snapshot.nodeCount > 0) {
                const s = fromCsr(
                    {
                        directed: true,
                        nodeCount: snapshot.nodeCount,
                        rowPtr: a.rowPtr,
                        colIdx: a.colIdx,
                        weights: a.colIdx.length > 0 ? a.weights : null,
                    },
                    { validate: "full", sortRows: false },
                );
                s.validate({ level: "full" });
            }
            ctx.release(snapshot);
        });
    }

    it("a directed weighted multigraph with self-loops and parallels both ways: bitwise the reference", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(messyEdges(), { directed: true, nodeCount: 60 });
        const want = simpleSymmetricOracle(s);
        const got = await runSimpleSymmetric(ctx, s, true);
        expectBitwiseEqual(got.rowPtr, want.rowPtr, "messy rowPtr");
        expectBitwiseEqual(got.colIdx, want.colIdx, "messy colIdx");
        expectBitwiseEqual(got.weights ?? new Float32Array(0), want.weights ?? new Float32Array(0), "messy weights");
        const unweighted = await runSimpleSymmetric(ctx, s, false);
        expect(unweighted.weights).toBeNull();
        expectBitwiseEqual(unweighted.colIdx, want.colIdx, "messy colIdx unweighted");
        ctx.release(s);
    });

    it("parallel weights are summed in edge order: an order-sensitive f32 sum comes out exactly", async (t) => {
        const ctx = await context(t);
        // in edge order 2^24 + 1 rounds back to 2^24, then + 2 gives 2^24 + 2; any other order of the three
        // (1 + 2 first, or 2^24 + 2 then + 1) rounds to 2^24 + 4
        const s = snapshotOf(
            [
                [0, 1, 2 ** 24],
                [1, 0, 1],
                [0, 1, 2],
                [1, 2, 1],
            ],
            { directed: true, nodeCount: 3 },
        );
        const want = simpleSymmetricOracle(s);
        expect(Array.from(want.weights ?? [])).toEqual([2 ** 24 + 2, 2 ** 24 + 2, 1, 1]);
        const got = await runSimpleSymmetric(ctx, s, true);
        expectBitwiseEqual(got.weights ?? new Float32Array(0), want.weights ?? new Float32Array(0), "weights");
        ctx.release(s);
    });

    it("directed and undirected forms of one edge set build the same graph; the last vertices may have no arcs", async (t) => {
        const ctx = await context(t);
        const edges = rmatEdges(Math.max(8, Math.round(12 + Math.log2(gpuScale()))), 6, 2);
        const n = 1 + Math.max(...edges.map((e) => Math.max(e[0], e[1]))) + 17;
        const directed = snapshotOf(edges, { directed: true, nodeCount: n });
        const undirected = snapshotOf(edges, { nodeCount: n });
        const d = await runSimpleSymmetric(ctx, directed, false);
        const u = await runSimpleSymmetric(ctx, undirected, false);
        expectBitwiseEqual(d.rowPtr, u.rowPtr, "rowPtr");
        expectBitwiseEqual(d.colIdx, u.colIdx, "colIdx");
        expect(d.rowPtr[n]).toBe(d.rowPtr[n - 17]);
        ctx.release(directed);
        ctx.release(undirected);
    });

    afterAll(() => {
        shared?.dispose();
    });
});
