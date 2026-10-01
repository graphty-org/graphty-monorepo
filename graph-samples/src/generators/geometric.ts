/**
 * Geometric random graphs: nodes are random points, edges depend on the distance between them.
 * Every generator emits its points as Float64Array node columns `x`, `y` (and `z` in 3D), so the
 * `weights: { kind: "euclidean" }` option and a fixed layout can use them.
 *
 * Node i's point always comes from its own stream block i, so the points do not depend on n or on
 * how the work is split. Edge decisions compare squared distances (no square root).
 */

import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { checkEdgeCount, checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** L of the Waxman model: the diagonal of the unit square, the largest possible distance. */
const WAXMAN_L = Math.SQRT2;

/** The largest expected number of Waxman candidate draws, beta n^2 / 2. */
const WAXMAN_MAX_DRAWS = 5e8;

/**
 * Throw unless `dimension` is 2 or 3.
 * @param dimension - the option value
 * @returns the dimension
 */
function checkDimension(dimension: number | undefined): 2 | 3 {
    const d = dimension ?? 2;
    if (d !== 2 && d !== 3) {
        throw new RangeError(`dimension must be 2 or 3, got ${String(d)}`);
    }
    return d;
}

/**
 * Throw unless `value` is a finite number >= 0 (or > 0 when `positive`).
 * @param name - the option name
 * @param value - the value
 * @param positive - whether 0 is excluded
 */
function checkNonNegative(name: string, value: number, positive = false): void {
    if (!(Number.isFinite(value) && (positive ? value > 0 : value >= 0))) {
        throw new RangeError(`${name} must be a finite number ${positive ? ">" : ">="} 0, got ${String(value)}`);
    }
}

/**
 * Uniform points in [0, 1)^dimension: point i takes `dimension` nextFloat() draws (x, then y, then
 * z) from stream (seed, domain, i).
 * @param seed - the seed
 * @param domain - the points' stream domain
 * @param n - the point count
 * @param dimension - 2 or 3
 * @returns one column per axis
 */
function uniformPoints(seed: number, domain: string, n: number, dimension: number): Float64Array<ArrayBuffer>[] {
    const axes = Array.from({ length: dimension }, () => new Float64Array(n));
    const stream = new RandomStream(seed, domain, 0);
    for (let i = 0; i < n; i++) {
        stream.reset(i);
        for (const axis of axes) {
            axis[i] = stream.nextFloat();
        }
    }
    return axes;
}

/**
 * The position columns x, y (and z) of a graph.
 * @param axes - the coordinate columns
 * @returns the node columns
 */
function positionColumns(axes: Float64Array<ArrayBuffer>[]): Record<string, Float64Array<ArrayBuffer>> {
    const names = ["x", "y", "z"];
    return Object.fromEntries(axes.map((axis, a) => [names[a], axis]));
}

/**
 * The largest g >= 1 with g^dimension <= target.
 * @param target - the cell budget
 * @param dimension - 2 or 3
 * @returns cells per axis
 */
function cellsPerAxis(target: number, dimension: number): number {
    let g = 1;
    while ((g + 1) ** dimension <= target) {
        g++;
    }
    return g;
}

/** Points bucketed into a uniform grid of g^dimension cells by a counting sort. */
interface CellGrid {
    /** Cells per axis. */
    readonly g: number;
    /** The low corner of the grid on every axis. */
    readonly lo: readonly number[];
    /** The cell side on every axis. */
    readonly side: readonly number[];
    /** start[c] .. start[c + 1] indexes `items` for cell c. */
    readonly start: Uint32Array;
    /** Point indices grouped by cell, ascending inside each cell. */
    readonly items: Uint32Array;
    /** The cell coordinate of every point on every axis. */
    readonly cell: Uint32Array[];
}

/**
 * Bucket points into a g^dimension grid spanning [lo, hi] on each axis.
 * @param axes - the coordinate columns
 * @param g - cells per axis
 * @param lo - the low corner per axis
 * @param hi - the high corner per axis
 * @returns the grid
 */
function buildGrid(axes: Float64Array[], g: number, lo: number[], hi: number[]): CellGrid {
    const n = axes[0].length;
    const side = lo.map((l, a) => (hi[a] - l) / g || 1);
    const cell = axes.map(() => new Uint32Array(n));
    const flat = new Uint32Array(n);
    const start = new Uint32Array(g ** axes.length + 1);
    for (let i = 0; i < n; i++) {
        let c = 0;
        for (let a = 0; a < axes.length; a++) {
            const k = Math.min(g - 1, Math.floor((axes[a][i] - lo[a]) / side[a]));
            cell[a][i] = k;
            c = c * g + k;
        }
        flat[i] = c;
        start[c + 1]++;
    }
    for (let c = 0; c + 1 < start.length; c++) {
        start[c + 1] += start[c];
    }
    const fill = start.slice(0, -1);
    const items = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        items[fill[flat[i]]++] = i;
    }
    return { g, lo, side, start, items, cell };
}

