/**
 * DOT styles: every node's, cluster's and edge's attributes read the way Graphviz draws them, with Graphviz's
 * defaults beneath, and a graph's styles written back as Graphviz attributes.
 *
 * Reading follows Graphviz's own rules, measured against `dot` 2.43:
 *
 * - Labels: a node with no `label` shows its name (`\N`), as one tool-default rule over a style column holding each
 *   node's name. Escapes are applied in Graphviz's two passes; an HTML label shows its text, a record label its
 *   fields, and a `point` draws no label.
 * - Fills: `point` is always filled; `filled` and `radial` fill any shape, `striped` only boxes, `wedged` only
 *   ellipses; an empty `fillcolor` falls back to `color`, then light gray.
 * - Colors through Graphviz's color rules: a `colorscheme` applies to its own object only, an unknown color is black,
 *   `none` and `invis` are transparent, and a color list is read as Graphviz draws it for that use.
 * - Outlines: `plain`, `plaintext` and `none` draw none. `setlinewidth(n)` is a pen width, `bold` a width of 2.
 * - Sizes: exact with `fixedsize`, an empty label or a `point`; otherwise minimums Graphviz grows to fit the label,
 *   carried and noted as `W_STYLE_SIZE_MINIMUM`.
 * - Arrows per `dir`, `arrowhead` and `arrowtail`, with the graph's kind deciding the default: a target arrow on
 *   directed edges, as one tool-default rule.
 * - A cluster's container node holds the cluster's attributes: its fill (`bgcolor`, or the fill when `filled`) and
 *   outline (`pencolor`, else `color`) are the cluster's, it is drawn as a rectangle, and it has no label by default.
 *   Cluster membership is offered to the planner, so clusters whose nodes share a fill become one rule.
 *
 * Writing: Graphviz attributes from what graphty draws (`fillcolor` with `style=filled`, `width` and `height` with
 * `fixedsize=true`, `penwidth`, `style`, arrows with `dir`, font attributes, graph `bgcolor`) replace every style
 * attribute the reader reads. The `graphty.styles` block is the quoted graph attribute `"graphty.styles"`, and the
 * per-element values its rules read are quoted `"graphty.style.<target>.<key>"` attributes.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { isWritableDotText } from "../../common/escape.js";
import { inferTextDtype } from "../../common/text.js";
import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber, DOT_POINTS_PER_INCH, num6 } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import { type DotEscapeNames, dotLabelText, htmlLabelText, recordLabelText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { toolDefaults } from "../../styles/defaults.js";
import { blockStyles, parseStyleBlock, STYLE_BLOCK_NAME, writeStyleBlock } from "../../styles/io/block.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell, resolveStyles } from "../../styles/plan/resolve.js";
import type {
    ImporterStyles,
    StyleColumn,
    StyleFeature,
    StyleReadContext,
    StyleRule,
    StyleTarget,
    StyleValue,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { CLUSTER_COLUMN, LABEL_ATTRIBUTE } from "./names.js";

/**
 * The graph attribute holding the `graphty.styles` block of a DOT file graphty wrote.
 * @category Built-in formats
 */
export const DOT_STYLE_BLOCK_ATTRIBUTE = STYLE_BLOCK_NAME;

/**
 * What the DOT writer holds natively: Graphviz's node, cluster and edge attributes, and the graph's `bgcolor`. The
 * `graphty.styles` block and the per-element values its rules read are quoted attributes.
 * @category Built-in formats
 */
export const DOT_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    node: Object.freeze([
        "fill",
        "fillOpacity",
        "borderColor",
        "borderWidth",
        "borderStyle",
        "shape",
        "width",
        "height",
        "label",
        "labelColor",
        "labelSize",
        "labelFont",
        "tooltip",
        "visible",
    ] as const),
    edge: Object.freeze([
        "color",
        "opacity",
        "width",
        "lineStyle",
        "sourceArrow",
        "targetArrow",
        "arrowSize",
        "label",
        "sourceLabel",
        "targetLabel",
        "labelColor",
        "labelSize",
        "labelFont",
        "tooltip",
        "visible",
    ] as const),
    graph: Object.freeze(["background"] as const),
    block: "native",
});

/** The style column holding the name each node shows when it has no label (Graphviz's `\N`). */
const NAME_KEY = "name";

/** The style column marking directed edges, which Graphviz draws with an arrow at the target. */
const DIRECTED_KEY = "directed";

/** The style column marking a cluster's container node. */
const CLUSTER_KEY = "cluster";

/** Every node and cluster attribute the reader reads; the writer replaces them all. */
const NODE_ATTRIBUTES: readonly string[] = [
    "colorscheme",
    "color",
    "fillcolor",
    "bgcolor",
    "pencolor",
    "style",
    "shape",
    "width",
    "height",
    "fixedsize",
    "regular",
    "penwidth",
    "fontname",
    "fontsize",
    "fontcolor",
    "tooltip",
];

/** Every edge attribute the reader reads; the writer replaces them all. */
const EDGE_ATTRIBUTES: readonly string[] = [
    "colorscheme",
    "color",
    "style",
    "penwidth",
    "fontname",
    "fontsize",
    "fontcolor",
    "tooltip",
    "edgetooltip",
    "arrowhead",
    "arrowtail",
    "dir",
    "arrowsize",
    "headlabel",
    "taillabel",
];

/** Attributes the reader notes as not carried. */
const NOTED_ATTRIBUTES: readonly string[] = ["peripheries", "xlabel"];

const CIRCLE_LIKE: ReadonlySet<string> = new Set(["circle", "doublecircle", "mcircle", "square", "msquare"]);
const BOX_LIKE: ReadonlySet<string> = new Set(["box", "rect", "rectangle", "square"]);
const ELLIPSE_LIKE: ReadonlySet<string> = new Set(["", "ellipse", "oval", "circle"]);
const NO_OUTLINE: ReadonlySet<string> = new Set(["plain", "plaintext", "none"]);
const RECORD: ReadonlySet<string> = new Set(["record", "mrecord"]);
const TRUE_TEXTS: ReadonlySet<string> = new Set(["true", "yes", "shape"]);

/** A point's size when the file gives none: 0.05 inch. */
const POINT_SIZE = 0.05;

/** The size in inches Graphviz gives a circle, a square or a `regular` node that states none. */
const REGULAR_SIZE = 0.5;

/** One attribute of an element as text, or null when it is unset. */
type Attr = (name: string) => string | null;

