/**
 * @file A consumer's own mesh in `graph.scene`, shown or hidden at rest, is drawn that way on the next
 * frame (issue #9923). At rest graphty-element freezes Babylon's list of what is drawn; a mesh the
 * consumer hides through Babylon alone must still leave the canvas, with no call into the element.
 *
 * Runs in "browser" (objects path) and "forced-batched" (batched path).
 */

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { pixelAt } from "../helpers/canvas-pixels";
import { mountElement, unmountElements } from "../helpers/mount-element";

afterEach(unmountElements);

const PATH = renderPathDefault.value;
const NODES = Array.from({ length: 25 }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: (i % 5) * 3, y: Math.floor(i / 5) * 3, z: 0 },
}));

/**
 * A settled grid with a yellow consumer box between the nodes, drawn and at rest.
 * @returns The element, the box and where the box is on screen.
 */
async function gridWithBox(): Promise<{ element: Graphty; box: Mesh; at: { x: number; y: number } }> {
    const element = await mountElement();
    element.renderOnDemand = false;
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    await element.waitForStableFrame();
    const { scene } = element.graph;
    const box = MeshBuilder.CreateBox("consumer-box", { size: 1.2 }, scene);
    const material = new StandardMaterial("consumer-box", scene);
    material.disableLighting = true;
    material.emissiveColor = new Color3(1, 1, 0);
    box.material = material;
    box.position.set(7.5, 7.5, -1);
    await element.waitForStableFrame();
    const at = element.worldToScreen({ x: 7.5, y: 7.5, z: -1 });
    assert.isTrue(await isYellow(element, at), "the yellow box is drawn");
    await atRest(element);
    return { element, box, at };
}

/**
 * Wait until the scene is at rest: its list of what is drawn frozen, so the case tests the freeze.
 * @param element - The element.
 */
async function atRest(element: Graphty): Promise<void> {
    await vi.waitFor(() => {
        assert.isTrue(element.graph.scene._activeMeshesFrozen, "the list of what is drawn is frozen");
    });
}

/**
 * Whether the pixel is the box's yellow.
 * @param element - The element.
 * @param at - CSS pixels.
 * @returns True when yellow.
 */
async function isYellow(element: Graphty, at: { x: number; y: number }): Promise<boolean> {
    const [r, g, b] = await pixelAt(element, at);
    return r > 200 && g > 200 && b < 80;
}

describe(`a consumer mesh shown or hidden at rest (${PATH})`, () => {
    it("hidden with setEnabled(false) leaves the canvas, and comes back with setEnabled(true)", async () => {
        const { element, box, at } = await gridWithBox();
        box.setEnabled(false);
        await element.waitForStableFrame();
        assert.isFalse(await isYellow(element, at), "the box hidden with setEnabled(false) is still drawn");

        await element.waitForStableFrame();
        await atRest(element);
        box.setEnabled(true);
        await element.waitForStableFrame();
        assert.isTrue(await isYellow(element, at), "the box shown again is not drawn");
    });

    it("hidden with isVisible = false leaves the canvas", async () => {
        const { element, box, at } = await gridWithBox();
        box.isVisible = false;
        await element.waitForStableFrame();
        assert.isFalse(await isYellow(element, at), "the box hidden with isVisible = false is still drawn");
    });
});
