/**
 * View Mode Transition Tests
 *
 * Tests verify switching between view modes correctly cleans up state.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { Graph } from "../../../src/Graph";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [
    { id: "node1", x: 0, y: 0, z: 0 },
    { id: "node2", x: 5, y: 0, z: 0 },
];
const TEST_EDGES = [{ src: "node1", dst: "node2" }];

describe("View Mode Transitions", () => {
    let graph: Graph;
    let container: HTMLDivElement;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);

        graph = new Graph(container);
        await graph.init();
        await configureGraph(graph, { viewMode: "3d", layout: "fixed", layoutOptions: { dim: 3 } });
        await graph.addNodes(TEST_NODES);
        await graph.addEdges(TEST_EDGES);
        await graph.waitForStableFrame();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        graph.dispose();
        document.body.removeChild(container);
    });

    test("2D -> 3D cleans up 2D input state", async () => {
        await graph.setViewMode("2d");
        await graph.waitForStableFrame();

        assert.equal(graph.getViewMode(), "2d", "Should be in 2D mode");

        await graph.setViewMode("3d");
        await graph.waitForStableFrame();

        assert.equal(graph.getViewMode(), "3d", "Should be in 3D mode");

        const activeController = graph.camera.getActiveController();
        assert.isDefined(activeController, "Active controller should be defined");
        assert.equal(graph.getNodes().length, 2, "All nodes should still exist");
    });

    test("3D -> 2D cleans up orbit state", async () => {
        assert.equal(graph.getViewMode(), "3d", "Should start in 3D mode");

        await graph.setViewMode("2d");
        await graph.waitForStableFrame();

        assert.equal(graph.getViewMode(), "2d", "Should be in 2D mode");

        const activeController = graph.camera.getActiveController();
        assert.isDefined(activeController, "Active controller should be defined");
        if (activeController) {
            assert.isDefined(activeController.camera.orthoTop, "2D camera should have orthoTop");
        }

        assert.equal(graph.getNodes().length, 2, "All nodes should still exist");
    });

    test("rapid mode switching does not corrupt state", async () => {
        assert.equal(graph.getViewMode(), "3d", "Should start in 3D mode");
        assert.equal(graph.getNodes().length, 2, "Should have 2 nodes initially");

        const modes: ("2d" | "3d")[] = ["2d", "3d", "2d", "3d", "2d", "3d"];
        for (const mode of modes) {
            await graph.setViewMode(mode);
            await new Promise((resolve) => setTimeout(resolve, 20));
        }

        await graph.waitForStableFrame();

        assert.isDefined(graph.scene, "Scene should still exist");
        const activeController = graph.camera.getActiveController();
        assert.isDefined(activeController, "Active controller should exist");
        if (activeController) {
            const cameraPos = activeController.camera.position;
            assert.isTrue(isFinite(cameraPos.x), "Camera X should be finite");
            assert.isTrue(isFinite(cameraPos.y), "Camera Y should be finite");
            assert.isTrue(isFinite(cameraPos.z), "Camera Z should be finite");
        }

        assert.equal(graph.getNodes().length, 2, "All nodes should still exist");
    });

    /**
     * Move node1 off the Z = 0 plane in 3D and wait for the frame that draws it.
     *
     * Through the session, not by writing the mesh: every frame that updates nodes redraws each
     * mesh from the layout's positions, so a Z written onto the mesh lasted only until the next
     * such frame -- which a slow runner reached inside a fixed sleep.
     * @returns node1.
     */
    async function liftNode1(): Promise<NonNullable<ReturnType<Graph["getNode"]>>> {
        const node1 = graph.getNode("node1");
        assert.isDefined(node1, "Node 1 should exist");
        assert.isNotNull(node1);

        await graph.getSession().positions.set([{ id: "node1", x: 0, y: 0, z: 5 }]);
        await graph.waitForStableFrame();
        return node1;
    }

    test("a node moved off the plane in 3D is drawn at its Z", async () => {
        assert.equal(graph.getViewMode(), "3d", "Should start in 3D mode");

        const node1 = await liftNode1();

        assert.closeTo(node1.mesh.position.z, 5, 0.01, "Node Z should be 5 before transition");
    });

    // EXPECTED TO FAIL until https://github.com/graphty-org/graphty-monorepo/issues/1341 is
    // fixed: under the fixed layout a node placed off the Z = 0 plane keeps its Z in 2D. Remove
    // `.fails` when this starts passing. The test above guards the 3D half on its own, because a
    // failure anywhere in this one counts as the expected failure.
    test.fails("3D -> 2D flattens Z coordinates", async () => {
        const node1 = await liftNode1();

        await graph.setViewMode("2d");
        await graph.waitForStableFrame();

        assert.closeTo(node1.mesh.position.z, 0, 0.01, "Node Z should be flattened to 0 in 2D mode");
    });

    test("camera type changes correctly with view mode", async () => {
        assert.equal(graph.getViewMode(), "3d", "Should be in 3D mode");
        let controller = graph.camera.getActiveController();
        assert.isDefined(controller, "Controller should exist in 3D mode");

        await graph.setViewMode("2d");
        await graph.waitForStableFrame();

        controller = graph.camera.getActiveController();
        if (controller) {
            assert.isDefined(controller.camera.orthoTop, "2D mode should use orthographic camera");
        }

        await graph.setViewMode("3d");
        await graph.waitForStableFrame();

        controller = graph.camera.getActiveController();
        assert.isDefined(controller, "Controller should exist after switching back to 3D");
    });
});
