import { type F64, type GraphSnapshot, type NodeSet, resolveNodeSet } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions.js";
import { type CommonLayoutOptions, planar, refusal, resolve, result } from "./common.js";

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
    /**
     * Width over height of the drawing, as drawn (after `align`). The layers, or the nodes within them, are spread
     * apart until the drawing has this shape, so many short layers or a few tall ones still fill a wide view; the
     * spacing is never pulled below one unit. Unset (the default) keeps NetworkX's spacing: layers one apart, nodes
     * one apart.
     */
    readonly aspectRatio?: number | undefined;
}

/**
 * Place the nodes of each layer with `place`, rescale so the farthest placed node is `scale` from `center`, and for
 * `horizontal` swap x and y. A node listed twice keeps its last place; a node in no layer stays NaN.
 * @param n - node count (rows)
 * @param layers - node indices per layer
 * @param place - the unscaled x, y of the `j`-th of `size` nodes in layer `k` of `count`
 * @param align - the layer direction, checked, since a JavaScript caller may pass any string
 * @param scale - the distance of the farthest node from the center
 * @param center - the center, at least 2 components
 * @param option - the option the layers came from, for a refusal's `params`
 * @returns `2 * n` values
 * @throws `E_BAD_OPTION` for an unknown `align`, `E_BAD_NODE` for a layer index that is not a node
 */
export function layeredRows(
    n: number,
    layers: readonly ArrayLike<number>[],
    place: (k: number, count: number, j: number, size: number) => readonly [number, number],
    align: string,
    scale: number,
    center: readonly number[],
    option = "subsets",
): F64 {
    if (align !== "vertical" && align !== "horizontal") {
        throw refusal(new Error("align must be either vertical or horizontal"), "E_BAD_OPTION", {
            option: "align",
            value: align,
        });
    }
    const rows = new Float64Array(2 * n).fill(Number.NaN);
    layers.forEach((layer, k) => {
        for (let j = 0; j < layer.length; j++) {
            const i = layer[j];
            if (!Number.isInteger(i) || i < 0 || i >= n) {
                throw refusal(new Error(`layer node index ${String(i)} is not a node of the graph`), "E_BAD_NODE", {
                    option,
                    index: i,
                });
            }
            [rows[2 * i], rows[2 * i + 1]] = place(k, layers.length, j, layer.length);
        }
    });
    if (align === "vertical") {
        return rescaleInPlace(rows, 2, scale, center);
    }
    // rescale around the swapped center, then swap every row, so the center lands where it was asked for
    rescaleInPlace(rows, 2, scale, [center[1], center[0]]);
    for (let i = 0; i < n; i++) {
        [rows[2 * i], rows[2 * i + 1]] = [rows[2 * i + 1], rows[2 * i]];
    }
    return rows;
}

/**
 * The unscaled multipartite place: layer `k` of `count` at x `k - (count - 1) / 2`, its nodes one apart in y and
 * centered on 0.
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
 * The multipartite place stretched along one axis so the drawing is `aspectRatio` wide over high once drawn.
 * @param layers - node indices per layer
 * @param aspectRatio - width over height, as drawn
 * @param align - the layer direction; `horizontal` swaps x and y after placing
 * @returns the place function for {@link layeredRows}
 * @throws `E_BAD_OPTION` when `aspectRatio` is not a positive finite number
 */
function aspectPlace(
    layers: readonly ArrayLike<number>[],
    aspectRatio: number,
    align: string,
): (k: number, count: number, j: number, size: number) => readonly [number, number] {
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
        throw refusal(new Error("aspectRatio must be a positive number"), "E_BAD_OPTION", {
            option: "aspectRatio",
            value: aspectRatio,
        });
    }
    const across = layers.length - 1;
    const along = layers.reduce((max, layer) => Math.max(max, layer.length), 0) - 1;
    const target = align === "horizontal" ? 1 / aspectRatio : aspectRatio;
    let sx = 1;
    let sy = 1;
    if (across > 0 && along > 0) {
        const stretch = (target * along) / across;
        if (stretch >= 1) {
            sx = stretch;
        } else {
            sy = 1 / stretch;
        }
    }
    return (k, count, j, size) => {
        const [x, y] = multipartitePlace(k, count, j, size);
        return [x * sx, y * sy];
    };
}

/**
 * Node indices per distinct value of a `u32` or `dict` node column, in ascending value order; an unset row is left
 * out.
 * @param s - the snapshot
 * @param name - the column
 * @param option - the option that names the column, for the error
 * @returns node indices per value
 * @throws `E_UNKNOWN_COLUMN` when the snapshot has no such node column, `E_COLUMN_TYPE` when it is not u32 or dict
 */
export function groupsOfColumn(s: GraphSnapshot, name: string, option: string): number[][] {
    const column = s.nodes.get(name);
    if (column === null) {
        throw refusal(
            new Error(`${option} names node column "${name}", which the snapshot does not hold`),
            "E_UNKNOWN_COLUMN",
            {
                option,
                column: name,
            },
        );
    }
    if (column.dtype !== "u32" && column.dtype !== "dict") {
        throw refusal(
            new Error(`${option} column "${name}" must be u32 or dict, not ${column.dtype}`),
            "E_COLUMN_TYPE",
            {
                option,
                column: name,
                dtype: column.dtype,
                expected: ["u32", "dict"],
            },
        );
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
 * its nodes evenly spaced top to bottom in the order listed. In 3D the layout lies in the plane of the center's z.
 * @param s - the snapshot; only its node count and the named column are read
 * @param options - `scale` is the distance of the farthest node from the center; `subsets` the layers
 * @returns the layout
 * @throws an Error with `code` `E_UNKNOWN_COLUMN` or `E_COLUMN_TYPE` when `subsets` names a node column the snapshot
 * does not hold or one that is not u32 or dict, `E_BAD_NODE` for a layer index that is not a node, and
 * `E_BAD_OPTION` for an unknown `align` or an `aspectRatio` that is not a positive number; `params` carry the facts
 */
export function multipartite(s: GraphSnapshot, options: MultipartiteLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const { subsets = "subset", align = "vertical", aspectRatio } = options;
    const layers =
        typeof subsets === "string"
            ? groupsOfColumn(s, subsets, "subsets")
            : subsets.map((set) => resolveNodeSet(s, set));
    const place = aspectRatio === undefined ? multipartitePlace : aspectPlace(layers, aspectRatio, align);
    return result(planar(layeredRows(n, layers, place, align, scale, center), dim, center), dim, n);
}
