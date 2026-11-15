/**
 * @file Reading an element's drawn canvas back at points given in CSS pixels, for the shader tests.
 *
 * One copy, so the y flip is right everywhere: a CSS row counts down from the top and a WebGL row
 * counts up from the bottom, so CSS row `y` is render row `height - round(y * scale) - 1`.
 * `round(height - y * scale)` reads the row above the one asked for, and row `height`, off the
 * canvas, at y = 0.
 */

import type { Graphty } from "../../index.js";
import { drawnFrames } from "./drawn-frames";
import type { Point } from "./real-input";

/** One pixel: r, g, b, a, 0 to 255. */
export type Pixel = [number, number, number, number];

/**
 * How many render pixels make one CSS pixel on the element's canvas.
 * @param element - The element.
 * @returns The scale.
 */
function scaleOf(element: Graphty): number {
    const { engine } = element.graph;
    const canvas = engine.getRenderingCanvas();
    return canvas === null || canvas.clientWidth === 0 ? 1 : engine.getRenderWidth() / canvas.clientWidth;
}

/**
 * The render row, counted from the bottom as WebGL reads it, that holds a CSS row.
 * @param element - The element.
 * @param y - CSS pixels from the top.
 * @param scale - Render pixels per CSS pixel.
 * @returns The row.
 */
function renderRow(element: Graphty, y: number, scale: number): number {
    return element.graph.engine.getRenderHeight() - Math.round(y * scale) - 1;
}

/**
 * The canvas pixels at points in CSS pixels, read after the next two drawn frames.
 * @param element - The element.
 * @param points - CSS pixels from the element's top-left corner.
 * @returns One pixel per point.
 */
export async function pixelsAt(element: Graphty, points: readonly Point[]): Promise<Pixel[]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = scaleOf(element);
    const out: Pixel[] = [];
    for (const point of points) {
        const read = (await engine.readPixels(
            Math.round(point.x * scale),
            renderRow(element, point.y, scale),
            1,
            1,
        )) as unknown as Uint8Array;
        out.push([read[0], read[1], read[2], read[3]]);
    }

    return out;
}

/**
 * The canvas pixel at a point in CSS pixels, read after the next two drawn frames.
 * @param element - The element.
 * @param point - CSS pixels from the element's top-left corner.
 * @returns r, g, b, a.
 */
export async function pixelAt(element: Graphty, point: Point): Promise<Pixel> {
    const [pixel] = await pixelsAt(element, [point]);
    return pixel;
}

/**
 * One whole row of the canvas through a CSS row, one pixel per render pixel, read after the next
 * two drawn frames.
 * @param element - The element.
 * @param y - The row, CSS pixels from the top.
 * @returns The row's pixels and how many render pixels make a CSS pixel.
 */
export async function rowAt(element: Graphty, y: number): Promise<{ row: Pixel[]; scale: number }> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = scaleOf(element);
    const width = engine.getRenderWidth();
    const read = (await engine.readPixels(0, renderRow(element, y, scale), width, 1)) as unknown as Uint8Array;
    const row: Pixel[] = [];
    for (let x = 0; x < width; x++) {
        row.push([read[x * 4], read[x * 4 + 1], read[x * 4 + 2], read[x * 4 + 3]]);
    }

    return { row, scale };
}

/**
 * Whether a color is mostly one channel.
 * @param pixel - The pixel.
 * @param channel - 0 red, 1 green, 2 blue.
 * @returns True when that channel leads the others by a margin.
 */
export function leads(pixel: readonly number[], channel: number): boolean {
    return [0, 1, 2].every((other) => other === channel || pixel[channel] > pixel[other] + 60);
}

/**
 * How many pixels of a canvas are the probe's magenta.
 * @param rgba - The pixels.
 * @returns The count.
 */
export function magentaPixels(rgba: Uint8Array): number {
    let count = 0;
    for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] >= 250 && rgba[i + 1] <= 5 && rgba[i + 2] >= 250) {
            count++;
        }
    }

    return count;
}
