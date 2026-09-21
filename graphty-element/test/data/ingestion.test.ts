import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { GraphStore } from "../../src/data/GraphStore";
import { ingestEdge, ingestNode, resolveEdgeWeight } from "../../src/data/ingest";

function makeStore(positionScale = 1): GraphStore {
    return new GraphStore({
        directed: "auto",
        positionScale: () => positionScale,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
}

describe("ingestNode", () => {
    it("gives every id a dense row and reports the second write as a merge", () => {
        const store = makeStore();
        const first = ingestNode(store, "a", { id: "a", label: "one" });
        const second = ingestNode(store, "b", { id: "b" });
        const again = ingestNode(store, "a", { id: "a", label: "two" });

        assert.strictEqual(first.index, 0);
        assert.strictEqual(second.index, 1);
        assert.strictEqual(again.index, 0, "one id is one row, however many records carry it");
        assert.strictEqual(first.merged, false);
        assert.strictEqual(again.merged, true);
        assert.strictEqual(store.getSnapshot().nodeCount, 2);
    });

    it("invalidates the cached snapshot, which a merge alone would not", () => {
        // builder.mutationCount counts neither a merge nor a column write, so the store's own
        // revision counter is what makes a second read see the second record.
        const store = makeStore();
        ingestNode(store, "a", { id: "a" });
        const before = store.getSnapshot();
        assert.strictEqual(store.stale, false);
        ingestNode(store, "a", { id: "a", label: "two" });
        assert.strictEqual(store.stale, true, "the merge invalidated the cache");
        assert.notStrictEqual(store.getSnapshot(), before);
    });

    it("refuses an id graph-format will not take, instead of throwing mid-load", () => {
        // The element's node id is whatever the configured JMESPath expression returned, and a
        // record with no id key yields null. Such a record has always been drawn; throwing here
        // would turn one malformed row into a failed data load.
        const store = makeStore();
        const unusable: { name: string; id: unknown }[] = [
            { name: "null", id: null },
            { name: "undefined", id: undefined },
            { name: "NaN", id: Number.NaN },
            { name: "Infinity", id: Number.POSITIVE_INFINITY },
            { name: "an object", id: {} },
            { name: "an array", id: ["a"] },
            { name: "a boolean", id: true },
        ];
        for (const { name, id } of unusable) {
            const ingest = ingestNode(store, id, { label: "no usable id" });
            assert.strictEqual(ingest.index, INVALID_INDEX, `${name} must not reach the builder`);
            assert.strictEqual(ingest.merged, false);
        }

        assert.strictEqual(store.getSnapshot().nodeCount, 0);
    });

    it("takes 0 and the empty string, which are falsy but perfectly good ids", () => {
        const store = makeStore();
        assert.strictEqual(ingestNode(store, 0, { id: 0 }).index, 0);
        assert.strictEqual(ingestNode(store, "", { id: "" }).index, 1);
        assert.strictEqual(store.getSnapshot().nodeCount, 2);
    });

    it("seeds a record that carries {x, y, z}, which is the shape the element's own data uses", () => {
        const store = makeStore();
        ingestNode(store, "a", { id: "a", position: { x: 1, y: 2, z: 3 } });
        store.getSnapshot();
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 });
    });

    it("seeds a record that carries [x, y], placing it on the z = 0 plane", () => {
        const store = makeStore();
        ingestNode(store, "a", { id: "a", position: [4, 5] });
        store.getSnapshot();
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 4, y: 5, z: 0 }, "a 2D record IS placed; it is not half-placed");
    });

    it("applies positionScale on the way to the scene", () => {
        const store = makeStore(10);
        ingestNode(store, "a", { id: "a", position: { x: 1, y: 2, z: 3 } });
        store.getSnapshot();
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 10, y: 20, z: 30 }, "the seed column keeps FILE units");
    });

    it("leaves a node with an unusable coordinate UNPLACED rather than partly placed", () => {
        // A row stored with one NaN component reports itself placed, so no layout would ever
        // repair it and the mesh would vanish with the scene bounds poisoned.
        const store = makeStore();
        ingestNode(store, "nan-y", { position: { x: 1, y: Number.NaN, z: 0 }, id: "nan-y" });
        ingestNode(store, "text", { position: { x: "1", y: 2, z: 3 }, id: "text" });
        ingestNode(store, "short", { position: [1], id: "short" });
        ingestNode(store, "good", { position: [1, 2, 3], id: "good" });
        store.getSnapshot();
        assert.strictEqual(store.positions.isPlaced(0), false);
        assert.strictEqual(store.positions.isPlaced(1), false);
        assert.strictEqual(store.positions.isPlaced(2), false);
        assert.strictEqual(store.positions.isPlaced(3), true, "and the rest of the burst is still seeded");
    });

    it("reads an unplaced node as NaN, never as the origin", () => {
        const store = makeStore();
        ingestNode(store, "a", { id: "a" });
        store.getSnapshot();
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.strictEqual(Number.isNaN(out.x), true, "zero is a real position; 'not laid out yet' is not");
        assert.strictEqual(Number.isNaN(out.y), true);
        assert.strictEqual(Number.isNaN(out.z), true);
        assert.strictEqual(store.positions.isPlaced(0), false);
    });
});

