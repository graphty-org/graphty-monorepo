import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import type { GraphEvent } from "../../src/events";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import type { GraphContext } from "../../src/managers/GraphContext";
import type { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";

/**
 * A stand-in for a render node.
 *
 * A real `Node` builds a Babylon mesh in its constructor and so needs a Scene, which this project
 * does not have. Everything the store side of the manager does to a node is read `index`, write
 * `index` and call `dispose()`, so a stand-in exercises the real code paths rather than mocking
 * them away.
 * @param id - the node id
 * @param index - the store row the manager would have assigned
 * @returns the stand-in
 */
function nodeStub(id: string, index: number): Node {
    return {
        id,
        index,
        dispose: () => undefined,
    } as unknown as Node;
}

/**
 * A stand-in for a render edge, registered where `addEdges` would have registered a real one.
 * @param dm - the manager to register it in
 * @param srcId - source node id
 * @param dstId - destination node id
 * @param index - the store row the manager would have assigned
 * @returns the stand-in
 */
function registerEdgeStub(dm: DataManager, srcId: string, dstId: string, index: number): Edge {
    const edge = {
        id: `${srcId}:${dstId}`,
        index,
        srcId,
        dstId,
        srcNode: { id: srcId },
        dstNode: { id: dstId },
        dispose: () => undefined,
    } as unknown as Edge;
    dm.edges.set(edge.id, edge);
    dm.edgeCache.set(srcId, dstId, edge);
    dm.edgesByIndex[index] = edge;
    return edge;
}

/**
 * A DataManager with no render side.
 *
 * Every case below drives edges whose endpoints have no `Node` yet, which is the one ingestion
 * path that never constructs a Babylon mesh: the STORE takes the edge and materialises both
 * endpoints, and the render object waits. That is what makes the manager's authoritative copy
 * testable in the fast project at all -- a `Node` needs a Scene, and a Scene needs a browser.
 * @returns the manager, its event manager, and the events it emitted
 */
function makeManager(): { dm: DataManager; events: GraphEvent[] } {
    const eventManager = new EventManager();
    const events: GraphEvent[] = [];
    eventManager.onGraphEvent.add((event) => {
        events.push(event);
    });
    const dm = new DataManager(eventManager, Styles.default());
    // The context is only ever read back out as the event payload, so a sentinel is enough and is
    // honest about how little of it this path uses.
    dm.setGraphContext({} as unknown as GraphContext);
    return { dm, events };
}

describe("DataManager owns the graph store", () => {
    it("has a snapshot before any record arrives", () => {
        const { dm } = makeManager();
        const snapshot = dm.getSnapshot();
        assert.strictEqual(snapshot.nodeCount, 0);
        assert.strictEqual(snapshot.edgeCount, 0);
        assert.strictEqual(dm.positions.count, 0);
    });

    it("hands out the SAME snapshot until the graph changes, and a new one after", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        const first = dm.getSnapshot();
        assert.strictEqual(dm.getSnapshot(), first, "a second reader in the same revision pays nothing");
        dm.addEdges([{ src: "b", dst: "c" }]);
        const second = dm.getSnapshot();
        assert.notStrictEqual(second, first);
        assert.strictEqual(second.nodeCount, 3);
        assert.strictEqual(second.edgeCount, 2);
    });

    it("gives the snapshot the edge even though the render object is still waiting", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        const snapshot = dm.getSnapshot();
        assert.strictEqual(snapshot.edgeCount, 1);
        assert.strictEqual(snapshot.nodeCount, 2, "the builder materialised both endpoints");
        assert.strictEqual(dm.edges.size, 0, "and no mesh was built for either of them");
        assert.strictEqual(dm.edgesByIndex.length, 0);
    });

    it("drops a duplicate record for a pair whose render object is still pending", () => {
        // `edgeCache` cannot answer this: it only learns about an edge when the Edge is built, so
        // without the pending-key set the builder would take the same pair twice.
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        dm.addEdges([{ src: "a", dst: "b" }]);
        assert.strictEqual(dm.getSnapshot().edgeCount, 1);
    });

    it("keeps the mirror of a directed pair, which is a different edge", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "a" }]);
        assert.strictEqual(dm.getSnapshot().edgeCount, 2);
    });

    it("sizes the positions array to the node count, every row unplaced", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
        const snapshot = dm.getSnapshot();
        assert.strictEqual(dm.positions.count, snapshot.nodeCount);
        const out = { x: 0, y: 0, z: 0 };
        for (let i = 0; i < snapshot.nodeCount; i++) {
            assert.strictEqual(dm.positions.isPlaced(i), false);
            dm.positions.read(i, out);
            assert.strictEqual(Number.isNaN(out.x), true, "zero is a real position; unplaced is NaN");
        }
    });

    it("lends the positions array to the snapshot by reference, so a write is visible through it", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        const snapshot = dm.getSnapshot();
        const column = snapshot.nodes.requireTyped("position", "f32");
        dm.positions.write(0, 7, 8, 9);
        assert.strictEqual(column.data[0], 7);
        assert.strictEqual(column.data[1], 8);
        assert.strictEqual(column.data[2], 9);
    });

    it("emits snapshot-replaced once per freeze, carrying the superseded snapshot", () => {
        const { dm, events } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        const first = dm.getSnapshot();
        dm.getSnapshot();
        dm.addEdges([{ src: "b", dst: "c" }]);
        const second = dm.getSnapshot();

        const replaced = events.filter((event) => event.type === "snapshot-replaced");
        assert.strictEqual(replaced.length, 2, "the cached read did not announce anything");
        assert.strictEqual(replaced[0]?.type === "snapshot-replaced" ? replaced[0].previous : "wrong", null);
        assert.strictEqual(replaced[1]?.type === "snapshot-replaced" ? replaced[1].previous : "wrong", first);
        assert.strictEqual(replaced[1]?.type === "snapshot-replaced" ? replaced[1].next : "wrong", second);
    });

    it("builds the undirected view once per snapshot and shares the position column with it", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        const snapshot = dm.getSnapshot();
        const view = dm.undirected(snapshot);
        assert.strictEqual(dm.undirected(snapshot), view, "a second caller does not pay for a second view");
        assert.strictEqual(view.snapshot.nodes, snapshot.nodes, "so a coordinate written here is seen there");
    });

    it("takes the weight off the configured path and off the legacy key", () => {
        const { dm } = makeManager();
        dm.addEdges([
            { src: "a", dst: "b", weight: 2.5 },
            { src: "b", dst: "c", value: 9 },
            { src: "c", dst: "d" },
        ]);
        const snapshot = dm.getSnapshot();
        const { weights, edgeToArc } = snapshot;
        assert.strictEqual(weights?.[edgeToArc[0] ?? 0], 2.5);
        assert.strictEqual(weights?.[edgeToArc[1] ?? 0], 9, "every weighted dataset here carries 'value'");
        assert.strictEqual(weights?.[edgeToArc[2] ?? 0], 1);
    });
});

