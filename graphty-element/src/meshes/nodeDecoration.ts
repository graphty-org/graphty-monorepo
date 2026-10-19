/**
 * @file The pieces drawn over a node's face: a pie's slices, a striped fill's bands and an image's
 * placement (`pie`, `stripes` and `image` of a node style), as plain geometry in the node's own
 * plane, centred on the node, y up. No Babylon.js, so it is tested on its own.
 */
import type { NodeStyleConfig } from "../config";
import { toColorValue } from "../session/styles/channels";
import type { Point2 } from "./shapeOutlines";

/** One colored piece over a node's face. */
export interface ColorPiece {
    readonly outline: readonly Point2[];
    /** Red, green and blue, 0..1. */
    readonly rgb: readonly [number, number, number];
    /** 0..1. */
    readonly opacity: number;
}

/** A box in the node's plane, y up. */
export interface PieceBox {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
}

/** How many points a full turn of a pie is drawn with. */
const TURN_STEPS = 96;

/**
 * Words separated by spaces, a space inside parentheses kept: "rgb(1, 2, 3) red" is two.
 * @param text - The list.
 * @returns The words.
 */
function words(text: string | undefined): string[] {
    return (text ?? "")
        .trim()
        .split(/\s+(?![^(]*\))/)
        .filter((w) => w !== "");
}

/** One slice or band: its color, its share and its opacity. */
interface Share {
    readonly rgb: readonly [number, number, number];
    readonly alpha: number;
    readonly size: number;
}

/**
 * The colors of a pie or a striped fill with their shares and opacities: one per color that parses,
 * its share from `sizes` (fractions of the whole) or, without one, an equal part of what the given
 * shares leave; the shares stop where they reach the whole.
 * @param colors - CSS colors separated by spaces.
 * @param sizes - Fractions separated by spaces.
 * @param opacities - Opacities separated by spaces.
 * @returns The shares, in order.
 */
function sharesOf(colors?: string, sizes?: string, opacities?: string): Share[] {
    const parsed = words(colors).map((c) => toColorValue(c));
    const given = words(sizes).map(Number);
    const alphas = words(opacities).map(Number);
    const known = given.slice(0, parsed.length).filter((s) => Number.isFinite(s) && s >= 0);
    const unsized = parsed.length - known.length;
    const rest = unsized > 0 ? Math.max(0, 1 - known.reduce((a, b) => a + b, 0)) / unsized : 0;
    const out: Share[] = [];
    let used = 0;
    parsed.forEach((c, i) => {
        const s = Number.isFinite(given[i]) && given[i] >= 0 ? given[i] : rest;
        const size = Math.min(s, 1 - used);
        if (c === null || !(size > 0)) {
            return;
        }
        used += size;
        const a = Number.isFinite(alphas[i]) ? Math.max(0, Math.min(1, alphas[i])) : 1;
        out.push({ rgb: [c.r / 255, c.g / 255, c.b / 255], alpha: c.a * a, size });
    });
    return out;
}

/**
 * A pie's slices over a node `width` x `height`: a disc of `radius` times half the shorter side (or
 * the ellipse filling the box, with `fitBox`), cut from `rotation` degrees clockwise from 12
 * o'clock round clockwise, each slice its share of the turn; with a `hole` (a fraction of the
 * radius) each slice is a piece of a ring.
 * @param pie - The node style's pie block.
 * @param width - The node's width.
 * @param height - Its height.
 * @param scale - The node's lengths per unit of the style's, for its offsets.
 * @returns The slices, counter-clockwise outlines, in drawing order.
 */
export function pieSlices(pie: NodeStyleConfig["pie"], width: number, height: number, scale = 1): ColorPiece[] {
    if (pie === undefined) {
        return [];
    }
    const k = pie.radius ?? 1;
    const [rx, ry] =
        pie.fitBox === true
            ? [(k * width) / 2, (k * height) / 2]
            : [(k * Math.min(width, height)) / 2, (k * Math.min(width, height)) / 2];
    const hole = Math.max(0, Math.min(1, pie.hole ?? 0));
    if (!(rx > 0 && ry > 0) || hole >= 1) {
        return [];
    }
    // its center moved by its offsets, y down on screen
    const [cx, cy] = [(pie.offsetX ?? 0) * scale, -(pie.offsetY ?? 0) * scale];
    // clockwise on screen from 12 o'clock, in the plane's y-up angles
    const at = (turn: number, r: number): Point2 => {
        const t = Math.PI / 2 - ((pie.rotation ?? 0) * Math.PI) / 180 - 2 * Math.PI * turn;
        return [cx + r * rx * Math.cos(t), cy + r * ry * Math.sin(t)];
    };
    let from = 0;
    return sharesOf(pie.colors, pie.sizes, pie.opacities).map((s) => {
        const steps = Math.max(2, Math.ceil(s.size * TURN_STEPS));
        // the outer arc walks clockwise; reversed, the outline runs counter-clockwise
        const outer = Array.from({ length: steps + 1 }, (_, i) => at(from + (s.size * i) / steps, 1));
        const inner =
            hole > 0
                ? Array.from({ length: steps + 1 }, (_, i) => at(from + (s.size * (steps - i)) / steps, hole))
                : [[cx, cy] as Point2];
        from += s.size;
        return { outline: [...outer, ...inner].reverse(), rgb: s.rgb, opacity: s.alpha };
    });
}

