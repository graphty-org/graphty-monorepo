/**
 * @file `cameraKeysRoot` under real input (issue #10377): with a root set, the camera keys keep
 * working after a click moves focus off the canvas to a control beside it, and stay out of a text
 * field. Without one, only the focused canvas answers them, as before.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A drawn 3D element with a button and a text box beside it.
 * @returns The element, the button and the text box.
 */
async function mounted(): Promise<{ element: Graphty; button: HTMLButtonElement; field: HTMLInputElement }> {
    const panel = document.createElement("div");
    const button = document.createElement("button");
    button.textContent = "Panel button";
    const field = document.createElement("input");
    field.type = "text";
    panel.append(button, field);
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.append(panel, element);
    cleanups.push(() => {
        element.remove();
        panel.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return { element, button, field };
}

/**
 * The camera's distance from the origin once it has stopped moving, from the public API.
 * @param element - The element.
 * @returns The distance, to a thousandth.
 */
async function restingDistance(element: Graphty): Promise<number> {
    const now = (): number => {
        const { position } = element.getCameraState();
        return Math.round(Math.hypot(position?.x ?? 0, position?.y ?? 0, position?.z ?? 0) * 1000) / 1000;
    };
    let before: number;
    do {
        before = now();
        await element.waitForStableFrame();
    } while (now() !== before);
    return before;
}

describe("camera keys on a root (issue #10377)", () => {
    it("zooms on W after a click on a control beside the canvas", async () => {
        const { element, button } = await mounted();
        element.cameraKeysRoot = document;
        await userEvent.click(button);
        assert.strictEqual(document.activeElement, button);
        const before = await restingDistance(element);
        await userEvent.keyboard("w");
        const after = await restingDistance(element);
        // Each frame of W zooms to 0.985 of the distance: anything under 0.995 is at least one.
        assert.isBelow(after / before, 0.995, `distance ${String(before)} -> ${String(after)}`);
    });

    it("leaves W alone in a text field", async () => {
        const { element, field } = await mounted();
        element.cameraKeysRoot = document;
        await userEvent.click(field);
        const before = await restingDistance(element);
        await userEvent.keyboard("w");
        assert.strictEqual(field.value, "w");
        assert.strictEqual(await restingDistance(element), before);
    });

    it("answers only the focused canvas without a root", async () => {
        const { element, button } = await mounted();
        await userEvent.click(button);
        const before = await restingDistance(element);
        await userEvent.keyboard("w");
        assert.strictEqual(await restingDistance(element), before);
    });
});
