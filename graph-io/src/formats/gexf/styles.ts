/**
 * GEXF styles: reading the viz module (`viz:color`, `viz:size`, `viz:shape`, `viz:thickness`) into the neutral
 * style vocabulary with Gephi's defaults, and writing a graph's styles back into the viz module, with graphty's
 * `graphty.styles` block in `<meta>` (in graphty's own XML namespace, which graph-io, NetworkX's `read_gexf` and
 * Gephi's GEXF importer all skip) and the per-element style values the block reads as ordinary attributes.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { explicitWeights } from "../../common/weights.js";
import { canonColor } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber } from "../../styles/canon/number.js";
import type { CanonSite } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import { STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import { type ElementValues, takeFromBlock } from "../../styles/io/round-trip.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type {
    ImporterStyles,
    StyleColumn,
    StyleReadContext,
    StyleRule,
    StyleTarget,
    StyleValue,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { NODE_COLUMNS, VIZ_NAMESPACE } from "./schema.js";

/** The column of a node's `label` attribute. */
const LABEL_COLUMN = NODE_COLUMNS.label;

/**
 * The XML namespace of graphty's own elements in a GEXF file (the `graphty.styles` block inside `<meta>`).
 * @category Built-in formats
 */
export const GRAPHTY_XML_NAMESPACE = "https://graphty.app/ns/gexf";

/**
 * What the GEXF writer holds natively: a node's `label` attribute, the viz module's color (with its alpha), size, shape and
 * thickness, and the edge line shape. The block goes into `<meta>`.
 * @category Built-in formats
 */
export const GEXF_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    node: Object.freeze(["label", "fill", "fillOpacity", "width", "height", "shape", "image"] as const),
    edge: Object.freeze(["color", "opacity", "width", "lineStyle"] as const),
    block: "native",
});

/** Gephi's node fill when a node has no `viz:color` (graphstore NodeImpl), which its edges then take. */
const GEPHI_NODE_FILL = "#000000";

/** The style column marking directed edges, which Gephi draws with an arrow at the target. */
const DIRECTED_KEY = "directed";

/** The style column holding the mix of its end nodes' colors of each edge without a color of its own. */
const MIXED_COLOR_KEY = "end-colors";
/** The width property and the style column of the width Gephi draws an edge with from its weight. */
const WEIGHT_WIDTH = ["width", "weight-width"] as const;
/** Gephi's node width when a node has no `viz:size` (graphstore NodeImpl size 10, a radius). */
const GEPHI_NODE_WIDTH = 20;

/** GEXF's node shapes, by the neutral shape each writes exactly. */
const NODE_SHAPES: ReadonlyMap<string, string> = new Map([
    ["ellipse", "disc"],
    ["rectangle", "square"],
    ["triangle", "triangle"],
    ["diamond", "diamond"],
]);

/** The nearest GEXF node shape of the neutral shapes GEXF does not have; anything else is a disc. */
const NEAREST_NODE_SHAPES: ReadonlyMap<string, string> = new Map([
    ["round-rectangle", "square"],
    ["vee", "triangle"],
]);

/** GEXF's edge shapes; a dash pattern GEXF does not have is dashed, anything else solid. */
const EDGE_SHAPES: ReadonlySet<string> = new Set(["solid", "dotted", "dashed", "double"]);

/**
 * The GEXF node shape written for a neutral shape.
 * @param shape - the neutral shape
 * @returns the GEXF shape and whether it is exact
 */
function gexfNodeShape(shape: string): { readonly value: string; readonly exact: boolean } {
    const exact = NODE_SHAPES.get(shape);
    return exact === undefined
        ? { value: NEAREST_NODE_SHAPES.get(shape) ?? "disc", exact: false }
        : { value: exact, exact: true };
}

/**
 * The GEXF edge shape written for a neutral line style.
 * @param line - the neutral line style
 * @returns the GEXF shape and whether it is exact
 */
