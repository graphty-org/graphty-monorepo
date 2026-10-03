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
    // Check if pos is empty
    if (Array.isArray(pos)) {
        if (pos.length === 0) {
            return [];
        }
    } else {
        if (Object.keys(pos).length === 0) {
            return {};
        }
    }

    // Extract position values
    const posValues: number[][] = Array.isArray(pos) ? pos : Object.values(pos);
    const dim = posValues[0].length;

    // Fix Bug #1: Default center should match dimensionality
    if (!center) {
        center = Array(dim).fill(0);
    }

    // Use the maximum dimension between positions and center
    const targetDim = Math.max(dim, center.length);

    // Calculate center of positions, handling NaN values (Bug #3)
    const posCenter: number[] = Array(dim).fill(0);
    const counts: number[] = Array(dim).fill(0);

    for (const p of posValues) {
        for (let i = 0; i < dim; i++) {
            if (!isNaN(p[i])) {
                posCenter[i] += p[i];
                counts[i]++;
            }
        }
    }

    // Average by actual count, not total length
    for (let i = 0; i < dim; i++) {
        posCenter[i] = counts[i] > 0 ? posCenter[i] / counts[i] : 0;
    }

    // Center positions
    let centeredPos: PositionMap | number[][] = {};
    if (Array.isArray(pos)) {
        centeredPos = pos.map((p) => {
            const centered = Array(targetDim).fill(0);
            for (let i = 0; i < targetDim; i++) {
                centered[i] = (i < p.length ? p[i] : 0) - (i < posCenter.length ? posCenter[i] : 0);
            }
            return centered;
        });
    } else {
        for (const [node, p] of Object.entries(pos)) {
            const centered = Array(targetDim).fill(0);
            for (let i = 0; i < targetDim; i++) {
                centered[i] = (i < p.length ? p[i] : 0) - (i < posCenter.length ? posCenter[i] : 0);
            }
            centeredPos[node] = centered;
        }
    }

    // Find maximum distance from center, handling NaN values (Bug #3)
    let maxDistance = 0;
    const centeredValues = Array.isArray(centeredPos) ? centeredPos : Object.values(centeredPos);
    for (const p of centeredValues) {
        // Calculate distance, treating NaN as 0 for distance calculation
        let sumSquares = 0;
        for (const val of p) {
            if (!isNaN(val)) {
                sumSquares += val * val;
            }
        }
        const distance = Math.sqrt(sumSquares);
        if (!isNaN(distance)) {
            maxDistance = Math.max(maxDistance, distance);
        }
    }

    // Rescale
    let scaledPos: PositionMap | number[][] = Array.isArray(pos) ? [] : {};

    if (maxDistance > 0) {
        const scaleFactor = scale / maxDistance;

        if (Array.isArray(pos)) {
            (scaledPos as number[][]) = (centeredPos as number[][]).map((p, idx) =>
                p.map((val, i) => {
                    // Check if this dimension existed in the original position
                    const origPos = pos[idx];
                    if (i >= origPos.length) {
                        // This dimension was added, use center value
                        return center[i];
                    }
                    // Preserve NaN values (Bug #3)
                    if (isNaN(val)) {
                        return NaN;
                    }
                    return val * scaleFactor + center[i];
                }),
            );
        } else {
            for (const [node, p] of Object.entries(centeredPos as PositionMap)) {
                const origPos = pos[node];
                (scaledPos as PositionMap)[node] = p.map((val, i) => {
                    // Check if this dimension existed in the original position
                    if (i >= origPos.length) {
                        // This dimension was added, use center value
                        return center[i];
                    }
                    // Preserve NaN values (Bug #3)
                    if (isNaN(val)) {
                        return NaN;
                    }
                    return val * scaleFactor + center[i];
                });
            }
        }
    } else {
        // All nodes at the same position - extend to target dimensionality
        if (Array.isArray(pos)) {
            (scaledPos as number[][]) = pos.map((p) => {
                const result = Array(targetDim);
                for (let i = 0; i < targetDim; i++) {
                    if (i < p.length) {
                        result[i] = isNaN(p[i]) ? NaN : center[i];
                    } else {
                        result[i] = center[i];
                    }
                }
                return result;
            });
        } else {
            for (const [node, p] of Object.entries(pos)) {
                const result = Array(targetDim);
                for (let i = 0; i < targetDim; i++) {
                    if (i < p.length) {
                        result[i] = isNaN(p[i]) ? NaN : center[i];
                    } else {
                        result[i] = center[i];
                    }
                }
                (scaledPos as PositionMap)[node] = result;
            }
        }
    }

    return scaledPos;
}
