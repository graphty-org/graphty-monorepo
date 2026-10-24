/**
 * @file With `reframeOnViewInsets` on, the element's own framing lands on the same picture whether
 * the view insets arrive before or after it.
 *
 * A load or a new layout asks for a framing that lands on a later frame, and reads the view insets
 * in force when it does. An application that reports a key card's room as an inset writes it on its
 * own schedule, so on a slow machine the inset arrives first and the graph is framed beside the key,
 * and on a fast one the framing lands first and the graph stays centered under the key (issue
 * #3372). Both orders are forced here: the inset written before the data, and the inset written
 * after `waitForStableFrame()` says the framing has landed. With the option on, both end on the
 * framing inside the free area. A camera the reader placed is left alone.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { nextFrame, wheel } from "../../helpers/real-input";

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

describe("reframeOnViewInsets", () => {
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
     * A fresh element with the option on.
     * @returns The element.
     */
    function create(): Graphty {
        const element = document.createElement("graphty-element");
        element.reframeOnViewInsets = true;
        container.appendChild(element);
        return element;
    }

    it("frames the graph the same whether the inset lands before or after the framing", async () => {
        // The inset is in force before the framing is asked for.
        const early = create();
        early.viewInsets = { left: LEFT };
        await load(early);
        const insetFirst = framing(early);
        early.remove();

        // The framing lands first, then the key card reports its room.
        const late = create();
        await load(late);
        const centered = framing(late);
        late.viewInsets = { left: LEFT };
        await late.waitForStableFrame();

        assert.notStrictEqual(centered, insetFirst, "the two orders start from different framings");
        assert.strictEqual(framing(late), insetFirst, "the late inset is framed as the early one was");
        assert.isEmpty(late.nodesInRect({ x: 0, y: 0, width: LEFT, height: HEIGHT }), "no node under the key");
        late.remove();
    });

    it("leaves a camera the reader placed where it is", async () => {
        const element = create();
        await load(element);
        assert.isFalse(element.cameraPlaced, "the element framed the graph itself");
        await wheel(element.graph.canvas, { x: 100, y: 100 }, -400);
        await nextFrame();
        await element.waitForStableFrame();
        assert.isTrue(element.cameraPlaced, "the reader's wheel placed the camera");
        const placed = framing(element);

        element.viewInsets = { left: LEFT };
        await element.waitForStableFrame();
        assert.strictEqual(framing(element), placed);
        element.remove();
    });

    it("frames nothing for a capture's own margins, even when the capture fails", async () => {
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
    it("does not count a capture's own camera as placed: a later inset change still frames", async () => {
        const element = create();
        await load(element);
        await element.captureScreenshot({ camera: { preset: "fitToGraph" } });
        assert.isFalse(element.cameraPlaced, "the capture's camera was there only for the picture");

        element.viewInsets = { left: LEFT };
        await element.waitForStableFrame();
        assert.isEmpty(element.nodesInRect({ x: 0, y: 0, width: LEFT, height: HEIGHT }), "no node under the key");
        element.remove();
    });

    it("puts the screen's margins and the option back when placing the capture's camera fails", async () => {
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
        assert.isTrue(element.reframeOnViewInsets, "the option is back on");
        assert.isFalse(element.cameraPlaced, "the failed capture placed nothing");
        element.remove();
    });
});
