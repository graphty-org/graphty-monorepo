/**
 * Input Sequence Tests
 *
 * Tests verify correct behavior for complex input sequences
 * and transitions between different input methods.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph";
import { drag, moveHeld, type Point, press, release } from "../../helpers/real-input";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [
    { id: "node1", x: 0, y: 0, z: 0 },
    { id: "node2", x: 5, y: 0, z: 0 },
];
const TEST_EDGES = [{ src: "node1", dst: "node2" }];

describe("Input Sequences", () => {
    let graph: Graph;
    let container: HTMLDivElement;

    beforeEach(async () => {
        container = document.createElement("div");
        // Inside the test frame's 414-pixel-wide viewport, so the real pointer reaches every point.
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        graph = new Graph(container);
        await graph.init();
        await configureGraph(graph, { viewMode: "3d", layout: "fixed", layoutOptions: { dim: 3 }, pinOnDrag: true });
        await graph.addNodes(TEST_NODES);
        await graph.addEdges(TEST_EDGES);
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    });

    /**
     * Where node1 is drawn, in CSS pixels on the canvas.
     * @returns Its centre.
     */
    function node1At(): Point {
        const at = graph.nodeScreenPosition("node1");
        assert.isDefined(at, "node1 should be on screen");
        return at;
    }

    afterEach(() => {
        vi.restoreAllMocks();
        graph.dispose();
        document.body.removeChild(container);
    });

    describe("Pointer Event Sequences", () => {
        test("down-move-up sequence maintains state", async () => {
            const { canvas } = graph;
            const at = node1At();
            const to = { x: at.x + 50, y: at.y + 50 };

            // Pointer down on node1, move, up
            await press(canvas, at);
            await moveHeld(canvas, to);
            await release(canvas, to);
            await graph.waitForSettled();

            // Node should still be valid
            assert.isDefined(graph.getNode("node1"), "Node should exist after sequence");
        });

        test("interrupted sequence cleans up state", async () => {
            const { canvas } = graph;
            const at = node1At();

            // Start drag on node1 and move without completing
            await press(canvas, at);
            await moveHeld(canvas, { x: at.x + 50, y: at.y + 50 });

            // Let go somewhere else entirely, at the canvas's corner
            await release(canvas, { x: 0, y: 0 });
            await graph.waitForSettled();

            // Graph should remain in valid state
            assert.isDefined(graph.scene, "Scene should exist");
            assert.isDefined(graph.getNode("node1"), "Node should exist");
        });

        test("multiple sequential drags work correctly", async () => {
            const { canvas } = graph;

            // Three press-and-release sequences on node1
            for (let i = 0; i < 3; i++) {
                const at = node1At();
                await press(canvas, at);
                await release(canvas, at);
                await graph.waitForSettled();
            }

            assert.isDefined(graph.getNode("node1"), "Node should exist after multiple sequences");
        });
    });

    describe("State Transitions", () => {
        test("view mode change interrupts drag cleanly", async () => {
            const at = node1At();

            // Start drag
            await press(graph.canvas, at);

            // Change view mode mid-drag
            await graph.setViewMode("2d");
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForSettled();

            // Graph should be in valid 2D state
            assert.equal(graph.getViewMode(), "2d", "Should be in 2D mode");
            assert.equal(graph.getNodes().length, 2, "Nodes should still exist");

            // Let go, so the held button does not carry into the next test
            await release(graph.canvas, at);
        });

        test("adding nodes during drag does not corrupt state", async () => {
            const at = node1At();

            // Start drag
            await press(graph.canvas, at);

            // Add new node mid-drag
            await graph.addNodes([{ id: "node3", x: 10, y: 10, z: 0 }]);
            await operationQueueOf(graph).waitForCompletion();

            // End drag
            await release(graph.canvas, at);
            await graph.waitForSettled();

            assert.equal(graph.getNodes().length, 3, "Should have 3 nodes");
            assert.isDefined(graph.getNode("node3"), "New node should exist");
        });

        test("graph state remains valid during interaction", async () => {
            const node1 = graph.getNode("node1");
            if (!node1) {
                return;
            }

            // Verify initial state
            assert.equal(graph.getNodes().length, 2, "Should have 2 nodes");

            // Manipulate node position
            node1.mesh.position.x = 100;
            await operationQueueOf(graph).waitForCompletion();

            assert.isDefined(graph.getNode("node1"), "Node1 should still exist");
            assert.isDefined(graph.getNode("node2"), "Node2 should still exist");
        });
    });

    describe("Camera Interaction Sequences", () => {
        test("camera position remains valid after interactions", async () => {
            // A drag across empty space (camera interaction)
            await drag(graph.canvas, { x: 20, y: 20 }, { x: 120, y: 120 });
            await graph.waitForSettled();

            const controller = graph.camera.getActiveController();
            if (controller) {
                const pos = controller.camera.position;
                assert.isTrue(isFinite(pos.x), "Camera X should be finite");
                assert.isTrue(isFinite(pos.y), "Camera Y should be finite");
                assert.isTrue(isFinite(pos.z), "Camera Z should be finite");
            }
        });
    });
});