/**
 * A striped fill's bands over a node `width` x `height`: bands following one another top to bottom
 * (`direction` "down", the default) or left to right ("right"), each its share of the box, over a
 * box `size` times the node's, centred on it.
 * @param stripes - The node style's stripes block.
 * @param width - The node's width.
 * @param height - Its height.
 * @returns The bands as boxes with their paint, in drawing order.
 */
export function stripeBands(
    stripes: NodeStyleConfig["stripes"],
    width: number,
    height: number,
): { box: PieceBox; rgb: readonly [number, number, number]; opacity: number }[] {
    if (stripes === undefined) {
        return [];
    }
    const k = stripes.size ?? 1;
    const [w, h] = [k * width, k * height];
    let from = 0;
    return sharesOf(stripes.colors, stripes.sizes, stripes.opacities).map((s) => {
        const box =
            stripes.direction === "right"
                ? { x0: -w / 2 + from * w, x1: -w / 2 + (from + s.size) * w, y0: -h / 2, y1: h / 2 }
                : { x0: -w / 2, x1: w / 2, y1: h / 2 - from * h, y0: h / 2 - (from + s.size) * h };
        from += s.size;
        return { box, rgb: s.rgb, opacity: s.alpha };
    });
}

/**
 * Where an image is drawn over a node `width` x `height`, from the image's own size: fitted
 * (`fit` "contain", the default, keeps its proportions inside the node; "cover" keeps them over the
 * whole node; "fill" stretches it to the node) or at its own size ("none": `width` and `height`, or
 * its pixels at `pixelSize` each), placed at `positionX` / `positionY` across the room left over (0
 * the left or top, 0.5 the middle, 1 the right or bottom) and moved by `offsetX` / `offsetY` (y
 * down, as on screen). Lengths are the node's; `scale` turns the style's into them.
 * @param image - The node style's image block.
 * @param width - The node's width.
 * @param height - Its height.
 * @param natural - The image's own width and height, in pixels.
 * @param natural.width - Its width.
 * @param natural.height - Its height.
 * @param scale - The node's lengths per unit of the style's.
 * @returns The image's box.
 */
export function imageBox(
    image: NonNullable<NodeStyleConfig["image"]>,
    width: number,
    height: number,
    natural: { width: number; height: number },
    scale: number,
): PieceBox {
    const [nw, nh] = [Math.max(natural.width, 1e-9), Math.max(natural.height, 1e-9)];
    let [w, h] = [width, height];
    switch (image.fit ?? "contain") {
        case "contain":
        case "cover": {
            const pick = image.fit === "cover" ? Math.max : Math.min;
            const f = pick(width / nw, height / nh);
            [w, h] = [nw * f, nh * f];
            break;
        }
        case "none": {
            const px = (image.pixelSize ?? 0) * scale;
            const ownW = image.width === undefined ? undefined : image.width * scale;
            const ownH = image.height === undefined ? undefined : image.height * scale;
            // its own pixels at the pixel size, or contained in the node when it has none
            const each = px > 0 ? px : Math.min(width / nw, height / nh);
            // a side left unset keeps the image's proportions to the one given, or is its pixels
            if (ownW !== undefined) {
                [w, h] = [ownW, ownH ?? (ownW * nh) / nw];
            } else if (ownH === undefined) {
                [w, h] = [nw * each, nh * each];
            } else {
                [w, h] = [(ownH * nw) / nh, ownH];
            }
            break;
        }
        default:
            break;
    }
    const x0 = -width / 2 + (image.positionX ?? 0.5) * (width - w) + (image.offsetX ?? 0) * scale;
    const y1 = height / 2 - (image.positionY ?? 0.5) * (height - h) - (image.offsetY ?? 0) * scale;
    return { x0, y0: y1 - h, x1: x0 + w, y1 };
}

/**
 * The part of an outline inside a box (Sutherland-Hodgman): the box is convex, so any outline,
 * convex or not, is cut to the region the two share.
 * @param outline - The outline, counter-clockwise.
 * @param box - The box; an unbounded side is +-Infinity.
 * @returns The outline of what is inside, counter-clockwise, possibly empty.
 */
export function clipToBox(outline: readonly Point2[], box: PieceBox): Point2[] {
    const edges: [(p: Point2) => number, (a: Point2, b: Point2) => Point2][] = [];
    const cut = (axis: 0 | 1, at: number, keepAbove: boolean): void => {
        if (!Number.isFinite(at)) {
            return;
        }
        edges.push([
            (p) => (keepAbove ? p[axis] - at : at - p[axis]),
            (a, b) => {
                const t = (at - a[axis]) / (b[axis] - a[axis]);
                return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
            },
        ]);
    };
    cut(0, box.x0, true);
    cut(0, box.x1, false);
    cut(1, box.y0, true);
    cut(1, box.y1, false);
    let out: Point2[] = [...outline];
    for (const [side, cross] of edges) {
        const kept: Point2[] = [];
        out.forEach((p, i) => {
            const q = out[(i + 1) % out.length];
            const [sp, sq] = [side(p), side(q)];
            if (sp >= 0) {
                kept.push(p);
            }
            if (sp >= 0 !== sq >= 0) {
                kept.push(cross(p, q));
            }
        });
        out = kept;
    }
    return out;
}

/**
 * The box an outline fills.
 * @param outline - The outline.
 * @returns Its box.
 */
export function boxOf(outline: readonly Point2[]): PieceBox {
    const xs = outline.map(([x]) => x);
    const ys = outline.map(([, y]) => y);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
