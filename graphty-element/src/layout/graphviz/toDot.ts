/**
 * @file The graph a Graphviz layout is handed, written as DOT.
 *
 * Nodes are named by row (`n0`, `n1`, ...) so no id ever needs quoting and the answer maps back
 * to rows without a lookup table. Every node is a fixed-size circle as wide as the element draws
 * it, with no label: Graphviz spaces what the element draws, not text the element does not draw
 * that way.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

/** Points per scene unit: a node of size 1 is one inch (72 points) wide to Graphviz. */
export const POINTS_PER_UNIT = 72;

/** The node size used for a row the element reports no size for. */
const DEFAULT_NODE_SIZE = 1;

/**
 * Quote a DOT attribute value.
 * @param value - the value
 * @returns the value as a DOT double-quoted string
 */
function quote(value: string): string {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}

/**
 * Whether a string is a plain DOT identifier that needs no quotes.
 * @param name - the attribute name
 * @returns true for letters, digits and underscores not starting with a digit
 */
function isPlainName(name: string): boolean {
    return /^[A-Za-z_]\w*$/.test(name);
}

/**
 * Write the graph as DOT.
 * @param stored - the graph as the element stores it: direction and every parallel edge
 * @param attributes - graph attributes, already as Graphviz text
 * @param sizes - the drawn size of each node, in scene units; NaN or absent for the default
 * @returns the DOT text
 */
export function toDot(
    stored: GraphSnapshot,
    attributes: Readonly<Record<string, string>>,
    sizes?: ArrayLike<number>,
): string {
    const lines: string[] = [];
    const arrow = stored.directed ? "->" : "--";
    lines.push(`${stored.directed ? "digraph" : "graph"} G {`);
    const graphAttrs = Object.entries(attributes)
        .filter(([name]) => isPlainName(name))
        .map(([name, value]) => `${name}=${quote(value)}`);
    if (graphAttrs.length > 0) {
        lines.push(`graph [${graphAttrs.join(", ")}];`);
    }

    lines.push('node [shape=circle, fixedsize=true, label=""];');
    for (let row = 0; row < stored.nodeCount; row++) {
        const size = sizes?.[row];
        const inches = typeof size === "number" && Number.isFinite(size) && size > 0 ? size : DEFAULT_NODE_SIZE;
        lines.push(`n${row} [width=${inches}];`);
    }

    const { src, dst } = stored.edgeList();
    for (let e = 0; e < src.length; e++) {
        lines.push(`n${src[e]} ${arrow} n${dst[e]};`);
    }

    lines.push("}");
    return `${lines.join("\n")}\n`;
}
