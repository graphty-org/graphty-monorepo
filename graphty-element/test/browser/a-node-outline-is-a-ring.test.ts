/**
 * @file A layer's `node.outline` draws a ring around the node, never a disc over it, at any size the
 * node is drawn.
 *
 * The outline is drawn by a highlight layer. With its inner glow on, the outline color was also
 * blended over the node's own surface from the rim inwards by a fixed number of pixels, so a node
 * drawn a few dozen pixels across came out as a solid blob of the outline color.
 */

import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const WIDTH = 400;
const HEIGHT = 300;

/**
 * Whether a pixel is the outline's red.
 * @param pixels - RGBA bytes, bottom row first.
 * @param width - The row length in pixels.
 * @param height - The frame height in pixels.
 * @param x - Device pixel column.
 * @param y - Device pixel row from the top.
 * @returns True for red.
 */
function isRed(pixels: Uint8Array, width: number, height: number, x: number, y: number): boolean {
    const at = ((height - 1 - y) * width + x) * 4;
    return pixels[at] > 170 && pixels[at + 1] < 90 && pixels[at + 2] < 90;
}

describe("a node's outline", () => {
    let element: Graphty;

    beforeAll(async () => {
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = `${String(WIDTH)}px`;
        element.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.session.styles.add({
            name: "Outlined",
            target: "node",
            selector: { match: "everything" },
            set: { "node.outline": "#ff0000" },
        });
        await element.session.styles.settled();
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
    });

    afterAll(() => {
        element.remove();
    });

    /**
     * Where the outline's red is drawn, measured from the node's center.
     * @returns Whether the center is red, and every red pixel's distance from the center.
     */
    async function scan(): Promise<{ centerRed: boolean; reds: number[] }> {
        const { engine, scene } = element.graph;
        scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const ratio = width / WIDTH;
        const position = element.nodeScreenPosition("a");
        assert.isDefined(position);
        const cx = Math.round(position.x * ratio);
        const cy = Math.round(position.y * ratio);
        const reds: number[] = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (isRed(pixels, width, height, x, y)) {
                    reds.push(Math.hypot(x - cx, y - cy));
                }
            }
        }

        return { centerRed: isRed(pixels, width, height, cx, cy), reds };
    }

    it("is a ring outside the node, with the node's own color inside, near and far", async () => {
        for (const distance of [8, 30]) {
            await element.graph.setCameraState({ position: { x: 0, y: 0, z: distance }, target: { x: 0, y: 0, z: 0 } });
            await element.waitForStableFrame();
            const { centerRed, reds } = await scan();
            assert.isAbove(reds.length, 0, `at ${String(distance)}: the outline draws`);
            assert.isFalse(centerRed, `at ${String(distance)}: the node's middle keeps its own color`);
            const inner = Math.min(...reds);
            const outer = Math.max(...reds);
            assert.isAbove(
                inner,
                (outer - inner) * 0.5,
                `at ${String(distance)}: a ring (${String(inner)} to ${String(outer)}), not a disc`,
            );
        }
    });
});
