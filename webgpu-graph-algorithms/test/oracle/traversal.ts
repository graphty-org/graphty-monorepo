/**
 * The four CPU references of the P8 frontier family (spec 11.3 "Algorithm differential", 13 row P8): a FIFO
 * breadth-first search, a binary-heap Dijkstra in f64 AND f32 (PD-10), Bellman-Ford with negative-cycle detection,
 * and the closeness reduction over the BFS rows. Written from the algorithms, index-based over the snapshot's
 * `rowPtr` / `colIdx` / `weights`, never from a kernel, and kept beside `indexed.*` of @graphty/algorithms as a
 * second oracle: a GPU tested only against the CPU package shares its design and its bugs. Imports nothing from
 * `src/` and nothing from the package under test.
 *
 * What the f32 precision means: every partial sum passes through `Math.fround` at each relaxation, which is exactly
 * what one f32 add in a kernel does, so the f32 run is the one the GPU must match BITWISE (PD-9) and the f64 run is
 * the one that says how far f32 has drifted (the noise floor of design 11.9 item 3). Both return `Float64Array`;
 * under f32 every value is an exactly representable f32, so `Array.from` of it equals `Array.from` of the GPU's
 * `Float32Array` when the two agree.
 */

import { type GraphSnapshot, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";

/** The FIFO BFS result: the FIFO parent (the first discoverer) and the FIFO visit order. */
interface BfsOracleResult {
    readonly depth: U32;
    readonly parent: U32;
    readonly order: U32;
    readonly visitedCount: number;
}

/** A shortest-path result: `dist` is `+Infinity` when unreached; `predArc` is the arc that last relaxed the node. */
interface SsspOracleResult {
    readonly dist: Float64Array;
    readonly predArc: U32;
    readonly reachedCount: number;
}

/** Bellman-Ford's result: when the flag is set, `dist` is the last round's value, not a shortest path. */
interface BellmanFordOracleResult extends SsspOracleResult {
    readonly hasNegativeCycle: boolean;
}

/** The closeness result with the per-source sum of finite distances and reached count (P8-T11 Step 5 compares them). */
interface ClosenessOracleResult {
    readonly scores: Float64Array;
    readonly sum: Float64Array;
    readonly reached: Uint32Array;
}

/**
 * The weight of arc `a` under an optional override: 1 on an unweighted snapshot.
 * @param s - the snapshot
 * @param weights - a per-arc override, `arcCount` long
 * @returns the weight lookup
 */
function weightOf(s: GraphSnapshot, weights: NumericVector | undefined): (a: number) => number {
    const column = weights ?? s.weights;
    if (column === null) {
        return () => 1;
    }
    if (column.length !== s.arcCount) {
        throw new Error(`weights has ${column.length} entries, arcCount is ${s.arcCount}`);
    }
    return (a) => column[a];
}

/**
 * FIFO breadth-first search over out-neighbours. A node at `maxDepth` is reached and not expanded, exactly as
 * `indexed.breadthFirstSearch` does, so `visitedCount` includes it.
 * @param s - the snapshot
 * @param source - the source node index
 * @param maxDepth - the level cap; unbounded when omitted
 * @returns the depths, the FIFO parents, the FIFO order and the visited count
 */
export function bfsOracle(s: GraphSnapshot, source: number, maxDepth?: number): BfsOracleResult {
    const n = s.nodeCount;
    const { rowPtr, colIdx } = s;
    const depth = new Uint32Array(n).fill(INVALID_INDEX);
    const parent = new Uint32Array(n).fill(INVALID_INDEX);
    const queue = new Uint32Array(n);
    const cap = maxDepth ?? INVALID_INDEX;
    let head = 0;
    let tail = 0;
    queue[tail++] = source;
    depth[source] = 0;
    while (head < tail) {
        const u = queue[head++];
        const d = depth[u];
        if (d >= cap) {
            continue;
        }
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const v = colIdx[a];
            if (depth[v] === INVALID_INDEX) {
                depth[v] = d + 1;
                parent[v] = u;
                queue[tail++] = v;
            }
        }
    }
    return { depth, parent, order: queue.slice(0, tail), visitedCount: tail };
}

/** An array-backed binary min-heap of node indices keyed by a distance, with decrease-key by position. */
class MinHeap {
    private readonly heap: number[] = [];
    private readonly pos: Int32Array;
    private readonly key: Float64Array;

    constructor(n: number, key: Float64Array) {
        this.pos = new Int32Array(n).fill(-1);
        this.key = key;
    }

    get size(): number {
        return this.heap.length;
    }

    /**
     * Pushes `v` when absent, else sifts it up (its key already lowered by the caller).
     * @param v - the node index
     */
    pushOrDecrease(v: number): void {
        if (this.pos[v] < 0) {
            this.pos[v] = this.heap.length;
            this.heap.push(v);
        }
        this.up(this.pos[v]);
    }

    /**
     * Pops the node with the smallest key.
     * @returns the node index
     */
    pop(): number {
        const top = this.heap[0];
        const last = this.heap.pop();
        this.pos[top] = -1;
        if (last !== undefined && this.heap.length > 0) {
            this.heap[0] = last;
            this.pos[last] = 0;
            this.down(0);
        }
        return top;
    }

    private swap(i: number, j: number): void {
        const a = this.heap[i];
        const b = this.heap[j];
        this.heap[i] = b;
        this.heap[j] = a;
        this.pos[b] = i;
        this.pos[a] = j;
    }