function gexfEdgeShape(line: string): { readonly value: string; readonly exact: boolean } {
    if (EDGE_SHAPES.has(line)) {
        return { value: line, exact: true };
    }
    return { value: line === "dash-dot" || line === "long-dash" ? "dashed" : "solid", exact: false };
}

/** The viz-derived columns the reader reads; `shape.uri` is the image of an `image` shape. */
const VIZ_COLUMNS: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: ["color", "size", "shape", "shape.uri"],
    edge: ["color", "thickness", "shape"],
};

/**
 * A `viz:color` `hex` value as channels: r, g and b 0..255 and an alpha 0..1. Reads `#rgb`, `#rgba`, `#rrggbb` and
 * `#rrggbbaa` (alpha last), with or without the `#`.
 * @param hex - the attribute's value
 * @returns `[r, g, b, a]`, or null when it is not a hex color
 */
export function canonVizColor(hex: string): [number, number, number, number] | null {
    const text = hex.trim();
    if (!/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) {
        return null;
    }
    const c = canonColor(text.startsWith("#") ? text : `#${text}`, "css", {
        notes: new StyleNotes(),
        target: "node",
        property: "fill",
    });
    if (c === null) {
        return null;
    }
    const n = Number.parseInt(c.color.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, c.alpha];
}

/**
 * A viz column of the snapshot, or null when the column is absent or not viz-derived.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param name - the column's fixed name
 * @returns the column's name, or null
 */
function vizColumn(snapshot: GraphSnapshot, target: StyleTarget, name: string): string | null {
    const col = (target === "node" ? snapshot.nodes : snapshot.edges).get(name);
    return col !== null && col.meta.origin?.namespace === VIZ_NAMESPACE ? name : null;
}

/** What the per-element readers of vizValues() share. */
interface VizRead {
    readonly table: GraphSnapshot["nodes"];
    readonly target: StyleTarget;
    /** The values of a property, created on first use. */
    readonly column: (property: string) => (StyleValue | null)[];
    /** Where a value of an element was read. */
    readonly site: (i: number, property: string) => CanonSite;
}

/**
 * One target's canonical values from its viz columns and, on a node, its `label` attribute, which Gephi draws.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param notes - where problems are noted
 * @param context - the work budget
 * @returns the values per property
 */
function vizValues(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    notes: StyleNotes,
    context: StyleReadContext,
): Record<string, (StyleValue | null)[]> {
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const out: Record<string, (StyleValue | null)[]> = {};
    const viz: VizRead = {
        table,
        target,
        column: (p) => (out[p] ??= new Array<StyleValue | null>(n).fill(null)),
        site: (i, property) => ({ notes, target, property, element: i, budget: context.budget }),
    };
    const color = vizColumn(snapshot, target, "color");
    const size = vizColumn(snapshot, target, target === "node" ? "size" : "thickness");
    const shape = vizColumn(snapshot, target, "shape");
    const uri = target === "node" ? vizColumn(snapshot, target, "shape.uri") : null;
    // Gephi draws the labels of nodes; an edge's label it does not draw
    const label = target === "node" ? table.byRole("label") : null;
    for (let i = 0; i < n; i++) {
        if (label !== null) {
            readLabel(viz, label, i);
        }
        if (color !== null) {
            readVizColor(viz, color, i);
        }
        if (size !== null) {
            readVizSize(viz, size, i);
        }
        // GEXF gives a shape a uri only to name the picture of an `image` shape
        if (shape !== null && readVizShape(viz, shape, i) && uri !== null) {
            readVizImage(viz, uri, i);
        }
    }
    return out;
}

/**
 * Reads one node's label, which Gephi draws.
 * @param viz - the target's reading
 * @param label - the label column
 * @param i - the element
 */
function readLabel(viz: VizRead, label: NonNullable<ReturnType<GraphSnapshot["nodes"]["byRole"]>>, i: number): void {
    const text = canonText(plainCell(label.value(i)), viz.site(i, "label"));
    if (text !== null) {
        viz.column("label")[i] = text;
    }
}

