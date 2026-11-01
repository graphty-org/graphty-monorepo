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
 *   carried as `labelFit: "inside"` with the label's padding (`margin`, else 8 by 4 points).
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
import { type BendPoint, canonBends, canonNodeOffsets, flattenCubic } from "../../styles/canon/bends.js";
import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber, DOT_POINTS_PER_INCH, num6 } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import {
    type DotEscapeNames,
    dotLabelAlign,
    dotLabelText,
    htmlLabelSpans,
    htmlLabelText,
    recordLabelText,
} from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { toolDefaults } from "../../styles/defaults.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import { STYLE_BLOCK_NAME, styleBlockLosses, writeStyleBlock } from "../../styles/io/block.js";
import { elementValues, takeFromBlock } from "../../styles/io/round-trip.js";
import { type ExporterStyleInput, sharedInExportCall } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
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
import {
    type GlyphPoint,
    GRAPHVIZ_GLYPH_SHAPES,
    GRAPHVIZ_POLYGON_SHAPES,
    graphvizFont,
    graphvizFontName,
    type GraphvizGlyph,
    graphvizGlyph,
    graphvizPolygonCorners,
    isGraphvizBox,
} from "./drawing.js";
import { type LabelTable, readLabelTable } from "./html-table.js";
import { type LabelPlaceContext, leftOutXlabels, readLabelPlaces } from "./label-places.js";
import { CLUSTER_COLUMN, LABEL_ATTRIBUTE, POS_ATTRIBUTE } from "./names.js";
import { layoutRecord } from "./record.js";

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
    tool: "graphviz",
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
        "labelWeight",
        "labelItalic",
        "labelPosition",
        "shapePoints",
        "shapePointsStretch",
        "shapeParts",
        "shapeLines",
        "shapeLineWidth",
        "tooltip",
        "xlabel",
        "visible",
    ] as const),
    edge: Object.freeze([
        "color",
        "opacity",
        "width",
        "lineStyle",
        "sourceArrow",
        "targetArrow",
        "sourceArrowColor",
        "targetArrowColor",
        "arrowSize",
        "label",
        "sourceLabel",
        "targetLabel",
        "xlabel",
        "labelColor",
        "labelSize",
        "labelFont",
        "labelWeight",
        "labelItalic",
        "tooltip",
        "visible",
    ] as const),
    graph: Object.freeze(["background", "rotation"] as const),
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
    "sides",
    "distortion",
    "skew",
    "orientation",
    "penwidth",
    "gradientangle",
    "fontname",
    "fontsize",
    "fontcolor",
    "tooltip",
    "xlabel",
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
    "fillcolor",
    "headlabel",
    "taillabel",
    "labelfontsize",
    "labelfontcolor",
    "labelfontname",
    "xlabel",
];

/** Attributes the reader notes as not carried. */
const NOTED_ATTRIBUTES: readonly string[] = ["peripheries"];

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
    /** Whether the graph's `rankdir` is LR or RL, which turns a record's fields top to bottom. */
    readonly flip: boolean;
    /** The graph's `quantum` in points (a node's padded label box is rounded up to a multiple of it), 0 for none. */
    readonly quantum: number;
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
 * Reads how a plain label's lines line up (`\l`, `\r`); an HTML-like or a record label lines up its own way.
 * @param raw - the label as the file gives it
 * @param names - what the label's escapes stand for
 * @param html - the file's HTML strings
 * @param record - whether the node is a record
 * @param put - receives the value
 */
