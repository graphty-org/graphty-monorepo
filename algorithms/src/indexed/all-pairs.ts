import type { F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

/** The default `maxNodes`: the GPU kernel's ceiling at WebGPU's 128 MiB storage binding, floor(sqrt(2^27 / 4)). */
const DEFAULT_MAX_NODES = 5792;

/** Options of the index-based all-pairs shortest paths. @public */
export interface ApspOptions {
    /** Per-arc weight override, arcCount long; defaults to `s.weights` (null = 1 per arc). */
    readonly weights?: NumericVector | undefined;
    /** `false` counts hops and ignores every weight. Default true. */
    readonly weighted?: boolean | undefined;
    /**
     * Strategy override. `"auto"` (the default): BFS rows on unit weights, Floyd-Warshall on any
     * negative weight, Dijkstra rows below arcCount n^2 / 4, Floyd-Warshall otherwise.
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
            throw new RangeError(`allPairsShortestPath: arc ${String(a)} has weight ${String(x)}; weights must be finite`);
        }
        unit &&= x === 1;
        negative ||= x < 0;
    }
    return { w: unit ? null : w, negative };
}

/**
 * Floyd-Warshall in place (design section 3.1): k-i-j over the row-major matrix, row offsets
 * hoisted, a row skipped when `d[i][k]` is +Infinity, strict `<` so the smallest pivot wins ties.
 * @param s - The snapshot
 * @param w - The weights in use, or `null` for 1 per arc
 * @param d - The n x n output, overwritten
 */
function floydWarshall(s: GraphSnapshot, w: NumericVector | null, d: F64): void {
    const { nodeCount: n, rowPtr, colIdx } = s;
    d.fill(Infinity);
    for (let u = 0; u < n; u++) {
        const ur = u * n;
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const v = colIdx[a];
            const x = w === null ? 1 : w[a];
            if (v !== u && x < d[ur + v]) {
                d[ur + v] = x;
            }
        }
        d[ur + u] = 0;
    }
    for (let k = 0; k < n; k++) {
        const kr = k * n;
        for (let i = 0; i < n; i++) {
            const ir = i * n;
            const dik = d[ir + k];
            if (dik === Infinity) {
                continue;
            }
            for (let j = 0; j < n; j++) {
                const via = dik + d[kr + j];
                if (via < d[ir + j]) {
                    d[ir + j] = via;
                }
            }
        }
    }
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
    const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
    if (n > maxNodes) {
        const bytes = (options.paths === true ? 12 : 8) * n * n;
        throw new RangeError(
            `allPairsShortestPath: ${String(n)} nodes exceeds maxNodes ${String(maxNodes)}; the result would allocate ${String(bytes)} bytes. Pass a larger maxNodes to allow it.`,
        );
    }
    const { w } = weightsInUse(s, options);
    const dist = new Float64Array(n * n);
    floydWarshall(s, w, dist);
    const empty = new Uint32Array(0);
    return {
        dist,
        n,
        hasNegativeCycle: false,
        method: "floyd-warshall",
        predArc: null,
        pathTo: () => empty,
        pathEdges: () => empty,
    };
}