describe("DataManager removal reaches the store", () => {
    it("does not freeze when a removal found nothing to remove", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        const before = dm.getSnapshot();
        assert.strictEqual(dm.removeNode("a"), false, "the store has the node; the render side never did");
        assert.strictEqual(dm.removeEdge("a:b"), false);
        assert.strictEqual(dm.getSnapshot(), before, "and neither call invalidated the snapshot");
    });

    it("takes a removed node AND its incident edges out of the snapshot", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
        dm.getSnapshot();
        const removed = nodeStub("a", 0);
        dm.nodes.set("a", removed);
        dm.nodeCache.set("a", removed);
        const ab = registerEdgeStub(dm, "a", "b", 0);
        registerEdgeStub(dm, "b", "c", 1);

        assert.strictEqual(dm.removeNode("a"), true);
        assert.strictEqual(removed.index, INVALID_INDEX);
        assert.strictEqual(ab.index, INVALID_INDEX, "the incident edge lost its row at once, not at the next freeze");
        assert.strictEqual(dm.edgesByIndex[0], undefined);

        const snapshot = dm.getSnapshot();
        assert.strictEqual(snapshot.nodeCount, 2);
        assert.strictEqual(snapshot.edgeCount, 1);
        assert.strictEqual(dm.edges.size, 2, "the render objects are untouched; this step changes no rendering");
    });

    it("takes a removed edge out of the snapshot and leaves its endpoints", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
        dm.getSnapshot();
        const bc = registerEdgeStub(dm, "b", "c", 1);

        assert.strictEqual(dm.removeEdge("b:c"), true);
        assert.strictEqual(bc.index, INVALID_INDEX);
        const snapshot = dm.getSnapshot();
        assert.strictEqual(snapshot.edgeCount, 1);
        assert.strictEqual(snapshot.nodeCount, 3, "removing an edge removes no node");
    });
});

