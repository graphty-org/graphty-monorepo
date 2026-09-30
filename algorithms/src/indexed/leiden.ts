import { type F64, type GraphSnapshot, renumberPartition, type U32 } from "@graphty/graph-format";

import { type LabelResult, withGroups } from "./components.js";
import { exactEdgeWeights, mulberry32 } from "./label-propagation.js";
import { modularity } from "./modularity.js";

/**
 * Options of the index-based Leiden. The names and defaults are the legacy `leiden`'s, but
 * `maxIterations` counts something else: see below.
 * @public
 */
export interface LeidenOptions {
    /** Resolution gamma: above 1 favours smaller communities; default 1. */
    readonly resolution?: number | undefined;
    /** Seed of the visit orders; default 42. */
    readonly randomSeed?: number | undefined;
    /**
     * Cap on whole passes over the original graph, each running as many levels as it needs; default
     * 100. The legacy `leiden` caps levels instead, so its `maxIterations: 1` is one level where
     * this is one full pass. The result's `iterations` counts levels.
     */
    readonly maxIterations?: number | undefined;
    /** Stop once a pass improves modularity by no more than this; default 1e-7. */
    readonly threshold?: number | undefined;
}

/** Result of the index-based Leiden: a partition plus the modularity it reaches. @public */
export interface LeidenResult extends LabelResult {
    /** Modularity of the returned partition, at the requested resolution. */
    readonly modularity: number;
    /** Levels processed, summed over every pass. */
    readonly iterations: number;
}

/** The randomness of refinement: 0.01 as in the paper and leidenalg. */
const THETA = 0.01;

/**
 * Passes in a row that may fail to improve modularity by more than the threshold before the run
 * stops. A failed pass is discarded, but the next one draws fresh visit orders and can still find a
 * move the last one missed: on the shared random fixtures, stopping at the first failure leaves the
 * mean modularity over 40 seeds below the legacy function's, and three restores it.
 */
const PATIENCE = 3;

/** One level of the hierarchy: a snapshot and the exact weight of each of its logical edges. */
interface Level {
    readonly s: GraphSnapshot;
    /** Exact weight per logical edge. */
    readonly edgeW: F64;
    /** Exact weight per arc. */
    readonly arcW: F64;
    /** Weighted degree per node, a self-loop counted twice (graph-format's `weightedDegree()` rule). */
    readonly deg: F64;
}

/**
 * Per-arc weights and weighted degrees of a level.
 * @param s - An undirected snapshot
 * @param edgeW - Exact weight per logical edge
 * @returns The level
 */
function levelOf(s: GraphSnapshot, edgeW: F64): Level {
    const { nodeCount: n, rowPtr, colIdx, arcToEdge } = s;
    const arcW = new Float64Array(s.arcCount);
    const deg = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        for (let a = rowPtr[u], end = rowPtr[u + 1]; a < end; a++) {
            const w = edgeW[arcToEdge[a]];
            arcW[a] = w;
            // An undirected self-loop is one arc; it adds to the degree twice.
            deg[u] += colIdx[a] === u ? 2 * w : w;
        }
    }
    return { s, edgeW, arcW, deg };
}

/**
 * Shuffle `0..n-1` with the generator.
 * @param n - Length
 * @param rand - Generator
 * @returns The permutation
 */
function shuffled(n: number, rand: () => number): U32 {
    const order = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        order[i] = i;
    }
    for (let i = n - 1; i >= 1; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
    }
    return order;
}

