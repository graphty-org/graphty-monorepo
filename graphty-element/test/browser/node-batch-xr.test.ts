/**
 * @file Each eye draws the same whole frame on both render paths, laser included.
 *
 * A row keeps its mesh as a hidden proxy, and Babylon's pointer selection picks with its default
 * predicate, which reads `isVisible`, not `visibility`, so its laser still lands on a batched row.
 */

import "../../src/graphty-element";

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

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

/**
 * Count the bytes of each eye that differ by more than a level.
 * @param first - One frame.
 * @param second - The other frame.
 * @returns The count in each eye.
 */
function differing(first: Uint8ClampedArray, second: Uint8ClampedArray): { left: number; right: number } {
    const line = element.graph.getScene().getEngine().getRenderingCanvas()?.width ?? 0;
    const counts = { left: 0, right: 0 };
    for (let i = 0; i < first.length; i++) {
        if (Math.abs((first[i] ?? 0) - (second[i] ?? 0)) > 1) {
            counts[(i >> 2) % line < line / 2 ? "left" : "right"]++;
        }
    }

    return counts;
}

/**
 * Wait for a laser to land on a node. Babylon casts from one controller, whichever attached first.
 * @returns The mesh it landed on.
 */
async function laserOnANode(): Promise<AbstractMesh> {
    const helper = element.graph.getXRSessionManager()?.getXRHelper();
    return vi.waitFor(() => {
        const landed = helper?.input.controllers
            .map((controller) => helper.pointerSelection.getMeshUnderPointer(controller.uniqueId))
            .find((mesh) => mesh !== null && mesh !== undefined);
        assert.exists(landed, "no laser landed");
        assert.match(landed.name, /^node-style/, "a laser landed on something else");
        return landed;
    });
}

describe("node batches in XR", () => {
    it("draw each eye's whole frame as the object rows do, laser on a row", async () => {
        element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        element.xr = { enabled: true, ui: { enabled: true, showAvailabilityWarning: false } };
        document.body.append(element);
        await element.updateComplete;
        // In front of the headset, which stands at eye height and looks along +z in Babylon's space.
        await element.session.data.addNodes(
            Array.from({ length: 24 }, (_, id) => ({
                id,
                position: { x: (id % 6) - 2.5, y: Math.floor(id / 6) + 0.1, z: 4 },
            })),
        );
        await element.graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.setViewMode("vr");
        const { graph } = element;
        await drawnFrames(graph.getScene(), 10);
        assert.equal(graph.getScene().activeCamera?.rigCameras.length, 2, "two eyes are drawing");
        // Each controller points straight ahead, down a row.
        iwer.device.controllers.left?.position.set(-0.5, 1.1, 0);
        iwer.device.controllers.right?.position.set(0.5, 1.1, 0);

        const onObjects = await laserOnANode();
        const objects = await wholeFrame();
        graph.setRenderPath("batched");
        const batched = await wholeFrame();

        assert.equal(await laserOnANode(), onObjects, "the laser stays on the same row");
        assert.equal(graph.rowCounts.batchedNodes, 24);
        assert.deepEqual(differing(objects, batched), { left: 0, right: 0 });

        // Without the rows the frame changes in each eye, so the comparison above held rows.
        await element.session.data.clear();
        await operationQueueOf(graph).waitForCompletion();
        const ink = differing(batched, await wholeFrame());
        assert.isAbove(ink.left, 10000, "the left eye drew no rows");
        assert.isAbove(ink.right, 10000, "the right eye drew no rows");
    });
});
