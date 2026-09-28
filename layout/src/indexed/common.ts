import type { F64, GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import type { Node, PositionMap } from "../types";

/** Options every index-based layout takes (graph-format design 14.3). */
export interface CommonLayoutOptions {
    /** Components per row, 2 or 3; default 2. */
    readonly dim?: 2 | 3 | undefined;
    /** Size of the layout around its centre; default 1. What it measures is documented per layout. */
    readonly scale?: number | undefined;
    /** The centre; missing components are 0. Default the origin. */
    readonly center?: ArrayLike<number> | undefined;
    /** Seed of a layout that draws random numbers; a random seed when absent or null. */
    readonly seed?: number | null | undefined;
}

/** The resolved common options: `center` has exactly `dim` components. */
interface Resolved {
    readonly n: number;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: number[];
}

/**
 * Validate and default the common options.
 * @param s - the snapshot the layout runs over
 * @param options - the caller's options
 * @returns the node count, dim, scale and a `dim`-component centre
 */
export function resolve(s: GraphSnapshot, options: CommonLayoutOptions): Resolved {
    const dim = options.dim ?? 2;
    if (dim !== 2 && dim !== 3) {
        throw new Error(`dim must be 2 or 3, got ${String(dim)}`);
    }
    const center = Array.from({ length: dim }, (_, k) => options.center?.[k] ?? 0);
    return { n: s.nodeCount, dim, scale: options.scale ?? 1, center };
}

/**
 * The f32 layout result of f64 rows.
 * @param rows - `n * dim` values
 * @param dim - components per row
 * @param n - node count
 * @returns the result
 */
export function result(rows: F64, dim: 2 | 3, n: number): LayoutResult {
    return { positions: Float32Array.from(rows), dim, n };
}

/**
 * Widen 2D rows to `dim` rows whose third component is the centre's z; 2D rows come back unchanged.
 * @param rows - `2 * n` values
 * @param dim - the output components per row
 * @param center - the centre; its third component is the z of every row
 * @returns `dim * n` values
 */
export function planar(rows: F64, dim: 2 | 3, center: readonly number[]): F64 {
    if (dim === 2) {
        return rows;
    }
    const n = rows.length / 2;
    const out = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        out[3 * i] = rows[2 * i];
        out[3 * i + 1] = rows[2 * i + 1];
        out[3 * i + 2] = center[2];
    }
    return out;
}

/**
 * The legacy id-keyed map of f64 rows, one row per entry of `nodes` (a later duplicate id overwrites an earlier one,
 * as the legacy layouts did). Kept in f64 so the legacy functions return exactly what they returned before.
 * @param rows - `nodes.length * dim` values
 * @param dim - components per row
 * @param nodes - the id of every row
 * @param skipUnplaced - leave out a row whose first component is NaN (a node the layout did not place)
 * @returns the map
 */
export function rowsToPositionMap(rows: F64, dim: number, nodes: readonly Node[], skipUnplaced = false): PositionMap {
    const pos: PositionMap = {};
    nodes.forEach((node, i) => {
        if (!(skipUnplaced && Number.isNaN(rows[dim * i]))) {
            pos[node] = Array.from(rows.subarray(dim * i, dim * i + dim));
        }
    });
    return pos;
}
