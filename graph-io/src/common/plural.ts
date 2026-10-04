/**
 * Count agreement for messages, so a report says "1 node is" and "3 nodes are", never "1 node(s) are".
 */

/**
 * The plural ending of a regular noun after a count.
 * @param n - the count
 * @returns "" for 1, "s" otherwise
 */
export function plural(n: number): string {
    return n === 1 ? "" : "s";
}

/**
 * The form of a verb that agrees with a count.
 * @param n - the count
 * @param one - the form for 1 ("is", "was", "holds")
 * @param many - the form for any other count ("are", "were", "hold")
 * @returns `one` or `many`
 */
export function agree(n: number, one: string, many: string): string {
    return n === 1 ? one : many;
}

/**
 * A count of nodes and edges, leaving out a zero: "2 nodes and 1 edge", "1 edge".
 * @param nodes - the node count
 * @param edges - the edge count
 * @returns the text
 */
export function elementCount(nodes: number, edges: number): string {
    const parts = [];
    if (nodes > 0 || edges === 0) {
        parts.push(`${nodes} node${plural(nodes)}`);
    }
    if (edges > 0) {
        parts.push(`${edges} edge${plural(edges)}`);
    }
    return parts.join(" and ");
}