describe("DataManager walks a compacting freeze", () => {
    it("slides every surviving index down, in the render objects and in edgesByIndex", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
        dm.getSnapshot();
        const a = nodeStub("a", 0);
        const b = nodeStub("b", 1);
        const c = nodeStub("c", 2);
        for (const node of [a, b, c]) {
            dm.nodes.set(node.id, node);
            dm.nodeCache.set(node.id, node);
        }

        registerEdgeStub(dm, "a", "b", 0);
        const bc = registerEdgeStub(dm, "b", "c", 1);

        dm.removeNode("a");
        dm.getSnapshot();

        assert.strictEqual(b.index, 0, "b slid down into the row the removed node vacated");
        assert.strictEqual(c.index, 1);
        assert.strictEqual(bc.index, 0, "and so did the surviving edge");
        assert.deepStrictEqual([...dm.edgesByIndex], [bc], "the dead row is gone, not merely emptied");
    });

    it("carries every surviving node's coordinates with it", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
        dm.getSnapshot();
        dm.positions.write(0, 10, 0, 0);
        dm.positions.write(1, 20, 0, 0);
        dm.positions.write(2, 30, 0, 0);

        const a = nodeStub("a", 0);
        dm.nodes.set("a", a);
        dm.nodeCache.set("a", a);
        dm.removeNode("a");
        dm.getSnapshot();

        const out = { x: 0, y: 0, z: 0 };
        dm.positions.read(0, out);
        assert.strictEqual(out.x, 20, "b is at b's coordinate, not at the dead node's");
        dm.positions.read(1, out);
        assert.strictEqual(out.x, 30);
        assert.strictEqual(dm.positions.count, 2);
    });

    it("drops a pending edge whose store edge died, and frees its pair for a later record", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
        dm.getSnapshot();
        const a = nodeStub("a", 0);
        dm.nodes.set("a", a);
        dm.nodeCache.set("a", a);

        dm.removeNode("a");
        assert.strictEqual(dm.getSnapshot().edgeCount, 1, "the pending a-b edge went with its endpoint");

        dm.addEdges([{ src: "a", dst: "b" }]);
        assert.strictEqual(dm.getSnapshot().edgeCount, 2, "and the pair is accepted again rather than deduplicated");
    });
});

describe("DataManager store lifecycle", () => {
    it("clear() discards the graph data, not only the meshes, and stays usable", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        assert.strictEqual(dm.getSnapshot().edgeCount, 1);

        dm.clear();
        const snapshot = dm.getSnapshot();
        assert.strictEqual(snapshot.nodeCount, 0, "the builder went with the meshes");
        assert.strictEqual(snapshot.edgeCount, 0);
        assert.strictEqual(dm.positions.count, 0);

        dm.addEdges([{ src: "x", dst: "y" }]);
        assert.strictEqual(dm.getSnapshot().nodeCount, 2, "and the fresh store accepts a new dataset");
    });

    it("re-declares the element columns with the fresh store, which builder.clear() would drop", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        dm.clear();
        dm.addEdges([{ src: "x", dst: "y" }]);
        const snapshot = dm.getSnapshot();
        assert.notStrictEqual(snapshot.nodes.byRole("position"), null);
        assert.strictEqual(snapshot.edges.requireTyped("graphty.edgeId", "u32").data[0], 0);
    });

    it("forgets a pending edge across clear(), so the pair is accepted again", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        dm.clear();
        dm.addEdges([{ src: "a", dst: "b" }]);
        assert.strictEqual(dm.getSnapshot().edgeCount, 1, "the stale pending key did not swallow it");
    });

    it("dispose() leaves a usable store behind, the way it leaves usable maps behind", () => {
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        dm.dispose();
        assert.doesNotThrow(() => dm.getSnapshot());
        assert.strictEqual(dm.getSnapshot().nodeCount, 0);
    });
});

describe("DataManager indices", () => {
    it("starts an Edge and a Node at INVALID_INDEX, which means 'not in the store'", () => {
        // The constant is the contract: a render object with no row must be distinguishable from
        // one at row 0, and 0 is a perfectly good row.
        assert.strictEqual(INVALID_INDEX > 0, true);
        const { dm } = makeManager();
        dm.addEdges([{ src: "a", dst: "b" }]);
        dm.getSnapshot();
        assert.strictEqual(dm.edgesByIndex[0], undefined, "no render object claimed row 0 yet");
    });
});
