import type { F64, GraphSnapshot, NodeMask } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { type CommonLayoutOptions, planar, resolve, result } from "./common";
import { type LayerAlign, layeredRows } from "./multipartite";

/** Options of the index-based bipartite layout. */
export interface BipartiteLayoutOptions extends CommonLayoutOptions {
    /**
     * The nodes of the first line: a node mask (bit i set means node i), or the name of a `bool` node column whose
     * true rows are the first line (an unset row is false). Default the even node indices.
     */
    readonly top?: NodeMask | string | undefined;
    /** Default `vertical`. */
    readonly align?: LayerAlign | undefined;
    /** Width over height of the unscaled layout; default 4 / 3. */
    readonly aspectRatio?: number | undefined;
}

/**
 * Two lines of nodes, `aspectRatio` apart before rescaling, each line's nodes evenly spaced from its start in the
 * order listed.
 * @param n - node count (rows)
 * @param left - node indices of the first line
 * @param right - node indices of the second line
 * @param aspectRatio - the width of the unscaled layout (its height is 1)
 * @param align - the line direction
 * @param scale - the distance of the farthest node from the centre
 * @param center - the centre, at least 2 components
 * @returns `2 * n` values, NaN for a node on neither line
 */
export function bipartiteRows(
    n: number,
    left: ArrayLike<number>,
    right: ArrayLike<number>,
    aspectRatio: number,
    align: LayerAlign,
    scale: number,
    center: readonly number[],
): F64 {
    const width = aspectRatio;
    return layeredRows(
        n,
        [left, right],
        (k, _count, j, size) => [k * width - width / 2, j / size - 1 / 2],
        align,
        scale,
        center,
    );
}

/**
 * The bit of every node of a mask or a `bool` node column.
 * @param s - the snapshot
 * @param top - the mask or column name
 * @returns one bit per node, as a predicate
 */
function topOf(s: GraphSnapshot, top: NodeMask | string): (i: number) => boolean {
    if (typeof top !== "string") {
        if (top.length < Math.ceil(s.nodeCount / 32)) {
            throw new Error(`top mask has ${top.length} words; ${s.nodeCount} nodes need ${Math.ceil(s.nodeCount / 32)}`);
        }
        return (i) => ((top[i >>> 5] >>> (i & 31)) & 1) === 1;
    }
    const column = s.nodes.require(top);
    if (column.dtype !== "bool") {
        throw new Error(`top column "${top}" must be bool, not ${column.dtype}`);
    }
    return (i) => column.isSet(i) && ((column.data[i >>> 5] >>> (i & 31)) & 1) === 1;
}

/**
 * Nodes in two straight lines: with `vertical` alignment the `top` nodes form the left column and the rest the right,
 * each in node-index order. In 3D the layout lies in the plane of the centre's z.
 * @param s - the snapshot; only its node count and the named column are read
 * @param options - `scale` is the distance of the farthest node from the centre; `top` the first line
 * @returns the layout
 */
export function bipartite(s: GraphSnapshot, options: BipartiteLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const { top, align = "vertical", aspectRatio = 4 / 3 } = options;
    const isTop = top === undefined ? (i: number) => i % 2 === 0 : topOf(s, top);
    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < n; i++) {
        (isTop(i) ? left : right).push(i);
    }
    return result(planar(bipartiteRows(n, left, right, aspectRatio, align, scale, center), dim, center), dim, n);
}