    private up(i: number): void {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.key[this.heap[p]] <= this.key[this.heap[i]]) {
                return;
            }
            this.swap(i, p);
            i = p;
        }
    }

    private down(i: number): void {
        const n = this.heap.length;
        for (;;) {
            const l = 2 * i + 1;
            const r = l + 1;
            let m = i;
            if (l < n && this.key[this.heap[l]] < this.key[this.heap[m]]) {
                m = l;
            }
            if (r < n && this.key[this.heap[r]] < this.key[this.heap[m]]) {
                m = r;
            }
            if (m === i) {
                return;
            }
            this.swap(i, m);
            i = m;
        }
    }
}

/**
 * Binary-heap Dijkstra. Under `"f32"` every weight and every partial sum is rounded through `Math.fround`, one f32
 * add per relaxation; under `"f64"` it accumulates in JavaScript numbers. `cutoff` is the CPU port's `dv <= cutoff`
 * guard on every relaxation; `weights` replaces the snapshot's column for the run.
 * @param s - the snapshot
 * @param source - the source node index
 * @param precision - the accumulation precision (PD-10)
 * @param options - the cutoff and the per-arc weight override
 * @returns the distances, the relaxing arcs and the reached count
 */
export function dijkstraOracle(
    s: GraphSnapshot,
    source: number,
    precision: "f64" | "f32",
    options?: { readonly cutoff?: number | undefined; readonly weights?: NumericVector | undefined },
): SsspOracleResult {
    const n = s.nodeCount;
    const { rowPtr, colIdx } = s;
    const w = weightOf(s, options?.weights);
    const round = precision === "f32" ? Math.fround : (x: number): number => x;
    const cutoff = options?.cutoff ?? Infinity;
    const dist = new Float64Array(n).fill(Infinity);
    const predArc = new Uint32Array(n).fill(INVALID_INDEX);
    const heap = new MinHeap(n, dist);
    dist[source] = 0;
    heap.pushOrDecrease(source);
    let reachedCount = 0;
    while (heap.size > 0) {
        const u = heap.pop();
        reachedCount += 1;
        const du = dist[u];
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const v = colIdx[a];
            const dv = round(du + round(w(a)));
            if (dv < dist[v] && dv <= cutoff) {
                dist[v] = dv;
                predArc[v] = a;
                heap.pushOrDecrease(v);
            }
        }
    }
    return { dist, predArc, reachedCount };
}

/**
 * Bellman-Ford: `n - 1` full relaxation rounds over every arc in f32 (`Math.fround` per add, so the tie rule of
 * `expectPredArcAttains` holds bitwise), then one more round that sets the negative-cycle flag if anything still
 * improves.
 * @param s - the snapshot
 * @param source - the source node index
 * @param weights - a per-arc override, `arcCount` long; the snapshot's column (or 1) when omitted
 * @returns the distances, the relaxing arcs, the reached count and the flag
 */
export function bellmanFordOracle(s: GraphSnapshot, source: number, weights?: NumericVector): BellmanFordOracleResult {
    const n = s.nodeCount;
    const { rowPtr, colIdx } = s;
    const w = weightOf(s, weights);
    const dist = new Float64Array(n).fill(Infinity);
    const predArc = new Uint32Array(n).fill(INVALID_INDEX);
    dist[source] = 0;
    const relaxAll = (): boolean => {
        let improved = false;
        for (let u = 0; u < n; u++) {
            const du = dist[u];
            if (du === Infinity) {
                continue;
            }
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                const dv = Math.fround(du + Math.fround(w(a)));
                if (dv < dist[v]) {
                    dist[v] = dv;
                    predArc[v] = a;
                    improved = true;
                }
            }
        }
        return improved;
    };
    for (let round = 0; round + 1 < n; round++) {
        if (!relaxAll()) {
            break;
        }
    }
    const hasNegativeCycle = relaxAll();
    let reachedCount = 0;
    for (let v = 0; v < n; v++) {
        if (dist[v] !== Infinity) {
            reachedCount += 1;
        }
    }
    return { dist, predArc, reachedCount, hasNegativeCycle };
}

/**
 * Closeness: the FIFO BFS (or the f32 Dijkstra when `weighted`) from every source, then
 * `score[s] = 1 / sum` with `sum` the sum of the finite distances from `s` to every OTHER node (an unreached node
 * adds nothing) and `0` when nothing is reached -- the legacy `normalized: false` default of `closenessCentrality`
 * in @graphty/algorithms, the parity target P8-T11 Step 2 fixes. No reached factor, no Wasserman-Faust scaling.
 * @param s - the snapshot
 * @param weighted - sum the f32 shortest-path distances instead of the hop counts
 * @returns the scores and the per-source `sum` and `reached` counts
 */
export function closenessOracle(s: GraphSnapshot, weighted: boolean): ClosenessOracleResult {
    const n = s.nodeCount;
    const scores = new Float64Array(n);
    const sum = new Float64Array(n);
    const reached = new Uint32Array(n);
    for (let src = 0; src < n; src++) {
        const dist: ArrayLike<number> = weighted ? dijkstraOracle(s, src, "f32").dist : bfsOracle(s, src).depth;
        let total = 0;
        let count = 0;
        for (let v = 0; v < n; v++) {
            const d = dist[v];
            if (v === src || d === INVALID_INDEX || d === Infinity) {
                continue;
            }
            total += d;
            count += 1;
        }
        sum[src] = total;
        reached[src] = count;
        scores[src] = total === 0 ? 0 : 1 / total;
    }
    return { scores, sum, reached };
}