/** One element's canonical value of a property; null leaves it unset. */
type Put = (property: string, value: StyleValue | null) => void;

/** Where a value of an element was read, by property. */
type At = (property: string) => CanonSite;

/** What a node's label escapes and its defaults depend on. */
interface NodeContext {
    /** The node's name (its id as text). */
    readonly name: string;
    /** The graph's name, for `\G`. */
    readonly graph: string;
    /** Whether the node is a cluster's container. */
    readonly cluster: boolean;
    /** The HTML strings of the file, for Graphviz's shared string pool. */
    readonly html: ReadonlySet<string>;
}

/** What an edge's label escapes depend on. */
interface EdgeContext {
    /** The names `\E`, `\T`, `\H` and `\G` stand for. */
    readonly names: DotEscapeNames;
    /** Whether the edge is directed. */
    readonly directed: boolean;
    /** The HTML strings of the file. */
    readonly html: ReadonlySet<string>;
}

/**
 * Whether a text is an HTML string (balanced angle brackets around the whole text), which graph-io keeps with its
 * brackets and DOT writes bare as `<...>`.
 * @param text - the text
 * @returns true for an HTML string
 */
export function isHtmlString(text: string): boolean {
    if (text.length < 2 || !text.startsWith("<") || !text.endsWith(">")) {
        return false;
    }
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c === 0x3c) {
            depth++;
        } else if (c === 0x3e) {
            depth--;
            if (depth === 0 && i !== text.length - 1) {
                return false;
            }
        }
    }
    return depth === 0;
}

/**
 * The value of an attribute cell as text, or null when it is unset.
 * @param table - the node, edge or graph table
 * @param name - the attribute
 * @param i - the row
 * @returns the text
 */
function cellText(table: GraphSnapshot["nodes"], name: string, i: number): string | null {
    if (!table.has(name)) {
        return null;
    }
    const v = plainCell(table.value(name, i));
    if (typeof v === "string") {
        return v;
    }
    return typeof v === "number" || typeof v === "boolean" ? String(v) : null;
}

/**
 * A text, or null when it is empty.
 * @param v - the text
 * @returns the text
 */
function nonEmpty(v: string | null): string | null {
    return v === null || v === "" ? null : v;
}

/**
 * The tokens of a `style` value: split on commas, lowercased, blanks before a token skipped (blanks after it make it
 * a token Graphviz does not know, so they are kept).
 * @param raw - the value
 * @param at - where it was read
 * @returns the tokens
 */
function styleTokens(raw: string | null, at: CanonSite): string[] {
    if (raw === null) {
        return [];
    }
    if (raw.length > MAX_STYLE_VALUE_LENGTH) {
        noteAt(at, STYLE_ISSUE.VALUE_TOO_LONG, `${String(raw.length)} characters`);
        return [];
    }
    return raw
        .toLowerCase()
        .split(",")
        .map((t) => t.replace(/^[ \t\r\n]+/, ""))
        .filter((t) => t !== "");
}

/**
 * The pen width a style's `setlinewidth(n)` gives, or null.
 * @param tokens - the style's tokens
 * @returns the width's text
 */
function setLineWidth(tokens: readonly string[]): string | null {
    for (const t of tokens) {
        if (t.startsWith("setlinewidth(") && t.endsWith(")")) {
            return t.slice("setlinewidth(".length, -1).trim();
        }
    }
    return null;
}

/**
 * Whether an attribute is one of Graphviz's true spellings (`true`, `yes`, a non-zero number; `fixedsize` also
 * takes `shape`).
 * @param raw - the value
 * @returns true when set
 */
function isTrue(raw: string | null): boolean {
    if (raw === null) {
        return false;
    }
    const t = raw.trim().toLowerCase();
    return TRUE_TEXTS.has(t) || (/^-?\d+$/.test(t) && Number(t) !== 0);
}

/**
 * The text a label draws: an HTML label's text (also for a quoted label equal to an HTML label's content elsewhere
 * in the file, since Graphviz 2.43 marks HTML on a pooled string), a record's fields, the escapes applied.
 * @param raw - the label as the file gives it
 * @param names - what the escapes stand for
 * @param html - the file's HTML strings
 * @param record - whether the node is a record
 * @param at - where it was read
 * @returns the text
 */
function labelText(
    raw: string,
    names: DotEscapeNames,
    html: ReadonlySet<string>,
    record: boolean,
    at: CanonSite,
): string {
    if (isHtmlString(raw)) {
        return htmlLabelText(raw, at);
    }
    if (html.has(`<${raw}>`)) {
        return htmlLabelText(`<${raw}>`, at);
    }
    return dotLabelText(record ? recordLabelText(raw, at) : raw, names, at);
}

/**
 * Reads a color into a property and its alpha into the property's opacity.
 * @param raw - the color
 * @param scheme - the object's color scheme
 * @param use - how Graphviz draws it
 * @param property - the color property
 * @param opacity - its opacity property, or null when the alpha is dropped
 * @param put - receives the values
 * @param at - the sites
 * @returns the alpha, or null when the color is absent
 */
function readColor(
    raw: string | null,
    scheme: string | null,
    use: "line" | "fill" | "edge",
    property: string,
    opacity: string | null,
    put: Put,
    at: At,
): number | null {
    if (raw === null) {
        return null;
    }
    const c = canonColor(raw, "graphviz", at(property), { scheme, use });
    if (c === null) {
        return null;
    }
    put(property, c.color);
    if (opacity !== null) {
        put(opacity, c.alpha);
    } else if (c.alpha > 0 || property !== "borderColor") {
        // a transparent outline is no outline (the caller sets its width to 0); any other alpha is dropped, noted
        colorOpacity(c, null, at(property), false);
    }
    return c.alpha;
}

/**
 * A length in points as the shortest inches (at least 6 significant digits) that read back as the same length.
 * @param points - the length
 * @returns the inches
 */
function inchesOf(points: number): number {
    const want = num6(points);
    for (let digits = 6; digits < 17; digits++) {
        const inches = Number((points / DOT_POINTS_PER_INCH).toPrecision(digits));
        if (num6(inches * DOT_POINTS_PER_INCH) === want) {
            return inches + 0;
        }
    }
    return points / DOT_POINTS_PER_INCH;
}

/**
 * A size attribute in inches, or null with a note when it is not a non-negative number.
 * @param raw - the value
 * @param at - where it was read
 * @returns the inches
 */
