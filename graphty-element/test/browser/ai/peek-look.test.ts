/**
 * @file A peek on a real element: its halo is drawn on the canvas, the camera and the selection stay
 * where they were, and clearing it restores the picture.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

let element: Graphty;

/**
 * How many pixels of the frame show the peek's slate.
 * @returns The count.
 */
async function slatePixels(): Promise<number> {
    const { graph } = element;
    await element.session.styles.settled();
    await graph.waitForStableFrame();
    graph.scene.render();
    const { engine } = graph;
    const pixels = (await engine.readPixels(
        0,
        0,
        engine.getRenderWidth(),
        engine.getRenderHeight(),
    )) as unknown as Uint8Array;
    const slate = [0x33, 0x41, 0x55];
    let count = 0;
    for (let at = 0; at < pixels.length; at += 4) {
        if (slate.every((value, channel) => Math.abs(pixels[at + channel] - value) < 24)) {
            count++;
        }
    }

    return count;
}

beforeEach(async () => {
    element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    element.features = ["assistant"];
    document.body.appendChild(element);
    await element.waitForSettled();
    const { session } = element;
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("circular", { scale: 0.2 });
    await element.waitForSettled();
});

afterEach(() => {
    element.remove();
});

describe("selection.peek on an element", () => {
    it("draws a halo on what it names, moves nothing, and clears", async () => {
        const { session } = element;
        await session.selection.apply({ ids: ["c"] });
        const steps = session.history.steps.length;
        // Read once the first frames have framed the graph, which moves the camera by itself.
        const bare = await slatePixels();
        const camera = JSON.stringify(element.getCameraState());

        await session.selection.peek({ ids: ["a"] });
        const peeked = await slatePixels();

        assert.isAbove(peeked, bare + 50, "the halo is on the canvas");
        assert.strictEqual(JSON.stringify(element.getCameraState()), camera);
        assert.deepEqual([...session.selection.nodes], ["c"]);
        assert.strictEqual(session.history.steps.length, steps);

        await session.selection.peek(null);
        assert.strictEqual(await slatePixels(), bare);
    });
});
