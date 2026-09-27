/**
 * @file Stable edge identity and the identity columns (design/sets/sets-design.md 4.2, 12.2, 12.3),
 * over a real `GraphStore`.
 *
 * Loads are driven by a small harness that ingests through the production `ingestEdge` and makes
 * every repeated-edge decision through the production `decideRepeat`, so which edges survive is
 * never re-implemented here. What the harness does itself is only the lookup of the edge a record
 * repeats, by ordered pair, as `DataManager` does.
 */

import { type DuplicatePolicy, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, expect, it } from "vitest";

import { hashEdgeMember, hashNodeId } from "../../src/catalog/sets/hash";
import {
    createEdgeCounter,
    decideRepeat,
    type EdgeCounter,
    IDENTITY_COLUMNS,
    identityColumnBytes,
    identityColumnsOf,
    identityCounters,
    mintedEdgeId,
    pairsOrdered,
    resumeEdgeCounter,
    stableEdgeMember,
} from "../../src/data/edgeIdentity";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestDeclaredDirection, ingestEdge, ingestNode } from "../../src/data/ingest";
import { createGraphSession } from "../../src/session";

/** One edge record: endpoints, weight, and a file id when the file carries one. */
interface Rec {
    readonly s: string;
    readonly t: string;
    readonly w?: number;
    readonly id?: string | number;
}

/**
 * A store with no consumer on its callbacks.
 * @param directed - `data.directed`
 * @param edgeCounter - a counter shared with other stores, as `DataManager` shares one
 * @returns the store
 */
function newStore(directed: boolean | "auto" = "auto", edgeCounter?: EdgeCounter): GraphStore {
    return new GraphStore({
        directed,
        positionScale: () => 1,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        onReplaced: () => undefined,
        edgeCounter,
    });
}

/**
 * Ingest records as one load, the way `DataManager` does: the edge a record repeats is the oldest
 * live edge of its ordered pair (or of its file id), and what happens to it is `decideRepeat`'s.
 * @param store - the store
 * @param records - the load's records
 * @param options - the policy, how many chunks (a freeze between each), and whether to bracket it
 * @param options.policy - the repeat policy
 * @param options.chunks - how many chunks the records arrive in
 * @param options.asLoad - false ingests the records as session edges
 */
function load(
    store: GraphStore,
    records: readonly Rec[],
    options: { policy?: DuplicatePolicy; chunks?: number; asLoad?: boolean } = {},
): void {
    const { policy = "keep", chunks = 1, asLoad = true } = options;
    const { builder } = store;
    if (asLoad) {
        store.openLoad();
    }

    const perChunk = Math.ceil(records.length / chunks);
    records.forEach((record, i) => {
        if (i > 0 && i % perChunk === 0) {
            store.getSnapshot();
        }

        ingestNode(store, record.s, {});
        ingestNode(store, record.t, {});
        const weight = record.w ?? 1;
        const known = builder.findEdges(builder.indexOf(record.s), builder.indexOf(record.t))[0];
        if (known !== undefined && record.id === undefined) {
            const decision = decideRepeat(policy, builder.edgeWeight(known), weight);
            if (decision.kind === "refuse") {
                throw new Error("E_DUPLICATE_EDGE");
            }

            if (decision.kind === "drop") {
                return;
            }

            if (decision.kind === "merge") {
                builder.setEdgeWeight(known, decision.weight);
                store.touch();
                return;
            }
        }

        ingestEdge(store, record.s, record.t, weight, record.id);
    });
    if (asLoad) {
        store.closeLoad();
    }
}

/** One edge's identity values, as the snapshot carries them. */
interface Row {
    readonly s: string | number;
    readonly t: string | number;
    readonly counter: number;
    readonly ordinal: number;
    readonly among: number;
    readonly weight: number;
}

/**
 * Every edge of a snapshot with its identity values, in counter order.
 * @param snapshot - the snapshot
 * @returns the rows
 */
