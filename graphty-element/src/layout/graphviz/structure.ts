/**
 * @file What a graph's data says about where Graphviz puts its nodes, besides their sizes.
 *
 * A Graphviz file lays its graph out with more than nodes and edges: an edge's `weight`, `minlen`
 * and `constraint` decide its ranks, an edge label and a cluster label take room, and a
 * `rank=same` subgraph puts its nodes side by side. graph-io reads each of these into the node and
 * edge data under its Graphviz name (rank subgraphs into the data manager's rank sets), and this
 * hands them back to Graphviz as the file gave them.
 */

import type { RankSet } from "../../data/groups";
import type { NodeIdType } from "../../Node";
import type { DotEdge, DotStructure } from "./toDot";

/**
 * The edge attributes that move dot's nodes -- how hard an edge pulls, how many ranks it spans, whether it ranks its
 * ends, and the label it makes room for -- and those that shape its route: the ports it leaves and meets its nodes
 * at, and the arrowheads its spline stops short for.
 */
const EDGE_ATTRIBUTES = [
    "weight",
    "minlen",
    "constraint",
    "label",
    "fontsize",
    "fontname",
    "tailport",
    "headport",
    "dir",
    "arrowhead",
    "arrowtail",
    "arrowsize",
    "headclip",
    "tailclip",
] as const;

/**
 * The node attributes an edge's route follows besides the node's size: its outline, and where its ports are (a
 * record's fields, `{<p1> a|<p2> b}`, are laid out from its label in its font).
 */
const NODE_ATTRIBUTES = [
    "shape",
    "sides",
    "orientation",
    "distortion",
    "skew",
    "label",
    "fontsize",
    "fontname",
] as const;

/**
 * The node attributes Graphviz sizes a node by when it fits the node to its label (`fixedsize=false`, its default):
 * the label in its font, the room round it, the outline drawn round that, and the least size
 * (lib/common/shapes.c `poly_init`).
 */
const NODE_SIZE_ATTRIBUTES = [
    ...NODE_ATTRIBUTES,
    "width",
    "height",
    "fixedsize",
    "margin",
    "peripheries",
    "penwidth",
    "regular",
    "area",
] as const;

/**
 * The cluster attributes that take room: its label, the label's font, which side the label takes room on (a graph's
 * `labelloc` is its clusters' default too), and its margin.
 */
const CLUSTER_ATTRIBUTES = ["label", "fontsize", "fontname", "labelloc", "margin"] as const;

/** A label escape that names the graph (`\G`), which the layout does not know. */
const GRAPH_NAME_ESCAPE = String.raw`\G`;

/** The label escape that names the node (`\N`), Graphviz's default label. */
const NODE_NAME_ESCAPE = String.raw`\N`;

/** The markup of an HTML-like label (`<b>name</b>`): Graphviz is handed its text. */
const MARKUP = /<[^<>]*>/g;

/** An edge as the layout holds it. */
interface EdgeLike {
    readonly srcId: NodeIdType;
    readonly dstId: NodeIdType;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * The Graphviz attributes a record carries, of the names asked for.
 * @param data - the node's or edge's data
 * @param names - the attribute names
 * @param asWritten - hand each value over as the file wrote it, for Graphviz to size a node by
 * @returns the attributes as Graphviz text; absent ones left out
 */
function attributesOf(
    data: Readonly<Record<string, unknown>>,
    names: readonly string[],
    asWritten = false,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const name of names) {
        const value = data[name];
        // an empty value (`weight = ""`) sets the attribute back to Graphviz's default
        if (value !== "" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) {
            out[name] = asWritten ? String(value) : attributeText(name, String(value));
        }
    }

    return out;
}

/**
 * A node's attributes for Graphviz to size it by its label, as the file gave them: its label (Graphviz's default,
 * its name, when it has none), font, shape and least size.
 * @param data - the node's data
 * @param id - the node's id, which `\N` stands for
 * @returns the attributes, or null for a label naming the graph (`\G`), which goes at the size it is drawn
 */
