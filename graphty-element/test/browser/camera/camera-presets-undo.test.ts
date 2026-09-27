/**
 * @file Saved camera views under undo: saving, importing and removing one is an undoable step on
 * the session's `views` slice, and moving the camera -- to a saved view, a camera view or a
 * position -- is view state that leaves project state and the history alone.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph.js";
import { dispatcherOf } from "../../../src/session/GraphSession.js";
import { stateDigest } from "../../../src/session/project/digest.js";

describe("saved camera views under undo", () => {
    let graph: Graph;
    let container: HTMLElement;

    /**
     * The digest of the graph's project state.
     * @returns The digest.
     */
    const digest = (): string => stateDigest(dispatcherOf(graph.getSession()).state);

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setLayout("circular");
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    test("a saved view is one step: undo forgets it, redo brings back the same state", async () => {
        const session = graph.getSession();
        const steps = session.history.steps.length;

        graph.saveCameraPreset("mine", { position: { x: 5, y: 6, z: 7 }, target: { x: 0, y: 0, z: 0 } });
        const saved = graph.getCameraPresets().mine;

        assert.lengthOf(session.history.steps, steps + 1);
        assert.deepEqual(saved, { position: { x: 5, y: 6, z: 7 }, target: { x: 0, y: 0, z: 0 } });

        await session.undo();
        assert.isUndefined(graph.getCameraPresets().mine);
        assert.deepEqual(graph.exportCameraPresets(), {});

        await session.redo();
        assert.strictEqual(graph.getCameraPresets().mine, saved);
    });

    test("removing a saved view is one step, and undo puts it back", async () => {
        const session = graph.getSession();
        graph.saveCameraPreset("mine", { zoom: 2 });

        await graph.removeCameraPreset("mine");
        assert.isUndefined(graph.getCameraPresets().mine);

        await session.undo();
        assert.deepEqual(graph.getCameraPresets().mine, { zoom: 2 });

        const refused = await graph.removeCameraPreset("nothing-here").then(
            () => null,
            (error: unknown) => (error as { code?: string }).code,
        );
        assert.strictEqual(refused, "E_BAD_COMMAND");
    });

    test("an import is one step however many views it brings", async () => {
        const session = graph.getSession();
        const steps = session.history.steps.length;

        graph.importCameraPresets({ one: { zoom: 1 }, two: { zoom: 2 } });

        assert.lengthOf(session.history.steps, steps + 1);
        await session.undo();
        assert.deepEqual(graph.exportCameraPresets(), {});
    });

    test("moving the camera to a saved view, a camera view or a position changes no project state", async () => {
        const session = graph.getSession();
        graph.saveCameraPreset("mine", { position: { x: 30, y: 20, z: 10 }, target: { x: 0, y: 0, z: 0 } });
        const before = digest();
        const steps = session.history.steps.length;

        await graph.loadCameraPreset("mine");
        assert.approximately(graph.getCameraState().position?.x ?? Number.NaN, 30, 0.1);
        await graph.applyCameraView("isometric");
        await session.execute({ op: "view.camera", position: { x: 40, y: 40, z: 40 }, target: { x: 0, y: 0, z: 0 } });
        assert.approximately(graph.getCameraState().position?.x ?? Number.NaN, 40, 0.1);

        assert.strictEqual(digest(), before, "the camera is not project state");
        assert.lengthOf(session.history.steps, steps, "no step was recorded");
    });

    test("refuses to save a fixed position under a camera view's name", () => {
        assert.throws(() => {
            graph.saveCameraPreset("isometric");
        }, /camera view/);
    });
});