function rows(snapshot: GraphSnapshot): Row[] {
    const { edgeOrdinal, edgeAmong } = identityColumnsOf(snapshot);
    const counter = snapshot.edges.requireTyped("graphty.edgeId", "u32").data;
    const out: Row[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        out.push({
            s: snapshot.ids.idOf(snapshot.edgeSource(e)),
            t: snapshot.ids.idOf(snapshot.edgeTarget(e)),
            counter: counter[e],
            ordinal: edgeOrdinal[e],
            among: edgeAmong[e],
            weight: snapshot.weights?.[snapshot.edgeToArc[e]] ?? 1,
        });
    }

    return out.sort((a, b) => a.counter - b.counter);
}

/**
 * The (ordinal, among) pairs of a snapshot's edges, in counter order.
 * @param snapshot - the snapshot
 * @returns "ordinal/among" strings
 */
function ordinals(snapshot: GraphSnapshot): string[] {
    return rows(snapshot).map((row) => `${row.ordinal}/${row.among}`);
}

/**
 * Assert every row's hashes are the hash functions of its stable identity.
 * @param snapshot - the snapshot
 * @param fileIds - file ids by counter, for edges that carry one
 */
function assertHashesMatchIdentity(snapshot: GraphSnapshot, fileIds: ReadonlyMap<number, string | number> = new Map()): void {
    const { nodeHash, edgeHash } = identityColumnsOf(snapshot);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const { a, b } = hashNodeId(snapshot.ids.idOf(i));
        assert.deepEqual([nodeHash[2 * i], nodeHash[2 * i + 1]], [a, b], `node ${String(snapshot.ids.idOf(i))}`);
    }

    const counter = snapshot.edges.requireTyped("graphty.edgeId", "u32").data;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const member = stableEdgeMember(snapshot, e, fileIds.get(counter[e]));
        const { a, b } = hashEdgeMember(member, pairsOrdered(snapshot));
        assert.deepEqual([edgeHash[2 * e], edgeHash[2 * e + 1]], [a, b], `edge ${JSON.stringify(member)}`);
    }
}

const ab3: Rec[] = [
    { s: "a", t: "b", w: 1 },
    { s: "a", t: "b", w: 2 },
    { s: "a", t: "b", w: 3 },
    { s: "b", t: "c" },
];

describe("the edge counter", () => {
    it("survives a Clear and a replacing import: the next edge takes a counter above every earlier one", () => {
        // DataManager builds a fresh store for both, handing each the counter it owns.
        const counter = createEdgeCounter();
        const first = newStore("auto", counter);
        load(first, ab3);
        first.dispose();

        const afterClear = newStore("auto", counter);
        load(afterClear, [{ s: "x", t: "y" }]);
        assert.deepEqual(
            rows(afterClear.getSnapshot()).map((row) => row.counter),
            [4],
            "a restart would reissue 0",
        );

        const afterReplace = newStore("auto", counter);
        load(afterReplace, ab3);
        assert.deepEqual(
            rows(afterReplace.getSnapshot()).map((row) => row.counter),
            [5, 6, 7, 8],
        );
    });

    it("resumes one past a restored value and never moves backwards", () => {
        const counter = createEdgeCounter();
        resumeEdgeCounter(counter, 41);
        const store = newStore("auto", counter);
        assert.strictEqual(store.nextEdgeId(), 42);
        resumeEdgeCounter(counter, 5);
        assert.strictEqual(store.nextEdgeId(), 43);
    });

    it("starts at 0 in a store built without one, as before", () => {
        const one = newStore();
        const two = newStore();
        assert.strictEqual(one.nextEdgeId(), 0);
        assert.strictEqual(one.nextEdgeId(), 1);
        assert.strictEqual(two.nextEdgeId(), 0);
    });
});

