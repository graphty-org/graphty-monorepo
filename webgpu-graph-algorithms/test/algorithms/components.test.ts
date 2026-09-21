/**
 * Afforest weakly connected components against the union-find oracle (spec 8.3, 9.7, 11.3; M8b-T7): labels
 * IDENTICAL to the oracle's on every named fixture (both renumber first-seen), directed input treated weakly, the
 * singleton / giant-plus-dust / no-arc / empty / self-loop / parallel legs, `renumber: false` raw roots, `groups()`,
 * bitwise repeatability, and the run options as `degree` honours them.
 */

import { type TestContext } from "vitest";

import { connectedComponents } from "../../src/algorithms/components.js";
import { type GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { GraphResidency } from "../../src/memory/residency.js";
import { type GpuLabelResult } from "../../src/types/algorithms.js";
import { fakeCaps } from "../helpers/caps-tables.js";
import { withResidency } from "../helpers/degree-check.js";
import { type EdgeSpec, fixture, FIXTURE_NAMES, KARATE_EDGES, randomEdges, snapshotOf } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { componentsOracle, partitionEquals } from "../oracle/components.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

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

/** groups() is `count` index-aligned arrays whose concatenation is a permutation of [0, n). */
function expectGroupsPartition(result: GpuLabelResult, n: number): void {
    const groups = result.groups();
    expect(groups.length).toBe(result.count);
    const seen = new Uint8Array(n);
    let total = 0;
    for (let k = 0; k < groups.length; k++) {
        const group = groups[k];
        expect(group).toBeInstanceOf(Uint32Array);
        expect(group.length).toBeGreaterThan(0);
        for (const v of group) {
            expect(result.labels[v], `node ${v} in group ${k}`).toBe(k);
            expect(seen[v], `node ${v} listed twice`).toBe(0);
            seen[v] = 1;
            total++;
        }
    }
    expect(total).toBe(n);
    expect(result.groups()).toBe(groups);
}

describe("componentsOracle / partitionEquals (pure)", () => {
    it("path + isolated node: two blocks first-seen; a directed edge is treated weakly; partitionEquals ignores names", () => {
        const s = snapshotOf(
            [
                [0, 1],
                [2, 1],
            ],
            { nodeCount: 4, directed: true },
        );
        const r = componentsOracle(s);
        expect(Array.from(r.labels)).toEqual([0, 0, 0, 1]);
        expect(r.count).toBe(2);
        expect(partitionEquals([0, 0, 0, 1], [7, 7, 7, 2])).toBe(true);
        expect(partitionEquals([0, 0, 0, 1], [7, 7, 2, 2])).toBe(false);
        expect(partitionEquals([0, 0, 1, 1], [5, 5, 5, 5])).toBe(false);
        expect(partitionEquals([0, 0], [0, 0, 0])).toBe(false);
        const empty = componentsOracle(snapshotOf([], { nodeCount: 0 }));
        expect(empty.labels.length).toBe(0);
        expect(empty.count).toBe(0);
    });
});

describe("connectedComponents (GPU, spec 8.3 / 9.7)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "components" }));
        shared = ctx;
        return ctx;
    }

    for (const name of FIXTURE_NAMES) {
        it(`labels are identical to the oracle's on ${name}`, async (t) => {
            const ctx = await context(t);
            const { snapshot } = fixture(name, gpuScale());
            const result = await connectedComponents(ctx, snapshot);
            const expected = componentsOracle(snapshot);
            expect(result.labels).toBeInstanceOf(Uint32Array);
            expectBitwiseEqual(result.labels, expected.labels, name);
            expect(result.count).toBe(expected.count);
            ctx.release(snapshot);
        });
    }

    it("directed input is treated weakly: the directed and undirected forms of one edge set give identical labels", async (t) => {
        const ctx = await context(t);
        const n = Math.max(64, Math.round(2000 * gpuScale()));
        const sets: [string, readonly EdgeSpec[], number][] = [
            ["karate", KARATE_EDGES, 34],
            ["random", randomEdges(n, 2 * n, 77), n],
        ];
        for (const [label, edges, nodeCount] of sets) {
            const directed = snapshotOf(edges, { directed: true, nodeCount, label: `${label}-directed` });
            const undirected = snapshotOf(edges, { nodeCount, label: `${label}-undirected` });
            const d = await connectedComponents(ctx, directed);
            const u = await connectedComponents(ctx, undirected);
            expectBitwiseEqual(d.labels, u.labels, label);
            expectBitwiseEqual(d.labels, componentsOracle(directed).labels, `${label} oracle`);
            expect(d.count).toBe(u.count);
            ctx.release(directed);
            ctx.release(undirected);
        }
    });

    it("singletons: every isolated node of the isolated fixture is its own block", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("isolated", gpuScale());
        const result = await connectedComponents(ctx, snapshot);
        const outDegree = snapshot.outDegree();
        const inDegree = snapshot.inDegree();
        let singletons = 0;
        for (let v = 0; v < snapshot.nodeCount; v++) {
            if (outDegree[v] === 0 && inDegree[v] === 0) {
                singletons++;
                expect(result.groups()[result.labels[v]]).toEqual(Uint32Array.of(v));
            }
        }
        expect(singletons).toBeGreaterThan(0);
        expectBitwiseEqual(result.labels, componentsOracle(snapshot).labels, "isolated");
        ctx.release(snapshot);
    });

    it("a giant component plus dust: a 10k random graph unioned with 500 two-node components", async (t) => {
        const ctx = await context(t);
        const scale = gpuScale();
        const n = Math.max(200, Math.round(10_000 * scale));
        const pairs = Math.max(10, Math.round(500 * scale));
        const edges: EdgeSpec[] = randomEdges(n, 5 * n, 4242);
        for (let k = 0; k < pairs; k++) {
            edges.push([n + 2 * k, n + 2 * k + 1]);
        }
        const snapshot = snapshotOf(edges, { nodeCount: n + 2 * pairs, label: "giant-dust" });
        const result = await connectedComponents(ctx, snapshot);
        const expected = componentsOracle(snapshot);
        expectBitwiseEqual(result.labels, expected.labels, "giant-dust");
        expect(result.count).toBe(expected.count);
        expect(result.count).toBeGreaterThanOrEqual(pairs + 1);
        const groups = result.groups();
        expect(groups[0].length).toBeGreaterThan(n / 2);
        for (let k = 0; k < pairs; k++) {
            expect(result.labels[n + 2 * k]).toBe(result.labels[n + 2 * k + 1]);
            expect(groups[result.labels[n + 2 * k]].length).toBe(2);
        }
        ctx.release(snapshot);
    });

    it("arcCount 0: every node its own block and count n, with only rowPtr resident", async (t) => {
        const ctx = await context(t);
        const lonely = snapshotOf([], { nodeCount: 7, label: "lonely" });
        const result = await connectedComponents(ctx, lonely);
        expect(Array.from(result.labels)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(result.count).toBe(7);
        expectGroupsPartition(result, 7);
        const raw = await connectedComponents(ctx, lonely, { renumber: false });
        expect(Array.from(raw.labels)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(raw.count).toBe(7);
        expect(ctx.residency.stats().buffers).toBe(1);
        ctx.release(lonely);
    });

    it("n = 0: empty labels, count 0, no groups, no GPU work", async (t) => {
        const ctx = await context(t);
        const before = ctx.residency.stats();
        const result = await connectedComponents(ctx, snapshotOf([], { nodeCount: 0 }));
        expect(result.labels.length).toBe(0);
        expect(result.count).toBe(0);
        expect(result.groups()).toEqual([]);
        expect(ctx.residency.stats()).toEqual(before);
    });

    it("self-loop and parallel fixtures match the oracle and their hand-computed labels", async (t) => {
        const ctx = await context(t);
        const { snapshot: loop } = fixture("self-loop", gpuScale());
        const l = await connectedComponents(ctx, loop);
        expect(Array.from(l.labels)).toEqual([0, 0, 0]);
        expect(l.count).toBe(1);
        expectBitwiseEqual(l.labels, componentsOracle(loop).labels, "self-loop");
        ctx.release(loop);
        const { snapshot: parallel } = fixture("parallel", gpuScale());
        const p = await connectedComponents(ctx, parallel);
        expect(Array.from(p.labels)).toEqual([0, 0, 0, 0]);
        expect(p.count).toBe(1);
        expectBitwiseEqual(p.labels, componentsOracle(parallel).labels, "parallel");
        ctx.release(parallel);
    });

    it("renumber: false returns the raw roots, partition-equal to the oracle, with the same count and groups", async (t) => {
        const ctx = await context(t);
        for (const name of ["karate", "isolated", "random1k"]) {
            const { snapshot } = fixture(name, gpuScale());
            const raw = await connectedComponents(ctx, snapshot, { renumber: false });
            const expected = componentsOracle(snapshot);
            expect(partitionEquals(raw.labels, expected.labels), name).toBe(true);
            expect(raw.count).toBe(expected.count);
            // Afforest links the higher root under the lower, so a raw root is a node of its own block
            for (let v = 0; v < snapshot.nodeCount; v++) {
                expect(raw.labels[raw.labels[v]], `${name}: labels[${v}] is a root`).toBe(raw.labels[v]);
            }
            const groups = raw.groups();
            expect(groups.length).toBe(raw.count);
            let total = 0;
            for (const group of groups) {
                const label = raw.labels[group[0]];
                for (const v of group) {
                    expect(raw.labels[v]).toBe(label);
                }
                total += group.length;
            }
            expect(total).toBe(snapshot.nodeCount);
            ctx.release(snapshot);
        }
    });

    it("groups() returns count index-aligned Uint32Arrays whose concatenation is a permutation of [0, n), memoised", async (t) => {
        const ctx = await context(t);
        for (const name of ["karate", "isolated", "hub10k", "one"]) {
            const { snapshot } = fixture(name, gpuScale());
            const result = await connectedComponents(ctx, snapshot);
            expectGroupsPartition(result, snapshot.nodeCount);
            ctx.release(snapshot);
        }
    });

    it("two runs give identical labels", async (t) => {
        const ctx = await context(t);
        for (const name of ["random1k", "isolated"]) {
            const { snapshot } = fixture(name, gpuScale());
            const first = await connectedComponents(ctx, snapshot);
            const second = await connectedComponents(ctx, snapshot);
            expectBitwiseEqual(first.labels, second.labels, name);
            expect(second.count).toBe(first.count);
            const rawA = await connectedComponents(ctx, snapshot, { renumber: false });
            const rawB = await connectedComponents(ctx, snapshot, { renumber: false });
            expectBitwiseEqual(rawA.labels, rawB.labels, `${name} raw`);
            ctx.release(snapshot);
        }
    });

    it("dest, signal and onProgress behave as degree does", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("karate", gpuScale());
        const n = snapshot.nodeCount;
        const wrong = await expectRejection(
            connectedComponents(ctx, snapshot, { dest: new Uint32Array(n - 1) }),
            "E_INVALID_ARGUMENT",
        );
        expect(wrong.details.argument).toBe("dest");
        await expectRejection(connectedComponents(ctx, snapshot, { dest: new Float32Array(n) }), "E_INVALID_ARGUMENT");
        const shared = new Uint32Array(new SharedArrayBuffer(4 * n));
        await expectRejection(connectedComponents(ctx, snapshot, { dest: shared }), "E_INVALID_ARGUMENT");
        const controller = new AbortController();
        controller.abort();
        await expectRejection(connectedComponents(ctx, snapshot, { signal: controller.signal }), "E_ABORTED");
        expect(ctx.residency.stats().snapshots).toBe(0);
        const calls: [number, number][] = [];
        const dest = new Uint32Array(n);
        const result = await connectedComponents(ctx, snapshot, {
            dest,
            onProgress: (done, total) => {
                calls.push([done, total]);
            },
        });
        expect(result.labels).toBe(dest);
        expect(calls).toEqual([[1, 1]]);
        expectBitwiseEqual(dest, componentsOracle(snapshot).labels, "dest");
        const rawDest = new Uint32Array(n);
        const raw = await connectedComponents(ctx, snapshot, { dest: rawDest, renumber: false });
        expect(raw.labels).toBe(rawDest);
        ctx.release(snapshot);
        const emptyDest = new Uint32Array(0);
        const emptyCalls: [number, number][] = [];
        const empty = await connectedComponents(ctx, snapshotOf([], { nodeCount: 0 }), {
            dest: emptyDest,
            onProgress: (done, total) => {
                emptyCalls.push([done, total]);
            },
        });
        expect(empty.labels).toBe(emptyDest);
        expect(emptyCalls).toEqual([[1, 1]]);
    });

    it("a windowed core is refused with E_TOO_LARGE { path: 'windowed', algorithm } before any work, directed and undirected (DEP-P4-B)", async (t) => {
        const ctx = await context(t);
        // karate: rowPtr (140 B) fits a 256-byte binding, colIdx (624 B) does not, so the core plan is windowed
        const caps = fakeCaps(ctx.caps, { maxStorageBufferBindingSize: 256 });
        const residency = new GraphResidency(ctx.device, caps, ctx.allocator, { warnUnreleasedSnapshots: 2 });
        const proxied = withResidency(ctx, residency);
        try {
            for (const directed of [true, false]) {
                const s = snapshotOf(KARATE_EDGES, { directed });
                const err = await expectRejection(connectedComponents(proxied, s), "E_TOO_LARGE");
                expect(err.details).toMatchObject({
                    path: "windowed",
                    algorithm: "connectedComponents",
                    needed: 4 * s.arcCount,
                });
            }
        } finally {
            residency.destroyAll();
        }
        expect(ctx.residency.stats().snapshots).toBe(0);
    });
});