function inches(raw: string | null, at: CanonSite): number | null {
    if (raw === null) {
        return null;
    }
    const v = raw.trim() === "" ? Number.NaN : Number(raw);
    if (!Number.isFinite(v) || v < 0) {
        noteAt(at, STYLE_ISSUE.BAD_VALUE, raw.slice(0, MAX_STYLE_VALUE_LENGTH));
        return null;
    }
    return v;
}

/**
 * Reads the attributes every element shares: font, tooltip, visibility.
 * @param get - the element's attributes
 * @param tokens - its style tokens
 * @param scheme - its color scheme
 * @param names - what the tooltip's escapes stand for
 * @param put - receives the values
 * @param at - the sites
 */
function readCommon(
    get: Attr,
    tokens: readonly string[],
    scheme: string | null,
    names: DotEscapeNames,
    put: Put,
    at: At,
): void {
    if (tokens.includes("invis")) {
        put("visible", false);
    }
    readColor(nonEmpty(get("fontcolor")), scheme, "line", "labelColor", null, put, at);
    const size = get("fontsize");
    put("labelSize", size === null ? null : canonNumber(size, at("labelSize")));
    const font = get("fontname");
    if (font !== null && font.length <= MAX_STYLE_VALUE_LENGTH) {
        put("labelFont", font);
    }
    const tip = get("tooltip") ?? get("edgetooltip");
    if (tip !== null) {
        put("tooltip", dotLabelText(tip, names, at("tooltip")));
    }
}

/**
 * Reads one node, or one cluster's container, the way Graphviz draws it.
 * @param get - its attributes
 * @param cx - its name and kind
 * @param put - receives the values
 * @param at - the sites
 */
function readNode(get: Attr, cx: NodeContext, put: Put, at: At): void {
    const tokens = styleTokens(get("style"), at("visible"));
    const shapeRaw = nonEmpty(get("shape"));
    const shape = (shapeRaw ?? "").toLowerCase();
    const point = !cx.cluster && shape === "point";
    const scheme = get("colorscheme");
    const color = nonEmpty(get("color"));
    const fillcolor = nonEmpty(get("fillcolor"));
    // in a node's label \E stands for nothing (measured with dot 2.43); \T and \H stand for their letters
    const names: DotEscapeNames = cx.cluster ? { graph: cx.name } : { node: cx.name, graph: cx.graph, edge: "" };
    readCommon(get, tokens, scheme, names, put, at);
    // fill
    if (cx.cluster) {
        const filled = tokens.includes("filled") || tokens.includes("radial") || tokens.includes("striped");
        const bg = nonEmpty(get("bgcolor"));
        const raw = filled ? (fillcolor ?? color ?? bg ?? "lightgrey") : bg;
        readColor(raw, scheme, "fill", "fill", "fillOpacity", put, at);
    } else {
        const filled =
            point ||
            tokens.some(
                (t) =>
                    t === "filled" ||
                    t === "radial" ||
                    (t === "striped" && BOX_LIKE.has(shape)) ||
                    (t === "wedged" && ELLIPSE_LIKE.has(shape)),
            );
        if (filled) {
            readColor(
                fillcolor ?? color ?? (point ? "black" : "lightgrey"),
                scheme,
                "fill",
                "fill",
                "fillOpacity",
                put,
                at,
            );
        } else if (fillcolor !== null) {
            noteAt(at("fill"), STYLE_ISSUE.UNFILLED, fillcolor.slice(0, MAX_STYLE_VALUE_LENGTH));
        }
    }
    // outline
    if (!cx.cluster && NO_OUTLINE.has(shape)) {
        put("borderWidth", 0);
    } else {
        const outline = cx.cluster ? (nonEmpty(get("pencolor")) ?? color) : color;
        const alpha = readColor(outline, scheme, "line", "borderColor", null, put, at);
        const width = nonEmpty(get("penwidth")) ?? setLineWidth(tokens);
        if (alpha === 0) {
            put("borderWidth", 0);
        } else if (width !== null) {
            put("borderWidth", penWidth(width, get("penwidth") !== null, at("borderWidth")));
        } else if (tokens.includes("bold")) {
            put("borderWidth", 2);
        }
    }
    if (tokens.includes("dashed")) {
        put("borderStyle", "dashed");
    } else if (tokens.includes("dotted")) {
        put("borderStyle", "dotted");
    }
    // shape
    const rounded = tokens.includes("rounded");
    if (cx.cluster) {
        put("shape", rounded ? "round-rectangle" : "rectangle");
    } else if (shapeRaw !== null) {
        put(
            "shape",
            rounded && BOX_LIKE.has(shape) ? "round-rectangle" : canonEnum("shape", shapeRaw, "graphviz", at("shape")),
        );
    }
    // label: a node shows its name unless it has a label (the tool-default rule); a cluster and a point show none
    const label = point ? null : get(LABEL_ATTRIBUTE);
    if (label !== null) {
        put("label", labelText(label, names, cx.html, RECORD.has(shape), at("label")));
    }
    if (!cx.cluster) {
        readSize(get, shape, point, label ?? (point ? null : cx.name), put, at);
    }
    if (Number(get("peripheries")) > 1 || nonEmpty(get("xlabel")) !== null) {
        noteAt(at("label"), STYLE_ISSUE.NOT_CARRIED, nonEmpty(get("xlabel")) === null ? "peripheries" : "xlabel");
    }
}

/**
 * A pen width as Graphviz draws it: a negative `penwidth` is raised to 0, its minimum, and noted.
 * @param raw - the `penwidth` or `setlinewidth` value
 * @param attribute - whether it is the `penwidth` attribute
 * @param site - where it was read
 * @returns the width, or null when it does not parse
 */
function penWidth(raw: string, attribute: boolean, site: CanonSite): number | null {
    const value = Number(raw.trim());
    if (attribute && Number.isFinite(value) && value < 0) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, raw.slice(0, MAX_STYLE_VALUE_LENGTH));
        return 0;
    }
    return canonNumber(raw, site);
}

/**
 * Reads a node's width and height: exact where Graphviz draws them exactly (`fixedsize`, an empty label that is not
 * a record's, a point), otherwise minimums it grows to fit the label, noted.
 * @param get - the node's attributes
 * @param shape - its shape, lowercase
 * @param point - whether it is a point
 * @param label - the label it shows, or null
 * @param put - receives the values
 * @param at - the sites
 */
