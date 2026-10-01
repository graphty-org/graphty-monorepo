/**
 * @file `startingCameraDistance` places the camera, in 3D and in 2D.
 *
 * The property was published, documented with a default of 30, and read by nothing: the orbit
 * camera always started 10 units out and every data load re-framed it with zoom-to-fit, so a
 * page that set it saw no difference at all. These tests assert where the camera ends up.
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

/** The orbit camera's vertical field of view (Babylon's default for a UniversalCamera). */
const ORBIT_FOV = 0.8;

describe("startingCameraDistance", () => {
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
        await new Promise((resolve) => setTimeout(resolve, 200));
        await element.graph.waitForSettled();
        // The first settlement's re-frame lands on the frame after it.
        await new Promise((resolve) => setTimeout(resolve, 200));

        return element;
    }

    it("starts the 3D camera at the distance asked for, and data loading does not re-frame it", async () => {
        const element = await mount({ "starting-camera-distance": "45" });

        assert.strictEqual(element.graph.getCameraState().cameraDistance, 45);
    });

    it("frames the graph with zoom-to-fit when no distance is set", async () => {
        const element = await mount({});
        const { cameraDistance } = element.graph.getCameraState();

        assert.isDefined(cameraDistance);
        // The orbit camera is built 10 units out; a fitted graph is somewhere else.
        assert.notStrictEqual(cameraDistance, 10);
    });

    it("moves the camera when the property is set on a running graph", async () => {
        const element = await mount({ "starting-camera-distance": "45" });

        element.startingCameraDistance = 70;

        assert.strictEqual(element.graph.getCameraState().cameraDistance, 70);
    });

    it("still lets an explicit zoomToFit() frame the graph", async () => {
        const element = await mount({ "starting-camera-distance": "45" });

        element.graph.zoomToFit();
        await new Promise((resolve) => setTimeout(resolve, 200));

        assert.notStrictEqual(element.graph.getCameraState().cameraDistance, 45);
    });

    it("gives the 2D camera the half-extent the 3D camera's field of view covers at that distance", async () => {
        const element = await mount({ "starting-camera-distance": "45", "view-mode": "2d" });
        const camera = element.graph.scene.activeCamera;

        assert.ok(camera);
        // Width, because the 2D camera keeps its width when the canvas resizes: this is the
        // measure that survives the element sizing itself after the camera was placed.
        assert.ok(camera.orthoRight !== null && camera.orthoLeft !== null);
        assert.approximately(camera.orthoRight - camera.orthoLeft, 2 * 45 * Math.tan(ORBIT_FOV / 2), 1e-6);
    });
});
