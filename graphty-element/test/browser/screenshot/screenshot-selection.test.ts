import { CreateScreenshotAsync } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test, vi } from "vitest";

import type { Graph } from "../../../src/Graph";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

// test/setup.ts stubs the capture with one pixel; these tests need the real drawing.
beforeEach(async () => {
    const actual = await vi.importActual<typeof import("@babylonjs/core")>("@babylonjs/core");
    vi.mocked(CreateScreenshotAsync).mockImplementation(actual.CreateScreenshotAsync);
});

afterEach(() => {
    cleanupTestGraphWithData(graph);
});

/**
 * Reads every pixel of an image.
 * @param blob - The image.
 * @returns Its RGBA bytes.
 */
async function pixels(blob: Blob): Promise<Uint8ClampedArray> {
    const image = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    assert.ok(ctx);
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height).data;
}

/**
 * Waits for frames to be drawn, so a selection (applied by the next update pass) is on screen.
 * @param count - How many frames.
 */
async function frames(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
        await new Promise<void>((resolve) => graph.scene.onAfterRenderObservable.addOnce(() => resolve()));
    }
}

/**
 * Counts the pixels that differ between two images of one size.
 * @param a - One image's bytes.
 * @param b - The other's.
 * @returns How many pixels differ by more than a rounding step in any channel.
 */
function differing(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
    assert.equal(a.length, b.length);
    let count = 0;
    for (let i = 0; i < a.length; i += 4) {
        if ([0, 1, 2, 3].some((c) => Math.abs(a[i + c] - b[i + c]) > 2)) {
            count++;
        }
    }

    return count;
}

test("showSelection: false leaves the selection ring out of the image and the selection on screen", async () => {
    graph = await createTestGraphWithData();
    const opts = { timing: { waitForSettle: false } };

    await frames(3);
    const unselected = await pixels((await graph.captureScreenshot(opts)).blob);

    assert.isTrue(graph.selectNode("2"));
    await frames(3);
    const ringed = await pixels((await graph.captureScreenshot(opts)).blob);
    assert.isAbove(differing(unselected, ringed), 0, "the ring shows in a default capture");

    let selectionEvents = 0;
    const listener = graph.eventManager.addListener("selection-changed", () => selectionEvents++);
    const plain = await pixels((await graph.captureScreenshot({ ...opts, showSelection: false })).blob);
    graph.eventManager.removeListener(listener);

    assert.equal(differing(unselected, plain), 0, "no ring in the image");
    assert.equal(graph.getSelectedNode()?.id, "2", "the node is still selected");
    assert.equal(selectionEvents, 0, "no selection event fired");

    const after = await pixels((await graph.captureScreenshot(opts)).blob);
    assert.equal(differing(ringed, after), 0, "the ring is drawn again after the capture");

    // A capture that fails part way puts the ring back too.
    let failed = false;
    try {
        await graph.captureScreenshot({ ...opts, showSelection: false, format: "jpeg", transparentBackground: true });
    } catch {
        failed = true;
    }
    assert.isTrue(failed, "a transparent JPEG is refused");
    const afterFailure = await pixels((await graph.captureScreenshot(opts)).blob);
    assert.equal(differing(ringed, afterFailure), 0, "the ring is drawn again after a failed capture");
});
