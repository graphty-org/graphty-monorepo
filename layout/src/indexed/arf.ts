import type { F32, GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { seedPositions } from "../simulation/seed";
import { toLayoutSnapshot } from "../simulation/snapshot";
import { layoutDim, startColumn } from "./start";

/** Options of indexed.arf. */
export interface ArfOptions {
    readonly dim?: 2 | 3 | undefined;
    /** The seed of the rows `pos` does not give (null or absent: unseeded). */
    readonly seed?: number | null | undefined;
    /** Start positions, `dim` values per node in index order; each NaN component is drawn from the seed in [0, 1), finite ones are kept. */
    readonly pos?: F32 | null | undefined;
    /** The repulsion scale; default 1. */
    readonly scaling?: number | undefined;
    /** The spring strength between neighbours, > 1; default 1.1 (every other pair has strength 1). */
    readonly a?: number | undefined;
    /** The iteration cap; default 1000. The run also stops once the summed force falls to 1e-6. */
    readonly maxIter?: number | undefined;
}

/**
 * The attractive and repulsive forces layout (networkx's `arf_layout`). Its result is not rescaled: the forces
 * settle at their own scale, which `scaling` sets.
 * @param g - the graph; a directed snapshot is laid out as its undirected copy
 * @param options - the options
 * @returns `dim` values per node
 */
export function arf(g: GraphSnapshot, options: ArfOptions = {}): LayoutResult {
    const { scaling = 1, a = 1.1, maxIter = 1000 } = options;
    if (a <= 1) {
        throw new Error("The parameter a should be larger than 1");
    }
    const s = toLayoutSnapshot(g);
    const dim = layoutDim(options.dim);
    const n = s.nodeCount;
    // drawn in float64, as arfLayout drew it: ARF is chaotic, so a float32 start ends in a different drawing
    const column = Float64Array.from(startColumn(s, options.pos, dim));
    seedPositions(s, column, options.seed ?? null, dim, 1, null, "fr");
    const p = new Float64Array(dim * n);
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < dim; k++) {
            p[dim * i + k] = column[3 * i + k];
        }
    }

    const { rowPtr, colIdx } = s;
    const rho = scaling * Math.sqrt(n);
    const dt = 1e-3;
    const etol = 1e-6;
    const change = new Float64Array(dim * n);
    const diff = new Float64Array(dim);
    // neighbour[j] === i + 1 marks j as a neighbour of i, so no row needs clearing
    const neighbour = new Int32Array(n);
    let error = etol + 1;
    for (let iter = 0; error > etol && iter < maxIter; iter++) {
        change.fill(0);
        for (let i = 0; i < n; i++) {
            for (let arc = rowPtr[i]; arc < rowPtr[i + 1]; arc++) {
                neighbour[colIdx[arc]] = i + 1;
            }
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    continue;
                }
                let squares = 0;
                for (let k = 0; k < dim; k++) {
                    diff[k] = p[dim * i + k] - p[dim * j + k];
                    squares += diff[k] * diff[k];
                }
                const dist = Math.sqrt(squares) || 0.01;
                const spring = neighbour[j] === i + 1 ? a : 1;
                for (let k = 0; k < dim; k++) {
                    change[dim * i + k] += spring * diff[k] - (rho / dist) * diff[k];
                }
            }
        }
        error = 0;
        for (let i = 0; i < n; i++) {
            let squares = 0;
            for (let k = 0; k < dim; k++) {
                p[dim * i + k] += change[dim * i + k] * dt;
                squares += change[dim * i + k] * change[dim * i + k];
            }
            error += Math.sqrt(squares);
        }
    }
    return { positions: Float32Array.from(p), dim, n };
}
