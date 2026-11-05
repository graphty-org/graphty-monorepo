/**
 * @file `node.wireframe` with `node.meshDetail: "low"` draws a sphere as an icosphere of one
 * subdivision, so far fewer lines are drawn than at the default "full" detail, where the wireframe
 * of a 32-segment sphere fills the node's disc.
 */

import "../../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";

const SIZE = 400;

describe("a wireframe sphere's detail", () => {
    let element: Graphty;

    beforeAll(async () => {
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = `${String(SIZE)}px`;
        element.style.height = `${String(SIZE)}px`;
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await element.graph.setLayout("fixed", { dim: 3 });
    });

    afterAll(() => {
        element.remove();
    });

    /**
     * Draw the node as a wireframe sphere at one detail and count the pixels its lines cover.
     * @param detail - The node's mesh detail, or undefined to leave it unset.
     * @returns How many pixels differ from the background.
     */
    async function linePixels(detail?: "full" | "low"): Promise<number> {
        const layer = await element.session.styles.add({
            name: `Wireframe ${detail ?? "unset"}`,
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.shape": "sphere",
                "node.color": "#1f3a93",
                "node.wireframe": true,
                ...(detail === undefined ? {} : { "node.meshDetail": detail }),
            },
        });
        await element.session.styles.settled();
        await operationQueueOf(element.graph).waitForCompletion();
        await element.graph.setCameraState({ position: { x: 0, y: 0, z: 2.4 }, target: { x: 0, y: 0, z: 0 } });
        await element.waitForStableFrame();

        const { engine, scene } = element.graph;
        scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const [r0, g0, b0] = [pixels[0], pixels[1], pixels[2]];
        let count = 0;
        for (let at = 0; at < pixels.length; at += 4) {
            if (Math.abs(pixels[at] - r0) + Math.abs(pixels[at + 1] - g0) + Math.abs(pixels[at + 2] - b0) > 60) {
                count++;
            }
        }

        await element.session.styles.remove(layer.id);

        return count;
    }

    it('draws far fewer line pixels at "low" than at "full", and "full" draws as unset', async () => {
        const unset = await linePixels();
        const full = await linePixels("full");
        const low = await linePixels("low");

        assert.isAbove(low, 0, "the low-detail wireframe draws");
        assert.strictEqual(full, unset, '"full" is the mesh drawn when the channel is unset');
        assert.isBelow(low, full / 3, `low ${String(low)} against full ${String(full)}`);
    });
});
