/**
 * How big a node that grows to hold its label is drawn (`shape.labelFit`): pure arithmetic over
 * its least size, its padding and its label's box, so the renderer and anything that predicts
 * what it draws agree. Nothing here reaches Babylon.js, Lit or the DOM.
 */
import type { NodeStyleConfig } from "../config/NodeStyle";
import { polygonPoints, polygonReach } from "./shapeOutlines";

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
 * by their reach again (corners that fall short of it still draw it in).
 *
 * `labelFitSquare` then makes both sides the larger one.
 * @param shape - The node's shape block.
 * @param box - Its label's box, in the units of its size.
 * @returns The width and height, or null when the node does not grow to hold its label.
 */
export function labelFitExtent(
    shape: NodeStyleConfig["shape"],
    box: LabelBox,
): { width: number; height: number } | null {
    if (shape?.labelFit === undefined) {
        return null;
    }

    const size = shape.size ?? 0;
    const least = { width: shape.width ?? size, height: shape.height ?? size };
    let width = box.width + 2 * (shape.labelPaddingX ?? 0);
    let height = box.height + 2 * (shape.labelPaddingY ?? 0);
    const type = shape.type ?? "";
    const polygon = type === "polygon" ? polygonPoints(shape.points) : null;
    if (shape.labelFit === "inside" && !BOXES.has(type)) {
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
    if (polygon !== null) {
        // corners drawn where they say reach past the box as they are drawn: only a shortfall counts here
        const drawnAsTheySay = shape.stretchPoints === false;
        const [reachX, reachY] = polygonReach(polygon).map((r) => (drawnAsTheySay ? Math.min(1, r) : r));
        width = Math.max(least.width, width * reachX);
        height = Math.max(least.height, height * reachY);
    }
    if (shape.labelFitSquare === true) {
        width = height = Math.max(width, height);
    }

    return { width, height };
}