function readSize(get: Attr, shape: string, point: boolean, label: string | null, put: Put, at: At): void {
    let w = inches(get("width"), at("width"));
    let h = inches(get("height"), at("height"));
    const same = point || CIRCLE_LIKE.has(shape) || isTrue(get("regular"));
    if (shape === "plain") {
        // plain is plaintext with its width and height forced to 0: exactly the size of its label
        w = h = 0;
    } else if (w === null && h === null) {
        if (point) {
            put("width", num6(POINT_SIZE * DOT_POINTS_PER_INCH));
            put("height", num6(POINT_SIZE * DOT_POINTS_PER_INCH));
            return;
        }
        if (!same) {
            return;
        }
        // a regular shape takes the smaller of the default width and height (0.5 inch) for both
        w = h = REGULAR_SIZE;
    }
    let ww = w;
    let hh = h;
    if (point) {
        ww = hh = Math.min(w ?? Infinity, h ?? Infinity);
    } else if (same) {
        ww = hh = Math.max(w ?? 0, h ?? 0);
    }
    const exact = point || isTrue(get("fixedsize")) || (label === "" && !RECORD.has(shape));
    if (!exact) {
        noteAt(at("width"), STYLE_ISSUE.SIZE_MINIMUM, "grows to fit its label");
    }
    put("width", ww === null ? null : canonNumber(ww, at("width"), DOT_POINTS_PER_INCH));
    put("height", hh === null ? null : canonNumber(hh, at("height"), DOT_POINTS_PER_INCH));
}

/**
 * Reads one edge the way Graphviz draws it.
 * @param get - its attributes
 * @param cx - its names and direction
 * @param put - receives the values
 * @param at - the sites
 */
function readEdge(get: Attr, cx: EdgeContext, put: Put, at: At): void {
    const tokens = styleTokens(get("style"), at("visible"));
    const scheme = get("colorscheme");
    readCommon(get, tokens, scheme, cx.names, put, at);
    readColor(nonEmpty(get("color")), scheme, "edge", "color", "opacity", put, at);
    const width = nonEmpty(get("penwidth")) ?? setLineWidth(tokens);
    if (width !== null) {
        put("width", penWidth(width, get("penwidth") !== null, at("width")));
    } else if (tokens.includes("bold")) {
        put("width", 2);
    }
    if (tokens.includes("dashed")) {
        put("lineStyle", "dashed");
    } else if (tokens.includes("dotted")) {
        put("lineStyle", "dotted");
    } else if (tokens.includes("solid") || tokens.includes("bold")) {
        put("lineStyle", "solid");
    } else if (tokens.includes("tapered")) {
        put("lineStyle", "other:tapered");
    }
    const dirRaw = nonEmpty(get("dir"));
    const head = nonEmpty(get("arrowhead"));
    const tail = nonEmpty(get("arrowtail"));
    // with none of these the tool-default rule draws the arrow of the graph's kind
    if (dirRaw !== null || head !== null || tail !== null) {
        const dir = (dirRaw ?? (cx.directed ? "forward" : "none")).trim().toLowerCase();
        const forward = dir === "forward" || dir === "both";
        const back = dir === "back" || dir === "both";
        put("targetArrow", forward ? canonEnum("arrow", head ?? "normal", "graphviz", at("targetArrow")) : "none");
        put("sourceArrow", back ? canonEnum("arrow", tail ?? "normal", "graphviz", at("sourceArrow")) : "none");
    }
    const size = get("arrowsize");
    if (size !== null) {
        put("arrowSize", canonNumber(size, at("arrowSize")));
    }
    for (const [attribute, property] of [
        [LABEL_ATTRIBUTE, "label"],
        ["headlabel", "targetLabel"],
        ["taillabel", "sourceLabel"],
    ] as const) {
        const raw = get(attribute);
        if (raw !== null) {
            put(property, labelText(raw, cx.names, cx.html, false, at(property)));
        }
    }
    if (nonEmpty(get("xlabel")) !== null) {
        noteAt(at("label"), STYLE_ISSUE.NOT_CARRIED, "xlabel");
    }
}

/**
 * The HTML strings of a file: its HTML node names and labels, for Graphviz's shared string pool.
 * @param snapshot - the graph
 * @returns the strings, with their brackets
 */
function htmlStrings(snapshot: GraphSnapshot): Set<string> {
    const out = new Set<string>();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        if (typeof id === "string" && isHtmlString(id)) {
            out.add(id);
        }
    }
    for (const [table, n] of [
        [snapshot.nodes, snapshot.nodeCount],
        [snapshot.edges, snapshot.edgeCount],
    ] as const) {
        for (const name of [LABEL_ATTRIBUTE, "headlabel", "taillabel"]) {
            if (!table.has(name)) {
                continue;
            }
            for (let i = 0; i < n; i++) {
                const v = cellText(table, name, i);
                if (v !== null && isHtmlString(v)) {
                    out.add(v);
                }
            }
        }
    }
    return out;
}

/**
 * Which edges are directed: every edge of a directed graph, or as its direction column says.
 * @param snapshot - the graph
 * @returns per edge
 */
function directedEdges(snapshot: GraphSnapshot): boolean[] {
    const out = new Array<boolean>(snapshot.edgeCount).fill(snapshot.directed);
    const col = snapshot.directed ? snapshot.edges.byRole("directed") : null;
    if (col !== null) {
        for (let e = 0; e < snapshot.edgeCount; e++) {
            const v = plainCell(col.value(e));
            if (typeof v === "boolean") {
                out[e] = v;
            }
        }
    }
    return out;
}

/**
 * Whether a node is a cluster's container.
 * @param snapshot - the graph
 * @param i - the node
 * @returns true for a container
 */
function isCluster(snapshot: GraphSnapshot, i: number): boolean {
    return snapshot.nodes.has(CLUSTER_COLUMN) && snapshot.nodes.value(CLUSTER_COLUMN, i) === true;
}

/**
 * Per element, what its labels' escapes and defaults depend on.
 * @param snapshot - the graph
 * @returns the contexts
 */
function contexts(snapshot: GraphSnapshot): {
    readonly node: (i: number) => NodeContext;
    readonly edge: (e: number) => EdgeContext;
} {
    const html = htmlStrings(snapshot);
    const graph = snapshot.meta.name ?? "";
    const directed = directedEdges(snapshot);
    const name = (i: number): string => String(snapshot.ids.idOf(i));
    return {
        node: (i) => ({ name: name(i), graph, cluster: isCluster(snapshot, i), html }),
        edge: (e) => {
            const tail = name(snapshot.edgeSource(e));
            const head = name(snapshot.edgeTarget(e));
            return {
                names: { graph, tail, head, edge: `${tail}${directed[e] ? "->" : "--"}${head}` },
                directed: directed[e],
                html,
            };
        },
    };
}

