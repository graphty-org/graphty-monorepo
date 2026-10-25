/**
 * @file `isFrameStable` and `waitForStableFrame()` notice a camera the element itself moved.
 *
 * Two doors move what the canvas shows without starting a layout, a framing or a repaint:
 * `setCameraState()` without animation and a resize of the canvas. Each one used to leave the last
 * frame counted as final, so a wait right after it resolved at once and a screenshot showed the
 * camera from before (issue #3377). New view insets do not belong here: they move the 3D pivot and
 * the camera in opposite directions, so the view and projection a frame draws with are unchanged. Frames are held
 * between the change and the question, so the order "changed, not yet drawn" is certain rather
 * than a matter of whether an animation frame happened to land.
 */

import "../../src/graphty-element";

import type { Observer, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { RenderManager } from "../../src/managers/RenderManager.js";

const COUNT = 30;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index * 7 + 3) % COUNT].id }));

describe("a stable frame after the element moves the camera", () => {
    let container: HTMLDivElement;
    let element: Graphty;
    let drawnView: Float32Array | null;
    let watcher: Observer<Scene> | null;

    /**
     * The camera's view and projection, as one array.
     * @returns Both matrices, view first.
     */
    function currentView(): Float32Array {
        const camera = element.graph.getScene().activeCamera;
        assert.isNotNull(camera);
        return Float32Array.from([...camera.getViewMatrix().m, ...camera.getProjectionMatrix().m]);
    }

    /**
     * Stop drawing frames.
     * @returns The release.
     */
    function holdFrames(): () => void {
        const graphAny = element.graph as unknown as Record<string, unknown>;
        return (graphAny.renderManager as RenderManager).holdFrames();
    }

    /**
     * Release the frames, wait for the stable frame, and check it drew the camera as it is now.
     * @param release - The frame hold to release.
     */
    async function assertDrawnAfter(release: () => void): Promise<void> {
        release();
        await element.waitForStableFrame();
        assert.isTrue(element.isFrameStable);
        assert.deepEqual(Array.from(drawnView ?? []), Array.from(currentView()), "the stable frame drew this camera");
    }

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "100%";
        element.style.height = "100%";
        container.appendChild(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await element.session.layout.set("circular");
        await element.waitForStableFrame();
        drawnView = null;
        watcher = element.graph.getScene().onAfterRenderObservable.add(() => {
            drawnView = currentView();
        });
    });

    afterEach(() => {
        if (watcher !== null) {
            element.graph.getScene().onAfterRenderObservable.remove(watcher);
        }
        element.remove();
        container.remove();
    });

    it("after setCameraState without animation", async () => {
        const release = holdFrames();
        const before = currentView();
        await element.setCameraState({ position: { x: 40, y: 25, z: 60 }, target: { x: 0, y: 0, z: 0 } });
        assert.notDeepEqual(Array.from(currentView()), Array.from(before), "the camera moved");
        assert.isFalse(element.isFrameStable, "no frame has drawn the new camera yet");
        await assertDrawnAfter(release);
    });

    it("after the canvas is resized", async () => {
        const release = holdFrames();
        const engine = element.graph.getScene().getEngine();
        const width = engine.getRenderWidth();
        container.style.width = "500px";
        await vi.waitFor(() => {
            assert.notStrictEqual(engine.getRenderWidth(), width, "the element saw the resize");
        });
        assert.isFalse(element.isFrameStable, "no frame has been drawn at the new size yet");
        await assertDrawnAfter(release);
    });
});
