/**
 * Label propagation (design 8.6, 9.7; the P11 plan's P11-T6) against the synchronous reference with the same rules
 * (lowest-label tie-break, alternating direction, fixed-point stop): labels IDENTICAL -- not merely the same
 * partition -- on every named fixture, weighted and not, directed and not, because the result is bitwise reproducible.
 * Plus the gate's item (the planted partitions recovered with an adjusted Rand index of at least 0.9 on ten seeds),
 * disjoint cliques, a complete graph, the two-node path the direction rule exists for, pass caps that end inside and
 * across a submit, run twice, and the run options. And a differential against the CPU package's own synchronous port
 * (`labelPropagationSynchronous`), which moves up first and keeps a label that ties for the lead, so it is held to the
 * same partition (adjusted Rand index) and the same modularity rather than to identical labels.
 */

import { labelPropagationSynchronous } from "@graphty/algorithms";
import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { labelPropagation } from "../../src/algorithms/label-propagation.js";
import { PARALLEL_MERGE_LIMIT } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { planGroupRows } from "../../src/primitives/group-by-key.js";
import { radixHistBytes } from "../../src/primitives/radix-sort.js";
import {
    completeEdges,
    type EdgeSpec,
    fixture,
    KARATE_EDGES,
    pathEdges,
    snapshotOf,
    starEdges,
} from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adjustedRandIndex, plantedPartition } from "../helpers/partitions.js";
import { messyEdges, withBindingLimit } from "../helpers/structure.js";
import { labelPropagationOracle, modularityOf } from "../oracle/community.js";
import { simpleSymmetricOracle } from "../oracle/coo.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

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

