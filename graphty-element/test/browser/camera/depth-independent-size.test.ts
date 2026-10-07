/**
 * @file `layoutBehavior.node.depthIndependentSize`: in 3D, a node's drawn size follows the size
 * its style gave it, whatever its depth.
 *
 * Two nodes, one 10% larger than the other, at very different depths. The 3D camera's perspective
 * draws the nearer one bigger, so with the option off the larger node is drawn smaller when it is
 * the farther one -- the misreading a size bound to data must not allow. With the option on, the
 * drawn order is the size order, near or far, and the drawn ratio is the size ratio.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

const BIG = 3;
const SMALL = 2.7;

/**
 * Let the element's own render loop draw a few frames.
 */
async function frames(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
}

describe("depth-independent node size", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
        await frames();
    });

    afterEach(() => {
        container.remove();
    });

    /**
     * Draw "big" and "small" with "big" at the given depth side, and read both drawn diameters.
     * The orbit camera looks along +z, so a node at negative z is the nearer one.
     * @param bigIsFar - Whether the larger node is the farther one.
     * @param on - Whether the option is on.
     * @returns Both drawn diameters, in pixels.
     */
    async function drawn(bigIsFar: boolean, on: boolean): Promise<{ big: number; small: number }> {
        const far = 30;
        await element.graph.addNodes([
            { id: "big", position: { x: -6, y: 0, z: bigIsFar ? far : -far } },
            { id: "small", position: { x: 6, y: 0, z: bigIsFar ? -far : far } },
        ]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.session.styles.add({
            name: "big",
            target: "node",
            selector: { match: "ids", nodes: ["big"] },
            set: { "node.size": BIG },
        });
        await element.session.styles.add({
            name: "small",
            target: "node",
            selector: { match: "ids", nodes: ["small"] },
            set: { "node.size": SMALL },
        });
        element.layoutBehavior = { node: { depthIndependentSize: on } };
        await element.graph.waitForSettled();
        element.zoomToFit();
        await element.waitForStableFrame();

        const big = element.nodeScreenPosition("big");
        const small = element.nodeScreenPosition("small");
        assert.ok(big?.visible && small?.visible, "both nodes are drawn on screen");
        return { big: 2 * big.radius, small: 2 * small.radius };
    }

    it("off: perspective draws the larger, farther node smaller (the misreading)", async () => {
        const { big, small } = await drawn(true, false);
        assert.isBelow(big, small);
    });

    for (const bigIsFar of [true, false]) {
        it(`on: the larger node is drawn larger, ${bigIsFar ? "farther" : "nearer"} than the other`, async () => {
            const { big, small } = await drawn(bigIsFar, true);
            assert.isAbove(big, small);
            assert.closeTo(big / small, BIG / SMALL, 0.01, "the drawn ratio is the size ratio");
        });
    }

    it("on, then off: the nodes go back to their perspective size", async () => {
        await drawn(true, true);
        element.layoutBehavior = { node: { depthIndependentSize: false } };
        await element.waitForStableFrame();
        const big = element.nodeScreenPosition("big");
        const small = element.nodeScreenPosition("small");
        assert.ok(big && small);
        assert.isBelow(big.radius, small.radius);
    });

    it("on, in 2D: sizes are left alone (an orthographic view has no depth to undo)", async () => {
        await drawn(true, true);
        await element.setViewMode("2d");
        await element.waitForStableFrame();
        const big = element.nodeScreenPosition("big");
        const small = element.nodeScreenPosition("small");
        assert.ok(big && small);
        assert.closeTo(big.radius / small.radius, BIG / SMALL, 0.01);
    });
});
