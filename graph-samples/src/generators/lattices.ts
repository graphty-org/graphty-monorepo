/**
 * Lattices: the square and cubic grids (with torus wrap-around, diagonal neighbours, forward-only
 * arcs, random obstacles and position columns), the triangular lattice and the hexagonal
 * (honeycomb) lattice. All deterministic except the obstacles, which draw from stream
 * (seed, "grid-obstacles", node).
 */

import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { checkEdgeCount, checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** Options of {@link grid3dGraph}. */
export interface Grid3dOptions extends WeightOptions {
    /** The number of rows, >= 1. */
    rows: number;
    /** The number of columns, >= 1. */
    cols: number;
    /** The number of layers, >= 1. */
    layers: number;
    /**
     * Wrap around (a torus): the last node of each row, column and layer is joined to the first.
     * A dimension shorter than 3 does not wrap, so the graph stays simple.
     */
    periodic?: boolean | undefined;
    /**
     * Join diagonal neighbours too: the king's graph (8 neighbours) in 2D, the 26-neighbour lattice
     * in 3D.
     */
    diagonals?: boolean | undefined;
    /**
     * Emit each edge once as an arc from the lower index to the higher: a DAG whose only source is
     * node 0 and only sink node n - 1. Not with `periodic`.
     */
    directed?: boolean | undefined;
    /**
     * Block each node independently with this probability, in [0, 1): a blocked node keeps its
     * index (and position) but has no edges, and the u8 node column `blocked` marks it (1).
     */
    obstacles?: number | undefined;
    /** Emit Float64 node columns `x` (column), `y` (row) and, when layers > 1, `z` (layer). */
    positions?: boolean | undefined;
}

/** Options of {@link gridGraph}: {@link Grid3dOptions} without layers. */
export type GridOptions = Omit<Grid3dOptions, "layers">;

/**
 * The neighbour offsets (dc, dr, dl) a node links forward to, in edge order: +column, +row,
 * +layer, then (with diagonals) every other offset in {-1, 0, 1}^3 that is lexicographically
 * positive in (dl, dr, dc), ordered by dl, then dr, then dc.
 * @param diagonals - whether to include the diagonal offsets
 * @returns the offsets
 */
function forwardOffsets(diagonals: boolean): number[][] {
    const offsets = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ];
    if (diagonals) {
        for (let dl = 0; dl <= 1; dl++) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const positive = dl > 0 || (dl === 0 && (dr > 0 || (dr === 0 && dc > 0)));
                    const axis = Math.abs(dc) + Math.abs(dr) + Math.abs(dl) === 1;
                    if (positive && !axis) {
                        offsets.push([dc, dr, dl]);
                    }
                }
            }
        }
    }
    return offsets;
}

/**
 * The rows x cols x layers grid. Node (l, r, c) is index (l * rows + r) * cols + c. For each node
 * in index order, the edge to each forward neighbour in the order of the offsets: +column, +row,
 * +layer, then the diagonals. Without options this is the 6-neighbour lattice of phase 1, edge for
 * edge. Obstacles draw one float per node from stream (seed, "grid-obstacles", node) -- node < p
 * blocks it -- so the obstacle map does not depend on the other options.
 * @param options - sizes and the lattice options
 * @returns the graph
 */
export function grid3dGraph(options: Grid3dOptions): SampleGraph {
    const { rows, cols, layers } = options;
    checkInt("rows", rows, 1);
    checkInt("cols", cols, 1);
    checkInt("layers", layers, 1);
    const n = rows * cols * layers;
    checkInt("rows * cols * layers", n, 1);
    const periodic = options.periodic === true;
    const directed = options.directed === true;
    if (periodic && directed) {
        throw new RangeError("directed grids cannot be periodic: the wrap-around arcs would close cycles");
    }
    const offsets = forwardOffsets(options.diagonals === true);
    checkEdgeCount(n * offsets.length);
    let blocked: Uint8Array<ArrayBuffer> | null = null;
    if (options.obstacles !== undefined) {
        const p = options.obstacles;
        checkProbability("obstacles", p);
        if (p >= 1) {
            throw new RangeError("obstacles must be below 1");
        }
        blocked = new Uint8Array(n);
        const stream = new RandomStream(resolveSeed(options.seed), "grid-obstacles", 0);
        for (let i = 0; i < n; i++) {
            stream.reset(i);
            blocked[i] = stream.nextFloat() < p ? 1 : 0;
        }
    }
    const sizes = [cols, rows, layers];
    const wraps = sizes.map((size) => periodic && size >= 3);
    const plane = rows * cols;
    const out = new EdgeBuffer(n * Math.min(offsets.length, 3));
    const at = [0, 0, 0];
    for (let l = 0; l < layers; l++) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = l * plane + r * cols + c;
                if (blocked?.[i] === 1) {
                    continue;
                }
                const here = [c, r, l];
                for (const offset of offsets) {
                    let inside = true;
                    for (let axis = 0; axis < 3; axis++) {
                        let x = here[axis] + offset[axis];
                        if (x < 0 || x >= sizes[axis]) {
                            if (!wraps[axis]) {
                                inside = false;
                                break;
                            }
                            x = (x + sizes[axis]) % sizes[axis];
                        }
                        at[axis] = x;
                    }
                    if (!inside) {
                        continue;
                    }
                    const j = at[2] * plane + at[1] * cols + at[0];
                    if (blocked?.[j] === 1) {
                        continue;
                    }
                    out.push(directed && j < i ? j : i, directed && j < i ? i : j);
                }
            }
        }
    }
    const columns: Record<string, Uint8Array<ArrayBuffer> | Float64Array<ArrayBuffer>> = {};
    if (blocked !== null) {
        columns.blocked = blocked;
    }
    if (options.positions === true) {
        const x = new Float64Array(n);
        const y = new Float64Array(n);
        const z = layers > 1 ? new Float64Array(n) : null;
        for (let i = 0; i < n; i++) {
            x[i] = i % cols;
            y[i] = Math.floor(i / cols) % rows;
            if (z !== null) {
                z[i] = Math.floor(i / plane);
            }
        }
        columns.x = x;
        columns.y = y;
        if (z !== null) {
            columns.z = z;
        }
    }
    const graph = toGraph(n, out, directed, Object.keys(columns).length > 0 ? columns : undefined);
    return applyWeights(graph, options);
}

