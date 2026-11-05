/**
 * @file Each eye draws the same whole frame on both render paths, laser included.
 *
 * A row keeps its mesh as a hidden proxy, and Babylon's pointer selection picks with its default
 * predicate, which reads `isVisible`, not `visibility`, so its laser still lands on a batched row.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { installIWER, type IWERHandle } from "../interactions/helpers/iwer-setup";

let iwer: IWERHandle;
let element: Graphty;

beforeEach(() => {
    iwer = installIWER();
});

afterEach(() => {
    element.remove();
    iwer.uninstall();
});

/**
 * Read the canvas as a frame finishes.
 * @returns Its pixels, left eye then right eye across each line.
 */
async function wholeFrame(): Promise<Uint8ClampedArray> {
    const scene = element.graph.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    assert.isNotNull(canvas);
    await drawnFrames(scene, 4);
    return new Promise((resolve) => {
        scene.onAfterRenderObservable.addOnce(() => {
            const copy = new OffscreenCanvas(canvas.width, canvas.height);
            const context = copy.getContext("2d", { willReadFrequently: true });
            assert.isNotNull(context);
            context.drawImage(canvas, 0, 0);
            resolve(context.getImageData(0, 0, canvas.width, canvas.height).data);
        });
    });
}

describe("node batches in XR", () => {
    it("draw each eye's whole frame as the object rows do", async () => {
        element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        element.xr = { enabled: true, ui: { enabled: true, showAvailabilityWarning: false } };
        document.body.append(element);
        await element.updateComplete;
        await element.session.data.addNodes(
            Array.from({ length: 24 }, (_, id) => ({
                id,
                position: { x: (id % 6) - 2.5, y: Math.floor(id / 6) - 1.5, z: -4 },
            })),
        );
        await element.graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.setViewMode("vr");
        const { graph } = element;
        await drawnFrames(graph.getScene(), 10);
        assert.equal(graph.getScene().activeCamera?.rigCameras.length, 2, "two eyes are drawing");

        const objects = await wholeFrame();
        graph.setRenderPath("batched");
        const batched = await wholeFrame();

        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.isAbove(new Set(objects.subarray(0, 40000)).size, 1, "the eyes drew something");
        let over = 0;
        for (let i = 0; i < objects.length; i++) {
            over += Math.abs((objects[i] ?? 0) - (batched[i] ?? 0)) > 1 ? 1 : 0;
        }

        assert.equal(over, 0);
    });
});
