/**
 * The CPU reference of the grid pyramid (spec 7.7 G4-G5; P4-T9): level 0 as `[sum m x, sum m y, sum m z, sum m]` per
 * cell in f64, summed in `sortedIdx` order (the order of G4's serial loop, so the f32 kernel differs from it by
 * rounding alone), the pseudo-cell at index `cells`, each coarser level the sum of its 2^dim children (the pseudo-cell
 * excluded), the hub cells (count > GRID_HUB_CELL, the pseudo-cell included as G4 includes it) and the largest
 * occupancy over every cell G4 visits. Beside every level the oracle carries the ANALYTIC forward-error bound of the
 * kernel's f32 sums per component: `roundings * 2^-22 * sum |m x|`, where `roundings` counts the f32 additions on
 * the path to the value (a serial cell: `count`; a hub cell: `ceil(count / wg) + wg`, the strided partials and the
 * widest reduction the prelude's twins take; a parent: its children's plus 2^dim), so a cell that cancels (its sum
 * near zero while its terms are not) is bounded by its terms, never by its sum. Pure; no device.
 */

import { GRID_HUB_CELL } from "../../src/constants.js";
import { type GridOracleBuild, type GridOracleInput } from "./grid.js";

/** The oracle's pyramid: every level in f64, the bound of every value, the hub list and the occupancy max. */
export interface GridOraclePyramid {
    /** `levels[L]` holds 4 values per cell of level L (level 0: `cells + 1` cells, the pseudo-cell last). */
    readonly levels: readonly Float64Array[];
    /** The analytic bound of `|kernel - levels[L][k]|` per value, in the shape of `levels`. */
    readonly bounds: readonly Float64Array[];
    /** The cells whose count exceeds GRID_HUB_CELL, ascending. */
    readonly hubCells: readonly number[];
    /** The largest count over every cell G4 visits (the pseudo-cell included): what `hubCounters[1]` holds. */
    readonly maxOccupancy: number;
}

/** Four times 2^-24 (an f32 unit roundoff with the P4 analytic bound's slack). */
const ROUNDING_UNIT = 2 ** -22;

/**
 * The pyramid of a build (see the module comment).
 * @param build - the T8 oracle's build (`sortedIdx`, `cellStart`)
 * @param input - the positions, the grid and the frame
 * @param wg - the workgroup size of the hub path (the context's)
 * @returns the pyramid
 */
export function gridOraclePyramid(build: GridOracleBuild, input: GridOracleInput, wg: number): GridOraclePyramid {
    const { positions, spec } = input;
    const { cells, dim, g, levels: levelCount } = spec;
    const level0 = new Float64Array(4 * (cells + 1));
    const abs0 = new Float64Array(4 * (cells + 1));
    const roundings0 = new Float64Array(cells + 1);
    const hubCells: number[] = [];
    let maxOccupancy = 0;
    for (let c = 0; c <= cells; c++) {
        const start = build.cellStart[c];
        const count = build.cellStart[c + 1] - start;
        maxOccupancy = Math.max(maxOccupancy, count);
        if (count > GRID_HUB_CELL) {
            hubCells.push(c);
        }
        for (let k = start; k < start + count; k++) {
            const i = build.sortedIdx[k];
            const m = positions[4 * i + 3];
            for (let a = 0; a < 3; a++) {
                const v = m * positions[4 * i + a];
                level0[4 * c + a] += v;
                abs0[4 * c + a] += Math.abs(v);
            }
            level0[4 * c + 3] += m;
            abs0[4 * c + 3] += Math.abs(m);
        }
        roundings0[c] = count > GRID_HUB_CELL ? Math.ceil(count / wg) + wg : count;
    }
    const levels: Float64Array[] = [level0];
    const abs: Float64Array[] = [abs0];
    const roundings: Float64Array[] = [roundings0];
    let side = g;
    for (let level = 1; level < levelCount; level++) {
        const childSide = side;
        side /= 2;
        const parentCells = side ** dim;
        const child = levels[level - 1];
        const childAbs = abs[level - 1];
        const childRoundings = roundings[level - 1];
        const parent = new Float64Array(4 * parentCells);
        const parentAbs = new Float64Array(4 * parentCells);
        const parentRoundings = new Float64Array(parentCells);
        for (let pc = 0; pc < parentCells; pc++) {
            const px = pc % side;
            const py = Math.floor(pc / side) % side;
            const pz = Math.floor(pc / (side * side));
            parentRoundings[pc] = 2 ** dim;
            for (let dz = 0; dz < (dim === 3 ? 2 : 1); dz++) {
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const cc = 2 * px + dx + childSide * (2 * py + dy + childSide * (2 * pz + dz));
                        parentRoundings[pc] += childRoundings[cc];
                        for (let a = 0; a < 4; a++) {
                            parent[4 * pc + a] += child[4 * cc + a];
                            parentAbs[4 * pc + a] += childAbs[4 * cc + a];
                        }
                    }
                }
            }
        }
        levels.push(parent);
        abs.push(parentAbs);
        roundings.push(parentRoundings);
    }
    const bounds = levels.map((values, level) => {
        const out = new Float64Array(values.length);
        for (let k = 0; k < values.length; k++) {
            out[k] = roundings[level][Math.floor(k / 4)] * ROUNDING_UNIT * abs[level][k];
        }
        return out;
    });
    return { levels, bounds, hubCells, maxOccupancy };
}
