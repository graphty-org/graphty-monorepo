/**
 * @file A node thumbnail is drawn whether or not the scene's list of what is drawn is frozen.
 *
 * A graph that has stopped changing freezes Babylon's list of active meshes. A thumbnail is drawn
 * from a mesh built for it, by a camera of its own, outside the frame loop: drawn from the frozen
 * list, that mesh was missing and the picture came back empty -- a key's shapes blank or not,
 * depending on whether the graph had frozen when they were asked for.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/**
 * How many pixels of a PNG data URL are not fully transparent.
 * @param url - The picture.
 * @returns The count of drawn pixels.
 */
async function drawnPixels(url: string): Promise<number> {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(img, 0, 0);
    const { data } = context.getImageData(0, 0, img.width, img.height);
    let drawn = 0;
    for (let at = 3; at < data.length; at += 4) {
        drawn += data[at] > 0 ? 1 : 0;
    }
    return drawn;
}

describe("nodeThumbnail on a still graph", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([
            { id: "a", position: { x: -4, y: 0, z: 0 } },
            { id: "b", position: { x: 4, y: 0, z: 0 } },
        ]);
        await graph.setLayout("fixed", { dim: 3 });
        await graph.waitForStableFrame();
        // Quiet frames freeze the list of what is drawn.
        while (!graph.scene._activeMeshesFrozen) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("draws the shape while the list of what is drawn is frozen", async () => {
        const url = await graph.nodeThumbnail({ shape: "box", size: 32 });
        assert.isAbove(await drawnPixels(url), 0);
    });
});