describe("labelPropagation (GPU, design 8.6)", () => {
    let shared: GpuContext | null = null;
    const tracked: GraphSnapshot[] = [];

    /** Releases the snapshots tracked before, then tracks this one (three resident at once trip the residency warning). */
    function track(s: GraphSnapshot): GraphSnapshot {
        for (const old of tracked.splice(0)) {
            shared?.release(old);
        }
        tracked.push(s);
        return s;
    }

    afterEach(() => {
        for (const s of tracked.splice(0)) {
            shared?.release(s);
        }
    });

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "label-propagation" }));
        shared = ctx;
        return ctx;
    }

    for (const name of FIXTURES) {
        it(`${name}: labels identical to the reference, weighted and not, twice`, async (t) => {
            const ctx = await context(t);
            const { snapshot } = fixture(name, gpuScale());
            const csr = simpleSymmetricOracle(snapshot);
            for (const weighted of [true, false]) {
                const want = labelPropagationOracle(csr, { maxIterations: 100, weighted });
                const a = await labelPropagation(ctx, snapshot, { weighted });
                const b = await labelPropagation(ctx, snapshot, { weighted });
                expectBitwiseEqual(a.labels, b.labels, `${name} run-twice`);
                expectBitwiseEqual(a.labels, want.labels, `${name} weighted ${weighted}`);
                expect(a.count).toBe(want.count);
            }
            ctx.release(snapshot);
        });
    }

    it("a directed weighted multigraph: the reference's labels", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(messyEdges(), { directed: true, nodeCount: 60 });
        const want = labelPropagationOracle(simpleSymmetricOracle(s), { maxIterations: 100, weighted: true });
        expectBitwiseEqual((await labelPropagation(ctx, s)).labels, want.labels, "messy");
        ctx.release(s);
    });

    it("recovers the planted partitions: adjusted Rand index >= 0.9 on ten seeds", async (t) => {
        const ctx = await context(t);
        for (let seed = 1; seed <= 10; seed++) {
            const { edges, labels } = plantedPartition(4, 50, 0.3, 0.005, seed);
            const s = snapshotOf(edges, { nodeCount: 200 });
            const r = await labelPropagation(ctx, s);
            expect(adjustedRandIndex(r.labels, labels), `seed ${seed}`).toBeGreaterThanOrEqual(0.9);
            ctx.release(s);
        }
    });

    it("agrees with the CPU package's labelPropagationSynchronous: same planted partition, same karate modularity", async (t) => {
        const ctx = await context(t);
        for (let seed = 1; seed <= 10; seed++) {
            const { edges } = plantedPartition(4, 50, 0.3, 0.005, seed);
            const s = snapshotOf(edges, { nodeCount: 200 });
            const gpu = await labelPropagation(ctx, s);
            const cpu = labelPropagationSynchronous(s);
            expect(adjustedRandIndex(gpu.labels, cpu.labels), `seed ${seed}`).toBeGreaterThanOrEqual(0.9);
            ctx.release(s);
        }
        const karate = track(snapshotOf(KARATE_EDGES));
        const csr = simpleSymmetricOracle(karate);
        const gpu = modularityOf(csr, (await labelPropagation(ctx, karate)).labels);
        const cpu = modularityOf(csr, labelPropagationSynchronous(karate).labels);
        expect(Math.abs(gpu - cpu), `gpu ${gpu} cpu ${cpu}`).toBeLessThanOrEqual(0.05);
    });

    it("disjoint cliques are one community each, a complete graph is one, the two-node path converges; karate's modularity is above 0.35", async (t) => {
        const ctx = await context(t);
        const edges: EdgeSpec[] = [];
        let base = 0;
        for (const size of [4, 7, 5]) {
            for (const [u, v] of completeEdges(size)) {
                edges.push([u + base, v + base]);
            }
            base += size;
        }
        const union = await labelPropagation(ctx, track(snapshotOf(edges)));
        expect(Array.from(union.labels)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
        expect((await labelPropagation(ctx, track(snapshotOf(completeEdges(9))))).count).toBe(1);
        expect((await labelPropagation(ctx, track(snapshotOf([[0, 1]])))).count).toBe(1);
        const karate = track(snapshotOf(KARATE_EDGES));
        const r = await labelPropagation(ctx, karate);
        expect(modularityOf(simpleSymmetricOracle(karate), r.labels)).toBeGreaterThan(0.35);
        expect(r.groups().length).toBe(r.count);
    });

    it("maxIterations: 0 is the identity; caps inside and across a submit match the reference's passes", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(pathEdges(300));
        const csr = simpleSymmetricOracle(s);
        expect(labelPropagationOracle(csr, { maxIterations: 100, weighted: true }).passes).toBeGreaterThan(10);
        const zero = await labelPropagation(ctx, s, { maxIterations: 0 });
        expect(zero.count).toBe(300);
        for (const cap of [1, 3, 8, 9, 17]) {
            const want = labelPropagationOracle(csr, { maxIterations: cap, weighted: true });
            expectBitwiseEqual(
                (await labelPropagation(ctx, s, { maxIterations: cap })).labels,
                want.labels,
                `cap ${cap}`,
            );
        }
        ctx.release(s);
    });

    it("dest receives the labels; a bad maxIterations, a wrong dest and an aborted signal are refused", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES);
        const dest = new Uint32Array(34);
        const r = await labelPropagation(ctx, s, { dest });
        expect(r.labels).toBe(dest);
        // a released snapshot is uploaded again by the next call
        ctx.release(s);
        expectBitwiseEqual((await labelPropagation(ctx, s)).labels, dest, "after release");
        for (const bad of [-1, 1.5, Number.NaN]) {
            await expect(labelPropagation(ctx, s, { maxIterations: bad })).rejects.toMatchObject({
                code: "E_INVALID_ARGUMENT",
            });
        }
        await expect(labelPropagation(ctx, s, { dest: new Uint32Array(2) })).rejects.toMatchObject({
            code: "E_INVALID_ARGUMENT",
        });
        const controller = new AbortController();
        controller.abort();
        await expect(labelPropagation(ctx, s, { signal: controller.signal })).rejects.toMatchObject({
            code: "E_ABORTED",
        });
        ctx.release(s);
    });

    it("a graph whose arcs or hash region outgrow one storage binding is refused with E_TOO_LARGE before any upload", async (t) => {
        const ctx = await context(t);
        const s = track(snapshotOf(starEdges(200)));
        const before = ctx.residency.stats().snapshots;
        await expect(labelPropagation(withBindingLimit(ctx, 256), s)).rejects.toMatchObject({
            code: "E_TOO_LARGE",
            details: { limit: 256, algorithm: "labelPropagation" },
        });
        // the hub's row goes to the workgroup tier, whose hash region (16 bytes per arc) outgrows the build's arrays
        const arcs = 2 * s.edgeCount;
        const build = Math.max(4 * (arcs + 1), radixHistBytes(arcs, ctx.workgroupSize));
        const region = 4 * planGroupRows(s.outDegree()).regionWords;
        expect(region).toBeGreaterThan(build);
        await expect(labelPropagation(withBindingLimit(ctx, region - 4), s)).rejects.toMatchObject({
            code: "E_TOO_LARGE",
            details: { needed: region, path: "the group-by hash region", algorithm: "labelPropagation" },
        });
        expect(ctx.residency.stats().snapshots).toBe(before);
    });

    it("a weighted run refuses a pair joined by more parallel edges than one merge sums; an unweighted run takes it", async (t) => {
        const ctx = await context(t);
        const edges: EdgeSpec[] = [];
        for (let k = 0; k <= PARALLEL_MERGE_LIMIT; k++) {
            edges.push([0, 1, 1]);
        }
        edges.push([1, 2, 1]);
        const s = track(snapshotOf(edges, { directed: true, nodeCount: 3 }));
        await expect(labelPropagation(ctx, s)).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
            details: { feature: "labelPropagation.parallelEdges" },
        });
        const want = labelPropagationOracle(simpleSymmetricOracle(s), { maxIterations: 100, weighted: false });
        expectBitwiseEqual((await labelPropagation(ctx, s, { weighted: false })).labels, want.labels, "unweighted");
        // at the limit the merge is exact
        const atLimit = track(snapshotOf(edges.slice(1), { directed: true, nodeCount: 3 }));
        const exact = labelPropagationOracle(simpleSymmetricOracle(atLimit), { maxIterations: 100, weighted: true });
        expectBitwiseEqual((await labelPropagation(ctx, atLimit)).labels, exact.labels, "at the limit");
    });

    afterAll(() => {
        shared?.dispose();
    });
});
