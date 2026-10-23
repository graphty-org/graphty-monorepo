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
import { DIALOG_LINE_HEIGHT, dialogWidth } from "./dialog-metrics.js";
import { dependantColor, drawnLabels, edgeThickness, type GephiFont, GephiPreview } from "./preview.js";
import { NODE_COLUMNS, TEMPORAL_COLUMNS, temporalTableName, VIZ_NAMESPACE } from "./schema.js";

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
    tool: "gephi",
    node: Object.freeze(["label", "fill", "fillOpacity", "width", "height", "shape", "image"] as const),
    edge: Object.freeze(["color", "opacity", "width", "lineStyle"] as const),
    block: "native",
});

/** Gephi's node fill when a node has no `viz:color` (graphstore NodeImpl), which its edges then take. */
const GEPHI_NODE_FILL = "#000000";

/** The style column marking directed edges, which Gephi draws with an arrow at the target. */
const DIRECTED_KEY = "directed";

/** The style column marking the nodes whose labels Gephi hides where they overlap (node.label.avoidOverlap). */
const AVOID_OVERLAP_KEY = "label-avoid-overlap";

/** The style column marking the edges Gephi does not draw (dropped, or merged into a parallel edge). */
const HIDDEN_KEY = "gephi-hidden";

/** The style column holding the mix of its end nodes' colors of each edge without a color of its own. */
const MIXED_COLOR_KEY = "end-colors";
/** The width property and the style column of the width Gephi draws an edge with from its weight. */
const WEIGHT_WIDTH = ["width", "weight-width"] as const;
/** Gephi's node width when a node has no `viz:size` (graphstore NodeImpl size 10, a radius). */
const GEPHI_NODE_WIDTH = 20;
/** How much thicker than its weight Gephi draws a self-loop. */
const SELF_LOOP_THICKNESS = 1.3;

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
 * A `viz:color` `hex` value as channels: r, g and b 0..255 and an alpha 0..1, read the way Gephi reads it: Java's
 * `Color.decode`, which parses the text as one integer (`Integer.decode`: `#` or `0x` hexadecimal, a leading `0`
 * octal, otherwise decimal; a leading sign allowed) and keeps its low 24 bits, opaque. So `#rrggbb` is the color it
 * names, but `#f80` is `#000f80`, `#4daf4a80` is `#af4a80` and `984ea3` is not a color at all (Gephi draws that node
 * as if it had no color: `gexf-specimen-node-fills-borders`, `color-hex-short`, `color-hex-alpha`, `color-hex-nohash`).
 * @param hex - the attribute's value
 * @returns `[r, g, b, 1]`, or null when Java cannot read it as an int
 */