/**
 * The rows x cols grid: {@link grid3dGraph} with one layer. Node (r, c) is index r * cols + c; for
 * each node in index order, the edge to its right neighbour, then the one below, then (with
 * diagonals) below-left and below-right.
 * @param options - sizes and the lattice options
 * @returns the graph
 */
export function gridGraph(options: GridOptions): SampleGraph {
    return grid3dGraph({ ...options, layers: 1 });
}

/** Options of {@link triangularLatticeGraph} and {@link hexagonalLatticeGraph}. */
export interface PlanarLatticeOptions extends WeightOptions {
    /** The number of rows, >= 1. */
    rows: number;
    /** The number of columns, >= 1. */
    cols: number;
    /** Emit Float64 node columns `x` and `y` placing every edge at unit length. */
    positions?: boolean | undefined;
}

const HALF_SQRT3 = 0.8660254037844386;

/**
 * Check the sizes of a planar lattice.
 * @param options - the options
 * @returns the node count
 */
function planarSize(options: PlanarLatticeOptions): number {
    checkInt("rows", options.rows, 1);
    checkInt("cols", options.cols, 1);
    const n = options.rows * options.cols;
    checkInt("rows * cols", n, 1);
    checkEdgeCount(3 * n);
    return n;
}

/**
 * The triangular lattice as a triangulated rows x cols grid: node (r, c) is index r * cols + c and
 * links to (r, c + 1), (r + 1, c) and (r + 1, c - 1), in that order, for each node in index order.
 * Interior nodes have degree 6. Positions shear the grid into a parallelogram of equilateral
 * triangles: x = c + r / 2, y = r sqrt(3) / 2.
 * @param options - rows, cols, positions
 * @returns the undirected graph
 */
export function triangularLatticeGraph(options: PlanarLatticeOptions): SampleGraph {
    const n = planarSize(options);
    const { rows, cols } = options;
    const out = new EdgeBuffer(3 * n);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (c + 1 < cols) {
                out.push(i, i + 1);
            }
            if (r + 1 < rows) {
                out.push(i, i + cols);
                if (c > 0) {
                    out.push(i, i + cols - 1);
                }
            }
        }
    }
    let columns: SampleGraph["nodeColumns"];
    if (options.positions === true) {
        const x = new Float64Array(n);
        const y = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const r = Math.floor(i / cols);
            x[i] = (i % cols) + r / 2;
            y[i] = r * HALF_SQRT3;
        }
        columns = { x, y };
    }
    return applyWeights(toGraph(n, out, false, columns), options);
}

/**
 * The hexagonal (honeycomb) lattice in its brick-wall form: node (r, c) is index r * cols + c and
 * links to (r, c + 1) always and to (r + 1, c) when r + c is even, in that order, for each node in
 * index order. Interior nodes have degree 3; every face is a hexagon. Positions give unit edges:
 * x = c sqrt(3) / 2, y = 1.5 r + (r + c even ? 0.5 : 0).
 * @param options - rows, cols, positions
 * @returns the undirected graph
 */
export function hexagonalLatticeGraph(options: PlanarLatticeOptions): SampleGraph {
    const n = planarSize(options);
    const { rows, cols } = options;
    const out = new EdgeBuffer(2 * n);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (c + 1 < cols) {
                out.push(i, i + 1);
            }
            if (r + 1 < rows && (r + c) % 2 === 0) {
                out.push(i, i + cols);
            }
        }
    }
    let columns: SampleGraph["nodeColumns"];
    if (options.positions === true) {
        const x = new Float64Array(n);
        const y = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            x[i] = c * HALF_SQRT3;
            y[i] = 1.5 * r + ((r + c) % 2 === 0 ? 0.5 : 0);
        }
        columns = { x, y };
    }
    return applyWeights(toGraph(n, out, false, columns), options);
}
