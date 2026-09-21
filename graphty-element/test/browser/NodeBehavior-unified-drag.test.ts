import { Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test } from "vitest";

import type { AdHocData } from "../../src/config/common";
import { Graph } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("Unified Drag Handler", () => {
    let graph: Graph;
    let node: Node;

    beforeEach(async () => {
        // Create test graph using the helper (properly sets up styles)
        graph = await createTestGraph();

        // Create test node using DataManager
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "test-node", label: "Test Node" } as unknown as AdHocData);
        const retrievedNode = dataManager.getNode("test-node");
        assert.exists(retrievedNode, "Node should be created");
        node = retrievedNode;
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    test("should handle desktop pointer down → move → up sequence", () => {
        // Verify drag handler exists
        assert.exists(node.dragHandler, "Node should have dragHandler");

        const startPosition = node.mesh.position.clone();

        // Simulate drag start
        node.dragHandler.onDragStart(startPosition);

        // Verify drag started
        assert.isTrue(node.dragging, "node.dragging should be true after drag start");

        // Simulate drag move
        const newPosition = startPosition.add(new Vector3(1, 1, 0));
        node.dragHandler.onDragUpdate(newPosition);

        // Verify position updated (allowing for some tolerance)
        const currentPosition = node.mesh.position;
        assert.notDeepEqual(currentPosition, startPosition, "Mesh position should have changed");

        // Simulate drag end
        node.dragHandler.onDragEnd();

        // Verify drag ended
        assert.isFalse(node.dragging, "node.dragging should be false after drag end");
    });

    test("should set node.dragging flag during drag", () => {
        assert.isFalse(node.dragging, "node.dragging should start as false");
        assert.exists(node.dragHandler, "dragHandler should exist");

        // Start drag
        node.dragHandler.onDragStart(node.mesh.position);

        assert.isTrue(node.dragging, "node.dragging should be true during drag");

        // End drag
        node.dragHandler.onDragEnd();

        assert.isFalse(node.dragging, "node.dragging should be false after drag");
    });

    test("should update layout engine during drag", () => {
        const { layoutEngine } = graph.getLayoutManager();
        assert.exists(layoutEngine, "Layout engine should exist");
        assert.exists(node.dragHandler, "dragHandler should exist");

        let setPositionCalled = false;
        let lastSetPosition: { x: number; y: number; z: number } | null = null;

        // Mock setNodePosition
        const originalSetNodePosition = layoutEngine.setNodePosition.bind(layoutEngine);
        layoutEngine.setNodePosition = (n: Node, pos: { x: number; y: number; z: number }) => {
            setPositionCalled = true;
            lastSetPosition = pos;
            originalSetNodePosition(n, pos);
        };

        // Start drag
        node.dragHandler.onDragStart(node.mesh.position);

        // Move
        const newPosition = node.mesh.position.add(new Vector3(2, 2, 0));
        node.dragHandler.onDragUpdate(newPosition);

        assert.isTrue(setPositionCalled, "setNodePosition should be called during drag");
        assert.exists(lastSetPosition, "Position should be set");

        // End drag
        node.dragHandler.onDragEnd();
    });

    test("should pin node after drag when configured", () => {
        assert.exists(node.dragHandler, "dragHandler should exist");
        // Set pinOnDrag = true (should be default)
        node.pinOnDrag = true;

        let pinCalled = false;
        const originalPin = node.pin.bind(node);
        node.pin = () => {
            pinCalled = true;
            originalPin();
        };

        // Use dragHandler directly (as in node-behavior.test.ts)
        node.dragHandler.onDragStart(new Vector3(0, 0, 0));
        node.dragHandler.onDragEnd();

        assert.isTrue(pinCalled, "node.pin() should be called when pinOnDrag is true");
    });

    test("reports on the drag-end event whether the drop left the node pinned", () => {
        // A pin now survives a layout change, so whether a drop pinned the node is a fact a
        // consumer has to be able to act on -- the application's inspector shows a Pinned badge
        // and offers a Pin verb off exactly this.
        //
        // ASSERTED AT THE EMIT, not at a listener, because what belongs to the drag handler is
        // putting the right value on the event. That a consumer can then receive it -- through
        // `addListener("node-drag-end")` and through the `graphty-node-drag-end` DOM event -- is
        // the event plumbing's job and is pinned separately, in
        // `test/browser/node-events-reach-consumers.test.ts`.
        assert.exists(node.dragHandler, "dragHandler should exist");
        const eventManager = graph.getEventManager();
        const emitted: { type: string; pinned?: boolean }[] = [];
        const original = eventManager.emitNodeEvent.bind(eventManager);
        eventManager.emitNodeEvent = (type, data) => {
            emitted.push({ type, ...(data as { pinned?: boolean }) });
            original(type, data);
        };

        node.pinOnDrag = true;
        node.dragHandler.onDragStart(new Vector3(0, 0, 0));
        node.dragHandler.onDragEnd();

        const started = emitted.find((e) => e.type === "node-drag-start");
        const ended = emitted.find((e) => e.type === "node-drag-end");
        assert.exists(started, "the drag start was announced");
        assert.exists(ended, "the drag end was announced");
        assert.isFalse(started.pinned, "the node was free when the reader picked it up");
        assert.isTrue(ended.pinned, "and pinOnDrag left it pinned where they put it");
        assert.isTrue(node.isPinned(), "which is also what the node itself says");
    });

    test("reports the node unpinned on drag-end when pinOnDrag is off", () => {
        assert.exists(node.dragHandler, "dragHandler should exist");
        const eventManager = graph.getEventManager();
        const emitted: { type: string; pinned?: boolean }[] = [];
        const original = eventManager.emitNodeEvent.bind(eventManager);
        eventManager.emitNodeEvent = (type, data) => {
            emitted.push({ type, ...(data as { pinned?: boolean }) });
            original(type, data);
        };

        node.pinOnDrag = false;
        node.dragHandler.onDragStart(new Vector3(0, 0, 0));
        node.dragHandler.onDragEnd();

        const ended = emitted.find((e) => e.type === "node-drag-end");
        assert.exists(ended, "the drag end was announced");
        assert.isFalse(ended.pinned, "a drop with pinOnDrag off leaves the node free to be arranged");
        assert.isFalse(node.isPinned());
    });

    test("should NOT pin node when pinOnDrag is false", () => {
        assert.exists(node.dragHandler, "dragHandler should exist");
        // Set pinOnDrag = false
        node.pinOnDrag = false;

        let pinCalled = false;
        const originalPin = node.pin.bind(node);
        node.pin = () => {
            pinCalled = true;
            originalPin();
        };

        // Use dragHandler directly (as in node-behavior.test.ts)
        node.dragHandler.onDragStart(new Vector3(0, 0, 0));
        node.dragHandler.onDragEnd();

        assert.isFalse(pinCalled, "node.pin() should NOT be called when pinOnDrag is false");
    });

    test("should maintain consistent depth during horizontal drag", () => {
        assert.exists(node.dragHandler, "dragHandler should exist");
        const startPosition = node.mesh.position.clone();
        const startZ = startPosition.z;

        // Start drag
        node.dragHandler.onDragStart(startPosition);

        // Simulate horizontal movement (X-axis only)
        const horizontalMove = new Vector3(startPosition.x + 5, startPosition.y, startPosition.z);
        node.dragHandler.onDragUpdate(horizontalMove);

        // Verify Z-coordinate remains stable (within tolerance)
        const currentZ = node.mesh.position.z;
        const zDifference = Math.abs(currentZ - startZ);
        assert.isBelow(
            zDifference,
            0.1,
            `Z-coordinate should remain stable during horizontal drag (difference: ${zDifference})`,
        );

        node.dragHandler.onDragEnd();
    });

    test("should maintain consistent depth during vertical drag", () => {
        assert.exists(node.dragHandler, "dragHandler should exist");
        const startPosition = node.mesh.position.clone();
        const startZ = startPosition.z;

        // Start drag
        node.dragHandler.onDragStart(startPosition);

        // Simulate vertical movement (Y-axis only)
        const verticalMove = new Vector3(startPosition.x, startPosition.y + 5, startPosition.z);
        node.dragHandler.onDragUpdate(verticalMove);

        // Verify Z-coordinate remains stable (within tolerance)
        const currentZ = node.mesh.position.z;
        const zDifference = Math.abs(currentZ - startZ);
        assert.isBelow(
            zDifference,
            0.1,
            `Z-coordinate should remain stable during vertical drag (difference: ${zDifference})`,
        );

        node.dragHandler.onDragEnd();
    });

    test("should dispose cleanly", () => {
        assert.exists(node.dragHandler, "Drag handler should exist before disposal");

        // Dispose drag handler
        node.dragHandler.dispose();

        // Verify no errors occur when disposing a second time
        assert.doesNotThrow(() => {
            if (node.dragHandler) {
                node.dragHandler.dispose();
            }
        }, "Disposing should not throw errors");
    });
});
