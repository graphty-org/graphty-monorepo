/**
 * @file A graph's WebGL context, and the moment a disposed graph gives it back.
 *
 * `Graph.dispose()` releases its context once the GPU has finished the frames still queued for
 * it, not inside `dispose()` itself, so a test that needs the context gone waits for the
 * `webglcontextlost` event rather than reading it straight after `dispose()`.
 */

import { assert } from "vitest";

import type { Graph } from "../../src/Graph";

/**
 * The WebGL context a graph draws with.
 * @param graph - A graph on the WebGL renderer.
 * @returns Its context.
 */
export function contextOf(graph: Graph): WebGLRenderingContext | WebGL2RenderingContext {
    const canvas = graph.engine.getRenderingCanvas();
    assert.isNotNull(canvas);
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    assert.isNotNull(gl, "the graph's canvas has no WebGL context");
    return gl;
}

/**
 * Resolves when a canvas's context is lost, or at once when it already is.
 * @param gl - The context to watch.
 * @returns A promise of the release.
 */
export function released(gl: WebGLRenderingContext | WebGL2RenderingContext): Promise<void> {
    const canvas = gl.canvas as HTMLCanvasElement;
    return new Promise((resolve) => {
        if (gl.isContextLost()) {
            resolve();
            return;
        }

        canvas.addEventListener(
            "webglcontextlost",
            () => {
                resolve();
            },
            { once: true },
        );
    });
}
