import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import { nodeFramingBox, styleBudgetFor, UpdateManager } from "../../src/managers/UpdateManager";
import { dispatcherOf } from "../../src/session/GraphSession";
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

        // A graph loaded with an algorithm that sizes its nodes asks for its final framing on the
        // pass after the layout settles, while the run's size layer can still be painting. Answered
        // then, the camera framed every node at its unstyled size and nothing re-framed when the
        // sizes landed -- so a slow machine drew a tighter picture than a fast one.
        it("waits for a style pass that is on its way before answering a framing request", () => {
            graph.getLayoutManager().running = false;
            updateManager.stepFrames(5);

            let framings = 0;
            graph.eventManager.addListener("zoom-to-fit-complete", () => {
                framings++;
            });

            // A pass asked for and not yet announced. Stubbed, because a pass over three nodes
            // finishes inside one slice and never spans a frame the way a slow machine makes it.
            const painting = vi.spyOn(graph.getStylePainter(), "isPainting", "get").mockReturnValue(true);

            updateManager.enableZoomToFit();
            updateManager.stepFrames(3);

            assert.strictEqual(framings, 0, "the camera was framed while a style pass was still painting");
            assert.isFalse(updateManager.frameIsStable);
            assert.include(updateManager.whyFrameIsNotStable(), "painting");

            painting.mockReturnValue(false);
            updateManager.update();

            assert.strictEqual(framings, 1, "the request is answered on the first pass after the paint arrives");
        });

        // A repaint that has ARRIVED is applied in batches within a frame budget, so on a slow
        // frame some nodes keep their old size for a frame or more. A framing answered in between
        // measured those nodes at the old size, and nothing re-framed when theirs landed: the
        // Pajek 1crn fidelity story was framed one CSS pixel apart from one load to the next,
        // depending on how many nodes the first frame painted (issue #3479).
        it("waits for arrived paint that is still being applied before answering a framing request", async () => {
            graph.getLayoutManager().running = false;
            // Past the first paint batch (128 nodes), so the right-most node is painted on a later frame.
            await graph.addNodes(
                Array.from({ length: 200 }, (_, i) => ({ id: `far${String(i)}`, position: { x: 10 + i, y: 0, z: 0 } })),
            );
            updateManager.stepFrames(5);

            await graph.getSession().styles.add({
                name: "Bigger",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 3 },
            });
            await graph.getSession().styles.settled();
            const painter = graph.getStylePainter();
            assert.isTrue(painter.hasPendingNodes, "the repaint has arrived and is not drawn yet");

            let lastMaxX = Number.NaN;
            graph.eventManager.addListener("zoom-to-fit-complete", (event) => {
                lastMaxX = (event as unknown as { boundingBoxMax: { x: number } }).boundingBoxMax.x;
            });

            // Every look at the clock finds the frame's budget spent, so each frame paints one batch.
            let clock = 0;
            const now = vi.spyOn(performance, "now").mockImplementation(() => (clock += 1000));
            try {
                updateManager.enableZoomToFit();
                for (let i = 0; i < 10 && (painter.hasPending || !updateManager.zoomToFitCompleted); i++) {
                    updateManager.update(16);
                }
            } finally {
                now.mockRestore();
            }
            updateManager.stepFrames(3);

            assert.isFalse(painter.hasPending, "every batch was drawn");
            const drawn = nodeFramingBox(graph.getNodes());
            assert.isDefined(drawn);
            assert.closeTo(lastMaxX, drawn.max.x, 1e-6, "the camera framed the nodes at the sizes they are drawn at");
        });

        /**
         * Put the graph where a second load leaves it: framed once already, its own framing request
         * answered while the layout still moves, and the layout about to arrive.
         * @returns Turns the layout's arrival on, and counts the framings from here on.
         */
        function laterLoadAboutToSettle(): { arrive: () => void; framings: () => number } {
            const layoutManager = graph.getLayoutManager();
            layoutManager.running = false;
            updateManager.stepFrames(5);
            assert.isTrue(updateManager.zoomToFitCompleted, "the first load framed the graph");

            const engine = layoutManager.layoutEngine;
            assert.isDefined(engine);
            const settled = vi.spyOn(engine, "isSettled", "get").mockReturnValue(false);
            layoutManager.running = true;
            updateManager.enableZoomToFit();
            updateManager.update();
            assert.isTrue(updateManager.isZoomToFitEnabled(), "the moving layout is still being followed");

            let count = 0;
            graph.eventManager.addListener("zoom-to-fit-complete", () => {
                count++;
            });

            return {
                arrive: () => settled.mockReturnValue(true),
                framings: () => count,
            };
        }

        // After the first load, nothing forces a framing at settlement any more (the element asks
        // for one only until the first settlement is captured), so the framing a later load or
        // layout ends with is the one taken on the pass the layout arrives on. Taken while the
        // load's size layer was still painting, it framed every node at its unstyled size, then
        // stopped following the graph, and the sizes landed unframed (issue #3378).
        it("waits for a style pass on its way before the framing a settling layout ends with", () => {
            const { arrive, framings } = laterLoadAboutToSettle();
            const painting = vi.spyOn(graph.getStylePainter(), "isPainting", "get").mockReturnValue(true);

            arrive();
            updateManager.stepFrames(3);

            assert.strictEqual(framings(), 0, "the settled graph was framed while a style pass was still painting");

            painting.mockReturnValue(false);
            updateManager.update();

            assert.strictEqual(framings(), 1, "the settled graph is framed on the first pass after the paint arrives");
            assert.isFalse(updateManager.isZoomToFitEnabled());
        });

        // A pass of the derivation lane runs the graph and layout hooks before the styles hook
        // asks for the repaint, and awaits each one. In between, the style stack has been written
        // and nothing says a pass is painting, so the frame is neither framed nor finished yet.
        it("waits for the derivation lane to reach the style pass before framing or finishing", async () => {
            const { arrive, framings } = laterLoadAboutToSettle();
            const session = graph.getSession();
            const { lane } = dispatcherOf(session);

            let entered: () => void = () => undefined;
            const inHook = new Promise<void>((resolve) => {
                entered = resolve;
            });
            let release: () => void = () => undefined;
            const held = new Promise<void>((resolve) => {
                release = resolve;
            });
            const unregister = lane.register("config", async () => {
                entered();
                await held;
            });

            try {
                const written = session.config.set({ name: "Second load" });
                await inHook;

                arrive();
                updateManager.stepFrames(3);

                assert.strictEqual(framings(), 0, "the settled graph was framed before the lane reached its repaint");
                assert.isFalse(
                    updateManager.frameIsStable,
                    "a frame was called final while the lane was still deriving",
                );

                release();
                await written;
                await lane.settled();
                updateManager.update();

                assert.strictEqual(framings(), 1, "the settled graph is framed once the lane has caught up");
            } finally {
                release();
                unregister();
            }
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

describe("styleBudgetFor", () => {
    it("keeps a short frame's repaint to 16 ms and gives a slow frame a share of its length, capped", () => {
        assert.strictEqual(styleBudgetFor(16), 16);
        assert.strictEqual(styleBudgetFor(33), 16);
        assert.strictEqual(styleBudgetFor(400), 100, "a slow frame's repaint takes a quarter of it");
        assert.strictEqual(styleBudgetFor(2000), 250, "however slow, never more than 250 ms");
    });
});
