/**
 * @file Helpers the adapters share: matching an `@graphty/algorithms` answer back onto an edge,
 * refusing a node option that names no node, and the neighbour order a walk tries.
 */

import type { GraphSnapshot, U32 } from "@graphty/graph-format";

import { GraphtyError } from "../../errors";

/**
 * The order a walk tries each node's neighbours in: the order their edges were declared.
 *
 * An index-based walk tries a node's arcs in row order, which is neighbour index order. The
 * element's walks have always tried them in the order the edges were declared, and a depth-first
 * order, a strongly connected component's number and the nodes a breadth-first walk expands
 * before it reaches its target all depend on it. Passed to a port as `arcOrder`, this keeps them.
 * @param snapshot - The snapshot the walk runs over.
 * @returns A permutation of the arc indices, each row's slice sorted by the edge each arc is of.
 */
export function declarationArcOrder(snapshot: GraphSnapshot): U32 {
    const { rowPtr, arcToEdge } = snapshot;
    const order = new Uint32Array(snapshot.arcCount);
    for (let arc = 0; arc < order.length; arc++) {
        order[arc] = arc;
    }

    for (let node = 0; node < snapshot.nodeCount; node++) {
        order.subarray(rowPtr[node], rowPtr[node + 1]).sort((a, b) => arcToEdge[a] - arcToEdge[b]);
    }

    return order;
}

/**
 * The key an `@graphty/algorithms` result is matched back onto the element's edges by: the two
 * endpoint ids, in the orientation the record declared.
 *
 * THIS IS A LOOKUP KEY AND NOT AN IDENTITY, which is the whole reason it has a name of its own
 * and is not published from `./extend`. The algorithms package answers by endpoint pair, because
 * that is all it can represent; the element identifies an edge by its own counter. A key that
 * names a pair cannot name one of two parallel edges, so nothing may publish it as an edge id --
 * an algorithm looks a result up with this and then publishes `edge.id`.
 * @param source - the id of the node the edge leaves
 * @param target - the id of the node the edge enters
 * @returns the lookup key
 */
export function edgePairKey(source: string | number, target: string | number): string {
    return `${String(source)}:${String(target)}`;
}

/**
 * Refuse a node id option that names no node in the graph.
 *
 * `@graphty/algorithms` answers a query about a missing node with an empty result rather than an
 * error, so without this check an unknown id publishes zeros as if they were a measurement.
 * @param algorithm - The algorithm's key, for the message.
 * @param option - The option name the id came in on.
 * @param value - The id the caller passed.
 * @param nodeIds - Every node id in the graph.
 * @returns The id as the string the algorithms package keys nodes by.
 * @throws A `GraphtyError` coded `E_OPTION_RANGE` when no node has that id.
 */
export function requireNodeOption(
    algorithm: string,
    option: string,
    value: string | number,
    nodeIds: readonly (string | number)[],
): string {
    const id = String(value);
    if (!nodeIds.some((nodeId) => String(nodeId) === id)) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            source: "run",
            message: `${algorithm}: the ${option} option names node "${id}", which is not in the graph.`,
            details: { algorithm, option, value },
        });
    }
    return id;
}
