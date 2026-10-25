/**
 * @file Framing the selection from where the camera looks now.
 *
 * A reader turns the 3D drawing, selects one node and asks to frame it. With `fitToGraph`'s
 * `keepAngle` and the selection as its scope, the camera keeps the direction it looks from and only
 * its target and distance change, and the node lands at the center of the part of the canvas the
 * view insets leave free.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

/** Canvas size in CSS pixels. */
const WIDTH = 640;
const HEIGHT = 480;
/** A panel's width, reserved at the left. */
const LEFT = 200;

/**
 * A ball of nodes with depth, so a turned camera sees them from a side the default view does not.
 * @returns The nodes.
 */
function ball(): { id: string; position: { x: number; y: number; z: number } }[] {
    return Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const b = ((i % 6) / 6) * Math.PI - Math.PI / 2;
        return {
            id: `n${String(i)}`,
            position: { x: 30 * Math.cos(a) * Math.cos(b) + 5, y: 20 * Math.sin(b), z: 25 * Math.sin(a) * Math.cos(b) },
        };
    });
}

/**
 * The unit vector from a camera state's target to its position.
 * @param state - The camera state.
 * @param state.position - Where the camera stands.
 * @param state.target - What it looks at.
 * @returns The direction.
 */
function direction(state: {
    position?: { x: number; y: number; z: number };
    target?: { x: number; y: number; z: number };
}): [number, number, number] {
    assert.exists(state.position);
    assert.exists(state.target);
    const d = [
        state.position.x - state.target.x,
        state.position.y - state.target.y,
        state.position.z - state.target.z,
    ] as const;
    const length = Math.hypot(...d);
    return [d[0] / length, d[1] / length, d[2] / length];
}

describe("frame the selection in 3D", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
    });

    afterEach(() => {
        container.remove();
    });

    it("keeps the direction the camera looks from and centers the node in the free area", async () => {
        const nodes = ball();
        await element.graph.addNodes(nodes);
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.graph.waitForSettled();
        await element.setViewMode("3d");
        await element.graph.waitForSettled();
        element.viewInsets = { left: LEFT };

        // The reader has turned the drawing: the camera looks from the side, off the default diagonal.
        await element.setCameraState({ position: { x: 90, y: 25, z: -40 }, target: { x: 5, y: 0, z: 0 } });
        await element.waitForStableFrame();
        const before = direction(element.getCameraState());

        await element.select({ nodes: ["n7"] });
        await element.applyCameraView("fitToGraph", { scope: "selection", params: { keepAngle: true } });
        await element.waitForStableFrame();

        const after = direction(element.getCameraState());
        before.forEach((value, axis) => {
            assert.closeTo(after[axis] ?? Number.NaN, value, 1e-3, `direction axis ${String(axis)} kept`);
        });

        const at = element.nodeScreenPosition("n7");
        assert.isDefined(at);
        assert.isTrue(at.visible);
        const freeWidth = WIDTH - LEFT;
        assert.closeTo(at.x, LEFT + freeWidth / 2, freeWidth * 0.05, "centered across the free area");
        assert.closeTo(at.y, HEIGHT / 2, HEIGHT * 0.05, "centered down the free area");
    });
});