/**
 * Leiden's fast local moving: nodes wait in a queue started as a seeded shuffle; a visited node
 * moves to the neighbouring community (or an empty one) with the largest modularity gain, and when
 * it moves, its neighbours outside its new community are queued again. Ends when the queue empties.
 * @param level - The level
 * @param comm - Community of every node, below the node count; moved in place
 * @param rand - Generator
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 */
function moveNodesFast(level: Level, comm: U32, rand: () => number, resolution: number, m2: number): void {
    const { s, arcW, deg } = level;
    const { nodeCount: n, rowPtr, colIdx } = s;
    const tot = new Float64Array(n);
    const size = new Uint32Array(n);
    for (let u = 0; u < n; u++) {
        tot[comm[u]] += deg[u];
        size[comm[u]]++;
    }
    const empty: number[] = [];
    for (let c = n - 1; c >= 0; c--) {
        if (size[c] === 0) {
            empty.push(c);
        }
    }
    const acc = new Float64Array(n);
    const stamp = new Int32Array(n).fill(-1);
    const touched = new Uint32Array(n);
    const capacity = n + 1;
    const queue = new Uint32Array(capacity);
    queue.set(shuffled(n, rand));
    const queued = new Uint8Array(n).fill(1);
    let head = 0;
    let tail = n;
    let visit = 0;
    while (head !== tail) {
        const u = queue[head];
        head = head + 1 === capacity ? 0 : head + 1;
        queued[u] = 0;
        visit++;
        const cu = comm[u];
        const ku = deg[u];
        tot[cu] -= ku;
        size[cu]--;
        let cnt = 0;
        for (let a = rowPtr[u], end = rowPtr[u + 1]; a < end; a++) {
            const v = colIdx[a];
            if (v === u) {
                continue;
            }
            const c = comm[v];
            if (stamp[c] !== visit) {
                stamp[c] = visit;
                acc[c] = 0;
                touched[cnt++] = c;
            }
            acc[c] += arcW[a];
        }
        let best = cu;
        let bestGain = (stamp[cu] === visit ? acc[cu] : 0) - (resolution * ku * tot[cu]) / m2;
        for (let i = 0; i < cnt; i++) {
            const c = touched[i];
            const gain = acc[c] - (resolution * ku * tot[c]) / m2;
            if (c !== cu && gain > bestGain) {
                bestGain = gain;
                best = c;
            }
        }
        // An empty community gains 0; when u's own is empty now, staying already is that choice.
        if (size[cu] > 0 && bestGain < 0) {
            best = empty[empty.length - 1];
        }
        if (best !== cu && size[best] === 0) {
            empty.pop();
        }
        tot[best] += ku;
        size[best]++;
        if (best === cu) {
            continue;
        }
        comm[u] = best;
        if (size[cu] === 0) {
            empty.push(cu);
        }
        for (let a = rowPtr[u], end = rowPtr[u + 1]; a < end; a++) {
            const v = colIdx[a];
            if (queued[v] === 0 && comm[v] !== best) {
                queued[v] = 1;
                queue[tail] = v;
                tail = tail + 1 === capacity ? 0 : tail + 1;
            }
        }
    }
}

/**
 * Leiden's refinement: inside every community, nodes start alone and, visited in a seeded order,
 * a node still alone and well connected to its community merges into the well-connected
 * sub-community of that community, drawn at random weighted by its modularity gain. Every
 * sub-community is connected, which is the guarantee Leiden adds over Louvain.
 *
 * The target is drawn at random among the candidates with a non-negative gain, with probability
 * proportional to exp(gain / theta) where the gain is in modularity units, as the paper does
 * (theta 0.01, leidenalg's default).
 * @param level - The level
 * @param comm - Community of every node
 * @param rand - Generator
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @returns The sub-community of every node, labelled by a member's index (not dense)
 */