/**
 * Reads the picture of one node whose viz shape is `image`.
 * @param viz - the target's reading
 * @param uri - the viz shape uri column
 * @param i - the element
 */
function readVizImage(viz: VizRead, uri: string, i: number): void {
    const v = plainCell(viz.table.value(uri, i));
    if (typeof v === "string" && v.length > 0) {
        viz.column("image")[i] = v;
    }
}

/**
 * Reads one element's viz color: a fill on a node, a color on an edge, with its alpha as an opacity.
 * @param viz - the target's reading
 * @param color - the viz color column
 * @param i - the element
 */
function readVizColor(viz: VizRead, color: string, i: number): void {
    const v = plainCell(viz.table.value(color, i));
    if (!Array.isArray(v)) {
        return;
    }
    const [fill, opacity] = viz.target === "node" ? ["fill", "fillOpacity"] : ["color", "opacity"];
    const [r, g, b, a = 1] = v as number[];
    const c = canonColor({ r: r * 255, g: g * 255, b: b * 255, a }, "gexf", viz.site(i, fill));
    if (c !== null) {
        viz.column(fill)[i] = c.color;
        if (c.alpha < 1) {
            viz.column(opacity)[i] = c.alpha;
        }
    }
}

/**
 * Reads one element's viz size (a node's width and height) or thickness (an edge's width). A node's
 * size is a radius, as Gephi and sigma draw it (Gephi's preview: a circle of radius 0.92 x size plus
 * a 0.16 x size outline, an outer diameter of 2 x size), so its width and height are twice it.
 * @param viz - the target's reading
 * @param size - the viz size or thickness column
 * @param i - the element
 */
function readVizSize(viz: VizRead, size: string, i: number): void {
    const v = canonNumber(plainCell(viz.table.value(size, i)), viz.site(i, "width"));
    if (v !== null) {
        if (viz.target === "node") {
            viz.column("width")[i] = 2 * v;
            viz.column("height")[i] = 2 * v;
        } else {
            viz.column("width")[i] = v;
        }
    }
}

/**
 * Reads one element's viz shape: a node's shape, an edge's line style.
 * @param viz - the target's reading
 * @param shape - the viz shape column
 * @param i - the element
 * @returns whether it is an `image` shape
 */
function readVizShape(viz: VizRead, shape: string, i: number): boolean {
    const raw = plainCell(viz.table.value(shape, i));
    if (raw === null) {
        return false;
    }
    const kind = viz.target === "node" ? "shape" : "lineStyle";
    viz.column(kind)[i] = canonEnum(kind, raw, "gexf", viz.site(i, kind));
    return typeof raw === "string" && raw.toLowerCase() === "image";
}

/**
 * Whether each edge is directed.
 * @param snapshot - the graph
 * @returns one flag per edge
 */
function directedEdges(snapshot: GraphSnapshot): boolean[] {
    const out = new Array<boolean>(snapshot.edgeCount).fill(snapshot.directed);
    const col = snapshot.directed ? snapshot.edges.byRole("directed") : null;
    if (col !== null) {
        for (let e = 0; e < snapshot.edgeCount; e++) {
            out[e] = plainCell(col.value(e)) !== false;
        }
    }
    return out;
}

/** The node values Gephi's per-element defaults are worked out from, each undefined when no node has one. */
export interface GephiNodeValues {
    /** Each node's fill. */
    readonly fill?: readonly (StyleValue | null)[];
    /** Each node's fill opacity (the alpha of its color), null for opaque. */
    readonly fillOpacity?: readonly (StyleValue | null)[];
    /** Each node's width, twice its Gephi size. */
    readonly width?: readonly (StyleValue | null)[];
}

/** The edge values Gephi's per-element defaults give way to, each undefined when no edge has one. */
export interface GephiEdgeValues {
    /** Each edge's own color. */
    readonly color?: readonly (StyleValue | null)[];
    /** Each edge's own width. */
    readonly width?: readonly (StyleValue | null)[];
}

