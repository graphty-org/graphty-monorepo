/**
 * Layout rescaling utilities
 */

import { PositionMap } from "../types/index.js";

/**
 * Returns scaled position array/dict to (-scale, scale) in all axes.
 * @param pos - Position dictionary or array
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Rescaled positions dictionary
 * @deprecated Use `rescaleInPlace(positions, dim, scale, center)`
 * over a flat `dim`-stride array. For a plain id-keyed map, copy its rows into a `Float64Array`, rescale it and
 * write the rows back. For the map of a layout run over a graph snapshot, `fromPositionMap(pos, snapshot.ids, dim,
 * fill)` builds the array and `toPositionMap({ positions, dim, n }, snapshot.ids)` reads it back; both need the
 * snapshot's `NodeIdMap`, and `fromPositionMap` builds a `Float32Array`, so values lose f64 precision.
 * `rescaleInPlace` skips a NaN component in the mean and the distance where this function lets it spread, and it
 * returns `dim` components per row whatever the length of `center`; `toPositionMap` also drops a row whose every
 * component is NaN. Removed in 3.0.0.
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
    const target = center ?? new Array<number>(dim).fill(0);
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
    const posCenter: number[] = new Array(dim).fill(0);
    const counts: number[] = new Array(dim).fill(0);
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
    const centered = new Array(targetDim).fill(0);
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
    const result = new Array(targetDim);
    for (let i = 0; i < targetDim; i++) {
        result[i] = i < p.length && Number.isNaN(p[i]) ? Number.NaN : center[i];
    }
    return result;
}

/**
 * Return a dictionary of scaled positions centered at (0, 0).
 * @param pos - Dictionary of positions
 * @param scale - Scale factor for positions
 * @returns Dictionary of scaled positions
 * @deprecated Use `rescaleInPlace(positions, dim, scale)`
 * over a flat `dim`-stride array. For a plain id-keyed map, copy its rows into a `Float64Array`, rescale it and
 * write the rows back. For the map of a layout run over a graph snapshot, `fromPositionMap(pos, snapshot.ids, dim,
 * fill)` builds the array and `toPositionMap({ positions, dim, n }, snapshot.ids)` reads it back; both need the
 * snapshot's `NodeIdMap`, and `fromPositionMap` builds a `Float32Array`, so values lose f64 precision.
 * `rescaleInPlace` skips a NaN component in the mean and the distance where this function lets it spread, and it
 * returns `dim` components per row whatever the length of `center`; `toPositionMap` also drops a row whose every
 * component is NaN. Removed in 3.0.0.
 */
export function rescaleLayoutDict(pos: PositionMap, scale: number = 1): PositionMap {
    if (Object.keys(pos).length === 0) {
        return {};
    }

    // Extract positions as array
    const posArray = Object.values(pos);

    // Find center of positions
    const center: number[] = [];
    for (let d = 0; d < posArray[0].length; d++) {
        center[d] = posArray.reduce((sum, p) => sum + p[d], 0) / posArray.length;
    }

    // Center positions
    const centeredPos: PositionMap = {};
    for (const [node, p] of Object.entries(pos)) {
        centeredPos[node] = p.map((val, d) => val - center[d]);
    }

    // Find maximum distance from center
    let maxDist = 0;
    for (const p of Object.values(centeredPos)) {
        const dist = Math.sqrt(p.reduce((sum, val) => sum + val * val, 0));
        maxDist = Math.max(maxDist, dist);
    }

    // Scale positions
    const scaledPos: PositionMap = {};
    if (maxDist > 0) {
        for (const [node, p] of Object.entries(centeredPos)) {
            scaledPos[node] = p.map((val) => (val * scale) / maxDist);
        }
    } else {
        // All points at the center
        for (const node of Object.keys(centeredPos)) {
            scaledPos[node] = new Array(centeredPos[node].length).fill(0);
        }
    }

    return scaledPos;
}
