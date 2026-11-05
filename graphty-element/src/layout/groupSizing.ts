/**
 * @file The box a group drawn round its members takes when its style sizes it (`node.group*`), as
 * Cytoscape.js 3.34.3 sizes a compound parent (`updateCompoundBounds`): the members' box made at
 * least the minimum size, the growth split by the biases, then padded on every side. Pure, so the
 * layout and its tests share it.
 */

import type { NodeStyleConfig } from "../config";

/** A group's sizing, its `group` style. */
export type GroupSizing = NonNullable<NodeStyleConfig["group"]>;

/** A box by its center and its half extents on every axis. */
export interface SizedBox {
    readonly center: { readonly x: number; readonly y: number; readonly z: number };
    readonly half: { readonly x: number; readonly y: number; readonly z: number };
}

/**
 * The padding a sizing asks for round a members' box `w` by `h`: a length, or a fraction of the
 * box's side `paddingOf` names (none of a side of no size, as Cytoscape.js gives none).
 * @param sizing - The sizing.
 * @param w - The members' box's width.
 * @param h - Its height.
 * @returns The padding.
 */
export function groupPadding(sizing: GroupSizing, w: number, h: number): number {
    const ratio = sizing.paddingRatio;
    if (ratio === undefined) {
        return sizing.padding ?? 0;
    }

    const both = w > 0 && h > 0;
    switch (sizing.paddingOf ?? "width") {
        case "width":
            return w > 0 ? ratio * w : 0;
        case "height":
            return h > 0 ? ratio * h : 0;
        case "average":
            return both ? (ratio * (w + h)) / 2 : 0;
        case "min":
            return both ? ratio * Math.min(w, h) : 0;
        case "max":
            return both ? ratio * Math.max(w, h) : 0;
        default:
            return 0;
    }
}

/**
 * One axis of the members' box grown to a minimum: the growth goes `nearShare` of it to the near
 * side (lower coordinates) and the rest to the far side.
 * @param lo - The box's low end.
 * @param hi - Its high end.
 * @param min - The minimum length; 0 or unset grows nothing.
 * @param nearShare - The near side's share of the growth.
 * @returns The grown ends.
 */
function grownAxis(lo: number, hi: number, min: number | undefined, nearShare: number): [number, number] {
    const grow = Math.max(0, (min ?? 0) - (hi - lo));
    return [lo - grow * nearShare, hi + grow * (1 - nearShare)];
}

/**
 * A box round a members' box, `pad` larger on every side.
 * @param min - The members' box's low corner (x, y, z).
 * @param max - Its high corner.
 * @param pad - The padding.
 * @returns The box.
 */
export function paddedBox(min: readonly number[], max: readonly number[], pad: number): SizedBox {
    const half = (axis: number): number => (max[axis] - min[axis]) / 2 + pad;
    return {
        center: { x: (min[0] + max[0]) / 2, y: (min[1] + max[1]) / 2, z: (min[2] + max[2]) / 2 },
        half: { x: half(0), y: half(1), z: half(2) },
    };
}

/**
 * A group's box round its members' box, sized by its style.
 * @param min - The members' box's low corner (x, y, z).
 * @param max - Its high corner.
 * @param sizing - The group's sizing.
 * @returns The box and the padding it was grown by.
 */
export function sizedGroupBox(
    min: readonly number[],
    max: readonly number[],
    sizing: GroupSizing,
): { box: SizedBox; pad: number } {
    const pad = groupPadding(sizing, max[0] - min[0], max[1] - min[1]);
    const [x0, x1] = grownAxis(min[0], max[0], sizing.minWidth, sizing.minWidthBiasLeft ?? 0.5);
    // y runs up the screen, so the top is the far end: the bias toward the top is the far side's share
    const [y0, y1] = grownAxis(min[1], max[1], sizing.minHeight, 1 - (sizing.minHeightBiasTop ?? 0.5));
    return {
        box: {
            center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (min[2] + max[2]) / 2 },
            half: { x: (x1 - x0) / 2 + pad, y: (y1 - y0) / 2 + pad, z: (max[2] - min[2]) / 2 + pad },
        },
        pad,
    };
}

/** An axis-aligned rectangle on the layout plane; y runs up. */
export interface PlaneRect {
    readonly x0: number;
    readonly x1: number;
    readonly y0: number;
    readonly y1: number;
}

/** How far Cytoscape.js 3.34.3 grows a label's bounds on every side (`updateBoundsFromLabel`'s `marginOfError`). */
const LABEL_BOUNDS_MARGIN = 2;

/**
 * The box a member's label adds to a group sized with `includeLabels`, as Cytoscape.js 3.34.3 bounds a node's label
 * (`updateBoundsFromLabel`): the font size per line tall, not the drawn line box, from the side that touches its node
 * (the bottom of a label above the node's center, the top of one below it, the middle of one across it), then grown by
 * 2 font pixels on every side.
 * @param words - Where the label's words are drawn.
 * @param nodeY - The member's center's y.
 * @param em - The font size times the label's line count, in the same units.
 * @param pixel - One font pixel, in the same units: the margin is 2 of them, not 2 of the plane's units.
 * @returns The label's box.
 */
export function labelBounds(words: PlaneRect, nodeY: number, em: number, pixel: number): PlaneRect {
    let low = (words.y0 + words.y1 - em) / 2;
    if (words.y0 >= nodeY) {
        low = words.y0;
    } else if (words.y1 <= nodeY) {
        low = words.y1 - em;
    }
    const m = LABEL_BOUNDS_MARGIN * pixel;
    return { x0: words.x0 - m, x1: words.x1 + m, y0: low - m, y1: low + em + m };
}
