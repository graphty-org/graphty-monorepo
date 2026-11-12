import { detExp, type F64, type GraphSnapshot, renumberPartition, type U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { mulberry32 } from "../utils/math-utilities.js";
import { type LabelResult, withGroups } from "./components.js";
import { exactEdgeWeights } from "./label-propagation.js";
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

/** Per-visit tally of the weight from one node to each community, stamped so it never needs clearing. */
interface Tally {
    readonly acc: F64;
    readonly stamp: Int32Array;
    readonly touched: U32;
}

/**
 * An empty tally over n communities.
 * @param n - The node count
 * @returns The tally
 */
function tallyOf(n: number): Tally {
    return { acc: new Float64Array(n), stamp: new Int32Array(n).fill(-1), touched: new Uint32Array(n) };
}

/** The local-moving work queue: a ring of node ids, with `queued` marking the nodes in it. */
/** The communities of a fast local move, with the modularity gain's constants. */
interface Communities {
    /** Total degree of every community. */
    readonly tot: F64;
    /** Size of every community. */
    readonly size: U32;
    /** Empty communities, the next to use last. */
    readonly empty: number[];
    /** Resolution gamma. */
    readonly resolution: number;
    /** Twice the total edge weight. */
    readonly m2: number;
}

interface Ring {
    readonly queue: U32;
    readonly queued: Uint8Array;
    readonly capacity: number;
    head: number;
    tail: number;
}

/**
 * Sum the weight from u to each neighbouring community, self-loops skipped.
 * @param level - The level
 * @param comm - Community of every node
 * @param t - The tally, written for this visit
 * @param u - The node
 * @param visit - The visit number
 * @returns The communities listed in `t.touched`
 */
function tallyNeighbourCommunities(level: Level, comm: U32, t: Tally, u: number, visit: number): number {
    const { rowPtr, colIdx } = level.s;
    const { acc, stamp, touched } = t;
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
        acc[c] += level.arcW[a];
    }
    return cnt;
}

/**
 * The community u (taken out of `cu`) moves to: the neighbouring one with the largest modularity
 * gain, or an empty one when every gain is negative. Takes the chosen empty community off `empty`.
 * @param t - The tally of u's visit
 * @param cnt - Communities in the tally
 * @param cu - u's community
 * @param ku - u's weighted degree
 * @param cs - The communities without u, and the gain's constants
 * @param visit - The visit number
 * @returns The chosen community
 */
function chooseCommunity(t: Tally, cnt: number, cu: number, ku: number, cs: Communities, visit: number): number {
    const { acc, stamp, touched } = t;
    const { tot, size, empty, resolution, m2 } = cs;
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
    return best;
}

/**
 * Queue again every neighbour of u not queued and outside u's new community.
 * @param level - The level
 * @param comm - Community of every node
 * @param ring - The work queue
 * @param u - The node that moved
 * @param best - Its new community
 */
function requeueOutside(level: Level, comm: U32, ring: Ring, u: number, best: number): void {
    const { rowPtr, colIdx } = level.s;
    const { queue, queued, capacity } = ring;
    for (let a = rowPtr[u], end = rowPtr[u + 1]; a < end; a++) {
        const v = colIdx[a];
        if (queued[v] === 0 && comm[v] !== best) {
            queued[v] = 1;
            queue[ring.tail] = v;
            ring.tail = ring.tail + 1 === capacity ? 0 : ring.tail + 1;
        }
    }
}

/**
 * The communities of `0..n-1` that hold no node, highest first.
 * @param size - Size of every community
 * @returns The empty ones, so the lowest is popped first
 */
function emptyCommunities(size: U32): number[] {
    const empty: number[] = [];
    for (let c = size.length - 1; c >= 0; c--) {
        if (size[c] === 0) {
            empty.push(c);
        }
    }
    return empty;
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
    const { s, deg } = level;
    const n = s.nodeCount;
    const tot = new Float64Array(n);
    const size = new Uint32Array(n);
    for (let u = 0; u < n; u++) {
        tot[comm[u]] += deg[u];
        size[comm[u]]++;
    }
    const empty = emptyCommunities(size);
    const cs: Communities = { tot, size, empty, resolution, m2 };
    const t = tallyOf(n);
    const capacity = n + 1;
    const queue = new Uint32Array(capacity);
    queue.set(shuffled(n, rand));
    const ring: Ring = { queue, queued: new Uint8Array(n).fill(1), capacity, head: 0, tail: n };
    let visit = 0;
    while (ring.head !== ring.tail) {
        const u = queue[ring.head];
        ring.head = ring.head + 1 === capacity ? 0 : ring.head + 1;
        ring.queued[u] = 0;
        visit++;
        const cu = comm[u];
        const ku = deg[u];
        tot[cu] -= ku;
        size[cu]--;
        const cnt = tallyNeighbourCommunities(level, comm, t, u, visit);
        const best = chooseCommunity(t, cnt, cu, ku, cs, visit);
        tot[best] += ku;
        size[best]++;
        if (best === cu) {
            continue;
        }
        comm[u] = best;
        if (size[cu] === 0) {
            empty.push(cu);
        }
        requeueOutside(level, comm, ring, u, best);
    }
}