/** The rules of one target and the style columns they read. */
interface GephiTargetRules {
    readonly rules: StyleRule[];
    readonly columns: Map<string, StyleColumn>;
}

/**
 * A node color's channels as Gephi holds them: r, g, b and alpha, 0..255.
 * @param fill - the node's fill, or null for Gephi's default
 * @param opacity - its opacity, or null for opaque
 * @returns the channels
 */
function nodeChannels(fill: StyleValue | null | undefined, opacity: StyleValue | null | undefined): number[] {
    const n = Number.parseInt((typeof fill === "string" ? fill : GEPHI_NODE_FILL).slice(1), 16);
    const a = typeof opacity === "number" ? Math.round(opacity * 255) : 255;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

/**
 * `#rrggbb` of three channels.
 * @param c - r, g and b, 0..255
 * @returns the color
 */
function hexOf(c: readonly number[]): string {
    return `#${c
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")}`;
}

/**
 * A passthrough rule of a tool default that is itself per element, and its column, when any element takes it.
 * @param out - the target's rules and columns, changed in place
 * @param target - nodes or edges
 * @param pair - the style property and its style column, which is also the rule's id after `<target>.tool.`
 * @param column - the default per element, null where the element has its own value
 * @param reason - why the values are per element
 */
function perElementDefault(
    out: GephiTargetRules,
    target: StyleTarget,
    pair: readonly [string, string],
    column: (StyleValue | null)[],
    reason: string,
): void {
    const [property, key] = pair;
    const elements = column.filter((v) => v !== null).length;
    if (elements === 0) {
        return;
    }
    out.columns.set(key, column);
    out.rules.push({
        id: `${target}.tool.${key}`,
        target,
        role: "passthrough",
        origin: "tool",
        where: { has: { style: key } },
        map: { [property]: { kind: "passthrough" as const, by: { style: key } } },
        facts: { elements, reason },
    });
}

/**
 * The rules Gephi's preview defaults (DefaultPreset) make per element, as its SVG export draws every GEXF and GraphML
 * file: each node outlined in a darker shade of its fill, 0.08 of its width wide, with its label 0.3 of its width
 * tall; each edge in the mix of its two end nodes' colors and alphas, as thick as its weight, with an arrow at the
 * target of a directed edge. An element's own value is kept (a file graphty wrote states every one).
 * @param snapshot - the graph
 * @param nodes - each node's fill, opacity and width
 * @param edges - each edge's own color and width
 * @param budget - the work budget
 * @returns the node and edge rules and the style columns they read
 */
export function gephiRules(
    snapshot: GraphSnapshot,
    nodes: GephiNodeValues,
    edges: GephiEdgeValues,
    budget: StyleReadContext["budget"],
): { readonly node: GephiTargetRules; readonly edge: GephiTargetRules } {
    const node: GephiTargetRules = { rules: [], columns: new Map() };
    const edge: GephiTargetRules = { rules: [], columns: new Map() };
    const directed = directedEdges(snapshot);
    if (directed.some(Boolean)) {
        edge.columns.set(
            DIRECTED_KEY,
            directed.map((d) => (d ? true : null)),
        );
        edge.rules.push({
            id: "edge.tool.arrow",
            target: "edge",
            role: "group",
            origin: "tool",
            where: { has: { style: DIRECTED_KEY } },
            set: { targetArrow: "triangle" },
        });
    }
    budget.spend("node", snapshot.nodeCount);
    budget.spend("edge", snapshot.edgeCount);
    const channels = Array.from({ length: snapshot.nodeCount }, (_, i) =>
        nodeChannels(nodes.fill?.[i], nodes.fillOpacity?.[i]),
    );
    // NodeRenderer: the border is DependantColor DARKER, half of each channel (+-1 from Gephi's float math)
    perElementDefault(
        node,
        "node",
        ["borderColor", "border-shade"],
        channels.map((c) => hexOf(c.map((v) => Math.floor(v / 2)))),
        "NODE_FILL_SHADE",
    );
    // A node of size s is a circle of radius 0.92 s with a 0.16 s border: 0.08 of its 2 s width. Its label is
    // Arial 12 in proportion to the size, round(0.6 s) (NODE_LABEL_PROPORTIONAL_SIZE), never under 1.
    const width = (i: number): number => {
        const w = nodes.width?.[i];
        return typeof w === "number" ? w : GEPHI_NODE_WIDTH;
    };
    const nodeIndices = Array.from({ length: snapshot.nodeCount }, (_, i) => i);
    perElementDefault(
        node,
        "node",
        ["borderWidth", "size-border"],
        nodeIndices.map((i) => 0.08 * width(i)),
        "NODE_SIZE",
    );
    perElementDefault(
        node,
        "node",
        ["labelSize", "size-label"],
        nodeIndices.map((i) => Math.max(1, Math.round(0.3 * width(i)))),
        "NODE_SIZE",
    );
    // An undirected edge in a directed graph is one edge in the file and two halves here: both halves take the
    // first half's weight.
    const first = firstHalf(snapshot);
    // Gephi draws an edge as thick as its weight (1 for an edge with none); a width of its own is the file's
    // The weights come from the snapshot's own weights (the role column exists only when some edge has none), read
    // as the shortest decimal of their dtype. A weight of 0 or below is drawn 1 wide, so the edge stays visible.
    const weights = explicitWeights(snapshot);
    perElementDefault(
        edge,
        "edge",
        WEIGHT_WIDTH,
        withoutOwn(edges.width, snapshot.edgeCount, (e) => {
            const w = Number(weights.text(first(e)) ?? 1);
            return Number.isFinite(w) && w > 0 ? w : 1;
        }),
        "EDGE_WEIGHT",
    );
    // EdgeColor MIXED: each channel, alpha too, the truncated mean of the two end nodes'. graphty-element cannot
    // bind an edge's color to its nodes' drawn colors, so the mix is frozen here.
    const mixed = (e: number): number[] => {
        const s = channels[snapshot.edgeSource(e)];
        const t = channels[snapshot.edgeTarget(e)];
        return s.map((v, k) => Math.floor((v + t[k]) / 2));
    };
    perElementDefault(
        edge,
        "edge",
        ["color", MIXED_COLOR_KEY],
        withoutOwn(edges.color, snapshot.edgeCount, (e) => hexOf(mixed(e))),
        "END_NODE_COLORS",
    );
    perElementDefault(
        edge,
        "edge",
        ["opacity", "end-opacity"],
        withoutOwn(edges.color, snapshot.edgeCount, (e) => mixed(e)[3] / 255).map((v) => (v === 1 ? null : v)),
        "END_NODE_COLORS",
    );
    return { node, edge };
}

/**
 * The edge whose source Gephi draws for each edge: an undirected edge in a directed graph is one edge in the file
 * and two halves here, and the second half takes the first half's.
 * @param snapshot - the graph
 * @returns the first half of each edge
 */
function firstHalf(snapshot: GraphSnapshot): (e: number) => number {
    const pair = snapshot.edges.byRole("pair");
    return (e) => (pair?.isSet(e) === true ? Math.min(e, pair.value(e) as number) : e);
}

/**
 * A default value for every edge without a value of its own.
 * @param own - each edge's own value, or undefined when no edge has one
 * @param count - the edge count
 * @param value - the default of an edge
 * @returns the defaults, null where an edge has its own
 */
function withoutOwn(
    own: readonly (StyleValue | null)[] | undefined,
    count: number,
    value: (e: number) => StyleValue,
): (StyleValue | null)[] {
    const out = new Array<StyleValue | null>(count).fill(null);
    for (let e = 0; e < count; e++) {
        if (own?.[e] === null || own === undefined) {
            out[e] = value(e);
        }
    }
    return out;
}

/**
 * The styles of a GEXF file as Gephi's preview draws it: each node's label, fill and size, Gephi's defaults beneath
 * (black size-10 discs, curved edges) and its per-element defaults (gephiRules()); the viz values Gephi does not draw
 * are left out (withoutUndrawn()); plus a `graphty.styles` block the file holds in `<meta>`, whose file keeps every
 * value.
 * @param snapshot - the graph the import built
 * @param context - the work budget and the block text the import kept
 * @returns the styles
 */
export function gexfStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const node = vizValues(snapshot, "node", notes, context);
    const edge = vizValues(snapshot, "edge", notes, context);
    const block = typeof context.kept === "string" ? context.kept : null;
    const nodeOpacity = node.fillOpacity;
    if (block === null) {
        withoutUndrawn(node, edge);
    } else {
        exactFromBlock(snapshot, block, node, edge);
    }
    const rules = gephiRules(
        snapshot,
        { fill: node.fill, fillOpacity: nodeOpacity, width: node.width },
        { color: edge.color, width: edge.width },
        context.budget,
    );
    return {
        canonical: true,
        dialect: "gexf",
        tool: "gephi",
        units: "relative",
        node: { values: node, ...rules.node },
        edge: { values: edge, ...rules.edge },
        notes: notes.list(),
        opacityInColor: true,
        block,
        readFrom: {
            node: VIZ_COLUMNS.node.filter((name) => vizColumn(snapshot, "node", name) !== null),
            edge: VIZ_COLUMNS.edge.filter((name) => vizColumn(snapshot, "edge", name) !== null),
        },
    };
}

