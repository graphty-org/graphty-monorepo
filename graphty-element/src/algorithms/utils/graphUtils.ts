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
 * error, so without this check an unknown id publishes zeros as if they were a measurement. The id
 * is matched by its string form, so an option typed "3" names the node whose id is the number 3.
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
    const id = String(value);
    const found = nodeIds.find((nodeId) => String(nodeId) === id);
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
