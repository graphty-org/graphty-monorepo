/**
 * The f64 oracle of one collision sweep (issue #3256): every pair by brute force, independent of the spatial hash.
 * Positions are stride 4 (x, y, z, mass); `radii` already in position units; a row with mass 0 neither moves nor pushes.
 */

import { kickDir } from "./forceatlas2.js";

/**
 * One sweep of the collision force.
 * @param pos - the rows before the sweep
 * @param radii - one radius per row, in the rows' units
 * @param dim - 2 (or a flat collision) or 3
 * @param fixed - whether a row is fixed
 * @returns the rows after the sweep
 */
export function collideSweep(
    pos: Float64Array,
    radii: ArrayLike<number>,
    dim: 2 | 3,
    fixed: (row: number) => boolean,
): Float64Array {
    const n = pos.length / 4;
    const out = pos.slice();
    for (let i = 0; i < n; i++) {
        if (pos[4 * i + 3] <= 0 || fixed(i)) {
            continue;
        }
        for (let j = 0; j < n; j++) {
            if (j === i || pos[4 * j + 3] <= 0) {
                continue;
            }
            const reach = radii[i] + radii[j];
            const d = [
                pos[4 * i] - pos[4 * j],
                pos[4 * i + 1] - pos[4 * j + 1],
                dim === 2 ? 0 : pos[4 * i + 2] - pos[4 * j + 2],
            ];
            const squared = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
            if (squared >= reach * reach) {
                continue;
            }
            const share = fixed(j) ? 1 : 0.5;
            const distance = Math.sqrt(squared);
            const along = squared < 1e-8 ? kickDir(i, j, dim) : d.map((v) => v / distance);
            const push = (squared < 1e-8 ? reach : reach - distance) * share;
            for (let axis = 0; axis < 3; axis++) {
                out[4 * i + axis] += along[axis] * push;
            }
        }
    }
    return out;
}
