/**
 * On the "batched" render path a fresh load assigns edge ids in row order, so the store keeps no
 * per-edge entry in its id-to-row map for them: the row is the id less one offset. Counts, no timings.
 */
import { assert, describe, it } from "vitest";

import { GraphStore } from "../../src/data/GraphStore";

const INVALID = 0xffffffff;

function storeWith(dense: boolean): GraphStore {
    return new GraphStore({
        directed: () => true,
        positionScale: () => 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        ...(dense ? { denseEdgeIds: () => true } : {}),
    });
}

function mapSize(store: GraphStore): number {
    return (store as unknown as { indexByEdgeId: Map<number, number> }).indexByEdgeId.size;
}

function load(store: GraphStore, edges: number): number[] {
    const { builder } = store;
    for (let id = 0; id < 10; id++) {
        builder.addNode(id);
    }

    const ids: number[] = [];
    for (let at = 0; at < edges; at++) {
        const row = builder.addEdge(at % 10, (at * 3 + 1) % 10, 1);
        const id = store.nextEdgeId();
        store.stampEdgeId(row, id);
        ids.push(id);
    }

    return ids;
}

describe("edge id stamping on a fresh load", () => {
    it("keeps no map entry per edge on the batched path, and every id still finds its row", () => {
        const store = storeWith(true);
        const ids = load(store, 50);
        assert.strictEqual(mapSize(store), 0);
        ids.forEach((id, row) => {
            assert.strictEqual(store.edgeIndexOf(id), row);
            assert.strictEqual(store.edgeIdAt(row), id);
        });
    });

    it("keeps one entry per edge when the option is off (the objects path)", () => {
        const store = storeWith(false);
        const ids = load(store, 50);
        assert.strictEqual(mapSize(store), 50);
        ids.forEach((id, row) => assert.strictEqual(store.edgeIndexOf(id), row));
    });

    it("finds the same rows on both paths after a removal compacts the rows", () => {
        const rows = [true, false].map((dense) => {
            const store = storeWith(dense);
            const ids = load(store, 20);
            store.builder.removeEdge(store.edgeIndexOf(ids[3]));
            store.getSnapshot();
            const extra = store.builder.addEdge(1, 2, 1);
            store.stampEdgeId(extra, store.nextEdgeId());
            return [...ids, ids.length].map((id) => store.edgeIndexOf(id));
        });
        assert.deepStrictEqual(rows[0], rows[1]);
        assert.strictEqual(rows[0][3], INVALID);
    });

    it("finds a restamped id at its new row", () => {
        const store = storeWith(true);
        const ids = load(store, 5);
        store.builder.removeEdge(store.edgeIndexOf(ids[2]));
        const again = store.builder.addEdge(4, 5, 1);
        store.stampEdgeId(again, ids[2]);
        assert.strictEqual(store.edgeIndexOf(ids[2]), again);
    });
});
