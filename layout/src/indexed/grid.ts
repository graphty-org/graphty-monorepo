import type { F64, GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { type CommonLayoutOptions, planar, resolve, result } from "./common";

/** Options of the index-based grid layout. */
export interface GridLayoutOptions extends CommonLayoutOptions {
    /** Number of columns, a positive integer; default `ceil(sqrt(n))`, a square grid. */
    readonly columns?: number | null | undefined;
}

/**
 * Lattice rows: node i at column `i % columns`, row `floor(i / columns)`, centred, the longer side spanning
 * `[-scale, scale]`.
 * @param n - node count
 * @param columns - the column count, or null for a square grid
 * @param scale - half the length of the longer side
 * @param center - at least 2 components
 * @returns `2 * n` values
 */
function gridRows(n: number, columns: number | null, scale: number, center: readonly number[]): F64 {
    if (columns !== null && (!Number.isInteger(columns) || columns < 1)) {
        throw new Error("columns must be a positive integer");
    }
    const rows = new Float64Array(2 * n);
    if (n === 0) {
        return rows;
    }
    const cols = Math.min(columns ?? Math.ceil(Math.sqrt(n)), n);
    const rowCount = Math.ceil(n / cols);
    const longest = Math.max(cols - 1, rowCount - 1);
    const spacing = longest === 0 ? 0 : (2 * scale) / longest;
    for (let i = 0; i < n; i++) {
        rows[2 * i] = center[0] + ((i % cols) - (cols - 1) / 2) * spacing;
        rows[2 * i + 1] = center[1] + (Math.floor(i / cols) - (rowCount - 1) / 2) * spacing;
    }
    return rows;
}

/**
 * Nodes on a regular lattice, row by row in node-index order. In 3D the lattice lies in the plane of the centre's z.
 * @param s - the snapshot; only its node count is read
 * @param options - `scale` is half the length of the lattice's longer side
 * @returns the layout
 */
export function grid(s: GraphSnapshot, options: GridLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(planar(gridRows(n, options.columns ?? null, scale, center), dim, center), dim, n);
}