/** Options of {@link randomGeometricGraph}. */
export interface RandomGeometricOptions extends WeightOptions {
    /** The node count, >= 0. */
    n: number;
    /** The connection radius, a finite number >= 0: u and v are joined iff their distance is <= radius. */
    radius: number;
    /** 2 (the unit square, default) or 3 (the unit cube). */
    dimension?: 2 | 3 | undefined;
    /** Measure distance on the torus (each axis wraps around), removing the boundary effect; default false. */
    periodic?: boolean | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The random geometric graph (E. N. Gilbert, "Random plane networks", J. SIAM 9(4), 533-543, 1961,
 * doi:10.1137/0109045; M. Penrose, Random Geometric Graphs, Oxford University Press, 2003): n
 * uniform points in the unit square or cube, u and v joined iff their Euclidean distance (torus
 * distance when `periodic`) is at most `radius`.
 *
 * Node i's point is x, y (, z) = one nextFloat() per axis from stream (seed, "rgg-points", i). The
 * points are bucketed into a uniform grid of cells of side >= radius (at most about n cells) and
 * each node checks the 3^dimension cells around its own. Edges are the pairs (u, v), u < v,
 * ascending u then ascending v. Expected cost O(n + m). Node columns `x`, `y` (, `z`): Float64Array
 * in [0, 1). The mean degree is about n pi r^2 in 2D and n 4/3 pi r^3 in 3D (less near the border
 * unless periodic); connectivity needs r above about sqrt(ln n / (pi n)) in 2D.
 * @param options - n, radius, dimension, periodic and seed
 * @returns the undirected graph
 */
export function randomGeometricGraph(options: RandomGeometricOptions): SampleGraph {
    const { n, radius } = options;
    checkInt("n", n, 0);
    checkNonNegative("radius", radius);
    const dimension = checkDimension(options.dimension);
    const periodic = options.periodic ?? false;
    const seed = resolveSeed(options.seed);
    const axes = uniformPoints(seed, "rgg-points", n, dimension);

    const r2 = radius * radius;
    // cells a hair wider than the radius, so a point rounded into the next cell is still covered
    const g = Math.max(1, Math.min(Math.floor((1 - 1e-9) / radius), cellsPerAxis(Math.max(1, n), dimension)));
    const grid = buildGrid(axes, g, new Array<number>(dimension).fill(0), new Array<number>(dimension).fill(1));
    const volume = dimension === 2 ? Math.PI * r2 : (4 / 3) * Math.PI * r2 * radius;
    const pairs = (n * (n - 1)) / 2;
    const out = new EdgeBuffer(Math.ceil(Math.min(pairs, pairs * volume * 1.1, 1 << 24) + 16));

    // the distinct neighbouring cell coordinates of cell k on one axis
    const around = Array.from({ length: g }, (_, k) => {
        const list = periodic ? [(k + g - 1) % g, k, (k + 1) % g] : [k - 1, k, k + 1].filter((c) => c >= 0 && c < g);
        return [...new Set(list)];
    });
    let found = new Uint32Array(16);
    for (let u = 0; u < n; u++) {
        let count = 0;
        const zCells = dimension === 3 ? around[grid.cell[2][u]] : [0];
        for (const cx of around[grid.cell[0][u]]) {
            for (const cy of around[grid.cell[1][u]]) {
                for (const cz of zCells) {
                    const c = dimension === 3 ? (cx * g + cy) * g + cz : cx * g + cy;
                    for (let t = grid.start[c]; t < grid.start[c + 1]; t++) {
                        const v = grid.items[t];
                        if (v <= u) {
                            continue;
                        }
                        let d2 = 0;
                        for (const axis of axes) {
                            let d = Math.abs(axis[u] - axis[v]);
                            if (periodic && d > 0.5) {
                                d = 1 - d;
                            }
                            d2 += d * d;
                        }
                        if (d2 <= r2) {
                            if (count === found.length) {
                                const grown = new Uint32Array(count * 2);
                                grown.set(found);
                                found = grown;
                            }
                            found[count++] = v;
                        }
                    }
                }
            }
        }
        const row = found.subarray(0, count).sort();
        for (const v of row) {
            out.push(u, v);
        }
    }
    return applyWeights(toGraph(n, out, false, positionColumns(axes)), options);
}

/** Options of {@link waxmanGraph}. */
export interface WaxmanOptions extends WeightOptions {
    /** The node count, >= 0; beta n^2 / 2 must stay below 5e8. */
    n: number;
    /** The distance scale, a finite number > 0: larger alpha makes long edges likelier. */
    alpha: number;
    /** The edge probability at distance 0, in [0, 1]. */
    beta: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/** The checked and precomputed form of {@link WaxmanOptions}. */
interface WaxmanPlan {
    readonly n: number;
    readonly seed: number;
    readonly beta: number;
    readonly logQ: number;
    /** alpha L. */
    readonly scale: number;
    readonly x: Float64Array<ArrayBuffer>;
    readonly y: Float64Array<ArrayBuffer>;
}

/**
 * Check the Waxman options and draw the points.
 * @param options - the options
 * @returns the plan
 */
export function planWaxman(options: WaxmanOptions): WaxmanPlan {
    const { n, alpha, beta } = options;
    checkInt("n", n, 0);
    checkNonNegative("alpha", alpha, true);
    checkProbability("beta", beta);
    const seed = resolveSeed(options.seed);
    if ((beta * n * n) / 2 > WAXMAN_MAX_DRAWS) {
        throw new RangeError(
            `waxmanGraph: beta n^2 / 2 = ${(beta * n * n) / 2} candidate pairs, above the limit of ${WAXMAN_MAX_DRAWS}`,
        );
    }
    const [x, y] = uniformPoints(seed, "waxman-points", n, 2);
    return { n, seed, beta, logQ: detLog(1 - beta), scale: alpha * WAXMAN_L, x, y };
}

/**
 * Rows [start, end) of the Waxman graph: row u draws from stream (seed, "waxman", u), walks the
 * candidates v > u by geometric skipping at probability beta (one draw per skip), and keeps a
 * candidate with a second draw t iff d^2 < (alpha L ln t)^2, which is t < exp(-d / (alpha L)) with
 * no exp. Edges ascend in v. Any split of [0, n) into consecutive ranges gives the whole graph.
 * @param plan - the checked options and points
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the edges
 */
export function waxmanRows(plan: WaxmanPlan, start: number, end: number, out: EdgeBuffer): void {
    const { n, beta, logQ, scale, x, y } = plan;
    if (beta === 0) {
        return;
    }
    const stream = new RandomStream(plan.seed, "waxman", 0);
    const skip = (): number => (beta === 1 ? 0 : stream.nextSkip(logQ));
    for (let u = start; u < end; u++) {
        stream.reset(u);
        for (let v = u + 1 + skip(); v < n; v += 1 + skip()) {
            const dx = x[u] - x[v];
            const dy = y[u] - y[v];
            const bound = scale * detLog(stream.nextFloat());
            if (dx * dx + dy * dy < bound * bound) {
                out.push(u, v);
            }
        }
    }
}

/**
 * The Waxman graph (B. M. Waxman, "Routing of multipoint connections", IEEE J. Selected Areas in
 * Communications 6(9), 1617-1622, 1988): n uniform points in the unit square, each pair joined
 * independently with probability beta exp(-d / (alpha L)).
 *
 * L is fixed at sqrt(2), the diagonal of the unit square (networkx uses the largest distance
 * between the drawn points instead, so the two differ slightly). Node i's point is x, y = two
 * nextFloat() draws from stream (seed, "waxman-points", i); the pairs are drawn by
 * {@link waxmanRows}. Edges are the pairs (u, v), u < v, ascending u then v. Every pair has a
 * non-zero probability, so the cost is O(n + beta n^2 / 2) draws; above 5e8 expected draws it
 * throws a RangeError (n about 31,600 at beta 1). Node columns `x`, `y`: Float64Array in [0, 1).
 * @param options - n, alpha, beta and seed
 * @returns the undirected graph
 */
export function waxmanGraph(options: WaxmanOptions): SampleGraph {
    const plan = planWaxman(options);
    const out = new EdgeBuffer(Math.min(Math.ceil((plan.beta * plan.n * plan.n) / 8), 1 << 24) + 16);
    waxmanRows(plan, 0, plan.n, out);
    return applyWeights(toGraph(plan.n, out, false, positionColumns([plan.x, plan.y])), options);
}

/** Options of {@link knnGraph}. */
export interface KnnOptions extends WeightOptions {
    /** The node count, >= 0. */
    n: number;
    /** The neighbours per node, in [0, n - 1]. */
    k: number;
    /** 2 (default) or 3. */
    dimension?: 2 | 3 | undefined;
    /** Arcs u -> each of u's k nearest (default true), or with false the undirected union without duplicates. */
    directed?: boolean | undefined;
    /** Draw the points from a mixture of this many Gaussian clusters, >= 1; default uniform points. */
    clusters?: number | undefined;
    /** The standard deviation of every cluster on each axis, a finite number >= 0; default 0.05. Needs `clusters`. */
    spread?: number | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Gaussian mixture points: cluster c's centre is `dimension` nextFloat() draws from stream
 * (seed, "knn-centres", c); point i draws its cluster with nextBelow(clusters) and then standard
 * normal offsets by the Marsaglia polar method (pairs u, v = 2 nextFloat() - 1 until
 * 0 < s = u^2 + v^2 < 1, then u sqrt(-2 ln s / s) and v sqrt(-2 ln s / s)), all from stream
 * (seed, "knn-points", i).
 * @param seed - the seed
 * @param n - the point count
 * @param dimension - 2 or 3
 * @param clusters - the cluster count
 * @param spread - the standard deviation
 * @returns the coordinate columns and the cluster of every point
 */
function mixturePoints(
    seed: number,
    n: number,
    dimension: number,
    clusters: number,
    spread: number,
): { axes: Float64Array<ArrayBuffer>[]; community: Uint32Array<ArrayBuffer> } {
    const centres = uniformPoints(seed, "knn-centres", clusters, dimension);
    const axes = Array.from({ length: dimension }, () => new Float64Array(n));
    const community = new Uint32Array(n);
    const stream = new RandomStream(seed, "knn-points", 0);
    const normals = new Float64Array(4);
    for (let i = 0; i < n; i++) {
        stream.reset(i);
        const c = stream.nextBelow(clusters);
        community[i] = c;
        for (let j = 0; j < dimension; j += 2) {
            let u: number;
            let v: number;
            let s: number;
            do {
                u = 2 * stream.nextFloat() - 1;
                v = 2 * stream.nextFloat() - 1;
                s = u * u + v * v;
            } while (s >= 1 || s === 0);
            const m = Math.sqrt((-2 * detLog(s)) / s);
            normals[j] = u * m;
            normals[j + 1] = v * m;
        }
        for (let a = 0; a < dimension; a++) {
            axes[a][i] = centres[a][c] + spread * normals[a];
        }
    }
    return { axes, community };
}

/**
 * The k nearest neighbours of every point, exact, by an expanding ring search over a cell grid.
 * @param axes - the coordinate columns
 * @param k - neighbours per point
 * @returns row u's neighbours at [u k, (u + 1) k), ascending by index
 */
function nearestNeighbours(axes: Float64Array[], k: number): Uint32Array<ArrayBuffer> {
    const n = axes[0].length;
    const dimension = axes.length;
    const result = new Uint32Array(n * k);
    if (k === 0) {
        return result;
    }
    const lo = axes.map((axis) => axis.reduce((a, b) => Math.min(a, b), Infinity));
    const hi = axes.map((axis) => axis.reduce((a, b) => Math.max(a, b), -Infinity));
    const g = cellsPerAxis(Math.max(1, n / k), dimension);
    const grid = buildGrid(axes, g, lo, hi);
    const bestD = new Float64Array(k);
    const bestI = new Uint32Array(k);
    // the absolute rounding slack of a cell assignment
    const slack = 1e-12 * Math.max(1, ...lo.map(Math.abs), ...hi.map(Math.abs));
    const cell = new Array<number>(dimension).fill(0);
    const offset = new Array<number>(dimension).fill(0);
    for (let u = 0; u < n; u++) {
        let count = 0;
        const consider = (v: number): void => {
            let d2 = 0;
            for (const axis of axes) {
                const d = Math.abs(axis[u] - axis[v]);
                d2 += d * d;
            }
            // insert (d2, v) into the sorted best list when it beats the worst kept
            if (count === k && (d2 > bestD[k - 1] || (d2 === bestD[k - 1] && v > bestI[k - 1]))) {
                return;
            }
            let j = count < k ? count++ : k - 1;
            while (j > 0 && (bestD[j - 1] > d2 || (bestD[j - 1] === d2 && bestI[j - 1] > v))) {
                bestD[j] = bestD[j - 1];
                bestI[j] = bestI[j - 1];
                j--;
            }
            bestD[j] = d2;
            bestI[j] = v;
        };
        for (let a = 0; a < dimension; a++) {
            cell[a] = grid.cell[a][u];
        }
        // ponytail: ring r scans the whole (2r + 1)^dimension block and skips its inside, O(r^dimension)
        // per ring; walk only the shell if large k or very uneven clusters make that measurable
        for (let r = 0; ; r++) {
            let covered = true;
            for (let a = 0; a < dimension; a++) {
                offset[a] = -r;
                if (cell[a] - r > 0 || cell[a] + r < g - 1) {
                    covered = false;
                }
            }
            for (;;) {
                let chebyshev = 0;
                let inside = true;
                let c = 0;
                for (let a = 0; a < dimension; a++) {
                    const k2 = cell[a] + offset[a];
                    if (k2 < 0 || k2 >= g) {
                        inside = false;
                    }
                    chebyshev = Math.max(chebyshev, Math.abs(offset[a]));
                    c = c * g + k2;
                }
                if (inside && chebyshev === r) {
                    for (let t = grid.start[c]; t < grid.start[c + 1]; t++) {
                        const v = grid.items[t];
                        if (v !== u) {
                            consider(v);
                        }
                    }
                }
                let a = dimension - 1;
                while (a >= 0 && offset[a] === r) {
                    offset[a] = -r;
                    a--;
                }
                if (a < 0) {
                    break;
                }
                offset[a]++;
            }
            if (covered) {
                break;
            }
            if (count === k) {
                // every point outside the searched block is at least `gap` away
                let gap = Infinity;
                for (let a = 0; a < dimension; a++) {
                    const p = axes[a][u] - grid.lo[a];
                    gap = Math.min(gap, p - (cell[a] - r) * grid.side[a], (cell[a] + r + 1) * grid.side[a] - p);
                }
                // the margins cover the rounding of the cell assignment and of the squared distances, so
                // a point outside the block can never tie or beat the k-th best
                gap -= slack;
                if (gap > 0 && bestD[k - 1] < gap * gap * (1 - 1e-9)) {
                    break;
                }
            }
        }
        const row = result.subarray(u * k, (u + 1) * k);
        row.set(bestI);
        row.sort();
    }
    return result;
}

/**
 * The k-nearest-neighbour graph of random points, the standard input of spectral clustering
 * (U. von Luxburg, "A tutorial on spectral clustering", Statistics and Computing 17, 395-416, 2007,
 * doi:10.1007/s11222-007-9033-z).
 *
 * Points: uniform in the unit square or cube (point i = nextFloat() per axis from stream
 * (seed, "knn-points", i)), or with `clusters` a Gaussian mixture: cluster centres uniform in the
 * unit cube from stream (seed, "knn-centres", c), point i picks its cluster uniformly and adds
 * normal offsets of standard deviation `spread` (Marsaglia polar method) from stream
 * (seed, "knn-points", i); mixture points may leave [0, 1). Each node's k nearest are exact,
 * ties broken by the smaller index, found by an expanding ring search over a cell grid of about
 * n / k cells: expected O(n k^2) for uniform points.
 *
 * Directed (default): the arcs u -> each of its k nearest, ascending u then ascending target.
 * Undirected: the union of those pairs without duplicates as (u, v), u < v, ascending u then v.
 * Node columns `x`, `y` (, `z`): Float64Array; with `clusters`, `community` (u32): the cluster.
 * @param options - n, k, dimension, directed, clusters, spread and seed
 * @returns the graph
 */
export function knnGraph(options: KnnOptions): SampleGraph {
    const { n, k, clusters, spread } = options;
    checkInt("n", n, 0);
    checkInt("k", k, 0, Math.max(0, n - 1));
    const dimension = checkDimension(options.dimension);
    const directed = options.directed ?? true;
    if (clusters === undefined && spread !== undefined) {
        throw new RangeError("spread needs clusters");
    }
    const seed = resolveSeed(options.seed);
    let axes: Float64Array<ArrayBuffer>[];
    const columns: Record<string, Float64Array<ArrayBuffer> | Uint32Array<ArrayBuffer>> = {};
    if (clusters === undefined) {
        axes = uniformPoints(seed, "knn-points", n, dimension);
    } else {
        checkInt("clusters", clusters, 1);
        const sd = spread ?? 0.05;
        checkNonNegative("spread", sd);
        let community: Uint32Array<ArrayBuffer>;
        ({ axes, community } = mixturePoints(seed, n, dimension, clusters, sd));
        columns.community = community;
    }
    Object.assign(columns, positionColumns(axes));
    const neighbours = nearestNeighbours(axes, k);
    checkEdgeCount(n * k);
    let out: EdgeBuffer;
    if (directed) {
        out = new EdgeBuffer(n * k);
        for (let u = 0; u < n; u++) {
            for (let j = u * k; j < (u + 1) * k; j++) {
                out.push(u, neighbours[j]);
            }
        }
    } else {
        // bucket the pairs (min, max) by their smaller end with a counting sort, then sort and dedupe each bucket
        const start = new Uint32Array(n + 1);
        for (let u = 0; u < n; u++) {
            for (let j = u * k; j < (u + 1) * k; j++) {
                start[Math.min(u, neighbours[j]) + 1]++;
            }
        }
        for (let u = 0; u < n; u++) {
            start[u + 1] += start[u];
        }
        const fill = start.slice(0, -1);
        const other = new Uint32Array(n * k);
        for (let u = 0; u < n; u++) {
            for (let j = u * k; j < (u + 1) * k; j++) {
                const v = neighbours[j];
                other[fill[Math.min(u, v)]++] = Math.max(u, v);
            }
        }
        out = new EdgeBuffer(n * k);
        for (let u = 0; u < n; u++) {
            const row = other.subarray(start[u], start[u + 1]).sort();
            for (let j = 0; j < row.length; j++) {
                if (j === 0 || row[j] !== row[j - 1]) {
                    out.push(u, row[j]);
                }
            }
        }
    }
    return applyWeights(toGraph(n, out, directed, columns), options);
}
