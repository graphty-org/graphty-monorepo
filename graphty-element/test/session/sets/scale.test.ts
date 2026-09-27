/**
 * @file The sets code at 100,000 nodes (design/sets/sets-design.md sections 6.2 and 6.5): the work
 * a freeze causes while sets are live, and the memory budget, asserted on work counts and on the
 * caches' own byte accounting, never on wall-clock time or process heap.
 *
 * The graph is a seeded Barabasi-Albert graph (m = 5): 100,000 nodes, about 500,000 edges, every
 * node carrying a `w` attribute from 0 to 99.
 */

import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { afterAll, assert, beforeAll, describe, it, type MockInstance, vi } from "vitest";

import { DerivedInputs } from "../../../src/algorithms/input/derivedInputs";
import { createScopedInput } from "../../../src/algorithms/input/ScopedInput";
import type { EdgeMember, LayerSpec, NodeId, SetId } from "../../../src/catalog/types";
import { identityColumnsOf, stableEdgeMember } from "../../../src/data/edgeIdentity";
import { scopeResolverOfSession, setsNotifierOfSession } from "../../../src/session/GraphSession";
import { cacheCounters, type SetsCache } from "../../../src/session/sets/cache";
import { captureItem } from "../../../src/session/sets/captures";
import { recordBytes } from "../../../src/session/sets/prepare";
import type { ElementSession } from "../../../src/session/types";
import { InputGraph } from "../../algorithms/input/harness";
import { type Harness, makeSession } from "../helpers";
import { reachableBytes } from "./bytes";

const NODES = 100_000;
const MB = 1024 * 1024;
const GRAPH = barabasiAlbertGraph({ n: NODES, m: 5, seed: 1 });

/**
 * A layer painting a set.
 * @param id - The set.
 * @returns The layer.
 */
function layerOver(id: SetId): LayerSpec {
    return { name: `over ${id}`, selector: { match: "member", of: { set: id } }, set: { "node.color": "#ff0000" } };
}