function labelSizedAttributes(data: Readonly<Record<string, unknown>>, id: NodeIdType): Record<string, string> | null {
    const out = attributesOf(data, NODE_SIZE_ATTRIBUTES, true);
    const label = out.label ?? NODE_NAME_ESCAPE;
    if (label.includes(GRAPH_NAME_ESCAPE)) {
        return null;
    }

    out.label = label.replaceAll(NODE_NAME_ESCAPE, String(id));
    return out;
}

/**
 * An attribute's value as Graphviz is handed it.
 * @param name - the attribute
 * @param value - its value as the file gave it
 * @returns the value
 */
function attributeText(name: string, value: string): string {
    if (name === "label") {
        return labelText(value);
    }
    // `plain` is as big as its label, and Graphviz is handed no label: `plaintext` keeps the size
    // the element draws it (a node of no size leaves `splines=ortho` routing nothing at all)
    return name === "shape" && value === "plain" ? "plaintext" : value;
}

/**
 * A label's text: an HTML-like label without its markup, whose words take the room.
 * @param label - the label as the file gave it
 * @returns the text
 */
function labelText(label: string): string {
    return label.startsWith("<") && label.endsWith(">") ? label.slice(1, -1).replaceAll(MARKUP, "") : label;
}

/**
 * The structure to hand Graphviz.
 * @param rowOf - each node id's row, or a negative number for none
 * @param edges - the edges, in the order they arrived
 * @param groups - each group's row with its data
 * @param ranks - the rank subgraphs
 * @param nodes - each node's data by row, when its outline is handed over too (its `shape`): for a run that only
 *     routes the edges between nodes already placed, whose ends follow the outline Graphviz draws
 * @param sizing - when given, each node of `nodes` is handed over for Graphviz to size by its label, as it lays out a
 *     DOT file (`idOf` names each row, for the `\N` in a label)
 * @param sizing.idOf - each row's node id
 * @returns the structure, and the edge each of its edges is (`edgeOf`, by place in the list)
 */
export function graphvizStructure<E extends EdgeLike>(
    rowOf: (id: NodeIdType) => number,
    edges: readonly E[],
    groups: ReadonlyMap<number, Readonly<Record<string, unknown>>>,
    ranks: readonly RankSet[],
    nodes?: ReadonlyMap<number, Readonly<Record<string, unknown>>>,
    sizing?: { readonly idOf: (row: number) => NodeIdType },
): DotStructure & { readonly edgeOf: readonly E[] } {
    const dotEdges: DotEdge[] = [];
    const edgeOf: E[] = [];
    for (const edge of edges) {
        const src = rowOf(edge.srcId);
        const dst = rowOf(edge.dstId);
        if (src >= 0 && dst >= 0) {
            dotEdges.push({ src, dst, attributes: attributesOf(edge.data, EDGE_ATTRIBUTES) });
            edgeOf.push(edge);
        }
    }

    return {
        edges: dotEdges,
        edgeOf,
        groupAttributes: new Map([...groups].map(([row, data]) => [row, attributesOf(data, CLUSTER_ATTRIBUTES)])),
        ranks: ranks.map(({ rank, members }) => ({ rank, rows: members.map(rowOf).filter((row) => row >= 0) })),
        ...(nodes === undefined ? {} : { nodeAttributes: nodeAttributes(nodes, sizing) }),
        ...(sizing === undefined ? {} : { labelSized: true }),
    };
}

/**
 * Each node's attributes: its outline, or everything Graphviz sizes it by.
 * @param nodes - each node's data by row
 * @param sizing - when given, the attributes Graphviz sizes each node by, with each row's id
 * @param sizing.idOf - each row's node id
 * @returns the attributes by row; a row Graphviz cannot size is left out
 */
function nodeAttributes(
    nodes: ReadonlyMap<number, Readonly<Record<string, unknown>>>,
    sizing: { readonly idOf: (row: number) => NodeIdType } | undefined,
): Map<number, Readonly<Record<string, string>>> {
    const out = new Map<number, Readonly<Record<string, string>>>();
    for (const [row, data] of nodes) {
        const attributes =
            sizing === undefined ? attributesOf(data, NODE_ATTRIBUTES) : labelSizedAttributes(data, sizing.idOf(row));
        if (attributes !== null) {
            out.set(row, attributes);
        }
    }

    return out;
}
