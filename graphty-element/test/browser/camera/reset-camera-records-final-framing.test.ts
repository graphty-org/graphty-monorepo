/**
 * @file `resetCamera()` returns to the camera the first settlement's framing landed on.
 *
 * A framing waits for a style pass on its way (a run's size layer, say), so it can land any number
 * of frames after the settlement that asked for it. The camera to reset to is recorded when that
 * framing lands, not at a fixed time after the request: a slow machine whose framing came later
 * than that recorded the unframed camera, and Reset went somewhere the graph was never shown.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { LayerSpec } from "../../../session";
import { type Graph, renderManagerOf } from "../../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup";

/** A layer that draws every node larger, so the box the framing measures waits for its pass. */
const GROW: LayerSpec = {
    name: "reset camera - every node larger",
    target: "node",
    selector: { match: "everything" },
    set: { "node.size": 4 },
};

describe("resetCamera after the first settlement", () => {
    let graph: Graph;
    let releaseFrames: () => void;

    beforeEach(async () => {
        graph = await createTestGraph();
        // Frames are pumped by hand below, so the live loop must not run passes in between.
        releaseFrames = renderManagerOf(graph).holdFrames();

        await graph.addNodes([
            { id: "1", position: { x: -50, y: 0, z: 0 } },
            { id: "2", position: { x: 50, y: 0, z: 0 } },
            { id: "3", position: { x: 0, y: 50, z: 0 } },
        ]);
        await graph.setLayout("fixed");
    });

    afterEach(() => {
        vi.useRealTimers();
        releaseFrames();
        cleanupTestGraph(graph);
    });

    it("returns to the framing that landed after a style pass held it back", async () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "setInterval"] });
        // A style pass on its way holds the settlement's framing back.
        const edit = graph.getSession().styles.add(GROW);

        graph.setRunning(true);
        graph.update();
        assert.isFalse(graph.isRunning(), "the layout settled on this pass");

        const unframed = graph.getCameraState();

        // However long the pass takes -- no timer may stand in for the framing landing.
        vi.advanceTimersByTime(10_000);
        graph.update();
        vi.useRealTimers();

        await edit;
        graph.update();

        const framed = graph.getCameraState();
        assert.notDeepEqual(framed, unframed, "the framing moved the camera");

        await graph.setCameraState({ position: { x: 7, y: 8, z: 900 }, target: { x: 1, y: 2, z: 3 } });
        await graph.resetCamera();

        assert.deepEqual(graph.getCameraState(), framed, "reset returned to a camera the framing never produced");
    });
});