function refine(level: Level, comm: U32, rand: () => number, resolution: number, m2: number): U32 {
    const { s, arcW, deg } = level;
    const { nodeCount: n, rowPtr, colIdx } = s;
    const commTot = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        commTot[comm[u]] += deg[u];
    }
    const ref = new Uint32Array(n);
    const refTot = new Float64Array(n);
    const refSize = new Uint32Array(n);
    // Weight from each sub-community to the rest of its community.
    const ext = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        ref[u] = u;
        refTot[u] = deg[u];
        refSize[u] = 1;
        for (let a = rowPtr[u], end = rowPtr[u + 1]; a < end; a++) {
            const v = colIdx[a];
            if (v !== u && comm[v] === comm[u]) {
                ext[u] += arcW[a];
            }
        }
    }
    const acc = new Float64Array(n);
    const stamp = new Int32Array(n).fill(-1);
    const touched = new Uint32Array(n);
    const order = shuffled(n, rand);
    for (let i = 0; i < n; i++) {
        const v = order[i];
        const c = comm[v];
        const kv = deg[v];
        if (refSize[v] !== 1 || ext[v] < (resolution * kv * (commTot[c] - kv)) / m2) {
            continue;
        }
        let cnt = 0;
        for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
            const x = colIdx[a];
            if (x === v || comm[x] !== c) {
                continue;
            }
            const r = ref[x];
            if (stamp[r] !== v) {
                stamp[r] = v;
                acc[r] = 0;
                touched[cnt++] = r;
            }
            acc[r] += arcW[a];
        }
        // Candidates: well-connected sub-communities with a non-negative gain, drawn with probability
        // exp(gain in modularity units / theta), shifted by the best gain so exp never overflows.
        const gainOf = (r: number): number => acc[r] - (resolution * kv * refTot[r]) / m2;
        let maxGain = -Infinity;
        let kept = 0;
        for (let j = 0; j < cnt; j++) {
            const r = touched[j];
            const gain = gainOf(r);
            if (gain >= 0 && ext[r] >= (resolution * refTot[r] * (commTot[c] - refTot[r])) / m2) {
                touched[kept++] = r;
                maxGain = Math.max(maxGain, gain);
            }
        }
        if (kept === 0) {
            continue;
        }
        const weight = (r: number): number => Math.exp(((gainOf(r) - maxGain) * 2) / m2 / THETA);
        let total = 0;
        for (let j = 0; j < kept; j++) {
            total += weight(touched[j]);
        }
        let draw = rand() * total;
        let best = touched[kept - 1];
        for (let j = 0; j < kept - 1; j++) {
            draw -= weight(touched[j]);
            if (draw < 0) {
                best = touched[j];
                break;
            }
        }
        ref[v] = best;
        refSize[v] = 0;
        refSize[best]++;
        refTot[best] += kv;
        // The edges between v and its new sub-community are now inside it.
        ext[best] += ext[v] - 2 * acc[best];
    }
    return ref;
}

/**
 * One pass of Leiden from a starting partition of the original graph: local moving, refinement,
 * aggregation by the refined partition with each aggregate node starting in its community, repeated
 * until local moving leaves every community a single node of its level.
 * @param base - Level 0, the original graph
 * @param start - Dense community of every original node
 * @param rand - Generator
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @returns The partition of the original nodes (not dense) and the levels processed
 */
function pass(
    base: Level,
    start: U32,
    rand: () => number,
    resolution: number,
    m2: number,
): { comm: U32; levels: number } {
    const n0 = base.s.nodeCount;
    // Which node of the current level holds each original node.
    const top = new Uint32Array(n0);
    for (let u = 0; u < n0; u++) {
        top[u] = u;
    }
    let level = base;
    let comm = start.slice();
    let levels = 0;
    for (;;) {
        moveNodesFast(level, comm, rand, resolution, m2);
        levels++;
        const dense = renumberPartition(comm);
        if (dense.count === level.s.nodeCount) {
            break;
        }
        let blocks = refine(level, dense.labels, rand, resolution, m2);
        if (renumberPartition(blocks).count === level.s.nodeCount) {
            // No sub-community merged: aggregate by the communities themselves, as Louvain does, so
            // the next level is smaller.
            blocks = dense.labels;
        }
        const d = level.s.contract(blocks);
        const { nodeRemap, edgeRemap } = d;
        const next = d.snapshot;
        const edgeW = new Float64Array(next.edgeCount);
        for (let e = 0; e < level.edgeW.length; e++) {
            edgeW[edgeRemap === null ? e : edgeRemap[e]] += level.edgeW[e];
        }
        const nextComm = new Uint32Array(next.nodeCount);
        for (let u = 0; u < level.s.nodeCount; u++) {
            nextComm[nodeRemap === null ? u : nodeRemap[u]] = dense.labels[u];
        }
        if (nodeRemap !== null) {
            for (let u = 0; u < n0; u++) {
                top[u] = nodeRemap[top[u]];
            }
        }
        comm = renumberPartition(nextComm).labels;
        level = levelOf(next, edgeW);
    }
    const out = new Uint32Array(n0);
    for (let u = 0; u < n0; u++) {
        out[u] = comm[top[u]];
    }
    return { comm: out, levels };
}

