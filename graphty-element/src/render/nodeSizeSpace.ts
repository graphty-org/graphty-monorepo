/**
 * @file The scale a node is drawn at for its `node.sizeSpace`. No Babylon.js, so it is tested on
 * its own and costs the main entry nothing.
 */

import type { NodeSizeSpace } from "../managers/StylePainter";

/**
 * The scene length a view's height shows a node of size 1 at 1/that of, under "screen", when the
 * running layout supplies none (`LayoutEngine.nodeScreenReference`): a size-1 node covers 2% of the
 * view's height.
 */
export const DEFAULT_NODE_SCREEN_REFERENCE = 50;

/** What the scale reads of the view: an orthographic view's height, or a perspective camera's field of view. */
export interface SizeView {
    readonly orthoHeight?: number;
    readonly fov?: number;
}

/**
 * The scale one node is drawn at.
 *
 * - "scene": 1.
 * - "pivot": in perspective, the node's depth over the orbit pivot's, so it is drawn at the size it
 *   would have at the pivot; 1 with no pivot or in an orthographic view.
 * - "screen": the view's height at the node's depth over `reference`, so a node of size `s` covers
 *   `s / reference` of the view's height at any depth and zoom.
 *
 * A node at or behind the camera (a depth of 0 or less) is measured at a millionth of a unit.
 * @param space - The node's size space.
 * @param view - The view: `orthoHeight` for an orthographic camera, otherwise `fov`.
 * @param z - The node's depth in the view.
 * @param zPivot - The orbit pivot's depth, or null with no orbit pivot.
 * @param reference - The scene length that fills the view's height for a size-1 node.
 * @returns The scale.
 */
export function viewSizeScale(
    space: NodeSizeSpace,
    view: SizeView,
    z: number,
    zPivot: number | null,
    reference: number,
): number {
    if (space === "scene") {
        return 1;
    }

    const depth = Math.max(z, 1e-6);
    if (view.orthoHeight !== undefined) {
        return space === "screen" && view.orthoHeight > 0 ? view.orthoHeight / reference : 1;
    }

    if (space === "pivot") {
        return zPivot === null || zPivot <= 0 ? 1 : depth / zPivot;
    }

    return (2 * depth * Math.tan((view.fov ?? 0) / 2)) / reference || 1;
}
