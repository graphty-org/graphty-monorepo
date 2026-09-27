import { type GraphSnapshot, renumberPartition } from "@graphty/graph-format";

import { type LabelResult, withGroups } from "./components.js";

/** Options of the index-based Louvain, matching the legacy `louvain`. @public */
export interface LouvainOptions {
    /** Resolution gamma: above 1 favours smaller communities; default 1. */
    readonly resolution?: number | undefined;
    /** Cap on aggregation levels, and on node visits per node within a level; default 100. */
    readonly maxIterations?: number | undefined;
    /** Stop when a level improves modularity by less than this; default 1e-6. */
    readonly tolerance?: number | undefined;
}

/** Result of the index-based Louvain: a partition plus the modularity it reaches. @public */
export interface LouvainResult extends LabelResult {
    /** Modularity of the returned partition, at the requested resolution. */
    readonly modularity: number;
    /** Aggregation levels that improved the partition. */
    readonly iterations: number;
}

/**
 * One level of the Louvain hierarchy as a weighted adjacency with the self-loops lifted out.
 *
 * Self-loops live in `loop` rather than in the arc list, so the local-moving loop never meets a
 * node as its own neighbour, and `deg` (the null-model term) counts a self-loop twice, which is
 * the NetworkX weighted-degree convention: summing `deg` gives 2m at every level.
 */
interface Level {
    /** Node count of this level. */
    readonly n: number;
    /** n + 1 row offsets into colIdx / w. */
    readonly rowPtr: Uint32Array;
    /** Neighbour of every arc; no arc targets its own row. */
    readonly colIdx: Uint32Array;
    /** Weight of every arc. */
    readonly w: Float64Array;
    /** Self-loop weight per node, counted ONCE (as an edge weight). */
    readonly loop: Float64Array;
    /** Weighted degree per node: the row's arc weights plus twice its self-loop weight. */
    readonly deg: Float64Array;
}

/**
 * Level 0: the snapshot's own arcs, with the self-loop arcs moved into `loop`.
 * @param s - An undirected snapshot
 * @returns The first level
 */
function buildLevel0(s: GraphSnapshot): Level {
    const n = s.nodeCount;
    const rowPtr = new Uint32Array(n + 1);
    for (let u = 0; u < n; u++) {
        let kept = 0;
        const end = s.rowPtr[u + 1];
        for (let a = s.rowPtr[u]; a < end; a++) {
            if (s.colIdx[a] !== u) {
                kept++;
            }
        }
        rowPtr[u + 1] = rowPtr[u] + kept;
    }
    const arcs = rowPtr[n];
    const colIdx = new Uint32Array(arcs);
    const w = new Float64Array(arcs);
    const loop = new Float64Array(n);
    const deg = new Float64Array(n);
    let k = 0;
    for (let u = 0; u < n; u++) {
        let rowWeight = 0;
        const end = s.rowPtr[u + 1];
        for (let a = s.rowPtr[u]; a < end; a++) {
            const v = s.colIdx[a];
            const weight = s.weights === null ? 1 : s.weights[a];
            if (v === u) {
                loop[u] += weight;
            } else {
                colIdx[k] = v;
                w[k] = weight;
                k++;
                rowWeight += weight;
            }
        }
        deg[u] = rowWeight + 2 * loop[u];
    }
    return { n, rowPtr, colIdx, w, loop, deg };
}

/**
 * Modularity of a partition of one level: `sum_c in_c / 2m - gamma * (tot_c / 2m)^2`, with `in_c`
 * counting each internal edge twice. This is the same quantity the legacy `calculateModularity`
 * computes over a `Graph`, written per arc.
 * @param level - The level the partition is over
 * @param comm - Community of every node of that level
 * @param count - Number of communities, so `comm` is within `[0, count)`
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @returns The modularity
 */
function modularityOf(level: Level, comm: Uint32Array, count: number, resolution: number, m2: number): number {
    const inside = new Float64Array(count);
    const tot = new Float64Array(count);
    for (let u = 0; u < level.n; u++) {
        const c = comm[u];
        tot[c] += level.deg[u];
        inside[c] += 2 * level.loop[u];
        const end = level.rowPtr[u + 1];
        for (let a = level.rowPtr[u]; a < end; a++) {
            if (comm[level.colIdx[a]] === c) {
                inside[c] += level.w[a];
            }
        }
    }
    let q = 0;
    for (let c = 0; c < count; c++) {
        const share = tot[c] / m2;
        q += inside[c] / m2 - resolution * share * share;
    }
    return q;
}

