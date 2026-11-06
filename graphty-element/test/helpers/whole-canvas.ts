import { assert } from "vitest";

import type { Graph } from "../../src/Graph";

/** A whole canvas, as RGBA bytes. */
export interface CanvasFrame {
    readonly pixels: Uint8Array;
}

/**
 * Wait for the finished picture, draw a frame and read it before it is presented, which reads
 * the same on WebGL and on WebGPU, whose canvas holds nothing once a frame has ended.
 * @param graph - The graph.
 * @returns The canvas.
 */
export async function readCanvas(graph: Graph): Promise<CanvasFrame> {
    await graph.waitForStableFrame();
    const { engine } = graph;
    await graph.getScene().whenReadyAsync();
    engine.beginFrame();
    graph.getScene().render();
    const read = engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
    engine.endFrame();
    return { pixels: (await read) as Uint8Array };
}

/**
 * Pixels differing by more than a level in any channel, section 7's bar in
 * design/rendering/row-renderer.md, never widened to pass.
 * @param a - A frame.
 * @param b - A frame of the same size.
 * @returns How many.
 */
export function pixelsOverBar(a: CanvasFrame, b: CanvasFrame): number {
    assert.equal(a.pixels.length, b.pixels.length);
    let over = 0;
    for (let i = 0; i < a.pixels.length; i += 4) {
        for (let c = 0; c < 4; c++) {
            if (Math.abs((a.pixels[i + c] ?? 0) - (b.pixels[i + c] ?? 0)) > 1) {
                over++;
                break;
            }
        }
    }

    return over;
}