/**
 * Leaves out the viz values Gephi does not draw, for a file graphty did not write: its preview draws every node an
 * opaque disc (a node's alpha only tints its edges) and every edge a solid line in its end nodes' mixed color, as
 * thick as its weight (graphstore keeps no edge thickness or shape, and EdgeColor MIXED ignores an edge's color).
 * A node's picture (an `image` shape) is kept: it is the file's content, not a style Gephi overrides.
 * @param node - the node values, changed in place
 * @param edge - the edge values, changed in place
 */
function withoutUndrawn(
    node: Record<string, (StyleValue | null)[]>,
    edge: Record<string, (StyleValue | null)[]>,
): void {
    const { shape, image } = node;
    if (shape !== undefined) {
        const pictured = shape.map((s, i) => (typeof image?.[i] === "string" ? s : null));
        if (pictured.some((s) => s !== null)) {
            node.shape = pictured;
        } else {
            delete node.shape;
        }
    }
    delete node.fillOpacity;
    delete edge.color;
    delete edge.opacity;
    delete edge.width;
    delete edge.lineStyle;
}

/**
 * For a file graphty wrote: where a viz value is the nearest GEXF value of what the `graphty.styles` block gives (a
 * hexagon written as a disc, a width and height written as one size), the block's exact value is the truth, so a
 * re-import gives the same rules. A value that differs from what graphty wrote (another program edited it) stays
 * the truth.
 * @param snapshot - the graph
 * @param text - the block's text
 * @param node - the node values, changed in place
 * @param edge - the edge values, changed in place
 */
