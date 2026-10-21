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
    const escaped = value
        .replaceAll("\\", String.raw`\\`)
        .replaceAll('"', String.raw`\"`)
        .replaceAll(/\r?\n/g, String.raw`\n`);
    return `"${escaped}"`;
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
 * Whether a value is a usable node length.
 * @param value - the value
 * @returns true for a finite positive number
 */
function isLength(value: number | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Write the graph as DOT.
 * @param stored - the graph as the element stores it: direction and every parallel edge
 * @param attributes - graph attributes, already as Graphviz text
 * @param sizes - the drawn size of each node, in scene units; NaN or absent for the default
 * @param extents - the drawn width and height of each node, two per row, in scene units: a row
 *     with two different sides is a box that size, the rest are circles as wide as `sizes` says
 * @param groups - the groups the element draws round their members, by row, each with its member
 *     rows: each is handed over as a `cluster` subgraph of its members, not as a node, so Graphviz
 *     keeps a group's members together and the other nodes out of its box
 * @returns the DOT text
 */
export function toDot(
    stored: GraphSnapshot,
    attributes: Readonly<Record<string, string>>,
    sizes?: ArrayLike<number>,
    extents?: ArrayLike<number>,
    groups: ReadonlyMap<number, readonly number[]> = new Map(),
): string {
    const skip = (row: number): boolean => groups.has(row);
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
        if (skip(row)) {
            continue;
        }
        const width = extents?.[2 * row];
        const height = extents?.[2 * row + 1];
        if (isLength(width) && isLength(height) && width !== height) {
            lines.push(`n${row} [shape=box, width=${width}, height=${height}];`);
            continue;
        }
        const size = sizes?.[row];
        const inches = isLength(size) ? size : DEFAULT_NODE_SIZE;
        lines.push(`n${row} [width=${inches}];`);
    }

    writeClusters(groups, lines);

    const { src, dst } = stored.edgeList();
    for (let e = 0; e < src.length; e++) {
        if (skip(src[e]) || skip(dst[e])) {
            continue;
        }
        lines.push(`n${src[e]} ${arrow} n${dst[e]};`);
    }

    lines.push("}");
    return `${lines.join("\n")}\n`;
}

/**
 * Write each group as a `cluster` subgraph of its members, a group inside a group nested in it.
 * A group or node held by two groups is written in the first only: Graphviz clusters do not overlap.
 * @param groups - the groups, by row, each with its member rows
 * @param lines - the DOT lines, appended to
 */
function writeClusters(groups: ReadonlyMap<number, readonly number[]>, lines: string[]): void {
    const nested = new Set([...groups.values()].flat().filter((row) => groups.has(row)));
    const written = new Set<number>();
    const write = (group: number): void => {
        written.add(group);
        lines.push(`subgraph cluster_n${group} {`);
        for (const member of groups.get(group) ?? []) {
            if (written.has(member)) {
                continue;
            }
            if (groups.has(member)) {
                write(member);
                continue;
            }
            written.add(member);
            lines.push(`n${member};`);
        }
        lines.push("}");
    };
    for (const group of groups.keys()) {
        if (!nested.has(group)) {
            write(group);
        }
    }
}
