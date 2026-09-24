import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { AdHocData } from "../../src/config";
import type { Graph } from "../../src/Graph";
import type { DataManager } from "../../src/managers/DataManager";
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
            dataManager.addNodes([{ id: "node1" }, { id: "node2" }, { id: "node3" }] as unknown as AdHocData[]);

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
            } as unknown as AdHocData);

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
            ] as unknown as AdHocData[]);

            const removed = dataManager.removeNodeAndIncidentEdges("node1");

            assert.deepStrictEqual([...(removed ?? [])].sort(), ["0", "1"], "both edges at node1 are named");
            assert.isUndefined(dataManager.getEdge("0"), "node1 -> node2 went with node1");
            assert.isUndefined(dataManager.getEdge("1"), "node1 -> node3 went with node1");
            assert.isDefined(dataManager.getEdge("2"), "node2 -> node3 touches neither end and stays");
            assert.equal(dataManager.edges.size, 1);
            assert.equal(dataManager.edgeCache.size, 1, "and the pair cache agrees");
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

            dataManager.addNodes([{ id: "node1" }, { id: "node2" }, { id: "node3" }] as unknown as AdHocData[]);

            assert.equal(dataManager.nodes.size, 3);

            dataManager.removeNodeAndIncidentEdges("node2");
            assert.equal(dataManager.nodes.size, 2);
        });

        it("should return correct edge count", () => {
            dataManager.addNodes([{ id: "node1" }, { id: "node2" }, { id: "node3" }] as unknown as AdHocData[]);

            assert.equal(dataManager.edges.size, 0);

            dataManager.addEdges([
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node2", dst: "node3" },
            ] as unknown as AdHocData[]);

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
            dataManager.addNodes([{ id: "node1" }, { id: "node2" }] as unknown as AdHocData[]);

            dataManager.addEdge({
                src: "node1",
                dst: "node2",
            } as unknown as AdHocData);

            // Layout engine should have the nodes and edges
            const layoutManager = graph.getLayoutManager();
            assert.equal(Array.from(layoutManager.nodes).length, 2);
            assert.equal(Array.from(layoutManager.edges).length, 1);
        });
    });
});