function exactFromBlock(
    snapshot: GraphSnapshot,
    text: string,
    node: Record<string, (StyleValue | null)[]>,
    edge: Record<string, (StyleValue | null)[]>,
): void {
    const shapeRead = new Map([
        ["disc", "ellipse"],
        ["square", "rectangle"],
    ]);
    const size = (want: ElementValues): StyleValue | null => {
        const w = want("width");
        const h = want("height");
        return typeof w === "number" && typeof h === "number" ? Math.max(w, h) : (w ?? h);
    };
    // what the viz element written for an element's block values reads back as
    const written: Readonly<Record<string, (want: ElementValues) => StyleValue | null>> = {
        shape: (want) => {
            const { value } = gexfNodeShape(String(want("shape")));
            return shapeRead.get(value) ?? value;
        },
        width: size,
        height: size,
        lineStyle: (want) => gexfEdgeShape(String(want("lineStyle"))).value,
    };
    takeFromBlock(snapshot, text, "gexf", (target) => ({
        values: target === "node" ? node : edge,
        properties: target === "node" ? ["shape", "width", "height"] : ["lineStyle"],
        readBack: (_i, want) => (property) => written[property](want),
        // a size is written from the width and the height together: one the block leaves unset reads back too
        take: (property, wanted, native) =>
            native !== null && (wanted !== null || property === "width" || property === "height"),
    }));
}

