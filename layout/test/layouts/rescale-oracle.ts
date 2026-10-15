/**
 * The rescale functions of layout 1.x and 2.x (`rescaleLayout`), removed from the package in
 * 3.0.0 and kept here as the reference `rescaleInPlace` is checked against.
 */

import type { PositionMap } from "../../src/types";

/**
 * Returns scaled position array/dict to (-scale, scale) in all axes.
 * @param pos - Position dictionary or array
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Rescaled positions dictionary
 * Removed from the package in 3.0.0; `rescaleInPlace` replaces it.
 */
export function rescaleLayout(
    pos: PositionMap | number[][],
    scale: number = 1,
    center: number[] | null = null,
): PositionMap | number[][] {
    const posValues: number[][] = Array.isArray(pos) ? pos : Object.values(pos);
    if (posValues.length === 0) {
        return Array.isArray(pos) ? [] : {};
    }

    const dim = posValues[0].length;
    // Default center should match dimensionality
    const target = center ?? Array<number>(dim).fill(0);
    // Use the maximum dimension between positions and center
    const targetDim = Math.max(dim, target.length);
    const posCenter = meanPosition(posValues, dim);

    const centeredPos = mapRows(pos, (p) => centerRow(p, posCenter, targetDim));
    const maxDistance = maxRowNorm(Array.isArray(centeredPos) ? centeredPos : Object.values(centeredPos));

    if (maxDistance > 0) {
        const scaleFactor = scale / maxDistance;
        return mapRows(centeredPos, (p, key) => scaleRow(p, rowOf(pos, key).length, scaleFactor, target));
    }
    // All nodes at the same position - extend to target dimensionality
    return mapRows(pos, (p) => collapseRow(p, target, targetDim));
}

/**
 * Applies `fn` to every row of an array or a map, keeping its shape and keys.
 * @param pos - Rows as an array or an id-keyed map
 * @param fn - Builds the new row from a row and its index or key
 * @returns The new rows, in the same shape as `pos`
 */
function mapRows(
    pos: PositionMap | number[][],
    fn: (p: number[], key: number | string) => number[],
): PositionMap | number[][] {
    if (Array.isArray(pos)) {
        return pos.map((p, idx) => fn(p, idx));
    }
    const out: PositionMap = {};
    for (const [node, p] of Object.entries(pos)) {
        out[node] = fn(p, node);
    }
    return out;
}

/**
 * Reads the row of an array or a map by its index or key.
 * @param pos - Rows as an array or an id-keyed map
 * @param key - Index or key of the row
 * @returns The row
 */
function rowOf(pos: PositionMap | number[][], key: number | string): number[] {
    return Array.isArray(pos) ? pos[key as number] : pos[key];
}

/**
 * Mean of each of the first `dim` coordinates, skipping NaN and missing ones; 0 where none is present.
 * @param posValues - Position rows
 * @param dim - Number of coordinates to average
 * @returns The mean position
 */
function meanPosition(posValues: number[][], dim: number): number[] {
    const posCenter: number[] = Array(dim).fill(0);
    const counts: number[] = Array(dim).fill(0);
    for (const p of posValues) {
        for (let i = 0; i < dim; i++) {
            // a position shorter than the first has no coordinate i: skip it like a NaN one
            if (i < p.length && !Number.isNaN(p[i])) {
                posCenter[i] += p[i];
                counts[i]++;
            }
        }
    }
    // Average by actual count, not total length
    for (let i = 0; i < dim; i++) {
        posCenter[i] = counts[i] > 0 ? posCenter[i] / counts[i] : 0;
    }
    return posCenter;
}

/**
 * Subtracts `posCenter` from a row, padded or cut to `targetDim` coordinates (missing ones count as 0).
 * @param p - Position row
 * @param posCenter - Mean position
 * @param targetDim - Length of the returned row
 * @returns The centered row
 */
function centerRow(p: number[], posCenter: number[], targetDim: number): number[] {
    const centered = Array(targetDim).fill(0);
    for (let i = 0; i < targetDim; i++) {
        centered[i] = (i < p.length ? p[i] : 0) - (i < posCenter.length ? posCenter[i] : 0);
    }
    return centered;
}

/**
 * Largest Euclidean norm of the rows, treating NaN coordinates as 0.
 * @param rows - Centered rows
 * @returns The largest norm, 0 for none
 */
function maxRowNorm(rows: number[][]): number {
    let maxDistance = 0;
    for (const p of rows) {
        let sumSquares = 0;
        for (const val of p) {
            if (!Number.isNaN(val)) {
                sumSquares += val * val;
            }
        }
        const distance = Math.sqrt(sumSquares);
        if (!Number.isNaN(distance)) {
            maxDistance = Math.max(maxDistance, distance);
        }
    }
    return maxDistance;
}

/**
 * Scales a centered row and moves it to `center`; a coordinate the original row lacked takes the center's value,
 * and a NaN one stays NaN.
 * @param p - Centered row
 * @param origLength - Length of the original row
 * @param scaleFactor - Multiplier for each coordinate
 * @param center - Target center
 * @returns The scaled row
 */
function scaleRow(p: number[], origLength: number, scaleFactor: number, center: number[]): number[] {
    return p.map((val, i) => {
        if (i >= origLength) {
            return center[i];
        }
        if (Number.isNaN(val)) {
            return Number.NaN;
        }
        return val * scaleFactor + center[i];
    });
}

/**
 * Puts a row of a layout with no spread at `center`, padded to `targetDim`; a NaN coordinate stays NaN.
 * @param p - Position row
 * @param center - Target center
 * @param targetDim - Length of the returned row
 * @returns The row at the center
 */
function collapseRow(p: number[], center: number[], targetDim: number): number[] {
    const result = Array(targetDim);
    for (let i = 0; i < targetDim; i++) {
        result[i] = i < p.length && Number.isNaN(p[i]) ? Number.NaN : center[i];
    }
    return result;
}
