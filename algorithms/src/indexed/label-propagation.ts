import {
    type AdjacencyView,
    type GraphSnapshot,
    INVALID_INDEX,
    type NumericVector,
    renumberPartition,
    type U32,
} from "@graphty/graph-format";

import { mulberry32 } from "../utils/math-utilities.js";
import { type LabelResult, withGroups } from "./components.js";

/** Options of the index-based label propagation. @public */
export interface LabelPropagationOptions {
    /** Work cap, in node visits per node (full-sweep equivalents); default 100. */
    readonly maxIterations?: number | undefined;
    /** Seed of the visit order and of the tie draws; default 42. */
    readonly randomSeed?: number | undefined;
    /** Sum arc weights (true, the default) or count each distinct neighbour once (false). */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based label propagation. @public */
export interface LabelPropagationResult extends LabelResult {
    /** Node visits divided by the node count, rounded up. */
    readonly iterations: number;
    /**
     * True when the work queue emptied before the visit cap, which leaves every node's label
     * dominant among its neighbours. False only says the cap was reached with nodes still queued:
     * the labels may already be dominant.
     */
    readonly converged: boolean;
}

/** Epochs run 0 .. EPOCH_LIMIT - 1 between resets of the Int32 stamp arrays. */
const EPOCH_LIMIT = 0x7fffffff;

/**
 * Whether any arc other than a self-loop carries a positive vote under the chosen weighting, which
 * is exactly when the identity labelling is NOT dominant everywhere.
 * @param s - The snapshot
 * @param weights - The arc weights in use, or null when every arc votes 1
 * @returns True when some node has a positive-weight neighbour
 */
function hasVotingArc(s: GraphSnapshot, weights: NumericVector | null): boolean {
    for (let u = 0; u < s.nodeCount; u++) {
        const end = s.rowPtr[u + 1];
        for (let a = s.rowPtr[u]; a < end; a++) {
            if (s.colIdx[a] !== u && (weights === null || weights[a] > 0)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Whether every node not held fixed holds a label at the largest vote among its neighbours (or has
 * no neighbour that votes).
 * @param tally - A tally over the voting rows
 * @param label - The label of every node
 * @param fixed - 1 for a node held at its label, or null when none is
 * @returns True when no free node would move
 */
function allDominant(tally: Tally, label: U32, fixed: Uint8Array | null): boolean {
    for (let u = 0; u < label.length; u++) {
        if (fixed !== null && fixed[u] === 1) {
            continue;
        }
        const max = tally.collect(u, label);
        if (max !== 0 && tally.voteOf(label[u]) !== max) {
            return false;
        }
    }
    return true;
}

/**
 * The per-arc weights of `view` that the votes use: the snapshot's exact f64 weights when it keeps
 * them (graph-format keeps a role-"weight" f64 edge column whenever some weight is not f32-exact),
 * gathered through arcToEdge; otherwise the view's own f32 arc array. Voting on the f32 values would
 * turn 1 and 1 + 1e-9 into a tie, 1e39 into Infinity and 1e-50 into 0.
 * @param view - The forward snapshot or its reverse view
 * @param exact - The exact per-edge weights, or null when the f32 arc array is exact
 * @returns The arc weights, or null when every arc weighs 1
 */
export function arcWeightsOf(view: AdjacencyView, exact: Float64Array | null): NumericVector | null {
    if (exact === null) {
        return view.weights;
    }
    const out = new Float64Array(view.arcCount);
    for (let a = 0; a < out.length; a++) {
        out[a] = exact[view.arcToEdge[a]];
    }
    return out;
}

/**
 * The exact per-edge weights of `s`: its role-"weight" f64 edge column when it keeps one, else null
 * (the f32 arc array is then exact).
 * @param s - The snapshot
 * @returns The exact weights per logical edge, or null
 */
export function exactEdgeWeights(s: GraphSnapshot): Float64Array | null {
    const shadow = s.edges.byRole("weight");
    return shadow !== null && shadow.dtype === "f64" ? shadow.data : null;
}

/**
 * The rows a node's votes are read from, with the weights they carry. A node's neighbours are its
 * out-row and, on a directed snapshot, its in-row read from the cached reverse view: the simple
 * symmetric view without materialising it (design section 2.3).
 */
interface VotingRows {
    /** 1 on an undirected snapshot, 2 (out-row, in-row) on a directed one. */
    readonly sides: number;
    readonly rowPtrs: readonly U32[];
    readonly colIdxs: readonly U32[];
    /** Per-arc weights of each side, or null when every arc votes 1. */
    readonly arcWeights: readonly (NumericVector | null)[];
    /** The forward weights, or null; what `hasVotingArc` reads. */
    readonly weights: NumericVector | null;
}

/**
 * Gather the voting rows of `s` and reject weights a vote cannot use.
 * @param s - The snapshot
 * @param weighted - Sum arc weights (true) or count each arc as 1 (false)
 * @returns The rows and their weights
 * @throws RangeError when a weight is negative, NaN or infinite
 */
function votingRows(s: GraphSnapshot, weighted: boolean): VotingRows {
    const weights = weighted ? arcWeightsOf(s, exactEdgeWeights(s)) : null;
    if (weights !== null) {
        for (let a = 0; a < weights.length; a++) {
            const w = weights[a];
            if (!(w >= 0) || w === Infinity) {
                throw new RangeError(`arc ${a} has weight ${w}; label propagation needs finite, non-negative weights`);
            }
        }
    }
    const rev = s.directed ? s.reverse() : null;
    return {
        sides: rev === null ? 1 : 2,
        rowPtrs: [s.rowPtr, rev === null ? s.rowPtr : rev.rowPtr],
        colIdxs: [s.colIdx, rev === null ? s.colIdx : rev.colIdx],
        arcWeights: [weights, weights === null || rev === null ? weights : arcWeightsOf(rev, exactEdgeWeights(s))],
        weights,
    };
}

/**
 * Check the options every label propagation shares.
 * @param n - The node count
 * @param maxIterations - The work cap
 * @param randomSeed - The seed, or null when the variant takes none
 * @throws RangeError for a bad option
 */
function checkOptions(n: number, maxIterations: number, randomSeed: number | null): void {
    if (!Number.isInteger(maxIterations) || maxIterations < 0) {
        throw new RangeError(`maxIterations must be a non-negative integer, got ${maxIterations}`);
    }
    if (randomSeed !== null && !Number.isInteger(randomSeed)) {
        throw new RangeError(`randomSeed must be a finite integer, got ${randomSeed}`);
    }
    if (maxIterations * n > Number.MAX_SAFE_INTEGER) {
        throw new RangeError(`maxIterations * nodeCount (${maxIterations} * ${n}) exceeds Number.MAX_SAFE_INTEGER`);
    }
}

/**
 * The per-node vote tally shared by the queue kernel and the synchronous passes: an accumulator
 * per label, stamped by visit so it never needs clearing.
 */
class Tally {
    readonly acc: Float64Array;
    // Epoch (visit number modulo the reset below) that last wrote acc[c]. Int32 rather than Float64:
    // half the bytes per label, which is 7-25% of the run once the array outgrows the cache at 1M
    // nodes (design section 4). Started at -1, so label 0 is an ordinary label.
    readonly stamp: Int32Array;
    readonly touched: Uint32Array;
    // weighted: false -- epoch that last counted neighbour v, so each distinct neighbour votes once
    // however many arcs join it.
    readonly seen: Int32Array | null;
    epoch = -1;
    count = 0;

    constructor(
        n: number,
        private readonly rows: VotingRows,
        weighted: boolean,
    ) {
        this.acc = new Float64Array(n);
        this.stamp = new Int32Array(n).fill(-1);
        this.touched = new Uint32Array(n);
        this.seen = weighted ? null : new Int32Array(n).fill(-1);
    }

    /**
     * Sum the votes of u's neighbours per label into `acc`, listing the labels met in `touched`.
     * @param u - The node
     * @param label - The label of every node
     * @returns The largest vote, 0 when no neighbour votes
     */
    collect(u: number, label: U32): number {
        if (++this.epoch === EPOCH_LIMIT) {
            // Reset before the epoch leaves the Int32 range: O(n) once per 2^31 - 1 visits.
            this.stamp.fill(-1);
            this.seen?.fill(-1);
            this.epoch = 0;
        }
        const { acc, stamp, touched, seen, rows } = this;
        const visit = this.epoch;
        let count = 0;
        for (let side = 0; side < rows.sides; side++) {
            const rowPtr = rows.rowPtrs[side];
            const colIdx = rows.colIdxs[side];
            const w = rows.arcWeights[side];
            const end = rowPtr[u + 1];
            for (let a = rowPtr[u]; a < end; a++) {
                const v = colIdx[a];
                if (v === u) {
                    continue; // a self-loop does not vote
                }
                if (seen !== null) {
                    if (seen[v] === visit) {
                        continue;
                    }
                    seen[v] = visit;
                }
                const c = label[v];
                const vote = w === null ? 1 : w[a];
                if (stamp[c] !== visit) {
                    stamp[c] = visit;
                    acc[c] = vote;
                    touched[count++] = c;
                } else {
                    acc[c] += vote;
                }
            }
        }
        this.count = count;
        let max = 0;
        for (let i = 0; i < count; i++) {
            if (acc[touched[i]] > max) {
                max = acc[touched[i]];
            }
        }
        return max;
    }

    /**
     * The vote label c received in the last `collect`.
     * @param c - A label
     * @returns Its vote, 0 when no neighbour holds it
     */
    voteOf(c: number): number {
        return this.stamp[c] === this.epoch ? this.acc[c] : 0;
    }
}

/**
 * The FLPA queue kernel over `label`, updated in place. Nodes marked in `fixed` never enter the
 * queue, so they keep their starting label.
 * @param s - The snapshot
 * @param rows - Its voting rows
 * @param weighted - Whether the rows carry weights
 * @param label - Starting label of every node, each below nodeCount; overwritten with the result
 * @param fixed - 1 for a node whose label never changes, or null
 * @param maxIterations - Work cap in node visits per node
 * @param randomSeed - Seed of the visit order and the tie draws
 * @returns The node visits run and the nodes still queued
 */
function flpa(
    s: GraphSnapshot,
    rows: VotingRows,
    weighted: boolean,
    label: U32,
    fixed: Uint8Array | null,
    maxIterations: number,
    randomSeed: number,
): { visits: number; size: number } {
    const n = s.nodeCount;
    const rand = mulberry32(randomSeed);
    const tally = new Tally(n, rows, weighted);
    // A ring of n + 1 slots: `queued` keeps a node in it at most once.
    const capacity = n + 1;
    const queue = new Uint32Array(capacity);
    const queued = new Uint8Array(n);
    let size = 0;
    for (let i = 0; i < n; i++) {
        if (fixed === null || fixed[i] === 0) {
            queue[size++] = i;
            queued[i] = 1;
        }
    }
    for (let i = size - 1; i >= 1; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = queue[i];
        queue[i] = queue[j];
        queue[j] = t;
    }
    let head = 0;
    let tail = size;
    const maxVisits = maxIterations * n;
    let visits = 0;
    const { touched, acc } = tally;
    while (size > 0 && visits < maxVisits) {
        const u = queue[head];
        head = head + 1 === capacity ? 0 : head + 1;
        size--;
        queued[u] = 0;
        visits++;
        const max = tally.collect(u, label);
        if (max === 0) {
            continue; // no positive-weight neighbour: keep the label
        }
        // Reservoir draw over the labels at the maximum: the k-th replaces the pick with
        // probability 1/k, so a single dominant label consumes no random number.
        let pick = 0;
        let tied = 0;
        for (let i = 0; i < tally.count; i++) {
            const c = touched[i];
            if (acc[c] === max) {
                tied++;
                if (tied === 1 || rand() * tied < 1) {
                    pick = c;
                }
            }
        }
        if (pick === label[u]) {
            continue;
        }
        label[u] = pick;
        // A neighbour already holding the new label can only have been strengthened by the move.
        // Both rows, so on a directed snapshot the nodes that read u are requeued too.
        for (let side = 0; side < rows.sides; side++) {
            const rowPtr = rows.rowPtrs[side];
            const colIdx = rows.colIdxs[side];
            const end = rowPtr[u + 1];
            for (let a = rowPtr[u]; a < end; a++) {
                const v = colIdx[a];
                if (queued[v] === 0 && label[v] !== pick && (fixed === null || fixed[v] === 0)) {
                    queued[v] = 1;
                    queue[tail] = v;
                    tail = tail + 1 === capacity ? 0 : tail + 1;
                    size++;
                }
            }
        }
    }
    return { visits, size };
}

/**
 * Community detection by fast label propagation (FLPA; Traag and Subelj, Sci. Rep. 13:2701, 2023,
 * Algorithm 3), the queue-driven form of Raghavan, Albert and Kumara's asynchronous label
 * propagation.
 *
 * Every node starts in its own community. Nodes are visited from a queue that starts as a seeded
 * shuffle of all of them; a visited node adopts the label with the largest summed arc weight among
 * its neighbours, drawing uniformly at random among tied labels (its current label included, with
 * no priority). When its label changes, every neighbour holding a different label is queued again.
 * The run ends when the queue empties -- then every node's label is dominant among its neighbours
 * and `converged` is true -- or after `maxIterations * nodeCount` node visits.
 *
 * Conventions: self-loops are skipped; parallel arcs are summed; on a directed snapshot a node's
 * neighbours are its out-arcs AND its in-arcs, so a reciprocal pair counts twice. With
 * `weighted: false` each distinct neighbour votes once. A negative, NaN or infinite weight throws.
 * Votes use the exact f64 weights when the snapshot keeps them (as `toSnapshot` does for a legacy
 * graph whose weights are not all f32-exact), so a weight rounded in the f32 arc array never
 * decides a vote.
 *
 * One `randomSeed` gives one result, bit for bit. The partitions differ from the legacy
 * `labelPropagation` for the same seed: the random stream and the stop rule are different
 * (design `design/algorithms/label-propagation-indexed-port-design.md`, section 3).
 * @param s - Any snapshot
 * @param options - Work cap, seed and weighting
 * @returns The partition, the full-sweep equivalents run, and whether the work queue emptied
 * @public
 */
export function labelPropagation(s: GraphSnapshot, options: LabelPropagationOptions = {}): LabelPropagationResult {
    const maxIterations = options.maxIterations ?? 100;
    const randomSeed = options.randomSeed ?? 42;
    const weighted = options.weighted ?? true;
    const n = s.nodeCount;
    checkOptions(n, maxIterations, randomSeed);
    const rows = votingRows(s, weighted);
    const label = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        label[i] = i;
    }
    if (n === 0 || maxIterations === 0) {
        const { labels, count } = renumberPartition(label);
        return { ...withGroups(labels, count), iterations: 0, converged: !hasVotingArc(s, rows.weights) };
    }
    const { visits, size } = flpa(s, rows, weighted, label, null, maxIterations, randomSeed);
    const { labels, count } = renumberPartition(label);
    return { ...withGroups(labels, count), iterations: Math.ceil(visits / n), converged: size === 0 };
}

/**
 * Semi-supervised label propagation: the FLPA kernel of {@link labelPropagation} with some nodes
 * held at a given label (the `initial` / `fixed` inputs of igraph's `community_label_propagation`).
 *
 * A seeded node keeps its label for the whole run and is never visited; every other node starts in
 * its own community and moves as in `labelPropagation`. Seeds that share a label share one community
 * from the start, and seeds with different labels are never merged, so in the result two seeds
 * carry the same label exactly when their seed labels are equal. The result is renumbered to
 * `0..count-1` in first-seen node order like every other partition here, so a seed label's VALUE is
 * not kept: read a seed's community through `labels[seedNode]`. With no seed at all this is
 * `labelPropagation` with the same seed and options, bit for bit.
 *
 * `converged` is true when the work queue emptied, or when `maxIterations` is 0 and the starting
 * labels already are dominant: every unseeded node's label is dominant among its neighbours.
 * Seeded nodes are not held to that.
 * @param s - Any snapshot
 * @param seeds - One entry per node: its fixed label, any value but `INVALID_INDEX`, or
 *   `INVALID_INDEX` for a node free to move
 * @param options - Work cap, seed of the visit order and weighting
 * @returns The partition, the full-sweep equivalents run, and whether the work queue emptied
 * @throws RangeError when `seeds` is not one entry per node, or for a bad option or weight
 * @public
 */
export function labelPropagationSemiSupervised(
    s: GraphSnapshot,
    seeds: U32,
    options: LabelPropagationOptions = {},
): LabelPropagationResult {
    const maxIterations = options.maxIterations ?? 100;
    const randomSeed = options.randomSeed ?? 42;
    const weighted = options.weighted ?? true;
    const n = s.nodeCount;
    if (seeds.length !== n) {
        throw new RangeError(`seeds has ${seeds.length} entries; the snapshot has ${n} nodes`);
    }
    checkOptions(n, maxIterations, randomSeed);
    const rows = votingRows(s, weighted);
    // The kernel's labels are node indices, so a seed label becomes the index of the first node
    // seeded with it: a free node's own index can never collide with it.
    const label = new Uint32Array(n);
    const fixed = new Uint8Array(n);
    const firstWith = new Map<number, number>();
    for (let u = 0; u < n; u++) {
        const seed = seeds[u];
        if (seed === INVALID_INDEX) {
            label[u] = u;
            continue;
        }
        let first = firstWith.get(seed);
        if (first === undefined) {
            first = u;
            firstWith.set(seed, u);
        }
        label[u] = first;
        fixed[u] = 1;
    }
    const { visits, size } = flpa(s, rows, weighted, label, fixed, maxIterations, randomSeed);
    // At maxIterations 0 nothing was visited, so the queue says nothing: check the labels, as
    // labelPropagation does.
    const converged = size === 0 || (maxIterations === 0 && allDominant(new Tally(n, rows, weighted), label, fixed));
    const { labels, count } = renumberPartition(label);
    return { ...withGroups(labels, count), iterations: n === 0 ? 0 : Math.ceil(visits / n), converged };
}

/** Options of the synchronous label propagation. @public */
export interface SynchronousLabelPropagationOptions {
    /** Cap on synchronous passes over every node; default 100. */
    readonly maxIterations?: number | undefined;
    /** Sum arc weights (true, the default) or count each distinct neighbour once (false). */
    readonly weighted?: boolean | undefined;
}

/**
 * Label propagation in synchronous passes: every node reads its neighbours' labels from the
 * previous pass, and all nodes move at once. Deterministic, with no random stream.
 *
 * A node keeps its label when that label is dominant among its neighbours; otherwise it takes the
 * LOWEST label with the largest summed vote. Synchronous updates alone make two neighbours trade
 * labels for ever (on a single edge a-b, a takes b's label while b takes a's), so passes alternate
 * a swap guard: an even pass (the first is pass 0) lets a node move only to a higher label, an odd
 * pass only to a lower one (the up/down rule of cuGraph's Louvain move phase). The run stops after
 * two passes in a row with no move, one up and one down -- then every node's label is dominant and
 * `converged` is true -- or after `maxIterations` passes.
 *
 * The guard stops the single-edge swap but not every cycle: on some weighted graphs a node climbs to
 * a higher label on each up pass and falls back on each down pass. When a pass returns the labels
 * of two passes before, the run can only repeat itself, so it stops there with `converged` false;
 * the result is then the same for any larger `maxIterations`. Longer cycles run to the cap.
 *
 * This is what the legacy `labelPropagationAsync` does, despite its name, with the swap guard it
 * lacks and the tie rule applied to the finished tally rather than to a running one. Conventions
 * match {@link labelPropagation}: self-loops are skipped, parallel arcs summed, a directed snapshot
 * reads out- and in-neighbours, weights are the exact f64 ones when the snapshot keeps them, and a
 * negative, NaN or infinite weight throws.
 * @param s - Any snapshot
 * @param options - Pass cap and weighting
 * @returns The partition, the passes run, and whether every label ended dominant
 * @public
 */
export function labelPropagationSynchronous(
    s: GraphSnapshot,
    options: SynchronousLabelPropagationOptions = {},
): LabelPropagationResult {
    const maxIterations = options.maxIterations ?? 100;
    const weighted = options.weighted ?? true;
    const n = s.nodeCount;
    checkOptions(n, maxIterations, null);
    const rows = votingRows(s, weighted);
    const tally = new Tally(n, rows, weighted);
    const { touched, acc } = tally;
    let label = new Uint32Array(n);
    let next = new Uint32Array(n);
    // The labels two passes back, to catch a period-2 cycle.
    let before = new Uint32Array(n).fill(INVALID_INDEX);
    for (let i = 0; i < n; i++) {
        label[i] = i;
    }
    let passes = 0;
    let quiet = 0;
    let cycling = false;
    while (quiet < 2 && passes < maxIterations && !cycling) {
        const up = passes % 2 === 0;
        passes++;
        let moved = false;
        for (let u = 0; u < n; u++) {
            const current = label[u];
            next[u] = current;
            const max = tally.collect(u, label);
            if (max === 0 || tally.voteOf(current) === max) {
                continue;
            }
            let best = INVALID_INDEX;
            for (let i = 0; i < tally.count; i++) {
                const c = touched[i];
                if (acc[c] === max && c < best) {
                    best = c;
                }
            }
            if (up ? best > current : best < current) {
                next[u] = best;
                moved = true;
            }
        }
        cycling = moved && sameLabels(next, before);
        [before, label, next] = [label, next, before];
        quiet = moved ? 0 : quiet + 1;
    }
    const converged = quiet >= 2 || allDominant(tally, label, null);
    const { labels, count } = renumberPartition(label);
    return { ...withGroups(labels, count), iterations: passes, converged };
}

/**
 * Whether two label arrays are equal.
 * @param a - Labels
 * @param b - Labels of the same length
 * @returns True when every entry matches
 */
function sameLabels(a: U32, b: U32): boolean {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
