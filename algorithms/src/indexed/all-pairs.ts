import { type F64, type GraphSnapshot, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";

import { PathWalkError } from "../errors.js";
import { walkPredArcs, walkPredEdges } from "./dijkstra.js";
import { IndexedMinHeap } from "./structures/min-heap.js";

/** The default `maxNodes`: the GPU kernel's ceiling at WebGPU's 128 MiB storage binding, floor(sqrt(2^27 / 4)). */
export const APSP_DEFAULT_MAX_NODES = 5792;

/** Options of the index-based all-pairs shortest paths. @public */
export interface ApspOptions {
    /**
     * Per-arc weight override, arcCount long; defaults to `s.weights` (null = 1 per arc). The
     * snapshot's weights are f32, whose rounding can change which path is shortest; pass the exact
     * f64 weights here to match the shipped `floydWarshall`.
     */
    readonly weights?: NumericVector | undefined;
    /** `false` counts hops and ignores every weight. Default true. */
    readonly weighted?: boolean | undefined;
    /**
     * Strategy override. `"auto"` (the default): BFS rows on unit weights, Floyd-Warshall on any
     * negative weight, Dijkstra rows below arcCount n^2 / 3, Floyd-Warshall otherwise.
     * `"floyd-warshall"` always sweeps; `"per-source"` runs BFS or Dijkstra rows and throws on a
     * negative weight.
     */
    readonly method?: "auto" | "floyd-warshall" | "per-source" | undefined;
    /** Record `predArc` so `pathTo` / `pathEdges` work; adds 4 n^2 bytes. Default false. */
    readonly paths?: boolean | undefined;
    /** Refuse larger graphs before allocating. Default 5,792. */
    readonly maxNodes?: number | undefined;
}

/** All-pairs shortest paths as a dense row-major matrix. @public */
export interface ApspResult {
    /** dist[i * n + j] = distance from i to j; +Infinity unreachable, 0 on the diagonal, NaN under a negative cycle. */
    readonly dist: F64;
    /** The side of the matrix, s.nodeCount. */
    readonly n: number;
    /** True when a negative cycle exists; dist is then all NaN and the path accessors throw. */
    readonly hasNegativeCycle: boolean;
    /** The strategy that ran. */
    readonly method: "bfs" | "dijkstra" | "floyd-warshall";
    /** The arc ending each shortest path, row-major; INVALID_INDEX on the diagonal and when unreachable. Null unless `paths: true`. */
    readonly predArc: U32 | null;
    /**
     * Node indices from `source` to `target` inclusive; empty when unreachable.
     * @param source - The row's node index
     * @param target - The column's node index
     */
    pathTo(source: number, target: number): U32;
    /**
     * Logical edge indices along that path; empty when unreachable or when source === target.
     * @param source - The row's node index
     * @param target - The column's node index
     */
    pathEdges(source: number, target: number): U32;
}

/**
 * The weights in use, after the checks of design section 5.2.
 * @param s - The snapshot
 * @param options - The caller's options
 * @returns The weight vector, or `null` when every weight is 1 (or weights are ignored), and whether one is negative
 */
function weightsInUse(s: GraphSnapshot, options: ApspOptions): { w: NumericVector | null; negative: boolean } {
    if (options.weighted === false) {
        return { w: null, negative: false };
    }
    if (options.weights !== undefined && options.weights.length !== s.arcCount) {
        throw new RangeError(
            `allPairsShortestPath: the weights override has ${String(options.weights.length)} entries; the snapshot has ${String(s.arcCount)} arcs`,
        );
    }
    const w = options.weights ?? s.weights;
    if (w === null) {
        return { w: null, negative: false };
    }
    let unit = true;
    let negative = false;
    for (let a = 0; a < s.arcCount; a++) {
        const x = w[a];
        if (!Number.isFinite(x)) {
            // A finite weight above 3.4e38 reaches the f32 arc column as Infinity.
            const hint =
                options.weights === undefined && !Number.isNaN(x)
                    ? "; a finite weight above the f32 range (3.4e38) becomes Infinity in the snapshot's f32 arc weights -- pass the exact f64 weights through the weights override"
                    : "";
            throw new RangeError(
                `allPairsShortestPath: arc ${String(a)} has weight ${String(x)}; weights must be finite${hint}`,
            );
        }
        unit &&= x === 1;
        negative ||= x < 0;
    }
    return { w: unit ? null : w, negative };
}

/**
 * Floyd-Warshall in place (design section 3.1): k-i-j over the row-major matrix, row offsets
 * hoisted, a row skipped when `d[i][k]` is +Infinity, strict `<` so the smallest pivot wins ties.
 * With a negative weight in play the diagonal is scanned after every round and the sweep stops at
 * the first negative entry (design section 3.3), before any value can run away.
 * @param s - The snapshot
 * @param w - The weights in use, or `null` for 1 per arc
 * @param negative - Whether some weight is negative, so a cycle is possible
 * @param d - The n x n output, overwritten
 * @param p - The n x n predecessor arcs, filled with INVALID_INDEX, or `null` when paths are off
 * @returns True when a negative cycle was found; `d` is then partial
 */
function floydWarshall(s: GraphSnapshot, w: NumericVector | null, negative: boolean, d: F64, p: U32 | null): boolean {
    const { nodeCount: n, rowPtr, colIdx } = s;
    d.fill(Infinity);
    for (let u = 0; u < n; u++) {
        const ur = u * n;
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const v = colIdx[a];
            const x = w === null ? 1 : w[a];
            if (v !== u && x < d[ur + v]) {
                d[ur + v] = x;
                if (p !== null) {
                    p[ur + v] = a;
                }
            }
        }
        d[ur + u] = 0;
    }
    for (let k = 0; k < n; k++) {
        const kr = k * n;
        // Row views, not d[kr + j]: 12 to 19 percent faster at every measured size (design section 12).
        const dk = d.subarray(kr, kr + n);
        for (let i = 0; i < n; i++) {
            const ir = i * n;
            const dik = d[ir + k];
            if (dik === Infinity) {
                continue;
            }
            const di = d.subarray(ir, ir + n);
            // two copies of the j loop so the common no-paths sweep carries no per-cell branch
            if (p === null) {
                for (let j = 0; j < di.length; j++) {
                    const via = dik + dk[j];
                    if (via < di[j]) {
                        di[j] = via;
                    }
                }
            } else {
                const pk = p.subarray(kr, kr + n);
                const pi = p.subarray(ir, ir + n);
                for (let j = 0; j < di.length; j++) {
                    const via = dik + dk[j];
                    if (via < di[j]) {
                        di[j] = via;
                        pi[j] = pk[j];
                    }
                }
            }
        }
        if (negative) {
            for (let i = 0; i < n; i++) {
                if (d[i * n + i] < 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * The negative cycles the weights alone prove (design section 3.3): a negative self-loop, or any
 * negative weight on an undirected snapshot (u-v-u).
 * @param s - The snapshot
 * @param w - The weights in use
 * @returns True when such a cycle exists
 */
function negativeCycleFromWeights(s: GraphSnapshot, w: NumericVector): boolean {
    for (let u = 0; u < s.nodeCount; u++) {
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            if (w[a] < 0 && (!s.directed || s.colIdx[a] === u)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * One breadth-first search per source, hop counts written straight into row `src` of `d`. One
 * queue of n entries serves every source.
 * @param s - The snapshot
 * @param d - The n x n output, overwritten
 * @param p - The n x n predecessor arcs, filled with INVALID_INDEX, or `null`: the discovering arc
 */
function bfsRows(s: GraphSnapshot, d: F64, p: U32 | null): void {
    const { nodeCount: n, rowPtr, colIdx } = s;
    const queue = new Uint32Array(n);
    d.fill(Infinity);
    for (let src = 0; src < n; src++) {
        const row = d.subarray(src * n, src * n + n);
        const prow = p?.subarray(src * n, src * n + n);
        row[src] = 0;
        queue[0] = src;
        let tail = 1;
        for (let head = 0; head < tail; head++) {
            const u = queue[head];
            const next = row[u] + 1;
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                if (row[v] === Infinity) {
                    row[v] = next;
                    if (prow !== undefined) {
                        prow[v] = a;
                    }
                    queue[tail++] = v;
                }
            }
        }
    }
}

/**
 * One Dijkstra per source, relaxing straight into row `src` of `d`. One heap serves every source:
 * a drained heap is empty again. Not `indexed.dijkstra` per source, which would allocate two O(n)
 * arrays, a heap and two closures per source and then copy the row (design section 4).
 * @param s - The snapshot
 * @param w - The weights in use, all non-negative
 * @param d - The n x n output, overwritten
 * @param p - The n x n predecessor arcs, filled with INVALID_INDEX, or `null`: the relaxing arc
 */
function dijkstraRows(s: GraphSnapshot, w: NumericVector, d: F64, p: U32 | null): void {
    const { nodeCount: n, rowPtr, colIdx } = s;
    const heap = new IndexedMinHeap(n);
    d.fill(Infinity);
    for (let src = 0; src < n; src++) {
        const row = d.subarray(src * n, src * n + n);
        const prow = p?.subarray(src * n, src * n + n);
        row[src] = 0;
        heap.push(src, 0);
        while (!heap.isEmpty()) {
            const u = heap.pop();
            const du = row[u];
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                const dv = du + w[a];
                if (dv < row[v]) {
                    row[v] = dv;
                    if (prow !== undefined) {
                        prow[v] = a;
                    }
                    heap.pushOrDecrease(v, dv);
                }
            }
        }
    }
}

/**
 * The strategy rule of design section 4.
 * @param s - The snapshot
 * @param w - The weights in use, or `null` for 1 per arc
 * @param negative - Whether some weight is negative
 * @param method - The caller's override
 * @returns The strategy to run
 */
function pickStrategy(
    s: GraphSnapshot,
    w: NumericVector | null,
    negative: boolean,
    method: ApspOptions["method"],
): ApspResult["method"] {
    if (method === "floyd-warshall") {
        return "floyd-warshall";
    }
    if (w === null) {
        return "bfs";
    }
    if (negative) {
        if (method === "per-source") {
            throw new Error(
                'allPairsShortestPath: method "per-source" runs Dijkstra, which is incorrect with a negative weight; use "auto" or "floyd-warshall"',
            );
        }
        return "floyd-warshall";
    }
    // The measured crossover (design section 12): n^2 / 3 arcs, above SciPy's n^2 / 4. Integer form, no rounding.
    const n = s.nodeCount;
    return method === "per-source" || 3 * s.arcCount < n * n ? "dijkstra" : "floyd-warshall";
}

/**
 * All-pairs shortest paths over a snapshot.
 * @param s - The snapshot
 * @param options - Weights, strategy, paths and the size bound
 * @returns The distance matrix and the path accessors
 * @public
 */
export function allPairsShortestPath(s: GraphSnapshot, options: ApspOptions = {}): ApspResult {
    const n = s.nodeCount;
    const maxNodes = options.maxNodes ?? APSP_DEFAULT_MAX_NODES;
    // Written negated so a NaN maxNodes refuses rather than switching the bound off.
    if (!(n <= maxNodes)) {
        const bytes = (options.paths === true ? 12 : 8) * n * n;
        throw new RangeError(
            `allPairsShortestPath: ${String(n)} nodes exceeds maxNodes ${String(maxNodes)}; the result would allocate ${String(bytes)} bytes. Pass a larger maxNodes to allow it.`,
        );
    }
    const { w, negative } = weightsInUse(s, options);
    const method = pickStrategy(s, w, negative, options.method);
    const dist = new Float64Array(n * n);
    const predArc = options.paths === true ? new Uint32Array(n * n).fill(INVALID_INDEX) : null;
    let hasNegativeCycle = false;
    if (method === "bfs") {
        bfsRows(s, dist, predArc);
    } else if (method === "dijkstra" && w !== null) {
        dijkstraRows(s, w, dist, predArc);
    } else {
        hasNegativeCycle =
            (negative && w !== null && negativeCycleFromWeights(s, w)) || floydWarshall(s, w, negative, dist, predArc);
    }
    if (hasNegativeCycle) {
        dist.fill(NaN);
    }
    // Row i of predArc is a single-source predecessor-arc array, so the SSSP walkers apply to it.
    const row = (source: number, target: number): U32 => {
        if (predArc === null) {
            throw new Error("allPairsShortestPath: pass paths: true to walk shortest paths");
        }
        if (hasNegativeCycle) {
            throw new PathWalkError(source, target, "cycle");
        }
        return predArc.subarray(source * n, source * n + n);
    };
    return {
        dist,
        n,
        hasNegativeCycle,
        method,
        predArc,
        pathTo: (source, target) => walkPredArcs(s, row(source, target), source, target),
        pathEdges: (source, target) => walkPredEdges(s, row(source, target), source, target),
    };
}
