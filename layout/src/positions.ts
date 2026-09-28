/**
 * Conversions between the index-based layout result (a flat `Float32Array` in node-index order) and the two other
 * forms positions take: the legacy id-keyed `PositionMap`, and the owner's stride-3 scene-unit position column that
 * graphty-element and the steppable simulations share (graph-format design 14.3).
 */

import type { F32, F64, NodeIdMap } from "@graphty/graph-format";

import type { PositionMap } from "./types";

/** The output of an index-based layout: `n` rows of `dim` components in node-index order, in layout units (not scene units). */
export interface LayoutResult {
    readonly positions: F32;
    readonly dim: 2 | 3;
    readonly n: number;
}

/**
 * The legacy id-keyed map of a layout result.
 * @param r - the layout result
 * @param ids - the id map of the snapshot the layout ran over
 * @returns one `dim`-component row per node, keyed by the node's id
 */
export function toPositionMap(r: LayoutResult, ids: NodeIdMap): PositionMap {
    const { positions, dim, n } = r;
    const out: PositionMap = {};
    for (let i = 0; i < n; i++) {
        out[ids.idOf(i)] = Array.from(positions.subarray(dim * i, dim * i + dim));
    }
    return out;
}

/**
 * A flat `dim`-stride array from a legacy map: a node present in `pos` takes its row (a missing component is 0), and
 * every other node's row is written by `fill`.
 * @param pos - the id-keyed positions, or null / undefined for none
 * @param ids - the id map of the snapshot the layout runs over
 * @param dim - components per row
 * @param fill - writes row `i` of `out` for a node `pos` does not give
 * @returns `ids.size * dim` values in node-index order
 */
export function fromPositionMap(
    pos: PositionMap | null | undefined,
    ids: NodeIdMap,
    dim: 2 | 3,
    fill: (i: number, out: F32) => void,
): F32 {
    const n = ids.size;
    const out = new Float32Array(n * dim);
    for (let i = 0; i < n; i++) {
        const given = pos?.[ids.idOf(i)];
        if (given === undefined) {
            fill(i, out);
            continue;
        }
        for (let k = 0; k < dim; k++) {
            out[dim * i + k] = given[k] ?? 0;
        }
    }
    return out;
}

/**
 * The stride-3 scene-unit column of a layout result: `v * scale + center[k]` per component; a 2D row's z is the
 * centre's z (0 without a centre).
 * @param r - the layout result
 * @param scale - scene units per layout unit
 * @param center - the scene-unit centre (missing components are 0), or null for the origin
 * @param out - the owner's array to write into (at least `3 * n` long); a new one when absent
 * @returns the column
 */
export function toPositionColumn(r: LayoutResult, scale: number, center: ArrayLike<number> | null, out?: F32): F32 {
    const { positions, dim, n } = r;
    const column = out ?? new Float32Array(3 * n);
    const c = [center?.[0] ?? 0, center?.[1] ?? 0, center?.[2] ?? 0];
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) {
            column[3 * i + k] = k < dim ? positions[dim * i + k] * scale + c[k] : c[k];
        }
    }
    return column;
}

/**
 * The inverse of toPositionColumn: layout-unit `dim`-stride positions from the scene column, `(v - center[k]) /
 * scale`. Seeds `pos` for a re-run of a layout from the current scene positions.
 * @param column - the stride-3 scene-unit column
 * @param dim - components per output row
 * @param scale - scene units per layout unit
 * @param center - the scene-unit centre (missing components are 0), or null for the origin
 * @param out - the array to write into (at least `dim * n` long); a new one when absent
 * @returns the layout-unit positions
 */
export function fromPositionColumn(
    column: F32,
    dim: 2 | 3,
    scale: number,
    center: ArrayLike<number> | null,
    out?: F32,
): F32 {
    const n = Math.floor(column.length / 3);
    const positions = out ?? new Float32Array(dim * n);
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < dim; k++) {
            positions[dim * i + k] = (column[3 * i + k] - (center?.[k] ?? 0)) / scale;
        }
    }
    return positions;
}

/**
 * `rescaleLayout` over a flat array, in place: centre the positions on their mean, scale the farthest to `scale`
 * and move them to `center`. A NaN component is skipped by the mean and the distance and stays NaN; when every
 * position coincides, each finite component becomes the centre's. Scratch is f64.
 * @param positions - `dim`-stride positions, rewritten in place
 * @param dim - components per row
 * @param scale - the distance of the farthest position from the centre after rescaling
 * @param center - the target centre (missing components are 0)
 * @returns `positions`
 */
export function rescaleInPlace<T extends F32 | F64>(positions: T, dim: number, scale = 1, center?: ArrayLike<number>): T {
    const n = Math.floor(positions.length / dim);
    const mean = new Float64Array(dim);
    const counts = new Float64Array(dim);
    for (let i = 0; i < n * dim; i++) {
        const v = positions[i];
        if (!Number.isNaN(v)) {
            mean[i % dim] += v;
            counts[i % dim]++;
        }
    }
    for (let k = 0; k < dim; k++) {
        mean[k] = counts[k] > 0 ? mean[k] / counts[k] : 0;
    }
    let maxDistance = 0;
    for (let i = 0; i < n; i++) {
        let sumSquares = 0;
        for (let k = 0; k < dim; k++) {
            const d = positions[dim * i + k] - mean[k];
            if (!Number.isNaN(d)) {
                sumSquares += d * d;
            }
        }
        maxDistance = Math.max(maxDistance, Math.sqrt(sumSquares));
    }
    const factor = maxDistance > 0 ? scale / maxDistance : 0;
    for (let i = 0; i < n * dim; i++) {
        // NaN stays NaN: (NaN - mean) * factor is NaN, including when factor is 0
        positions[i] = (positions[i] - mean[i % dim]) * factor + (center?.[i % dim] ?? 0);
    }
    return positions;
}
