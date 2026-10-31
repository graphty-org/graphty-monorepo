/**
 * How big a node that grows to hold its label is drawn (`shape.labelFit`): pure arithmetic over
 * its least size, its padding and its label's box, so the renderer and anything that predicts
 * what it draws agree. Nothing here reaches Babylon.js, Lit or the DOM.
 */
import type { NodeStyleConfig } from "../config/NodeStyle";
import { type Point2, polygonReach, type ShapePoint, shapePointList } from "./shapeOutlines";

/** A label's box: as wide as its widest line, as tall as its lines at one font size each. */
export interface LabelBox {
    /** The width, in the units of `shape.size`. */
    readonly width: number;
    /** The height, in the units of `shape.size`. */
    readonly height: number;
}

/**
 * The shapes whose outline is their bounding box, so a box inside them is as large as they are. A
 * bodiless `none` node keeps its box, as Graphviz's `shape=none` (a plaintext box) does.
 */
const BOXES: ReadonlySet<string> = new Set(["rectangle", "round-rectangle", "box", "none"]);

/** The regular polygons, by their number of sides: a box inside one reaches 1 / cos(pi / sides) less far. */
const SIDES: ReadonlyMap<string, number> = new Map([
    ["triangle", 3],
    ["diamond", 4],
    ["pentagon", 5],
    ["hexagon", 6],
    ["octagon", 8],
]);

/**
 * The width and height a node that grows to hold its label is drawn at, in the units of its size:
 * at least its own `width` and `height` (else its `size`), and large enough for its label's box
 * padded by `labelPaddingX` and `labelPaddingY` on each side.
 *
 * - "bounds": the padded box is the node's width and height.
 * - "inside": the padded box fits inside the outline. A box-shaped node is the box; any other is
 *   the ellipse through the box's corners -- of the node's least height when that is taller than
 *   the box by more than the square root of 2, otherwise the box scaled by that root both ways --
 *   and a regular polygon reaches out by 1 / cos(pi / sides) more. This is Graphviz's
 *   `poly_init` (lib/common/shapes.c).
 *
 * A "polygon" counts its corners (`shape.points`) as its sides, and once at least its least size
 * it grows by as far as its corners reach past its half width and half height, as Graphviz grows
 * a distorted or skewed polygon. Corners drawn where they say (`shape.stretchPoints` false) already
 * reach that far past the box they are fractions of when they are drawn, so that box is not grown
 * by their reach again (corners that fall short of it still draw it in). Corners that add lengths to their fractions
 * (`-1+24`) are drawn against the box whatever its size, so their reach changes nothing.
 *
 * A star grows until the box fits between its arms (Graphviz's `star_size`).
 *
 * `labelFitQuantum` first rounds the padded box up to a multiple of it each way. `labelFitSquare` then makes both
 * sides the larger one.
 *
 * With `labelFitImage`, the node's picture is held too: its own pixels, each `labelFitImage` long, padded by
 * `labelFitImagePadding` on each side, and the larger of the padded label and the padded picture decides each way
 * (Graphviz's `poly_init`, a node's `image`).
 * @param shape - The node's shape block.
 * @param box - Its label's box, in the units of its size.
 * @param picture - Its picture's own width and height in pixels, when it has one and it is known.
 * @returns The width and height, or null when the node does not grow to hold its label.
 */