/**
 * The label a node shows when it has none of its own: its name, escapes applied (an HTML name shows its text); null
 * for a cluster's container and a point.
 * @param cx - the node
 * @param shape - its shape, lowercase
 * @param notes - where an HTML name is noted
 * @returns the label, or null
 */
function defaultLabel(cx: NodeContext, shape: string, notes: StyleNotes): string | null {
    if (cx.cluster || shape === "point") {
        return null;
    }
    const at: CanonSite = { notes, target: "node", property: "label" };
    return isHtmlString(cx.name)
        ? htmlLabelText(cx.name, at)
        : dotLabelText("\\N", { node: cx.name, graph: cx.graph }, at);
}

/** Every element's values, by property. */
type ValueColumns = Record<string, (StyleValue | null)[]>;

/**
 * A collector of values per property.
 * @param n - the element count
 * @returns the values and a setter
 */
function valueColumns(n: number): {
    readonly values: ValueColumns;
    put(i: number, property: string, value: StyleValue | null): void;
} {
    const values = Object.create(null) as ValueColumns;
    return {
        values,
        put(i, property, value) {
            if (value !== null) {
                (values[property] ??= new Array<StyleValue | null>(n).fill(null))[i] = value;
            }
        },
    };
}

/**
 * The columns of a table that hold styles: Graphviz's style attributes and graphty's per-element style values.
 * @param table - the node or edge table
 * @param attributes - the style attributes of the table
 * @returns the column names
 */
function styleColumns(table: GraphSnapshot["nodes"], attributes: readonly string[]): string[] {
    const own = new Set([...attributes, ...NOTED_ATTRIBUTES]);
    return [...table.names()].filter((c) => own.has(c) || c.startsWith("graphty.style."));
}

/**
 * The styles of a DOT file, read the way Graphviz draws it, with Graphviz's defaults beneath: an unfilled black
 * ellipse 54 x 36 labeled with its name, black edges with a target arrow in a directed graph. A file graphty wrote
 * gives back its `graphty.styles` block.
 * @param snapshot - the graph the import built
 * @param context - the work budget
 * @returns the styles
 */
export function dotStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const cx = contexts(snapshot);
    const node = valueColumns(snapshot.nodeCount);
    const nameColumn = new Array<StyleValue | null>(snapshot.nodeCount).fill(null);
    const clusterColumn = new Array<StyleValue | null>(snapshot.nodeCount).fill(null);
    let named = 0;
    let clusters = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        context.budget.spend("node", NODE_ATTRIBUTES.length);
        const get: Attr = (name) => cellText(snapshot.nodes, name, i);
        const ncx = cx.node(i);
        const at: At = (property) => ({ notes, target: "node", property, element: i, budget: context.budget });
        readNode(
            get,
            ncx,
            (p, v) => {
                node.put(i, p, v);
            },
            at,
        );
        const shown = defaultLabel(ncx, (get("shape") ?? "").toLowerCase(), notes);
        if (shown !== null) {
            nameColumn[i] = shown;
            named++;
        }
        if (ncx.cluster) {
            clusterColumn[i] = true;
            clusters++;
        }
    }
    const edge = valueColumns(snapshot.edgeCount);
    for (let e = 0; e < snapshot.edgeCount; e++) {
        context.budget.spend("edge", EDGE_ATTRIBUTES.length);
        const get: Attr = (name) => cellText(snapshot.edges, name, e);
        const at: At = (property) => ({ notes, target: "edge", property, element: e, budget: context.budget });
        readEdge(
            get,
            cx.edge(e),
            (p, v) => {
                edge.put(e, p, v);
            },
            at,
        );
    }
    const graph: Record<string, StyleValue> = {};
    const bg = nonEmpty(cellText(snapshot.graph, "bgcolor", 0));
    if (snapshot.graph.has("bgcolor") && bg !== null) {
        readColor(
            bg,
            cellText(snapshot.graph, "colorscheme", 0),
            "fill",
            "background",
            null,
            (p, v) => {
                if (v !== null) {
                    graph[p] = v;
                }
            },
            (property) => ({ notes, target: "graph", property }),
        );
    }
    const blockText = cellText(snapshot.graph, STYLE_BLOCK_NAME, 0);
    if (blockText !== null) {
        exactFromBlock(snapshot, blockText, { node: node.values, edge: edge.values }, cx);
    }
    // Graphviz's defaults that are rules: each node shows its name, and a directed edge has an arrow at its target
    const nodeRules: StyleRule[] = [];
    const nodeColumns = new Map<string, StyleColumn>();
    if (named > 0) {
        nodeColumns.set(NAME_KEY, nameColumn);
        nodeRules.push({
            id: "node.tool.name-label",
            target: "node",
            role: "passthrough",
            origin: "tool",
            where: { has: { style: NAME_KEY } },
            map: { label: { kind: "passthrough", by: { style: NAME_KEY } } },
            facts: { elements: named, reason: "NODE_NAME" },
        });
    }
    const features: StyleFeature[] = clusters > 0 ? [{ ref: { style: CLUSTER_KEY }, values: clusterColumn }] : [];
    const edgeRules: StyleRule[] = [];
    const edgeColumns = new Map<string, StyleColumn>();
    const directed = directedEdges(snapshot);
    if (directed.some(Boolean)) {
        edgeColumns.set(
            DIRECTED_KEY,
            directed.map((d) => (d ? true : null)),
        );
        edgeRules.push({
            id: "edge.tool.arrow",
            target: "edge",
            role: "group",
            origin: "tool",
            where: { has: { style: DIRECTED_KEY } },
            set: { targetArrow: "triangle" },
        });
    }
    return {
        canonical: true,
        dialect: "graphviz",
        tool: "graphviz",
        units: "px",
        node: { values: node.values, rules: nodeRules, columns: nodeColumns, features },
        edge: { values: edge.values, rules: edgeRules, columns: edgeColumns },
        graph,
        notes: notes.list(),
        readFrom: {
            node: styleColumns(snapshot.nodes, NODE_ATTRIBUTES),
            edge: styleColumns(snapshot.edges, EDGE_ATTRIBUTES),
        },
    };
}

// ============================================================ writing

/** One element's value of a property. */
type Get = (property: string) => StyleValue | null;

/** Records a value written as the nearest one Graphviz has. */
type Approximate = (property: string, value: StyleValue) => void;

