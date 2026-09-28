import { expandEdges, type F32, type GraphSnapshot, type NumericVector } from "@graphty/graph-format";

import { _kamadaKawaiSolve } from "../algorithms/optimization";
import { type LayoutResult, rescaleInPlace } from "../positions";
import { resolveWeights } from "../simulation/inputs";
import { seedPositions } from "../simulation/seed";
import { toLayoutSnapshot } from "../simulation/snapshot";
import type { CommonLayoutOptions } from "../simulation/types";
import { np } from "../utils/numpy";
import { layoutDim } from "./common";

/** The ideal distance of a pair with no path between them, as networkx fills its matrix. */
const UNREACHABLE = 1e6;

/** The seed of the 3D random start: networkx starts unseeded, and a fixed seed draws the same graph the same way. */
const START_SEED = 42;

/** Options of indexed.kamadaKawai. */
export interface KamadaKawaiOptions extends CommonLayoutOptions {
    /**
     * The ideal distance of every pair, `n * n` values row by row (for example `indexed.allPairsShortestPath(s).dist`
     * from `@graphty/algorithms`). The diagonal is read as 0 and a non-finite entry as unreachable (1e6). Absent: the
     * shortest paths of the graph, with its weights read as distances.
     */
    readonly dist?: Float32Array | Float64Array | null | undefined;
    /** Start positions, `dim` values per node in index order (NaN reads as 0); absent: a circle in 2D, a seeded random cube in 3D. */
    readonly pos?: F32 | null | undefined;
    /** true (the default): the snapshot's weights; a string: that numeric edge column; false / null: every edge is 1. */
    readonly weight?: boolean | string | null | undefined;
}

/**
 * The per-arc distances a shortest-path search reads: an f64 source stays f64 (the snapshot's role-`weight` shadow
 * of weights f32 cannot hold exactly, or an f64 edge column), anything else as resolveWeights gives it.
 * @param s - the snapshot
 * @param spec - the weight option
 * @returns arcCount values, or null when every edge is 1
 */
function arcDistances(s: GraphSnapshot, spec: boolean | string | null): NumericVector | null {
    let column = null;
    if (spec === true) {
        column = s.edges.byRole("weight");
    } else if (typeof spec === "string") {
        column = s.edges.get(spec);
    }
    if (column?.dtype === "f64" && column.meta.components === 1) {
        return expandEdges(s, column.data);
    }
    return resolveWeights(spec, s);
}

/**
 * The ideal distance matrix: the injected one with its non-finite entries as the unreachable fill, or Floyd-Warshall
 * over the CSR (the minimum over parallel arcs, a zero weight a zero distance).
 * @param s - the undirected snapshot
 * @param options - the options
 * @returns n rows of n distances
 */
function idealDistances(s: GraphSnapshot, options: KamadaKawaiOptions): number[][] {
    const n = s.nodeCount;
    let d: ArrayLike<number>;
    if (options.dist !== null && options.dist !== undefined) {
        if (options.dist.length !== n * n) {
            throw new RangeError(`kamadaKawai: dist has ${options.dist.length} values, expected ${n * n} (n * n)`);
        }
        d = options.dist;
    } else {
        const w = arcDistances(s, options.weight ?? true);
        const m = new Float64Array(n * n).fill(Number.POSITIVE_INFINITY);
        const { rowPtr, colIdx } = s;
        for (let u = 0; u < n; u++) {
            m[u * n + u] = 0;
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const weight = w === null ? 1 : w[a];
                if (!(weight >= 0)) {
                    throw new RangeError(`kamadaKawai: weights are distances and must be >= 0, got ${weight}`);
                }
                const at = u * n + colIdx[a];
                if (weight < m[at]) {
                    m[at] = weight;
                }
            }
        }
        // ponytail: Floyd-Warshall is O(n^3), as the legacy layout was; the solver is O(n^2) per iteration anyway
        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                const ik = m[i * n + k];
                if (ik === Number.POSITIVE_INFINITY) {
                    continue;
                }
                for (let j = 0; j < n; j++) {
                    const through = ik + m[k * n + j];
                    if (through < m[i * n + j]) {
                        m[i * n + j] = through;
                    }
                }
            }
        }
        d = m;
    }
    return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
            const v = d[i * n + j];
            if (i === j) {
                return 0;
            }
            return Number.isFinite(v) ? v : UNREACHABLE;
        }),
    );
}

/**
 * The start positions: `pos` (NaN as 0), else networkx's -- the unit circle in 2D, a seeded random unit cube in 3D.
 * @param s - the snapshot
 * @param options - the options
 * @param dim - 2 or 3
 * @returns n rows of dim values
 */
function startPositions(s: GraphSnapshot, options: KamadaKawaiOptions, dim: 2 | 3): number[][] {
    const n = s.nodeCount;
    const { pos } = options;
    if (pos !== null && pos !== undefined) {
        if (pos.length !== dim * n) {
            throw new RangeError(`kamadaKawai: pos has ${pos.length} values, expected ${dim * n} (dim * nodeCount)`);
        }
        return Array.from({ length: n }, (_, i) =>
            Array.from(pos.subarray(dim * i, dim * i + dim), (v) => (Number.isNaN(v) ? 0 : v)),
        );
    }
    if (dim === 2) {
        const theta = np.linspace(0, 2 * Math.PI, n + 1);
        return Array.from({ length: n }, (_, i) => [Math.cos(theta[i]), Math.sin(theta[i])]);
    }
    const column = new Float32Array(3 * n).fill(Number.NaN);
    seedPositions(s, column, options.seed === undefined ? START_SEED : options.seed, 3, 1, null, "fr");
    return Array.from({ length: n }, (_, i) => Array.from(column.subarray(3 * i, 3 * i + 3)));
}

/**
 * Kamada-Kawai: positions whose distances best match the ideal distances (networkx's `kamada_kawai_layout`),
 * rescaled to `scale` (default 1) about `center` (default the origin). Weights are distances, as in networkx.
 * @param g - the graph; a directed snapshot is laid out as its undirected copy
 * @param options - the options
 * @returns `dim` values per node
 */
export function kamadaKawai(g: GraphSnapshot, options: KamadaKawaiOptions = {}): LayoutResult {
    const s = toLayoutSnapshot(g);
    const dim = layoutDim(options.dim);
    const n = s.nodeCount;
    const positions = new Float32Array(dim * n);
    if (n === 1) {
        positions.set(Array.from({ length: dim }, (_, k) => options.center?.[k] ?? 0));
    }
    if (n <= 1) {
        return { positions, dim, n };
    }
    const solved = _kamadaKawaiSolve(idealDistances(s, options), startPositions(s, options, dim), dim);
    solved.forEach((row, i) => {
        positions.set(row, dim * i);
    });
    return { positions: rescaleInPlace(positions, dim, options.scale ?? 1, options.center), dim, n };
}
