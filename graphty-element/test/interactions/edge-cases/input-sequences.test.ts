/**
 * Input Sequence Tests
 *
 * Tests verify correct behavior for complex input sequences
 * and transitions between different input methods, sent as real mouse input
 * (test/helpers/real-input.ts).
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
    /** Where the button is held down, until a test or `afterEach` releases it. */
    let held: Point | null = null;

    /**
     * Where node1 is drawn on the canvas.
     * @returns Its centre, in CSS pixels from the canvas's top-left corner.
     */
    function node1At(): Point {
        const at = graph.nodeScreenPosition("node1");
        assert.isTrue(at?.visible, "node1 should be on screen");
        if (!at) {
            throw new Error("node1 is not on screen");
        }

        return at;
    }

    /**
     * Press the button at a point and hold it.
     * @param at - Where.
     */
    async function down(at: Point): Promise<void> {
        await press(graph.canvas, at);
        held = at;
    }

    /**
     * Release the held button at a point.
     * @param at - Where.
     */
    async function up(at: Point): Promise<void> {
        await release(graph.canvas, at);
        held = null;
    }

    beforeEach(async () => {
        container = document.createElement("div");
        // Inside the test frame's 414-pixel-wide viewport, so the real pointer reaches every node
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

    afterEach(async () => {
        // A test that stopped mid-drag leaves the button down; let it go before the next one
        if (held) {
            await release(graph.canvas, held);
            held = null;
        }

        vi.restoreAllMocks();
        graph.dispose();
        document.body.removeChild(container);
    });

    describe("Pointer Event Sequences", () => {
        test("down-move-up sequence maintains state", async () => {
            const at = node1At();

            // Press on the node, move with the button held, release
            await down(at);
            await moveHeld(graph.canvas, { x: at.x + 50, y: at.y + 50 });
            await up({ x: at.x + 50, y: at.y + 50 });

            // Node should still be valid
            assert.isDefined(graph.getNode("node1"), "Node should exist after sequence");
        });

        test("interrupted sequence cleans up state", async () => {
            const at = node1At();

            // Start drag
            await down(at);

            // Move without completing
            await moveHeld(graph.canvas, { x: at.x + 50, y: at.y + 50 });

            // Let go far from where the drag went, at the canvas's corner
            await up({ x: 0, y: 0 });

            // Graph should remain in valid state
            assert.isDefined(graph.scene, "Scene should exist");
            assert.isDefined(graph.getNode("node1"), "Node should exist");
        });

        test("multiple sequential drags work correctly", async () => {
            const at = node1At();

            // Three press-and-release sequences on the node
            for (let i = 0; i < 3; i++) {
                await down(at);
                await up(at);
            }

            assert.isDefined(graph.getNode("node1"), "Node should exist after multiple sequences");
        });
    });

    describe("State Transitions", () => {
        test("view mode change interrupts drag cleanly", async () => {
            // Start drag; afterEach lets the button go
            await down(node1At());

            // Change view mode mid-drag
            await graph.setViewMode("2d");
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForSettled();

            // Graph should be in valid 2D state
            assert.equal(graph.getViewMode(), "2d", "Should be in 2D mode");
            assert.equal(graph.getNodes().length, 2, "Nodes should still exist");
        });

        test("adding nodes during drag does not corrupt state", async () => {
            const at = node1At();

            // Start drag
            await down(at);

            // Add new node mid-drag
            await graph.addNodes([{ id: "node3", x: 10, y: 10, z: 0 }]);
            await operationQueueOf(graph).waitForCompletion();

            // End drag
            await up(at);

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
            // A drag on empty space, away from both nodes (camera interaction)
            await drag(graph.canvas, { x: 20, y: 20 }, { x: 120, y: 120 });

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
