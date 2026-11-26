import { assert } from "vitest";

import type { Graph } from "../../src/Graph";

/** A whole canvas, as RGBA bytes. */
export interface CanvasFrame {
    readonly pixels: Uint8Array;
    readonly width: number;
    readonly height: number;
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
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const read = engine.readPixels(0, 0, width, height);
    engine.endFrame();
    return { pixels: (await read) as Uint8Array, width, height };
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

/** How many differing pixels a failed comparison names. */
const NAMED = 20;

/**
 * A frame as a PNG data URL, rows in the order they were read (WebGL reads from the bottom up).
 * @param frame - The frame.
 * @param pixels - Bytes to draw instead of the frame's own.
 * @returns The data URL.
 */
export function png(frame: CanvasFrame, pixels = frame.pixels): string {
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.putImageData(new ImageData(new Uint8ClampedArray(pixels), frame.width, frame.height), 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Assert two frames are within section 7's bar ({@link pixelsOverBar}). When they are not, the
 * message names the first differing pixels with both values, and both frames and a diff (red where
 * they differ) are logged as PNG data URLs, which the JUnit report keeps in the test's system-out
 * (#9739: a one-pixel failure in CI had left nothing to look at). A pass costs one count.
 * @param a - A frame.
 * @param b - A frame of the same size.
 * @param message - What a difference means.
 */
export function assertSameFrame(a: CanvasFrame, b: CanvasFrame, message: string): void {
    const over = pixelsOverBar(a, b);
    if (over === 0) {
        return;
    }

    const named: string[] = [];
    const diff = a.pixels.map((value, i) => (i % 4 === 3 ? 64 : value));
    for (let i = 0; i < a.pixels.length; i += 4) {
        const one = a.pixels.subarray(i, i + 4);
        const two = b.pixels.subarray(i, i + 4);
        if (one.some((value, c) => Math.abs(value - (two[c] ?? 0)) > 1)) {
            diff.set([255, 0, 0, 255], i);
            if (named.length < NAMED) {
                const p = i / 4;
                named.push(
                    `(${String(p % a.width)},${String(Math.floor(p / a.width))}) ${one.join(",")} vs ${two.join(",")}`,
                );
            }
        }
    }

    const where = `${String(a.width)}x${String(a.height)}, y as read`;
    console.log(`${message}: first frame (${where}) ${png(a)}`);
    console.log(`${message}: second frame (${where}) ${png(b)}`);
    console.log(`${message}: diff, red where over the bar (${where}) ${png(a, diff)}`);
    assert.equal(over, 0, `${message}; first ${String(named.length)} as (x,y) rgba vs rgba: ${named.join("; ")}`);
}