/** A written attribute value: text, or a number written as one. */
type Written = string | number;

/** Neutral shapes by the Graphviz shape that draws them exactly. */
const SHAPES: ReadonlyMap<string, string> = new Map([
    ["ellipse", "ellipse"],
    ["rectangle", "box"],
    ["round-rectangle", "box"],
    ["triangle", "triangle"],
    ["diamond", "diamond"],
    ["pentagon", "pentagon"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["parallelogram", "parallelogram"],
    ["trapezoid", "trapezium"],
    ["star", "star"],
    ["none", "none"],
]);

/** Neutral arrows by the Graphviz arrow that draws them. */
const ARROWS: ReadonlyMap<string, string> = new Map([
    ["none", "none"],
    ["triangle", "normal"],
    ["triangle-open", "onormal"],
    ["vee", "vee"],
    ["tee", "tee"],
    ["diamond", "diamond"],
    ["diamond-open", "odiamond"],
    ["circle", "dot"],
    ["circle-open", "odot"],
    ["square", "box"],
    ["crow", "crow"],
    ["half", "lnormal"],
    ["inverted", "inv"],
]);

/** Line and border styles Graphviz draws exactly; the others are written as the nearest. */
const STROKES: ReadonlyMap<string, string> = new Map([
    ["dashed", "dashed"],
    ["dotted", "dotted"],
]);

/**
 * The attribute values Graphviz draws when an attribute is absent, from the tool-defaults table: the writer leaves
 * them out, so a file states what differs from Graphviz's drawing (and a size stays one Graphviz may grow).
 * @param target - nodes or edges
 * @returns the default text of each attribute
 */
function graphvizDefaults(target: StyleTarget): ReadonlyMap<string, Written> {
    const t = toolDefaults("graphviz")?.[target] as Readonly<Record<string, { readonly value: unknown } | undefined>>;
    const out = new Map<string, Written>();
    const add = (attribute: string, property: string, scale = 1): void => {
        const v = t[property]?.value;
        if (typeof v === "number") {
            out.set(attribute, num6(v / scale));
        } else if (typeof v === "string") {
            out.set(attribute, v);
        }
    };
    add("fontcolor", "labelColor");
    add("fontsize", "labelSize");
    add("fontname", "labelFont");
    if (target === "node") {
        add("color", "borderColor");
        add("pencolor", "borderColor");
        add("penwidth", "borderWidth");
        add("shape", "shape");
        add("width", "width", DOT_POINTS_PER_INCH);
        add("height", "height", DOT_POINTS_PER_INCH);
    } else {
        add("color", "color");
        add("penwidth", "width");
        add("arrowsize", "arrowSize");
    }
    return out;
}

const DEFAULT_ATTRIBUTES: Readonly<Record<StyleTarget, ReadonlyMap<string, Written>>> = {
    node: graphvizDefaults("node"),
    edge: graphvizDefaults("edge"),
};

/**
 * Leaves out every attribute whose value is the one Graphviz draws without it.
 * @param out - the attributes, changed in place
 * @param target - nodes or edges
 * @returns the attributes
 */
function withoutDefaults(out: Map<string, Written>, target: StyleTarget): Map<string, Written> {
    for (const [attribute, value] of DEFAULT_ATTRIBUTES[target]) {
        if (out.get(attribute) === value) {
            out.delete(attribute);
        }
    }
    if (!out.has("width") && !out.has("height")) {
        out.delete("fixedsize");
    }
    return out;
}

/**
 * A color as Graphviz writes it: `#rrggbb`, or `#rrggbbaa` with an opacity below 1.
 * @param color - the canonical color
 * @param opacity - the opacity, or null
 * @returns the text
 */
function gvColor(color: string, opacity: StyleValue | null): string {
    if (typeof opacity !== "number" || opacity >= 1) {
        return color;
    }
    const a = Math.max(0, Math.min(255, Math.round(opacity * 255)));
    return color + a.toString(16).padStart(2, "0");
}

/**
 * A label's text as a DOT label: backslashes and line breaks escaped, so Graphviz's escape passes give the text back.
 * @param text - the text
 * @returns the label
 */
function escapeLabel(text: string): string {
    return text.replaceAll("\\", "\\\\").replaceAll("\n", "\\n");
}

/**
 * A shape, line or arrow value in Graphviz's spelling.
 * @param table - the exact spellings
 * @param value - the neutral value
 * @param nearest - the spelling written when there is no exact one
 * @param property - the property, for the approximation note
 * @param approximate - records approximations
 * @returns the spelling
 */
function spelled(
    table: ReadonlyMap<string, string>,
    value: string,
    nearest: string,
    property: string,
    approximate: Approximate,
): string {
    const exact = table.get(value);
    if (exact !== undefined) {
        return exact;
    }
    if (value.startsWith("other:")) {
        return value.slice("other:".length);
    }
    approximate(property, value);
    return nearest;
}

/**
 * The font, tooltip and visibility attributes every element shares.
 * @param get - the element's values
 * @param out - the attributes, added to
 * @param tokens - the style tokens, added to
 */
function writeCommon(get: Get, out: Map<string, Written>, tokens: string[]): void {
    const color = get("labelColor");
    if (typeof color === "string") {
        out.set("fontcolor", color);
    }
    const size = get("labelSize");
    if (typeof size === "number") {
        out.set("fontsize", size);
    }
    const font = get("labelFont");
    if (typeof font === "string") {
        out.set("fontname", font);
    }
    const tip = get("tooltip");
    if (typeof tip === "string") {
        out.set("tooltip", escapeLabel(tip));
    }
    if (get("visible") === false) {
        tokens.push("invis");
    }
}

/**
 * A node's or cluster's Graphviz attributes from its values.
 * @param get - the node's values
 * @param cx - the node's name and kind
 * @param approximate - records approximations
 * @param notes - where an HTML name is noted
 * @returns the attributes
 */
function nodeAttributes(get: Get, cx: NodeContext, approximate: Approximate, notes: StyleNotes): Map<string, Written> {
    const out = new Map<string, Written>();
    const tokens: string[] = [];
    writeCommon(get, out, tokens);
    const fill = get("fill");
    const fillOpacity = get("fillOpacity");
    if (typeof fill === "string" && fillOpacity !== 0) {
        tokens.push("filled");
        out.set("fillcolor", gvColor(fill, fillOpacity));
    }
    const border = get("borderColor");
    if (typeof border === "string") {
        out.set(cx.cluster ? "pencolor" : "color", border);
    }
    const borderWidth = get("borderWidth");
    if (typeof borderWidth === "number") {
        out.set("penwidth", borderWidth);
    }
    const borderStyle = get("borderStyle");
    if (typeof borderStyle === "string" && borderStyle !== "solid") {
        tokens.push(
            spelled(
                STROKES,
                borderStyle,
                borderStyle.includes("dash") ? "dashed" : "solid",
                "borderStyle",
                approximate,
            ),
        );
    }
    const shape = get("shape");
    let gvShape = "";
    if (typeof shape === "string") {
        if (shape === "round-rectangle") {
            tokens.push("rounded");
        }
        if (cx.cluster) {
            if (shape !== "rectangle" && shape !== "round-rectangle") {
                approximate("shape", shape);
            }
        } else {
            gvShape = spelled(SHAPES, shape, shape === "vee" ? "invtriangle" : "box", "shape", approximate);
            out.set("shape", gvShape);
        }
    }
    if (!cx.cluster) {
        const width = get("width");
        const height = get("height");
        if (typeof width === "number" || typeof height === "number") {
            out.set("fixedsize", "true");
        }
        if (typeof width === "number") {
            out.set("width", inchesOf(width));
        }
        if (typeof height === "number") {
            out.set("height", inchesOf(height));
        }
    }
    // the label is written where it differs from what Graphviz shows without one (the name), "" for none
    const label = get("label");
    const shown = defaultLabel(cx, gvShape, notes);
    if (typeof label === "string" && label !== shown) {
        out.set(LABEL_ATTRIBUTE, escapeLabel(label));
    } else if (label === null && shown !== null) {
        out.set(LABEL_ATTRIBUTE, "");
    }
    if (tokens.length > 0) {
        out.set("style", tokens.join(","));
    }
    return withoutDefaults(out, "node");
}

/**
 * An edge's Graphviz attributes from its values.
 * @param get - the edge's values
 * @param directed - whether the edge is directed (its default arrows)
 * @param approximate - records approximations
 * @returns the attributes
 */
function edgeAttributes(get: Get, directed: boolean, approximate: Approximate): Map<string, Written> {
    const out = new Map<string, Written>();
    const tokens: string[] = [];
    writeCommon(get, out, tokens);
    const color = get("color");
    if (typeof color === "string") {
        out.set("color", gvColor(color, get("opacity")));
    }
    const width = get("width");
    if (typeof width === "number") {
        out.set("penwidth", width);
    }
    const line = get("lineStyle");
    if (typeof line === "string" && line !== "solid") {
        tokens.push(spelled(STROKES, line, line.includes("dash") ? "dashed" : "solid", "lineStyle", approximate));
    }
    const source = get("sourceArrow");
    const target = get("targetArrow");
    const tail = typeof source === "string" && source !== "none";
    const head = typeof target === "string" && target !== "none";
    let dir = "none";
    if (head && tail) {
        dir = "both";
    } else if (head) {
        dir = "forward";
    } else if (tail) {
        dir = "back";
    }
    // the arrows are written where they differ from the graph's own: a target arrow on a directed edge
    const plain = directed ? head && !tail && target === "triangle" : !head && !tail;
    if (!plain && (source !== null || target !== null)) {
        out.set("dir", dir);
        if (head) {
            out.set("arrowhead", spelled(ARROWS, target, "normal", "targetArrow", approximate));
        }
        if (tail) {
            out.set("arrowtail", spelled(ARROWS, source, "normal", "sourceArrow", approximate));
        }
    }
    const arrowSize = get("arrowSize");
    if (typeof arrowSize === "number") {
        out.set("arrowsize", arrowSize);
    }
    for (const [property, attribute] of [
        ["label", LABEL_ATTRIBUTE],
        ["targetLabel", "headlabel"],
        ["sourceLabel", "taillabel"],
    ] as const) {
        const v = get(property);
        if (typeof v === "string") {
            out.set(attribute, escapeLabel(v));
        }
    }
    if (tokens.length > 0) {
        out.set("style", tokens.join(","));
    }
    return withoutDefaults(out, "edge");
}

/**
 * Each element's values of the properties the writer writes, as a getter per element.
 * @param picture - each element's value of a property
 * @param target - nodes or edges
 * @returns the getter
 */
function getter(
    picture: (target: StyleTarget, property: string) => readonly (StyleValue | null)[],
    target: StyleTarget,
): (i: number) => Get {
    const columns = new Map<string, readonly (StyleValue | null)[]>();
    for (const p of DOT_STYLE_CAPABILITIES[target]) {
        columns.set(p, picture(target, p));
    }
    return (i) => (property) => columns.get(property)?.[i] ?? null;
}

/**
 * For a file graphty wrote: where a value read from the attributes is what the writer writes for the block's own
 * value (a hexagon written as a hexagon, a pentagon-like vee as an inverted triangle, an opacity rounded to 255 steps,
 * a size rounded in inches), the block's exact value is the truth, so a re-import gives back the same rules; a value
 * another program changed since stays the truth.
 * @param snapshot - the graph
 * @param text - the block's text
 * @param read - the values read, changed in place
 * @param read.node - the node values
 * @param read.edge - the edge values
 * @param cx - the elements' contexts
 */
function exactFromBlock(
    snapshot: GraphSnapshot,
    text: string,
    read: { readonly node: ValueColumns; readonly edge: ValueColumns },
    cx: ReturnType<typeof contexts>,
): void {
    const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
    const ex = parsed.ok ? blockStyles(parsed.block, snapshot, "dot") : null;
    if (ex === null) {
        return;
    }
    const ignore: Approximate = () => undefined;
    const notes = new StyleNotes();
    for (const target of ["node", "edge"] as const) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const get = getter((t, p) => resolveStyles(ex, t, p as never, snapshot), target);
        const values = read[target];
        for (let i = 0; i < n; i++) {
            const want = get(i);
            const back = new Map<string, StyleValue>();
            const put: Put = (property, value) => {
                if (value !== null) {
                    back.set(property, value);
                }
            };
            const at: At = (property) => ({ notes, target, property });
            if (target === "node") {
                const ncx = cx.node(i);
                const attrs = nodeAttributes(want, ncx, ignore, notes);
                readNode((name) => textOf(attrs.get(name)), ncx, put, at);
            } else {
                const ecx = cx.edge(i);
                const attrs = edgeAttributes(want, ecx.directed, ignore);
                readEdge((name) => textOf(attrs.get(name)), ecx, put, at);
            }
            for (const property of DOT_STYLE_CAPABILITIES[target]) {
                const native = values[property]?.[i] ?? null;
                const w = want(property);
                if (native !== w && native === (back.get(property) ?? null)) {
                    (values[property] ??= new Array<StyleValue | null>(n).fill(null))[i] = w;
                }
            }
        }
    }
}

