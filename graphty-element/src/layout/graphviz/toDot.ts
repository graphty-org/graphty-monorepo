/**
 * @file The graph a Graphviz layout is handed, written as DOT.
 *
 * Nodes are named by row (`n0`, `n1`, ...) so no id ever needs quoting and the answer maps back
 * to rows without a lookup table. Every node is a fixed-size circle as wide as the element draws
 * it, with no label: Graphviz spaces what the element draws, not text the element does not draw
 * that way. What else decides where dot puts a node is handed over as the file gave it (see
 * {@link DotStructure}): edge weights, lengths and labels, cluster labels and rank subgraphs.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

/** Points per scene unit: a node of size 1 is one inch (72 points) wide to Graphviz. */
export const POINTS_PER_UNIT = 72;

/** The node size used for a row the element reports no size for. */
const DEFAULT_NODE_SIZE = 1;

/** One edge as handed to Graphviz: its end rows and the Graphviz attributes it carries. */
export interface DotEdge {
    readonly src: number;
    readonly dst: number;
    readonly attributes?: Readonly<Record<string, string>>;
}

/** The structure of the graph besides its nodes' sizes, as Graphviz attributes. */
export interface DotStructure {
    /** The edges, in the order to write them; the stored graph's own edges, plain, when absent. */
    readonly edges?: readonly DotEdge[];
    /** The attributes each group's cluster carries (its label and font take room), by group row. */
    readonly groupAttributes?: ReadonlyMap<number, Readonly<Record<string, string>>>;
    /** Node rows dot puts on one rank (`same`) or on the first or last (`min`, `max`, `source`, `sink`). */
    readonly ranks?: readonly { readonly rank: string; readonly rows: readonly number[] }[];
    /** The attributes each node carries besides its size (its `shape`, which its ports and outline follow), by row. */
    readonly nodeAttributes?: ReadonlyMap<number, Readonly<Record<string, string>>>;
    /**
     * Where each node already is, two numbers per row in points (y up): each is pinned there (`pos="x,y!"`), for a
     * run that routes the edges between placed nodes and moves none of them (`neato -n2`). NaN for a row left free.
     */
    readonly positions?: ArrayLike<number>;
}

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
        return `n${row} [shape=box, width=${width}, height=${height}${boxArea}`;
    }
    const size = sizes?.[row];
    const inches = isLength(size) ? size : DEFAULT_NODE_SIZE;
    const area = cellAreas ? `, area=${PATCHWORK_AREA_PER_SQUARE_INCH * inches * inches}` : "";
    // a node of a given shape keeps its drawn width and height: a circle is as tall as it is wide
    return `n${row} [width=${inches}, height=${inches}${area}`;
}

/**
 * A node's attributes besides its size: its own (its shape), and its pinned place when it has one.
 * @param row - the node's row
 * @param structure - the node attributes and positions
 * @returns the attributes, each `, name="value"`
 */
function nodeExtras(row: number, structure: DotStructure): string {
    const own = Object.entries(structure.nodeAttributes?.get(row) ?? {}).filter(([name]) => isPlainName(name));
    const x = structure.positions?.[2 * row];
    const y = structure.positions?.[2 * row + 1];
    const pinned = x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y);
    const all = pinned ? [...own, ["pos", `${x},${y}!`]] : own;
    return all.map(([name, value]) => `, ${name}=${quote(value)}`).join("");
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
 * @param structure - the edges with their attributes, the clusters' attributes and the rank subgraphs
 * @param cellAreas - also give each node a patchwork `area` that fits its drawn size, for the
 *   engine that sizes nodes by area and ignores their width
 * @returns the DOT text
 */
export function toDot(
    stored: GraphSnapshot,
    attributes: Readonly<Record<string, string>>,
    sizes?: ArrayLike<number>,
    extents?: ArrayLike<number>,
    groups: ReadonlyMap<number, readonly number[]> = new Map(),
    structure: DotStructure = {},
    cellAreas = false,
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
        if (!skip(row)) {
            lines.push(`${nodeLine(row, sizes, extents, cellAreas)}${nodeExtras(row, structure)}];`);
        }
    }

    writeClusters(groups, lines, structure.groupAttributes);

    for (const { rank, rows } of structure.ranks ?? []) {
        const members = rows.filter((row) => !skip(row) && row < stored.nodeCount);
        if (members.length > 0 && isPlainName(rank)) {
            const names = members.map((row) => `n${row};`).join(" ");
            lines.push(`{ rank=${rank}; ${names} }`);
        }
    }

    // each edge is named by its place in the list, so the route Graphviz lays it maps back to it
    for (const [k, { src, dst, attributes: own }] of (structure.edges ?? edgesOf(stored)).entries()) {
        if (!skip(src) && !skip(dst)) {
            const id = `e${k}`;
            lines.push(`n${src} ${arrow} n${dst}${attributeList({ ...own, id })};`);
        }
    }

    lines.push("}");
    return `${lines.join("\n")}\n`;
}

/**
 * A stored graph's edges, plain.
 * @param stored - the graph
 * @returns its edges
 */
function edgesOf(stored: GraphSnapshot): DotEdge[] {
    const { src, dst } = stored.edgeList();
    return Array.from(src, (s, e) => ({ src: s, dst: dst[e] }));
}

/**
 * An attribute list, ` [name="value", ...]`, of the plain-named attributes; empty when there are none.
 * @param attributes - the attributes
 * @returns the list
 */
function attributeList(attributes: Readonly<Record<string, string>> | undefined): string {
    const written = Object.entries(attributes ?? {})
        .filter(([name]) => isPlainName(name))
        .map(([name, value]) => `${name}=${quote(value)}`);
    return written.length > 0 ? ` [${written.join(", ")}]` : "";
}

/**
 * Write each group as a `cluster` subgraph of its members, a group inside a group nested in it.
 * A group or node held by two groups is written in the first only: Graphviz clusters do not overlap.
 * @param groups - the groups, by row, each with its member rows
 * @param lines - the DOT lines, appended to
 * @param own - each group's own cluster attributes, by row
 */
function writeClusters(
    groups: ReadonlyMap<number, readonly number[]>,
    lines: string[],
    own?: ReadonlyMap<number, Readonly<Record<string, string>>>,
): void {
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
        // after the inner clusters: a subgraph takes the graph attributes set around it before it opens
        const clusterAttributes = attributeList(own?.get(group));
        if (clusterAttributes !== "") {
            lines.push(`graph${clusterAttributes};`);
        }
        lines.push("}");
    };
    for (const group of groups.keys()) {
        if (!nested.has(group)) {
            write(group);
        }
    }
}