/** The refined partition while refinement runs: every node starts alone. */
interface Refinement {
    /** Sub-community of every node. */
    readonly ref: U32;
    /** Total degree of every sub-community. */
    readonly refTot: F64;
    /** Size of every sub-community. */
    readonly refSize: U32;
    /** Weight from each sub-community to the rest of its community. */
    readonly ext: F64;
}

/**
 * The singleton refinement of a level's communities.
 * @param level - The level
 * @param comm - Community of every node
 * @returns Every node alone in its sub-community
 */
function singletonRefinement(level: Level, comm: U32): Refinement {
    const { s, arcW, deg } = level;
    const { nodeCount: n, rowPtr, colIdx } = s;
    const ref = new Uint32Array(n);
    const refTot = new Float64Array(n);
    const refSize = new Uint32Array(n);
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
    return { ref, refTot, refSize, ext };
}

/**
 * Sum the weight from v to each sub-community of its own community c, stamped by v.
 * @param level - The level
 * @param comm - Community of every node
 * @param ref - Sub-community of every node
 * @param t - The tally, written for this visit
 * @param v - The node
 * @param c - Its community
 * @returns The sub-communities listed in `t.touched`
 */
function tallySubCommunities(level: Level, comm: U32, ref: U32, t: Tally, v: number, c: number): number {
    const { rowPtr, colIdx } = level.s;
    const { acc, stamp, touched } = t;
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
        acc[r] += level.arcW[a];
    }
    return cnt;
}

/**
 * Keep, at the front of `t.touched`, the well-connected sub-communities with a non-negative gain.
 * @param t - The tally of v's visit
 * @param cnt - Sub-communities in the tally
 * @param rf - The refinement
 * @param cTot - Total degree of v's community
 * @param kv - v's weighted degree
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @returns The candidates kept
 */
function keepCandidates(
    t: Tally,
    cnt: number,
    rf: Refinement,
    cTot: number,
    kv: number,
    resolution: number,
    m2: number,
): number {
    const { touched } = t;
    const { refTot, ext } = rf;
    let kept = 0;
    for (let j = 0; j < cnt; j++) {
        const r = touched[j];
        const gain = gainOf(t, rf, r, kv, resolution, m2);
        if (gain >= 0 && ext[r] >= (resolution * refTot[r] * (cTot - refTot[r])) / m2) {
            touched[kept++] = r;
        }
    }
    return kept;
}

/**
 * The modularity gain of moving v into sub-community r.
 * @param t - The tally of v's visit
 * @param rf - The refinement
 * @param r - A sub-community in the tally
 * @param kv - v's weighted degree
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @returns The gain
 */
function gainOf(t: Tally, rf: Refinement, r: number, kv: number, resolution: number, m2: number): number {
    return t.acc[r] - (resolution * kv * rf.refTot[r]) / m2;
}

/**
 * The unnormalised draw weight of sub-community r: exp of its gain over the best, in modularity
 * units, divided by theta.
 * @param t - The tally of v's visit
 * @param rf - The refinement
 * @param r - A candidate
 * @param kv - v's weighted degree
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @param maxGain - The best candidate's gain
 * @returns The weight
 */
function drawWeight(
    t: Tally,
    rf: Refinement,
    r: number,
    kv: number,
    resolution: number,
    m2: number,
    maxGain: number,
): number {
    return detExp(((gainOf(t, rf, r, kv, resolution, m2) - maxGain) * 2) / m2 / THETA);
}

/**
 * Draw the target among the kept candidates with probability exp(gain in modularity units /
 * theta), shifted by the best gain so exp never overflows.
 * @param t - The tally, its candidates at the front of `touched`
 * @param kept - Candidates kept, at least 1
 * @param rf - The refinement
 * @param kv - v's weighted degree
 * @param resolution - Resolution gamma
 * @param m2 - Twice the total edge weight
 * @param rand - Generator
 * @returns The sub-community drawn
 */