export function canonVizColor(hex: string): [number, number, number, number] | null {
    const m = /^([+-]?)(?:(0x|0X|#)([0-9a-fA-F]+)|(0[0-7]+)|(\d+))$/.exec(hex.trim());
    if (m === null) {
        return null;
    }
    const [, sign, , hexDigits, octal, decimal] = m;
    let v: number;
    if (hexDigits !== undefined) {
        v = Number.parseInt(hexDigits, 16);
    } else if (octal !== undefined) {
        v = Number.parseInt(octal, 8);
    } else {
        v = Number.parseInt(decimal, 10);
    }
    if (sign === "-") {
        v = -v;
    }
    // Integer.decode accepts -2^31 .. 2^31 - 1 only
    if (v < -2147483648 || v > 2147483647) {
        return null;
    }
    const n = v & 0xffffff;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
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
    // Gephi draws a node of viz:size 0 at its default size 10 (gexf-specimen-node-sizes-opacity, size-0)
    if (v !== null && !(v === 0 && viz.target === "node")) {
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

/** What Gephi draws of each edge (gephiEdges()). */
interface GephiDrawnEdges {
    /** Whether Gephi draws the edge directed, with an arrow at its target. */
    readonly directed: boolean[];
    /** Whether Gephi does not draw the edge at all. */
    readonly hidden: boolean[];
    /** The weight Gephi draws the edge with: merged, then shifted. */
    readonly weight: number[];
}

/**
 * The edges as Gephi's importer and preview draw them (measured with the Gephi Toolkit 0.11.3:
 * `gexf-specimen-edges-lines`, `-p13`, `-p15`, `gexf-specimen-arrows`, `-p6`, `-p7`):
 * - an edge whose own type is against the graph's `defaultedgetype` is dropped (`undirected` in a `directed`
 *   graph, `directed` in an `undirected` one); a `mutual` graph, or one with no `defaultedgetype`, keeps every
 *   edge, an untyped or `mutual` one directed;
 * - edges of one kind between the same ends (either way round for an undirected edge) are merged into the first,
 *   whose weight is their sum;
 * - an edge's weight is its `weight` (1 when it has none), or, when an edge attribute named weight is dynamic, its
 *   value over the earliest interval (0 when it has none);
 * - when the smallest weight drawn is 0 or less, every weight is raised by |smallest| + 1.
 * An undirected edge of a directed snapshot is two halves here; both take what its first half gets.
 * @param snapshot - the graph
 * @param gexf - whether the file is a GEXF; another format keeps its own direction, with nothing merged or dropped
 * @returns per edge, what Gephi draws
 */
function gephiEdges(snapshot: GraphSnapshot, gexf: boolean): GephiDrawnEdges {
    const n = snapshot.edgeCount;
    const first = firstHalf(snapshot);
    // another format Gephi draws: its own direction, nothing merged or dropped
    if (!gexf) {
        return otherFormatEdges(snapshot);
    }
    const header = gexfDefaultEdgeType(snapshot);
    const dirCol = snapshot.edges.byRole("directed");
    const mutualCol = snapshot.edges.byRole("mutual");
    const kindCol = snapshot.edges.byRole("kind");
    const weightOf = gephiWeight(snapshot);
    const out: GephiDrawnEdges = {
        directed: new Array<boolean>(n).fill(false),
        hidden: new Array<boolean>(n).fill(false),
        weight: new Array<number>(n).fill(1),
    };
    const leaders = new Map<string, number>();
    const drawnLeaders: number[] = [];
    const ownDirection = gexfOwnDirection(header, dirCol, mutualCol);
    for (let e = 0; e < n; e++) {
        const f = first(e);
        if (f !== e) {
            continue;
        }
        // the edge's own type: graph-io records it only when the file mixes directions
        const { ownUndirected, mismatched } = ownDirection(f);
        if (mismatched) {
            out.hidden[f] = true;
            continue;
        }
        // Gephi draws no arrowhead on a self-loop
        const s = snapshot.edgeSource(f);
        const t = snapshot.edgeTarget(f);
        const directed = header !== "undirected" && s !== t && !ownUndirected;
        out.directed[f] = directed;
        const kind = kindCol?.isSet(f) === true ? String(kindCol.value(f)) : "";
        const key = `${kind}\u0000${gephiEndsKey(s, t, directed)}`;
        const leader = leaders.get(key);
        if (leader === undefined) {
            leaders.set(key, f);
            drawnLeaders.push(f);
            out.weight[f] = weightOf(f);
        } else {
            out.weight[leader] += weightOf(f);
            out.hidden[f] = true;
        }
    }
    // a loop, not Math.min(...): a spread of every edge overflows the call stack on a large graph
    const smallest = drawnLeaders.reduce((m, f) => Math.min(m, out.weight[f]), Infinity);
    const shift = smallest <= 0 ? 1 - smallest : 0;
    for (let e = 0; e < n; e++) {
        const f = first(e);
        out.directed[e] = out.directed[f];
        out.hidden[e] = out.hidden[f];
        out.weight[e] = out.weight[f] + shift;
    }
    return out;
}

/**
 * The ends of an edge as the key Gephi merges parallel edges by: in order for a directed edge, either way round
 * for an undirected one.
 * @param s - the source node index
 * @param t - the target node index
 * @param directed - whether the edge is drawn directed
 * @returns the key
 */
function gephiEndsKey(s: number, t: number, directed: boolean): string {
    return directed ? `${String(s)}>${String(t)}` : `${String(Math.min(s, t))}-${String(Math.max(s, t))}`;
}

/**
 * A GEXF edge's own type, read from the directed and mutual columns, or from the header when the file did not
 * mix directions (no directed column); an edge whose own type disagrees with the header's is one Gephi never loads.
 * @param header - the file's default edge type
 * @param dirCol - the directed column, or null
 * @param mutualCol - the mutual column, or null
 * @returns per edge index, whether its own type is undirected and whether it disagrees with the header
 */
function gexfOwnDirection(
    header: ReturnType<typeof gexfDefaultEdgeType>,
    dirCol: ReturnType<GraphSnapshot["edges"]["byRole"]>,
    mutualCol: ReturnType<GraphSnapshot["edges"]["byRole"]>,
): (f: number) => { ownUndirected: boolean; mismatched: boolean } {
    const verdict = (
        ownUndirected: boolean,
        ownDirected: boolean,
    ): { ownUndirected: boolean; mismatched: boolean } => ({
        ownUndirected,
        mismatched: (header === "directed" && ownUndirected) || (header === "undirected" && ownDirected),
    });
    return (f) => {
        if (dirCol === null) {
            return verdict(header === "undirected", header !== "undirected");
        }
        const mutual = mutualCol?.value(f) === true;
        return verdict(dirCol.value(f) === false && !mutual, dirCol.value(f) === true && !mutual);
    };
}

/**
 * The edges of a format other than GEXF as Gephi draws them: each in its own direction, as thick as its weight (1
 * for a weight of 0 or below, so the edge stays visible).
 * @param snapshot - the graph
 * @returns per edge, what Gephi draws
 */
function otherFormatEdges(snapshot: GraphSnapshot): GephiDrawnEdges {
    const first = firstHalf(snapshot);
    const weightOf = gephiWeight(snapshot);
    const directed = new Array<boolean>(snapshot.edgeCount).fill(snapshot.directed);
    const col = snapshot.directed ? snapshot.edges.byRole("directed") : null;
    const weight: number[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (col !== null) {
            directed[e] = plainCell(col.value(e)) !== false;
        }
        const w = weightOf(first(e));
        weight.push(w > 0 ? w : 1);
    }
    return { directed, hidden: directed.map(() => false), weight };
}

/**
 * The graph's `defaultedgetype` as written, lower case, or null when it wrote none.
 * @param snapshot - the graph
 * @returns the keyword
 */
function gexfDefaultEdgeType(snapshot: GraphSnapshot): string | null {
    const written = (snapshot.meta.extra.gexf as { defaultedgetype?: unknown } | undefined)?.defaultedgetype;
    return typeof written === "string" ? written.trim().toLowerCase() : null;
}

/**
 * Each edge's weight as Gephi reads it: an edge attribute whose id or title is `weight` and is dynamic is the weight,
 * at its value over the earliest interval (0 for an edge without one: its static `weight` is not read); otherwise
 * the edge's `weight`, 1 for an edge with none.
 * @param snapshot - the graph
 * @returns the weight of an edge
 */
function gephiWeight(snapshot: GraphSnapshot): (e: number) => number {
    const isWeight = (v: unknown): boolean => typeof v === "string" && v.toLowerCase() === "weight";
    const dynamic = snapshot.edges
        .names()
        .map((name) => snapshot.edges.get(name))
        .find(
            (c) =>
                c !== null && c.meta.dynamic && [c.meta.name, c.meta.origin?.id, c.meta.origin?.title].some(isWeight),
        );
    const table =
        dynamic === undefined || dynamic === null
            ? undefined
            : snapshot.extensions.get(temporalTableName("edge", dynamic.meta.name));
    if (table !== undefined) {
        const element = table.get(TEMPORAL_COLUMNS.element);
        const start = table.get(TEMPORAL_COLUMNS.start);
        const value = table.get(TEMPORAL_COLUMNS.value);
        const earliest = new Map<number, { start: number; value: number }>();
        for (let row = 0; element !== null && value !== null && row < table.rowCount; row++) {
            const e = element.value(row) as number;
            const at = start?.isSet(row) === true ? (start.value(row) as number) : -Infinity;
            const v = Number(value.value(row));
            const seen = earliest.get(e);
            if (Number.isFinite(v) && (seen === undefined || at < seen.start)) {
                earliest.set(e, { start: at, value: v });
            }
        }
        return (e) => earliest.get(e)?.value ?? 0;
    }
    // the snapshot's own weights (the role column exists only when some edge has none), as their shortest decimal
    const weights = explicitWeights(snapshot);
    return (e) => {
        const w = Number(weights.text(e) ?? 1);
        return Number.isFinite(w) ? w : 1;
    };
}

/** The node values Gephi's per-element defaults are worked out from, each undefined when no node has one. */
interface GephiNodeValues {
    /** Each node's fill. */
    readonly fill?: readonly (StyleValue | null)[];
    /** Each node's fill opacity (the alpha of its color), null for opaque. */
    readonly fillOpacity?: readonly (StyleValue | null)[];
    /** Each node's width, twice its Gephi size. */
    readonly width?: readonly (StyleValue | null)[];
}

/** The edge values Gephi's per-element defaults give way to, each undefined when no edge has one. */
interface GephiEdgeValues {
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

/** What a GEXF drawing adds to gephiRules(): the file is a GEXF, drawn under these Preview settings. */
interface GephiDrawing {
    /** The Preview settings, Gephi's defaults where none is given. */
    readonly preview: GephiPreview;
    /** Each edge's own viz color and its alpha, which `edge.color=original` draws. */
    readonly original?: {
        readonly color?: readonly (StyleValue | null)[];
        readonly opacity?: readonly (StyleValue | null)[];
    };
    /** Each edge's label, drawn under `edge.label.show`. */
    readonly edgeLabels?: readonly (StyleValue | null)[];
    /** Whether the node labels Gephi's overlap avoidance hides are already left out (gephiOverlapHidden()). */
    readonly overlapSettled?: boolean;
}

/**
 * A tool rule that sets the same values on every element.
 * @param out - the target's rules, changed in place
 * @param target - nodes or edges
 * @param id - the rule's id after `<target>.tool.`
 * @param set - the values
 */
function everyElement(out: GephiTargetRules, target: StyleTarget, id: string, set: Record<string, StyleValue>): void {
    if (Object.keys(set).length > 0) {
        out.rules.push({
            id: `${target}.tool.${id}`,
            target,
            role: "group",
            origin: "tool",
            where: { all: true },
            set,
        });
    }
}

/**
 * The rules Gephi's preview defaults (DefaultPreset) make per element, as its SVG export draws every GEXF and GraphML
 * file: each node outlined in a darker shade of its fill, 0.08 of its width wide, with its label 0.3 of its width
 * tall; each edge in the mix of its two end nodes' colors and alphas, as thick as its weight, with an arrow at the
 * target of a directed edge. An element's own value is kept (a file graphty wrote states every one). A GEXF drawing
 * also merges and drops edges as Gephi's importer does (gephiEdges()) and follows the Preview settings it was drawn
 * with.
 * @param snapshot - the graph
 * @param nodes - each node's fill, opacity and width
 * @param edges - each edge's own color and width
 * @param budget - the work budget
 * @param gexf - the GEXF drawing, or undefined for another format Gephi draws
 * @returns the node and edge rules and the style columns they read
 */
export function gephiRules(
    snapshot: GraphSnapshot,
    nodes: GephiNodeValues,
    edges: GephiEdgeValues,
    budget: StyleReadContext["budget"],
    gexf?: GephiDrawing,
): { readonly node: GephiTargetRules; readonly edge: GephiTargetRules } {
    const preview = gexf?.preview ?? new GephiPreview();
    const node: GephiTargetRules = { rules: [], columns: new Map() };
    const edge: GephiTargetRules = { rules: [], columns: new Map() };
    budget.spend("node", snapshot.nodeCount);
    budget.spend("edge", snapshot.edgeCount);
    const channels = Array.from({ length: snapshot.nodeCount }, (_, i) =>
        nodeChannels(nodes.fill?.[i], nodes.fillOpacity?.[i]),
    );
    const labelSizes = nodeRules(node, snapshot, channels, nodes, preview);
    edgeRules(edge, snapshot, channels, nodes, edges, gexf, preview);
    nodeLabelRules(node, channels, labelSizes, preview, gexf?.overlapSettled === true);
    labelBox(node, channels, nodes, preview);
    return { node, edge };
}

/**
 * A node's width, twice its Gephi size.
 * @param nodes - the node values
 * @param i - the node
 * @returns the width
 */
function nodeWidth(nodes: GephiNodeValues, i: number): number {
    const w = nodes.width?.[i];
    return typeof w === "number" ? w : GEPHI_NODE_WIDTH;
}

/**
 * The node rules: opacity, border and label size.
 * @param node - the node rules, changed in place
 * @param snapshot - the graph
 * @param channels - each node's color channels
 * @param nodes - the node values
 * @param preview - the settings
 * @returns each node's label size
 */
function nodeRules(
    node: GephiTargetRules,
    snapshot: GraphSnapshot,
    channels: readonly number[][],
    nodes: GephiNodeValues,
    preview: GephiPreview,
): number[] {
    const nodeIndices = Array.from({ length: snapshot.nodeCount }, (_, i) => i);
    // a node's alpha is drawn only under node.per.node.opacity, times node.opacity, on its fill and its border alike:
    // a node not opaque is a fill of radius 0.84 s and a separate ring out to s, both at that alpha
    const perNode = preview.on("node.per.node.opacity");
    const alpha = channels.map((c) => ((perNode ? c[3] : 255) / 255) * (preview.num("node.opacity") / 100));
    const translucent = alpha.map((a) => (a < 1 ? a : null));
    perElementDefault(node, "node", ["fillOpacity", "preview-opacity"], translucent, "NODE_OPACITY");
    perElementDefault(node, "node", ["borderOpacity", "preview-border-opacity"], translucent, "NODE_OPACITY");
    // NodeRenderer: the border is DependantColor DARKER by default, half of each channel (+-1 from Gephi's float math)
    const borderMode = preview.text("node.border.color");
    perElementDefault(
        node,
        "node",
        ["borderColor", "border-shade"],
        channels.map((c) => hexOf(dependantColor(borderMode, c) ?? c.map((v) => Math.floor(v / 2)))),
        "NODE_FILL_SHADE",
    );
    // A node of size s is a circle of radius 0.92 s with a 0.16 s border: 0.08 of its 2 s width, or node.border.width
    // under node.border.fixed. Its label is the label font's size in proportion to the node's, round(size / 20 * s)
    // (NODE_LABEL_PROPORTIONAL_SIZE; Arial 12 makes round(0.6 s)), never under 1.
    const fixed = preview.on("node.border.fixed") ? preview.num("node.border.width") : null;
    perElementDefault(
        node,
        "node",
        ["borderWidth", "size-border"],
        nodeIndices.map((i) => {
            // a fixed border is no wider than the node's size (radius): a size-3 node takes a border of 4 as 3
            return fixed === null ? 0.08 * nodeWidth(nodes, i) : Math.min(fixed, nodeWidth(nodes, i) / 2);
        }),
        "NODE_SIZE",
    );
    const font = preview.font("node");
    const labelSizes = nodeIndices.map((i) =>
        preview.on("node.label.proportinalSize")
            ? Math.max(1, Math.round((font.size / 40) * nodeWidth(nodes, i)))
            : font.size,
    );
    perElementDefault(node, "node", ["labelSize", "size-label"], labelSizes, "NODE_SIZE");
    return labelSizes;
}

/**
 * The node label rules the Preview settings make beyond the size: color, outline, font and overlap avoidance.
 * @param node - the node rules, changed in place
 * @param channels - each node's color channels
 * @param sizes - each node's label size
 * @param preview - the settings
 * @param settled - whether the labels overlap avoidance hides are already left out
 */
function nodeLabelRules(
    node: GephiTargetRules,
    channels: readonly number[][],
    sizes: readonly number[],
    preview: GephiPreview,
    settled: boolean,
): void {
    const color = preview.text("node.label.color");
    if (color !== "#000000" && color !== "original") {
        perElementDefault(
            node,
            "node",
            ["labelColor", "preview-label-color"],
            channels.map((c) => hexOf(dependantColor(color, c) ?? [0, 0, 0])),
            "NODE_LABEL_COLOR",
        );
    }
    labelOutline(node, "node", channels, sizes, preview);
    const font = preview.font("node");
    everyElement(node, "node", "preview-label", fontValues(font, preview.on("node.label.customFont")));
    // ponytail: where a node has no stored position Gephi's own grid (gephiOverlapHidden()) cannot be run; avoiding
    // overlap, larger first, is that test without the grid's rounding. A rule only while it is on: graphty-element
    // has no value that turns a lower rule's overlap avoidance off again.
    if (preview.on("node.label.avoidOverlap") && !settled) {
        node.columns.set(
            AVOID_OVERLAP_KEY,
            sizes.map(() => true),
        );
        node.rules.push({
            id: "node.tool.label-avoid-overlap",
            target: "node",
            role: "group",
            origin: "tool",
            where: { has: { style: AVOID_OVERLAP_KEY } },
            set: { labelAvoidOverlap: true },
        });
    }
}

/**
 * Gephi's alpha for a Preview opacity in percent: Java's `Color` keeps it as one of 256 steps, cut down to a whole
 * step (`labels-p10`'s 30 is drawn 76 / 255, not 77).
 * @param percent - the opacity, 0 to 100
 * @returns the alpha, 0 to 1
 */
function gephiAlpha(percent: number): number {
    // ponytail: 1e-9 keeps a step that floating point lands a hair under (0.4 x 255) on its step
    return Math.floor((Math.min(Math.max(percent, 0), 100) / 100) * 255 + 1e-9) / 255;
}

/**
 * The label box of `node.label.box`: Gephi strokes an unfilled box round the label, 0.08 of the node's size wide, in
 * the color `node.label.box.color` derives from the node's and at `node.label.box.opacity` (`gexf-specimen-labels-p11`,
 * `-p12`, `-p13`, `-p20`, `-p21`). The box is the text's own bounds -- its advance width and its font's ascent plus
 * descent, with no leading -- grown by the stroke's width, so the stroke's inner edge lies on the text's bounds
 * (`labels-p11`: a 15 px "Label" is 40.47 x 17.46 inside a 2.0 stroke): no padding, a line height of 1.
 * @param node - the node rules, changed in place
 * @param channels - each node's color channels
 * @param nodes - the node values
 * @param preview - the settings
 */
function labelBox(
    node: GephiTargetRules,
    channels: readonly number[][],
    nodes: GephiNodeValues,
    preview: GephiPreview,
): void {
    if (!preview.on("node.label.box")) {
        return;
    }
    const mode = preview.text("node.label.box.color");
    perElementDefault(
        node,
        "node",
        ["labelBorderColor", "preview-box-color"],
        channels.map((c) => hexOf(dependantColor(mode, c) ?? c)),
        "LABEL_BOX",
    );
    perElementDefault(
        node,
        "node",
        ["labelBorderWidth", "preview-box-width"],
        channels.map((_, i) => 0.04 * nodeWidth(nodes, i)),
        "LABEL_BOX",
    );
    everyElement(node, "node", "preview-box", {
        labelBorderOpacity: gephiAlpha(preview.num("node.label.box.opacity")),
        labelPadding: 0,
        labelLineHeight: 1,
    });
}

/**
 * The label font values a custom font sets.
 * @param font - the font
 * @param custom - whether the font is custom
 * @returns the values
 */
function fontValues(font: GephiFont, custom: boolean): Record<string, StyleValue> {
    if (!custom) {
        return {};
    }
    return {
        labelFont: font.family,
        ...(font.bold ? { labelWeight: "bold" } : {}),
        ...(font.italic ? { labelItalic: true } : {}),
    };
}

/**
 * The label outline of `<target>.label.outline.size` and `.color`: a stroke size / 32 of the label's size wide, round
 * each letter, in the color its mode derives from the element's color and at `.outline.opacity` (Gephi's default 80;
 * `gexf-specimen-labels-p9`, `-p10`, `-p17` .. `-p19`, `edge-labels-p5`, `-p6`).
 * @param out - the rules, changed in place
 * @param target - nodes or edges
 * @param colors - each element's color channels
 * @param sizes - each element's label size
 * @param preview - the settings
 */
function labelOutline(
    out: GephiTargetRules,
    target: StyleTarget,
    colors: readonly number[][],
    sizes: readonly number[],
    preview: GephiPreview,
): void {
    const size = preview.num(`${target}.label.outline.size`);
    if (size <= 0) {
        return;
    }
    const mode = preview.text(`${target}.label.outline.color`);
    perElementDefault(
        out,
        target,
        ["labelOutlineWidth", "preview-outline-width"],
        sizes.map((s) => (size / 32) * s),
        "LABEL_OUTLINE",
    );
    perElementDefault(
        out,
        target,
        ["labelOutlineColor", "preview-outline-color"],
        colors.map((c) => hexOf(dependantColor(mode, c) ?? [255, 255, 255])),
        "LABEL_OUTLINE",
    );
    everyElement(out, target, "preview-outline", {
        labelOutlineOpacity: gephiAlpha(preview.num(`${target}.label.outline.opacity`)),
    });
}

/**
 * The node labels Gephi's label overlap avoidance hides (`node.label.avoidOverlap`, Gephi 0.11
 * NodeLabelRenderer.preProcess): largest font first, each label's box -- its Dialog advance width by its line height,
 * centered on its node -- marks the cells of a `node.label.overlapGridSize` grid over the nodes' bounds, and a label
 * any of whose cells an earlier one marked is hidden. A label's font size is 12 x 0.05 x its node's size (proportional
 * size) or the font's, measured in the float size of the last label of the same whole size (Gephi's font cache),
 * its labels taken largest node first.
 * Decided where every node has a stored position; elsewhere graphty-element lays the graph out, so null.
 * @param snapshot - the graph
 * @param labels - each node's label as drawn
 * @param widths - each node's width (twice its size), or undefined for Gephi's default
 * @param preview - the settings
 * @returns whether each label is hidden, or null
 */
function gephiOverlapHidden(
    snapshot: GraphSnapshot,
    labels: readonly (StyleValue | null)[],
    widths: readonly (StyleValue | null)[] | undefined,
    preview: GephiPreview,
): boolean[] | null {
    const centers = gephiCenters(snapshot);
    if (centers.includes(null)) {
        return null;
    }
    const f = Math.fround;
    const grid = preview.num("node.label.overlapGridSize");
    const proportional = preview.on("node.label.proportinalSize");
    const base = f(preview.font("node").size * preview.num("node.label.scale"));
    const nodeSizes = centers.map((_, i) => {
        const w = widths?.[i];
        return f((typeof w === "number" ? w : GEPHI_NODE_WIDTH) / 2);
    });
    const sizes = nodeSizes.map((nodeSize) =>
        proportional ? f(f(base * nodeSize) * f(0.05)) : f(base * f(1 + f(nodeSize * f(0.00001)))),
    );
    // Gephi's label items come largest node first (file order among equals; measured on six corpus files)
    const items = sizes.map((_, i) => i).sort((a, b) => nodeSizes[b] - nodeSizes[a]);
    // Font.deriveFont(size).getSize() rounds; the cache keeps the last font of each whole size
    const cached = new Map<number, number>();
    items.forEach((i) => cached.set(Math.round(sizes[i]), sizes[i]));
    // NodeItem Y is the file's y turned over
    const at = centers.map((c) => [c?.[0] ?? 0, -(c?.[1] ?? 0)] as const);
    // loops, not Math.min(...): a spread of every node overflows the call stack on a large graph
    let [loX, loY, hiX, hiY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of at) {
        [loX, loY, hiX, hiY] = [Math.min(loX, x), Math.min(loY, y), Math.max(hiX, x), Math.max(hiY, y)];
    }
    const [minX, minY] = [loX - grid, loY - grid];
    const cols = Math.ceil((hiX + grid - minX) / grid);
    const rows = Math.ceil((hiY + grid - minY) / grid);
    const taken = new Set<number>();
    const hidden = labels.map(() => false);
    const order = [...items].sort((a, b) => sizes[b] - sizes[a]);
    for (const i of order) {
        const label = labels[i];
        if (typeof label !== "string" || label.trim() === "") {
            continue;
        }
        const size = cached.get(Math.round(sizes[i])) ?? sizes[i];
        const half = [(dialogWidth(label) * size) / 2, (DIALOG_LINE_HEIGHT * size) / 2] as const;
        const cells = gridCells(
            { min: [minX, minY], size: grid, cols, rows },
            [at[i][0] - half[0], at[i][1] - half[1]],
            [at[i][0] + half[0], at[i][1] + half[1]],
        );
        if (cells.some((k) => taken.has(k))) {
            hidden[i] = true;
        } else {
            cells.forEach((k) => taken.add(k));
        }
    }
    return hidden;
}

/**
 * The cells of a grid a box covers, as Gephi's label grid counts them (each corner's cell truncated, kept on the grid).
 * @param grid - the grid: its lowest corner, cell size and cell counts
 * @param grid.min - its lowest x and y
 * @param grid.size - its cell size
 * @param grid.cols - its columns
 * @param grid.rows - its rows
 * @param lo - the box's lowest x and y
 * @param hi - the box's highest x and y
 * @returns the cell indices, row by row
 */
function gridCells(
    grid: {
        readonly min: readonly [number, number];
        readonly size: number;
        readonly cols: number;
        readonly rows: number;
    },
    lo: readonly [number, number],
    hi: readonly [number, number],
): number[] {
    const cell = (v: number, axis: 0 | 1): number =>
        Math.min((axis === 0 ? grid.cols : grid.rows) - 1, Math.max(0, Math.trunc((v - grid.min[axis]) / grid.size)));
    const cells: number[] = [];
    for (let r = cell(lo[1], 1); r <= cell(hi[1], 1); r++) {
        for (let c = cell(lo[0], 0); c <= cell(hi[0], 0); c++) {
            cells.push(r * grid.cols + c);
        }
    }
    return cells;
}

/** Gephi's `edge.arc-curveness`: a curved edge is an arc of radius its nodes' distance over it (code only, 1.2). */
const GEPHI_ARC_CURVENESS = 1.2;

/**
 * Each node's stored center, its viz:position; null without one (graphty-element lays such a node out, where Gephi
 * would put it at (0, 0)).
 * @param snapshot - the graph
 * @returns x and y by node
 */
function gephiCenters(snapshot: GraphSnapshot): ([number, number] | null)[] {
    const position = snapshot.nodes.byRole("position");
    return Array.from({ length: snapshot.nodeCount }, (_, i) => {
        const v = position?.isSet(i) === true ? (position.value(i) as ArrayLike<number>) : null;
        return v === null ? null : [v[0] || 0, v[1] || 0];
    });
}

/**
 * The curved edges Gephi draws no line for: its arc (radius distance / 1.2) is cut back at each end by a chord as long
 * as that end's node radius (its size), plus `edge.radius`, plus at the target of a directed edge its arrowhead
 * (`arrow.size` x its thickness); where the two cuts meet or pass each other, or a cut is longer than the arc, the
 * nodes swallow the edge and no line is drawn (Gephi 0.11 EdgeRenderer.CurvedEdgeRenderer.Helper,
 * computeTruncateAngle; gexf-cns-wos: 24 edges between overlapping nodes). Its arrowhead is still drawn, unless its
 * nodes are at one place (ArrowRenderer).
 * @param snapshot - the graph
 * @param nodes - the node values (their widths)
 * @param directed - whether each edge is drawn directed
 * @param thickness - each edge's drawn thickness
 * @param preview - the settings
 * @returns for each edge, "line" when only its line is swallowed, "all" when its nodes are at one place, else null
 */
function swallowedEdges(
    snapshot: GraphSnapshot,
    nodes: GephiNodeValues,
    directed: readonly boolean[],
    thickness: readonly number[],
    preview: GephiPreview,
): ("line" | "all" | null)[] {
    const centers = gephiCenters(snapshot);
    const edgeRadius = preview.num("edge.radius");
    const arrowSize = preview.num("arrow.size");
    const arc = 2 * Math.asin(Math.min(1, GEPHI_ARC_CURVENESS / 2));
    return Array.from({ length: snapshot.edgeCount }, (_, e) => {
        const [a, b] = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
        const [pa, pb] = [centers[a], centers[b]];
        if (a === b || pa === null || pb === null) {
            return null;
        }
        const d = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
        if (d === 0) {
            return "all";
        }
        const r = d / GEPHI_ARC_CURVENESS;
        // the angle a cut of chord length c takes off the arc; past the arc's length, more than the whole arc
        const cut = (c: number): number =>
            c >= r * arc ? Infinity : 2 * Math.atan2(c / 2, Math.sqrt(r * r - (c / 2) * (c / 2)));
        const source = edgeRadius + nodeWidth(nodes, a) / 2;
        const target = edgeRadius + nodeWidth(nodes, b) / 2 + (directed[e] ? arrowSize * thickness[e] : 0);
        return cut(source) + cut(target) >= arc ? "line" : null;
    });
}

/** How many points a Gephi self-loop's circle is drawn through. */
const SELF_LOOP_STEPS = 96;

/**
 * Gephi's self-loops as bends round their node: a circle up and to the right of it, centered `r` right of and `r`
 * above the node's center, of radius `r` = half the node's size (a radius) plus a third of the loop's stroke, which is
 * 1.3 times the edge's weight (gephi PreviewPlugin EdgeRenderer, SelfLoopEdgeRenderer; measured on the GEXF specimen
 * sheets and gexf-graphology-rio: r = 0.5435 x the drawn radius + 0.33 x the stroke). The circle runs from the side
 * facing the node all the way round; its part inside the node is not drawn.
 * @param snapshot - the graph
 * @param thickness - each edge's drawn thickness
 * @param hidden - whether each edge is not drawn
 * @returns each loop's bends, as fractions of its node's half size; null for any other edge
 */
function selfLoopBends(
    snapshot: GraphSnapshot,
    thickness: readonly number[],
    hidden: readonly boolean[],
): (StyleValue | null)[] {
    const sizes = vizColumn(snapshot, "node", "size");
    const sizeOf = (n: number): number => {
        const v = sizes === null ? null : Number(plainCell(snapshot.nodes.value(sizes, n)));
        return v !== null && Number.isFinite(v) && v > 0 ? v : GEPHI_NODE_WIDTH / 2;
    };
    const fraction = (v: number): string => String(Math.round(v * 1e4) / 1e4);
    return Array.from({ length: snapshot.edgeCount }, (_, e) => {
        const n = snapshot.edgeSource(e);
        if (n !== snapshot.edgeTarget(e) || hidden[e]) {
            return null;
        }
        const size = sizeOf(n);
        const r = (0.5 * size + 0.33 * SELF_LOOP_THICKNESS * thickness[e]) / size;
        const points: string[] = [];
        for (let k = 0; k <= SELF_LOOP_STEPS; k++) {
            // from the point facing the node's center (225 degrees), clockwise all the way round
            const a = (5 * Math.PI) / 4 - (2 * Math.PI * k) / SELF_LOOP_STEPS;
            points.push(`${fraction(r + r * Math.cos(a))},${fraction(r + r * Math.sin(a))}`);
        }
        return points.join(" ");
    });
}

/**
 * The edge rules: arrows, thickness, the edges not drawn, color and opacity, curves and labels.
 * @param edge - the edge rules, changed in place
 * @param snapshot - the graph
 * @param channels - each node's color channels
 * @param nodes - the node values (their widths)
 * @param edges - each edge's own color and width
 * @param gexf - the GEXF drawing, or undefined
 * @param preview - the settings
 */
function edgeRules(
    edge: GephiTargetRules,
    snapshot: GraphSnapshot,
    channels: readonly number[][],
    nodes: GephiNodeValues,
    edges: GephiEdgeValues,
    gexf: GephiDrawing | undefined,
    preview: GephiPreview,
): void {
    const drawn = gephiEdges(snapshot, gexf !== undefined);
    const arrowSize = preview.num("arrow.size");
    if (drawn.directed.some(Boolean) && arrowSize > 0) {
        edge.columns.set(
            DIRECTED_KEY,
            drawn.directed.map((d) => (d ? true : null)),
        );
        // arrow.size scales the arrowhead from its default 3 (gexf-specimen-arrows-p2); 0 draws none (-p3)
        edge.rules.push({
            id: "edge.tool.arrow",
            target: "edge",
            role: "group",
            origin: "tool",
            where: { has: { style: DIRECTED_KEY } },
            set: { targetArrow: "triangle", ...(arrowSize === 3 ? {} : { arrowSize: arrowSize / 3 }) },
        });
    }
    // Gephi draws an edge as thick as its weight (gephiEdges(): merged and shifted); a width of its own is the file's
    const hidden = preview.on("edge.show") ? drawn.hidden : drawn.hidden.map(() => true);
    const thickness = edgeThickness(
        drawn.weight,
        hidden.map((h) => !h),
        preview,
    );
    perElementDefault(
        edge,
        "edge",
        WEIGHT_WIDTH,
        // Gephi's self-loop is 1.3 times as thick (measured: weight 1 draws 1.3, 3.25 draws 4.225)
        withoutOwn(edges.width, snapshot.edgeCount, (e) =>
            snapshot.edgeSource(e) === snapshot.edgeTarget(e) ? SELF_LOOP_THICKNESS * thickness[e] : thickness[e],
        ),
        "EDGE_WEIGHT",
    );
    perElementDefault(edge, "edge", ["bends", "self-loop"], selfLoopBends(snapshot, thickness, hidden), "NODE_SIZE");
    // a curved edge its nodes (and its arrowhead) swallow draws no line; its arrowhead is still drawn
    const swallowed = preview.on("edge.curved")
        ? swallowedEdges(snapshot, nodes, drawn.directed, thickness, preview)
        : hidden.map(() => null);
    // the edges Gephi does not draw: one of another direction than the graph's, one merged into a parallel edge, or a
    // swallowed one with no arrowhead to keep
    hidden.forEach((h, e) => {
        const arrow = drawn.directed[e] && arrowSize > 0 && swallowed[e] === "line";
        hidden[e] = h || (swallowed[e] !== null && !arrow);
    });
    if (hidden.some(Boolean)) {
        edge.columns.set(
            HIDDEN_KEY,
            hidden.map((h) => (h ? true : null)),
        );
        edge.rules.push({
            id: "edge.tool.gephi-hidden",
            target: "edge",
            role: "group",
            origin: "tool",
            where: { has: { style: HIDDEN_KEY } },
            set: { visible: false },
        });
    }
    const colors = edgeColors(snapshot, channels, gexf, preview);
    perElementDefault(
        edge,
        "edge",
        ["color", MIXED_COLOR_KEY],
        withoutOwn(edges.color, snapshot.edgeCount, (e) => hexOf(colors[e])),
        "END_NODE_COLORS",
    );
    perElementDefault(
        edge,
        "edge",
        ["opacity", "end-opacity"],
        withoutOwn(edges.color, snapshot.edgeCount, (e) => colors[e][3] / 255).map((v, e) => {
            // a swallowed edge Gephi draws only the arrowhead of draws no line
            if (swallowed[e] !== null && !hidden[e]) {
                return 0;
            }
            return v === 1 ? null : v;
        }),
        "END_NODE_COLORS",
    );
    everyElement(edge, "edge", "preview-curve", preview.on("edge.curved") ? {} : { curved: false });
    // Gephi's `edge.radius` leaves that much empty between each node and its edges' ends, arrowheads too
    const nodeGap = preview.num("edge.radius");
    everyElement(edge, "edge", "preview-radius", nodeGap > 0 ? { nodeGap } : {});
    edgeLabelRules(edge, colors, gexf, preview);
}

/**
 * Each edge's color and alpha (0..255) under `edge.color` and `edge.opacity`: MIXED (the default) is each channel,
 * alpha too, the truncated mean of the two end nodes'; `source` and `target` are that node's; `original` is the edge's
 * own viz color, black without one; `#rrggbb` is that color, opaque (`gexf-specimen-edges-lines-p3` .. `-p7`).
 * graphty-element cannot bind an edge's color to its nodes' drawn colors, so the color is frozen here.
 * @param snapshot - the graph
 * @param channels - each node's color channels
 * @param gexf - the GEXF drawing, or undefined
 * @param preview - the settings
 * @returns each edge's r, g, b and alpha
 */
function edgeColors(
    snapshot: GraphSnapshot,
    channels: readonly number[][],
    gexf: GephiDrawing | undefined,
    preview: GephiPreview,
): number[][] {
    const mode = preview.text("edge.color");
    const factor = preview.num("edge.opacity") / 100;
    const own = (e: number): number[] => {
        const c = gexf?.original?.color?.[e];
        const a = gexf?.original?.opacity?.[e];
        return nodeChannels(typeof c === "string" ? c : GEPHI_NODE_FILL, typeof a === "number" ? a : null);
    };
    const custom = dependantColor(mode, [0, 0, 0]);
    return Array.from({ length: snapshot.edgeCount }, (_, e) => {
        const s = channels[snapshot.edgeSource(e)];
        const t = channels[snapshot.edgeTarget(e)];
        let c: number[];
        if (mode === "source") {
            c = [...s];
        } else if (mode === "target") {
            c = [...t];
        } else if (mode === "original") {
            c = own(e);
        } else if (mode.startsWith("#") && custom !== null) {
            c = [...custom, 255];
        } else {
            c = s.map((v, k) => Math.floor((v + t[k]) / 2));
        }
        return factor === 1 ? c : [c[0], c[1], c[2], c[3] * factor];
    });
}

/**
 * The edge label rules of `edge.label.show`: the font's size (not in proportion to anything), color, outline and
 * font (`gexf-specimen-edge-labels-p2` .. `-p15`).
 * @param edge - the edge rules, changed in place
 * @param colors - each edge's color and alpha
 * @param gexf - the GEXF drawing, or undefined
 * @param preview - the settings
 */
function edgeLabelRules(
    edge: GephiTargetRules,
    colors: readonly number[][],
    gexf: GephiDrawing | undefined,
    preview: GephiPreview,
): void {
    if (gexf?.edgeLabels === undefined || !preview.on("edge.label.show")) {
        return;
    }
    const font = preview.font("edge");
    const color = preview.text("edge.label.color");
    if (color !== "original") {
        perElementDefault(
            edge,
            "edge",
            ["labelColor", "preview-label-color"],
            colors.map((c) => hexOf(dependantColor(color, c) ?? [0, 0, 0])),
            "EDGE_LABEL_COLOR",
        );
    }
    labelOutline(
        edge,
        "edge",
        colors,
        colors.map(() => font.size),
        preview,
    );
    // Gephi centers an edge label on its line's middle (gexf-specimen-edge-labels-p2: 0.04 of the font off it)
    everyElement(edge, "edge", "preview-label", {
        labelSize: font.size,
        labelPosition: "center",
        ...fontValues(font, preview.on("edge.label.customFont")),
    });
}

/**
 * Preview's "mixed" edge color: the mean of two colors, each channel rounded down (`EdgeColor.java` lines 89-93).
 * @param a - one end's color, `#rrggbb`
 * @param b - the other's
 * @returns the mixed color
 */
function gephiMix(a: string, b: string): string {
    const x = Number.parseInt(a.slice(1), 16);
    const y = Number.parseInt(b.slice(1), 16);
    let out = 0;
    for (const shift of [16, 8, 0]) {
        out |= Math.floor((((x >> shift) & 255) + ((y >> shift) & 255)) / 2) << shift;
    }
    return `#${out.toString(16).padStart(6, "0")}`;
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
    const { block, preview } = keptOf(context.kept);
    const nodeOpacity = node.fillOpacity;
    const original = { color: edge.color, opacity: edge.opacity };
    if (block === null) {
        withoutUndrawn(node, edge);
    } else {
        exactFromBlock(snapshot, block, node, edge);
    }
    const labels = drawnLabels(node.label, preview, "node", block !== null);
    const overlapHidden =
        block === null && labels !== undefined && preview.on("node.label.avoidOverlap")
            ? gephiOverlapHidden(snapshot, labels, node.width, preview)
            : null;
    overlapHidden?.forEach((hide, i) => {
        if (hide && labels !== undefined) {
            labels[i] = null;
        }
    });
    if (labels === undefined) {
        delete node.label;
    } else {
        node.label = labels;
    }
    const edgeLabels = drawnLabels(edgeLabelValues(snapshot), preview, "edge", block !== null);
    if (edgeLabels !== undefined) {
        edge.label = edgeLabels;
    }
    const rules = gephiRules(
        snapshot,
        { fill: node.fill, fillOpacity: nodeOpacity, width: node.width },
        { color: edge.color, width: edge.width },
        context.budget,
        { preview, original, edgeLabels, overlapSettled: overlapHidden !== null },
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
 * What the import kept for the styles: the `graphty.styles` block, and the Preview settings of the `gephiPreview`
 * option.
 * @param kept - the kept value: the block's text, or `{ block, gephiPreview }`
 * @returns the block (null without one) and the Preview settings
 */
function keptOf(kept: unknown): { readonly block: string | null; readonly preview: GephiPreview } {
    if (typeof kept === "string") {
        return { block: kept, preview: new GephiPreview() };
    }
    if (typeof kept === "object" && kept !== null) {
        const { block, gephiPreview } = kept as { block?: unknown; gephiPreview?: Record<string, string> };
        return { block: typeof block === "string" ? block : null, preview: new GephiPreview(gephiPreview) };
    }
    return { block: null, preview: new GephiPreview() };
}

/**
 * Each edge's `label` attribute.
 * @param snapshot - the graph
 * @returns the labels, or undefined when no edge has one
 */
function edgeLabelValues(snapshot: GraphSnapshot): (StyleValue | null)[] | undefined {
    const col = snapshot.edges.byRole("label");
    if (col === null) {
        return undefined;
    }
    return Array.from({ length: snapshot.edgeCount }, (_, e) => {
        const v = plainCell(col.value(e));
        return typeof v === "string" && v.length > 0 ? v : null;
    });
}

/**
 * Leaves out the viz values Gephi does not draw, for a file graphty did not write: its preview draws every node an
 * opaque disc (a node's alpha only tints its edges) and every edge a solid line in its end nodes' mixed color, as
 * thick as its weight (graphstore keeps no edge thickness or shape, and EdgeColor MIXED ignores an edge's color).
 * Every `viz:shape` is drawn a disc, an `image` shape too: Gephi Toolkit 0.11.3 draws no picture
 * (`gexf-specimen-images-charts`: a data: URI and a web URL both drawn as the node's colored disc).
 * @param node - the node values, changed in place
 * @param edge - the edge values, changed in place
 */
function withoutUndrawn(
    node: Record<string, (StyleValue | null)[]>,
    edge: Record<string, (StyleValue | null)[]>,
): void {
    delete node.shape;
    delete node.image;
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
            // an edge in the mixed color of its nodes is left without one: Gephi, and graph-io, draw it so anyway
            const c = color[e];
            const end = (i: number): string => String(fill[i] ?? GEPHI_NODE_FILL);
            const mixed =
                typeof c === "string" && c === gephiMix(end(snapshot.edgeSource(e)), end(snapshot.edgeTarget(e)));
            return (
                (mixed && (opacity[e] ?? 1) === 1 ? "" : colorElement(c, opacity[e], indent)) +
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
