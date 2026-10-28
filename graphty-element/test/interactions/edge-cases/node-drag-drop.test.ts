/**
 * Node Drag and Drop Edge Case Tests
 *
 * Tests verify complex node drag behavior and edge cases that are
 * easy to break during refactoring.
 */

import { Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph";
import { nextFrame, press, release } from "../../helpers/real-input";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [
    { id: "node1", x: 0, y: 0, z: 0 },
    { id: "node2", x: 5, y: 0, z: 0 },
];
const TEST_EDGES = [{ src: "node1", dst: "node2" }];

describe("Node Drag and Drop", () => {
    let graph: Graph;
    let container: HTMLDivElement;

    describe("3D Mode Edge Cases", () => {
        beforeEach(async () => {
            container = document.createElement("div");
            // Inside the test frame's 414-pixel-wide viewport, so the real pointer reaches the nodes.
            container.style.width = "400px";
            container.style.height = "300px";
            document.body.appendChild(container);

            graph = new Graph(container);
            await graph.init();
            await configureGraph(graph, { viewMode: "3d", layout: "fixed", layoutOptions: { dim: 3 } });
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForStableFrame();
        });

        afterEach(() => {
            vi.restoreAllMocks();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("node position can be updated", async () => {
            const node1 = graph.getNode("node1");
            assert.isDefined(node1, "Node 1 should exist");
            assert.isNotNull(node1);

            // Moved through the session, not by writing the mesh: the element redraws every mesh
            // from the layout on each frame it updates nodes, so a hand-written mesh position
            // lasted only until the next such frame -- which a slow runner reached inside a wait.
            const initialNodePos = node1.mesh.position.clone();
            const target = initialNodePos.add(new Vector3(2, 0, 0));
            await graph.getSession().positions.set([{ id: "node1", x: target.x, y: target.y, z: target.z }]);
            await operationQueueOf(graph).waitForCompletion();

            assert.closeTo(node1.mesh.position.x, target.x, 0.01, "Node should have moved");
        });

        test("edge count is maintained after node operations", async () => {
            assert.equal(graph.getEdgeCount(), 1, "Should have 1 edge");

            const node1 = graph.getNode("node1");
            if (!node1) {
                throw new Error("node1 should exist");
            }

            node1.mesh.position = new Vector3(10, 10, 10);

            await nextFrame();

            assert.equal(graph.getEdgeCount(), 1, "Should still have 1 edge");
        });

        test("camera state is accessible during node operations", () => {
            const cameraController = graph.camera.getActiveController();
            assert.isDefined(cameraController, "Camera controller should be defined");
            if (!cameraController) {
                return;
            }

            // Verify camera is accessible and has valid position
            assert.isDefined(cameraController.camera, "Camera should be accessible");
            const cameraPos = cameraController.camera.position;
            assert.isTrue(isFinite(cameraPos.x), "Camera X should be finite");
            assert.isTrue(isFinite(cameraPos.y), "Camera Y should be finite");
            assert.isTrue(isFinite(cameraPos.z), "Camera Z should be finite");
        });

        test("pointer events can be sent to scene", async () => {
            const at = graph.nodeScreenPosition("node1");
            assert.isDefined(at, "node1 should be on screen");

            // Press and release on node1 with the real mouse, and the element handles it
            await press(graph.canvas, at);
            await release(graph.canvas, at);
            await graph.waitForSettled();

            assert.isDefined(graph.scene, "Scene should still exist after events");
        });

        test("node beyond scene bounds handled gracefully", async () => {
            const node1 = graph.getNode("node1");
            assert.isDefined(node1, "Node 1 should exist");
            assert.isNotNull(node1);

            node1.mesh.position = new Vector3(10000, 10000, 10000);
            await nextFrame();

            assert.isDefined(graph.getNode("node1"), "Node should still exist");
            assert.isTrue(isFinite(node1.mesh.position.x), "X should be finite");
            assert.isTrue(isFinite(node1.mesh.position.y), "Y should be finite");
            assert.isTrue(isFinite(node1.mesh.position.z), "Z should be finite");
        });
    });

    describe("2D Mode Edge Cases", () => {
        beforeEach(async () => {
            container = document.createElement("div");
            // Inside the test frame's 414-pixel-wide viewport, so the real pointer reaches the nodes.
            container.style.width = "400px";
            container.style.height = "300px";
            document.body.appendChild(container);

            graph = new Graph(container);
            await graph.init();
            await configureGraph(graph, { viewMode: "2d", layout: "fixed", layoutOptions: { dim: 2 } });
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForStableFrame();
        });

        afterEach(() => {
            vi.restoreAllMocks();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("2D mode has orthographic camera", () => {
            const cameraController = graph.camera.getActiveController();
            assert.isDefined(cameraController, "Camera controller should be defined");
            if (!cameraController) {
                return;
            }

            // 2D mode uses orthographic camera
            assert.isDefined(cameraController.camera.orthoTop, "2D mode should have orthographic camera");
        });

        test("pointer events work in 2D mode", async () => {
            const at = graph.nodeScreenPosition("node1");
            assert.isDefined(at, "node1 should be on screen");

            // Press and release on node1 with the real mouse, and the element handles it
            await press(graph.canvas, at);
            await release(graph.canvas, at);
            await graph.waitForSettled();

            assert.isDefined(graph.scene, "Scene should still exist after events");
        });
    });
});