function drawCandidate(
    t: Tally,
    kept: number,
    rf: Refinement,
    kv: number,
    resolution: number,
    m2: number,
    rand: () => number,
): number {
    const { touched } = t;
    let maxGain = -Infinity;
    for (let j = 0; j < kept; j++) {
        maxGain = Math.max(maxGain, gainOf(t, rf, touched[j], kv, resolution, m2));
    }
    let total = 0;
    for (let j = 0; j < kept; j++) {
        total += drawWeight(t, rf, touched[j], kv, resolution, m2, maxGain);
    }
    let draw = rand() * total;
    for (let j = 0; j < kept - 1; j++) {
        draw -= drawWeight(t, rf, touched[j], kv, resolution, m2, maxGain);
        if (draw < 0) {
            return touched[j];
        }
    }
    return touched[kept - 1];
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
    const { s, deg } = level;
    const n = s.nodeCount;
    const commTot = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        commTot[comm[u]] += deg[u];
    }
    const rf = singletonRefinement(level, comm);
    const { ref, refTot, refSize, ext } = rf;
    const t = tallyOf(n);
    const order = shuffled(n, rand);
    for (let i = 0; i < n; i++) {
        const v = order[i];
        const c = comm[v];
        const kv = deg[v];
        if (refSize[v] !== 1 || ext[v] < (resolution * kv * (commTot[c] - kv)) / m2) {
            continue;
        }
        const cnt = tallySubCommunities(level, comm, ref, t, v, c);
        const kept = keepCandidates(t, cnt, rf, commTot[c], kv, resolution, m2);
        if (kept === 0) {
            continue;
        }
        const best = drawCandidate(t, kept, rf, kv, resolution, m2, rand);
        ref[v] = best;
        refSize[v] = 0;
        refSize[best]++;
        refTot[best] += kv;
        // The edges between v and its new sub-community are now inside it.
        ext[best] += ext[v] - 2 * t.acc[best];
    }
    return ref;
}

/**
 * Contract a level by `blocks`, each aggregate node starting in the community of its members, and
 * move `top` to the new level.
 * @param level - The level
 * @param blocks - The aggregate node of every node of the level
 * @param dense - Dense community of every node of the level
 * @param top - Which node of the level holds each original node; moved to the next level
 * @returns The next level and the dense community of each of its nodes
 */
function aggregate(level: Level, blocks: U32, dense: U32, top: U32): { level: Level; comm: U32 } {
    const d = level.s.contract(blocks);
    const { nodeRemap, edgeRemap } = d;
    const next = d.snapshot;
    const edgeW = new Float64Array(next.edgeCount);
    for (let e = 0; e < level.edgeW.length; e++) {
        edgeW[edgeRemap === null ? e : edgeRemap[e]] += level.edgeW[e];
    }
    const nextComm = new Uint32Array(next.nodeCount);
    for (let u = 0; u < level.s.nodeCount; u++) {
        nextComm[nodeRemap === null ? u : nodeRemap[u]] = dense[u];
    }
    if (nodeRemap !== null) {
        for (let u = 0; u < top.length; u++) {
            top[u] = nodeRemap[top[u]];
        }
    }
    return { level: levelOf(next, edgeW), comm: renumberPartition(nextComm).labels };
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
        ({ level, comm } = aggregate(level, blocks, dense.labels, top));
    }
    const out = new Uint32Array(n0);
    for (let u = 0; u < n0; u++) {
        out[u] = comm[top[u]];
    }
    return { comm: out, levels };
}

/**
 * The snapshot's edge weights as f64 (the exact ones when it keeps them, 1 for an unweighted
 * snapshot), checked to be finite and non-negative.
 * @param s - The snapshot
 * @returns One weight per edge
 * @throws RangeError for a negative, NaN or infinite weight
 */
function checkedEdgeWeights(s: GraphSnapshot): F64 {
    const given = exactEdgeWeights(s) ?? s.edgeList().weights;
    const edgeW = given === null ? new Float64Array(s.edgeCount).fill(1) : Float64Array.from(given);
    for (let e = 0; e < edgeW.length; e++) {
        const w = edgeW[e];
        if (!(w >= 0) || w === Infinity) {
            throw withCode(
                new RangeError(`edge ${e} has weight ${w}; Leiden needs finite, non-negative weights`),
                "E_BAD_WEIGHT",
            );
        }
    }
    return edgeW;
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
        throw withCode(
            new Error("Leiden requires an undirected graph. Pass s.toUndirected().snapshot."),
            "E_NEEDS_UNDIRECTED",
        );
    }
    const resolution = options.resolution ?? 1;
    const randomSeed = options.randomSeed ?? 42;
    const maxIterations = options.maxIterations ?? 100;
    const threshold = options.threshold ?? 1e-7;
    if (!Number.isInteger(randomSeed)) {
        throw withCode(new RangeError(`randomSeed must be a finite integer, got ${randomSeed}`), "E_BAD_OPTION");
    }
    const n = s.nodeCount;
    const base = levelOf(s, checkedEdgeWeights(s));
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