function readLabelAlign(
    raw: string,
    names: DotEscapeNames,
    html: ReadonlySet<string>,
    record: boolean,
    put: Put,
): void {
    if (isHtmlString(raw) || html.has(`<${raw}>`)) {
        // each <BR ALIGN> lines up the line before it: one alignment on every break lines up the label
        const aligns = new Set(
            [...raw.matchAll(/<br\b([^>]*)>/gi)].map(
                (m) => /\balign\s*=\s*["']?(left|right|center)/i.exec(m[1])?.[1].toLowerCase() ?? "center",
            ),
        );
        // words after the last break are a line of their own, centered
        const body = isHtmlString(raw) ? raw.slice(1, -1) : raw;
        const last = /<br\b[^>]*>(?![\s\S]*<br\b)/i.exec(body);
        const tail = last === null ? "" : body.slice(last.index + last[0].length);
        if (stripTags(tail).trim() !== "") {
            aligns.add("center");
        }
        const [only] = aligns;
        if (aligns.size === 1 && only !== "center") {
            put("labelTextAlign", only);
        }
        return;
    }
    if (record) {
        return;
    }
    const align = dotLabelAlign(raw, names);
    if (align !== null) {
        put("labelTextAlign", align);
    }
}

/**
 * Text with its tags (`<` to the next `>`) dropped; a `<` with no `>` after it, and the rest, kept.
 * @param text - the text
 * @returns the text without tags
 */
function stripTags(text: string): string {
    let out = "";
    let i = 0;
    while (i < text.length) {
        const open = text.indexOf("<", i);
        const close = open < 0 ? -1 : text.indexOf(">", open + 1);
        if (close < 0) {
            return out + text.slice(i);
        }
        out += text.slice(i, open);
        i = close + 1;
    }
    return out;
}

/**
 * Reads the font runs of an HTML-like label (`<B>`, `<I>`, `<FONT COLOR FACE POINT-SIZE>`) as Graphviz draws them:
 * one run in a font of its own sets the label's own font (color, size, family, weight, slant), several are
 * `labelRuns`. Underline, overline, strike-through, `<SUB>` and `<SUP>` have no neutral slot and draw plain.
 * @param raw - the label as the file gives it
 * @param html - the file's HTML strings
 * @param scheme - the element's color scheme
 * @param put - receives the values
 * @param at - the sites
 */
function readHtmlRuns(raw: string, html: ReadonlySet<string>, scheme: string | null, put: Put, at: At): void {
    if (!isHtmlString(raw) && !html.has(`<${raw}>`)) {
        return;
    }
    const markup = isHtmlString(raw) ? raw : `<${raw}>`;
    const runs: Record<string, StyleValue>[] = [];
    for (const span of htmlLabelSpans(markup)) {
        const run = { text: span.text, ...htmlRunFont(span.tags, scheme, at("labelRuns")) };
        const last = runs.at(-1);
        if (last !== undefined && JSON.stringify({ ...last, text: "" }) === JSON.stringify({ ...run, text: "" })) {
            last.text = `${String(last.text)}${run.text}`;
        } else {
            runs.push(run);
        }
    }
    trimBlankRuns(runs);
    if (runs.every((r) => Object.keys(r).length === 1)) {
        return;
    }
    if (runs.length === 1) {
        const { text: _text, ...font } = runs[0];
        for (const [property, value] of Object.entries(font)) {
            put(RUN_PROPERTY[property], value);
        }
        return;
    }
    runs[0].text = String(runs[0].text).trimStart();
    const end = runs.at(-1);
    if (end !== undefined) {
        end.text = String(end.text).trimEnd();
    }
    put("labelRuns", JSON.stringify(runs));
}

/**
 * Drops the blank runs at a label's ends, as htmlLabelText trims its blanks.
 * @param runs - the runs, trimmed in place
 */
function trimBlankRuns(runs: Record<string, StyleValue>[]): void {
    while (runs.length > 0 && String(runs[0].text).trim() === "") {
        runs.shift();
    }
    while (runs.length > 0 && String(runs.at(-1)?.text).trim() === "") {
        runs.pop();
    }
}

/** The label property a run's own font field sets when the whole label is one run. */
const RUN_PROPERTY: Readonly<Record<string, string>> = {
    weight: "labelWeight",
    italic: "labelItalic",
    font: "labelFont",
    size: "labelSize",
    color: "labelColor",
};

/**
 * The font of a run inside HTML font tags, as `labelRuns` fields: bold, italic, and the innermost `FONT`'s face,
 * point size and color.
 * @param tags - the open tags, outermost first
 * @param scheme - the element's color scheme
 * @param site - where a bad color is noted
 * @returns the fields that differ from the label's own font
 */
function htmlRunFont(tags: readonly string[], scheme: string | null, site: CanonSite): Record<string, StyleValue> {
    const out: Record<string, StyleValue> = {};
    for (const tag of tags) {
        const name = /^<(\w+)/.exec(tag)?.[1].toLowerCase();
        if (name === "b") {
            out.weight = "bold";
        } else if (name === "i") {
            out.italic = true;
        } else if (name === "font") {
            for (const [attr, value] of tagAttributes(tag)) {
                readFontAttribute(attr.toLowerCase(), value, scheme, site, out);
            }
        }
    }
    return out;
}

/**
 * Reads one attribute of a `FONT` tag into a run's font fields: its face, point size or color.
 * @param attr - the attribute's name, lowercase
 * @param value - its value
 * @param scheme - the element's color scheme
 * @param site - where a bad color is noted
 * @param out - the run's font fields, set
 */
function readFontAttribute(
    attr: string,
    value: string,
    scheme: string | null,
    site: CanonSite,
    out: Record<string, StyleValue>,
): void {
    if (attr === "face" && value.trim() !== "" && value.length <= MAX_STYLE_VALUE_LENGTH) {
        const drawn = graphvizFont(value);
        out.font = drawn.family;
        if (drawn.bold) {
            out.weight = "bold";
        }
        if (drawn.italic) {
            out.italic = true;
        }
    } else if (attr === "point-size" && Number(value) > 0) {
        out.size = Number(value);
    } else if (attr === "color") {
        const c = canonColor(value, "graphviz", site, { scheme, use: "text" });
        if (c !== null) {
            out.color = c.color;
        }
    }
}

/** Whether a character can be part of an HTML attribute's name (a word character or `-`). */
const ATTRIBUTE_NAME_CHAR = /^[\w-]$/;

/**
 * The quoted attributes of a tag, `name = "value"` or `name = 'value'`, in order; an unquoted or unclosed value is
 * skipped. Scans the tag once (an attribute regex would backtrack on a long name with no `=`).
 * @param tag - the tag
 * @returns each attribute's name and value
 */
function tagAttributes(tag: string): [string, string][] {
    const attributes: [string, string][] = [];
    let i = 0;
    while (i < tag.length) {
        if (!ATTRIBUTE_NAME_CHAR.test(tag[i])) {
            i++;
            continue;
        }
        let end = i;
        while (end < tag.length && ATTRIBUTE_NAME_CHAR.test(tag[end])) {
            end++;
        }
        const value = quotedValueAt(tag, end);
        if (value !== null) {
            attributes.push([tag.slice(i, end), value.text]);
        }
        i = value === null ? end : value.next;
    }
    return attributes;
}

/**
 * The quoted value of an attribute whose name ends at `at`: blanks, `=`, blanks, then text between matching quotes.
 * @param tag - the tag
 * @param at - where the name ends
 * @returns the value and where reading goes on after its closing quote, or null when there is none
 */
function quotedValueAt(tag: string, at: number): { text: string; next: number } | null {
    let i = at;
    while (i < tag.length && /\s/.test(tag[i])) {
        i++;
    }
    if (tag[i] !== "=") {
        return null;
    }
    i++;
    while (i < tag.length && /\s/.test(tag[i])) {
        i++;
    }
    const quote = tag[i];
    const close = quote === '"' || quote === "'" ? tag.indexOf(quote, i + 1) : -1;
    return close < 0 ? null : { text: tag.slice(i + 1, close), next: close + 1 };
}

/**
 * Reads a color into a property and its alpha into the property's opacity.
 * @param raw - the color
 * @param scheme - the object's color scheme
 * @param use - how Graphviz draws it
 * @param property - the color property
 * @param opacity - its opacity property, or null when the alpha is dropped (an outline's is its borderOpacity)
 * @param put - receives the values
 * @param at - the sites
 * @returns the alpha, or null when the color is absent
 */
function readColor(
    raw: string | null,
    scheme: string | null,
    use: "line" | "text" | "fill" | "edge",
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
    if (property === "borderColor") {
        // a transparent outline is no outline (the caller sets its width to 0); a part-transparent one is drawn so
        put("borderOpacity", c.alpha > 0 && c.alpha < 1 ? c.alpha : null);
    } else if (opacity !== null) {
        put(opacity, c.alpha);
    } else {
        // any other alpha is dropped, noted
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
    // Graphviz takes `invisible` for `invis` too (emit.c `parse_style`)
    if (tokens.includes("invis") || tokens.includes("invisible")) {
        put("visible", false);
    }
    // a part-transparent font color draws its text so (`#377eb880`); an opaque one needs no opacity
    const putFont: Put = (property, value) => {
        put(property, property === "labelOpacity" && value === 1 ? null : value);
    };
    readColor(nonEmpty(get("fontcolor")), scheme, "text", "labelColor", "labelOpacity", putFont, at);
    const size = get("fontsize");
    put("labelSize", size === null ? null : canonNumber(size, at("labelSize")));
    const font = get("fontname");
    if (font !== null && font.length <= MAX_STYLE_VALUE_LENGTH) {
        const drawn = graphvizFont(font);
        put("labelFont", drawn.family);
        put("labelWeight", drawn.bold ? "bold" : null);
        put("labelItalic", drawn.italic ? true : null);
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
    /** The frame of the table its HTML-like label is, or null when the label is not a table. */
    readonly table: HtmlTableFrame | null;
}

/** The frame Graphviz draws round an HTML-like table label (lib/common/htmltable.c), in points. */
interface HtmlTableFrame {
    /** `BORDER`: the width of the table's outline, 1 when not given. */
    readonly border: number;
    /** The table's rows and cells, as the neutral `labelTable` value. */
    readonly cells: LabelTable;
    /** `COLOR`, or null for the node's pen color. */
    readonly color: string | null;
    /** `STYLE`, lowercase. */
    readonly style: string;
    /** `WIDTH` and `HEIGHT`: the least size of the table, or null. */
    readonly width: number | null;
    readonly height: number | null;
}

/**
 * The frame of a label that is an HTML-like table, perhaps inside font tags (Graphviz's `fonttable`); null for any
 * other label, with its rows and cells.
 * @param label - the `label` attribute, or null
 * @param html - the file's HTML strings
 * @param scheme - the node's color scheme, for its cells' font colors
 * @param site - where a bad font color is noted
 * @returns the frame, or null
 */
function htmlTableFrame(
    label: string | null,
    html: ReadonlySet<string>,
    scheme: string | null,
    site: CanonSite,
): HtmlTableFrame | null {
    if (label === null || (!isHtmlString(label) && !html.has(`<${label}>`))) {
        return null;
    }
    const attrs = tableAttributes(isHtmlString(label) ? label.slice(1, -1) : label);
    if (attrs === null) {
        return null;
    }
    // Graphviz reads each as a whole number (strtol, so "1.5" is 1) in its range (lib/common/htmllex.c); an empty
    // value or one outside the range is ignored, so the default holds
    const length = (name: string, fallback: number, min = 0, max = 255): number => {
        const v = Number.parseInt(attrs.get(name) ?? "", 10);
        return Number.isFinite(v) && v >= min && v <= max ? v : fallback;
    };
    const border = length("border", 1);
    const size = (name: string): number | null => {
        const v = length(name, 0, 0, 65535);
        return v > 0 ? v : null;
    };
    const tagAttrs = (tag: string): Map<string, string> =>
        new Map(tagAttributes(tag).map(([k, v]) => [k.toLowerCase(), v]));
    const markup = isHtmlString(label) ? label.slice(1, -1) : label;
    const cells = readLabelTable(
        markup,
        tagAttrs,
        (tags) => htmlRunFont(tags, scheme, site),
        (value) => {
            const c = canonColor(value, "graphviz", site, { scheme, use: "fill" });
            return c === null || c.alpha <= 0 ? null : c.color;
        },
    );
    if (cells === null) {
        return null;
    }
    return {
        border,
        cells,
        color: nonEmpty(attrs.get("color") ?? null),
        style: (attrs.get("style") ?? "").toLowerCase(),
        width: size("width"),
        height: size("height"),
    };
}

/** The font tags a table label may sit inside (Graphviz's `fonttable`). */
const TABLE_WRAPPERS: ReadonlySet<string> = new Set(["font", "b", "i", "u", "o", "s"]);

/**
 * The attributes of the table an HTML-like label is, by lowercase name; null when the label is not a table (perhaps
 * inside font tags). Read in one pass, without a backtracking pattern.
 * @param markup - the label without its outer brackets
 * @returns the attributes, or null
 */
function tableAttributes(markup: string): Map<string, string> | null {
    let at = 0;
    for (;;) {
        while (at < markup.length && (markup.codePointAt(at) ?? 0) <= 0x20) {
            at++;
        }
        const end = markup.indexOf(">", at);
        if (markup[at] !== "<" || end < 0) {
            return null;
        }
        const tag = markup.slice(at + 1, end);
        const name = (tag.split(/[\s/]/, 1)[0] ?? "").toLowerCase();
        if (name === "table") {
            return new Map(tagAttributes(tag.slice(name.length)).map(([k, v]) => [k.toLowerCase(), v]));
        }
        if (!TABLE_WRAPPERS.has(name)) {
            return null;
        }
        at = end + 1;
    }
}

/**
 * Whether a node draws its table's outline: a table with a border that is not invisible, on a node whose box is the
 * table's -- `plain`, or `plaintext` / `none` with a margin of 0 and a least size no larger than the table's.
 * @param n - the node
 * @returns true when it does
 */
function drawsTableOutline(n: NodeRead): n is NodeRead & { readonly table: HtmlTableFrame } {
    const { table, shape, get } = n;
    if (table === null || table.border <= 0 || table.style.includes("invis")) {
        return false;
    }
    if (shape === "plain") {
        return true;
    }
    // ponytail: with a margin or a least size larger than the table, Graphviz draws the border inside the node's
    // box, which graphty cannot draw yet (it draws the node's box), so it draws none
    // no margin (or an empty one) is Graphviz's 8 by 4 points
    const margin = (get("margin") ?? "")
        .split(",")
        .filter((text) => text.trim() !== "")
        .map(Number)
        .filter(isLength);
    const least = nodeLeastSize(get, shape);
    return (
        margin.length > 0 &&
        margin.every((m) => m === 0) &&
        least.w <= (table.width ?? 0) &&
        least.h <= (table.height ?? 0)
    );
}

/**
 * A node's own least size in points before it grows to hold its label: its `width` and `height`, else Graphviz's
 * default; `plain` is 0 by 0.
 * @param get - the node's attributes
 * @param shape - its shape, lowercase
 * @returns the least width and height
 */
function nodeLeastSize(get: Attr, shape: string): { w: number; h: number } {
    const own = (attr: string, fallback: number): number => {
        const v = Number(get(attr) ?? Number.NaN);
        if (shape === "plain") {
            return 0;
        }
        return isLength(v) ? v * DOT_POINTS_PER_INCH : fallback;
    };
    return { w: own("width", DEFAULT_NODE_SIZE.w), h: own("height", DEFAULT_NODE_SIZE.h) };
}

/**
 * Reads a node's label and, for a node that is not a cluster, its size and how it grows to hold the label.
 * @param n - the node
 * @param names - what the label's escapes stand for
 */
function readNodeLabelAndSize(n: NodeRead, names: DotEscapeNames): void {
    const { get, cx, put, at, shape } = n;
    // label: a node shows its name unless it has a label (the tool-default rule); a cluster and a point show none
    const label = n.point ? null : get(LABEL_ATTRIBUTE);
    const shown = label === null ? cx.name : labelText(label, names, cx.html, RECORD.has(shape), at("label"));
    readNodeLabel(n, label, shown, names);
    // plain is its label alone at size 0: with an empty label Graphviz draws nothing, filled or not; an HTML label
    // with no words (a table holding an IMG) still draws its cells
    const htmlLabel = label !== null && (isHtmlString(label) || cx.html.has(`<${label}>`));
    if (shape === "plain" && shown === "" && !htmlLabel) {
        put("visible", false);
    }
    if (cx.cluster) {
        readClusterBox(get, put);
    } else {
        readNodeSize(n, label, shown, htmlLabel, names);
    }
}

/**
 * Reads a node's label, its alignment and runs, and where it sits.
 * @param n - the node
 * @param label - its label, or null when it has none
 * @param shown - the text it shows
 * @param names - what the label's escapes stand for
 */
function readNodeLabel(n: NodeRead, label: string | null, shown: string, names: DotEscapeNames): void {
    const { get, cx, put, at, shape } = n;
    // a cluster has no label of its own unless one is given, so an empty one is none
    if (label !== null && !(cx.cluster && label === "")) {
        put("label", shown);
        readLabelAlign(label, names, cx.html, RECORD.has(shape), put);
        readHtmlRuns(label, cx.html, n.scheme, put, at);
        if (n.table !== null) {
            // a text line set as Graphviz sets it; a cell sized by its picture counts each of its pixels as Graphviz does
            put("labelTable", JSON.stringify({ ...n.table.cells, ...HTML_LINE, imagePixel: IMAGE_POINTS_PER_PIXEL }));
        }
        if (cx.cluster) {
            put("labelPosition", clusterLabelPosition(get));
            readClusterLabelPlace(get, put);
        }
    }
    if (!cx.cluster && !n.point) {
        const position = nodeLabelPosition(get);
        put("labelPosition", position === "center" ? null : position);
    }
}

/**
 * Reads the size of a node that is not a cluster and how it grows to hold its label (a record's fields, or its
 * label's fit).
 * @param n - the node
 * @param label - its label, or null when it has none
 * @param shown - the text it shows
 * @param htmlLabel - whether the label is HTML-like
 * @param names - what the label's escapes stand for
 */
function readNodeSize(
    n: NodeRead,
    label: string | null,
    shown: string,
    htmlLabel: boolean,
    names: DotEscapeNames,
): void {
    const { get, put, at, shape } = n;
    readSize(get, shape, n.point, put, at);
    if (RECORD.has(shape) && label !== null && !htmlLabel) {
        readRecord(n, label, names);
    } else if (!n.point) {
        readLabelFit(get, shape, label, shown, n.table, put);
        readQuantum(n, label);
    }
}

/** Graphviz's default node width and height, in points (0.75 and 0.5 inch). */
const DEFAULT_NODE_SIZE = { w: 54, h: 36 } as const;

/**
 * Reads a record node as Graphviz lays it out: its size (at least its fields' unless `fixedsize`), the dividers
 * between its fields as lines over the node, and each field's text lines where Graphviz centers or justifies them,
 * in place of one label.
 * @param n - the node
 * @param label - its record label
 * @param names - what the label's escapes stand for
 */
function readRecord(n: NodeRead, label: string, names: DotEscapeNames): void {
    const { get, put, at, cx } = n;
    const pt = (attr: string, fallback: number): number => {
        const v = inches(get(attr), at(attr === "width" ? "width" : "height"));
        return v === null ? fallback : v * DOT_POINTS_PER_INCH;
    };
    const size = Number(get("fontsize") ?? 14);
    const lay = layoutRecord(
        label,
        !cx.flip,
        pt("width", DEFAULT_NODE_SIZE.w),
        pt("height", DEFAULT_NODE_SIZE.h),
        isTrue(get("fixedsize")),
        Number.isFinite(size) && size > 0 ? size : 14,
        (line) => dotLabelText(line, names),
    );
    const hw = lay.width / 2;
    const hh = lay.height / 2;
    const fx = (x: number): string => String(num6(hw > 0 ? x / hw : 0));
    const fy = (y: number): string => String(num6(hh > 0 ? y / hh : 0));
    put("width", num6(lay.width));
    put("height", num6(lay.height));
    put("label", "");
    put(
        "shapeLines",
        lay.dividers.length === 0
            ? null
            : lay.dividers.map(([x0, y0, x1, y1]) => `${fx(x0)},${fy(y0)} ${fx(x1)},${fy(y1)}`).join("; "),
    );
    put(
        "shapeTexts",
        lay.texts.length === 0
            ? null
            : JSON.stringify(lay.texts.map((t) => [Number(fx(t.x)), Number(fy(t.y)), t.text])),
    );
}

/**
 * Reads a laid-out cluster's size from its `bb` ("llx,lly,urx,ury" in points), the box Graphviz draws round its
 * members and its label; a cluster with no `bb` is drawn round its members.
 * @param get - the cluster's attributes
 * @param put - receives the values
 */
function readClusterBox(get: Attr, put: Put): void {
    const parts = (get("bb") ?? "").split(",").map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] >= parts[0] && parts[3] >= parts[1]) {
        put("width", num6(parts[2] - parts[0]));
        put("height", num6(parts[3] - parts[1]));
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
        table: cx.cluster ? null : htmlTableFrame(get(LABEL_ATTRIBUTE), cx.html, get("colorscheme"), at("labelTable")),
    };
    // in a node's label \E stands for nothing (measured with dot 2.43); \T and \H stand for their letters
    const names: DotEscapeNames = cx.cluster ? { graph: cx.name } : { node: cx.name, graph: cx.graph, edge: "" };
    readCommon(get, tokens, n.scheme, names, put, at);
    if (cx.cluster) {
        readClusterFill(n);
    } else {
        readNodeFill(n);
    }
    readNodeBands(n);
    readNodeOutline(n);
    readNodeShape(n);
    readNodeLabelAndSize(n, names);
    readNodeImage(n);
}

/** Where `imagepos` puts a node's image, 0 to 1 across and down, by its first and second letter. */
const IMAGE_POS: Readonly<Record<string, number>> = { t: 0, m: 0.5, b: 1, l: 0, c: 0.5, r: 1 };

/**
 * Reads a node's picture (`image`, its file as written): how it is scaled (`imagescale`: false draws it at its own
 * size, true keeps its proportions inside the node, both stretches it, width or height stretches that side only) and
 * where it sits (`imagepos`, `tl` to `br`; unset, the middle). https://graphviz.org/docs/attrs/image/
 * @param n - the node
 */
function readNodeImage(n: NodeRead): void {
    const { get, put } = n;
    const src = nonEmpty(get("image"));
    if (src === null || n.point || n.cx.cluster) {
        return;
    }
    put("image", src);
    const scale = (get("imagescale") ?? "").trim().toLowerCase();
    const least = nodeLeastSize(get, n.shape);
    if (scale === "true" || scale === "yes") {
        put("imageFit", "contain");
    } else if (scale === "both") {
        put("imageFit", "fill");
    } else {
        put("imageFit", "none");
        // the stretched side reaches across the node; the other keeps the picture's own size
        if (scale === "width" || scale === "height") {
            put(scale === "width" ? "imageWidth" : "imageHeight", num6(scale === "width" ? least.w : least.h));
            put("imageAutoSize", "natural");
        }
    }
    const pos = (get("imagepos") ?? "").trim().toLowerCase();
    const [y, x] = [IMAGE_POS[pos[0]], IMAGE_POS[pos[1]]];
    if (pos.length === 2 && "tmb".includes(pos[0]) && "lcr".includes(pos[1])) {
        put("imagePositionX", x);
        put("imagePositionY", y);
    }
    readNodeImageFit(n);
}

/** How long one of a picture's pixels is when Graphviz sizes something by it, in points: 96 pixels an inch. */
const IMAGE_POINTS_PER_PIXEL = 0.75;

/**
 * A node that is not `fixedsize` grows round its picture as round its label (Graphviz's `poly_init`): the picture's
 * own size, 2 points more each way ("some fixed padding"), and the larger of that and the padded label decides. A
 * node with no words pads nothing but its picture.
 * @param n - the node
 */
function readNodeImageFit(n: NodeRead): void {
    const { get, put, shape } = n;
    if (isTrue(get("fixedsize")) || RECORD.has(shape)) {
        return;
    }
    put("labelFitImage", IMAGE_POINTS_PER_PIXEL);
    put("labelFitImagePadding", 1);
    if (get(LABEL_ATTRIBUTE) === "") {
        put("labelFit", GRAPHVIZ_GLYPH_SHAPES.has(shape) || shape === "cylinder" ? "bounds" : "inside");
        put("labelPaddingX", 0);
        put("labelPaddingY", 0);
        if (CIRCLE_LIKE.has(shape) || isTrue(get("regular"))) {
            put("labelFitSquare", true);
        }
    }
}

/**
 * Reads a node's external label (`xlabel`), drawn outside it in its label's face, and where a laid-out file stored it
 * (`xlp`, its center, kept only beside the node's stored `pos`) as an offset from the node's center, y down.
 * @param get - the node's attributes
 * @param cx - its name and the file's HTML strings
 * @param center - its stored center, in points, y up; null when the file stores none
 * @param put - receives the values
 * @param at - the sites
 * @param leftOut - whether Graphviz leaves the label out (`forcelabels=false` and no room; leftOutXlabels())
 */
function readNodeXlabel(
    get: Attr,
    cx: NodeContext,
    center: readonly number[] | null,
    put: Put,
    at: At,
    leftOut: boolean,
): void {
    const raw = nonEmpty(get("xlabel"));
    if (cx.cluster || raw === null || leftOut) {
        return;
    }
    const names: DotEscapeNames = { node: cx.name, graph: cx.graph, edge: "" };
    put("xlabel", labelText(raw, names, cx.html, false, at("xlabel")));
    const [px, py] = center ?? [];
    const [lx, ly] = (get("xlp") ?? "").split(",").map(Number);
    if ([px, py, lx, ly].every(Number.isFinite)) {
        put("xlabelOffsetX", num6(lx - px));
        put("xlabelOffsetY", num6(py - ly));
    }
}

/**
 * Where a node's label sits: its `labelloc` puts it against the top or bottom of the node's box, inside it; it is
 * centered by default.
 * @param get - the node's attributes
 * @returns the position
 */
function nodeLabelPosition(get: Attr): "inside-top" | "inside-bottom" | "center" {
    const loc = (get("labelloc") ?? "").trim().toLowerCase();
    if (loc.startsWith("t")) {
        return "inside-top";
    }
    return loc.startsWith("b") ? "inside-bottom" : "center";
}

/** How far in from the cluster's side Graphviz draws a label justified left or right: half its label's padding. */
const CLUSTER_LABEL_INSET = 8;

/**
 * Where Graphviz draws a cluster's label beyond its position: at a stored `lp` (its center) inside the cluster's
 * `bb`, else `CLUSTER_LABEL_INSET` points in from the side `labeljust` puts it against.
 * @param get - the cluster's attributes
 * @param put - receives the values
 */
function readClusterLabelPlace(get: Attr, put: Put): void {
    const lp = (get("lp") ?? "").split(",").map(Number);
    const bb = (get("bb") ?? "").split(",").map(Number);
    if (lp.length === 2 && bb.length === 4 && [...lp, ...bb].every(Number.isFinite)) {
        put("labelPosition", "center");
        put("labelOffsetX", num6(lp[0] - (bb[0] + bb[2]) / 2));
        put("labelOffsetY", num6((bb[1] + bb[3]) / 2 - lp[1]));
        return;
    }
    const just = (get("labeljust") ?? "").trim().toLowerCase();
    if (just.startsWith("l")) {
        put("labelOffsetX", CLUSTER_LABEL_INSET);
    } else if (just.startsWith("r")) {
        put("labelOffsetX", -CLUSTER_LABEL_INSET);
    }
}

/**
 * Where a cluster's label sits: inside the cluster's box (Graphviz grows the box to hold it), at the top unless
 * `labelloc` is `b`, centered unless `labeljust` is `l` or `r`.
 * @param get - the cluster's attributes
 * @returns the position
 */
function clusterLabelPosition(
    get: Attr,
): `inside-${"top" | "top-left" | "top-right" | "bottom" | "bottom-left" | "bottom-right"}` {
    const loc = (get("labelloc") ?? "").trim().toLowerCase().startsWith("b") ? "inside-bottom" : "inside-top";
    const just = (get("labeljust") ?? "").trim().toLowerCase();
    if (just.startsWith("l")) {
        return `${loc}-left`;
    }
    return just.startsWith("r") ? `${loc}-right` : loc;
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
    if (!tokens.includes("striped")) {
        readFillGradient(n, raw);
    }
}

/**
 * Reads a gradient fill (`fillcolor="a:b"`, `gradientangle`): Graphviz runs it from the list's first color to
 * its second, `gradientangle` degrees counter-clockwise from left to right (0 by default), which is the neutral
 * angle's clockwise turn negated, from 0 up to 360. `style=radial` runs it out from the middle instead. A second color
 * left out is black; colors after the second are not drawn. A first color's `;fraction` makes Graphviz switch colors
 * at that fraction, which its SVG writes as stops at the fraction less 0.001 and at the fraction.
 * @param n - the node or cluster
 * @param raw - its fill color value
 */
function readFillGradient(n: NodeRead, raw: string | null): void {
    const colon = raw === null ? -1 : raw.indexOf(":");
    if (raw === null || colon < 0) {
        return;
    }
    const radial = n.tokens.includes("radial");
    if (radial) {
        // ponytail: a radial gradientangle moves Graphviz's focus off the middle; graphty's radial ramp has no focus
        n.put("fillGradientKind", "radial");
    }
    const frac = Number(raw.slice(0, colon).split(";")[1]);
    if (frac > 0 && frac < 1) {
        n.put("fillGradientStops", `${String(num6(frac - 0.001))} ${String(num6(frac))}`);
    }
    const second = raw
        .slice(colon + 1)
        .split(":")[0]
        .split(";")[0];
    const c = canonColor(second === "" ? "black" : second, "graphviz", n.at("fillGradient"), {
        scheme: n.scheme,
        use: "fill",
    });
    if (c === null) {
        return;
    }
    n.put("fillGradient", c.color);
    if (radial) {
        return;
    }
    const angle = Number(nonEmpty(n.get("gradientangle")) ?? "0");
    // 0 up to 360: the neutral angle turns clockwise on screen, Graphviz's counter-clockwise
    const turned = Number.isFinite(angle) ? ((-angle % 360) + 360) % 360 : 0;
    n.put("fillGradientAngle", num6(turned) + 0);
}

/**
 * Reads a node's fill: a point is always filled; a striped fill fills a box and a wedged one an ellipse only.
 * @param n - the node
 */
function readNodeFill(n: NodeRead): void {
    const { point } = n;
    const fillcolor = nonEmpty(n.get("fillcolor"));
    if (isFilled(n)) {
        const raw = fillcolor ?? n.color ?? (point ? "black" : "lightgrey");
        readColor(raw, n.scheme, "fill", "fill", "fillOpacity", n.put, n.at);
        // stripes on a box and wedges on an ellipse take the color list in place of a gradient
        const banded =
            (n.tokens.includes("striped") && BOX_LIKE.has(n.shape)) ||
            (n.tokens.includes("wedged") && ELLIPSE_LIKE.has(n.shape));
        if ((n.tokens.includes("filled") || n.tokens.includes("radial")) && !banded) {
            readFillGradient(n, raw);
        }
    } else if (fillcolor !== null) {
        noteAt(n.at("fill"), STYLE_ISSUE.UNFILLED, fillcolor.slice(0, MAX_STYLE_VALUE_LENGTH));
    }
}

/**
 * Reads a node's striped or wedged fill (`style=striped` on a box, `style=wedged` on an ellipse) from its color
 * list, `color;fraction` separated by `:`: a color with no fraction shares what the others leave, the last color takes
 * what sized colors leave when none is unsized, and the shares stop at the whole
 * (https://graphviz.org/docs/attr-types/colorList/). Graphviz draws stripes left to right and
 * wedges counter-clockwise from 3 o'clock, which is the same pie as the wedges in reverse order clockwise from there.
 * @param n - the node
 */
function readNodeBands(n: NodeRead): void {
    // a cluster is a box, so it takes stripes too (and never wedges)
    const striped = n.tokens.includes("striped") && (n.cx.cluster || BOX_LIKE.has(n.shape));
    const wedged = !n.cx.cluster && n.tokens.includes("wedged") && ELLIPSE_LIKE.has(n.shape);
    const list = nonEmpty(n.get("fillcolor")) ?? n.color;
    if ((!striped && !wedged) || !list?.includes(":")) {
        return;
    }
    const bands = colorBands(list, n.scheme, "fill", n.at(striped ? "stripeColors" : "pieColors"));
    if (bands.length === 0) {
        return;
    }
    const order = striped ? bands : [...bands].reverse();
    const prefix = striped ? "stripe" : "pie";
    n.put(`${prefix}Colors`, order.map((b) => b.color).join(" "));
    n.put(`${prefix}Sizes`, order.map((b) => String(b.size)).join(" "));
    if (striped) {
        n.put("stripeDirection", "right");
    } else {
        n.put("pieFitBox", true);
        n.put("pieRotation", 90);
    }
}

/**
 * The bands of a Graphviz color list (`color;fraction` separated by `:`), in order: a color with no fraction shares
 * what the others leave, the last color takes what sized colors leave when none is unsized, and the shares stop at
 * the whole (https://graphviz.org/docs/attr-types/colorList/, emit.c `parseSegs`).
 * @param list - the color list
 * @param scheme - the color scheme
 * @param use - how Graphviz draws the colors
 * @param site - where it was read
 * @returns each band's color and share of the whole
 */
function colorBands(
    list: string,
    scheme: string | null,
    use: "fill" | "edge",
    site: CanonSite,
): { color: string; size: number }[] {
    const parts = list.split(":").map((part) => {
        const [color, fraction] = part.split(";");
        const c = canonColor(color.trim(), "graphviz", site, { scheme, use });
        const f = fraction === undefined ? Number.NaN : Number(fraction);
        return { color: c?.color ?? null, fraction: Number.isFinite(f) && f >= 0 ? f : null };
    });
    const kept = parts.flatMap((p) => (p.color === null ? [] : [{ color: p.color, fraction: p.fraction }]));
    const given = kept.reduce((sum, p) => sum + (p.fraction ?? 0), 0);
    const unsized = kept.filter((p) => p.fraction === null).length;
    const share = unsized > 0 ? Math.max(0, 1 - given) / unsized : 0;
    let used = 0;
    const bands = kept.flatMap((p) => {
        const size = Math.min(p.fraction ?? share, 1 - used);
        used += Math.max(size, 0);
        return size > 0 ? [{ color: p.color, size: num6(size) }] : [];
    });
    // every color sized and short of the whole: Graphviz gives what is left to the last one (emit.c parseSegs)
    const last = bands.at(-1);
    if (last !== undefined && unsized === 0 && used < 1) {
        last.size = num6(last.size + 1 - used);
    }
    return bands;
}

/**
 * Whether Graphviz fills a node: a point always; `filled` and `radial` any shape, `striped` a box and `wedged` an
 * ellipse only.
 * @param n - the node
 * @returns true when its box or shape is filled
 */
function isFilled(n: NodeRead): boolean {
    const { shape, point } = n;
    return (
        point ||
        n.tokens.some(
            (t) =>
                t === "filled" ||
                t === "radial" ||
                (t === "striped" && BOX_LIKE.has(shape)) ||
                (t === "wedged" && ELLIPSE_LIKE.has(shape)),
        )
    );
}

/**
 * Reads a node's or cluster's outline: its color, width and dashes.
 * @param n - the node
 */
function readNodeOutline(n: NodeRead): void {
    const { get, cx, put, at, tokens } = n;
    if (!cx.cluster && NO_OUTLINE.has(n.shape)) {
        if (drawsTableOutline(n)) {
            readTableOutline(n);
            return;
        }
        put("borderWidth", 0);
    } else {
        const outline = cx.cluster ? (nonEmpty(get("pencolor")) ?? n.color) : n.color;
        const alpha = readColor(outline, n.scheme, "line", "borderColor", null, put, at);
        const width = nonEmpty(get("penwidth")) ?? setLineWidth(tokens);
        // peripheries=0 draws no outline, on a node and on a cluster alike
        if (alpha === 0 || Number(nonEmpty(get("peripheries")) ?? "1") === 0) {
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
    if (!cx.cluster) {
        readNodeRings(n);
    }
}

/**
 * The outline of a node whose shape draws none (`plain`, `plaintext`, `none`) and whose label is an HTML-like table
 * with an outline: the table's border, in the table's color (else the node's pen color) and its dashes. The node's
 * own `penwidth` and dashes do not reach the table.
 * @param n - the node
 */
function readTableOutline(n: NodeRead & { readonly table: HtmlTableFrame }): void {
    const { put, at, table } = n;
    const alpha = readColor(table.color ?? n.color, n.scheme, "line", "borderColor", null, put, at);
    put("borderWidth", alpha === 0 ? 0 : table.border);
    if (table.style.includes("dashed")) {
        put("borderStyle", "dashed");
    } else if (table.style.includes("dotted")) {
        put("borderStyle", "dotted");
    }
}

/** The outlines Graphviz draws round a node of these shapes when `peripheries` is not set. */
export const SHAPE_PERIPHERIES: ReadonlyMap<string, number> = new Map([
    ["doublecircle", 2],
    ["doubleoctagon", 2],
    ["tripleoctagon", 3],
]);

/** How far apart Graphviz draws a node's outlines, center to center (`GAP`, lib/common/shapes.c). */
export const PERIPHERY_GAP = 4;

/**
 * Reads a node's further outlines (`peripheries=2` and up, `doublecircle`, `tripleoctagon`): Graphviz draws each
 * `PERIPHERY_GAP` points outside the one before, in the same color, width and dashes.
 * @param n - the node
 */
function readNodeRings(n: NodeRead): void {
    const raw = nonEmpty(n.get("peripheries"));
    const count = raw === null ? (SHAPE_PERIPHERIES.get(n.shape) ?? 1) : Math.trunc(Number(raw));
    if (Number.isNaN(count) || count <= 1 || NO_OUTLINE.has(n.shape)) {
        return;
    }
    const c =
        n.color === null
            ? null
            : canonColor(n.color, "graphviz", n.at("outerBorderColor"), {
                  scheme: n.scheme,
                  use: "line",
              });
    if (c !== null && c.alpha === 0) {
        return;
    }
    const widthRaw = nonEmpty(n.get("penwidth")) ?? setLineWidth(n.tokens);
    const parsed = widthRaw === null ? Number.NaN : Number(widthRaw);
    const unset = n.tokens.includes("bold") ? 2 : 1;
    const pen = Number.isFinite(parsed) ? Math.max(0, parsed) : unset;
    n.put("outerBorderColor", c?.color ?? "#000000");
    n.put("outerBorderOpacity", c !== null && c.alpha < 1 ? c.alpha : null);
    n.put("outerBorderWidth", num6(pen));
    // the gap between the outline's outer edge and the ring's inner edge
    n.put("outerBorderOffset", num6(Math.max(0, PERIPHERY_GAP - pen)));
    if (n.tokens.includes("dashed") || n.tokens.includes("dotted")) {
        n.put("outerBorderStyle", n.tokens.includes("dashed") ? "dashed" : "dotted");
    }
    if (count > 2) {
        n.put("outerBorderCount", count - 1);
    }
}

/**
 * Reads a node's or cluster's shape: a cluster is a rectangle, rounded by the `rounded` style as a box is. Graphviz draws
 * a striped box with square corners whatever `rounded` says.
 * @param n - the node
 */
function readNodeShape(n: NodeRead): void {
    const rounded = n.tokens.includes("rounded") && !n.tokens.includes("striped");
    const turned = turnedPolygon(n);
    if (n.cx.cluster) {
        n.put("shape", rounded ? "round-rectangle" : "rectangle");
    } else if (n.shape === "polygon") {
        readPolygon(n, rounded);
    } else if (turned !== null) {
        n.put("shape", "polygon");
        n.put("shapePoints", cornersText(graphvizDrawnCorners(turned)));
        n.put("shapePointsStretch", false);
    } else if (NAMED_OUTLINES.has(n.shape)) {
        n.put("shape", "polygon");
        n.put("shapePoints", NAMED_OUTLINES.get(n.shape) ?? null);
        // a polygon shape's corners are where Graphviz draws them, one reaching past its box too
        n.put("shapePointsStretch", false);
    } else if (GRAPHVIZ_GLYPH_SHAPES.has(n.shape)) {
        const size = (name: string): number | null => {
            const v = inches(n.get(name), n.at(name));
            return v === null ? null : v * DOT_POINTS_PER_INCH;
        };
        putGlyph(
            n.shape,
            size("width"),
            size("height"),
            n.put,
            () => {
                const raw = nonEmpty(n.get("penwidth")) ?? setLineWidth(n.tokens);
                const pen = raw === null ? Number.NaN : Number(raw);
                if (Number.isFinite(pen)) {
                    return Math.max(0, pen);
                }
                return n.tokens.includes("bold") ? 2 : 1;
            },
            () =>
                n.color === null
                    ? null
                    : (canonColor(n.color, "graphviz", n.at("outerBorderColor"), { scheme: n.scheme, use: "line" })
                          ?.color ?? null),
        );
    } else if (n.shapeRaw !== null) {
        const shape =
            rounded && BOX_LIKE.has(n.shape)
                ? "round-rectangle"
                : canonEnum("shape", n.shapeRaw, "graphviz", n.at("shape"));
        // a filled shape=none is its box filled, with no outline (its border is 0): a rectangle, not a node with no body
        // so is a shape=none whose label is a table with an outline: the table's box
        n.put("shape", shape === "none" && (isFilled(n) || drawsTableOutline(n)) ? "rectangle" : shape);
    }
}

/** The polygon shapes `orientation` turns, by their own sides and orientation (`shapes.c`). */
const TURNABLE_POLYGONS: ReadonlyMap<string, { readonly sides: number; readonly orientation: number }> = new Map([
    ...[...BOX_LIKE].map((name) => [name, { sides: 4, orientation: 0 }] as const),
    ["diamond", { sides: 4, orientation: 45 }],
    ["hexagon", { sides: 6, orientation: 0 }],
    ["octagon", { sides: 8, orientation: 0 }],
]);

/**
 * The polygon a named polygon shape is when its `orientation` turns it off its own axes (a box turned 30 degrees),
 * or null when it is drawn as its shape: Graphviz adds the attribute to the shape's own orientation.
 * @param n - the node
 * @returns the polygon, or null
 */
function turnedPolygon(n: NodeRead): Parameters<typeof graphvizPolygonCorners>[0] | null {
    const turn = Number(nonEmpty(n.get("orientation")) ?? "0");
    const own = TURNABLE_POLYGONS.get(n.shape) ?? GRAPHVIZ_POLYGON_SHAPES.get(n.shape);
    if (own === undefined || !Number.isFinite(turn) || turn % 360 === 0) {
        return null;
    }
    const polygon = {
        distortion: 0,
        skew: 0,
        ...own,
        orientation: own.orientation + Math.max(-360, turn),
    };
    // a quarter turn of a box is a box again
    return isGraphvizBox(polygon) ? null : polygon;
}

/**
 * Reads a `shape=polygon` node: a box when it is one (four sides, no distortion or skew, square to the axes), an
 * ellipse below three sides, else its corners as Graphviz places them.
 * @param n - the node
 * @param rounded - whether its style rounds a box's corners
 */
function readPolygon(n: NodeRead, rounded: boolean): void {
    const number = (name: string, fallback: number, least: number): number => {
        const raw = nonEmpty(n.get(name));
        const v = raw === null ? Number.NaN : Number(raw);
        return Number.isFinite(v) ? Math.max(least, v) : fallback;
    };
    const polygon = {
        sides: Math.trunc(number("sides", 4, 0)),
        distortion: number("distortion", 0, -100),
        skew: number("skew", 0, -100),
        orientation: number("orientation", 0, -360),
    };
    if (isGraphvizBox(polygon)) {
        n.put("shape", rounded ? "round-rectangle" : "rectangle");
    } else if (polygon.sides < 3) {
        n.put("shape", "ellipse");
    } else {
        n.put("shape", "polygon");
        n.put("shapePoints", cornersText(graphvizDrawnCorners(polygon)));
        n.put("shapePointsStretch", false);
    }
}

/**
 * A Graphviz polygon's corners where Graphviz draws them, as fractions of its box's half width and half height: it
 * grows a polygon that falls short of the box along an axis until it reaches the box's sides, and keeps one that
 * reaches past them (a distortion, a skew, an egg) as it is (shapes.c `poly_init`: `scalex = bb.x / xmax`).
 * @param polygon - the polygon's attributes
 * @returns the corners
 */
function graphvizDrawnCorners(polygon: Parameters<typeof graphvizPolygonCorners>[0]): [number, number][] {
    const corners = graphvizPolygonCorners(polygon);
    const grow = (axis: 0 | 1): number => Math.max(1, 1 / Math.max(...corners.map((c) => Math.abs(c[axis]))));
    const [gx, gy] = [grow(0), grow(1)];
    return corners.map(([x, y]) => [x * gx, y * gy]);
}

/**
 * Corners as a `shapePoints` value.
 * @param corners - the corners
 * @returns `x,y x,y ...`
 */
function cornersText(corners: readonly (readonly [number, number])[]): string {
    return corners.map(([x, y]) => `${num6(x)},${num6(y)}`).join(" ");
}

/** The outline of each Graphviz polygon shape graphty draws as a polygon of its corners, by shape name. */
const NAMED_OUTLINES: ReadonlyMap<string, string> = new Map(
    [...GRAPHVIZ_POLYGON_SHAPES].map(([name, polygon]) => [name, cornersText(graphvizDrawnCorners(polygon))] as const),
);

/**
 * A Graphviz shape drawn as pieces of its own (`graphvizGlyph`) at a node's size, as the neutral values that draw it:
 * a polygon of its outline drawn where it says, its further pieces (`shapeParts`) and lines (`shapeLines`), each
 * coordinate a fraction of the node's half width or half height plus a length in points (`-1+24`), so the pieces keep
 * their sizes when the node grows to hold its label. An `underline` is filled with no line round it, its line alone
 * drawn in the pen's width.
 * @param shape - the shape name, lowercase
 * @param width - the node's width in points, or null for Graphviz's default
 * @param height - its height, or null
 * @param put - receives the values
 * @param pen - the node's pen width, for an outline drawn as a line alone and a ring
 * @param color - the node's pen color, for a ring
 */
export function putGlyph(
    shape: string,
    width: number | null,
    height: number | null,
    put: (property: string, value: StyleValue | null) => void,
    pen: () => number,
    color: () => string | null,
): void {
    const text = glyphTexts(shape, width, height);
    if (text === null) {
        return;
    }
    put("shape", "polygon");
    put("shapePoints", text.outline);
    put("shapePointsStretch", false);
    put("shapeParts", text.parts);
    put("shapeLines", text.lines);
    if (text.unstroked) {
        put("shapeLineWidth", pen());
        put("borderWidth", 0);
    }
    if (text.ring !== null) {
        // drawn in the pen, its gap the distance less a pen's width (the outline's half and its own)
        put("outerBorderColor", color() ?? "#000000");
        put("outerBorderWidth", num6(pen()));
        put("outerBorderOffset", num6(Math.max(0, text.ring - pen())));
    }
}

/**
 * A Graphviz glyph's pieces as `shapePoints`, `shapeParts` and `shapeLines` text at a node's size, or null for a shape
 * that is not one.
 * @param shape - the shape name, lowercase
 * @param width - the node's width in points, or null for Graphviz's default
 * @param height - its height, or null
 * @returns the texts (parts and lines null when there are none)
 */
function glyphTexts(
    shape: string,
    width: number | null,
    height: number | null,
): { outline: string; parts: string | null; lines: string | null; unstroked: boolean; ring: number | null } | null {
    const glyph = graphvizGlyph(shape, width, height);
    if (glyph === null) {
        return null;
    }
    // each coordinate is a * W + b: a fraction of the half width (or height) plus a length in points, read off the
    // glyph laid out again at twice the width and at twice the height
    const half = (v: number | null, fallback: number): number => (v !== null && v > 0 ? v : fallback) / 2;
    const [W, H] = [half(width, 54), half(height, 36)];
    const wide = graphvizGlyph(shape, 4 * W, 2 * H);
    const tall = graphvizGlyph(shape, 2 * W, 4 * H);
    if (wide === null || tall === null) {
        return null;
    }
    const term = (v: number, grown: number, by: number): string => {
        const a = num6((grown - v) / by);
        const b = num6(v - a * by);
        if (b === 0) {
            return String(a);
        }
        return `${String(a)}${b > 0 ? "+" : ""}${String(b)}`;
    };
    const pieces = (pick: (g: GraphvizGlyph) => readonly (readonly GlyphPoint[])[]): string | null => {
        const [at, x2, y2] = [pick(glyph), pick(wide), pick(tall)];
        const text = at.map((points, i) =>
            points.map(([x, y], j) => `${term(x, x2[i][j][0], W)},${term(y, y2[i][j][1], H)}`).join(" "),
        );
        return text.length === 0 ? null : text.join("; ");
    };
    return {
        outline: pieces((g) => [g.outline]) ?? "",
        parts: pieces((g) => g.parts),
        lines: pieces((g) => g.lines),
        unstroked: glyph.unstroked === true,
        ring: glyph.ring ?? null,
    };
}

/**
 * The corners of a Graphviz shape graphty draws as a polygon (`house`, `cylinder`, `note` ...), as a `shapePoints`
 * value, or undefined for a shape graphty draws by name.
 * @param shape - the shape name, lowercase
 * @returns the corners, or undefined
 */
export function graphvizOutline(shape: string): string | undefined {
    return NAMED_OUTLINES.get(shape);
}

/**
 * Whether Graphviz draws a shape with no outline (`plain`, `plaintext`, `none`).
 * @param shape - the shape name, lowercase
 * @returns true for a shape with no outline
 */
export function graphvizHasNoOutline(shape: string): boolean {
    return NO_OUTLINE.has(shape);
}

/** The shape name of each outline in `NAMED_OUTLINES`, so a written node keeps its Graphviz shape. */
const OUTLINE_NAMES: ReadonlyMap<string, string> = new Map([...NAMED_OUTLINES].map(([name, text]) => [text, name]));

/**
 * The Graphviz glyph shape a polygon is at a node's size, its outline, parts and lines alike, so a written node keeps
 * its shape (a ribosome site and a protease site share their outline and differ in their stem).
 * @param get - the node's values
 * @param width - the node's width in points, or null
 * @param height - its height, or null
 * @returns the shape name and whether it is filled with no line round it, or undefined
 */
function glyphOf(
    get: Get,
    width: number | null,
    height: number | null,
): { name: string; unstroked: boolean } | undefined {
    const text = (property: string): string | null => {
        const v = get(property);
        return typeof v === "string" ? v.trim() : null;
    };
    const outline = text("shapePoints");
    if (outline === null) {
        return undefined;
    }
    // a glyph with another number of corners cannot match: skip writing its texts, which is most of the work
    const corners = outline === "" ? 0 : outline.split(/\s+/).length;
    for (const name of GRAPHVIZ_GLYPH_SHAPES) {
        if (graphvizGlyph(name, width, height)?.outline.length !== corners) {
            continue;
        }
        const g = glyphTexts(name, width, height);
        if (g !== null && g.outline === outline && g.parts === text("shapeParts") && g.lines === text("shapeLines")) {
            return { name, unstroked: g.unstroked };
        }
    }
    return undefined;
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
 * a record's, a point), otherwise minimums it grows to fit the label (`readLabelFit`).
 * @param get - the node's attributes
 * @param shape - its shape, lowercase
 * @param point - whether it is a point
 * @param put - receives the values
 * @param at - the sites
 */
function readSize(get: Attr, shape: string, point: boolean, put: Put, at: At): void {
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
    put("width", ww === null ? null : canonNumber(ww, at("width"), DOT_POINTS_PER_INCH));
    put("height", hh === null ? null : canonNumber(hh, at("height"), DOT_POINTS_PER_INCH));
}

/**
 * Reads the graph's `quantum` for a node that grows to hold its label: Graphviz rounds the padded label box up to a
 * multiple of it each way before fitting the outline round it (`poly_init`).
 * @param n - the node
 * @param label - its `label` attribute, or null
 */
function readQuantum(n: NodeRead, label: string | null): void {
    if (n.cx.quantum === 0 || label === "" || isTrue(n.get("fixedsize"))) {
        return;
    }
    n.put("labelFitQuantum", num6(n.cx.quantum));
}

/** Graphviz's padding around a node's label when it has no `margin`: 8 points left and right, 4 above and below. */
const LABEL_PAD = { x: 8, y: 4 } as const;

/** Graphviz's line height, as a multiple of the font size (`LINESPACING`, lib/common/const.h). */
const LINE_SPACING = 1.2;

/**
 * How Graphviz 14 sets a line of an HTML-like label's text (lib/common/htmltable.c `size_html_txt`, `emit_htextspans`;
 * plugin/pango/gvtextlayout_pango.c): the line is as tall as its pango layout, the font's ascent and descent each
 * rounded up to whole pixels at 96 dpi (0.75 points; DejaVu Sans at 10 points: 13 and 4 pixels, 12.75 points), and its
 * baseline one font size below the line's top, drawn 0.05 font sizes higher (`yoffset_centerline`): 9.5 points at 10.
 * ponytail: a line of several runs or fonts (Graphviz's not `simple` text) is set 1 point higher still; carry it per
 * cell when a file mixes runs in a table's cell
 */
const HTML_LINE = { lineHeight: "font", textPixel: IMAGE_POINTS_PER_PIXEL, baseline: 0.95 } as const;

/**
 * Reads how a node that is not drawn at a fixed size grows to hold its label (`poly_init`, lib/common/shapes.c):
 * its padded label box fits inside its outline, the `margin` (else 8 points by 4) on each side, and a circle, a
 * square or a `regular` node stays as wide as it is tall. The neutral label box is one font size per line, so the
 * rest of Graphviz's line height (1.2 font sizes) goes into the vertical padding.
 * @param get - the node's attributes
 * @param shape - its shape, lowercase
 * @param label - its `label` attribute, or null
 * @param shown - the label it shows
 * @param table - the frame of the table its label is, which holds the text further in, or null
 * @param put - receives the values
 */
function readLabelFit(
    get: Attr,
    shape: string,
    label: string | null,
    shown: string,
    table: HtmlTableFrame | null,
    put: Put,
): void {
    if (isTrue(get("fixedsize")) || (label === "" && !RECORD.has(shape))) {
        return;
    }
    const lines = Math.max(1, shown.replace(/\n$/, "").split("\n").length);
    const size = Number(get("fontsize") ?? 14);
    const fontSize = Number.isFinite(size) && size > 0 ? size : 14;
    const margin = (get("margin") ?? "")
        .split(",")
        .filter((text) => text.trim() !== "")
        .map(Number)
        .filter(isLength);
    // plain is plaintext with a margin of 0
    const pad = shape === "plain" ? { x: 0, y: 0 } : LABEL_PAD;
    // plain forces its margin to 0 too, whatever `margin` says
    const given = shape === "plain" ? [] : margin;
    const marginX = given.length > 0 ? given[0] * DOT_POINTS_PER_INCH : pad.x;
    const marginY = given.length > 0 ? (given[1] ?? given[0]) * DOT_POINTS_PER_INCH : pad.y;
    // a table's cells are laid out by whoever draws them (`labelTable`): the label's box is the table's
    const padX = marginX;
    const padY = marginY + (table === null ? ((LINE_SPACING - 1) * fontSize * lines) / 2 : 0);
    // a table's WIDTH and HEIGHT are its least size, the margin round it; the node's own size is another
    const least = nodeLeastSize(get, shape);
    if (typeof table?.width === "number") {
        put("width", num6(Math.max(table.width + 2 * marginX, least.w)));
    }
    if (typeof table?.height === "number") {
        put("height", num6(Math.max(table.height + 2 * marginY, least.h)));
    }
    // a decorated box and a synthetic-biology glyph (four-sided, Graphviz's `isBox`) hold their label as a box does,
    // exactly; so does a cylinder, its width (`cylinder_size`).
    // ponytail: Graphviz grows a cylinder's padded height 1.375 times too, which only a label over about 26 points
    // tall reaches past the default height; carry it when a sample needs it
    put("labelFit", GRAPHVIZ_GLYPH_SHAPES.has(shape) || shape === "cylinder" ? "bounds" : "inside");
    put("labelPaddingX", num6(padX));
    put("labelPaddingY", num6(padY));
    if (CIRCLE_LIKE.has(shape) || isTrue(get("regular"))) {
        put("labelFitSquare", true);
    }
}

/**
 * Whether a `margin` part is a usable length: a number at least 0.
 * @param value - the part
 * @returns whether it is
 */
function isLength(value: number): boolean {
    return Number.isFinite(value) && value >= 0;
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
    readEdgeSegments(nonEmpty(get("color")), scheme, put, at);
    readEdgeLine(get, tokens, put, at);
    readEdgeArrows(get, cx, put, at);
    for (const [attribute, property] of [
        [LABEL_ATTRIBUTE, "label"],
        ["headlabel", "targetLabel"],
        ["taillabel", "sourceLabel"],
    ] as const) {
        // an edge's xlabel is drawn beside its middle, as its label is: it is the label when there is no other
        const raw = attribute === LABEL_ATTRIBUTE ? (get(attribute) ?? nonEmpty(get("xlabel"))) : get(attribute);
        if (raw !== null) {
            put(property, labelText(raw, cx.names, cx.html, false, at(property)));
            if (property === "label") {
                readLabelAlign(raw, cx.names, cx.html, false, put);
                readHtmlRuns(raw, cx.html, scheme, put, at);
            }
        }
    }
    // beside a label, the xlabel is a second label of its own
    const xlabel = nonEmpty(get("xlabel"));
    if (get(LABEL_ATTRIBUTE) !== null && xlabel !== null) {
        put("xlabel", labelText(xlabel, cx.names, cx.html, false, at("xlabel")));
    }
    readEndLabelFace(get, scheme, put, at);
}

/**
 * Reads the face of an edge's head and tail labels where it is not the label's: `labelfontsize`, `labelfontcolor` and
 * `labelfontname` (https://graphviz.org/docs/attrs/labelfontsize/), each the edge's `fontsize`, `fontcolor` and
 * `fontname` when unset, which the end labels then take from the label.
 * @param get - the edge's attributes
 * @param scheme - its color scheme
 * @param put - receives the values
 * @param at - the sites
 */
function readEndLabelFace(get: Attr, scheme: string | null, put: Put, at: At): void {
    const ends = (["target", "source"] as const).filter(
        (end) => get(end === "target" ? "headlabel" : "taillabel") !== null,
    );
    const size = get("labelfontsize");
    const font = get("labelfontname");
    for (const end of ends) {
        readColor(nonEmpty(get("labelfontcolor")), scheme, "text", `${end}LabelColor`, null, put, at);
        if (size !== null) {
            put(`${end}LabelSize`, canonNumber(size, at(`${end}LabelSize`)));
        }
        // ponytail: the family only; a bold or italic end-label face is drawn in the label's weight and slant
        if (font !== null && font.length <= MAX_STYLE_VALUE_LENGTH) {
            put(`${end}LabelFont`, graphvizFont(font).family);
        }
    }
}

/**
 * Reads an edge's colored segments: a color list with a `;fraction` in it (`red;0.3:blue`) draws the line in one piece
 * per color along its length, which is a linear gradient with a hard switch at each band's end. A list with no
 * fraction draws parallel lines, which graphty does not draw (the line is in the first color).
 * @param list - the edge's `color`
 * @param scheme - its color scheme
 * @param put - receives the values
 * @param at - the sites
 */
function readEdgeSegments(list: string | null, scheme: string | null, put: Put, at: At): void {
    if (list === null || !list.includes(":") || !list.includes(";")) {
        return;
    }
    const bands = colorBands(list, scheme, "edge", at("gradientColors"));
    if (bands.length < 2) {
        return;
    }
    const colors: string[] = [];
    const stops: number[] = [];
    let start = 0;
    for (const band of bands) {
        colors.push(band.color, band.color);
        stops.push(num6(start), num6(Math.min(1, start + band.size)));
        start += band.size;
    }
    put("gradientKind", "linear");
    put("gradientColors", colors.join(" "));
    put("gradientStops", stops.join(" "));
}

/**
 * What an edge's label places are read against: the nodes' centers and sizes.
 * @param snapshot - the graph
 * @returns the context
 */
function labelPlaceContext(snapshot: GraphSnapshot): LabelPlaceContext {
    const column = snapshot.nodes.byRole("position");
    return {
        center: (i) => {
            const v = column?.isSet(i) === true ? (column.value(i) as ArrayLike<number>) : null;
            return v === null ? null : [v[0], v[1]];
        },
        node: (i, name) => nonEmpty(cellText(snapshot.nodes, name, i)),
        external: (cellText(snapshot.graph, "layout", 0)?.trim().toLowerCase() ?? "dot") !== "dot",
    };
}

/**
 * The route Graphviz laid an edge along, from its `pos`: `[e,x,y] [s,x,y]` arrow tips, then the B-spline's `3n + 1`
 * control points (y up), flattened into bends between the two nodes' centers. Null for an edge Graphviz drew
 * straight, a `pos` that is not a spline, or nodes without positions.
 * @param snapshot - the graph
 * @param e - the edge
 * @param pos - its `pos` text
 * @returns the `bends` value, or null
 */
function splineBends(snapshot: GraphSnapshot, e: number, pos: string | null): string | null {
    if (pos === null) {
        return null;
    }
    const column = snapshot.nodes.byRole("position");
    const center = (i: number): BendPoint | null => {
        const v = column?.isSet(i) === true ? (column.value(i) as ArrayLike<number>) : null;
        return v === null ? null : [v[0], v[1]];
    };
    const [source, target] = [center(snapshot.edgeSource(e)), center(snapshot.edgeTarget(e))];
    if (source === null || target === null) {
        return null;
    }
    return graphvizPosBends(source, target, pos);
}

/**
 * The bends of an edge Graphviz laid, from its `pos` text (`[e,x,y] [s,x,y]` arrow tips, then each spline's
 * `3n + 1` control points, y up, splines separated by `;`), between the two nodes' centers in the same coordinates.
 * @param source - the source node's center
 * @param target - the target node's center
 * @param pos - the edge's `pos` text
 * @returns the `bends` value, or null for a straight route or a `pos` that is not a spline
 * @category Styles
 */
export function graphvizPosBends(source: BendPoint, target: BendPoint, pos: string): string | null {
    // the arrow tips of the first spline's start and the last spline's end
    const tip = (spline: string | undefined, flag: "s" | "e"): BendPoint | null => {
        const token = (spline ?? "")
            .trim()
            .split(/\s+/)
            .find((t) => t.startsWith(`${flag},`));
        const [x, y] = (token ?? "").slice(2).split(",").map(Number);
        return token !== undefined && Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
    };
    const parts = pos.split(";");
    const tips = { start: tip(parts[0], "s"), end: tip(parts.at(-1), "e") };
    // ponytail: the splines of a concentrated edge (";"-separated) are joined end to end
    const splines = parts.map((spline) =>
        spline
            .trim()
            .split(/\s+/)
            .filter((t) => !/^[es],/.test(t))
            .map((t): BendPoint => {
                const [x, y] = t.split(",").map(Number);
                return [x, y];
            }),
    );
    return graphvizRouteBends(source, target, splines, tips);
}

/** How far off the line between its nodes' centers, in points, a Graphviz route may pass and still be straight. */
const GRAPHVIZ_STRAIGHT_POINTS = 1;

/** How far apart Graphviz's neato lays the loops on one node, across (x) and along (y) its side, in points. */
const GRAPHVIZ_LOOP_STEP = { x: 18, y: 9 } as const;

/**
 * The self-loops Graphviz lays itself, with no `pos` of their own and no ports: neato's `selfRight` (splines.c), on
 * the node's right side, the k-th of a node's n loops two cubic curves from its center out to `rw + 18k` points right
 * of it and back, `9k / n` points above and then below its center line (measured on Graphviz 14.1.2's and 2.43's
 * drawings of nodes from 0.33 to 1 inch).
 * @param snapshot - the graph
 * @returns the bends of an edge that is such a loop, or null
 */
function graphvizLoops(snapshot: GraphSnapshot): { bendsOf: (e: number, get: Attr) => string | null } {
    const portless = (get: Attr): boolean =>
        nonEmpty(get("tailport")) === null &&
        nonEmpty(get("headport")) === null &&
        nonEmpty(get(POS_ATTRIBUTE)) === null;
    const onNode = new Map<number, number[]>();
    // ponytail: ortho routes a loop round the node's corners and none draws no edge; both keep the element's loop.
    const splines = (nonEmpty(cellText(snapshot.graph, "splines", 0)) ?? "").toLowerCase();
    // a file graphty wrote keeps its loops' look in its own block
    const laid =
        splines !== "ortho" && splines !== "none" && nonEmpty(cellText(snapshot.graph, STYLE_BLOCK_NAME, 0)) === null;
    for (let e = 0; e < snapshot.edgeCount && laid; e++) {
        const n = snapshot.edgeSource(e);
        if (n === snapshot.edgeTarget(e) && portless((name) => cellText(snapshot.edges, name, e))) {
            onNode.set(n, [...(onNode.get(n) ?? []), e]);
        }
    }
    const inches = (n: number, name: string, fallback: number): number => {
        const v = Number(nonEmpty(cellText(snapshot.nodes, name, n)) ?? Number.NaN);
        return (Number.isFinite(v) && v > 0 ? v : fallback) * DOT_POINTS_PER_INCH;
    };
    return {
        bendsOf: (e, get) => {
            const n = snapshot.edgeSource(e);
            const list = onNode.get(n);
            if (n !== snapshot.edgeTarget(e) || list === undefined || !portless(get)) {
                return null;
            }
            // ponytail: a node Graphviz grows to fit its label is taken at its stated width and height
            const [w, h] = [inches(n, "width", 0.75), inches(n, "height", 0.5)];
            const k = list.indexOf(e) + 1;
            const dx = w / 2 + GRAPHVIZ_LOOP_STEP.x * k;
            const dy = (GRAPHVIZ_LOOP_STEP.y * k) / list.length;
            const curve = flattenCubic([
                [0, 0],
                [dx / 3, dy],
                [dx, dy],
                [dx, 0],
                [dx, -dy],
                [dx / 3, -dy],
                [0, 0],
            ]);
            return curve === null ? null : canonNodeOffsets([0, 0], [w, h], curve.slice(1, -1), false);
        },
    };
}

/**
 * The bends of a route Graphviz laid: B-splines of `3n + 1` control points each (y up), flattened into bends between
 * the two nodes' centers. Null for a route on the line between the centers, which is the straight edge it looks like,
 * or for control points that are not a spline. Also reads the `Line` of a GML file Graphviz's gv2gml wrote.
 * @param source - the source node's center
 * @param target - the target node's center
 * @param splines - the control points of each spline, joined end to end
 * @param tips - the arrow tips `pos` stores (`s,x,y` and `e,x,y`): the line runs on to each, along its arrow
 * @param tips.start - the tail arrow's tip, or null
 * @param tips.end - the head arrow's tip, or null
 * @returns the `bends` value, or null
 */
export function graphvizRouteBends(
    source: BendPoint,
    target: BendPoint,
    splines: readonly (readonly BendPoint[])[],
    tips?: { readonly start: BendPoint | null; readonly end: BendPoint | null },
): string | null {
    const points: BendPoint[] = [];
    for (const controls of splines) {
        const flat = flattenCubic(controls);
        if (flat === null || flat.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) {
            return null;
        }
        points.push(...flat);
    }
    // a tip where the spline already ends adds no point
    const apart = (a: BendPoint, b: BendPoint | undefined): boolean =>
        b === undefined || Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6;
    const start = tips?.start ?? null;
    const end = tips?.end ?? null;
    if (start !== null && apart(start, points[0])) {
        points.unshift(start);
    }
    if (end !== null && apart(end, points.at(-1))) {
        points.push(end);
    }
    const [dx, dy] = [target[0] - source[0], target[1] - source[1]];
    const length = Math.hypot(dx, dy);
    const off =
        length > 0
            ? Math.max(...points.map(([x, y]) => Math.abs((x - source[0]) * dy - (y - source[1]) * dx))) / length
            : 0;
    // a route on the line between the centers is the straight edge it looks like: Graphviz draws its straight lines
    // (`splines=false`) up to half a point off that line
    return off > Math.max(1e-3 * length, GRAPHVIZ_STRAIGHT_POINTS) ? canonBends(source, target, points, false) : null;
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
        readEdgeArrow("target", head, dir === "forward" || dir === "both", put, at);
        readEdgeArrow("source", tail, dir === "back" || dir === "both", put, at);
    }
    const size = get("arrowsize");
    if (size !== null) {
        put("arrowSize", canonNumber(size, at("arrowSize")));
    }
    // an edge's `fillcolor` fills its arrowheads (their outline stays the edge's color)
    const fill = nonEmpty(get("fillcolor"));
    for (const property of ["targetArrowColor", "sourceArrowColor"]) {
        readColor(fill, get("colorscheme"), "fill", property, null, put, at);
    }
}

/**
 * Reads one end's arrow: its shape, or none when the edge's direction draws no arrow there, the side it keeps and the
 * shapes drawn behind it. Read so by the DOT reader and by the GML reader for gv2gml's `targetArrow` / `sourceArrow`.
 * @param end - which end
 * @param raw - its `arrowhead` or `arrowtail`, or null
 * @param on - whether the edge's direction draws an arrow there
 * @param put - receives the values
 * @param at - the sites
 */
export function readEdgeArrow(end: "target" | "source", raw: string | null, on: boolean, put: Put, at: At): void {
    const arrow = on ? graphvizArrowValue(raw ?? "normal", at(`${end}Arrow`)) : null;
    put(`${end}Arrow`, arrow === null ? "none" : arrow.value);
    if (arrow?.side !== null && arrow?.side !== undefined) {
        put(`${end}ArrowSide`, arrow.side);
    }
    if (arrow?.parts !== null && arrow?.parts !== undefined) {
        put(`${end}ArrowParts`, arrow.parts);
    }
}

/** The sides an `l` or `r` arrow modifier keeps, by their first letters. */
const ARROW_SIDES = ["left", "right"] as const;

/** One shape of a Graphviz arrow name: its own name and the side an `l` or `r` keeps (null for the whole shape). */
interface GraphvizArrowShape {
    readonly name: string;
    readonly side: (typeof ARROW_SIDES)[number] | null;
}

/** The open forms of Graphviz arrows that a neutral shape draws; the others are drawn filled. */
const GRAPHVIZ_OPEN_ARROWS: ReadonlySet<string> = new Set(["normal", "diamond", "dot", "box", "inv"]);

/** The open Graphviz arrows the neutral vocabulary has no name for, by the value graphty draws them as. */
const GRAPHVIZ_OTHER_ARROWS: ReadonlyMap<string, string> = new Map([
    ["obox", "other:open-square"],
    ["oinv", "other:open-inverted"],
]);

/**
 * The neutral arrow value Graphviz draws for an arrow name (`onormal`, `lbox`, `invempty`), with an open shape the
 * neutral vocabulary has no name for (`obox`, `oinv`) as the value graphty draws it as, and the side an `l` or `r`
 * keeps. A name of several shapes (`boxdotnormal`, `lteeoldiamond`) draws them in a row along the line, the first
 * against the node: the first is the value, the rest its `parts`.
 * @param raw - the arrow name
 * @param site - where it was read
 * @returns the value, its side (null for the whole shape), and the shapes drawn behind it as the `targetArrowParts`
 * value (null for none)
 */
function graphvizArrowValue(
    raw: string,
    site: CanonSite,
): { readonly value: string | null; readonly side: GraphvizArrowShape["side"]; readonly parts: string | null } {
    const shapes = graphvizArrows(raw);
    const valueOf = (name: string | undefined): string | null =>
        (name === undefined ? undefined : GRAPHVIZ_OTHER_ARROWS.get(name)) ??
        canonEnum("arrow", name ?? raw, "graphviz", site);
    const [first, ...rest] = shapes ?? [];
    const parts = rest.flatMap((part) => {
        const value = valueOf(part.name);
        return value === null ? [] : [part.side === null ? value : `${value}:${part.side}`];
    });
    return {
        value: valueOf(first?.name),
        side: first?.side ?? null,
        parts: parts.length === 0 ? null : parts.join(" "),
    };
}

/**
 * The arrows Graphviz draws at an edge's very end, from an arrow name of up to four shapes (`dotodot`,
 * `lteeoldiamond`), in order from the node: each shape that is not `none`, with its `o` (open) kept where a neutral
 * shape draws it, and the side an `l` or `r` keeps alone ("clip the shape, leaving only the part to the left of the
 * edge", looking along the edge toward the arrow's tip).
 * @param raw - the arrow name
 * @returns each shape's own name and its side (null for the whole shape), or null for a name outside the grammar (a
 * synonym such as `empty`)
 */
function graphvizArrows(raw: string): GraphvizArrowShape[] | null {
    let rest = raw.trim().toLowerCase();
    // the one synonym the grammar would misread (as `inv`): arrows.c's `invempty` is an open `inv`
    if (rest === "invempty") {
        rest = "oinv";
    }
    const shapes: GraphvizArrowShape[] = [];
    // arrows.c reads at most NUMB_OF_ARROWHEADS (4) shapes, a `none` among them, and ignores the rest
    for (let slot = 0; rest.length > 0 && slot < 4; slot++) {
        const m = /^([olr]{0,3})(normal|crow|tee|box|diamond|dot|none|inv|vee|icurve|curve)/.exec(rest);
        if (m === null) {
            return shapes.length === 0 ? null : shapes;
        }
        rest = rest.slice(m[0].length);
        const [, mods, shape] = m;
        if (shape !== "none") {
            const side = ARROW_SIDES.find((s) => mods.includes(s[0])) ?? null;
            const open = mods.includes("o") && GRAPHVIZ_OPEN_ARROWS.has(shape) ? "o" : "";
            shapes.push({ name: open + shape, side });
        }
    }
    return shapes.length === 0 ? null : shapes;
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
    const rankdir = (cellText(snapshot.graph, "rankdir", 0) ?? "").trim().toUpperCase();
    const flip = rankdir === "LR" || rankdir === "RL";
    const q = Number(cellText(snapshot.graph, "quantum", 0) ?? Number.NaN);
    const quantum = Number.isFinite(q) && q > 0 ? q * DOT_POINTS_PER_INCH : 0;
    const own = directedEdges(snapshot);
    // a graph mixing both directions is written with one, every edge then drawn as that one
    const directed = written === null || own.every((d) => d === snapshot.directed) ? own : own.map(() => written);
    const name = (i: number): string => String(snapshot.ids.idOf(i));
    return {
        node: (i) => ({ name: name(i), graph, cluster: isCluster(snapshot, i), html, flip, quantum }),
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
 * The graph's own styles: its `bgcolor` as its background.
 * @param snapshot - the graph
 * @param notes - where a bad color is noted
 * @returns the graph's values
 */
function graphBackground(snapshot: GraphSnapshot, notes: StyleNotes): Record<string, StyleValue> {
    const graph: Record<string, StyleValue> = {};
    const bg = nonEmpty(cellText(snapshot.graph, "bgcolor", 0));
    if (!snapshot.graph.has("bgcolor") || bg === null) {
        return graph;
    }
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
    return graph;
}

/**
 * The quarter turn Graphviz gives the whole drawing, counterclockwise, as the graph's `rotation`: `rotate` when the
 * graph sets it (only 90 turns), else `orientation` (a value starting with L), else `landscape` (true). The first of
 * them the graph sets decides, even set empty (lib/common/input.c, graph_init).
 * @param snapshot - the graph
 * @param graph - the graph's values, which take the turn
 */
function readGraphRotation(snapshot: GraphSnapshot, graph: Record<string, StyleValue>): void {
    const text = (name: string): string => (cellText(snapshot.graph, name, 0) ?? "").trim();
    let turned = false;
    if (snapshot.graph.has("rotate")) {
        turned = Number.parseInt(text("rotate"), 10) === 90;
    } else if (snapshot.graph.has("orientation")) {
        turned = /^l/i.test(text("orientation"));
    } else if (snapshot.graph.has("landscape")) {
        turned = isTrue(text("landscape"));
    }
    if (turned) {
        graph.rotation = 90;
    }
}

/**
 * Writes the drawing's turn as Graphviz's `rotate=90`, in place of whichever of `rotate`, `landscape` and a landscape
 * `orientation` the graph had: Graphviz turns a drawing only by a quarter turn, so any other turn is written as none.
 * @param graph - the graph table written
 * @param rotation - the graph's `rotation`, in degrees counterclockwise
 */
function writeGraphRotation(graph: GraphSnapshot["graph"], rotation: StyleValue | undefined): void {
    for (const name of ["rotate", "landscape"]) {
        if (graph.has(name)) {
            graph.remove(name);
        }
    }
    if (graph.has("orientation") && /^l/i.test((cellText(graph, "orientation", 0) ?? "").trim())) {
        graph.remove("orientation");
    }
    if (typeof rotation === "number" && ((rotation % 360) + 360) % 360 === 90) {
        graph.set("rotate", ["90"], { dtype: "string" });
    }
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
    const places = labelPlaceContext(snapshot);
    const leftOut = leftOutXlabels(cellText(snapshot.graph, "forcelabels", 0), snapshot.nodeCount, places, (i) =>
        isCluster(snapshot, i),
    );
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
        const put: Put = (p, v) => {
            node.put(i, p, v);
        };
        readNode(get, ncx, put, at);
        readNodeXlabel(get, ncx, places.center(i), put, at, leftOut.has(i));
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
    const loops = graphvizLoops(snapshot);
    // `splines=none` and `splines=""` draw no edges at all (https://graphviz.org/docs/attrs/splines/)
    const splines = cellText(snapshot.graph, "splines", 0)?.trim().toLowerCase();
    const noEdges = splines === "" || splines === "none";
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
        if (noEdges) {
            edge.put(e, "visible", false);
        }
        const bends = splineBends(snapshot, e, get(POS_ATTRIBUTE)) ?? loops.bendsOf(e, get);
        if (bends !== null) {
            edge.put(e, "bends", bends);
        }
        readLabelPlaces(snapshot, places, e, get, (p, v) => {
            edge.put(e, p, v);
        });
    }
    const graph = graphBackground(snapshot, notes);
    readGraphRotation(snapshot, graph);
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
    ["inverted", "inv"],
    ["other:open-square", "obox"],
    ["other:open-inverted", "oinv"],
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
    const font = t.labelFont?.value;
    if (typeof font === "string") {
        out.set("fontname", graphvizFontName(font, false, false));
    }
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
 * A label's text as a DOT label: backslashes, line breaks and `&` escaped, so Graphviz's escape and entity passes
 * give the text back.
 * @param text - the text
 * @returns the label
 */
function escapeLabel(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("\\", String.raw`\\`)
        .replaceAll("\n", String.raw`\n`);
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
 * @param approximate - records approximations
 * @param out - the attributes, added to
 * @param tokens - the style tokens, added to
 */
function writeCommon(get: Get, approximate: Approximate, out: Map<string, Written>, tokens: string[]): void {
    const color = get("labelColor");
    if (typeof color === "string") {
        out.set("fontcolor", color);
    }
    const size = get("labelSize");
    if (typeof size === "number") {
        out.set("fontsize", size);
    }
    const font = get("labelFont");
    const bold = get("labelWeight") === "bold";
    const italic = get("labelItalic") === true;
    if (typeof font === "string") {
        const name = graphvizFontName(font, bold, italic);
        out.set("fontname", name);
        const drawn = graphvizFont(name);
        if (drawn.bold !== bold) {
            approximate("labelWeight", get("labelWeight") ?? "normal");
        }
        if (drawn.italic !== italic) {
            approximate("labelItalic", italic);
        }
    } else if (bold || italic) {
        approximate(bold ? "labelWeight" : "labelItalic", bold ? "bold" : true);
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
 * @param raw - its attributes as data
 * @param approximate - records approximations
 * @param notes - where an HTML name is noted
 * @returns the attributes
 */
function nodeAttributes(
    get: Get,
    cx: NodeContext,
    raw: Attr,
    approximate: Approximate,
    notes: StyleNotes,
): Map<string, Written> {
    const out = new Map<string, Written>();
    const tokens: string[] = [];
    writeCommon(get, approximate, out, tokens);
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
    const xlabel = get("xlabel");
    if (!cx.cluster && typeof xlabel === "string") {
        out.set("xlabel", escapeLabel(xlabel));
    }
    noteLabelPosition(get("labelPosition"), cx, raw, approximate);
    if (tokens.length > 0) {
        out.set("style", tokens.join(","));
    }
    return withoutDefaults(out, "node");
}

/**
 * Notes a label position Graphviz does not draw: a node's label sits where its own `labelloc` (kept as data) puts
 * it, and a cluster's where its `labelloc` and `labeljust` do.
 * @param position - the label's position
 * @param cx - the node's name and kind
 * @param raw - the node's attributes as data
 * @param approximate - records approximations
 */
function noteLabelPosition(position: StyleValue | null, cx: NodeContext, raw: Attr, approximate: Approximate): void {
    if (
        typeof position === "string" &&
        position !== (cx.cluster ? clusterLabelPosition(raw) : nodeLabelPosition(raw))
    ) {
        approximate("labelPosition", position);
    }
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
    const size = (name: string): number | null => {
        const v = get(name);
        return typeof v === "number" ? v : null;
    };
    const glyph = shape === "polygon" ? glyphOf(get, size("width"), size("height")) : undefined;
    if (glyph !== undefined) {
        return writeGlyph(get, glyph, out);
    }
    approximateShapeLines(get, approximate);
    const polygon = shape === "polygon" ? writePolygon(get("shapePoints"), approximate, out) : null;
    if (polygon !== null) {
        // Graphviz draws its polygon's corners where it lays them, which read back unstretched
        if (get("shapePointsStretch") !== false) {
            approximate("shapePointsStretch", true);
        }
        return polygon;
    }
    const gvShape = spelled(SHAPES, shape, shape === "vee" ? "invtriangle" : "box", "shape", approximate);
    out.set("shape", gvShape);
    return gvShape;
}

/**
 * A glyph's shape attribute, and its line's width as its pen's when it draws no outline.
 * @param get - the node's values
 * @param glyph - the glyph
 * @param out - the attributes, added to
 * @returns the Graphviz shape written
 */
function writeGlyph(get: Get, glyph: NonNullable<ReturnType<typeof glyphOf>>, out: Map<string, Written>): string {
    out.set("shape", glyph.name);
    // an underline's line is drawn in its pen, which draws no outline round it
    const line = get("shapeLineWidth");
    if (glyph.unstroked && typeof line === "number") {
        out.set("penwidth", line);
    }
    return glyph.name;
}

/**
 * Notes a node's pieces and lines of no Graphviz shape as approximated: Graphviz has no attribute for them.
 * @param get - the node's values
 * @param approximate - records approximations
 */
function approximateShapeLines(get: Get, approximate: Approximate): void {
    for (const property of ["shapeParts", "shapeLines", "shapeLineWidth"]) {
        const v = get(property);
        if (v !== null && v !== undefined) {
            approximate(property, v);
        }
    }
}

/**
 * A polygon's shape attribute: the Graphviz shape whose outline it is, else `shape=polygon` with its number of sides.
 * @param points - its `shapePoints`
 * @param approximate - records approximations
 * @param out - the attributes, added to
 * @returns the Graphviz shape written, or null for corners too few to be a polygon
 */
function writePolygon(points: unknown, approximate: Approximate, out: Map<string, Written>): string | null {
    if (typeof points !== "string") {
        return null;
    }
    const named = OUTLINE_NAMES.get(points.trim());
    if (named !== undefined) {
        out.set("shape", named);
        return named;
    }
    // the corners themselves are not Graphviz attributes: the polygon keeps its number of sides
    const sides = points.trim().split(/\s+/).length;
    if (sides < 3) {
        return null;
    }
    out.set("shape", "polygon");
    out.set("sides", sides);
    approximate("shapePoints", points);
    return "polygon";
}

/**
 * A node's width and height, fixed so Graphviz does not grow them to fit the label, unless the node grows to fit it.
 * @param get - the node's values
 * @param out - the attributes, added to
 */
function writeNodeSize(get: Get, out: Map<string, Written>): void {
    const width = get("width");
    const height = get("height");
    if ((typeof width === "number" || typeof height === "number") && typeof get("labelFit") !== "string") {
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
    writeCommon(get, approximate, out, tokens);
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
    // Graphviz fills both arrowheads with the one `fillcolor`
    const head = get("targetArrowColor");
    const tail = get("sourceArrowColor");
    const fill = head ?? tail;
    if (typeof fill === "string") {
        out.set("fillcolor", fill);
        if (head !== null && tail !== null && head !== tail) {
            approximate("sourceArrowColor", tail);
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
        ["xlabel", "xlabel"],
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
    const plain = directed ? head && !tail && target === "triangle" && get("targetArrowSide") === null : !head && !tail;
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
    // a one-sided arrow is its shape with an `l` or `r` before it; the neutral half arrow, one barb, is nearest to the
    // left half of Graphviz's triangle, which reads back as that
    const arrow = (value: string, side: StyleValue | null, property: string): string => {
        if (value === "half") {
            approximate(property, value);
            approximate(`${property}Side`, value);
            return "lnormal";
        }
        const name = spelled(ARROWS, value, "normal", property, approximate);
        return side === "left" || side === "right" ? `${side[0]}${name}` : name;
    };
    if (head) {
        out.set("arrowhead", arrow(target, get("targetArrowSide"), "targetArrow"));
    }
    if (tail) {
        out.set("arrowtail", arrow(source, get("sourceArrowSide"), "sourceArrow"));
    }
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
    const notes = new StyleNotes();
    takeFromBlock(snapshot, text, "dot", (target) => ({
        values: read[target],
        properties:
            target === "node" ? [...DOT_STYLE_CAPABILITIES.node, ...LABEL_PADDINGS] : DOT_STYLE_CAPABILITIES[target],
        writes: DOT_STYLE_CAPABILITIES[target],
        readBack: (i, want) => {
            const raw: Attr = (name) => cellText(target === "node" ? snapshot.nodes : snapshot.edges, name, i);
            const back = writtenAndReadBack(target, i, want, { cx, raw }, notes);
            return (property) => back.get(property) ?? null;
        },
    }));
}

/**
 * The label padding the reader derives from a node's `margin` and the frame of a table label. The writer writes the
 * label as text, so a table's frame is lost and the padding comes back from the block.
 */
const LABEL_PADDINGS = ["labelPaddingX", "labelPaddingY"] as const;

/** Attributes the writer leaves in an element's data, which the reader reads back as they were. */
const KEPT_AS_DATA: ReadonlySet<string> = new Set(["labelloc", "labeljust", "margin"]);

/**
 * An element's values written as the writer writes them and read back as the reader reads them.
 * @param target - nodes or edges
 * @param i - the element
 * @param want - its values
 * @param data - the elements' contexts, and the element's attributes as data (what the writer leaves as it is)
 * @param data.cx - the elements' contexts
 * @param data.raw - the element's attributes as data
 * @param notes - a scratch for the notes the round trip makes
 * @returns the values read back, by property
 */
function writtenAndReadBack(
    target: StyleTarget,
    i: number,
    want: Get,
    data: { readonly cx: ReturnType<typeof contexts>; readonly raw: Attr },
    notes: StyleNotes,
): Map<string, StyleValue> {
    const { cx, raw } = data;
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
        const attrs = nodeAttributes(want, ncx, raw, ignore, notes);
        // a cluster's label position (`labelloc`, `labeljust`) and a node's `margin` stay in its data, which the
        // writer leaves alone
        const kept = (name: string): string | null => (KEPT_AS_DATA.has(name) ? raw(name) : null);
        readNode((name) => (attrs.has(name) ? textOf(attrs.get(name)) : kept(name)), ncx, put, at);
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
    // the registry's check before writing and the write of one export call share the work
    return sharedInExportCall(input, [snapshot, onMixedDirection], () =>
        styledExport(snapshot, input, onMixedDirection),
    );
}

/**
 * Works out a DOT export with styles: dotStyledExport() without the sharing.
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
    // Graphviz paints a graph without bgcolor white, so the writer leaves that default out like the others
    if (typeof background === "string" && background !== toolDefaults("graphviz")?.graph.background?.value) {
        out.graph.set("bgcolor", [background], { dtype: "string" });
    }
    writeGraphRotation(out.graph, input.rules.styles.graph.rotation);
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
    const get = elementValues((t, p) => input.picture(t, p as never), target, DOT_STYLE_CAPABILITIES[target]);
    const columns = new Map<string, (Written | null)[]>();
    for (let i = 0; i < n; i++) {
        const attrs =
            target === "node"
                ? nodeAttributes(
                      get(i),
                      w.cx.node(i),
                      (name) => cellText(snapshot.nodes, name, i),
                      w.approximate,
                      w.notes,
                  )
                : edgeAttributes(get(i), w.cx.edge(i).directed, w.approximate);
        // a self-loop's route is not written: Graphviz lays the loop itself, which is what reads back
        if (target === "edge" && snapshot.edgeSource(i) === snapshot.edgeTarget(i)) {
            w.approximate("bends", "self-loop");
        }
        // no label is written label="" (Graphviz would show the name), which a rule reading the label column
        // reads back as the empty label
        if (w.read.has(LABEL_ATTRIBUTE) && attrs.get(LABEL_ATTRIBUTE) === "" && get(i)("label") === null) {
            w.approximate("label", "");
        }
        setColumnValues(columns, attrs, i, n);
    }
    if (target === "node") {
        stopInheritance(snapshot, w.cx, columns, input.rules.styles.graph.background);
    }
    return columns;
}

/**
 * Puts one element's attributes into the columns, adding a column for an attribute not seen before.
 * @param columns - the columns, by name
 * @param attrs - the element's attributes
 * @param i - the element
 * @param n - how many elements there are
 */
function setColumnValues(
    columns: Map<string, (Written | null)[]>,
    attrs: ReadonlyMap<string, Written>,
    i: number,
    n: number,
): void {
    for (const [name, value] of attrs) {
        let col = columns.get(name);
        if (col === undefined) {
            col = new Array<Written | null>(n).fill(null);
            columns.set(name, col);
        }
        col[i] = value;
    }
}

/** What a cluster draws when neither it nor a graph around it sets the attribute: Graphviz's defaults. */
const CLUSTER_UNSET: ReadonlyMap<string, Written> = new Map<string, Written>([
    ["style", ""],
    ["penwidth", 1],
    ["color", ""],
    ["pencolor", ""],
    ["fillcolor", ""],
    ["bgcolor", ""],
    ["fontname", "Times-Roman"],
    ["fontsize", 14],
    ["fontcolor", "black"],
    [LABEL_ATTRIBUTE, ""],
]);

/**
 * Gives every cluster its own value of each attribute a graph around it sets, Graphviz's default where the cluster
 * has none, since Graphviz gives a cluster the attributes of the graphs around it (the root's are kept as data).
 * @param snapshot - the graph handed to the exporter
 * @param cx - the elements' contexts
 * @param columns - the node attributes written, by name, changed in place
 * @param background - the background the writer gives the root graph (its `bgcolor`), which a cluster would inherit
 */
function stopInheritance(
    snapshot: GraphSnapshot,
    cx: ReturnType<typeof contexts>,
    columns: Map<string, (Written | null)[]>,
    background: unknown,
): void {
    const clusters = Array.from({ length: snapshot.nodeCount }, (_, i) => i).filter((i) => cx.node(i).cluster);
    for (const [name, unset] of CLUSTER_UNSET) {
        const col = columns.get(name);
        const enclosing =
            cellText(snapshot.graph, name, 0) !== null ||
            (name === "bgcolor" && typeof background === "string") ||
            clusters.some((i) => (col?.[i] ?? null) !== null);
        if (!enclosing) {
            continue;
        }
        const filled = col ?? new Array<Written | null>(snapshot.nodeCount).fill(null);
        for (const i of clusters) {
            filled[i] ??= unset;
        }
        columns.set(name, filled);
    }
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