/**
 * Phase one: move each node to the neighbouring community with the largest modularity gain, until
 * no move is left to make.
 *
 * Nodes wait in a queue rather than in repeated sweeps over all of them, which is what makes this
 * affordable on a graph with no community structure: there the last moves are worth a millionth of
 * a point each and go on for dozens of passes, and a pass costs every node and every arc whether or
 * not anything can move. A node enters the queue when a neighbour leaves its community, so the tail
 * of the run costs the handful of nodes that can still move. Same fixed point, and it is the rule
 * networkx's `louvain_communities` follows.
 * @param level - The level to optimise
 * @param comm - Output: community of every node, overwritten with the singleton partition first
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @param maxVisitsPerNode - Cap on node visits, as a multiple of the node count
 * @returns Whether any node moved
 */
function localMove(
    level: Level,
    comm: Uint32Array,
    resolution: number,
    m2: number,
    maxVisitsPerNode: number,
): boolean {
    const { n } = level;
    const tot = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        comm[u] = u;
        tot[u] = level.deg[u];
    }
    const acc = new Float64Array(n);
    // A visit stamp rather than a clear pass: `mark` grows monotonically over the whole run, so a
    // value left in acc by an earlier visit is never mistaken for this one's.
    const stamp = new Int32Array(n).fill(-1);
    const touched = new Uint32Array(n);
    // A ring of n + 1 slots: `queued` keeps a node out of the queue twice, so n entries is the most
    // that can be waiting.
    const capacity = n + 1;
    const queue = new Uint32Array(capacity);
    const queued = new Uint8Array(n);
    let head = 0;
    let tail = n;
    for (let u = 0; u < n; u++) {
        queue[u] = u;
        queued[u] = 1;
    }
    let mark = 0;
    let visits = 0;
    const maxVisits = maxVisitsPerNode * n;
    let movedAny = false;
    while (head !== tail && visits < maxVisits) {
        const u = queue[head];
        head = head + 1 === capacity ? 0 : head + 1;
        queued[u] = 0;
        visits++;
        const cu = comm[u];
        const ku = level.deg[u];
        tot[cu] -= ku;
        mark++;
        let cnt = 0;
        const end = level.rowPtr[u + 1];
        for (let a = level.rowPtr[u]; a < end; a++) {
            const c = comm[level.colIdx[a]];
            if (stamp[c] !== mark) {
                stamp[c] = mark;
                acc[c] = 0;
                touched[cnt++] = c;
            }
            acc[c] += level.w[a];
        }
        let best = cu;
        let bestGain = (stamp[cu] === mark ? acc[cu] : 0) - (resolution * ku * tot[cu]) / m2;
        for (let i = 0; i < cnt; i++) {
            const c = touched[i];
            if (c === cu) {
                continue;
            }
            const gain = acc[c] - (resolution * ku * tot[c]) / m2;
            if (gain > bestGain) {
                bestGain = gain;
                best = c;
            }
        }
        tot[best] += ku;
        if (best !== cu) {
            comm[u] = best;
            movedAny = true;
            // Only a neighbour outside the community u just joined can gain from u's move.
            for (let a = level.rowPtr[u]; a < end; a++) {
                const v = level.colIdx[a];
                if (queued[v] === 0 && comm[v] !== best) {
                    queued[v] = 1;
                    queue[tail] = v;
                    tail = tail + 1 === capacity ? 0 : tail + 1;
                }
            }
        }
    }
    return movedAny;
}

/**
 * Phase two: every community becomes one node, the edges between two communities merge into one
 * arc, and the edges inside a community become that node's self-loop. Rows are NOT sorted by
 * neighbour index; nothing downstream of here needs them to be.
 * @param level - The level to collapse
 * @param comm - Dense community of every node of that level
 * @param count - Number of communities
 * @returns The next level, with `count` nodes
 */
