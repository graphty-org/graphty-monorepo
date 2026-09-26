import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import { UpdateManager } from "../../src/managers/UpdateManager";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("UpdateManager", () => {
    let graph: Graph;
    let updateManager: UpdateManager;
    let releaseFrames: () => void;

    beforeEach(async () => {
        graph = await createTestGraph();

        const graphAny = graph as unknown as Record<string, unknown>;

        // Every test below pumps frames by hand (`update`, `stepFrames`) and reads what a pass left
        // behind, so the live render loop `init` started must not run passes of its own in between.
        // Left running, it frames the graph the first time an animation frame lands between the
        // awaits below -- `addNodes` arms a zoom-to-fit, a fixed layout has nothing to wait for --
        // and whether one lands depends on how long the setup takes: about 20 ms on a quiet machine,
        // 295 ms on a loaded CI shard, where "zoom to fit has not completed yet" was already false
        // before the test began. Held frames are skipped whole, so nothing below observes a pass it
        // did not run itself.
        releaseFrames = (graphAny.renderManager as RenderManager).holdFrames();

        // Add test data with explicit positions for fixed layout
        // Positions need to create a bounding box larger than minBoundingBoxSize (0.1)
        await graph.addNodes([
            { id: "1", position: { x: -5, y: 0, z: 0 } },
            { id: "2", position: { x: 5, y: 0, z: 0 } },
            { id: "3", position: { x: 0, y: 5, z: 0 } },
        ]);
        await graph.addEdges([
            { src: "1", dst: "2" },
            { src: "2", dst: "3" },
        ]);

        // Set fixed layout
        await graph.setLayout("fixed");

        updateManager = graphAny.updateManager as UpdateManager;
    });

    afterEach(() => {
        releaseFrames();
        cleanupTestGraph(graph);
    });

    describe("initialization", () => {
        it("should initialize without errors", async () => {
            await updateManager.init();
            assert.isNotNull(updateManager);
        });

        it("should dispose without errors", () => {
            updateManager.dispose();
            assert.isNotNull(updateManager);
        });
    });

    describe("update loop", () => {
        it("should increment frame count on update", () => {
            const initialFrameCount = updateManager.getRenderFrameCount();
            updateManager.update();
            assert.equal(updateManager.getRenderFrameCount(), initialFrameCount + 1);
        });

        it("should call update multiple times via stepFrames", () => {
            const initialFrameCount = updateManager.getRenderFrameCount();
            updateManager.stepFrames(5);
            assert.equal(updateManager.getRenderFrameCount(), initialFrameCount + 5);
        });
    });

    describe("edge rendering regression test", () => {
        it("should update edges even when layout is not running", () => {
            // This is a regression test for the bug where edges weren't rendered
            // when layout wasn't running (e.g., fixed layout, settled layout)

            const layoutManager = graph.getLayoutManager();

            // Spy on edge update method
            const edgeSpy = vi.fn();
            for (const edge of layoutManager.edges) {
                vi.spyOn(edge, "update").mockImplementation(edgeSpy);
            }

            // Ensure layout is not running (simulates fixed layout or settled state)
            layoutManager.running = false;

            // Call update - this should STILL update edges
            updateManager.update();

            // Verify edges were updated even though layout wasn't running
            assert.isTrue(edgeSpy.mock.calls.length > 0, "Edges should be updated even when layout is not running");
        });

        it("should update nodes even when layout is not running", () => {
            const layoutManager = graph.getLayoutManager();

            // Spy on node update method
            const nodeSpy = vi.fn();
            for (const node of layoutManager.nodes) {
                vi.spyOn(node, "update").mockImplementation(nodeSpy);
            }

            // Ensure layout is not running
            layoutManager.running = false;

            // Call update
            updateManager.update();

            // Verify nodes were updated
            assert.isTrue(nodeSpy.mock.calls.length > 0, "Nodes should be updated even when layout is not running");
        });

        it("should always update camera regardless of layout state", () => {
            const { camera } = graph;
            const cameraSpy = vi.spyOn(camera, "update");

            const layoutManager = graph.getLayoutManager();
            layoutManager.running = false;

            updateManager.update();

            assert.isTrue(cameraSpy.mock.calls.length > 0, "Camera should always be updated");
        });
    });

    describe("zoom to fit", () => {
        it("should enable zoom to fit", () => {
            updateManager.enableZoomToFit();

            // Armed, and not yet answered: the request is honoured by the next pass, not by the
            // call itself, and no pass has run (the render loop is held; see beforeEach).
            assert.isTrue(updateManager.isZoomToFitEnabled());
            assert.isFalse(updateManager.zoomToFitCompleted);
        });

        it("should complete zoom to fit after sufficient frames", () => {
            // Nodes already have positions from beforeEach that create a large bounding box
            // For fixed layouts, we need to mark the layout as not running to trigger immediate zoom
            // (The zoom logic requires either !running or accumulated layout steps)
            const layoutManager = graph.getLayoutManager();
            layoutManager.running = false;

            updateManager.enableZoomToFit();

            // Render enough frames for zoom to complete
            updateManager.stepFrames(5);

            // Should have zoomed by now
            assert.isTrue(updateManager.zoomToFitCompleted);
        });
    });

    describe("configuration", () => {
        it("should update configuration", () => {
            updateManager.updateConfig({
                layoutStepMultiplier: 5,
                autoZoomToFit: false,
            });

            // Configuration is private, but we can verify it doesn't throw
            assert.isNotNull(updateManager);
        });
    });

    describe("layout step regression test", () => {
        it("should call layoutManager.step() when layout is running", () => {
            // This is a regression test for a bug where updateLayout() was accidentally
            // removed from the update() method, causing the force-directed layout
            // algorithm to never run (step count stayed at 0, nodes overlapped).

            const layoutManager = graph.getLayoutManager();

            // Spy on layoutManager.step
            const stepSpy = vi.spyOn(layoutManager, "step");

            // Ensure layout is running (simulates active force-directed layout)
            layoutManager.running = true;

            // Call update - this MUST call layoutManager.step()
            updateManager.update();

            // Verify layoutManager.step() was called
            assert.isTrue(
                stepSpy.mock.calls.length > 0,
                "layoutManager.step() must be called when layout is running - " +
                    "without this, force-directed layouts never animate and nodes overlap",
            );
        });

        it("should NOT call layoutManager.step() when layout is not running", () => {
            const layoutManager = graph.getLayoutManager();

            // Spy on layoutManager.step
            const stepSpy = vi.spyOn(layoutManager, "step");

            // Ensure layout is NOT running
            layoutManager.running = false;

            // Call update
            updateManager.update();

            // Verify layoutManager.step() was NOT called
            assert.equal(
                stepSpy.mock.calls.length,
                0,
                "layoutManager.step() should not be called when layout is not running",
            );
        });
    });
});
