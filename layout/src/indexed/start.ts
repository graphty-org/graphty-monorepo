import type { F32, GraphSnapshot } from "@graphty/graph-format";

import { toPositionColumn } from "../positions";

/**
 * The dimension of an index-based layout: 2 unless 3 is asked for.
 * @param dim - the option
 * @returns 2 or 3; RangeError for anything else
 */
export function layoutDim(dim: number | undefined): 2 | 3 {
    const value = dim ?? 2;
    if (value !== 2 && value !== 3) {
        throw new RangeError(`dim must be 2 or 3, got ${String(value)}`);
    }
    return value;
}

/**
 * The stride-3 start column of a layout (the form seedPositions and the simulations take): the caller's `pos` (`dim`
 * values per node, in layout units) with NaN kept, or every row NaN when there is no `pos`.
 * @param s - the snapshot
 * @param pos - `dim * nodeCount` values, or null / undefined
 * @param dim - components per row of `pos`
 * @returns `3 * nodeCount` values
 */
export function startColumn(s: GraphSnapshot, pos: F32 | null | undefined, dim: 2 | 3): F32 {
    const n = s.nodeCount;
    if (pos === null || pos === undefined) {
        return new Float32Array(3 * n).fill(Number.NaN);
    }
    if (pos.length !== dim * n) {
        throw new RangeError(`pos has ${pos.length} values, expected ${dim * n} (dim * nodeCount)`);
    }
    return toPositionColumn({ positions: pos, dim, n }, 1, null);
}
