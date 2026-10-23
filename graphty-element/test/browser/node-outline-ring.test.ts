/**
 * @file `node.outline` draws a ring around the node and leaves the node its own color.
 *
 * The highlight layer that draws outlines also glowed inside the mesh by default, so on a node a
 * few pixels across the outline color covered the node completely: an outlined node read as a
 * bigger node in the outline color. Paints one large unlit node red with a yellow outline and
 * reads the pixel at its center and the pixels just outside it.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

const WIDTH = 320;
const HEIGHT = 240;

describe("node.outline", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes([{ id: "only" }]);
        await session.styles.add({
            name: "a red node, outlined in yellow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.unlit": true, "node.color": "#ff0000", "node.outline": "#ffff00" },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Every pixel of the frame last drawn.
     * @returns The pixels, RGBA, bottom row first.
     */
    async function frame(): Promise<{ pixels: Uint8Array; width: number; height: number }> {
        const { engine } = graph;
        graph.scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        return { pixels, width, height };
    }

    it("keeps the node's own color inside the ring", async () => {
        const { pixels, width, height } = await frame();
        const at = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
        const [r, g, b] = [pixels[at], pixels[at + 1], pixels[at + 2]];

        assert.isAbove(r, 200, `the center is red, not ${String([r, g, b])}`);
        assert.isBelow(g, 80, `the center is not the outline's yellow: ${String([r, g, b])}`);
        assert.isBelow(b, 80);
    });

    it("draws the outline color around the node", async () => {
        const { pixels } = await frame();
        let yellow = 0;
        for (let at = 0; at < pixels.length; at += 4) {
            if (pixels[at] > 150 && pixels[at + 1] > 150 && pixels[at + 2] < 100) {
                yellow++;
            }
        }

        assert.isAbove(yellow, 20, "a ring of the outline color is drawn");
    });
});
