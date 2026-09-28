import { type GraphSnapshot, renumberPartition } from "@graphty/graph-format";

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
    /** True when every node's label is dominant among its neighbours. */
    readonly converged: boolean;
}

/**
 * Whether any arc other than a self-loop carries a positive vote under the chosen weighting, which
 * is exactly when the identity labelling is NOT dominant everywhere.
 * @param s - The snapshot
 * @param weights - The arc weights in use, or null when every arc votes 1
 * @returns True when some node has a positive-weight neighbour
 */
function hasVotingArc(s: GraphSnapshot, weights: Float32Array | null): boolean {
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
 * Community detection by fast label propagation (FLPA; Traag and Subelj, Sci. Rep. 13:2701, 2023,
 * Algorithm 3), the queue-driven form of Raghavan, Albert and Kumara's asynchronous label
 * propagation.
 *
 * Every node starts in its own community. Nodes are visited from a queue that starts as a seeded
 * shuffle of all of them; a visited node adopts the label with the largest summed arc weight among
 * its neighbours, drawing uniformly at random among tied labels (its current label included, with
 * no priority). When its label changes, every neighbour holding a different label is queued again.
 * The run ends when the queue empties -- then every node's label is dominant among its neighbours
 * -- or after `maxIterations * nodeCount` node visits.
 *
 * Conventions: self-loops are skipped; parallel arcs are summed; on a directed snapshot a node's
 * neighbours are its out-arcs AND its in-arcs, so a reciprocal pair counts twice. With
 * `weighted: false` each distinct neighbour votes once. A negative, NaN or infinite weight throws.
 *
 * One `randomSeed` gives one result, bit for bit. The partitions differ from the legacy
 * `labelPropagation` for the same seed: the random stream and the stop rule are different
 * (design `design/algorithms/label-propagation-indexed-port-design.md`, section 3).
 * @param s - Any snapshot
 * @param options - Work cap, seed and weighting
 * @returns The partition, the full-sweep equivalents run, and whether every label is dominant
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
    const weights = weighted ? s.weights : null;
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

    // The kernel lands in the next step; until then every node keeps its own label.
    const { labels, count } = renumberPartition(label);
    return { ...withGroups(labels, count), iterations: 0, converged: false };
}
