import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { AdHocData } from "../../src/config";
import type { Graph } from "../../src/Graph";
import { type DataManager, dataManagerInternals } from "../../src/managers/DataManager";
import type { UpdateManager } from "../../src/managers/UpdateManager";
import { dispatcherOf } from "../../src/session/GraphSession";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("DataManager", () => {
    let graph: Graph;
    let dataManager: DataManager;

    beforeEach(async () => {
        graph = await createTestGraph();
        dataManager = graph.getDataManager();
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    describe("initialization", () => {
        it("should initialize without errors", () => {
            // Graph is already initialized in beforeEach
            assert.isNotNull(dataManager);
        });

        it("should dispose without errors", () => {
            // This will be called during graph cleanup
            assert.doesNotThrow(() => {
                cleanupTestGraph(graph);
            });
        });
    });

    describe("node management", () => {
        it("should add a single node", () => {
            const nodeData = {
                id: "node1",
                label: "Test Node",
            } as unknown as AdHocData;

            dataManager.addNode(nodeData);

            const node = dataManager.getNode("node1");
            assert.isDefined(node);
            assert.equal(node.id, "node1");
        });

        it("finds no node on a row past the end, and the node on a live row", () => {
            dataManager.addNodes([{ id: "node1" }, { id: "node2" }]);

            assert.equal(dataManager.nodeAtRow(1)?.id, "node2");
            // 0x999998: a row no graph here holds, as a stray texel of the node ID target names.
            assert.isUndefined(dataManager.nodeAtRow(10066328));
            assert.isUndefined(dataManager.nodeAtRow(-1));
        });

        it("should add multiple nodes", () => {
            const nodesData = [
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
                { id: "node3", label: "Node 3" },
            ] as unknown as AdHocData[];

            dataManager.addNodes(nodesData);

            assert.equal(dataManager.nodes.size, 3);
            assert.isDefined(dataManager.getNode("node1"));
            assert.isDefined(dataManager.getNode("node2"));
            assert.isDefined(dataManager.getNode("node3"));
        });

        it("should handle node with custom id path", () => {
            const nodeData = {
                customId: "node1",
                label: "Test Node",
            } as unknown as AdHocData;

            dataManager.addNode(nodeData, "customId");

            const node = dataManager.getNode("node1");
            assert.isDefined(node);
            assert.equal(node.id, "node1");
        });

        it("reads the added nodes' ids with the idPath setNodes was given", () => {
            dataManager.addNodes([{ key: "a" }, { key: "b" }], "key");

            dataManager.setNodes([{ key: "b" }, { key: "c" }], "key");

            assert.deepStrictEqual([...dataManager.nodes.keys()].map(String).sort(), ["b", "c"]);
        });

        it("should not update existing node (current behavior)", () => {
            const nodeData = {
                id: "node1",
                label: "Original Label",
            } as unknown as AdHocData;

            dataManager.addNode(nodeData);

            const updatedData = {
                id: "node1",
                label: "Updated Label",
            } as unknown as AdHocData;

            // Adding a node with the same ID is currently skipped
            dataManager.addNode(updatedData);

            const node = dataManager.getNode("node1");
            assert.isDefined(node);
            // The original label should remain unchanged
            assert.equal(node.data.label, "Original Label");
        });

        it("should remove a node", () => {
            dataManager.addNode({ id: "node1", __brand: "AdHocData" } as AdHocData);

            const removed = dataManager.removeNodeAndIncidentEdges("node1");

            assert.deepStrictEqual(removed, [], "the node went, and it had no edges to take with it");
            assert.isUndefined(dataManager.getNode("node1"));
            assert.equal(dataManager.nodes.size, 0);
        });

        it("should answer null when removing non-existent node", () => {
            assert.isNull(dataManager.removeNodeAndIncidentEdges("non-existent"));
        });

        it("should get all nodes", () => {
            dataManager.addNodes([{ id: "node1" }, { id: "node2" }, { id: "node3" }]);

            const nodes = Array.from(dataManager.nodes.values());
            assert.equal(nodes.length, 3);
        });
    });

    describe("edge management", () => {
        beforeEach(() => {
            // Add nodes that edges will connect
            dataManager.addNode({ id: "node1", __brand: "AdHocData" } as AdHocData);
            dataManager.addNode({ id: "node2", __brand: "AdHocData" } as AdHocData);
            dataManager.addNode({ id: "node3", __brand: "AdHocData" } as AdHocData);
        });

        it("should add a single edge", () => {
            const edgeData = {
                id: "edge1",
                src: "node1",
                dst: "node2",
            } as unknown as AdHocData;

            dataManager.addEdge(edgeData);

            const edge = dataManager.getEdge("0");
            assert.isDefined(edge);
            assert.equal(edge.id, "0", "the element's own counter, not anything the record carried");
            assert.equal(edge.srcId, "node1");
            assert.equal(edge.dstId, "node2");
        });

        it("should add multiple edges", () => {
            const edgesData = [
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node2", dst: "node3" },
                { id: "edge3", src: "node3", dst: "node1" },
            ] as unknown as AdHocData[];

            dataManager.addEdges(edgesData);

            assert.equal(dataManager.edges.size, 3);
            // The ids are the element's own counters, handed out in arrival order.
            assert.isDefined(dataManager.getEdge("0"));
            assert.isDefined(dataManager.getEdge("1"));
            assert.isDefined(dataManager.getEdge("2"));
        });

        it("should give every edge the element's own id, whatever the record carries", () => {
            const edgeData = {
                src: "node1",
                dst: "node2",
            } as unknown as AdHocData;

            dataManager.addEdge(edgeData);

            const edge = dataManager.getEdge("0");
            assert.isDefined(edge);
            assert.equal(edge.id, "0");
            assert.equal(edge.srcId, "node1");
            assert.equal(edge.dstId, "node2");
        });

        it("should handle edge with custom source/target paths", () => {
            const edgeData = {
                id: "edge1",
                from: "node1",
                to: "node2",
            } as unknown as AdHocData;

            dataManager.addEdge(edgeData, { source: "from", target: "to" });

            const edge = dataManager.getEdge("0");
            assert.isDefined(edge);
            assert.equal(edge.srcId, "node1");
            assert.equal(edge.dstId, "node2");
        });

        it("should defer edge creation if source node doesn't exist", () => {
            const edgeData = {
                id: "edge1",
                src: "non-existent",
                dst: "node2",
            } as unknown as AdHocData;

            // Should not throw - edge is deferred until nodes exist
            dataManager.addEdge(edgeData);

            // Edge should not be created yet
            assert.equal(dataManager.edges.size, 0);
        });

        it("should defer edge creation if target node doesn't exist", () => {
            const edgeData = {
                id: "edge1",
                src: "node1",
                dst: "non-existent",
            } as unknown as AdHocData;

            // Should not throw - edge is deferred until nodes exist
            dataManager.addEdge(edgeData);

            // Edge should not be created yet
            assert.equal(dataManager.edges.size, 0);
        });

        it("should remove an edge", () => {
            dataManager.addEdge({
                id: "edge1",
                src: "node1",
                dst: "node2",
            });

            const removed = dataManager.removeEdge("0");

            assert.isTrue(removed);
            assert.isUndefined(dataManager.getEdge("0"));
            assert.equal(dataManager.edges.size, 0);
        });

        it("should return false when removing non-existent edge", () => {
            const removed = dataManager.removeEdge("nothing-of-the-sort");
            assert.isFalse(removed);
        });

        it("removes the edges attached to a node when the node is removed", () => {
            dataManager.addEdges([
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node1", dst: "node3" },
                { id: "edge3", src: "node2", dst: "node3" },
            ]);

            const removed = dataManager.removeNodeAndIncidentEdges("node1");

            assert.deepStrictEqual([...(removed ?? [])].sort(), ["0", "1"], "both edges at node1 are named");
            assert.isUndefined(dataManager.getEdge("0"), "node1 -> node2 went with node1");
            assert.isUndefined(dataManager.getEdge("1"), "node1 -> node3 went with node1");
            assert.isDefined(dataManager.getEdge("2"), "node2 -> node3 touches neither end and stays");
            assert.equal(dataManager.edges.size, 1);
            assert.equal(dataManager.heldCounts().edges, 1, "and the store agrees");
        });
    });

    describe("cache management", () => {
        it("should use node cache for existing nodes", () => {
            const nodeData = { id: "node1", label: "Test" } as unknown as AdHocData;

            dataManager.addNode(nodeData);
            const node1 = dataManager.getNode("node1");

            // Add same node again
            dataManager.addNode(nodeData);
            const node2 = dataManager.getNode("node1");

            // Should return the same instance
            assert.strictEqual(node1, node2);
        });

        it("holds a second edge between one pair as a second edge, under the default policy", () => {
            dataManager.addNode({ id: "node1", __brand: "AdHocData" } as AdHocData);
            dataManager.addNode({ id: "node2", __brand: "AdHocData" } as AdHocData);

            const edgeData = { src: "node1", dst: "node2" } as unknown as AdHocData;

            dataManager.addEdge(edgeData);
            dataManager.addEdge(edgeData);

            const between = dataManager.getEdgesBetween("node1", "node2");
            assert.equal(between.length, 2, "two records for one pair are two edges");
            assert.notStrictEqual(between[0], between[1]);
            assert.deepStrictEqual(
                between.map((edge) => edge.id),
                ["0", "1"],
                "each carries its own id",
            );
        });

        it("folds a repeat back into the edge already present when the caller asks for first", () => {
            dataManager.addNode({ id: "node1", __brand: "AdHocData" } as AdHocData);
            dataManager.addNode({ id: "node2", __brand: "AdHocData" } as AdHocData);

            const edgeData = { src: "node1", dst: "node2" } as unknown as AdHocData;

            dataManager.addEdge(edgeData, { repeated: "first" });
            const first = dataManager.getEdge("0");

            dataManager.addEdge(edgeData, { repeated: "first" });

            assert.equal(dataManager.edges.size, 1, "the repeat did not become an edge");
            assert.strictEqual(dataManager.getEdge("0"), first, "and the edge already there was untouched");
        });
    });

    describe("statistics", () => {
        it("should return correct node count", () => {
            assert.equal(dataManager.nodes.size, 0);

            dataManager.addNodes([{ id: "node1" }, { id: "node2" }, { id: "node3" }]);

            assert.equal(dataManager.nodes.size, 3);

            dataManager.removeNodeAndIncidentEdges("node2");
            assert.equal(dataManager.nodes.size, 2);
        });

        it("should return correct edge count", () => {
            dataManager.addNodes([{ id: "node1" }, { id: "node2" }, { id: "node3" }]);

            assert.equal(dataManager.edges.size, 0);

            dataManager.addEdges([
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node2", dst: "node3" },
            ]);

            assert.equal(dataManager.edges.size, 2);

            dataManager.removeEdge("0");
            assert.equal(dataManager.edges.size, 1);
        });
    });

    describe("layout engine integration", () => {
        it("should work with layout engine", async () => {
            // Set a layout
            await graph.setLayout("ngraph", {});

            // Add nodes and edges
            dataManager.addNodes([{ id: "node1" }, { id: "node2" }]);

            dataManager.addEdge({
                src: "node1",
                dst: "node2",
            });

            // Layout engine should have the nodes and edges
            const layoutManager = graph.getLayoutManager();
            assert.equal(Array.from(layoutManager.nodes).length, 2);
            assert.equal(Array.from(layoutManager.edges).length, 1);
        });
    });
    // The count the lazy-node stage of design/rendering/row-renderer.md drives toward zero under
    // "batched". Under "objects", the default, every node a load stores is built once, at the load.
    describe("nodes built", () => {
        it("counts one Node per stored node, and none for a read", () => {
            assert.equal(dataManagerInternals.nodesBuilt(dataManager), 0);

            dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
            assert.equal(dataManagerInternals.nodesBuilt(dataManager), 3);

            const first = dataManager.getNode("a");
            assert.strictEqual(dataManager.getNode("a"), first, "a read hands back the same object");
            assert.equal(dataManagerInternals.nodesBuilt(dataManager), 3);
        });

        it("counts a node removed and added again as a second build", () => {
            dataManager.addNodes([{ id: "a" }]);
            dataManager.removeNodeAndIncidentEdges("a");
            dataManager.addNodes([{ id: "a" }]);

            assert.equal(dataManagerInternals.nodesBuilt(dataManager), 2);
        });
    });

    // The count the lazy-edge stage of design/rendering/row-renderer.md drives toward zero under
    // "batched". Under "objects", the default, every edge a load stores is built once, when both ends are.
    describe("edges built", () => {
        it("counts one Edge per stored edge, a deferred one once its ends arrive, and none for a read", () => {
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);

            dataManager.addNodes([{ id: "a" }, { id: "b" }]);
            dataManager.addEdges([
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ]);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 1, "b -> c waits for c");

            dataManager.addNodes([{ id: "c" }]);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 2);

            assert.equal([...dataManager.edges.values()].length, 2);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 2);
        });

        it("counts an edge removed and added again as a second build", () => {
            dataManager.addNodes([{ id: "a" }, { id: "b" }]);
            dataManager.addEdge({ src: "a", dst: "b" });
            dataManager.removeNodeAndIncidentEdges("b");
            dataManager.addNodes([{ id: "b" }]);
            dataManager.addEdge({ src: "a", dst: "b" });

            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 2);
        });
    });

    // An edge reaches its ends through accessors (the lazy-node stage of design/rendering/row-renderer.md):
    // on the "batched" path each end's Node is looked up when first read, not when the edge is built. Under
    // "objects" both are resolved as the edge is built, as before.
    describe("edge ends", () => {
        it("builds an edge on the batched path reading each end's Node once, and hands out the graph's own", () => {
            graph.setRenderPath("batched");
            dataManager.addNodes([{ id: "a" }, { id: "b" }]);
            const reads = vi.spyOn(dataManager.nodeCache, "get");

            dataManager.addEdge({ src: "a", dst: "b" });
            assert.equal(dataManager.edges.size, 1);
            // Master read each end twice: once to check it exists and once more for the edge. Now the check
            // asks only whether the id is stored, and the line's pull check (an end drawn behind edges, a
            // group or a 2D node below z-index 0, keeps its line off the pull) reads an end stored with
            // no Node from its row, which is never behind edges before it is painted: no end is read.
            assert.equal(reads.mock.calls.length, 0, "no end's Node is read to build the edge");

            const [edge] = dataManager.edges.values();
            assert.strictEqual(edge.srcNode, dataManager.getNode("a"));
            assert.strictEqual(edge.dstNode, dataManager.getNode("b"));
        });

        it("still defers an edge until both ends are stored", () => {
            graph.setRenderPath("batched");
            dataManager.addNodes([{ id: "a" }]);
            dataManager.addEdge({ src: "a", dst: "b" });
            assert.equal(dataManager.edges.size, 0, "no edge until b is stored");

            dataManager.addNodes([{ id: "b" }]);
            assert.equal(dataManager.edges.size, 1);
            const [edge] = dataManager.edges.values();
            assert.strictEqual(edge.dstNode, dataManager.getNode("b"));
        });
    });

    // The lazy-edge stage of design/rendering/row-renderer.md: an edge can be stored with no `Edge`, and the
    // edge map answers for it, building its `Edge` only when it is read. Nothing turns this on yet, so the
    // test turns it on through `dataManagerInternals.storeEdgesUnbuilt`.
    describe("edges stored with no Edge", () => {
        beforeEach(() => {
            dataManagerInternals.storeEdgesUnbuilt(dataManager, true);
            dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
            dataManager.addEdges([
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ]);
        });

        it("counts and finds them with no Edge, and builds one Edge per edge read", () => {
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
            assert.equal(dataManager.edges.size, 2);
            assert.isTrue(dataManager.edges.has("0"));
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0, "has builds none");

            const edge = dataManager.getEdge("1");
            assert.strictEqual(dataManager.getEdge("1"), edge, "the same Edge is handed out again");
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 1);
            assert.equal(edge?.srcId, "b");
            assert.equal(edge?.dstId, "c");
            assert.strictEqual(dataManager.edgesByIndex[1], edge);

            assert.equal([...dataManager.edges.values()].length, 2);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 2, "a walk builds the rest");
        });

        it("drops one whose node is removed without building it", () => {
            dataManager.removeNodeAndIncidentEdges("a");

            assert.equal(dataManager.edges.size, 1);
            assert.isFalse(dataManager.edges.has("0"));
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
        });

        it("moves one to its new row on a freeze", () => {
            dataManager.removeEdge("0");
            assert.equal(dataManager.getSnapshot().edgeCount, 1);

            const edge = dataManager.getEdge("1");
            assert.equal(edge?.index, 0);
            assert.strictEqual(dataManager.edgesByIndex[0], edge);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 1);
        });

        it("forgets them when the data is cleared", () => {
            dataManager.clear();

            assert.equal(dataManager.edges.size, 0);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
        });

        // Undo and redo reconcile the drawn maps with the slice (a node going takes its edges back
        // to waiting), and the strict-state check after each pass compares the drawn edges with
        // the slice and the layout engine's hold. None of it may build an Edge.
        it("goes through undo and redo of a node's removal without building one", async () => {
            const session = graph.getSession();
            await session.data.removeNodes(["a"]);
            assert.equal(dataManager.edges.size, 1);

            await session.undo();
            assert.equal(dataManager.edges.size, 2);
            assert.isTrue(dataManager.edges.has("0"));

            await session.redo();
            assert.equal(dataManager.edges.size, 1);
            assert.isFalse(dataManager.edges.has("0"));

            await session.undo();
            assert.equal(dataManager.edges.size, 2);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
        });

        it("bundles a built edge with no other edge built for a lone pair", () => {
            const edge = dataManager.getEdge("0");
            assert.isDefined(edge);
            assert.equal(dataManager.drawnBundle(edge).count, 1);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 1);
        });

        it("builds the other edges of a built edge's pair, which it fans with", () => {
            dataManager.addEdges([{ src: "b", dst: "a" }]);
            const edge = dataManager.getEdge("0");
            assert.isDefined(edge);
            assert.equal(dataManager.drawnBundle(edge).count, 2);
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 2, "the pair's two, not the lone b-c edge");
        });

        // The element's own walks of the edges outside the data manager (a pick, a selection
        // restyle) visit the built Edges only.
        it("picks at a point without building one", () => {
            assert.isNull(graph.elementAt({ x: 0, y: 0 }));
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
        });

        it("restyles the selection without building one", async () => {
            graph.setSelectionStyle({ edgeScale: 3 });
            await dispatcherOf(graph.getSession()).lane.settled();
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
        });

        it("counts the rows without building one", () => {
            assert.deepInclude(graph.rowCounts, { pulledEdges: 2, objectEdges: 0 });
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
        });

        // The frame's own walks of the edges (the masks, the incident edges of a resized node,
        // the screen-scale retrim, the rows a freeze renumbered) visit the built Edges only.
        it("runs frames without building one", () => {
            const { updateManager } = graph as unknown as { updateManager: UpdateManager };
            updateManager.update();
            dataManager.removeEdge("0");
            dataManager.getSnapshot();
            updateManager.update();
            assert.equal(dataManagerInternals.edgesBuilt(dataManager), 0);
        });
    });
});