// ============================================================ writing

/** A GEXF export with styles worked out. */
export interface GexfStyledExport {
    /** The graph to write: the viz-derived columns the styles replace removed, the tagged style values added. */
    readonly snapshot: GraphSnapshot;
    /** The `<meta>` child holding the block. */
    readonly blockElement: string;
    /** The viz elements of one node from the styles. */
    node(row: number, indent: string): string;
    /** The viz elements of one edge from the styles. */
    edge(row: number, indent: string): string;
    /** W_STYLE_APPROXIMATED for every value written as the nearest one GEXF has. */
    readonly notes: readonly LossNote[];
}

/**
 * The dtype a tagged column is written with: numbers, booleans or text (a mixed column as text).
 * @param col - the values
 * @returns the dtype
 */
function tagDtype(col: StyleColumn): "f64" | "bool" | "string" {
    const kinds = new Set(col.filter((v) => v !== null).map((v) => typeof v));
    if (kinds.size === 1 && kinds.has("number")) {
        return "f64";
    }
    return kinds.size === 1 && kinds.has("boolean") ? "bool" : "string";
}

/**
 * Works out a GEXF export with styles: the snapshot to write, the viz elements of each element from what graphty
 * draws, the block element and the approximations.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles, or undefined when none are written
 * @returns the styled export, or null without styles
 */
export function gexfStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
): GexfStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const p = (target: StyleTarget, property: string): readonly (StyleValue | null)[] =>
        input.picture(target, property as never);
    const fill = p("node", "fill");
    const fillOpacity = p("node", "fillOpacity");
    const image = p("node", "image");
    const color = p("edge", "color");
    const opacity = p("edge", "opacity");
    const thickness = p("edge", "width");
    const height = p("node", "height");
    // the approximations are counted once, up front, so check() reports them before anything is written
    const approximated = new StyleApproximations();
    const nodeShapes = p("node", "shape").map((s, i) => gexfShapeOf(s, typeof image[i] === "string", approximated));
    const nodeSizes = p("node", "width").map((w, i) => gexfSizeOf(w, height[i], approximated));
    const edgeShapes = p("edge", "lineStyle").map((s) => gexfLineOf(s, approximated));
    return {
        snapshot: withTagColumns(snapshot, input),
        blockElement: `<graphty:styles xmlns:graphty="${GRAPHTY_XML_NAMESPACE}" name="${STYLE_BLOCK_NAME}">${escapeXml(input.block)}</graphty:styles>`,
        notes: approximated.notes("GEXF"),
        node(i, indent) {
            const size = nodeSizes[i];
            const s = nodeShapes[i];
            return (
                colorElement(fill[i], fillOpacity[i], indent) +
                (size === null ? "" : `${indent}<viz:size value="${String(size / 2)}"/>\n`) +
                shapeElement(s, s === "image" ? String(image[i]) : null, indent)
            );
        },
        edge(e, indent) {
            const w = thickness[e];
            return (
                colorElement(color[e], opacity[e], indent) +
                (typeof w === "number" ? `${indent}<viz:thickness value="${String(w)}"/>\n` : "") +
                shapeElement(edgeShapes[e], null, indent)
            );
        },
    };
}

/**
 * The snapshot to write: the viz columns the styles replace removed, the tagged style values and the drawn labels
 * added.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles
 * @returns the snapshot
 */
