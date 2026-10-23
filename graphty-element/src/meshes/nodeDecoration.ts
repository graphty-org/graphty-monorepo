/**
 * @file The pieces drawn over a node's face: a pie's slices, a striped fill's bands and an image's
 * placement (`pie`, `stripes` and `image` of a node style), as plain geometry in the node's own
 * plane, centred on the node, y up. No Babylon.js, so it is tested on its own.
 */
import type { NodeStyleConfig } from "../config";
import { toColorValue } from "../session/styles/channels";
import { isPositive, type Point2, strokeLine } from "./shapeOutlines";

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
 * Words separated by spaces, a space inside parentheses kept: "rgb(1, 2, 3) red" is two. A space is inside
 * parentheses when the next parenthesis after it closes one. One pass each way, so no text takes longer than its
 * length.
 * @param text - The list.
 * @returns The words.
 */
export function cssWords(text: string | undefined): string[] {
    const s = (text ?? "").trim();
    // inside[i]: the first parenthesis at or after i closes one
    const inside = new Array<boolean>(s.length + 1).fill(false);
    for (let i = s.length - 1; i >= 0; i--) {
        inside[i] = s[i] === ")" || (s[i] !== "(" && inside[i + 1]);
    }
    const out: string[] = [];
    let word = "";
    for (let i = 0; i < s.length; i++) {
        if (inside[i] || !/\s/.test(s[i])) {
            word += s[i];
        } else if (word !== "") {
            out.push(word);
            word = "";
        }
    }
    if (word !== "") {
        out.push(word);
    }
    return out;
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
    const parsed = cssWords(colors).map((c) => toColorValue(c));
    const given = cssWords(sizes).map(Number);
    const alphas = cssWords(opacities).map(Number);
    const known = given.slice(0, parsed.length).filter((s) => Number.isFinite(s) && s >= 0);
    const unsized = parsed.length - known.length;
    const rest = unsized > 0 ? Math.max(0, 1 - known.reduce((a, b) => a + b, 0)) / unsized : 0;
    const out: Share[] = [];
    let used = 0;
    parsed.forEach((c, i) => {
        const s = Number.isFinite(given[i]) && given[i] >= 0 ? given[i] : rest;
        const size = Math.min(s, 1 - used);
        if (c === null || !isPositive(size)) {
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
        case "none":
            [w, h] = unfittedImageSize(image, { width, height }, [nw, nh], scale);
            break;
        default:
            break;
    }
    const x0 = -width / 2 + (image.positionX ?? 0.5) * (width - w) + (image.offsetX ?? 0) * scale;
    const y1 = height / 2 - (image.positionY ?? 0.5) * (height - h) - (image.offsetY ?? 0) * scale;
    return { x0, y0: y1 - h, x1: x0 + w, y1 };
}

/**
 * The size of an image a node does not fit it to (`fit: "none"`): its own pixels at the pixel size, or contained in
 * the node when it has none. A side left unset keeps the image's proportions to the one given, or with autoSize
 * "natural" is its own pixels; with neither side given, it is its pixels.
 * @param image - The node style's image block.
 * @param node - The node's width and height.
 * @param node.width - Its width.
 * @param node.height - Its height.
 * @param pixels - The image's own width and height, in pixels, above zero.
 * @param scale - The node's lengths per unit of the style's.
 * @returns The image's width and height.
 */
function unfittedImageSize(
    image: NonNullable<NodeStyleConfig["image"]>,
    node: { width: number; height: number },
    pixels: readonly [number, number],
    scale: number,
): [number, number] {
    const [nw, nh] = pixels;
    const px = (image.pixelSize ?? 0) * scale;
    const ownW = image.width === undefined ? undefined : image.width * scale;
    const ownH = image.height === undefined ? undefined : image.height * scale;
    const each = px > 0 ? px : Math.min(node.width / nw, node.height / nh);
    const natural = image.autoSize === "natural";
    if (ownW !== undefined) {
        return [ownW, ownH ?? (natural ? nh * each : (ownW * nh) / nw)];
    }
    if (ownH === undefined) {
        return [nw * each, nh * each];
    }
    return [natural ? nw * each : (ownH * nw) / nh, ownH];
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
    return withoutStraightCorners(out);
}

/**
 * An outline without its repeated points and the points in the middle of a straight run, which a cut leaves where
 * it runs along the box and which leave no ear to cut it into triangles by.
 * @param outline - The outline.
 * @returns It, with only its corners.
 */
function withoutStraightCorners(outline: readonly Point2[]): Point2[] {
    const out = [...outline];
    for (let changed = true; changed && out.length >= 3;) {
        changed = false;
        let i = 0;
        while (i < out.length && out.length >= 3) {
            const [a, p, b] = [out[(i + out.length - 1) % out.length], out[i], out[(i + 1) % out.length]];
            const cross = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
            const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (Math.abs(cross) <= 1e-9 * Math.max(span * span, 1e-12)) {
                out.splice(i, 1);
                changed = true;
            } else {
                i++;
            }
        }
    }
    return out.length >= 3 ? out : [];
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

/**
 * The rim a `database` node draws across its face: the near half of its top ellipse, in its border's color and
 * width, as vis-network draws its database and a flowchart its stored data. The ellipse is the outline's own (a
 * third of the height tall, `shapeOutlines`' database).
 * @param border - The node's border.
 * @param width - The face's width.
 * @param height - Its height.
 * @param scale - World units per unit of the border's width.
 * @returns The rim, or null with no border to draw it in.
 */
export function databaseRim(
    border: NodeStyleConfig["border"],
    width: number,
    height: number,
    scale = 1,
): ColorPiece | null {
    const line = (border?.width ?? 0) * scale;
    const color = border?.color === undefined ? null : toColorValue(border.color);
    const opacity = (border?.opacity ?? 1) * (color?.a ?? 1);
    if (!isPositive(line) || color === null || !isPositive(opacity)) {
        return null;
    }
    const [rx, ry] = [width / 2, height / 6];
    const cy = height / 2 - ry;
    const steps = TURN_STEPS / 2;
    // the lower half of the top ellipse (angles pi to 2 pi, y up), as a band the line's width across
    const arc = (grow: number): Point2[] =>
        Array.from({ length: steps + 1 }, (_, i): Point2 => {
            const t = Math.PI + (Math.PI * i) / steps;
            return [(rx + grow) * Math.cos(t), cy + (ry + grow) * Math.sin(t)];
        });
    const outer = arc(line / 2);
    const inner = arc(-line / 2).reverse();
    return {
        outline: [...outer, ...inner],
        rgb: [color.r / 255, color.g / 255, color.b / 255],
        opacity,
    };
}

/**
 * Lists of points as `node.shapeParts` and `node.shapeLines` write them: `x,y` pairs separated by spaces, one list
 * after another separated by ";". A list with a pair that is not two finite numbers is dropped.
 * @param text - The lists.
 * @returns The lists, in the units they were written in.
 */
export function pointLists(text: string | undefined): Point2[][] {
    return (text ?? "")
        .split(";")
        .map((list) =>
            list
                .trim()
                .split(/\s+/)
                .filter((pair) => pair !== "")
                .map((pair): Point2 => {
                    const [x, y, extra] = pair.split(",").map(Number);
                    return extra === undefined ? [x, y] : [Number.NaN, Number.NaN];
                }),
        )
        .filter((list) => list.length > 0 && list.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
}

/**
 * A color and an opacity as a piece takes them.
 * @param color - A CSS color, or none.
 * @param opacity - An opacity to draw it at, times its own alpha.
 * @returns Its red, green and blue and its opacity, or null for one that draws nothing.
 */
function paint(color: string | undefined, opacity = 1): Pick<ColorPiece, "rgb" | "opacity"> | null {
    const c = color === undefined ? null : toColorValue(color);
    const alpha = (c?.a ?? 1) * opacity;
    return c === null || !isPositive(alpha) ? null : { rgb: [c.r / 255, c.g / 255, c.b / 255], opacity: alpha };
}

/**
 * A polyline drawn `width` wide, centered on its points, as pieces: one four-cornered piece a side, each meeting the
 * next at the miter of their corner. One that ends where it starts is closed.
 * @param points - The points.
 * @param width - How wide.
 * @param color - Its color and opacity.
 * @returns The pieces.
 */
function linePieces(
    points: readonly Point2[],
    width: number,
    color: Pick<ColorPiece, "rgb" | "opacity">,
): ColorPiece[] {
    const [first, last] = [points[0], points.at(-1)];
    const closed = points.length > 2 && first[0] === last?.[0] && first[1] === last[1];
    const line = closed ? points.slice(0, -1) : points;
    if (line.length < 2 || !isPositive(width)) {
        return [];
    }
    const { inner, outer } = strokeLine(line, width, closed);
    const sides = closed ? line.length : line.length - 1;
    return Array.from({ length: sides }, (_, i): ColorPiece => {
        const j = (i + 1) % line.length;
        // counter-clockwise: outer is the side on the left of the line's direction
        return { outline: [inner[i], inner[j], outer[j], outer[i]], ...color };
    });
}

/**
 * The lines a flat node draws over itself (`shape.lines`), in its border's color, `shape.lineWidth` wide (else its
 * border's width), each list of points relative to the node's center as fractions of its half width and half height.
 * @param shape - The node's shape block.
 * @param border - The node's border.
 * @param width - The face's width.
 * @param height - Its height.
 * @param scale - World units per unit of the style's lengths.
 * @returns The pieces.
 */
export function shapeLinePieces(
    shape: NodeStyleConfig["shape"],
    border: NodeStyleConfig["border"],
    width: number,
    height: number,
    scale = 1,
): ColorPiece[] {
    const color = paint(border?.color, border?.opacity);
    const line = (shape?.lineWidth ?? border?.width ?? 0) * scale;
    if (color === null || !isPositive(line)) {
        return [];
    }
    return pointLists(shape?.lines).flatMap((list) =>
        linePieces(
            list.map(([x, y]): Point2 => [(x * width) / 2, (y * height) / 2]),
            line,
            color,
        ),
    );
}

/**
 * The further pieces of a flat node's body (`shape.parts`): each polygon filled in the node's color and outlined in
 * its border's color and width, centered on it, as the node is. A polygon of fewer than three points is dropped.
 * @param shape - The node's shape block.
 * @param border - The node's border.
 * @param fill - The node's fill color, or none for an unfilled node.
 * @param width - The face's width.
 * @param height - Its height.
 * @param scale - World units per unit of the style's lengths.
 * @param fillOpacity - The fill's opacity.
 * @returns The fills, and their outlines.
 */
export function shapePartPieces(
    shape: NodeStyleConfig["shape"],
    border: NodeStyleConfig["border"],
    fill: string | undefined,
    width: number,
    height: number,
    scale = 1,
    fillOpacity = 1,
): { fills: ColorPiece[]; lines: ColorPiece[] } {
    const parts = pointLists(shape?.parts)
        .filter((list) => list.length >= 3)
        .map((list) => {
            const placed = list.map(([x, y]): Point2 => [(x * width) / 2, (y * height) / 2]);
            const area = placed.reduce((sum, [x0, y0], i) => {
                const [x1, y1] = placed[(i + 1) % placed.length];
                return sum + x0 * y1 - x1 * y0;
            }, 0);
            return area < 0 ? placed.reverse() : placed;
        });
    const color = paint(fill, fillOpacity);
    const stroke = paint(border?.color, border?.opacity);
    const line = (border?.width ?? 0) * scale;
    return {
        fills: color === null ? [] : parts.map((outline) => ({ outline, ...color })),
        lines: stroke === null ? [] : parts.flatMap((outline) => linePieces([...outline, outline[0]], line, stroke)),
    };
}

/** A chart's piece: its paint and outline, the box a reader gives it, and whether it is only the outline of another. */
export type ChartPiece = ColorPiece & { readonly box?: PieceBox; readonly line?: boolean };

/** How wide a chart draws its lines when its style gives no width: this share of the plot's shorter side. */
const CHART_LINE_SHARE = 0.02;

/**
 * Numbers separated by spaces.
 * @param text - The list.
 * @returns The numbers, NaN for a word that is not one.
 */
function numbers(text: string | undefined): number[] {
    return cssWords(text).map(Number);
}

/**
 * A chart drawn over a node `width` x `height` (`chart` of a node style): bars side by side ("bar"), bars piled into
 * one ("stacked-bar"), a line through the values ("line"), a box and whiskers ("box": the values are the low
 * whisker, the lower quartile, the median, the upper quartile and the high whisker) or a row of colored cells
 * ("cells"). The plot is a box `size` times the node's, centered on it. Values run along one axis from `min` to `max`
 * (bottom to top, or with `horizontal` left to right); the values' categories along the other (left to right, or top
 * to bottom), each an equal share of it after `margin` at each end and `gap` between them. Item i is drawn in color
 * i of `colors`, the last one again for the rest; a box draws its whiskers in the first color too and its median in
 * the second. A bar and a box are outlined `borderWidth` wide in `borderColor`.
 * @param chart - The node style's chart block.
 * @param width - The node's width.
 * @param height - Its height.
 * @param scale - The node's lengths per unit of the style's, for its widths.
 * @returns The pieces, in drawing order.
 */
export function chartPieces(chart: NodeStyleConfig["chart"], width: number, height: number, scale = 1): ChartPiece[] {
    const values = numbers(chart?.values).filter((v) => Number.isFinite(v));
    const colors = cssWords(chart?.colors);
    if (chart === undefined || values.length === 0 || colors.length === 0) {
        return [];
    }
    const k = chart.size ?? 1;
    const [w, h] = [k * width, k * height];
    const horizontal = chart.horizontal === true;
    const kind = chart.kind ?? "bar";
    const lo = chart.min ?? Math.min(0, ...values);
    const top = kind === "stacked-bar" ? values.reduce((a, b) => a + Math.max(0, b), 0) : Math.max(...values);
    const hi = chart.max ?? (top > lo ? top : lo + 1);
    const along = (v: number): number => Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
    // a point at a share c along the categories and v along the values, in the node's plane (y up)
    const at = (c: number, v: number): Point2 =>
        horizontal ? [-w / 2 + v * w, h / 2 - c * h] : [-w / 2 + c * w, -h / 2 + v * h];
    const rect = (c0: number, c1: number, v0: number, v1: number): Point2[] => {
        const [a, b] = [at(c0, v0), at(c1, v1)];
        const [x0, x1, y0, y1] = [
            Math.min(a[0], b[0]),
            Math.max(a[0], b[0]),
            Math.min(a[1], b[1]),
            Math.max(a[1], b[1]),
        ];
        return [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
        ];
    };
    const color = (i: number): Pick<ColorPiece, "rgb" | "opacity"> | null =>
        paint(colors[Math.min(i, colors.length - 1)]);
    const lineWidth = chart.lineWidth === undefined ? CHART_LINE_SHARE * Math.min(w, h) : chart.lineWidth * scale;
    const border = paint(chart.borderColor);
    const borderWidth = (chart.borderWidth ?? 0) * scale;
    const filled = (outline: Point2[], c: Pick<ColorPiece, "rgb" | "opacity"> | null): ChartPiece[] => [
        // a bar of no length has no face to fill
        ...(c === null || boxOf(outline).x0 === boxOf(outline).x1 || boxOf(outline).y0 === boxOf(outline).y1
            ? []
            : [{ outline, ...c }]),
        // its outline is the bar's own, which a reader counts with the bar
        ...(border === null || !isPositive(borderWidth)
            ? []
            : linePieces([...outline, outline[0]], borderWidth, border).map((p) => ({ ...p, line: true }))),
    ];
    // a stroke inside the node (a line, a whisker, a median) is line work of the node's face, as a reader of a
    // program's drawing takes a stroke whose ends both land on one node: counted with the node, not as a piece
    const stroke = (points: Point2[], c: Pick<ColorPiece, "rgb" | "opacity"> | null): ChartPiece[] =>
        c === null ? [] : linePieces(points, lineWidth, c).map((p) => ({ ...p, line: true }));
    const margin = chart.margin ?? 0;
    const gap = Math.max(0, Math.min(1, chart.gap ?? 0));
    const slots = kind === "bar" || kind === "line" || kind === "cells" ? values.length : 1;
    const band = Math.max(0, 1 - 2 * margin - gap) / slots;
    const step = band + (slots > 1 ? gap / (slots - 1) : 0);
    const slot = (i: number): [number, number] => [margin + i * step, margin + i * step + band];
    const base = along(Math.max(lo, Math.min(hi, 0)));
    switch (kind) {
        case "bar":
            return values.flatMap((v, i) => filled(rect(...slot(i), base, along(v)), color(i)));
        case "stacked-bar": {
            let sum = 0;
            return values.flatMap((v, i) => {
                const from = along(sum);
                sum += Math.max(0, v);
                return filled(rect(...slot(0), from, along(sum)), color(i));
            });
        }
        case "cells":
            return values.flatMap((_, i) => filled(rect(...slot(i), 0, 1), color(i)));
        case "line": {
            const points = values.map((v, i) => at((slot(i)[0] + slot(i)[1]) / 2, along(v)));
            return points.slice(1).flatMap((p, i) => stroke([points[i], p], color(0)));
        }
        case "box": {
            const [low, q1, median, q3, high] = [0, 1, 2, 3, 4].map((j) => values[Math.min(j, values.length - 1)]);
            const [c0, c1] = slot(0);
            const mid = (c0 + c1) / 2;
            const fill = color(0);
            return [
                ...stroke([at(mid, along(high)), at(mid, along(q3))], fill),
                ...stroke([at(c0, along(high)), at(c1, along(high))], fill),
                ...stroke([at(mid, along(low)), at(mid, along(q1))], fill),
                ...stroke([at(c0, along(low)), at(c1, along(low))], fill),
                ...filled(rect(c0, c1, along(q1), along(q3)), fill),
                ...stroke(
                    [at(c0, along(median)), at(c1, along(median))],
                    colors.length > 1 ? color(1) : paint("#000000"),
                ),
            ];
        }
        default:
            return [];
    }
}
