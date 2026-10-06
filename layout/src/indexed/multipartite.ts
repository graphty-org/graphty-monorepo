import { type F64, type GraphSnapshot, type NodeSet, resolveNodeSet } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions";
import { type CommonLayoutOptions, planar, resolve, result } from "./common";

/** Whether the layers run left to right (`vertical`: each layer is a column) or top to bottom (`horizontal`). */
export type LayerAlign = "vertical" | "horizontal";

/** Options of the index-based multipartite layout. */
export interface MultipartiteLayoutOptions extends CommonLayoutOptions {
    /**
     * The layers, in order: either node sets (index arrays, `{ mask }` or `{ ids }`), or the name of a `u32` or `dict`
     * node column whose equal
     * values form one layer, in ascending value (for `dict`, dictionary) order. A node in no layer, or with an unset
     * value, is not placed: its row is NaN. Default the column `"subset"`.
     */
    readonly subsets?: readonly NodeSet[] | string | undefined;
    /** Default `vertical`. */
    readonly align?: LayerAlign | undefined;
}

/**
 * Place the nodes of each layer with `place`, rescale so the farthest placed node is `scale` from `center`, and for
 * `horizontal` swap x and y. A node listed twice keeps its last place; a node in no layer stays NaN.
 * @param n - node count (rows)
 * @param layers - node indices per layer
 * @param place - the unscaled x, y of the `j`-th of `size` nodes in layer `k` of `count`
 * @param align - the layer direction
 * @param scale - the distance of the farthest node from the centre
 * @param center - the centre, at least 2 components
 * @returns `2 * n` values
 */
export function layeredRows(
    n: number,
    layers: readonly ArrayLike<number>[],
    place: (k: number, count: number, j: number, size: number) => readonly [number, number],
    align: LayerAlign,
    scale: number,
    center: readonly number[],
): F64 {
    if (align !== "vertical" && align !== "horizontal") {
        throw new Error("align must be either vertical or horizontal");
    }
    const rows = new Float64Array(2 * n).fill(Number.NaN);
    layers.forEach((layer, k) => {
        for (let j = 0; j < layer.length; j++) {
            const i = layer[j];
            if (!Number.isInteger(i) || i < 0 || i >= n) {
                throw new Error(`layer node index ${String(i)} is not a node of the graph`);
            }
            [rows[2 * i], rows[2 * i + 1]] = place(k, layers.length, j, layer.length);
        }
    });
    if (align === "vertical") {
        return rescaleInPlace(rows, 2, scale, center);
    }
    // rescale around the swapped centre, then swap every row, so the centre lands where it was asked for
    rescaleInPlace(rows, 2, scale, [center[1], center[0]]);
    for (let i = 0; i < n; i++) {
        [rows[2 * i], rows[2 * i + 1]] = [rows[2 * i + 1], rows[2 * i]];
    }
    return rows;
}

/**
 * The unscaled multipartite place: layer `k` of `count` at x `k - (count - 1) / 2`, its nodes one apart in y and
 * centred on 0.
 * @param k - the layer
 * @param count - the layer count
 * @param j - the node's place in its layer
 * @param size - the layer's size
 * @returns x, y
 */
export const multipartitePlace = (k: number, count: number, j: number, size: number): readonly [number, number] => [
    k - (count - 1) / 2,
    j - (size - 1) / 2,
];

/**
 * Node indices per distinct value of a `u32` or `dict` node column, in ascending value order; an unset row is left
 * out.
 * @param s - the snapshot
 * @param name - the column
 * @param what - what the column is for, for the error message
 * @returns node indices per value
 */
export function groupsOfColumn(s: GraphSnapshot, name: string, what: string): number[][] {
    const column = s.nodes.require(name);
    if (column.dtype !== "u32" && column.dtype !== "dict") {
        throw new Error(`${what} column "${name}" must be u32 or dict, not ${column.dtype}`);
    }
    const values = column.dtype === "u32" ? column.data : column.codes;
    const byValue = new Map<number, number[]>();
    for (let i = 0; i < s.nodeCount; i++) {
        if (column.isSet(i)) {
            const group = byValue.get(values[i]);
            if (group === undefined) {
                byValue.set(values[i], [i]);
            } else {
                group.push(i);
            }
        }
    }
    return [...byValue.keys()].sort((a, b) => a - b).map((v) => byValue.get(v) ?? []);
}

/**
 * Nodes in straight lines, one line per layer: with `vertical` alignment layer k is a column left of layer k + 1,
 * its nodes evenly spaced top to bottom in the order listed. In 3D the layout lies in the plane of the centre's z.
 * @param s - the snapshot; only its node count and the named column are read
 * @param options - `scale` is the distance of the farthest node from the centre; `subsets` the layers
 * @returns the layout
 */
export function multipartite(s: GraphSnapshot, options: MultipartiteLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const { subsets = "subset", align = "vertical" } = options;
    const layers =
        typeof subsets === "string"
            ? groupsOfColumn(s, subsets, "subset")
            : subsets.map((set) => resolveNodeSet(s, set));
    return result(planar(layeredRows(n, layers, multipartitePlace, align, scale, center), dim, center), dim, n);
}
