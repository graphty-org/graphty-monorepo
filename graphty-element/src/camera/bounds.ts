/**
 * @file Measuring the box a camera view is asked to frame.
 *
 * A view never measures anything itself: it is handed a {@link GraphBounds} and decides where the
 * viewer stands from that. Putting the measurement here rather than inside each view is what lets
 * a view frame a SUBSET -- the element measures over whatever elements the caller scoped to and
 * hands the smaller box in, and every view, the element's own and a third party's alike, frames
 * the subset with no code of its own.
 *
 * NOTHING HERE NAMES A BABYLON TYPE. The caller reads positions off its meshes and passes plain
 * numbers, so this module -- and therefore every view that reads its output -- stays resolvable
 * in Node.
 */

import type { GraphBounds, Vec3 } from "./types";

/**
 * Half the width of the box an unmeasured graph is framed against.
 *
 * Twenty units square, centred on the origin, is the box the element has always used when there
 * was nothing to measure, and every built-in view's arithmetic is calibrated against it. A view
 * that wants to behave differently for "nothing to frame" reads `measured === 0` rather than
 * recognising these numbers.
 */
const DEFAULT_EXTENT = 10;

/**
 * The box around nothing: what an empty graph, and one whose nodes have no positions yet, both
 * get.
 * @returns The element's default bounding box, marked as measured over no elements.
 */
function defaultBounds(): GraphBounds {
    return Object.freeze({
        min: { x: -DEFAULT_EXTENT, y: -DEFAULT_EXTENT, z: -DEFAULT_EXTENT },
        max: { x: DEFAULT_EXTENT, y: DEFAULT_EXTENT, z: DEFAULT_EXTENT },
        center: { x: 0, y: 0, z: 0 },
        size: { x: DEFAULT_EXTENT * 2, y: DEFAULT_EXTENT * 2, z: DEFAULT_EXTENT * 2 },
        maxDimension: DEFAULT_EXTENT * 2,
        measured: 0,
    });
}

/**
 * The axis-aligned box around a set of points.
 * @param points - Where the elements being framed are, in world units.
 * @returns The box, its centre and its sides. With no points at all this is the element's default
 *   box with `measured` zero, which is what the built-in views have always framed an empty graph
 *   against.
 */
export function measureBounds(points: Iterable<Vec3>): GraphBounds {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let measured = 0;

    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        minZ = Math.min(minZ, point.z);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
        maxZ = Math.max(maxZ, point.z);
        measured++;
    }

    if (measured === 0) {
        return defaultBounds();
    }

    const size = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };

    return Object.freeze({
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
        size,
        maxDimension: Math.max(size.x, size.y, size.z),
        measured,
    });
}