describe("repeated-edge survivorship", () => {
    it("decides, for each of the seven policies, what DataManager decided before", () => {
        const survivor = 2;
        const repeat = 5;
        const table: Record<DuplicatePolicy, ReturnType<typeof decideRepeat>> = {
            keep: { kind: "add" },
            error: { kind: "refuse" },
            first: { kind: "drop" },
            last: { kind: "merge", weight: 5, replaceRecord: true },
            sum: { kind: "merge", weight: 7, replaceRecord: false },
            min: { kind: "merge", weight: 2, replaceRecord: false },
            max: { kind: "merge", weight: 5, replaceRecord: false },
        };
        for (const [policy, expected] of Object.entries(table)) {
            assert.deepEqual(decideRepeat(policy as DuplicatePolicy, survivor, repeat), expected, policy);
        }
    });
});

describe("the identity columns", () => {
    it("are carried by a standalone session's store once edges are added through it", () => {
        const session = createGraphSession();
        const store = session.data.store as GraphStore;
        ingestNode(store, "a", {});
        ingestEdge(store, "a", "b", 1);
        ingestEdge(store, "b", "c", 1);

        const snapshot = session.snapshot();
        for (const name of [IDENTITY_COLUMNS.edgeHash, IDENTITY_COLUMNS.edgeOrdinal, IDENTITY_COLUMNS.edgeAmong]) {
            const column = snapshot.edges.get(name);
            assert.isNotNull(column, name);
            assert.strictEqual(column?.nullCount, 0, `${name} is set on every row`);
        }

        assert.strictEqual(snapshot.nodes.get(IDENTITY_COLUMNS.nodeHash)?.nullCount, 0);
        assert.deepEqual(ordinals(snapshot), ["-1/-1", "-1/-1"], "session edges carry no ordinal");
        assertHashesMatchIdentity(snapshot);
        session.dispose();
    });

    it("are computed lazily for a snapshot without them, equal to what the completion pass writes", () => {
        for (const directed of [true, false]) {
            const store = newStore(directed);
            load(store, [...ab3, { s: "b", t: "a" }, { s: "c", t: "c" }]);
            const stored = store.getSnapshot();

            const builder = new GraphBuilder({ directed, addMissingNodes: true });
            for (const record of [...ab3, { s: "b", t: "a" }, { s: "c", t: "c" }]) {
                builder.addNode(record.s);
                builder.addNode(record.t);
                builder.addEdge(record.s, record.t, record.w ?? 1);
            }

            const raw = builder.freeze();
            assert.isNull(raw.edges.get(IDENTITY_COLUMNS.edgeHash), "the raw snapshot has no columns");
            const fromStore = identityColumnsOf(stored);
            const lazy = identityColumnsOf(raw);
            assert.deepEqual([...lazy.nodeHash], [...fromStore.nodeHash], `node hashes, directed ${directed}`);
            assert.deepEqual([...lazy.edgeHash], [...fromStore.edgeHash], `edge hashes, directed ${directed}`);
            assert.deepEqual([...lazy.edgeOrdinal], [...fromStore.edgeOrdinal]);
            assert.deepEqual([...lazy.edgeAmong], [...fromStore.edgeAmong]);
            assert.strictEqual(identityColumnsOf(raw), lazy, "computed once per snapshot");
        }
    });

    it("gives an edge added without a file id the minted id graphty:e<n>", () => {
        const store = newStore(true);
        ingestEdge(store, "a", "b", 1);
        ingestEdge(store, "a", "b", 1, "file-7");
        const snapshot = store.getSnapshot();

        assert.deepEqual(stableEdgeMember(snapshot, 0), { source: "a", target: "b", id: "graphty:e0" });
        assert.strictEqual(mintedEdgeId(0), "graphty:e0");
        assertHashesMatchIdentity(snapshot, new Map([[1, "file-7"]]));
    });

    it("counts ordinals per pair over the load, unordered unless the graph was declared directed", () => {
        const records: Rec[] = [
            { s: "a", t: "b" },
            { s: "b", t: "a" },
            { s: "a", t: "c" },
            { s: "a", t: "b" },
        ];
        const unordered = newStore("auto");
        load(unordered, records);
        assert.deepEqual(ordinals(unordered.getSnapshot()), ["0/3", "1/3", "0/1", "2/3"]);
        assert.deepEqual(stableEdgeMember(unordered.getSnapshot(), 1), { source: "a", target: "b", ordinal: 1, among: 3 });

        const ordered = newStore(true);
        load(ordered, records);
        assert.deepEqual(ordinals(ordered.getSnapshot()), ["0/2", "0/1", "0/1", "1/2"]);
    });

    it("keeps a pair unordered when an auto direction is settled after the load", () => {
        const store = newStore("auto");
        load(store, [
            { s: "a", t: "b" },
            { s: "b", t: "a" },
        ]);
        const before = identityColumnsOf(store.getSnapshot());
        const beforeHashes = [...before.edgeHash];

        assert.strictEqual(ingestDeclaredDirection(store, true, "digraph"), "unchanged");
        load(store, [{ s: "b", t: "a" }]);
        const after = store.getSnapshot();
        assert.deepEqual([...identityColumnsOf(after).edgeHash].slice(0, 4), beforeHashes);
        assert.isFalse(pairsOrdered(after), "the rule was latched when the first edges were completed");
        assert.deepEqual(ordinals(after), ["0/2", "1/2", "0/1"]);
    });

    it("gives a load chunked across freezes the columns it gets in one chunk", () => {
        const records: Rec[] = [];
        for (let i = 0; i < 30; i++) {
            records.push({ s: `n${i % 4}`, t: `n${(i * 7) % 5}` });
        }

        const whole = newStore("auto");
        load(whole, records);
        const chunked = newStore("auto");
        load(chunked, records, { chunks: 4 });

        const one = identityColumnsOf(whole.getSnapshot());
        const four = identityColumnsOf(chunked.getSnapshot());
        assert.deepEqual([...four.edgeOrdinal], [...one.edgeOrdinal]);
        assert.deepEqual([...four.edgeAmong], [...one.edgeAmong]);
        assert.deepEqual([...four.edgeHash], [...one.edgeHash]);
    });

    it("follows a load's rows through a compacting freeze in the middle of it", () => {
        const store = newStore("auto");
        load(store, [{ s: "x", t: "y" }]);
        store.openLoad();
        ingestEdge(store, "a", "b", 1);
        ingestEdge(store, "a", "b", 1);
        store.getSnapshot();
        // Removing the earlier load's edge renumbers every row of this one at the next freeze.
        store.builder.removeEdge(0);
        store.touch();
        store.getSnapshot();
        ingestEdge(store, "b", "a", 1);
        store.closeLoad();
        assert.deepEqual(ordinals(store.getSnapshot()), ["0/3", "1/3", "2/3"]);
    });

    describe("counts surviving edges only, under each repeat policy", () => {
        const expected: Record<Exclude<DuplicatePolicy, "error">, { ordinals: string[]; weights: number[] }> = {
            keep: { ordinals: ["0/3", "1/3", "2/3", "0/1"], weights: [1, 2, 3, 1] },
            first: { ordinals: ["0/1", "0/1"], weights: [1, 1] },
            last: { ordinals: ["0/1", "0/1"], weights: [3, 1] },
            sum: { ordinals: ["0/1", "0/1"], weights: [6, 1] },
            min: { ordinals: ["0/1", "0/1"], weights: [1, 1] },
            max: { ordinals: ["0/1", "0/1"], weights: [3, 1] },
        };
        for (const [policy, want] of Object.entries(expected)) {
            it(policy, () => {
                const store = newStore(true);
                load(store, ab3, { policy: policy as DuplicatePolicy });
                const snapshot = store.getSnapshot();
                assert.deepEqual(ordinals(snapshot), want.ordinals);
                assert.deepEqual(
                    rows(snapshot).map((row) => row.weight),
                    want.weights,
                );
                if (policy === "last") {
                    assert.isTrue(
                        (decideRepeat("last", 1, 3) as { replaceRecord: boolean }).replaceRecord,
                        "last replaces the edge record, which leaves its identity alone",
                    );
                }

                assertHashesMatchIdentity(snapshot);
            });
        }

        it("error", () => {
            const store = newStore(true);
            load(store, [
                { s: "a", t: "b" },
                { s: "b", t: "c" },
            ], { policy: "error" });
            assert.deepEqual(ordinals(store.getSnapshot()), ["0/1", "0/1"]);
            expect(() => {
                load(store, ab3, { policy: "error" });
            }).toThrow("E_DUPLICATE_EDGE");
        });
    });

    it("holds the values of design 12.3 after a replacing re-import and a second Add data load", () => {
        const counter = createEdgeCounter();
        const original = newStore("auto", counter);
        load(original, ab3);
        assert.deepEqual(ordinals(original.getSnapshot()), ["0/3", "1/3", "2/3", "0/1"]);
        original.dispose();

        // The source file lost one of the three parallel edges; Replace data rebuilds the store.
        const replaced = newStore("auto", counter);
        load(replaced, [
            { s: "a", t: "b", w: 1 },
            { s: "a", t: "b", w: 3 },
            { s: "b", t: "c" },
        ]);
        assert.deepEqual(ordinals(replaced.getSnapshot()), ["0/2", "1/2", "0/1"]);

        // A second, additive load touching a pair of the first.
        const firstLoad = identityColumnsOf(replaced.getSnapshot());
        const firstHashes = [...firstLoad.edgeHash];
        load(replaced, [
            { s: "b", t: "a" },
            { s: "d", t: "e" },
        ]);
        const both = replaced.getSnapshot();
        assert.deepEqual(ordinals(both), ["0/2", "1/2", "0/1", "0/1", "0/1"]);
        assert.deepEqual([...identityColumnsOf(both).edgeHash].slice(0, 6), firstHashes, "the first load is untouched");
    });

    it("keeps hashes equal to the hash functions of the stable identity through a compacting freeze", () => {
        const store = newStore("auto");
        load(store, [...ab3, { s: "c", t: "d", id: 17 }]);
        ingestEdge(store, "d", "e", 1);
        const fileIds = new Map<number, string | number>([[4, 17]]);
        assertHashesMatchIdentity(store.getSnapshot(), fileIds);

        const before = new Map(rows(store.getSnapshot()).map((row) => [row.counter, row]));
        store.builder.removeNode("a");
        store.touch();
        const after = store.getSnapshot();
        assertHashesMatchIdentity(after, fileIds);
        for (const row of rows(after)) {
            assert.deepEqual(row, before.get(row.counter), `edge ${row.counter} kept its values`);
        }
    });

    it("never changes an ordinal when another edge is deleted", () => {
        const store = newStore("auto");
        load(store, ab3);
        store.getSnapshot();
        store.builder.removeEdge(1);
        store.touch();
        assert.deepEqual(ordinals(store.getSnapshot()), ["0/3", "2/3", "0/1"]);
    });

    it("costs 8 bytes a node and 16 an edge, and the pass 16 transient bytes a loaded edge", () => {
        const store = newStore("auto");
        const records: Rec[] = [];
        for (let i = 0; i < 200; i++) {
            records.push({ s: `n${i % 37}`, t: `n${(i * 11) % 41}` });
        }

        load(store, records);
        const snapshot = store.getSnapshot();
        assert.strictEqual(identityCounters.lastLoadEdges, 200);
        assert.strictEqual(identityCounters.lastTransientBytes, 16 * 200);

        // The accounting walk: every typed array reachable from the four columns.
        let walked = 0;
        const columns = [
            snapshot.nodes.get(IDENTITY_COLUMNS.nodeHash),
            snapshot.edges.get(IDENTITY_COLUMNS.edgeHash),
            snapshot.edges.get(IDENTITY_COLUMNS.edgeOrdinal),
            snapshot.edges.get(IDENTITY_COLUMNS.edgeAmong),
        ];
        for (const column of columns) {
            assert.isNotNull(column);
            const typed = column as { data: ArrayBufferView; validity: ArrayBufferView | null };
            walked += typed.data.byteLength + (typed.validity?.byteLength ?? 0);
        }

        assert.strictEqual(identityColumnBytes(snapshot), walked);
        assert.strictEqual(walked, 8 * snapshot.nodeCount + 16 * snapshot.edgeCount);
    });
});
