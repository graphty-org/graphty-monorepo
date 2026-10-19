import type { GraphSnapshot, NodeId } from "@graphty/graph-format";

/**
 * Per-node scores keyed by node id, for a caller that works with its own element ids rather than
 * node indices. Takes the result object itself, so `scoresById(pageRank(s), s)` needs no `.scores`.
 * @param result - A result with `scores` (one per node index), or the score vector itself
 * @param s - The snapshot the scores were computed on
 * @returns A Map from node id to score, in node index order
 * @public
 */
export function scoresById(
    result: ArrayLike<number> | { readonly scores: ArrayLike<number> },
    s: GraphSnapshot,
): Map<NodeId, number> {
    return s.ids.toMap("scores" in result ? result.scores : result);
}

/** A partition result: anything with `groups()`, such as a `LabelResult`. @public */
export interface Partition {
    groups(): ArrayLike<number>[];
}

/**
 * The groups of a partition (components, communities, clusters) as arrays of node ids.
 * @param result - A partition result with `groups()`, such as a `LabelResult`
 * @param s - The snapshot the partition was computed on
 * @returns One array of node ids per group, in the order of `groups()`
 * @public
 */
export function groupsById(result: Partition, s: GraphSnapshot): NodeId[][] {
    return result.groups().map((group) => pathIds(group, s));
}

/**
 * Node indices (a path, a visit order, a set) as node ids, in the same order.
 * @param path - Node indices, such as the return value of `pathTo`
 * @param s - The snapshot the indices belong to
 * @returns The node ids
 * @public
 */
export function pathIds(path: ArrayLike<number>, s: GraphSnapshot): NodeId[] {
    return Array.from(path, (i) => s.ids.idOf(i));
}