/**
 * A written value as the text the importer would read back.
 * @param v - the value
 * @returns its text, or null
 */
function textOf(v: Written | undefined): string | null {
    return v === undefined ? null : String(v);
}

/**
 * Whether a style column written as a DOT attribute reads back as the same values: DOT values are untyped and the
 * importer infers a column's type from its text, so a text column whose every value looks like a number does not.
 * @param col - the values
 * @returns true when it reads back unchanged
 */
function readsBack(col: StyleColumn): boolean {
    const vals = col.filter((v): v is StyleValue => v !== null);
    if (vals.every((v) => typeof v === "number")) {
        return vals.every((v) => Number.isFinite(v));
    }
    if (vals.every((v) => typeof v === "boolean")) {
        return true;
    }
    if (vals.every((v) => typeof v === "string")) {
        return vals.some((v) => inferTextDtype(v) === "string") && vals.every((v) => isWritableDotText(v));
    }
    return false;
}

/**
 * A `graphty.styles` block's JSON with every quote and backslash inside its strings written as a `\u` escape, so the
 * text holds no backslash before a quote, which a DOT quoted string cannot carry; it parses to the same value.
 * @param json - the block
 * @returns the block
 */
function dotSafeJson(json: string): string {
    return json.replace(/\\(["\\])/g, (_m, c: string) => (c === '"' ? "\\u0022" : "\\u005c"));
}

/** A DOT export with styles worked out. */
interface DotStyledExport {
    /** The graph to write: Graphviz attributes written from the styles, the block and the per-element values added. */
    readonly snapshot: GraphSnapshot;
    /** W_STYLE_APPROXIMATED for every value written as the nearest one Graphviz has. */
    readonly notes: readonly LossNote[];
}

/**
 * Works out a DOT export with styles: every node's, cluster's and edge's Graphviz attributes from what graphty draws,
 * in place of every style attribute it had; the graph's `bgcolor`; the `graphty.styles` block as the graph attribute
 * `"graphty.styles"` and the per-element values its rules read as `"graphty.style.<target>.<key>"` attributes. A
 * style column whose values would not read back as written (text that looks like numbers) goes inside the block
 * instead, with all the others.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles, or undefined when none are written
 * @returns the styled export, or null without styles
 */
export function dotStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
): DotStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const approximated = new Map<string, { count: number; samples: Set<string> }>();
    const out = snapshot.withColumns();
    const cx = contexts(snapshot);
    const notes = new StyleNotes();
    const picture = (target: StyleTarget, property: string): readonly (StyleValue | null)[] =>
        input.picture(target, property as never);
    for (const target of ["node", "edge"] as const) {
        const table = target === "node" ? out.nodes : out.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const approximate: Approximate = (property, value) => {
            const key = `${target}.${property}`;
            const a = approximated.get(key) ?? { count: 0, samples: new Set<string>() };
            a.count++;
            if (a.samples.size < 8) {
                a.samples.add(String(value));
            }
            approximated.set(key, a);
        };
        const get = getter(picture, target);
        const columns = new Map<string, (Written | null)[]>();
        for (let i = 0; i < n; i++) {
            const attrs =
                target === "node"
                    ? nodeAttributes(get(i), cx.node(i), approximate, notes)
                    : edgeAttributes(get(i), cx.edge(i).directed, approximate);
            for (const [name, value] of attrs) {
                let col = columns.get(name);
                if (col === undefined) {
                    col = new Array<Written | null>(n).fill(null);
                    columns.set(name, col);
                }
                col[i] = value;
            }
        }
        const attributes = target === "node" ? NODE_ATTRIBUTES : EDGE_ATTRIBUTES;
        // Graphviz reads these names as how to draw: the picture writes them, so a data column of the same name
        // (a `label` attribute graphty does not draw) would draw something graphty does not.
        for (const name of [...table.names()]) {
            if (attributes.includes(name) || name === LABEL_ATTRIBUTE || name.startsWith("graphty.style.")) {
                table.remove(name);
            }
        }
        for (const [name, col] of columns) {
            if (name === LABEL_ATTRIBUTE) {
                table.set(name, col, { dtype: "string", role: "label" }, { replaceRole: true });
            } else if (col.every((v) => v === null || typeof v === "number")) {
                table.set(name, col, { dtype: "f64" });
            } else {
                table.set(
                    name,
                    col.map((v) => (v === null ? null : String(v))),
                    { dtype: "string" },
                );
            }
        }
    }
    const { background } = input.rules.styles.graph;
    if (out.graph.has("bgcolor")) {
        out.graph.remove("bgcolor");
    }
    if (typeof background === "string") {
        out.graph.set("bgcolor", [background], { dtype: "string" });
    }
    const inline = [...input.tags.node.values(), ...input.tags.edge.values()].some((col) => !readsBack(col));
    if (!inline) {
        for (const target of ["node", "edge"] as const) {
            const table = target === "node" ? out.nodes : out.edges;
            for (const [name, col] of input.tags[target]) {
                const kinds = new Set(col.filter((v) => v !== null).map((v) => typeof v));
                let dtype: "string" | "bool" | "f64" = "string";
                if (kinds.has("number")) {
                    dtype = "f64";
                } else if (kinds.has("boolean")) {
                    dtype = "bool";
                }
                table.set(name, col, { dtype });
            }
        }
    }
    const block = inline ? writeStyleBlock(input.rules, { inlineColumns: true, snapshot }) : input.block;
    out.graph.set(STYLE_BLOCK_NAME, [dotSafeJson(block)], { dtype: "string" });
    const losses: LossNote[] = [];
    for (const [key, a] of approximated) {
        const [target, property] = key.split(".") as [StyleTarget, string];
        losses.push(
            Object.freeze({
                code: STYLE_ISSUE.APPROXIMATED,
                message: `${target} ${property} is written as the nearest value Graphviz has for ${String(a.count)} ${target}${a.count === 1 ? "" : "s"} (${[...a.samples].join(", ")}); the graphty.styles block keeps the exact value`,
                column: null,
                count: a.count,
                style: Object.freeze({ target, property: property as never }),
            }),
        );
    }
    return { snapshot: out, notes: losses };
}
