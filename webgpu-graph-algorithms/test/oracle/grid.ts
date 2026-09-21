/**
 * The CPU reference of the grid build's first three stages (spec 7.7 G1-G3; P4-T8): the finest cell key of every node
 * in f32 arithmetic exactly as G1 computes it (PD-10: `q = fround(fround(p - gridMin) * invCellSize)` per axis, a
 * subtraction and a multiply, both correctly rounded on every IEEE device, so the keys are BITWISE the GPU's when the
 * oracle reads the GPU's own `gridMin` / `invCellSize`), the STABLE order by key (key, then index: what the radix sort
 * produces), `cellHist` and its exclusive scan `cellStart` over `cells + 2` entries (the outside pseudo-cell at index
 * `cells`, and one more so `cellStart[cells + 1] === n`). Pure; no device. T9 extends it with the pyramid.
 */

import { type U32 } from "@graphty/graph-format";

import { type GridSpec } from "../../src/primitives/grid.js";

/**
 * What the oracle reads: the positions (stride 4: xyz + mass, layout units), the grid and the frame G1 keys against.
 * The parameter type of gridOracleBuild (knip: exported for the signature, not imported by name).
 * @public
 */
export interface GridOracleInput {
    readonly positions: Float32Array;
    readonly n: number;
    readonly spec: GridSpec;
    /** `state.gridMin.xyz` as the GPU holds it (f32). */
    readonly gridMin: readonly [number, number, number];
    /** `state.invCellSize` as the GPU holds it (f32). */
    readonly invCellSize: number;
}

/** The oracle's build: the keys, the stable order, the counts, the starts, and the two stats G4 / K1 derive. */
export interface GridOracleBuild {
    readonly cellKey: U32;
    /** Stable: by key, then by index. */
    readonly sortedIdx: U32;
    /** `cells + 2` words. */
    readonly cellHist: U32;
    /** `cells + 2` words: the exclusive scan of `cellHist`. */
    readonly cellStart: U32;
    /** The nodes whose key is the pseudo-cell. */
    readonly outside: number;
    /** The largest real cell's count (the pseudo-cell excluded). */
    readonly maxOccupancy: number;
}

/**
 * The finest cell key of one node in f32 arithmetic (G1's text): `c = floor(clamp(q, -1, G + 1))` per axis, inside iff
 * `0 <= c < G` on every axis of `dim`, key `cx + G cy (+ G^2 cz)`, else the pseudo-cell `cells`.
 * @param p - the position (x, y, z)
 * @param input - the frame
 * @returns the key
 */
function keyOf(p: readonly [number, number, number], input: GridOracleInput): number {
    const { spec, gridMin, invCellSize } = input;
    const { g } = spec;
    const c: number[] = [];
    for (let axis = 0; axis < 3; axis++) {
        const q = Math.fround(Math.fround(p[axis] - gridMin[axis]) * invCellSize);
        // NaN clamps to the lower bound in WGSL's clamp(min(max(x, lo), hi)) on every runtime this package targets; here
        // a NaN is treated as outside explicitly, which is what the clamp achieves on the device (-1 floors to -1)
        const clamped = Number.isNaN(q) ? -1 : Math.min(Math.max(q, -1), g + 1);
        c.push(Math.floor(clamped));
    }
    let inside = c[0] >= 0 && c[0] < g && c[1] >= 0 && c[1] < g;
    if (spec.dim === 3) {
        inside = inside && c[2] >= 0 && c[2] < g;
    }
    if (!inside) {
        return spec.cells;
    }
    let key = c[0] + g * c[1];
    if (spec.dim === 3) {
        key += g * g * c[2];
    }
    return key;
}

/**
 * The keys, the stable order, the histogram and its scan.
 * @param input - the positions, the grid and the frame
 * @returns the build
 */
export function gridOracleBuild(input: GridOracleInput): GridOracleBuild {
    const { positions, n, spec } = input;
    const cellKey = new Uint32Array(n);
    const cellHist = new Uint32Array(spec.histWords);
    let outside = 0;
    for (let i = 0; i < n; i++) {
        const key = keyOf([positions[4 * i], positions[4 * i + 1], positions[4 * i + 2]], input);
        cellKey[i] = key;
        cellHist[key] += 1;
        if (key === spec.cells) {
            outside++;
        }
    }
    const cellStart = new Uint32Array(spec.histWords);
    let acc = 0;
    let maxOccupancy = 0;
    for (let k = 0; k < spec.histWords; k++) {
        cellStart[k] = acc;
        acc += cellHist[k];
        if (k < spec.cells && cellHist[k] > maxOccupancy) {
            maxOccupancy = cellHist[k];
        }
    }
    // the stable order: a counting placement in index order is key-then-index
    const cursor = Uint32Array.from(cellStart);
    const sortedIdx = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        const key = cellKey[i];
        sortedIdx[cursor[key]] = i;
        cursor[key] += 1;
    }
    return { cellKey, sortedIdx, cellHist, cellStart, outside, maxOccupancy };
}
