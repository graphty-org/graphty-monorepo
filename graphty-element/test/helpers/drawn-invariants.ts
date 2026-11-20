/**
 * @file What the canvas actually shows for each node and edge, read off one frame's pixels.
 *
 * Bookkeeping (`rowCounts`, `nodeScreenPosition().visible`, an Edge's `drawnCenter`) reports a row
 * that draws nothing as drawn, so a test that reads it passes on a blank canvas (#9222, #9223,
 * #9226). These read the picture. They never call `getNode`, `getEdges` or `edgeBetween`, which
 * build the lazy rows on the batched path and would hide the very defect they look for.
 */

import type { Graphty } from "../../index.js";
import { type Frame, readFrame } from "./paint-assertions";

/** How far from the expected point a pixel may be, in CSS pixels. */
const REACH = 2;

/** Where along an edge, from source to target center, its ink is looked for (arrowheads sit past 0.85). */
const ALONG = [0.3, 0.5, 0.7];

/** One frame and how to read it at a CSS point. */
interface Picture {
    /** The pixel at a CSS point, or undefined off the canvas. */
    at(x: number, y: number): readonly number[] | undefined;
    /** The background, read from a corner. */
    background: readonly number[];
}

/**
 * Read one stable frame of the element.
 * @param element - The element.
 * @returns The picture.
 */
async function picture(element: Graphty): Promise<Picture> {
    const frame: Frame = await readFrame(element.graph);
    const css = element.graph.engine.getRenderingCanvas()?.clientWidth ?? frame.width;
    const scale = css === 0 ? 1 : frame.width / css;
    const pixel = (px: number, py: number): readonly number[] | undefined => {
        if (px < 0 || py < 0 || px >= frame.width || py >= frame.height) {
            return undefined;
        }

        const i = (py * frame.width + px) * 4;
        return [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]];
    };
    return {
        at: (x, y) => pixel(Math.round(x * scale), frame.height - Math.round(y * scale) - 1),
        background: pixel(0, 0) ?? [0, 0, 0],
    };
}

/**
 * Whether any pixel within {@link REACH} of a CSS point passes a test.
 * @param pic - The picture.
 * @param x - CSS x.
 * @param y - CSS y.
 * @param test - The test.
 * @returns True when one does.
 */
function near(pic: Picture, x: number, y: number, test: (p: readonly number[]) => boolean): boolean {
    for (let dy = -REACH; dy <= REACH; dy++) {
        for (let dx = -REACH; dx <= REACH; dx++) {
            const p = pic.at(x + dx, y + dy);
            if (p !== undefined && test(p)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Whether a pixel is the edges' magenta (#ff00ff), or magenta blended into its neighbours.
 * @param p - The pixel.
 * @returns True when red and blue both lead green.
 */
function magenta(p: readonly number[]): boolean {
    return p[0] > p[1] + 60 && p[2] > p[1] + 60;
}

/**
 * Where a node is drawn on screen, building nothing.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels, or undefined when the element places it nowhere.
 */
function centre(element: Graphty, id: string): { x: number; y: number } | undefined {
    return element.nodeScreenPosition(id);
}

/**
 * The nodes with no node-colored pixel near their drawn center: neither background nor edge ink,
 * since a capless edge ends on the center of a node that is not drawn.
 * @param element - The element.
 * @param ids - The nodes to look for.
 * @returns The ids of those not drawn.
 */
export async function undrawnNodes(element: Graphty, ids: readonly string[]): Promise<string[]> {
    const pic = await picture(element);
    const bg = pic.background;
    const ink = (p: readonly number[]): boolean =>
        !magenta(p) && Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60;
    return ids.filter((id) => {
        const at = centre(element, id);
        return at === undefined || !near(pic, at.x, at.y, ink);
    });
}

/**
 * The edges with no magenta ink at some point along the segment between their nodes' drawn
 * centers: an edge not drawn, or drawn somewhere other than between its nodes as drawn.
 * @param element - The element.
 * @param pairs - The edges, as source and target ids.
 * @returns The pairs not drawn between their nodes.
 */
export async function undrawnEdges(
    element: Graphty,
    pairs: readonly (readonly [string, string])[],
): Promise<(readonly [string, string])[]> {
    const pic = await picture(element);
    return pairs.filter(([src, dst]) => {
        const a = centre(element, src);
        const b = centre(element, dst);
        return (
            a === undefined ||
            b === undefined ||
            ALONG.some((t) => !near(pic, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, magenta))
        );
    });
}
