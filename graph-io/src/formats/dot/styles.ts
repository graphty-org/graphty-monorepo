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
import { StyleApproximations } from "../../styles/io/approximations.js";
import {
    blockStyles,
    parseStyleBlock,
    STYLE_BLOCK_NAME,
    styleBlockLosses,
    writeStyleBlock,
} from "../../styles/io/block.js";
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
import { type ValueColumns, valueColumns } from "../graphml/styles-yed.js";
import { CLUSTER_COLUMN, LABEL_ATTRIBUTE } from "./names.js";

/**
 * The graph attribute holding the `graphty.styles` block of a DOT file graphty wrote.
 * @category Built-in formats
 */
export { STYLE_BLOCK_NAME as DOT_STYLE_BLOCK_ATTRIBUTE } from "../../styles/io/block.js";

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
        const c = text.codePointAt(i);
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

/** What the parts of readNode() read: the node's attributes and what is worked out from them once. */
interface NodeRead {
    readonly get: Attr;
    readonly cx: NodeContext;
    readonly put: Put;
    readonly at: At;
    readonly tokens: readonly string[];
    /** The shape as written, or null. */
    readonly shapeRaw: string | null;
    /** The shape, lowercase ("" when none is written). */
    readonly shape: string;
    /** Whether it is a point (never a cluster). */
    readonly point: boolean;
    readonly scheme: string | null;
    readonly color: string | null;
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
    const n: NodeRead = {
        get,
        cx,
        put,
        at,
        tokens,
        shapeRaw,
        shape,
        point: !cx.cluster && shape === "point",
        scheme: get("colorscheme"),
        color: nonEmpty(get("color")),
    };
    // in a node's label \E stands for nothing (measured with dot 2.43); \T and \H stand for their letters
    const names: DotEscapeNames = cx.cluster ? { graph: cx.name } : { node: cx.name, graph: cx.graph, edge: "" };
    readCommon(get, tokens, n.scheme, names, put, at);
    if (cx.cluster) {
        readClusterFill(n);
    } else {
        readNodeFill(n);
    }
    readNodeOutline(n);
    readNodeShape(n);
    // label: a node shows its name unless it has a label (the tool-default rule); a cluster and a point show none
    const label = n.point ? null : get(LABEL_ATTRIBUTE);
    if (label !== null) {
        put("label", labelText(label, names, cx.html, RECORD.has(shape), at("label")));
    }
    if (!cx.cluster) {
        readSize(get, shape, n.point, label ?? (n.point ? null : cx.name), put, at);
    }
    if (Number(get("peripheries")) > 1 || nonEmpty(get("xlabel")) !== null) {
        noteAt(at("label"), STYLE_ISSUE.NOT_CARRIED, nonEmpty(get("xlabel")) === null ? "peripheries" : "xlabel");
    }
}

/**
 * Reads a cluster's fill: its fill color when filled, else its background.
 * @param n - the cluster
 */
function readClusterFill(n: NodeRead): void {
    const { get, tokens } = n;
    const filled = tokens.includes("filled") || tokens.includes("radial") || tokens.includes("striped");
    const bg = nonEmpty(get("bgcolor"));
    const raw = filled ? (nonEmpty(get("fillcolor")) ?? n.color ?? bg ?? "lightgrey") : bg;
    readColor(raw, n.scheme, "fill", "fill", "fillOpacity", n.put, n.at);
}

/**
 * Reads a node's fill: a point is always filled; a striped fill fills a box and a wedged one an ellipse only.
 * @param n - the node
 */
function readNodeFill(n: NodeRead): void {
    const { shape, point } = n;
    const fillcolor = nonEmpty(n.get("fillcolor"));
    const filled =
        point ||
        n.tokens.some(
            (t) =>
                t === "filled" ||
                t === "radial" ||
                (t === "striped" && BOX_LIKE.has(shape)) ||
                (t === "wedged" && ELLIPSE_LIKE.has(shape)),
        );
    if (filled) {
        const raw = fillcolor ?? n.color ?? (point ? "black" : "lightgrey");
        readColor(raw, n.scheme, "fill", "fill", "fillOpacity", n.put, n.at);
    } else if (fillcolor !== null) {
        noteAt(n.at("fill"), STYLE_ISSUE.UNFILLED, fillcolor.slice(0, MAX_STYLE_VALUE_LENGTH));
    }
}