describe("resolveEdgeWeight", () => {
    it("prefers the configured path", () => {
        assert.deepStrictEqual(resolveEdgeWeight({ weight: 2.5, value: 9 }, "weight"), {
            weight: 2.5,
            source: "path",
        });
    });

    it("falls back to the legacy value key every dataset in this repository carries", () => {
        assert.deepStrictEqual(resolveEdgeWeight({ value: 9 }, "weight"), { weight: 9, source: "legacy" });
        assert.deepStrictEqual(resolveEdgeWeight({ value: 9 }, null), { weight: 9, source: "legacy" });
    });

    it("falls through a non-numeric path value rather than poisoning the weight", () => {
        assert.deepStrictEqual(resolveEdgeWeight({ weight: "heavy", value: 9 }, "weight"), {
            weight: 9,
            source: "legacy",
        });
        assert.deepStrictEqual(resolveEdgeWeight({ weight: Number.NaN }, "weight"), {
            weight: 1,
            source: "default",
        });
    });

    it("is 1 when nothing says otherwise", () => {
        assert.deepStrictEqual(resolveEdgeWeight({}, "weight"), { weight: 1, source: "default" });
    });
});

describe("ingestEdge", () => {
    it("takes an edge whose endpoints have not arrived, and the snapshot carries both", () => {
        const store = makeStore();
        const { index } = ingestEdge(store, "X", "Y", 1);
        assert.notStrictEqual(index, INVALID_INDEX);
        const snapshot = store.getSnapshot();
        assert.strictEqual(snapshot.edgeCount, 1, "addMissingNodes means the builder took it");
        assert.strictEqual(snapshot.nodeCount, 2, "and materialised both endpoints");
    });

    it("writes the resolved weight, not a constant 1", () => {
        const store = makeStore();
        ingestEdge(store, "a", "b", 2);
        ingestEdge(store, "b", "c", 3);
        const snapshot = store.getSnapshot();
        const { weights, edgeToArc } = snapshot;
        assert.notStrictEqual(weights, null, "a weighted burst produces a weight array");
        assert.strictEqual(weights?.[edgeToArc[0] ?? 0], 2);
        assert.strictEqual(weights?.[edgeToArc[1] ?? 0], 3);
    });

    it("stamps the element-assigned counter column, one id per edge", () => {
        const store = makeStore();
        ingestEdge(store, "a", "b", 1);
        ingestEdge(store, "b", "c", 1);
        const snapshot = store.getSnapshot();
        const column = snapshot.edges.requireTyped("graphty.edgeId", "u32");
        assert.strictEqual(column.data[0], 0);
        assert.strictEqual(column.data[1], 1);
    });

    it("hands the counter back, so the caller can build an Edge whose id IS that counter", () => {
        const store = makeStore();
        const first = ingestEdge(store, "a", "b", 1);
        const second = ingestEdge(store, "b", "c", 1);

        assert.strictEqual(first.edgeId, 0, "the first edge takes the first counter value");
        assert.strictEqual(second.edgeId, 1, "and the counter does not repeat");

        const column = store.getSnapshot().edges.requireTyped("graphty.edgeId", "u32");
        assert.strictEqual(column.data[first.index], first.edgeId, "the returned id is the one in the column");
        assert.strictEqual(column.data[second.index], second.edgeId);
    });

    it("refuses an endpoint id graph-format will not take", () => {
        const store = makeStore();
        assert.strictEqual(ingestEdge(store, null, "b", 1).index, INVALID_INDEX);
        assert.strictEqual(ingestEdge(store, "a", undefined, 1).index, INVALID_INDEX);
        assert.strictEqual(store.getSnapshot().edgeCount, 0, "neither reached the builder");
    });

    it("grows the position array to cover an endpoint the builder invented", () => {
        const store = makeStore();
        ingestEdge(store, "a", "b", 1);
        const snapshot = store.getSnapshot();
        assert.strictEqual(store.positions.count, snapshot.nodeCount);
        assert.strictEqual(store.positions.isPlaced(0), false);
        assert.strictEqual(store.positions.isPlaced(1), false);
    });
});