function aggregate(level: Level, comm: Uint32Array, count: number): Level {
    const start = new Uint32Array(count + 1);
    for (let u = 0; u < level.n; u++) {
        start[comm[u] + 1]++;
    }
    for (let c = 0; c < count; c++) {
        start[c + 1] += start[c];
    }
    const members = new Uint32Array(level.n);
    const fill = start.slice(0, count);
    for (let u = 0; u < level.n; u++) {
        members[fill[comm[u]]++] = u;
    }
    const rowPtr = new Uint32Array(count + 1);
    const colIdx = new Uint32Array(level.colIdx.length);
    const w = new Float64Array(level.colIdx.length);
    const loop = new Float64Array(count);
    const deg = new Float64Array(count);
    const acc = new Float64Array(count);
    const stamp = new Int32Array(count).fill(-1);
    const touched = new Uint32Array(count);
    let k = 0;
    for (let c = 0; c < count; c++) {
        rowPtr[c] = k;
        let internalArcs = 0;
        let cnt = 0;
        for (let i = start[c]; i < start[c + 1]; i++) {
            const u = members[i];
            loop[c] += level.loop[u];
            const end = level.rowPtr[u + 1];
            for (let a = level.rowPtr[u]; a < end; a++) {
                const other = comm[level.colIdx[a]];
                if (other === c) {
                    internalArcs += level.w[a];
                    continue;
                }
                if (stamp[other] !== c) {
                    stamp[other] = c;
                    acc[other] = 0;
                    touched[cnt++] = other;
                }
                acc[other] += level.w[a];
            }
        }
        // An edge between two members shows up as two arcs, one from each end.
        loop[c] += internalArcs / 2;
        let rowWeight = 0;
        for (let i = 0; i < cnt; i++) {
            const other = touched[i];
            colIdx[k] = other;
            w[k] = acc[other];
            rowWeight += acc[other];
            k++;
        }
        deg[c] = rowWeight + 2 * loop[c];
    }
    rowPtr[count] = k;
    return { n: count, rowPtr, colIdx: colIdx.subarray(0, k), w: w.subarray(0, k), loop, deg };
}

/**
 * Louvain community detection over a snapshot: local moving to the best modularity gain, then
 * collapse each community into a node and repeat, until a level stops paying for itself.
 *
 * The legacy `louvain` switches implementation at 50 nodes (`useOptimized`) and its small-graph
 * path has no aggregation phase at all, so this port is not move-for-move identical to either
 * branch of it -- what it guarantees is a partition whose modularity is at least as high, measured
 * by the same formula.
 * @param s - An undirected snapshot
 * @param o - Algorithm options
 * @returns The partition, its modularity, and the number of levels that improved it
 * @public
 */
export function louvain(s: GraphSnapshot, o: LouvainOptions = {}): LouvainResult {
    if (s.directed) {
        throw new Error("Louvain requires an undirected graph. Pass s.toUndirected().snapshot.");
    }
    const resolution = o.resolution ?? 1;
    const maxIterations = o.maxIterations ?? 100;
    const tolerance = o.tolerance ?? 1e-6;
    const n0 = s.nodeCount;
    const labels = new Uint32Array(n0);
    for (let u = 0; u < n0; u++) {
        labels[u] = u;
    }
    let level = buildLevel0(s);
    let m2 = 0;
    for (let u = 0; u < n0; u++) {
        m2 += level.deg[u];
    }
    if (m2 === 0) {
        // No edge weight to redistribute: every node is its own community and Q is 0 by definition,
        // which is what the legacy `calculateModularity` also answers.
        return { ...withGroups(labels, n0), modularity: 0, iterations: 0 };
    }
    let q = modularityOf(level, labels, n0, resolution, m2);
    let iterations = 0;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const comm = new Uint32Array(level.n);
        if (!localMove(level, comm, resolution, m2, maxIterations)) {
            break;
        }
        const dense = renumberPartition(comm);
        const { count } = dense;
        const packed = dense.labels;
        const newQ = modularityOf(level, packed, count, resolution, m2);
        for (let u = 0; u < n0; u++) {
            labels[u] = packed[labels[u]];
        }
        iterations = iteration + 1;
        const gain = newQ - q;
        q = newQ;
        if (gain < tolerance || count === level.n) {
            break;
        }
        level = aggregate(level, packed, count);
    }
    const final = renumberPartition(labels);
    return { ...withGroups(final.labels, final.count), modularity: q, iterations };
}