/**
 * Leiden community detection (Traag, Waltman and van Eck, Sci. Rep. 9:5233, 2019) over an
 * undirected snapshot: fast local moving, refinement into well-connected sub-communities, and
 * aggregation by `contract()` once per level. Whole passes repeat from the previous answer, keeping
 * a pass only when it raises modularity, until three passes in a row improve it by no more than
 * `threshold` or `maxIterations` passes have run; every pass starts by moving single original
 * nodes, so the answer is also a local optimum of those moves.
 *
 * Modularity follows graph-format's `weightedDegree()` convention (a self-loop counts twice), which
 * on a graph without self-loops equals the legacy `leiden`'s. Weights are the exact f64 ones when
 * the snapshot keeps them. The partition is not the legacy function's move for move: the legacy
 * `leiden` splits disconnected communities rather than refining them, and visits nodes in another
 * order; what this guarantees is connected communities. Both are randomised heuristics, so for one
 * seed either can come out ahead; on the shared fixtures this one's modularity is at least the
 * legacy's at the default seed and on average over seeds.
 * @param s - An undirected snapshot
 * @param options - Resolution, seed, pass cap and stopping threshold
 * @returns The partition, its modularity, and the levels processed
 * @throws Error on a directed snapshot; RangeError for a negative, NaN or infinite weight or a
 *   fractional seed
 * @public
 */
export function leiden(s: GraphSnapshot, options: LeidenOptions = {}): LeidenResult {
    if (s.directed) {
        throw new Error("Leiden requires an undirected graph. Pass s.toUndirected().snapshot.");
    }
    const resolution = options.resolution ?? 1;
    const randomSeed = options.randomSeed ?? 42;
    const maxIterations = options.maxIterations ?? 100;
    const threshold = options.threshold ?? 1e-7;
    if (!Number.isInteger(randomSeed)) {
        throw new RangeError(`randomSeed must be a finite integer, got ${randomSeed}`);
    }
    const n = s.nodeCount;
    const given = exactEdgeWeights(s) ?? s.edgeList().weights;
    const edgeW = given === null ? new Float64Array(s.edgeCount).fill(1) : Float64Array.from(given);
    for (let e = 0; e < edgeW.length; e++) {
        const w = edgeW[e];
        if (!(w >= 0) || w === Infinity) {
            throw new RangeError(`edge ${e} has weight ${w}; Leiden needs finite, non-negative weights`);
        }
    }
    const base = levelOf(s, edgeW);
    let m2 = 0;
    for (let u = 0; u < n; u++) {
        m2 += base.deg[u];
    }
    let labels = new Uint32Array(n);
    for (let u = 0; u < n; u++) {
        labels[u] = u;
    }
    if (m2 === 0) {
        return { ...withGroups(labels, n), modularity: 0, iterations: 0 };
    }
    const quality = (partition: U32): number => modularity(s, partition, { resolution, weights: base.arcW });
    const rand = mulberry32(randomSeed);
    let q = quality(labels);
    let iterations = 0;
    let idle = 0;
    for (let i = 0; i < maxIterations && idle < PATIENCE; i++) {
        const { comm, levels } = pass(base, labels, rand, resolution, m2);
        iterations += levels;
        const candidate = renumberPartition(comm).labels;
        const qNext = quality(candidate);
        if (qNext > q) {
            idle = qNext - q <= threshold ? idle + 1 : 0;
            labels = candidate;
            q = qNext;
        } else {
            idle++;
        }
    }
    return { ...withGroups(labels, renumberPartition(labels).count), modularity: q, iterations };
}
