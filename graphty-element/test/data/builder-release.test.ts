/**
 * On the "batched" render path the store lets its builder go once a load has frozen (the snapshot
 * holds the same rows) and rebuilds it from the snapshot on the next write, so a graph loaded and
 * only looked at holds one copy of its structure, not two. Counts and contents, no timings.
 */
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { GraphStore } from "../../src/data/GraphStore";

function storeWith(release: boolean): GraphStore {
    return new GraphStore({
        directed: () => true,
        positionScale: () => 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        denseEdgeIds: () => true,
        ...(release ? { releaseBuilder: () => true } : {}),
    });
}

function load(store: GraphStore, nodes: number, edges: number): void {
    const { builder } = store;
    for (let id = 0; id < nodes; id++) {
        const row = builder.addNode(id);
        builder.setNodeValue(store.seedColumn, row, [id, -id, 0]);
    }

    for (let at = 0; at < edges; at++) {
        const row = builder.addEdge(at % nodes, (at * 3 + 1) % nodes, 1 + (at % 4));
        store.stampEdgeId(row, store.nextEdgeId());
    }

    // As the graph primitives do after each write of their own.
    store.account();
}

/** Everything a snapshot holds that a reader sees, as plain data. */
function contents(snapshot: GraphSnapshot): unknown {
    const list = snapshot.edgeList();
    const columns = (
        table: Iterable<{ meta: { name: string }; length: number; value(row: number): unknown }>,
    ): unknown =>
        [...table]
            .filter((column) => column.meta.name !== "position" && !column.meta.name.includes("pinned"))
            .map((column) => [
                column.meta.name,
                Array.from({ length: column.length }, (_, row) => {
                    const value = column.value(row);
                    return ArrayBuffer.isView(value) ? [...(value as Float32Array)] : value;
                }),
            ]);
    return {
        directed: snapshot.directed,
        ids: Array.from({ length: snapshot.nodeCount }, (_, row) => snapshot.ids.idOf(row)),
        src: [...list.src],
        dst: [...list.dst],
        weights: list.weights === null ? null : [...list.weights],
        nodes: columns(snapshot.nodes),
        edges: columns(snapshot.edges),
    };
}

function release(store: GraphStore): { released: boolean; revivals: number } {
    return (store as unknown as { builderRelease: { released: boolean; revivals: number } }).builderRelease;
}

describe("letting the builder go after a load", () => {
    it("lets it go once the load freezes, and answers reads from the snapshot without rebuilding", () => {
        const store = storeWith(true);
        load(store, 50, 200);
        const snapshot = store.getSnapshot();
        assert.deepStrictEqual(release(store), { released: false, revivals: 0 }, "a freeze alone keeps it");
        store.releaseIdle();
        assert.deepStrictEqual(release(store), { released: true, revivals: 0 });

        // Reads a frame, a hover or a paint makes: none brings the builder back.
        assert.strictEqual(store.getSnapshot(), snapshot);
        assert.strictEqual(store.reads.nodeCount, 50);
        assert.strictEqual(store.reads.edgeCount, 200);
        assert.strictEqual(store.reads.indexOf(7), 7);
        assert.strictEqual(store.reads.idOf(9), 9);
        assert.deepStrictEqual(store.reads.edgeEndpoints(5), [5, 16]);
        assert.strictEqual(store.edgeIndexOf(store.edgeIdAt(12)), 12);
        assert.strictEqual(store.directed, true);
        assert.strictEqual(store.holdsNoRows, false);
        store.audit();
        assert.strictEqual(store.mutationDrift, 0);
        assert.deepStrictEqual(release(store), { released: true, revivals: 0 });
    });

    it("rebuilds it on the first write, and the graph comes out as if it had been kept", () => {
        const graphs = [true, false].map((on) => {
            const store = storeWith(on);
            load(store, 40, 120);
            store.getSnapshot();
            store.releaseIdle();
            // The first edit after the load: an edge added, one removed, a node added.
            const row = store.builder.addEdge(3, 4, 2);
            store.stampEdgeId(row, store.nextEdgeId());
            store.builder.removeEdge(store.edgeIndexOf(10));
            store.builder.addNode(40);
            store.account();
            return { store, contents: contents(store.getSnapshot()) };
        });
        assert.deepStrictEqual(graphs[0].contents, graphs[1].contents);
        assert.strictEqual(release(graphs[0].store).revivals, 1);
        assert.strictEqual(release(graphs[1].store).revivals, 0);
    });

    it("keeps a rebuilt builder: a second edit costs no second rebuild", () => {
        const store = storeWith(true);
        load(store, 20, 40);
        store.getSnapshot();
        store.releaseIdle();
        store.builder.addNode(20);
        store.account();
        store.getSnapshot();
        store.releaseIdle();
        assert.deepStrictEqual(release(store), { released: false, revivals: 1 });
        store.builder.addNode(21);
        store.account();
        store.getSnapshot();
        store.releaseIdle();
        assert.deepStrictEqual(release(store), { released: false, revivals: 1 });
    });

    it("keeps the builder when the option is off (the objects path)", () => {
        const store = storeWith(false);
        load(store, 20, 40);
        store.getSnapshot();
        store.releaseIdle();
        assert.deepStrictEqual(release(store), { released: false, revivals: 0 });
    });
});