function withTagColumns(snapshot: GraphSnapshot, input: ExporterStyleInput): GraphSnapshot {
    const out = snapshot.withColumns();
    for (const target of ["node", "edge"] as const) {
        const table = target === "node" ? out.nodes : out.edges;
        for (const name of VIZ_COLUMNS[target]) {
            if (table.get(name)?.meta.origin?.namespace === VIZ_NAMESPACE) {
                table.remove(name);
            }
        }
        for (const [name, col] of input.tags[target]) {
            const dtype = tagDtype(col);
            table.set(name, dtype === "string" ? col.map((v) => (v === null ? null : String(v))) : col, { dtype });
        }
    }
    // a node's label attribute is the label Gephi draws
    const label = input.picture("node", "label").map((v) => (typeof v === "string" ? v : null));
    out.nodes.set(LABEL_COLUMN, label, { dtype: "string", role: "label" }, { replaceRole: true });
    return out;
}

/**
 * A node's GEXF shape. A node with a picture is an `image` shape, the only shape GEXF gives a uri: another shape is
 * not written.
 * @param s - the node's shape
 * @param pictured - whether the node has a picture
 * @param approximated - where approximations are counted
 * @returns the shape, or null for none
 */
function gexfShapeOf(s: StyleValue | null, pictured: boolean, approximated: StyleApproximations): string | null {
    if (pictured) {
        if (typeof s === "string" && s !== "other:image") {
            approximated.add("node", "shape", s);
        }
        return "image";
    }
    if (typeof s !== "string") {
        return null;
    }
    const g = gexfNodeShape(s);
    if (!g.exact) {
        approximated.add("node", "shape", s);
    }
    return g.value;
}

/**
 * An edge's GEXF shape.
 * @param s - the edge's line style
 * @param approximated - where approximations are counted
 * @returns the shape, or null for none
 */
function gexfLineOf(s: StyleValue | null, approximated: StyleApproximations): string | null {
    if (typeof s !== "string") {
        return null;
    }
    const g = gexfEdgeShape(s);
    if (!g.exact) {
        approximated.add("edge", "lineStyle", s);
    }
    return g.value;
}

/**
 * A node's GEXF size: one value, the larger of a width and height that differ.
 * @param w - the node's width
 * @param h - its height
 * @param approximated - where approximations are counted
 * @returns the size, or null for none
 */
function gexfSizeOf(w: StyleValue | null, h: StyleValue | null, approximated: StyleApproximations): number | null {
    if (typeof w === "number" && typeof h === "number" && w !== h) {
        approximated.add("node", w > h ? "height" : "width", `${String(w)} x ${String(h)}`);
        return Math.max(w, h);
    }
    if (typeof w === "number") {
        return w;
    }
    return typeof h === "number" ? h : null;
}

/**
 * A `<viz:color>` element.
 * @param hex - the color, `#rrggbb`
 * @param alpha - its opacity
 * @param indent - the indentation
 * @returns the element, "" without a color
 */
function colorElement(hex: StyleValue | null, alpha: StyleValue | null, indent: string): string {
    if (typeof hex !== "string") {
        return "";
    }
    const n = Number.parseInt(hex.slice(1), 16);
    const a = typeof alpha === "number" && alpha !== 1 ? ` a="${String(alpha)}"` : "";
    return `${indent}<viz:color r="${String((n >> 16) & 255)}" g="${String((n >> 8) & 255)}" b="${String(n & 255)}"${a}/>\n`;
}

/**
 * A `<viz:shape>` element.
 * @param shape - the GEXF shape, or null
 * @param uri - the picture of an `image` shape, or null
 * @param indent - the indentation
 * @returns the element, "" without a shape
 */
function shapeElement(shape: string | null, uri: string | null, indent: string): string {
    if (shape === null) {
        return "";
    }
    return uri === null
        ? `${indent}<viz:shape value="${shape}"/>\n`
        : `${indent}<viz:shape value="${shape}" uri="${escapeXml(uri)}"/>\n`;
}

/**
 * Text as XML character data or an attribute value.
 * @param text - the text
 * @returns the escaped text
 */
function escapeXml(text: string): string {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
