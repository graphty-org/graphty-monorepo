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
import { StyleApproximations } from "../../styles/io/approximations.js";
import { blockStyles, parseStyleBlock, STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell, resolveStyles } from "../../styles/plan/resolve.js";
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
import { VIZ_NAMESPACE } from "./schema.js";

/**
 * The XML namespace of graphty's own elements in a GEXF file (the `graphty.styles` block inside `<meta>`).
 * @category Built-in formats
 */
export const GRAPHTY_XML_NAMESPACE = "https://graphty.app/ns/gexf";

/**
 * What the GEXF writer holds natively: the viz module's color (with its alpha), size, shape and thickness, and the
 * edge line shape. The block goes into `<meta>`.
 * @category Built-in formats
 */
export const GEXF_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    node: Object.freeze(["fill", "fillOpacity", "width", "height", "shape", "image"] as const),
    edge: Object.freeze(["color", "opacity", "width", "lineStyle"] as const),
    block: "native",
});

/** Gephi's node fill when a node has no `viz:color` (graphstore NodeImpl), which its edges then take. */
const GEPHI_NODE_FILL = "#000000";

/** The style column marking directed edges, which Gephi draws with an arrow at the target. */
const DIRECTED_KEY = "directed";

/** The style column holding the source node's color of each edge without a color of its own. */
const SOURCE_COLOR_KEY = "source-color";
/** The style column of the width Gephi draws an edge with from its weight. */
const WEIGHT_WIDTH_KEY = "weight-width";

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
 * One target's canonical values from its viz columns.
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
    for (let i = 0; i < n; i++) {
        if (color !== null) {
            readVizColor(viz, color, i);
        }
        if (size !== null) {
            readVizSize(viz, size, i);
        }
        // GEXF gives a shape a uri only to name the picture of an `image` shape
        if (shape !== null && readVizShape(viz, shape, i) && uri !== null) {
            const v = plainCell(table.value(uri, i));
            if (typeof v === "string" && v.length > 0) {
                viz.column("image")[i] = v;
            }
        }
    }
    return out;
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
 * Reads one element's viz size (a node's width and height) or thickness (an edge's width).
 * @param viz - the target's reading
 * @param size - the viz size or thickness column
 * @param i - the element
 */
function readVizSize(viz: VizRead, size: string, i: number): void {
    const v = canonNumber(plainCell(viz.table.value(size, i)), viz.site(i, "width"));
    if (v !== null) {
        viz.column("width")[i] = v;
        if (viz.target === "node") {
            viz.column("height")[i] = v;
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

/**
 * The rules Gephi's defaults make per element: an arrow at the target of every directed edge, the source node's
 * color on every edge without a color of its own, and the edge's weight as the thickness of every edge without a
 * thickness of its own (Gephi draws GEXF and its GraphML export the same way).
 * @param snapshot - the graph
 * @param nodeFill - each node's fill, or undefined when no node has one
 * @param edgeColor - each edge's own color, or undefined when no edge has one
 * @param budget - the work budget
 * @param edgeWidth - each edge's own width, or undefined when no edge has one
 * @returns the edge rules and the style columns they read
 */
export function gephiRules(
    snapshot: GraphSnapshot,
    nodeFill: readonly (StyleValue | null)[] | undefined,
    edgeColor: readonly (StyleValue | null)[] | undefined,
    budget: StyleReadContext["budget"],
    edgeWidth?: readonly (StyleValue | null)[],
): { readonly rules: StyleRule[]; readonly columns: Map<string, StyleColumn> } {
    const rules: StyleRule[] = [];
    const columns = new Map<string, StyleColumn>();
    const directed = directedEdges(snapshot);
    if (directed.some(Boolean)) {
        columns.set(
            DIRECTED_KEY,
            directed.map((d) => (d ? true : null)),
        );
        rules.push({
            id: "edge.tool.arrow",
            target: "edge",
            role: "group",
            origin: "tool",
            where: { has: { style: DIRECTED_KEY } },
            set: { targetArrow: "triangle" },
        });
    }
    // Gephi draws an edge without a color in its source node's color. graphty-element cannot bind an edge's color
    // to its source node's drawn color yet, so the color is frozen here; replace this column with that binding once
    // the element has it (tracking issue "graphty-element: bind an edge's color to its source node's drawn color").
    // An undirected edge in a directed graph is one edge in the file and two halves here: Gephi draws it once, in
    // the color of the source the file names, so the second half takes the first half's source.
    const first = firstHalf(snapshot);
    const sourceColor = withoutOwn(
        edgeColor,
        snapshot.edgeCount,
        (e) => nodeFill?.[snapshot.edgeSource(first(e))] ?? GEPHI_NODE_FILL,
    );
    const uncolored = sourceColor.filter((v) => v !== null).length;
    budget.spend("edge", snapshot.edgeCount);
    // Gephi draws an edge as thick as its weight (1 for an edge with none); a width of its own is the file's
    // The weights come from the snapshot's own weights (the role column exists only when some edge has none), read
    // as the shortest decimal of their dtype. A weight of 0 or below is drawn 1 wide, so the edge stays visible.
    const weights = explicitWeights(snapshot);
    const weightWidth = withoutOwn(edgeWidth, snapshot.edgeCount, (e) => {
        const w = Number(weights.text(first(e)) ?? 1);
        return Number.isFinite(w) && w > 0 ? w : 1;
    });
    const unsized = weightWidth.filter((v) => v !== null).length;
    if (unsized > 0) {
        columns.set(WEIGHT_WIDTH_KEY, weightWidth);
        rules.push({
            id: "edge.tool.weight-width",
            target: "edge",
            role: "passthrough",
            origin: "tool",
            where: { has: { style: WEIGHT_WIDTH_KEY } },
            map: { width: { kind: "passthrough", by: { style: WEIGHT_WIDTH_KEY } } },
            facts: { elements: unsized, reason: "EDGE_WEIGHT" },
        });
    }
    if (uncolored > 0) {
        columns.set(SOURCE_COLOR_KEY, sourceColor);
        rules.push({
            id: "edge.tool.source-color",
            target: "edge",
            role: "passthrough",
            origin: "tool",
            where: { has: { style: SOURCE_COLOR_KEY } },
            map: { color: { kind: "passthrough", by: { style: SOURCE_COLOR_KEY } } },
            facts: { elements: uncolored, reason: "SOURCE_NODE_COLOR" },
        });
    }
    return { rules, columns };
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
 * The styles of a GEXF file: each element's viz values as Gephi draws them, Gephi's defaults beneath (black size-10
 * discs, no label rule), an arrow at the target of every directed edge, and the source node's color on every edge
 * without a color of its own; plus a `graphty.styles` block the file holds in `<meta>`.
 * @param snapshot - the graph the import built
 * @param context - the work budget and the block text the import kept
 * @returns the styles
 */
export function gexfStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const node = vizValues(snapshot, "node", notes, context);
    const edge = vizValues(snapshot, "edge", notes, context);
    const block = typeof context.kept === "string" ? context.kept : null;
    if (block !== null) {
        exactFromBlock(snapshot, block, node, edge);
    }
    const { rules, columns } = gephiRules(snapshot, node.fill, edge.color, context.budget, edge.width);
    return {
        canonical: true,
        dialect: "gexf",
        tool: "gephi",
        units: "relative",
        node: { values: node },
        edge: { values: edge, rules, columns },
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
    const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
    const ex = parsed.ok ? blockStyles(parsed.block, snapshot, "gexf") : null;
    if (ex === null) {
        return;
    }
    const exact = (
        values: Record<string, (StyleValue | null)[]>,
        target: StyleTarget,
        property: string,
        written: (v: StyleValue, i: number) => StyleValue | null,
    ): void => {
        const native = values[property];
        if (native === undefined) {
            return;
        }
        const want = resolveStyles(ex, target, property as never, snapshot);
        for (let i = 0; i < native.length; i++) {
            const w = want[i];
            // a size is written from the width and the height together: one the block leaves unset reads back too
            const writable = w !== null || property === "width" || property === "height";
            if (writable && native[i] !== w && native[i] !== null && native[i] === written(w as StyleValue, i)) {
                native[i] = w;
            }
        }
    };
    const width = resolveStyles(ex, "node", "width", snapshot);
    const height = resolveStyles(ex, "node", "height", snapshot);
    const size = (i: number): StyleValue | null => {
        const w = width[i];
        const h = height[i];
        return typeof w === "number" && typeof h === "number" ? Math.max(w, h) : (w ?? h);
    };
    const read = new Map([
        ["disc", "ellipse"],
        ["square", "rectangle"],
    ]);
    exact(node, "node", "shape", (v) => {
        const written = gexfNodeShape(String(v)).value;
        return read.get(written) ?? written;
    });
    exact(edge, "edge", "lineStyle", (v) => gexfEdgeShape(String(v)).value);
    exact(node, "node", "width", (_v, i) => size(i));
    exact(node, "node", "height", (_v, i) => size(i));
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
                (size === null ? "" : `${indent}<viz:size value="${String(size)}"/>\n`) +
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
 * The snapshot to write: the viz columns the styles replace removed, the tagged style values added.
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
