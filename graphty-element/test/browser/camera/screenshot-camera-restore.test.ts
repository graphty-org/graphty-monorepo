/**
 * @file A screenshot with its own camera puts everything back: the screen's view insets, the
 * camera, whether the camera counts as placed by the reader, and the element's own framing --
 * also when the capture fails.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

const WIDTH = 900;
const HEIGHT = 600;
const LEFT = 300;
const NODES = Array.from({ length: 40 }, (_unused, index) => ({ id: `n${String(index)}` }));

/**
 * Where the 2D camera stands and how much it shows.
 * @param element - The element.
 * @returns The camera's x, y and half-width, as text.
 */
function framing(element: Graphty): string {
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    const { x, y } = camera.position;
    return [x, y, camera.orthoRight ?? Number.NaN].map((value) => value.toFixed(3)).join(",");
}

/**
 * Load the nodes on a circle in 2D and wait until the framing they ask for has landed.
 * @param element - The element.
 */
async function load(element: Graphty): Promise<void> {
    element.nodeData = NODES;
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular");
    await element.waitForStableFrame();
}

describe("a screenshot's own camera", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    /**
     * A fresh element.
     * @returns The element.
     */
    function create(): Graphty {
        const element = document.createElement("graphty-element");
        container.appendChild(element);
        return element;
    }

    it("puts the screen's margins and the camera back when the capture fails", async () => {
        const element = create();
        element.viewInsets = { left: LEFT };
        await load(element);
        const updates = element.graph.getUpdateManager();
        assert.isFalse(updates.isZoomToFitEnabled(), "the load's framing has landed");
        const framed = framing(element);

        // A named view swaps the screen's margins for the capture's and back; an unknown one throws.
        let failed = false;
        await element.captureScreenshot({ camera: { preset: "no-such-view" } }).catch(() => {
            failed = true;
        });
        assert.isTrue(failed, "the unknown view was refused");
        assert.isFalse(updates.isZoomToFitEnabled(), "no framing was left pending");
        assert.strictEqual(element.viewInsets.left, LEFT, "the screen's margins are back");
        await element.waitForStableFrame();
        assert.strictEqual(framing(element), framed);
        element.remove();
    });

    it("does not count a capture's own camera as the reader placing it", async () => {
        const element = create();
        await load(element);
        const framed = framing(element);
        await element.captureScreenshot({ camera: { preset: "fitToGraph" } });
        assert.isFalse(element.cameraPlaced, "the capture's camera was there only for the picture");
        await element.waitForStableFrame();
        assert.strictEqual(framing(element), framed, "the camera is back where it was");
        element.remove();
    });

    it("puts the screen's margins back and places nothing when placing the capture's camera fails", async () => {
        const element = create();
        element.viewInsets = { left: LEFT };
        await load(element);
        const { graph } = element;
        const setCameraState = graph.setCameraState.bind(graph);
        let calls = 0;
        // The first placement -- the capture's own camera -- fails; putting the camera back works.
        graph.setCameraState = async (...args: Parameters<typeof setCameraState>): Promise<void> => {
            calls++;
            if (calls === 1) {
                throw new Error("placing the camera failed");
            }
            await setCameraState(...args);
        };

        let failed = false;
        await element.captureScreenshot({ camera: { preset: "fitToGraph" } }).catch(() => {
            failed = true;
        });
        graph.setCameraState = setCameraState;
        assert.isTrue(failed, "the capture reported the failure");
        assert.strictEqual(element.viewInsets.left, LEFT, "the screen's margins are back");
        assert.isFalse(element.cameraPlaced, "the failed capture placed nothing");
        element.remove();
    });
});
