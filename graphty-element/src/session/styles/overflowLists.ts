/**
 * @file The built-in lists an overflow policy steps through. A binding stores the list it uses in
 * `overflowValues`, so a save file carries its order and opens the same way if these lists change
 * (design/architecture/self-contained-save-files.md).
 */

import type { EdgeLineValue, NodeShapeValue } from "./channels";

/**
 * The node shapes `overflow: "shape"` steps through, one per full cycle of the palette.
 *
 * The first is the element's default node shape, so the groups that fit in the palette look the
 * way they would have without the policy. The rest are chosen for silhouettes that stay apart at
 * a node's size from any angle: a cube, a double pyramid, an upright column, a point and a ring.
 * The Platonic solids with many faces (dodecahedron, icosahedron) are left out because at node
 * size they read as the sphere. A list meant to keep its shapes apart, such as one shape per
 * layer, can start with these.
 * @since 3.30.0
 */
export const OVERFLOW_SHAPES: readonly NodeShapeValue[] = Object.freeze([
    "icosphere",
    "box",
    "octahedron",
    "cylinder",
    "cone",
    "torus",
]);

/**
 * The edge line patterns `overflow: "pattern"` steps through, one per full cycle of the palette:
 * the edge counterpart of {@link OVERFLOW_SHAPES}. The first is the element's default, a solid
 * line; the rest are chosen to stay apart at an edge's width.
 * @since 3.27.0
 */
export const OVERFLOW_PATTERNS: readonly EdgeLineValue[] = Object.freeze([
    "solid",
    "dash",
    "dot",
    "dash-dot",
    "sinewave",
    "diamond",
]);

/**
 * The built-in node shapes and edge line patterns an overflow policy steps through, for the saved-name scan: a save file that names one by id depends on this
 * build still shipping it (design/architecture/self-contained-save-files.md, section 2.2).
 * Exported, and so tagged public, because test/saved-format/builtInIds.ts finds and loads it by reading the source.
 * @returns The kind and its ids.
 * @public
 */
export function builtInIdsForTesting(): { kind: string; ids: readonly string[] } {
    return { kind: "overflowLists", ids: [...OVERFLOW_SHAPES, ...OVERFLOW_PATTERNS] };
}
