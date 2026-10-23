/**
 * @file A halo a layer paints rings its node rather than covering it: only the halo sphere's back
 * faces are drawn, as for the selection settings' own halo. A layer's halo used to be drawn with
 * both faces, so a solid one hid the node it was meant to mark and a translucent one tinted it.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/**
 * How many pixels of the frame are near one pure color.
 * @param graph - The graph.
 * @param channel - Which of red, green and blue the color is pure in.
 * @returns The count.
 */
async function pixelsOf(graph: Graph, channel: 0 | 1 | 2): Promise<number> {
    await graph.waitForStableFrame();
    graph.scene.render();
    const { engine } = graph;
    const pixels = (await engine.readPixels(
        0,
        0,
        engine.getRenderWidth(),
        engine.getRenderHeight(),
    )) as unknown as Uint8Array;
    let count = 0;
    for (let at = 0; at < pixels.length; at += 4) {
        const others = [0, 1, 2].filter((c) => c !== channel).map((c) => pixels[at + c]);
        if (pixels[at + channel] > 150 && others.every((value) => value < 90)) {
            count++;
        }
    }

    return count;
}

describe("a halo a layer paints", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "320px";
        container.style.height = "240px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.setLayout("circular", { scale: 0.2 });
        await operationQueueOf(graph).waitForCompletion();
        await graph.getSession().styles.add({
            name: "red",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#FF0000", "node.flat": true },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("leaves the node it rings in view, even when solid", async () => {
        const bare = await pixelsOf(graph, 0);
        assert.isAbove(bare, 50, "the red node is drawn");

        await graph.getSession().styles.add({
            name: "ring",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.haloColor": "#0000FF", "node.haloOpacity": 1, "node.haloScale": 1.45 },
        });
        await operationQueueOf(graph).waitForCompletion();

        assert.isAbove(await pixelsOf(graph, 2), 50, "the blue ring is drawn");
        assert.isAtLeast(await pixelsOf(graph, 0), bare * 0.9, "and the red node still shows inside it");
    });
});
