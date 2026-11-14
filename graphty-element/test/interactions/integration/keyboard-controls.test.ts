/**
 * @file When the camera keys must NOT move the camera: a key still down when focus leaves the
 * canvas, and a key pressed with a modifier, which is the page's shortcut. Real key presses
 * (test/helpers/real-input.ts), the render loop running, the outcome read from
 * `element.getCameraState()`.
 *
 * Which way each key moves the camera, and how fast, is in test/interactions/real-input.test.ts
 * and test/browser/2d-camera-controls.test.ts.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, holdKey, releaseHeldKeys, releaseKey } from "../../helpers/real-input";
import { applied, camera, EMPTY, mounted, onCleanup } from "../helpers/mounted-element";

/** More frames than the 8 a single key press owes, so a camera still moving after them is held. */
const PAST_A_TAP = 12;

afterEach(async () => {
    await releaseHeldKeys();
});

/**
 * A mounted element whose canvas a real click has focused, at rest.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function focused(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = await mounted(viewMode);
    await click(element, EMPTY);
    await applied(element);
    assert.isTrue(element.graph.canvas.matches(":focus"), "the click focused the canvas");
    return element;
}

/**
 * How far the camera moves over frames past what a tap owes: the largest change in any number
 * `getCameraState()` reports.
 * @param element - The element.
 * @returns The change.
 */
async function movementOverFrames(element: Graphty): Promise<number> {
    const numbers = (): number[] =>
        JSON.stringify(element.getCameraState())
            .match(/-?[\d.]+(e-?\d+)?/g)
            ?.map(Number) ?? [];
    const before = numbers();
    await drawnFrames(element.graph.getScene(), PAST_A_TAP);
    const after = numbers();
    assert.strictEqual(after.length, before.length, "the camera state kept its shape");
    return Math.max(0, ...after.map((n, i) => Math.abs(n - before[i])));
}

describe.each([
    ["2d", "a"],
    ["3d", "a"],
] as const)("in %s, %s held", (viewMode, key) => {
    it("stops moving the camera when focus leaves the canvas", async () => {
        const element = await focused(viewMode);
        const button = document.createElement("button");
        document.body.appendChild(button);
        onCleanup(() => {
            button.remove();
        });

        await holdKey(key);
        await drawnFrames(element.graph.getScene(), PAST_A_TAP);
        const whileHeld = await movementOverFrames(element);
        assert.isAbove(whileHeld, 0, "the held key moved the camera");

        // Focus moves away; the key-up lands on the button, never on the canvas
        button.focus();
        await releaseKey(key);
        await drawnFrames(element.graph.getScene(), PAST_A_TAP);

        // The 2D camera coasts to a stop over many frames; a key still held moves it at full speed
        assert.isBelow(
            await movementOverFrames(element),
            whileHeld / 10,
            "a key let go off the canvas does not keep moving the camera",
        );
    });
});

describe.each([
    ["2d", "Control", "d"],
    ["3d", "Shift", "a"],
] as const)("in %s, %s+%s", (viewMode, modifier, key) => {
    it("is a page shortcut and does not move the camera", async () => {
        const element = await focused(viewMode);
        const before = camera(element);

        await holdKey(modifier);
        await holdKey(key);
        await drawnFrames(element.graph.getScene(), PAST_A_TAP);

        assert.strictEqual(camera(element), before, "the camera did not move");
    });
});
