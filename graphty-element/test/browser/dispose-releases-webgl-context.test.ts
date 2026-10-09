/**
 * @file Disposing a graph gives its WebGL context back to the browser.
 *
 * Chrome keeps a fixed number of WebGL contexts alive per page (16) and evicts the oldest one,
 * with "Too many active WebGL contexts. Oldest context will be lost.", when a page asks for more.
 * A disposed graph used to keep its context until garbage collection, so a page that creates and
 * disposes graphs -- a dashboard switching views, a story gallery, a test file -- had a LIVE graph's
 * context evicted from under it once enough disposed ones had piled up.
 */

import { assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** More graphs than Chrome keeps contexts for, so an unreleased context would evict one. */
const GRAPHS = 24;

/**
 * Makes a sized container in the page.
 * @returns The container, already attached.
 */
function makeContainer(): HTMLElement {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "150px";
    document.body.appendChild(container);
    return container;
}

/**
 * The WebGL context a graph draws with.
 * @param graph - A graph on the WebGL renderer.
 * @returns Its context.
 */
function contextOf(graph: Graph): WebGLRenderingContext | WebGL2RenderingContext {
    const canvas = graph.engine.getRenderingCanvas();
    assert.isNotNull(canvas);
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    assert.isNotNull(gl, "the graph's canvas has no WebGL context");
    return gl;
}

describe("disposing a graph releases its WebGL context", () => {
    it("loses each disposed graph's context, and a live graph's context survives", async () => {
        const liveContainer = makeContainer();
        const live = new Graph(liveContainer);
        await live.init();
        let liveLost = 0;
        live.engine.getRenderingCanvas()?.addEventListener("webglcontextlost", () => {
            liveLost++;
        });

        const lostAfterDispose: boolean[] = [];
        try {
            for (let i = 0; i < GRAPHS; i++) {
                const container = makeContainer();
                const graph = new Graph(container);
                await graph.init();
                const gl = contextOf(graph);
                graph.dispose();
                container.remove();
                lostAfterDispose.push(gl.isContextLost());
            }

            assert.deepEqual(lostAfterDispose, new Array<boolean>(GRAPHS).fill(true));
            assert.isFalse(contextOf(live).isContextLost(), "the live graph's context was evicted");
            assert.strictEqual(liveLost, 0, "the live graph's canvas saw webglcontextlost");
        } finally {
            live.dispose();
            liveContainer.remove();
        }
    });

    it("draws with a new graph made in the container of a disposed one", async () => {
        const container = makeContainer();
        const first = new Graph(container);
        await first.init();
        const firstContext = contextOf(first);
        first.dispose();
        assert.isTrue(firstContext.isContextLost());

        const second = new Graph(container);
        try {
            await second.init();
            await second.addNodes([{ id: "a" }, { id: "b" }]);
            await operationQueueOf(second).waitForCompletion();

            const gl = contextOf(second);
            assert.isFalse(gl.isContextLost());
            assert.notStrictEqual(gl, firstContext);

            second.scene.render();
            const pixels = await second.engine.readPixels(0, 0, 1, 1);
            const [r, g, b, a] = Array.from(new Uint8Array(pixels.buffer));
            // A lost context reads back zeros; a drawn frame has the background, whitesmoke.
            assert.deepEqual([r, g, b, a], [245, 245, 245, 255]);
        } finally {
            second.dispose();
            container.remove();
        }
    });
});
