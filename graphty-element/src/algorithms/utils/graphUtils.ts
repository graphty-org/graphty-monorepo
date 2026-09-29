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
 * Refuse a node id option that names no node in the graph.
 *
 * `@graphty/algorithms` answers a query about a missing node with an empty result rather than an
 * error, so without this check an unknown id publishes zeros as if they were a measurement. The id
 * is matched exactly first, then by its string form, so an option typed "3" names the node whose
 * id is the number 3 unless the graph also holds a node whose id is the string "3".
 * @param algorithm - The algorithm's key, for the message.
 * @param option - The option name the id came in on.
 * @param value - The id the caller passed.
 * @param nodeIds - Every node id in the graph.
 * @returns The id of the node it names, as the graph holds it.
 * @throws A `GraphtyError` coded `E_OPTION_RANGE` when no node has that id.
 */
export function requireNodeOption<T extends string | number>(
    algorithm: string,
    option: string,
    value: string | number,
    nodeIds: readonly T[],
): T {
    // A node whose id is exactly the value wins over one that only prints the same.
    const id = String(value);
    const found = nodeIds.find((nodeId) => nodeId === value) ?? nodeIds.find((nodeId) => String(nodeId) === id);
    if (found === undefined) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            source: "run",
            message: `${algorithm}: the ${option} option names node "${id}", which is not in the graph.`,
            details: { algorithm, option, value },
        });
    }
    return found;
}

/**
 * Refuse a flow or cut whose two ends are one node: there is nothing to separate.
 * @param algorithm - The algorithm's key, for the message.
 * @param source - The source node.
 * @param sink - The sink node.
 * @throws A `GraphtyError` coded `E_OPTION_RANGE` when they are the same node.
 */
export function requireDistinctEnds(algorithm: string, source: string | number, sink: string | number): void {
    if (source === sink) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            source: "run",
            message: `${algorithm}: the source and the sink are both node "${String(source)}"; set them to two different nodes.`,
            details: { algorithm, option: "sink", value: sink },
        });
    }
}

/**
 * Refuse `endpoints: true` for a method that walks no paths.
 *
 * HITS, Katz and eigenvector centrality carry an `endpoints` option in their schemas, where it
 * has always been accepted and read by nothing: whether a path's two ends count is a question for
 * betweenness, and none of these methods has an answer to it. A reader who switched it on was told nothing, so the run now says so
 * rather than publishing a result that looks as though the option was honoured. `false`, the
 * default, is accepted, so a saved document that carries the default still loads and runs.
 * @param algorithm - The method, for the message.
 * @param endpoints - The option as the caller resolved it.
 * @throws A `GraphtyError` coded `E_OPTION_RANGE` when `endpoints` is true.
 */
export function refuseEndpoints(algorithm: string, endpoints: boolean): void {
    if (endpoints) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            source: "run",
            message: `${algorithm} walks no paths, so the endpoints option has nothing to include; leave it false.`,
            details: { algorithm, option: "endpoints", value: true, permitted: [false] },
        });
    }
}
