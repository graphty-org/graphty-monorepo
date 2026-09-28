import { type AdjacencyView, type GraphSnapshot, type NumericVector, renumberPartition } from "@graphty/graph-format";

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
 * mulberry32: 32-bit state, output in [0, 1). The exact sequence is part of the result contract
 * (design section 2.4): changing it changes every partition.
 * @param seed - Generator seed; only its low 32 bits are used
 * @returns The generator
 */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

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
 * The per-arc weights of `view` that the votes use: the snapshot's exact f64 weights when it keeps
 * them (graph-format keeps a role-"weight" f64 edge column whenever some weight is not f32-exact),
 * gathered through arcToEdge; otherwise the view's own f32 arc array. Voting on the f32 values would
 * turn 1 and 1 + 1e-9 into a tie, 1e39 into Infinity and 1e-50 into 0.
 * @param view - The forward snapshot or its reverse view
 * @param exact - The exact per-edge weights, or null when the f32 arc array is exact
 * @returns The arc weights, or null when every arc weighs 1
 */
function arcWeightsOf(view: AdjacencyView, exact: Float64Array | null): NumericVector | null {
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
    if (!Number.isInteger(maxIterations) || maxIterations < 0) {
        throw new RangeError(`maxIterations must be a non-negative integer, got ${maxIterations}`);
    }
    if (!Number.isInteger(randomSeed)) {
        throw new RangeError(`randomSeed must be a finite integer, got ${randomSeed}`);
    }
    const n = s.nodeCount;
    if (maxIterations * n > Number.MAX_SAFE_INTEGER) {
        throw new RangeError(`maxIterations * nodeCount (${maxIterations} * ${n}) exceeds Number.MAX_SAFE_INTEGER`);
    }
    const shadow = weighted ? s.edges.byRole("weight") : null;
    const exact = shadow !== null && shadow.dtype === "f64" ? shadow.data : null;
    const weights = weighted ? arcWeightsOf(s, exact) : null;
    if (weights !== null) {
        for (let a = 0; a < weights.length; a++) {
            const w = weights[a];
            if (!(w >= 0) || w === Infinity) {
                throw new RangeError(`arc ${a} has weight ${w}; label propagation needs finite, non-negative weights`);
            }
        }
    }

    const label = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        label[i] = i;
    }
    if (n === 0 || maxIterations === 0) {
        const { labels, count } = renumberPartition(label);
        return { ...withGroups(labels, count), iterations: 0, converged: !hasVotingArc(s, weights) };
    }

    // A node's neighbours are its out-row and, on a directed snapshot, its in-row read from the
    // cached reverse view: the simple symmetric view without materialising it (design section 2.3).
    const rev = s.directed ? s.reverse() : null;
    const sides = rev === null ? 1 : 2;
    const rowPtrs = [s.rowPtr, rev === null ? s.rowPtr : rev.rowPtr];
    const colIdxs = [s.colIdx, rev === null ? s.colIdx : rev.colIdx];
    const arcWeights = [weights, weights === null || rev === null ? weights : arcWeightsOf(rev, exact)];
    const rand = mulberry32(randomSeed);
    const acc = new Float64Array(n);
    // Epoch (visit number modulo the reset below) that last wrote acc[c]. Int32 rather than Float64:
    // half the bytes per label, which is 7-25% of the run once the array outgrows the cache at 1M
    // nodes (design section 4). Started at -1, so label 0 is an ordinary label.
    const stamp = new Int32Array(n).fill(-1);
    const touched = new Uint32Array(n);
    // weighted: false -- epoch that last counted neighbour v, so each distinct neighbour votes once
    // however many arcs join it.
    const seen = weighted ? null : new Int32Array(n).fill(-1);
    let epoch = -1;
    // A ring of n + 1 slots: `queued` keeps a node in it at most once.
    const capacity = n + 1;
    const queue = new Uint32Array(capacity);
    const queued = new Uint8Array(n).fill(1);
    for (let i = 0; i < n; i++) {
        queue[i] = i;
    }
    for (let i = n - 1; i >= 1; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = queue[i];
        queue[i] = queue[j];
        queue[j] = t;
    }
    let head = 0;
    let tail = n;
    let size = n;
    const maxVisits = maxIterations * n;
    let visits = 0;
    while (size > 0 && visits < maxVisits) {
        const u = queue[head];
        head = head + 1 === capacity ? 0 : head + 1;
        size--;
        queued[u] = 0;
        visits++;
        if (++epoch === EPOCH_LIMIT) {
            // Reset before the epoch leaves the Int32 range: O(n) once per 2^31 - 1 visits.
            stamp.fill(-1);
            seen?.fill(-1);
            epoch = 0;
        }
        const visit = epoch;
        let count = 0;
        for (let side = 0; side < sides; side++) {
            const rowPtr = rowPtrs[side];
            const colIdx = colIdxs[side];
            const w = arcWeights[side];
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
        let max = 0;
        for (let i = 0; i < count; i++) {
            if (acc[touched[i]] > max) {
                max = acc[touched[i]];
            }
        }
        if (max === 0) {
            continue; // no positive-weight neighbour: keep the label
        }
        // Reservoir draw over the labels at the maximum: the k-th replaces the pick with
        // probability 1/k, so a single dominant label consumes no random number.
        let pick = 0;
        let tied = 0;
        for (let i = 0; i < count; i++) {
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
        for (let side = 0; side < sides; side++) {
            const rowPtr = rowPtrs[side];
            const colIdx = colIdxs[side];
            const end = rowPtr[u + 1];
            for (let a = rowPtr[u]; a < end; a++) {
                const v = colIdx[a];
                if (queued[v] === 0 && label[v] !== pick) {
                    queued[v] = 1;
                    queue[tail] = v;
                    tail = tail + 1 === capacity ? 0 : tail + 1;
                    size++;
                }
            }
        }
    }

    const { labels, count } = renumberPartition(label);
    return { ...withGroups(labels, count), iterations: Math.ceil(visits / n), converged: size === 0 };
}
