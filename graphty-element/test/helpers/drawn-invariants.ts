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

/**
 * How far a self-loop's ink may reach from its node's center, in node radii: a loop of a node of
 * size 1 is a ring of radius 2 scene units round a point outside the node (EdgeMesh.SELF_LOOP_RADIUS).
 */
const LOOP_REACH = 10;

/** One frame and how to read it at a CSS point. */
export interface Picture {
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
    return pictureOf(element, await readFrame(element.graph));
}

/**
 * A frame already read off the element's canvas, as a picture the checks below read: a frame read
 * inside `scene.onAfterRenderObservable` while the nodes move (test/helpers/drawn-frames.ts).
 * @param element - The element the frame was read from.
 * @param frame - The frame.
 * @returns The picture.
 */
export function pictureOf(element: Graphty, frame: Frame): Picture {
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

/** How far apart a pixel's strongest and weakest channels must be for its hue to count: off gray. */
const CHROMA = 6;

/**
 * A pixel's hue in degrees, or undefined for a pixel too gray to have one. Hue, not brightness, tells
 * the inks apart: a thin antialiased line in a zoomed-out view is a faint tint of its color.
 * @param p - The pixel.
 * @returns The hue, 0 to 360.
 */
function hue(p: readonly number[]): number | undefined {
    const [r, g, b] = p;
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    if (chroma < CHROMA) {
        return undefined;
    }

    if (max === r) {
        return (((g - b) / chroma + 6) % 6) * 60;
    }

    return (max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4) * 60;
}

/**
 * Whether a pixel is the edges' magenta (#ff00ff, hue 300), or magenta blended into its neighbors.
 * @param p - The pixel.
 * @returns True when its hue is near magenta's.
 */
function magentaHue(p: readonly number[]): boolean {
    const h = hue(p);
    return h !== undefined && h >= 280 && h <= 320;
}

/**
 * Whether a pixel is the nodes' blue (#2040ff, hue 228), lit or blended.
 * @param p - The pixel.
 * @returns True when its hue is near the nodes' blue.
 */
function blueHue(p: readonly number[]): boolean {
    const h = hue(p);
    return h !== undefined && h >= 210 && h <= 250;
}

/**
 * Whether a pixel is ink of neither the edges' nor the nodes' hue: a label's box, say.
 * @param p - The pixel.
 * @returns True when it has a hue and it is neither.
 */
function other(p: readonly number[]): boolean {
    return hue(p) !== undefined && !magentaHue(p) && !blueHue(p);
}

/**
 * Whether a pixel is strongly the edges' magenta (#ff00ff): red and blue both lead green by 60. Stricter than
 * the hue test above, which also takes a faint antialiased tint.
 * @param p - The pixel.
 * @returns True when red and blue both lead green.
 */
export function magenta(p: readonly number[]): boolean {
    return p[0] > p[1] + 60 && p[2] > p[1] + 60;
}

/**
 * Whether a pixel is strongly the nodes' blue (#2040ff): blue leads red and green by 60.
 * @param p - The pixel.
 * @returns True when blue leads red and green.
 */
export function blue(p: readonly number[]): boolean {
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
 * @param given - A frame already read, else the next stable frame is read.
 * @returns The ids of those not drawn.
 */
export async function undrawnNodes(element: Graphty, ids: readonly string[], given?: Picture): Promise<string[]> {
    const pic = given ?? (await picture(element));
    const bg = pic.background;
    const ink = (p: readonly number[]): boolean =>
        !magentaHue(p) && Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60;
    return ids.filter((id) => {
        const at = center(element, id);
        return at === undefined || !near(pic, at.x, at.y, ink);
    });
}

/**
 * The edges with no magenta ink at some point along the segment between their nodes' drawn
 * centers: an edge not drawn, or drawn somewhere other than between its nodes as drawn. A point
 * that lies under any listed edge's node, or under ink of a third hue (a label's box), is not read:
 * that is drawn over the edge there.
 * @param element - The element.
 * @param pairs - The edges, as source and target ids.
 * @param given - A frame already read, else the next stable frame is read.
 * @returns The pairs not drawn between their nodes.
 */
export async function undrawnEdges(
    element: Graphty,
    pairs: readonly (readonly [string, string])[],
    given?: Picture,
): Promise<(readonly [string, string])[]> {
    const pic = given ?? (await picture(element));
    const centers = [...new Set(pairs.flat())].flatMap((id) => center(element, id) ?? []);
    const reach = drawnRadius(pic, centers) + SLACK;
    const covered = (x: number, y: number): boolean => centers.some((c) => Math.hypot(x - c.x, y - c.y) <= reach);
    return pairs.filter(([src, dst]) => {
        if (src === dst) {
            // A self-loop has no segment between two centers: strayInk bounds its ink instead.
            return false;
        }

        const a = center(element, src);
        const b = center(element, dst);
        return (
            a === undefined ||
            b === undefined ||
            ALONG.some((t) => {
                const x = a.x + (b.x - a.x) * t;
                const y = a.y + (b.y - a.y) * t;
                // A point under a node, or under other ink drawn over the edge (its label's box),
                // shows that instead: it tells nothing.
                return !covered(x, y) && !near(pic, x, y, other) && !near(pic, x, y, magenta);
            })
        );
    });
}

/**
 * The largest node's drawn radius, walked out from each center while the pixels stay node blue:
 * the camera frames each pose afresh, so a fixed band would not fit both a wide ring and a narrow one.
 * @param pic - The picture.
 * @param centers - The nodes' drawn centers.
 * @returns The radius, in CSS pixels.
 */
export function drawnRadius(pic: Picture, centers: readonly { x: number; y: number }[]): number {
    return Math.max(
        0,
        ...centers.flatMap((c) =>
            [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ].map(([dx, dy]) => {
                let r = 0;
                while (blueHue(pic.at(c.x + dx * (r + 1), c.y + dy * (r + 1)) ?? [0, 0, 0])) {
                    r++;
                }

                return r;
            }),
        ),
    );
}

/**
 * The directed edges whose line or arrowhead does not reach their target as drawn: no edge ink just
 * outside the target's drawn outline on the side the edge comes from.
 * @param element - The element.
 * @param pairs - The directed edges, as source and target ids.
 * @param given - A frame already read, else the next stable frame is read.
 * @returns The pairs whose tip is away from their target.
 */
export async function arrowTipsOff(
    element: Graphty,
    pairs: readonly (readonly [string, string])[],
    given?: Picture,
): Promise<(readonly [string, string])[]> {
    const pic = given ?? (await picture(element));
    return pairs.filter(([src, dst]) => {
        const a = center(element, src);
        const b = center(element, dst);
        if (a === undefined || b === undefined) {
            return true;
        }

        // The target's own radius: in 3D a far node is drawn smaller than a near one.
        const reach = drawnRadius(pic, [b]) + SLACK;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length <= 2 * reach) {
            // Nodes drawn on top of each other leave no room for a tip to be told from its node.
            return false;
        }

        const x = b.x - ((b.x - a.x) * reach) / length;
        const y = b.y - ((b.y - a.y) * reach) / length;
        // Another node drawn over the tip hides it.
        const hidden = blueHue(pic.at(x, y) ?? [0, 0, 0]);
        return !hidden && !near(pic, x, y, magenta);
    });
}

/**
 * Node or edge ink drawn away from every node and edge where it belongs: a drawing left behind,
 * such as edges on the poses a transition passed or a view's edges after a switch.
 * @param element - The element.
 * @param ids - Every node loaded.
 * @param pairs - Every edge loaded, as source and target ids; a self-loop, as its node twice, may
 *   reach {@link LOOP_REACH} node radii from its node.
 * @param given - A frame already read, else the next stable frame is read.
 * @param hiddenAt - Where nodes that are not drawn sit on screen, for an edge still drawn to one.
 * @returns Up to five stray points, in CSS pixels, rounded.
 */
export async function strayInk(
    element: Graphty,
    ids: readonly string[],
    pairs: readonly (readonly [string, string])[],
    given?: Picture,
    hiddenAt?: ReadonlyMap<string, { x: number; y: number }>,
): Promise<string[]> {
    const pic = given ?? (await picture(element));
    const at = new Map(ids.map((id) => [id, center(element, id)]));
    const end = (id: string): { x: number; y: number } | undefined => at.get(id) ?? hiddenAt?.get(id);
    const nodes = [...at.values()].filter((c) => c !== undefined);
    const radius = drawnRadius(pic, nodes);
    // An arrowhead's wing is about a node's radius from its line; a plain line is narrower.
    const nodeBand = radius + SLACK;
    const edgeBand = radius + SLACK;
    const segments = pairs.flatMap(([src, dst]) => {
        const a = end(src);
        const b = end(dst);
        return a === undefined || b === undefined || src === dst ? [] : [[a, b] as const];
    });
    const loops = pairs.flatMap(([src, dst]) => {
        const a = at.get(src);
        return a === undefined || src !== dst ? [] : [a];
    });
    const stray: string[] = [];
    pic.each((p, x, y) => {
        if (
            (magentaHue(p) || blueHue(p)) &&
            !nodes.some((c) => Math.hypot(x - c.x, y - c.y) <= nodeBand) &&
            !segments.some(([a, b]) => toSegment(x, y, a, b) <= edgeBand) &&
            !loops.some((c) => Math.hypot(x - c.x, y - c.y) <= radius * LOOP_REACH + SLACK)
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

/** A point in layout space. */
export interface Place {
    x: number;
    y: number;
    z: number;
}

/**
 * Where the layout has each node now, in layout space (no camera in it), read back through `session.positions`.
 * @param element - The element.
 * @param ids - The nodes.
 * @returns Each node's place.
 */
export function layoutPlaces(element: Graphty, ids: readonly string[]): Map<string, Place> {
    const { ids: index } = element.session.snapshot();
    return new Map(
        ids.map((id) => {
            const place = { x: 0, y: 0, z: 0 };
            element.session.positions.read(index.requireIndex(id), place);
            return [id, place] as const;
        }),
    );
}

/**
 * The furthest any node moved between two readings.
 * @param from - The earlier places.
 * @param to - The later places, of the same nodes or fewer.
 * @returns The distance.
 */
export function furthestMove(from: ReadonlyMap<string, Place>, to: ReadonlyMap<string, Place>): number {
    let worst = 0;
    for (const [id, b] of to) {
        const a = from.get(id);
        worst = Math.max(worst, a === undefined ? Infinity : Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    }

    return worst;
}

/**
 * How far one kept node may move across an edit, as a multiple of the median kept node's move: an edit that
 * reloads a running simulation moves every node about alike (by the build from before the renderer optimizations
 * too), while a node handed another row's place jumps by the distance between two nodes.
 */
const JUMP_SPREAD = 2;
/** How many times further than the fastest node moved in the frame before an edit a node may move per frame across it. */
const STEP_SPEEDUP = 3;

/**
 * Whether every node an edit kept kept its own place: none moved further than the frames drawn across the edit
 * allow at the layout's speed before it, or than twice the median kept node's move.
 * @param before - Each kept node's place just before the edit.
 * @param after - Each kept node's place just after it.
 * @param speed - The furthest any node moved in the frame before the edit.
 * @param drawn - Frames drawn across the edit.
 * @returns "" when every kept node kept its place; otherwise the worst nodes and the bound.
 */
export function keptPlaceJump(
    before: ReadonlyMap<string, Place>,
    after: ReadonlyMap<string, Place>,
    speed: number,
    drawn: number,
): string {
    const moves = [...after].map(([id, b]) => {
        const a = before.get(id);
        return { id, d: a === undefined ? Infinity : Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) };
    });
    const sorted = moves.map(({ d }) => d).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const bound = Math.max(JUMP_SPREAD * median, (drawn + 1) * STEP_SPEEDUP * speed);
    const far = moves.filter(({ d }) => d > bound).sort((a, b) => b.d - a.d);
    return far.length === 0
        ? ""
        : `${String(far.length)} kept nodes jumped past ${bound.toFixed(2)} (median move ${median.toFixed(2)}, ${String(drawn)} frames at up to ${speed.toFixed(2)} a frame before): ${far
              .slice(0, 6)
              .map(({ id, d }) => `${id} ${d.toFixed(2)}`)
              .join(", ")}`;
}

/** How many times longer or shorter than before an edit an edge whose two nodes the edit kept may become. */
const EDGE_STRETCH = 3;

/**
 * Whether every edge an edit kept still joins two nodes about as far apart as before it, in layout space: a
 * layout pulls joined nodes together, so an edge whose ends were handed other rows' places is suddenly as long as
 * the distance between two unjoined nodes. A layout that moves its nodes far between landings (a GPU layout) still
 * keeps joined nodes close, which a check on each node's own move cannot rely on.
 * @param before - Each kept node's place just before the edit.
 * @param after - Each kept node's place just after it.
 * @param pairs - The edges the edit kept.
 * @returns "" when every kept edge kept its length within {@link EDGE_STRETCH} times; otherwise the worst edges.
 */
export function keptEdgeStretch(
    before: ReadonlyMap<string, Place>,
    after: ReadonlyMap<string, Place>,
    pairs: readonly (readonly [string, string])[],
): string {
    const length = (at: ReadonlyMap<string, Place>, a: string, b: string): number | undefined => {
        const p = at.get(a);
        const q = at.get(b);
        return p === undefined || q === undefined ? undefined : Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    };
    const stretched = pairs.flatMap(([a, b]) => {
        const was = length(before, a, b);
        const now = length(after, a, b);
        if (was === undefined || now === undefined || a === b) {
            return [];
        }

        const ratio = now / Math.max(was, 1e-6);
        return ratio > EDGE_STRETCH || ratio < 1 / EDGE_STRETCH ? [{ a, b, was, now, ratio }] : [];
    });
    stretched.sort((x, y) => Math.abs(Math.log(y.ratio)) - Math.abs(Math.log(x.ratio)));
    return stretched.length === 0
        ? ""
        : `${String(stretched.length)} of ${String(pairs.length)} kept edges changed length more than ${String(EDGE_STRETCH)} times: ${stretched
              .slice(0, 6)
              .map(({ a, b, was, now }) => `${a}-${b} ${was.toFixed(1)} to ${now.toFixed(1)}`)
              .join(", ")}`;
}