export function labelFitExtent(
    shape: NodeStyleConfig["shape"],
    box: LabelBox,
    picture: LabelBox | null = null,
): { width: number; height: number } | null {
    if (shape?.labelFit === undefined) {
        return null;
    }

    const size = shape.size ?? 0;
    const least = { width: shape.width ?? size, height: shape.height ?? size };
    // the padded box, rounded up to a multiple of the quantum each way (Graphviz's `quant`)
    const q = shape.labelFitQuantum ?? 0;
    const quantize = (v: number): number => (q > 0 ? Math.ceil(v / q) * q : v);
    const held = heldBox(shape, box, picture);
    let width = quantize(held.width);
    let height = quantize(held.height);
    const type = shape.type ?? "";
    const corners = type === "polygon" ? shapePointList(shape.points) : null;
    const polygon = corners !== null && corners.length >= 3 ? corners : null;
    if (shape.labelFit === "inside" && type === "star") {
        ({ width, height } = starAround(width, height));
    } else if (shape.labelFit === "inside" && !BOXES.has(type)) {
        if (height > 0 && least.height > Math.SQRT2 * height) {
            width /= Math.sqrt(1 - (height / least.height) ** 2);
        } else {
            width *= Math.SQRT2;
            height *= Math.SQRT2;
        }

        const sides = polygon?.length ?? SIDES.get(type);
        if (sides !== undefined) {
            const reach = Math.cos(Math.PI / sides);
            width /= reach;
            height /= reach;
        }
    }

    width = Math.max(least.width, width);
    height = Math.max(least.height, height);
    ({ width, height } = reachedBox(shape, polygon, { width, height }, least));
    if (shape.labelFitSquare === true) {
        width = height = Math.max(width, height);
    }

    return { width, height };
}

/**
 * The padded box a node holds: its label's, or its picture's where that is larger.
 * @param shape - The node's shape block.
 * @param box - Its label's box.
 * @param picture - Its picture's own width and height in pixels, or null.
 * @returns The padded box.
 */
function heldBox(shape: NonNullable<NodeStyleConfig["shape"]>, box: LabelBox, picture: LabelBox | null): Extent {
    const width = box.width + 2 * (shape.labelPaddingX ?? 0);
    const height = box.height + 2 * (shape.labelPaddingY ?? 0);
    const each = shape.labelFitImage ?? 0;
    if (picture === null || each <= 0) {
        return { width, height };
    }
    const pad = 2 * (shape.labelFitImagePadding ?? 0);
    return {
        width: Math.max(width, picture.width * each + pad),
        height: Math.max(height, picture.height * each + pad),
    };
}

/** A width and a height. */
interface Extent {
    width: number;
    height: number;
}

/**
 * A fitted polygon's box grown by as far as its corners reach past it, or drawn in by as far as they fall short when
 * they are drawn where they say. Corners with lengths are drawn against the box whatever its size, so they neither
 * grow it nor draw it in.
 * @param shape - The node's shape block.
 * @param polygon - Its corners, or null for another shape.
 * @param box - The fitted box.
 * @param least - The node's least size.
 * @returns The box.
 */
function reachedBox(
    shape: NonNullable<NodeStyleConfig["shape"]>,
    polygon: ShapePoint[] | null,
    box: Extent,
    least: Extent,
): Extent {
    if (polygon?.every(([, xLength, , yLength]) => xLength === 0 && yLength === 0) !== true) {
        return box;
    }
    // corners drawn where they say reach past the box as they are drawn: only a shortfall counts here
    const drawnAsTheySay = shape.stretchPoints === false;
    const [reachX, reachY] = polygonReach(polygon.map(([x, , y]): Point2 => [x, y])).map((r) =>
        drawnAsTheySay ? Math.min(1, r) : r,
    );
    return { width: Math.max(least.width, box.width * reachX), height: Math.max(least.height, box.height * reachY) };
}

/**
 * The bounding box of the five-pointed star that holds a box between its arms (Graphviz's `star_size`,
 * lib/common/shapes.c): the outer radius that holds the box's half width and height, its points' box.
 * @param width - The box's width.
 * @param height - The box's height.
 * @returns The star's width and height.
 */
function starAround(width: number, height: number): { width: number; height: number } {
    const a = Math.PI / 10;
    const r0 = Math.max(width / (2 * Math.cos(a)), height / (Math.sin(a) + Math.sin(3 * a)));
    const r = (r0 * Math.sin(4 * a) * Math.cos(2 * a)) / (Math.cos(a) * Math.cos(4 * a));
    return { width: 2 * r * Math.cos(a), height: r * (1 + Math.sin(3 * a)) };
}
