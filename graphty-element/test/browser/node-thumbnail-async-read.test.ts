/**
 * @file A key's node pictures are read back without blocking the main thread.
 *
 * Each picture is drawn into a render target and read back. A synchronous WebGL `readPixels` into
 * client memory waits for the GPU to finish everything queued, on the main thread: a key of thirty
 * groups blocked for seconds. On WebGL2 the read goes into a pixel buffer behind a fence instead,
 * so the main thread never waits for it. Counted here: synchronous reads while the key draws its
 * pictures (none), and that every picture is still drawn.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/** How many pictures the key draws. */
const PICTURES = 6;

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

describe("nodeThumbnail pixel reads", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("reads every picture without a synchronous readPixels", async ({ skip }) => {
        if (graph.engine.isWebGPU || (graph.engine as { webGLVersion?: number }).webGLVersion !== 2) {
            skip("WebGPU reads through mapAsync already; the fenced read needs WebGL2");
        }

        const proto = WebGL2RenderingContext.prototype;
        const original = proto.readPixels;
        let blocking = 0;
        let buffered = 0;
        proto.readPixels = function (this: WebGL2RenderingContext, ...args: unknown[]) {
            // The last argument is a client array for a blocking read, a byte offset into the
            // bound pixel buffer for a fenced one.
            if (typeof args[6] === "number") {
                buffered++;
            } else {
                blocking++;
            }
            return (original as (...a: unknown[]) => void).apply(this, args);
        };
        let urls: string[];
        try {
            urls = await Promise.all(
                Array.from({ length: PICTURES }, (_, at) =>
                    graph.nodeThumbnail({
                        shape: "box",
                        color: `#${(at * 0x203040 + 0x102030).toString(16).slice(-6)}`,
                    }),
                ),
            );
        } finally {
            proto.readPixels = original;
        }

        assert.strictEqual(blocking, 0, "synchronous readPixels calls while drawing the pictures");
        assert.strictEqual(buffered, PICTURES, "fenced reads, one per picture");
        for (const url of urls) {
            assert.isAbove(await drawnPixels(url), 0);
        }
    });
});
