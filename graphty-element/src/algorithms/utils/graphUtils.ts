/**
 * @file Helpers the adapters share: matching an `@graphty/algorithms` answer back onto an edge,
 * and refusing a node option that names no node.
 */

import { GraphtyError } from "../../errors";

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

/**
 * Refuse `endpoints: true` for a method that walks no paths.
 *
 * HITS and Katz carry an `endpoints` option in their schemas, where it has always been accepted
 * and read by nothing: whether a path's two ends count is a question for betweenness, and neither
 * method has an answer to it. A reader who switched it on was told nothing, so the run now says so
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
