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

/** How far past a node's measured radius its ink may reach, in CSS pixels: antialiasing. */
const SLACK = 3;

/** One frame and how to read it at a CSS point. */
interface Picture {
    /** The pixel at a CSS point, or undefined off the canvas. */
    at(x: number, y: number): readonly number[] | undefined;
    /** The background, read from a corner. */
    background: readonly number[];
    /** Every pixel, with its CSS point. */
    each(visit: (p: readonly number[], x: number, y: number) => boolean): void;
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
        each: (visit) => {
            for (let py = 0; py < frame.height; py++) {
                for (let px = 0; px < frame.width; px++) {
                    const p = pixel(px, py) ?? [];
                    if (!visit(p, px / scale, (frame.height - 1 - py) / scale)) {
                        return;
                    }
                }
            }
        },
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
 * Whether a pixel is the edges' magenta (#ff00ff), or magenta blended into its neighbors.
 * @param p - The pixel.
 * @returns True when red and blue both lead green.
 */
function magenta(p: readonly number[]): boolean {
    return p[0] > p[1] + 60 && p[2] > p[1] + 60;
}

/**
 * Whether a pixel is the nodes' blue (#2040ff), lit or blended.
 * @param p - The pixel.
 * @returns True when blue leads red and green.
 */
function blue(p: readonly number[]): boolean {
    return p[2] > p[0] + 60 && p[2] > p[1] + 60;
}

/**
 * The distance from a point to a segment.
 * @param x - The point's x.
 * @param y - The point's y.
 * @param a - The segment's start.
 * @param b - The segment's end.
 * @returns The distance.
 */
function toSegment(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2));
    return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}

/**
 * Where a node is drawn on screen, building nothing.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels, or undefined when the element places it nowhere.
 */
function center(element: Graphty, id: string): { x: number; y: number } | undefined {
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
        const at = center(element, id);
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
        const a = center(element, src);
        const b = center(element, dst);
        return (
            a === undefined ||
            b === undefined ||
            ALONG.some((t) => !near(pic, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, magenta))
        );
    });
}

/**
 * Node or edge ink drawn away from every node and edge where it belongs: a drawing left behind,
 * such as edges on the poses a transition passed or a view's edges after a switch.
 * @param element - The element.
 * @param ids - Every node loaded.
 * @param pairs - Every edge loaded, as source and target ids.
 * @returns Up to five stray points, in CSS pixels, rounded.
 */
export async function strayInk(
    element: Graphty,
    ids: readonly string[],
    pairs: readonly (readonly [string, string])[],
): Promise<string[]> {
    const pic = await picture(element);
    const at = new Map(ids.map((id) => [id, center(element, id)]));
    const nodes = [...at.values()].filter((c) => c !== undefined);
    // A node's drawn radius, walked out from its center while the pixels stay node blue: the camera
    // frames each pose afresh, so a fixed band would not fit both a wide ring and a narrow one.
    const radius = Math.max(
        0,
        ...nodes.flatMap((c) =>
            [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ].map(([dx, dy]) => {
                let r = 0;
                while (blue(pic.at(c.x + dx * (r + 1), c.y + dy * (r + 1)) ?? [0, 0, 0])) {
                    r++;
                }

                return r;
            }),
        ),
    );
    // An arrowhead's wing is about a node's radius from its line; a plain line is narrower.
    const nodeBand = radius + SLACK;
    const edgeBand = radius + SLACK;
    const segments = pairs.flatMap(([src, dst]) => {
        const a = at.get(src);
        const b = at.get(dst);
        return a === undefined || b === undefined ? [] : [[a, b] as const];
    });
    const stray: string[] = [];
    pic.each((p, x, y) => {
        if (
            (magenta(p) || blue(p)) &&
            !nodes.some((c) => Math.hypot(x - c.x, y - c.y) <= nodeBand) &&
            !segments.some(([a, b]) => toSegment(x, y, a, b) <= edgeBand)
        ) {
            stray.push(`${String(Math.round(x))},${String(Math.round(y))}`);
        }

        return stray.length < 5;
    });
    return stray;
}

/**
 * Whether one stable frame shows a pixel near a CSS point that passes a test: the color a style layer
 * paints on a node or an edge, read where it is drawn.
 * @param element - The element.
 * @param point - The point, in CSS pixels from the element's top-left corner.
 * @param test - The test, on an RGB pixel.
 * @returns True when a pixel within {@link REACH} of the point passes.
 */
export async function inkNear(
    element: Graphty,
    point: { x: number; y: number },
    test: (p: readonly number[]) => boolean,
): Promise<boolean> {
    return near(await picture(element), point.x, point.y, test);
}
