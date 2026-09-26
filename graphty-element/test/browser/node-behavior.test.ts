 
import { ActionManager, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import type { AdHocData } from "../../src/config/common";
import { Graph } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("Node Behavior Tests", () => {
    let graph: Graph;

    beforeEach(async () => {
        // Create test graph using the helper
        graph = await createTestGraph();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanupTestGraph(graph);
    });

    test("drag behavior with pinOnDrag enabled", () => {
        // Add a node using DataManager
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node", label: "Test Node" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node");
        assert.isDefined(node);

        // Check that default behaviors were applied
        assert.isDefined(node.dragHandler);
        assert.equal(node.pinOnDrag, true); // Default is true
        assert.equal(node.mesh.isPickable, true);

        // Mock the pin method
        const pinSpy = vi.spyOn(node, "pin").mockImplementation(() => undefined);

        // Simulate drag start
        node.dragHandler?.onDragStart(new Vector3(0, 0, 0));
        assert.equal(node.dragging, true);

        // Simulate drag end
        node.dragHandler?.onDragEnd();
        assert.equal(node.dragging, false);

        // Node should call pin() method when pinOnDrag is true
        assert.equal(pinSpy.mock.calls.length, 1);
    });

    test("drag behavior observables work correctly", () => {
        // Add a node using DataManager
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node-2", label: "Test Node 2" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node-2");
        assert.isDefined(node);
        assert.isDefined(node.dragHandler);

        const pinSpy = vi.spyOn(node, "pin").mockImplementation(() => undefined);
        graph.getLayoutManager().running = false;

        // Test drag start: a stopped (not paused) layout runs again so neighbours respond
        node.dragHandler?.onDragStart(new Vector3(0, 0, 0));
        assert.equal(node.dragging, true);
        assert.isTrue(graph.isRunning());

        // Test drag end
        node.dragHandler?.onDragEnd();
        assert.equal(node.dragging, false);

        // Node should call pin() method by default
        assert.equal(pinSpy.mock.calls.length, 1);
    });

    test("a drag while the consumer has paused the layout leaves it paused", () => {
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "held", label: "Held" } as unknown as AdHocData);
        const node = dataManager.getNode("held");
        assert.isDefined(node);
        vi.spyOn(node, "pin").mockImplementation(() => undefined);

        graph.setRunning(false);

        node.dragHandler?.onDragStart(new Vector3(0, 0, 0));
        assert.isFalse(graph.isRunning(), "picking a node up does not resume the layout");
        node.dragHandler?.onDragEnd();
        assert.isFalse(graph.isRunning(), "and neither does dropping it");

        graph.setRunning(true);
        assert.isTrue(graph.isRunning());
    });

    test("position changed during drag updates layout engine", () => {
        // Add a node using DataManager
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node-3", label: "Test Node 3" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node-3");
        assert.isDefined(node);

        // Mock layout manager
        const layoutManager = graph.getLayoutManager();
        vi.spyOn(layoutManager, "layoutEngine", "get").mockReturnValue({
            setNodePosition: vi.fn(),
        } as any);
        const mockLayoutEngine = layoutManager.layoutEngine;
        const spyTarget = mockLayoutEngine as unknown as { setNodePosition: (node: unknown, position: unknown) => void };
        const mockSetNodePosition = vi.spyOn(spyTarget, "setNodePosition");

        // Start dragging
        node.dragHandler?.onDragStart(new Vector3(0, 0, 0));

        // Simulate position change while dragging
        const newPosition = new Vector3(10, 20, 30);
        node.dragHandler?.onDragUpdate(newPosition);

        // Should update layout engine position
        assert.equal(mockSetNodePosition.mock.calls.length, 1);
        assert.equal(mockSetNodePosition.mock.calls[0][0], node);
        // Check that the position was updated (exact values depend on delta calculations)
        assert.isDefined(mockSetNodePosition.mock.calls[0][1]);
    });

    test("position changed when not dragging does not update layout engine", () => {
        // Add a node using DataManager
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node-4", label: "Test Node 4" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node-4");
        assert.isDefined(node);

        // Mock layout manager
        const layoutManager = graph.getLayoutManager();
        vi.spyOn(layoutManager, "layoutEngine", "get").mockReturnValue({
            setNodePosition: vi.fn(),
        } as any);
        const mockLayoutEngine = layoutManager.layoutEngine;
        const spyTarget = mockLayoutEngine as unknown as { setNodePosition: (node: unknown, position: unknown) => void };
        const mockSetNodePosition = vi.spyOn(spyTarget, "setNodePosition");

        // Simulate position change without dragging (node.dragging should be false)
        const newPosition = new Vector3(10, 20, 30);
        node.dragHandler?.onDragUpdate(newPosition);

        // Should NOT update layout engine position (because dragging is false)
        assert.equal(mockSetNodePosition.mock.calls.length, 0);
    });

    test("double-click expansion triggers fetch when fetchNodes/fetchEdges exist", () => {
        const fetchNodes = vi.fn().mockReturnValue([
            { id: "node2", data: {} },
            { id: "node3", data: {} },
        ]);
        const fetchEdges = vi.fn().mockReturnValue(
            new Set([
                { src: "test-node-5", dst: "node2" },
                { src: "test-node-5", dst: "node3" },
            ]),
        );

        // Add fetch functions to graph
        (graph as { fetchNodes?: typeof fetchNodes; fetchEdges?: typeof fetchEdges }).fetchNodes = fetchNodes;
        (graph as { fetchNodes?: typeof fetchNodes; fetchEdges?: typeof fetchEdges }).fetchEdges = fetchEdges;

        // Add a node using DataManager
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node-5", label: "Test Node 5" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node-5");
        assert.isDefined(node);

        // Mock dataManager methods
        const addNodesSpy = vi.spyOn(dataManager, "addNodes").mockImplementation(() => undefined);
        const addEdgesSpy = vi.spyOn(dataManager, "addEdges").mockImplementation(() => undefined);

        assert.isDefined(node.mesh.actionManager);

        // Find the double-click action
        const { actions } = node.mesh.actionManager ?? { actions: [] };
        const doubleClickAction = actions.find((action) => action.trigger === ActionManager.OnDoublePickTrigger);

        assert.isDefined(doubleClickAction);

        // Trigger the double-click action
        // ExecuteCodeAction stores the function in the execute property
        if ("execute" in doubleClickAction) {
            (doubleClickAction as { execute?: () => void }).execute?.();
        } else {
            // Try accessing the function property directly
            (doubleClickAction as { _executionCallback?: () => void })._executionCallback?.();
        }

        // Verify fetch functions were called
        assert.equal(fetchEdges.mock.calls.length, 1);
        assert.equal(fetchEdges.mock.calls[0][0], node);
        assert.equal(fetchEdges.mock.calls[0][1], graph);

        // Verify nodes were fetched (excluding the current node)
        assert.equal(fetchNodes.mock.calls.length, 1);
        const nodeIds = fetchNodes.mock.calls[0][0];
        assert.equal(nodeIds.size, 2);
        assert.isTrue(nodeIds.has("node2"));
        assert.isTrue(nodeIds.has("node3"));
        assert.isFalse(nodeIds.has("test-node-5")); // Should exclude current node

        // Verify data manager methods were called
        assert.equal(addNodesSpy.mock.calls.length, 1);
        assert.equal(addEdgesSpy.mock.calls.length, 1);
    });

    test("double-click expansion reads the endpoints a canonical fetchEdges returns", () => {
        // The handler used to read `e.src` and `e.dst` off whatever `fetchEdges` returned, so a
        // consumer following the guides -- which teach `source`/`target` everywhere -- collected a
        // set of `undefined` neighbours, fetched nothing, and left the edges pending for ever.
        const fetchNodes = vi.fn().mockReturnValue([
            { id: "node2", data: {} },
            { id: "node3", data: {} },
        ]);
        const fetchEdges = vi.fn().mockReturnValue(
            new Set([
                { source: "test-node-7", target: "node2" },
                { source: "test-node-7", target: "node3" },
            ]),
        );

        graph.fetchNodes = fetchNodes;
        graph.fetchEdges = fetchEdges;

        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node-7", label: "Test Node 7" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node-7");
        assert.isDefined(node);

        const addNodesSpy = vi.spyOn(dataManager, "addNodes").mockImplementation(() => undefined);
        const addEdgesSpy = vi.spyOn(dataManager, "addEdges").mockImplementation(() => undefined);

        const { actions } = node.mesh.actionManager ?? { actions: [] };
        const doubleClickAction = actions.find((action) => action.trigger === ActionManager.OnDoublePickTrigger);

        assert.isDefined(doubleClickAction);
        if ("execute" in doubleClickAction) {
            // IAction.execute is declared with a required ActionEvent parameter, but the registered
            // double-click action ignores it, so the call is made through its callable shape.
            (doubleClickAction as unknown as { execute?: () => void }).execute?.();
        } else {
            (doubleClickAction as unknown as { _executionCallback?: () => void })._executionCallback?.();
        }

        const nodeIds = fetchNodes.mock.calls[0][0];
        assert.deepStrictEqual([...nodeIds].sort(), ["node2", "node3"], "the handler found the neighbours to fetch");
        assert.equal(addNodesSpy.mock.calls.length, 1);
        assert.equal(addEdgesSpy.mock.calls.length, 1);

        // The spelling the handler resolved is passed on, so `addEdges` reads the same columns
        // rather than probing the batch a second time and possibly answering differently.
        assert.deepStrictEqual(addEdgesSpy.mock.calls[0][1], {
            repeated: "first",
            source: "source",
            target: "target",
        });
    });

    test("double-click expansion does nothing when fetchNodes/fetchEdges don't exist", () => {
        // Add a node using DataManager (no fetch functions on graph)
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node-6", label: "Test Node 6" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node-6");
        assert.isDefined(node);

        // The handler is registered on every node and reads the fetchers when the reader
        // double-clicks, so that expansion switched on AFTER a graph is drawn reaches the nodes
        // already on screen. "Does nothing" is therefore about what the double-click DOES, which
        // is what this test was always for: with no fetchers, no records reach the graph.
        const addNodesSpy = vi.spyOn(dataManager, "addNodes");
        const addEdgesSpy = vi.spyOn(dataManager, "addEdges");

        const actions = node.mesh.actionManager?.actions ?? [];
        const doubleClickAction = actions.find((action) => action.trigger === ActionManager.OnDoublePickTrigger);

        assert.isDefined(doubleClickAction);
        assert.doesNotThrow(() => {
            (doubleClickAction as unknown as { execute?: () => void }).execute?.();
        });

        assert.equal(addNodesSpy.mock.calls.length, 0);
        assert.equal(addEdgesSpy.mock.calls.length, 0);
    });

    test("mesh is made pickable", () => {
        // Add a node using DataManager
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node-7", label: "Test Node 7" } as unknown as AdHocData);

        const node = dataManager.getNode("test-node-7");
        assert.isDefined(node);

        // NodeBehavior should have made the mesh pickable
        assert.equal(node.mesh.isPickable, true);
    });
});
