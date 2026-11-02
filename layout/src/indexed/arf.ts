import type { F32, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions.js";
import { seedPositions } from "../simulation/seed.js";
import { toLayoutSnapshot } from "../simulation/snapshot.js";
import { refusal } from "./common.js";
import { layoutDim, startColumn } from "./start.js";

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
    /**
     * When given (or when `center` is), the result is rescaled so the farthest node is `scale` from `center`, as every
     * other one-shot layout's is; default 1 then. When neither is given the result keeps the scale the forces settled
     * at.
     */
    readonly scale?: number | undefined;
    /** The centre the result is rescaled about (missing components are 0); see `scale`. */
    readonly center?: ArrayLike<number> | undefined;
}

/** The working arrays and constants of one {@link arf} run. */
interface ArfState {
    /** Positions, `dim` per node. */
    readonly p: Float64Array;
    /** This iteration's force per node. */
    readonly change: Float64Array;
    /** Scratch: p_i - p_j. */
    readonly diff: Float64Array;
    /** neighbour[j] === i + 1 when j is a neighbour of i. */
    readonly neighbour: Int32Array;
    readonly rowPtr: ArrayLike<number>;
    readonly colIdx: ArrayLike<number>;
    readonly dim: number;
    readonly n: number;
    /** The repulsion, scaling * sqrt(n). */
    readonly rho: number;
    /** The neighbour spring strength. */
    readonly a: number;
}

/**
 * Add the force of node j on node i to `change`.
 * @param st - the run's state
 * @param i - the node moved
 * @param j - the other node
 */
function arfPair(st: ArfState, i: number, j: number): void {
    const { p, change, diff, dim } = st;
    let squares = 0;
    for (let k = 0; k < dim; k++) {
        diff[k] = p[dim * i + k] - p[dim * j + k];
        squares += diff[k] * diff[k];
    }
    const dist = Math.sqrt(squares) || 0.01;
    const spring = st.neighbour[j] === i + 1 ? st.a : 1;
    for (let k = 0; k < dim; k++) {
        // diff points from j to i: the spring pulls i toward j, the repulsion pushes it away
        change[dim * i + k] += (st.rho / dist) * diff[k] - spring * diff[k];
    }
}

/**
 * Fill `change` with every node's summed force.
 * @param st - the run's state
 */
function arfChange(st: ArfState): void {
    const { rowPtr, colIdx, neighbour, n } = st;
    st.change.fill(0);
    for (let i = 0; i < n; i++) {
        for (let arc = rowPtr[i]; arc < rowPtr[i + 1]; arc++) {
            neighbour[colIdx[arc]] = i + 1;
        }
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                arfPair(st, i, j);
            }
        }
    }
}

/**
 * Move every node by its force times `dt`.
 * @param st - the run's state
 * @param dt - the step
 * @returns the summed force length
 */
function arfMove(st: ArfState, dt: number): number {
    const { p, change, dim, n } = st;
    let error = 0;
    for (let i = 0; i < n; i++) {
        let squares = 0;
        for (let k = 0; k < dim; k++) {
            p[dim * i + k] += change[dim * i + k] * dt;
            squares += change[dim * i + k] * change[dim * i + k];
        }
        error += Math.sqrt(squares);
    }
    return error;
}

/**
 * The attractive and repulsive forces layout (networkx's `arf_layout`). Without `scale` or `center` its result is not
 * rescaled: the forces settle at their own scale, which `scaling` sets. With either, the farthest node ends `scale`
 * from `center`.
 * @param g - the graph; a directed snapshot is laid out as its undirected copy
 * @param options - the options
 * @returns `dim` values per node
 */
export function arf(g: GraphSnapshot, options: ArfOptions = {}): LayoutResult {
    const { scaling = 1, a = 1.1, maxIter = 1000 } = options;
    if (a <= 1) {
        throw refusal(new Error("The parameter a should be larger than 1"), "E_BAD_OPTION", { option: "a", value: a });
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

    const st: ArfState = {
        p,
        change: new Float64Array(dim * n),
        diff: new Float64Array(dim),
        // neighbour[j] === i + 1 marks j as a neighbour of i, so no row needs clearing
        neighbour: new Int32Array(n),
        rowPtr: s.rowPtr,
        colIdx: s.colIdx,
        dim,
        n,
        rho: scaling * Math.sqrt(n),
        a,
    };
    const dt = 1e-3;
    const etol = 1e-6;
    let error = etol + 1;
    for (let iter = 0; error > etol && iter < maxIter; iter++) {
        arfChange(st);
        error = arfMove(st, dt);
    }
    if (options.scale !== undefined || options.center !== undefined) {
        rescaleInPlace(p, dim, options.scale ?? 1, options.center);
    }
    return { positions: Float32Array.from(p), dim, n };
}