/** Let every pending timer and microtask run. */
async function drain(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

let h: Harness;
let frames: (() => void)[];
let edgeIndexOf: MockInstance;
const live: SetId[] = [];

/**
 * The session's resolution cache.
 * @returns The cache.
 */
function cacheOf(): SetsCache {
    const { cache } = scopeResolverOfSession(h.session).contextNow();
    assert.isDefined(cache);

    return cache;
}

/**
 * Run queued frames until no watch waits for one.
 */
async function runFrames(): Promise<void> {
    const notifier = setsNotifierOfSession(h.session);
    while (notifier.pending > 0) {
        const frame = frames.shift();
        assert.isDefined(frame, "a watch is queued, so a frame was requested");
        (frame as () => void)();
        await drain();
    }
}

beforeAll(async () => {
    h = makeSession({ directed: false });
    h.add(
        Array.from({ length: NODES }, (_, i) => ({ id: i, w: i % 100 })),
        Array.from(GRAPH.src, (src, e) => ({ src, dst: GRAPH.dst[e] })),
    );
    const snapshot = h.session.data.snapshot();
    // Every snapshot shares one prototype: a call on any of them is counted.
    edgeIndexOf = vi.spyOn(Object.getPrototypeOf(snapshot) as { edgeIndexOf(id: unknown): number }, "edgeIndexOf");
    frames = [];
    setsNotifierOfSession(h.session).useFrames((callback) => {
        frames.push(callback);
        return () => {
            frames.splice(frames.indexOf(callback), 1);
        };
    });

    // Five layers over expression rules, five over fixed sets; one of the fixed sets lists edges.
    for (let k = 0; k < 5; k++) {
        live.push(h.session.sets.create({ kind: "rule", where: `data.w < \`${String(10 * (k + 1))}\``, reading: "induced" }));
    }

    for (let k = 0; k < 4; k++) {
        live.push(h.session.sets.create({ kind: "fixed", nodes: Array.from({ length: 10_000 }, (_, i) => i * (k + 2)), reading: "induced" }));
    }

    const listed: EdgeMember[] = Array.from({ length: 10_000 }, (_, i) => stableEdgeMember(snapshot, 7 * i));
    live.push(h.session.sets.create({ kind: "fixed", nodes: [], edges: listed, reading: "listed" }));
    for (const id of live) {
        await h.session.styles.add(layerOver(id));
    }

    await (h.session as ElementSession).paint.repaintAll((h.session as ElementSession).styles.compiled(), {
        signal: new AbortController().signal,
        report: () => undefined,
    });
    await runFrames();
}, 120_000);

afterAll(() => {
    edgeIndexOf.mockRestore();
});

describe("a freeze with live sets, at 100k nodes", () => {
    it("re-resolves each live scope exactly once, and a 200-row count panel after it resolves nothing", async () => {
        const before = cacheCounters.misses;

        // Add one node: the snapshot is replaced, so every live scope's signature moved.
        h.add([{ id: NODES, w: 0 }]);
        h.session.data.snapshot();
        assert.strictEqual(setsNotifierOfSession(h.session).pending, live.length, "every live scope queued, none resolved on the input path");
        await runFrames();
        assert.strictEqual(cacheCounters.misses - before, live.length, "one resolution per live scope");

        // A panel counting the live sets, twenty rows each.
        const panel = cacheCounters.misses;
        for (let row = 0; row < 200; row++) {
            const count = await h.session.scope.count({ set: live[row % live.length] });
            assert.isAtLeast(count.nodes, 1);
        }

        assert.strictEqual(cacheCounters.misses - panel, 0, "every row served from what the frames resolved");
    }, 120_000);
});

describe("the memory budget, at 100k nodes", () => {
    it("the bitmap cache stays within 64 MB plus its pins, and reports exactly the bytes it holds", async () => {
        const cache = cacheOf();
        const {evictions} = cacheCounters;
        // About 75 KB a resolution at this size: a thousand of them is past the bound.
        for (let i = 0; i < 1_000; i++) {
            await h.session.scope.count({ define: { kind: "fixed", nodes: [i], reading: "listed" } });
        }

        assert.isAbove(cacheCounters.evictions - evictions, 0, "the flood evicted");
        assert.isAtMost(cache.bytes - cache.pinnedBytes, 64 * MB);
        assert.isAtLeast(cache.pinnedBytes, live.length * Math.ceil((NODES + 1) / 32) * 4, "every live layer's entry is pinned");
        const seen = new Set<unknown>();
        const walked = cache.cached().reduce((sum, [, resolution]) => sum + reachableBytes({ ...resolution, store: null }, seen), 0);
        assert.strictEqual(cache.bytes, walked);

        // The pinned entries survived the flood: counting the live sets resolves nothing.
        const {misses} = cacheCounters;
        for (const id of live) {
            await h.session.scope.count({ set: id });
        }

        assert.strictEqual(cacheCounters.misses - misses, 0);
    }, 120_000);

    it("the summary cache holds one fixed-size entry per set, whatever the set's size", async () => {
        const cache = cacheOf();
        const small = h.session.sets.create({ kind: "fixed", nodes: [1], reading: "induced" });
        const large = h.session.sets.create({ kind: "fixed", nodes: Array.from({ length: 50_000 }, (_, i) => 2 * i), reading: "induced" });
        await h.session.scope.count({ set: small });
        await h.session.scope.count({ set: large });

        const kept = h.session.sets.list().length;
        assert.isAtMost(cache.summaries.size, kept);
        const one = cache.summaries.get(small);
        const other = cache.summaries.get(large);
        assert.isDefined(one);
        assert.isDefined(other);
        // The definition is the kept record's own, referenced, never copied into the entry.
        assert.strictEqual(one?.definition, h.session.sets.get(small)?.definition);
        const { definition: _a, ...entryOne } = one;
        const { definition: _b, ...entryOther } = other;
        assert.strictEqual(reachableBytes([...Object.values(entryOne), ...Object.values(entryOther)]), 0, "no typed array in an entry");
        assert.deepStrictEqual(Object.keys(entryOne), Object.keys(entryOther), "the same fields");
        assert.strictEqual(entryOne.signature.length, entryOther.signature.length, "a signature the same length at 1 and 50,000 members");
        h.session.sets.remove(small);
        h.session.sets.remove(large);
    });

    it("the identity columns cost 8 bytes a node and 16 an edge", () => {
        const snapshot = h.session.data.snapshot();
        const { nodeHash, edgeHash, edgeOrdinal, edgeAmong } = identityColumnsOf(snapshot);

        assert.strictEqual(nodeHash.byteLength, 8 * snapshot.nodeCount);
        assert.strictEqual(edgeHash.byteLength + edgeOrdinal.byteLength + edgeAmong.byteLength, 16 * snapshot.edgeCount);
    });

    it("a definition holds 8 bytes a node member and 20 an edge member plus its interned ids, and a resolution materialises none", async () => {
        const snapshot = h.session.data.snapshot();
        const rows = Array.from({ length: 100_000 }, (_, i) => Math.floor((i * snapshot.edgeCount) / 100_000));
        const ends = new Set<NodeId>();
        const pair = (row: number): { source: NodeId; target: NodeId } => {
            const { source, target } = stableEdgeMember(snapshot, row);
            ends.add(source);
            ends.add(target);

            return { source, target };
        };
        const forms: [string, EdgeMember[]][] = [
            ["ordinal", rows.map((row) => ({ ...pair(row), ordinal: 0, among: 1 }))],
            ["numeric id", rows.map((row) => ({ ...pair(row), id: row }))],
            ["string id", rows.map((row) => ({ ...pair(row), id: `file-${String(row)}` }))],
        ];

        for (const [form, edges] of forms) {
            // One table interns endpoints and ids alike, so a numeric id equal to a node id shares its slot.
            const interned = new Set<NodeId>([...ends, ...edges.flatMap((edge) => (edge.id === undefined ? [] : [edge.id]))]).size;
            const id = h.session.sets.create({ kind: "fixed", nodes: [], edges, reading: "listed" }, { name: "S" });
            const record = h.session.sets.get(id);
            assert.isDefined(record);
            const bytes = recordBytes(record);
            // 64 bytes of record, the name, 20 bytes of columns a member and 16 a distinct interned id.
            assert.strictEqual(bytes, 64 + 2 + 20 * edges.length + 16 * interned, form);

            await h.session.scope.count({ set: id });
            assert.strictEqual(recordBytes(h.session.sets.get(id) as NonNullable<typeof record>), bytes, `${form}: the resolution read the columns`);
            h.session.sets.remove(id);
        }

        const nodes = h.session.sets.create({ kind: "fixed", nodes: rows.map((_, i) => i), reading: "induced" }, { name: "S" });
        assert.strictEqual(recordBytes(h.session.sets.get(nodes) as NonNullable<ReturnType<typeof h.session.sets.get>>), 64 + 2 + 8 * rows.length);
        h.session.sets.remove(nodes);
    }, 120_000);

    it("a capture holds a node member as one id slot and an edge member in the columns' form", () => {
        const snapshot = h.session.data.snapshot();
        const result = {
            execution: "x",
            fields: [
                { name: "g", kind: "node" as const },
                { name: "g", kind: "edge" as const },
            ],
            nodeValue: (index: number) => index % 2,
            edgeValue: (row: number) => row % 2,
        };
        const capture = captureItem(result, { field: "g", value: 0 }, snapshot, (row) => stableEdgeMember(snapshot, row));

        assert.isTrue(Array.isArray(capture.nodes));
        assert.strictEqual(capture.nodes?.length, Math.ceil(snapshot.nodeCount / 2));
        const edges = capture.edges as unknown as { length: number; bytes: number };
        assert.isFalse(Array.isArray(edges), "no object per edge member");
        assert.strictEqual(edges.length, Math.ceil(snapshot.edgeCount / 2));
        assert.strictEqual(reachableBytes(edges), 20 * edges.length, "five 4-byte columns");
    });

    it("the derived-input cache stays within max(256 MB, 1.5 x the snapshot's bytes)", () => {
        const ids = Array.from({ length: NODES }, (_, i) => `n${String(i)}`);
        const graph = new InputGraph(
            ids,
            Array.from(GRAPH.src, (src, e) => [ids[src], ids[GRAPH.dst[e]]] as const),
            false,
        );
        const inputs = new DerivedInputs({ release: () => undefined });
        const full = graph.snapshot().byteLength({ columns: true, ids: true });
        assert.strictEqual(inputs.bound, Math.max(256 * MB, Math.ceil(1.5 * full)));

        // Distinct half-graph scopes, both orientations, each let go after its run: well past
        // the bound in total.
        let admitted = 0;
        for (let k = 0; k < 24; k++) {
            const scope = graph.scope(ids.filter((_, i) => (i + k) % 3 !== 0 || i % 24 === k));
            for (const orientation of ["declared", "undirected"] as const) {
                const holder = {};
                admitted += createScopedInput(graph.getDataManager(), orientation, undefined, { inputs, holder, scope: () => scope }).derived().snapshot.byteLength({
                    columns: true,
                });
                inputs.releaseHolder(holder);
                assert.isAtMost(inputs.bytes, inputs.bound);
            }
        }

        assert.isAbove(admitted, inputs.bound, "the reads exceeded the bound, so the bound was exercised");
    }, 300_000);

    it("the sets code never built an EdgeIdIndex", () => {
        assert.strictEqual(edgeIndexOf.mock.calls.length, 0);
    });
});
