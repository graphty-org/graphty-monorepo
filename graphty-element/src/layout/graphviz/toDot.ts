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
 * patchwork's cell area per square inch of node width. patchwork ignores `width` and gives each
 * node a cell of about 1000 square points per unit of its `area` attribute (measured), so a node
 * one inch wide needs an area of 9 for a cell about 1.3 inches on a side: the drawn node fits
 * inside its cell with a margin, even in the narrower cells of an uneven treemap.
 */
const PATCHWORK_AREA_PER_SQUARE_INCH = 9;

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
 * One node's DOT statement: a box when its two drawn sides differ, else a circle of its size.
 * @param row - the node's row
 * @param sizes - the drawn size of each node, in scene units; NaN or absent for the default
 * @param extents - the drawn width and height of each node, two per row
 * @param cellAreas - also give the node a patchwork `area` that fits its drawn size
 * @returns the node's line
 */
function nodeLine(
    row: number,
    sizes: ArrayLike<number> | undefined,
    extents: ArrayLike<number> | undefined,
    cellAreas: boolean,
): string {
    const width = extents?.[2 * row];
    const height = extents?.[2 * row + 1];
    if (isLength(width) && isLength(height) && width !== height) {
        const boxArea = cellAreas ? `, area=${PATCHWORK_AREA_PER_SQUARE_INCH * width * height}` : "";
        return `n${row} [shape=box, width=${width}, height=${height}${boxArea}];`;
    }
    const size = sizes?.[row];
    const inches = isLength(size) ? size : DEFAULT_NODE_SIZE;
    const area = cellAreas ? `, area=${PATCHWORK_AREA_PER_SQUARE_INCH * inches * inches}` : "";
    return `n${row} [width=${inches}${area}];`;
}

/**
 * Write the graph as DOT.
 * @param stored - the graph as the element stores it: direction and every parallel edge
 * @param attributes - graph attributes, already as Graphviz text
 * @param sizes - the drawn size of each node, in scene units; NaN or absent for the default
 * @param extents - the drawn width and height of each node, two per row, in scene units: a row
 *     with two different sides is a box that size, the rest are circles as wide as `sizes` says
 * @param skip - the rows left out, with their edges: groups the element draws round their members
 * @param cellAreas - also give each node a patchwork `area` that fits its drawn size, for the
 *   engine that sizes nodes by area and ignores their width
 * @returns the DOT text
 */
export function toDot(
    stored: GraphSnapshot,
    attributes: Readonly<Record<string, string>>,
    sizes?: ArrayLike<number>,
    extents?: ArrayLike<number>,
    skip: (row: number) => boolean = () => false,
    cellAreas = false,
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
        if (!skip(row)) {
            lines.push(nodeLine(row, sizes, extents, cellAreas));
        }
    }

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