/**
 * Reads a node's or cluster's outline: its color, width and dashes.
 * @param n - the node
 */
function readNodeOutline(n: NodeRead): void {
    const { get, cx, put, at, tokens } = n;
    if (!cx.cluster && NO_OUTLINE.has(n.shape)) {
        put("borderWidth", 0);
    } else {
        const outline = cx.cluster ? (nonEmpty(get("pencolor")) ?? n.color) : n.color;
        const alpha = readColor(outline, n.scheme, "line", "borderColor", null, put, at);
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
}

/**
 * Reads a node's or cluster's shape: a cluster is a rectangle, rounded by the `rounded` style as a box is.
 * @param n - the node
 */
function readNodeShape(n: NodeRead): void {
    const rounded = n.tokens.includes("rounded");
    if (n.cx.cluster) {
        n.put("shape", rounded ? "round-rectangle" : "rectangle");
    } else if (n.shapeRaw !== null) {
        n.put(
            "shape",
            rounded && BOX_LIKE.has(n.shape)
                ? "round-rectangle"
                : canonEnum("shape", n.shapeRaw, "graphviz", n.at("shape")),
        );
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
    readEdgeLine(get, tokens, put, at);
    readEdgeArrows(get, cx, put, at);
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
 * Reads an edge's line: its width and dashes.
 * @param get - its attributes
 * @param tokens - its style tokens
 * @param put - receives the values
 * @param at - the sites
 */
function readEdgeLine(get: Attr, tokens: readonly string[], put: Put, at: At): void {
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
}

/**
 * Reads an edge's arrows and their size.
 * @param get - its attributes
 * @param cx - its names and direction
 * @param put - receives the values
 * @param at - the sites
 */
function readEdgeArrows(get: Attr, cx: EdgeContext, put: Put, at: At): void {
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
        for (const name of [LABEL_ATTRIBUTE, "headlabel", "taillabel"].filter((c) => table.has(c))) {
            addHtmlCells(table, name, n, out);
        }
    }
    return out;
}

/**
 * Adds the HTML strings of one label column.
 * @param table - the node or edge table
 * @param name - the column
 * @param n - its rows
 * @param out - receives the strings
 */
function addHtmlCells(table: GraphSnapshot["nodes"], name: string, n: number, out: Set<string>): void {
    for (let i = 0; i < n; i++) {
        const v = cellText(table, name, i);
        if (v !== null && isHtmlString(v)) {
            out.add(v);
        }
    }
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
 * @param written - the direction every edge is written with when the graph mixes both, or null to read it per edge
 * @returns the contexts
 */
function contexts(
    snapshot: GraphSnapshot,
    written: boolean | null = null,
): {
    readonly node: (i: number) => NodeContext;
    readonly edge: (e: number) => EdgeContext;
} {
    const html = htmlStrings(snapshot);
    const graph = snapshot.meta.name ?? "";
    const own = directedEdges(snapshot);
    // a graph mixing both directions is written with one, every edge then drawn as that one
    const directed = written === null || own.every((d) => d === snapshot.directed) ? own : own.map(() => written);
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
        : dotLabelText(String.raw`\N`, { node: cx.name, graph: cx.graph }, at);
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
    return text.replaceAll("\\", String.raw`\\`).replaceAll("\n", String.raw`\n`);
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
    writeNodeOutline(get, cx, approximate, out, tokens);
    const gvShape = writeNodeShape(get, cx, approximate, out, tokens);
    if (!cx.cluster) {
        writeNodeSize(get, out);
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
 * A node's or cluster's fill and outline attributes.
 * @param get - the node's values
 * @param cx - the node's name and kind
 * @param approximate - records approximations
 * @param out - the attributes, added to
 * @param tokens - the style tokens, added to
 */
function writeNodeOutline(
    get: Get,
    cx: NodeContext,
    approximate: Approximate,
    out: Map<string, Written>,
    tokens: string[],
): void {
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
        const nearest = borderStyle.includes("dash") ? "dashed" : "solid";
        tokens.push(spelled(STROKES, borderStyle, nearest, "borderStyle", approximate));
    }
}

/**
 * A node's shape attribute; a cluster is always a rectangle, rounded or not, and any other shape is approximated.
 * @param get - the node's values
 * @param cx - the node's name and kind
 * @param approximate - records approximations
 * @param out - the attributes, added to
 * @param tokens - the style tokens, added to
 * @returns the Graphviz shape written, "" for none
 */
function writeNodeShape(
    get: Get,
    cx: NodeContext,
    approximate: Approximate,
    out: Map<string, Written>,
    tokens: string[],
): string {
    const shape = get("shape");
    if (typeof shape !== "string") {
        return "";
    }
    if (shape === "round-rectangle") {
        tokens.push("rounded");
    }
    if (cx.cluster) {
        if (shape !== "rectangle" && shape !== "round-rectangle") {
            approximate("shape", shape);
        }
        return "";
    }
    const gvShape = spelled(SHAPES, shape, shape === "vee" ? "invtriangle" : "box", "shape", approximate);
    out.set("shape", gvShape);
    return gvShape;
}

/**
 * A node's width and height, fixed so Graphviz does not grow them to fit the label.
 * @param get - the node's values
 * @param out - the attributes, added to
 */
function writeNodeSize(get: Get, out: Map<string, Written>): void {
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
    writeEdgeArrows(get, directed, approximate, out);
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
 * An edge's arrow attributes, written where they differ from the graph's own: a target arrow on a directed edge.
 * @param get - the edge's values
 * @param directed - whether the edge is directed
 * @param approximate - records approximations
 * @param out - the attributes, added to
 */
function writeEdgeArrows(get: Get, directed: boolean, approximate: Approximate, out: Map<string, Written>): void {
    const source = get("sourceArrow");
    const target = get("targetArrow");
    const tail = typeof source === "string" && source !== "none";
    const head = typeof target === "string" && target !== "none";
    const plain = directed ? head && !tail && target === "triangle" : !head && !tail;
    if (plain || (source === null && target === null)) {
        return;
    }
    let dir = "none";
    if (head && tail) {
        dir = "both";
    } else if (head) {
        dir = "forward";
    } else if (tail) {
        dir = "back";
    }
    out.set("dir", dir);
    if (head) {
        out.set("arrowhead", spelled(ARROWS, target, "normal", "targetArrow", approximate));
    }
    if (tail) {
        out.set("arrowtail", spelled(ARROWS, source, "normal", "sourceArrow", approximate));
    }
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
    const notes = new StyleNotes();
    for (const target of ["node", "edge"] as const) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const get = getter((t, p) => resolveStyles(ex, t, p as never, snapshot), target);
        const values = read[target];
        for (let i = 0; i < n; i++) {
            const want = get(i);
            const back = writtenAndReadBack(target, i, want, cx, notes);
            for (const property of DOT_STYLE_CAPABILITIES[target]) {
                const native = values[property]?.[i] ?? null;
                const w = want(property);
                if (native !== w && native === (back.get(property) ?? null)) {
                    values[property] ??= new Array<StyleValue | null>(n).fill(null);
                    values[property][i] = w;
                }
            }
        }
    }
}

/**
 * An element's values written as the writer writes them and read back as the reader reads them.
 * @param target - nodes or edges
 * @param i - the element
 * @param want - its values
 * @param cx - the elements' contexts
 * @param notes - a scratch for the notes the round trip makes
 * @returns the values read back, by property
 */
function writtenAndReadBack(
    target: StyleTarget,
    i: number,
    want: Get,
    cx: ReturnType<typeof contexts>,
    notes: StyleNotes,
): Map<string, StyleValue> {
    const ignore: Approximate = () => undefined;
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
    return back;
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
    return json.replaceAll(/\\(["\\])/g, (_m, c: string) => (c === '"' ? String.raw`\u0022` : String.raw`\u005c`));
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
 * @param onMixedDirection - the exporter's option: the direction a graph mixing both is written with
 * @returns the styled export, or null without styles
 */
export function dotStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
    onMixedDirection?: unknown,
): DotStyledExport | null {
    if (input === undefined) {
        return null;
    }
    // an export with styles checks before it writes, with the same graph and styles: work them out once
    const done = STYLED_EXPORTS.get(input);
    if (done?.snapshot === snapshot && done.onMixedDirection === onMixedDirection) {
        return done.styled;
    }
    const styled = styledExport(snapshot, input, onMixedDirection);
    STYLED_EXPORTS.set(input, { snapshot, onMixedDirection, styled });
    return styled;
}

/** The last styled export worked out for each styles input, with the graph and option it was for. */
const STYLED_EXPORTS = new WeakMap<
    ExporterStyleInput,
    { readonly snapshot: GraphSnapshot; readonly onMixedDirection: unknown; readonly styled: DotStyledExport }
>();

/**
 * Works out a DOT export with styles: dotStyledExport() without the memo.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles
 * @param onMixedDirection - the exporter's option
 * @returns the styled export
 */
function styledExport(snapshot: GraphSnapshot, input: ExporterStyleInput, onMixedDirection: unknown): DotStyledExport {
    const approximated = new StyleApproximations();
    const replaced: LossNote[] = [];
    const out = snapshot.withColumns();
    const written = onMixedDirection === "directed" || onMixedDirection === "undirected";
    const cx = contexts(snapshot, written ? onMixedDirection === "directed" : null);
    const notes = new StyleNotes();
    for (const target of ["node", "edge"] as const) {
        const table = target === "node" ? out.nodes : out.edges;
        const read = dataRead(input.rules.styles.rules, target);
        const approximate: Approximate = (property, value) => {
            approximated.add(target, property, value);
        };
        const columns = attributeColumns(snapshot, input, target, { cx, approximate, notes, read });
        replaced.push(...removeStyleAttributes(table, target, columns, read));
        setAttributeColumns(table, columns);
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
        setTagColumns(out, input);
    }
    const block = inline ? writeStyleBlock(input.rules, { inlineColumns: true, snapshot }) : input.block;
    out.graph.set(STYLE_BLOCK_NAME, [dotSafeJson(block)], { dtype: "string" });
    const losses = approximated.notes("Graphviz");
    if (inline) {
        losses.push(...styleBlockLosses(block, input.rules.styles.rules.length, "size"));
    }
    return { snapshot: out, notes: [...replaced, ...losses] };
}

/** What attributeColumns() reads besides the graph and the styles. */
interface AttributeWrite {
    /** The elements' contexts. */
    readonly cx: ReturnType<typeof contexts>;
    /** Records approximations. */
    readonly approximate: Approximate;
    /** Where an HTML name is noted. */
    readonly notes: StyleNotes;
    /** The data columns the target's rules read. */
    readonly read: ReadonlySet<string>;
}

/**
 * Every element's Graphviz attributes of a target, as columns.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles
 * @param target - nodes or edges
 * @param w - the contexts, the recorders and the columns the rules read
 * @returns the attribute columns, by name
 */
function attributeColumns(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput,
    target: StyleTarget,
    w: AttributeWrite,
): Map<string, (Written | null)[]> {
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const get = getter((t, p) => input.picture(t, p as never), target);
    const columns = new Map<string, (Written | null)[]>();
    for (let i = 0; i < n; i++) {
        const attrs =
            target === "node"
                ? nodeAttributes(get(i), w.cx.node(i), w.approximate, w.notes)
                : edgeAttributes(get(i), w.cx.edge(i).directed, w.approximate);
        // no label is written label="" (Graphviz would show the name), which a rule reading the label column
        // reads back as the empty label
        if (w.read.has(LABEL_ATTRIBUTE) && attrs.get(LABEL_ATTRIBUTE) === "" && get(i)("label") === null) {
            w.approximate("label", "");
        }
        for (const [name, value] of attrs) {
            let col = columns.get(name);
            if (col === undefined) {
                col = new Array<Written | null>(n).fill(null);
                columns.set(name, col);
            }
            col[i] = value;
        }
    }
    return columns;
}

/**
 * Removes every column Graphviz reads as how to draw: the picture writes them, so a data column of the same name (a
 * `label` attribute graphty does not draw) would draw something graphty does not. One a rule reads, whose values the
 * picture does not write, is lost to the rule, and said so.
 * @param table - the node or edge table, changed in place
 * @param target - nodes or edges
 * @param columns - the attributes the picture writes
 * @param read - the data columns the rules read
 * @returns the notes of the columns lost to a rule
 */
function removeStyleAttributes(
    table: GraphSnapshot["nodes"],
    target: StyleTarget,
    columns: ReadonlyMap<string, (Written | null)[]>,
    read: ReadonlySet<string>,
): LossNote[] {
    const attributes = target === "node" ? NODE_ATTRIBUTES : EDGE_ATTRIBUTES;
    const replaced: LossNote[] = [];
    for (const name of table.names()) {
        if (!attributes.includes(name) && name !== LABEL_ATTRIBUTE && !name.startsWith("graphty.style.")) {
            continue;
        }
        const differs = read.has(name) ? replacedRows(table, name, columns.get(name)) : 0;
        if (differs > 0) {
            replaced.push(
                Object.freeze({
                    code: DOT_ATTRIBUTE_CLASH_CODE,
                    message: `${target} column "${name}" is not written: the ${name} attribute holds what graphty draws (${String(differs)} ${target}${differs === 1 ? "" : "s"} differ)`,
                    column: name,
                    count: differs,
                }),
            );
        }
        table.remove(name);
    }
    return replaced;
}

/**
 * Sets the attribute columns the picture writes: the label with its role, numbers as f64, the rest as text.
 * @param table - the node or edge table, changed in place
 * @param columns - the attributes
 */
function setAttributeColumns(table: GraphSnapshot["nodes"], columns: ReadonlyMap<string, (Written | null)[]>): void {
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

/**
 * Sets the per-element values the rules read as `"graphty.style.<target>.<key>"` attributes.
 * @param out - the graph, changed in place
 * @param input - the styles
 */
function setTagColumns(out: GraphSnapshot, input: ExporterStyleInput): void {
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

/**
 * The data columns the rules of a target read.
 * @param rules - the rules
 * @param target - nodes or edges
 * @returns the column names
 */
function dataRead(rules: readonly StyleRule[], target: StyleTarget): Set<string> {
    const out = new Set<string>();
    for (const { ext: _ext, ...rule } of rules.filter((r) => r.target === target)) {
        JSON.stringify(rule, (_k, v: unknown) => {
            if (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === 1) {
                const { data } = v as { data?: unknown };
                if (typeof data === "string") {
                    out.add(data);
                }
            }
            return v;
        });
    }
    return out;
}

/**
 * A data column named like an attribute the export writes is not written: the exporter's `DOT_LOSS.ATTRIBUTE_CLASH`.
 */
export const DOT_ATTRIBUTE_CLASH_CODE = "W_DOT_ATTRIBUTE_CLASH";

/**
 * How many rows of a data column the attribute written in its place does not hold as it is.
 * @param table - the table
 * @param name - the column
 * @param written - the attribute's values, or undefined when none is written
 * @returns the rows that differ
 */
function replacedRows(
    table: GraphSnapshot["nodes"],
    name: string,
    written: readonly (Written | null)[] | undefined,
): number {
    const column = table.get(name);
    let n = 0;
    for (let i = 0; column !== null && i < column.length; i++) {
        const cell = column.isSet(i) ? plainCell(column.value(i)) : null;
        const w = written?.[i] ?? null;
        const text = typeof cell === "string" ? cell : JSON.stringify(cell);
        if (cell !== null && (w === null || String(w) !== text)) {
            n++;
        }
    }
    return n;
}
