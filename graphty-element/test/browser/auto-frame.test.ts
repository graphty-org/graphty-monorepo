/**
 * @file `autoFrame` switches the camera's own framing after a load or a layout change, as a yes
 * or no that does not depend on `startingCameraDistance`.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
];

/** Where the orbit camera is built: a camera nobody framed is still here. */
const UNFRAMED_DISTANCE = 10;

/**
 * Wait long enough for a frame to answer a framing request.
 * @returns A promise settling after the wait.
 */
async function frames(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
}

describe("autoFrame", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    /**
     * Stand an element up with a small graph and wait for its layout to settle.
     * @param attributes - The attributes to set before it is connected.
     * @returns The element.
     */
    async function mount(attributes: Readonly<Record<string, string>>): Promise<Graphty> {
        const element = document.createElement("graphty-element");
        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, value);
        }

        container.appendChild(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await frames();
        await element.graph.waitForSettled();
        // The first settlement's re-frame lands on the frame after it.
        await frames();

        return element;
    }

    it("is on by default, and frames the loaded graph", async () => {
        const element = await mount({});

        assert.isTrue(element.autoFrame);
        assert.notStrictEqual(element.graph.getCameraState().cameraDistance, UNFRAMED_DISTANCE);
    });

    it('leaves the camera where it is after a load when auto-frame="false"', async () => {
        const element = await mount({ "auto-frame": "false" });

        assert.isFalse(element.autoFrame);
        assert.strictEqual(element.graph.getCameraState().cameraDistance, UNFRAMED_DISTANCE);
    });

    it("leaves the camera where it is after a layout change while off", async () => {
        const element = await mount({});
        element.autoFrame = false;
        await element.graph.setCameraState({ position: { x: 0, y: 0, z: -40 }, target: { x: 0, y: 0, z: 0 } });
        const before = element.graph.getCameraState().cameraDistance;

        element.layout = "circular";
        await frames();
        await element.graph.waitForSettled();
        await frames();

        assert.strictEqual(element.graph.getCameraState().cameraDistance, before);
    });

    it("still lets an explicit zoomToFit() frame the graph while off", async () => {
        const element = await mount({ "auto-frame": "false" });

        element.zoomToFit();
        await frames();

        assert.notStrictEqual(element.graph.getCameraState().cameraDistance, UNFRAMED_DISTANCE);
    });

    it("frames the next load once switched back on", async () => {
        const element = await mount({ "auto-frame": "false" });

        element.removeAttribute("auto-frame");
        await element.updateComplete;
        assert.isTrue(element.autoFrame);
        element.nodeData = [...NODES, { id: "e" }];
        await frames();
        await element.graph.waitForSettled();
        await frames();

        assert.notStrictEqual(element.graph.getCameraState().cameraDistance, UNFRAMED_DISTANCE);
    });
});
