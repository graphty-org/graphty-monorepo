/**
 * On the "batched" render path the store lets its builder go once a load has frozen (the snapshot
 * holds the same rows) and rebuilds it from the snapshot on the next write, so a graph loaded and
 * only looked at holds one copy of its structure, not two. Counts and contents, no timings.
 */
import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it, vi } from "vitest";

import { GraphStore } from "../../src/data/GraphStore";

function storeWith(release: boolean, directed: () => boolean | "auto" = () => true): GraphStore {
    return new GraphStore({
        directed,
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

    it("brings the builder back with whole columns, not a write per cell (issue #9164)", () => {
        const store = storeWith(true);
        load(store, 40, 400);
        store.getSnapshot();
        store.releaseIdle();
        const nodeCells = vi.spyOn(GraphBuilder.prototype, "setNodeValue");
        const edgeCells = vi.spyOn(GraphBuilder.prototype, "setEdgeValue");
        try {
            assert.isNotNull(store.builder);
            assert.strictEqual(release(store).revivals, 1);
            // A column with a cell unset is still copied cell by cell, so this bounds rather than
            // pins: before, every set cell of every column was a call, 400 per edge column.
            assert.isBelow(edgeCells.mock.calls.length, 400, "edge columns copied whole");
            assert.isBelow(nodeCells.mock.calls.length, 40, "node columns copied whole");
        } finally {
            nodeCells.mockRestore();
            edgeCells.mockRestore();
        }
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
    it("lets it go again once edges follow a nodes-only load in a second command", () => {
        const store = storeWith(true);
        const { builder } = store;
        for (let id = 0; id < 50; id++) {
            builder.addNode(id);
        }
        store.account();
        store.getSnapshot();
        store.releaseIdle();
        assert.deepStrictEqual(release(store), { released: true, revivals: 0 });
        for (let at = 0; at < 200; at++) {
            const row = store.builder.addEdge(at % 50, (at * 3 + 1) % 50, 1);
            store.stampEdgeId(row, store.nextEdgeId());
        }
        store.account();
        store.getSnapshot();
        store.releaseIdle();
        assert.deepStrictEqual(release(store), { released: true, revivals: 1 });
    });

    it("sets a let-go graph aside for a clear without rebuilding it, and puts it back as it was", () => {
        const graphs = [true, false].map((on) => {
            const store = storeWith(on);
            load(store, 50, 200);
            const before = contents(store.getSnapshot());
            store.releaseIdle();
            const kept = store.keep();
            store.replace(kept, false);
            store.getSnapshot();
            assert.strictEqual(release(store).revivals, 0, "keep() rebuilt the graph it was about to drop");
            store.replace(kept, true);
            const after = contents(store.getSnapshot());
            assert.deepStrictEqual(after, before);
            return { store, after };
        });
        assert.deepStrictEqual(graphs[0].after, graphs[1].after);
        assert.strictEqual(release(graphs[0].store).revivals, 0);
    });

    it("undoes a replacing load while let go without rebuilding the builder it drops", () => {
        const store = storeWith(true);
        load(store, 50, 200);
        const before = contents(store.getSnapshot());
        const kept = store.keep();
        store.replace(kept, false);
        for (let id = 100; id < 160; id++) {
            store.builder.addNode(id);
        }
        store.account();
        store.getSnapshot();
        store.releaseIdle();
        assert.isTrue(release(store).released);
        store.replace(kept, true);
        assert.deepStrictEqual(contents(store.getSnapshot()), before);
        assert.strictEqual(release(store).revivals, 0);
    });

    it("still answers its builder and reads after dispose while let go", () => {
        const store = storeWith(true);
        load(store, 10, 20);
        store.getSnapshot();
        store.releaseIdle();
        store.dispose();
        assert.doesNotThrow(() => store.builder.nodeCount);
        assert.doesNotThrow(() => store.reads.nodeCount);
        assert.doesNotThrow(() => store.holdsNoRows);
    });

    it("follows a data.directed set while let go, and taking it back restores the file's direction (#9069)", () => {
        let setting: boolean | "auto" = "auto";
        const store = storeWith(true, () => setting);
        // A file that declares itself undirected, read under "auto".
        store.builder.setDirected(false);
        load(store, 10, 20);
        store.getSnapshot();
        store.releaseIdle();
        assert.isTrue(release(store).released);

        setting = true;
        assert.isTrue(store.getSnapshot().directed);
        setting = "auto";
        assert.isFalse(store.getSnapshot().directed, "the file's own reading is back");
        assert.strictEqual(store.getSnapshot().edgeCount, 20);
    });
});
