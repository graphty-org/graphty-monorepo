/**
 * GML styles: each node's and edge's `graphics [ ... ]` and `LabelGraphics [ ... ]` records read the way the program
 * that wrote the file draws them, and a graph's styles written back as yEd GML graphics.
 *
 * GML has one syntax and many vocabularies. The `Creator` line (top level, or inside the graph as Gephi writes it,
 * quoted or not) names the writer: yEd and yFiles, Cytoscape, Gephi, OGDF and igraph are recognized; every other file
 * (NetworkX writes no `Creator`) is read with the keys of the GML draft (Graphlet). A recognized drawing program's
 * defaults go beneath the file's own values; igraph and unknown writers get none.
 *
 * Writing: the yEd keys (`fill`, `outline`, `outlineWidth`, `outlineStyle`, `w`, `h`, `type`; edge `fill`, `width`,
 * `style`, `sourceArrow`, `targetArrow`, `smoothBends`; `LabelGraphics` `text`, `color`, `fontSize`, `fontName`,
 * `fontStyle`) replace every style key any reader here reads, inside the records the graph already has, so positions,
 * bends and other keys stay. The `graphty.styles` block and the per-element values its rules read are keys too,
 * named by the GML writer's rule for names that are not GML keys (`graphty_styles`, `graphty_style_node_<key>`).
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt, scalarText } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { CYTOSCAPE_LEXICON } from "../../styles/cytoscape/lexicon.js";
import { blockStyles, parseStyleBlock, STYLE_BLOCK_NAME, styleTag, writeStyleBlock } from "../../styles/io/block.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell, resolveStyles } from "../../styles/plan/resolve.js";
import type {
    ImporterStyles,
    StyleColumn,
    StyleDialect,
    StyleReadContext,
    StyleTarget,
    StyleTool,
    StyleValue,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { gephiRules } from "../gexf/styles.js";
import {
    FONT_STYLES,
    type ValueColumns,
    valueColumns,
    YED_ARROWS,
    YED_LINES,
    YED_SHAPES,
    yedColor,
    yedValue,
} from "../graphml/styles-yed.js";
import { mangleGmlKey } from "./syntax.js";

/** A GML record as the importer keeps it (a json cell). */
type Rec = Record<string, unknown>;

/** The key vocabulary a file's graphics are read with. */
type Vocabulary = "yed" | "cytoscape" | "ogdf" | "graphlet";

/** Who wrote a GML file, as far as its styles go. */
interface GmlWriter {
    /** The dialect recorded in the styles. */
    readonly dialect: StyleDialect;
    /** The program whose defaults apply, or null. */
    readonly tool: StyleTool | null;
    /** The keys its graphics are read with. */
    readonly vocabulary: Vocabulary;
    /** How its colors and names are spelled. */
    readonly spelling: StyleDialect;
    /** The unit of its lengths. */
    readonly units: "px" | "relative";
    /** Whether it draws the `label` key of an element that has graphics (the GML draft does; yEd and Gephi do not). */
    readonly labelKey: boolean;
}

/** The writers recognized by their `Creator` text, first match wins. */
const WRITERS: readonly (readonly [RegExp, GmlWriter])[] = [
    [
        /^\s*(yfiles|yed)\b/i,
        { dialect: "yed", tool: "yed", vocabulary: "yed", spelling: "yed", units: "px", labelKey: false },
    ],
    [
        /^\s*cytoscape\b/i,
        {
            dialect: "cytoscape",
            tool: "cytoscape",
            vocabulary: "cytoscape",
            spelling: "cytoscape",
            units: "px",
            labelKey: true,
        },
    ],
    [
        /^\s*gephi\b/i,
        {
            dialect: "gephi",
            tool: "gephi",
            vocabulary: "graphlet",
            spelling: "css",
            units: "relative",
            labelKey: false,
        },
    ],
    [
        /^\s*ogdf::/i,
        { dialect: "ogdf", tool: "ogdf", vocabulary: "ogdf", spelling: "css", units: "px", labelKey: true },
    ],
    // igraph writes a Creator line, but no drawing defaults of igraph's are stated by a primary source
    [
        /^\s*igraph\b/i,
        { dialect: "igraph", tool: null, vocabulary: "graphlet", spelling: "css", units: "px", labelKey: true },
    ],
];

/** Any other writer (NetworkX, SNDlib, hand-written files): the GML draft's keys, no defaults. */
const UNKNOWN_WRITER: GmlWriter = {
    dialect: "gml",
    tool: null,
    vocabulary: "graphlet",
    spelling: "css",
    units: "px",
    labelKey: true,
};

/** A file graphty wrote: yEd keys, and the `graphty.styles` block gives the rules. */
const GRAPHTY_WRITER: GmlWriter = { ...WRITERS[0][1], tool: null };

/**
 * The graph key holding the `graphty.styles` block: the block's name under the GML writer's rule for names that are
 * not GML keys.
 * @category Built-in formats
 */
export const GML_STYLE_BLOCK_KEY = mangleGmlKey(STYLE_BLOCK_NAME);

/** The key prefix of the per-element style values (`graphty.style.` under the same rule). */
const TAG_PREFIX = mangleGmlKey("graphty.style.");

/**
 * The GML key of one style column's per-element values.
 * @param target - nodes or edges
 * @param key - the style column's key
 * @returns the key
 */
function tagKey(target: StyleTarget, key: string): string {
    return mangleGmlKey(styleTag(target, key));
}

/**
 * A graph value as text, or null.
 * @param snapshot - the graph
 * @param name - the graph column
 * @returns the text
 */
function graphText(snapshot: GraphSnapshot, name: string): string | null {
    if (!snapshot.graph.has(name)) {
        return null;
    }
    const v = plainCell(snapshot.graph.value(name, 0));
    if (typeof v === "string") {
        return v;
    }
    return typeof v === "number" ? String(v) : null;
}

/**
 * Who wrote a GML file: the `Creator` line (top level, or a key of the graph block as Gephi writes it), or graphty when
 * the file holds a `graphty.styles` block.
 * @param snapshot - the graph
 * @returns the writer
 */
function writerOf(snapshot: GraphSnapshot): GmlWriter {
    if (snapshot.graph.has(GML_STYLE_BLOCK_KEY)) {
        return GRAPHTY_WRITER;
    }
    const creator = snapshot.meta.creator ?? graphText(snapshot, "Creator") ?? "";
    for (const [pattern, writer] of WRITERS) {
        if (pattern.test(creator)) {
            return writer;
        }
    }
    return UNKNOWN_WRITER;
}

// ============================================================ reading

/** One element's canonical value of a property; null leaves it unset. */
type Put = (property: string, value: StyleValue | null) => void;

/** Where a value of an element was read, by property. */
type At = (property: string) => CanonSite;

/** The edge's `arrow` key of the GML draft: which ends have an arrow. */
const ARROW_ENDS: ReadonlyMap<string, readonly [string, string]> = new Map([
    ["none", ["none", "none"]],
    ["last", ["none", "triangle"]],
    ["first", ["triangle", "none"]],
    ["both", ["triangle", "triangle"]],
]);

/** OGDF's stroke types (`stipple`), by number. */
const OGDF_STROKES: readonly string[] = ["none", "solid", "dashed", "dotted", "dash-dot", "dash-dot"];

/** OGDF's shape names the common table does not know. */
const OGDF_SHAPES: ReadonlyMap<string, string> = new Map([
    ["rect", "rectangle"],
    ["rhomb", "diamond"],
    ["trapeze", "trapezoid"],
    ["invtrapeze", "trapezoid"],
    ["invtriangle", "triangle"],
    ["invparallelogram", "parallelogram"],
]);

/** Keys only yEd writes in a label record: its `fill` is the label's background, not the text color. */
const YED_LABEL_KEYS: readonly string[] = [
    "outline",
    "autoSizePolicy",
    "model",
    "configuration",
    "borderDistance",
    "modelName",
    "modelPosition",
];

/** Cytoscape's legacy numbered arrows (`source_arrow 3`), read as Cytoscape reads them. */
const cytoscapeArrow = CYTOSCAPE_LEXICON.edge.get("targetArrow")?.[0]?.[1];

/**
 * A short sample of a value for a note.
 * @param raw - the value
 * @returns its text, or "a record" for a record
 */
function sampleOf(raw: unknown): string {
    return typeof raw === "string" || typeof raw === "number"
        ? String(raw).slice(0, MAX_STYLE_VALUE_LENGTH)
        : "a record";
}

/**
 * Whether a value is a GML record.
 * @param v - the value
 * @returns true for a non-array object
 */
function isRec(v: unknown): v is Rec {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * The first defined value of some keys of a record.
 * @param r - the record
 * @param keys - the keys, in order of preference
 * @returns the value, or undefined
 */
function first(r: Rec, ...keys: string[]): unknown {
    for (const k of keys) {
        if (Object.hasOwn(r, k) && r[k] !== undefined) {
            return r[k];
        }
    }
    return undefined;
}

/**
 * Reads a color and its alpha.
 * @param raw - the value
 * @param property - the color property
 * @param opacity - its opacity property, or null
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readColor(raw: unknown, property: string, opacity: string | null, writer: GmlWriter, put: Put, at: At): void {
    if (raw === undefined) {
        return;
    }
    const c = canonColor(raw, writer.spelling, at(property));
    if (c === null) {
        return;
    }
    put(property, c.color);
    const alpha = colorOpacity(c, null, at(property), opacity !== null);
    if (opacity !== null) {
        put(opacity, alpha);
    }
}

/**
 * A stroke style: OGDF's numbered `stipple`, or a line type name.
 * @param raw - the value
 * @param kind - border or line style
 * @param writer - the writer
 * @param at - the site
 * @returns the style, or null
 */
function strokeStyle(raw: unknown, kind: "borderStyle" | "lineStyle", writer: GmlWriter, at: CanonSite): string | null {
    if (raw === undefined) {
        return null;
    }
    if (writer.vocabulary === "ogdf") {
        const stroke = OGDF_STROKES[Number(raw)] as string | undefined;
        if (stroke === undefined || stroke === "none") {
            noteAt(at, STYLE_ISSUE.UNKNOWN_VALUE, sampleOf(raw));
            return null;
        }
        return stroke;
    }
    return canonEnum(kind, raw, writer.spelling, at);
}

/**
 * Reads one node's `graphics` record.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readNodeGraphics(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    const v = writer.vocabulary;
    if (v === "yed" && Number(g.hasFill) === 0) {
        noteAt(at("fill"), STYLE_ISSUE.NO_FILL, "hasFill 0");
        put("fillOpacity", 0);
    } else {
        readColor(g.fill, "fill", "fillOpacity", writer, put, at);
        if (g.fill2 !== undefined) {
            noteAt(at("fill"), STYLE_ISSUE.GRADIENT, sampleOf(g.fill2));
        }
    }
    if (v === "yed" && Number(g.hasOutline) === 0) {
        put("borderWidth", 0);
    } else {
        readColor(v === "ogdf" ? g.line : g.outline, "borderColor", null, writer, put, at);
        let width: unknown;
        if (v === "yed") {
            width = g.outlineWidth;
        } else if (v === "cytoscape") {
            width = first(g, "outline_width", "width");
        } else if (v === "ogdf") {
            width = g.lineWidth;
        } else {
            width = first(g, "width", "outlineWidth");
        }
        put("borderWidth", width === undefined ? null : canonNumber(width, at("borderWidth")));
    }
    put(
        "borderStyle",
        strokeStyle(v === "ogdf" ? g.stipple : g.outlineStyle, "borderStyle", writer, at("borderStyle")),
    );
    put("width", g.w === undefined ? null : canonNumber(g.w, at("width")));
    put("height", g.h === undefined ? null : canonNumber(g.h, at("height")));
    if (g.type !== undefined) {
        const raw =
            v === "ogdf" && typeof g.type === "string" ? (OGDF_SHAPES.get(g.type.toLowerCase()) ?? g.type) : g.type;
        put("shape", canonEnum("shape", raw, writer.spelling, at("shape")));
    }
}

/**
 * Reads one edge's `graphics` record.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readEdgeGraphics(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    const v = writer.vocabulary;
    readColor(g.fill, "color", "opacity", writer, put, at);
    const width = v === "ogdf" ? first(g, "lineWidth", "width") : g.width;
    put("width", width === undefined ? null : canonNumber(width, at("width")));
    put("lineStyle", strokeStyle(v === "ogdf" ? g.stipple : g.style, "lineStyle", writer, at("lineStyle")));
    if (typeof g.arrow === "string") {
        const ends = ARROW_ENDS.get(g.arrow.trim().toLowerCase());
        if (ends === undefined) {
            noteAt(at("targetArrow"), STYLE_ISSUE.UNKNOWN_VALUE, g.arrow.slice(0, MAX_STYLE_VALUE_LENGTH));
        } else {
            put("sourceArrow", ends[0]);
            put("targetArrow", ends[1]);
        }
    }
    for (const [keys, property] of [
        [["sourceArrow", "source_arrow"], "sourceArrow"],
        [["targetArrow", "target_arrow"], "targetArrow"],
    ] as const) {
        const raw = first(g, ...keys);
        if (raw === undefined) {
            continue;
        }
        put(
            property,
            v === "cytoscape" && cytoscapeArrow !== undefined
                ? cytoscapeArrow(raw, at(property))
                : canonEnum("arrow", raw, writer.spelling, at(property)),
        );
    }
    if (v === "yed" && g.smoothBends !== undefined) {
        put("curved", Number(g.smoothBends) === 1);
    }
}

/**
 * Reads an element's label records: the first visible one with text; further visible ones are noted.
 * @param raw - the `LabelGraphics` value (one record or several)
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readLabelGraphics(raw: unknown, writer: GmlWriter, put: Put, at: At): void {
    let label: Rec | null = null;
    let extra = 0;
    for (const l of Array.isArray(raw) ? raw : [raw]) {
        if (!isRec(l) || Number(l.visible) === 0) {
            continue;
        }
        if (label === null) {
            label = l;
        } else if (l.text !== undefined) {
            extra++;
        }
    }
    if (label === null) {
        return;
    }
    if (extra > 0) {
        noteAt(at("label"), STYLE_ISSUE.EXTRA_LABELS, `${String(extra + 1)} labels`);
    }
    const lg = label;
    if (lg.text !== undefined) {
        put("label", canonText(lg.text, at("label")));
    }
    // the GML draft's `fill` is the text color; yEd's is the label's background box, its `color` the text color
    const yedLabel = writer.vocabulary === "yed" || YED_LABEL_KEYS.some((k) => Object.hasOwn(lg, k));
    if (lg.color !== undefined) {
        readColor(lg.color, "labelColor", null, writer, put, at);
    } else if (lg.fill !== undefined && !yedLabel) {
        readColor(lg.fill, "labelColor", null, writer, put, at);
    }
    if (lg.fill !== undefined && yedLabel) {
        noteAt(at("label"), STYLE_ISSUE.NOT_CARRIED, "label background");
    }
    put("labelSize", lg.fontSize === undefined ? null : canonNumber(lg.fontSize, at("labelSize")));
    put("labelFont", lg.fontName === undefined ? null : canonText(lg.fontName, at("labelFont")));
    const style = scalarText(lg.fontStyle, at("labelWeight"))?.trim().toLowerCase();
    if (style !== undefined) {
        const known = FONT_STYLES.get(style);
        if (known === undefined) {
            noteAt(at("labelWeight"), STYLE_ISSUE.UNKNOWN_VALUE, style.slice(0, MAX_STYLE_VALUE_LENGTH));
        } else {
            put("labelWeight", known[0]);
            put("labelItalic", known[1]);
        }
    }
}

/**
 * Reads one element: its `graphics` and `LabelGraphics`, and the `label` key where the writer draws it.
 * @param target - nodes or edges
 * @param g - the graphics value
 * @param lg - the LabelGraphics value
 * @param label - the `label` key's value
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readElement(
    target: StyleTarget,
    g: unknown,
    lg: unknown,
    label: unknown,
    writer: GmlWriter,
    put: Put,
    at: At,
): void {
    let text = false;
    const putLabel: Put = (property, value) => {
        text ||= property === "label" && value !== null;
        put(property, value);
    };
    if (isRec(g)) {
        (target === "node" ? readNodeGraphics : readEdgeGraphics)(g, writer, put, at);
    }
    if (lg !== null && lg !== undefined) {
        readLabelGraphics(lg, writer, putLabel, at);
    }
    // the GML draft draws the label key; Cytoscape reads it as the node's name, which its default style shows
    const drawn =
        writer.vocabulary === "cytoscape" ? target === "node" : writer.labelKey && (isRec(g) || lg !== undefined);
    if (!text && drawn && label !== null && label !== undefined) {
        put("label", canonText(label, at("label")));
    }
}

/**
 * The value of a column, or undefined when the table has no such column.
 * @param table - the node or edge table
 * @param name - the column
 * @param i - the row
 * @returns the value
 */
function cellOf(table: GraphSnapshot["nodes"], name: string, i: number): unknown {
    if (!table.has(name)) {
        return undefined;
    }
    const v = plainCell(table.value(name, i));
    return v ?? undefined;
}

/**
 * Every element's values, read with a writer's vocabulary.
 * @param snapshot - the graph
 * @param writer - the writer
 * @param notes - where problems are noted
 * @param context - the work budget
 * @returns the values per target, and whether anything was read
 */
function readValues(
    snapshot: GraphSnapshot,
    writer: GmlWriter,
    notes: StyleNotes,
    context: Pick<StyleReadContext, "budget">,
): { readonly node: ValueColumns; readonly edge: ValueColumns; readonly found: boolean } {
    let found = false;
    const read = (target: StyleTarget): ValueColumns => {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const out = valueColumns(n);
        if (!table.has("graphics") && !table.has("LabelGraphics") && !(writer.vocabulary === "cytoscape")) {
            return out.values;
        }
        for (let i = 0; i < n; i++) {
            context.budget.spend(target, 1);
            const at: At = (property) => ({ notes, target, property, element: i, budget: context.budget });
            readElement(
                target,
                cellOf(table, "graphics", i),
                cellOf(table, "LabelGraphics", i),
                cellOf(table, "label", i),
                writer,
                (property, value) => {
                    if (value !== null) {
                        found = true;
                        out.put(i, property, value);
                    }
                },
                at,
            );
        }
        return out.values;
    };
    const node = read("node");
    const edge = read("edge");
    return { node, edge, found };
}

/**
 * The `graphty.styles` block of a file graphty wrote, with the per-element values its rules read moved inside it from
 * their `graphty_style_*` keys; the block as written when it is ignored anyway (graph-io then says why).
 * @param snapshot - the graph
 * @param text - the block's text
 * @returns the block's text for graph-io to read
 */
function blockWithValues(snapshot: GraphSnapshot, text: string): string {
    const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
    if (!parsed.ok || parsed.block.values !== undefined) {
        return text;
    }
    const values: Record<StyleTarget, Record<string, StyleColumn>> = { node: {}, edge: {} };
    for (const target of ["node", "edge"] as const) {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        for (const key of parsed.block.columns[target]) {
            const name = tagKey(target, key);
            if (!table.has(name)) {
                // a style column is missing: graph-io ignores the block with a note
                return text;
            }
            const col: (StyleValue | null)[] = [];
            for (let i = 0; i < n; i++) {
                const v = plainCell(table.value(name, i));
                col.push(typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : null);
            }
            values[target][key] = col;
        }
    }
    const raw = JSON.parse(text) as Record<string, unknown>;
    return JSON.stringify({ ...raw, values });
}

/**
 * The columns of a table that hold styles: the graphics records and graphty's per-element style values.
 * @param table - the node or edge table
 * @returns the column names
 */
function styleColumns(table: GraphSnapshot["nodes"]): string[] {
    return [...table.names()].filter((c) => c === "graphics" || c === "LabelGraphics" || c.startsWith(TAG_PREFIX));
}

/**
 * The styles of a GML file, read the way the program that wrote it draws them, with that program's defaults beneath:
 * yEd, Cytoscape, Gephi and OGDF are recognized by the `Creator` line; igraph and every other writer get the GML
 * draft's keys and no defaults. A file graphty wrote gives back its `graphty.styles` block.
 * @param snapshot - the graph the import built
 * @param context - the work budget
 * @returns the styles, or null when the file has none
 */
export function gmlStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles | null {
    const notes = new StyleNotes();
    const writer = writerOf(snapshot);
    const values = readValues(snapshot, writer, notes, context);
    const blockText = graphText(snapshot, GML_STYLE_BLOCK_KEY);
    const block = blockText === null ? null : blockWithValues(snapshot, blockText);
    if (block !== null) {
        exactFromBlock(snapshot, block, values);
    }
    if (writer.tool === null && !values.found && block === null) {
        return null;
    }
    const gephi =
        writer.tool === "gephi"
            ? gephiRules(snapshot, values.node.fill, values.edge.color, context.budget)
            : { rules: [], columns: new Map<string, StyleColumn>() };
    return {
        canonical: true,
        dialect: writer.dialect,
        tool: writer.tool,
        units: writer.units,
        node: { values: values.node },
        edge: { values: values.edge, rules: gephi.rules, columns: gephi.columns },
        notes: notes.list(),
        block,
        // the graphics records and the per-element style values of a file graphty wrote hold styles, not data
        readFrom: { node: styleColumns(snapshot.nodes), edge: styleColumns(snapshot.edges) },
    };
}

// ============================================================ writing

/**
 * What the GML writer holds natively: yEd GML `graphics` and `LabelGraphics`. The `graphty.styles` block and the
 * per-element values its rules read are keys of the graph and of each element.
 * @category Built-in formats
 */
export const GML_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
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
    ] as const),
    edge: Object.freeze([
        "color",
        "opacity",
        "width",
        "lineStyle",
        "sourceArrow",
        "targetArrow",
        "curved",
        "label",
        "labelColor",
        "labelSize",
        "labelFont",
        "labelWeight",
        "labelItalic",
    ] as const),
    block: "native",
});

/** Every style key a reader here reads, per record: the writer replaces them all. */
const OWNED: Readonly<Record<"node" | "edge" | "label", ReadonlySet<string>>> = {
    node: new Set([
        "fill",
        "fill2",
        "hasFill",
        "outline",
        "hasOutline",
        "outlineWidth",
        "outline_width",
        "outlineStyle",
        "width",
        "line",
        "lineWidth",
        "stipple",
        "w",
        "h",
        "type",
    ]),
    edge: new Set([
        "fill",
        "width",
        "lineWidth",
        "style",
        "stipple",
        "arrow",
        "sourceArrow",
        "targetArrow",
        "source_arrow",
        "target_arrow",
        "smoothBends",
    ]),
    label: new Set(["text", "color", "fill", "fontSize", "fontName", "fontStyle", "visible"]),
};

/** One element's value of a property. */
type Get = (property: string) => StyleValue | null;

/** Records a value written as the nearest one yEd has. */
type Approximate = (property: string, value: StyleValue) => void;

/**
 * A node's yEd `graphics` keys from its values.
 * @param get - the node's values
 * @param approximate - records approximations
 * @returns the keys
 */
function nodeGraphics(get: Get, approximate: Approximate): Rec {
    const g: Rec = {};
    const width = get("width");
    const height = get("height");
    if (typeof width === "number") {
        g.w = width;
    }
    if (typeof height === "number") {
        g.h = height;
    }
    const shape = get("shape");
    if (typeof shape === "string") {
        const w = yedValue(YED_SHAPES, shape, shape === "vee" ? "triangle" : "rectangle");
        if (!w.exact) {
            approximate("shape", shape);
        }
        g.type = w.value;
    }
    const fill = get("fill");
    const fillOpacity = get("fillOpacity");
    if (typeof fill === "string") {
        g.fill = yedColor(fill, fillOpacity);
    } else if (fillOpacity === 0) {
        g.hasFill = 0;
    }
    const borderColor = get("borderColor");
    const borderWidth = get("borderWidth");
    const borderStyle = get("borderStyle");
    if (typeof borderColor === "string") {
        g.outline = borderColor.toUpperCase();
    }
    if (typeof borderStyle === "string") {
        const w = yedValue(YED_LINES, borderStyle, "line");
        if (!w.exact) {
            approximate("borderStyle", borderStyle);
        }
        g.outlineStyle = w.value;
    }
    if (borderWidth === 0) {
        g.hasOutline = 0;
    } else if (typeof borderWidth === "number") {
        g.outlineWidth = borderWidth;
    }
    return g;
}

/**
 * An edge's yEd `graphics` keys from its values.
 * @param get - the edge's values
 * @param approximate - records approximations
 * @returns the keys
 */
function edgeGraphics(get: Get, approximate: Approximate): Rec {
    const g: Rec = {};
    const color = get("color");
    if (typeof color === "string") {
        g.fill = yedColor(color, get("opacity"));
    }
    const width = get("width");
    if (typeof width === "number") {
        g.width = width;
    }
    const lineStyle = get("lineStyle");
    if (typeof lineStyle === "string") {
        const w = yedValue(YED_LINES, lineStyle, lineStyle === "long-dash" ? "dashed" : "line");
        if (!w.exact) {
            approximate("lineStyle", lineStyle);
        }
        g.style = w.value;
    }
    for (const property of ["sourceArrow", "targetArrow"]) {
        const arrow = get(property);
        if (typeof arrow === "string") {
            const w = yedValue(YED_ARROWS, arrow, "standard");
            if (!w.exact) {
                approximate(property, arrow);
            }
            g[property] = w.value;
        }
    }
    const curved = get("curved");
    if (typeof curved === "boolean") {
        g.smoothBends = curved ? 1 : 0;
    }
    return g;
}

/**
 * An element's yEd `LabelGraphics` keys from its values, or null when it has no label text.
 * @param get - the element's values
 * @returns the keys
 */
function labelGraphics(get: Get): Rec | null {
    const text = get("label");
    if (typeof text !== "string" || text.trim().length === 0) {
        return null;
    }
    const lg: Rec = { text };
    const color = get("labelColor");
    if (typeof color === "string") {
        lg.color = color.toUpperCase();
    }
    const size = get("labelSize");
    if (typeof size === "number") {
        lg.fontSize = size;
    }
    const font = get("labelFont");
    if (typeof font === "string") {
        lg.fontName = font;
    }
    const weight = get("labelWeight");
    const italic = get("labelItalic");
    if (weight !== null || italic !== null) {
        const style = (weight === "bold" ? "bold" : "") + (italic === true ? "italic" : "");
        lg.fontStyle = style.length === 0 ? "plain" : style;
    }
    return lg;
}

/**
 * A record with the style keys replaced: the kept keys of the old record, then the written ones.
 * @param old - the record the element had, or anything else
 * @param owned - the style keys
 * @param written - the new style keys
 * @returns the record, or undefined (an unset cell) when it is empty
 */
function merged(old: unknown, owned: ReadonlySet<string>, written: Rec): Rec | undefined {
    const out: Rec = {};
    if (isRec(old)) {
        for (const [k, v] of Object.entries(old)) {
            if (!owned.has(k)) {
                out[k] = v;
            }
        }
    }
    Object.assign(out, written);
    return Object.keys(out).length === 0 ? undefined : out;
}

/**
 * An element's `LabelGraphics` value with its first label's style keys replaced; further labels are kept.
 * @param old - the value the element had
 * @param written - the new label keys, or null for no label
 * @returns the value, or undefined (an unset cell)
 */
function mergedLabels(old: unknown, written: Rec | null): unknown {
    const labels = Array.isArray(old) ? old : [old];
    const head = merged(labels[0], OWNED.label, written ?? {});
    const rest = labels.slice(1).filter((l) => l !== null && l !== undefined);
    if (rest.length === 0) {
        return head;
    }
    return head === undefined ? rest : [head, ...rest];
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
    for (const p of GML_STYLE_CAPABILITIES[target]) {
        columns.set(p, picture(target, p));
    }
    return (i) => (property) => columns.get(property)?.[i] ?? null;
}

/**
 * For a file graphty wrote: where a value read from the graphics is what the writer writes for the block's own value
 * (a pentagon written as a rectangle, an opacity rounded to 255 steps), the block's exact value is the truth, so a
 * re-import gives back the same rules; a value another program changed since stays the truth.
 * @param snapshot - the graph
 * @param text - the block's text
 * @param read - the values read, changed in place
 * @param read.node - the node values
 * @param read.edge - the edge values
 */
function exactFromBlock(
    snapshot: GraphSnapshot,
    text: string,
    read: { readonly node: ValueColumns; readonly edge: ValueColumns },
): void {
    const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
    const ex = parsed.ok ? blockStyles(parsed.block, snapshot, "gml") : null;
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
            const g = target === "node" ? nodeGraphics(want, ignore) : edgeGraphics(want, ignore);
            const back = new Map<string, StyleValue>();
            readElement(
                target,
                g,
                labelGraphics(want) ?? undefined,
                undefined,
                GRAPHTY_WRITER,
                (property, value) => {
                    if (value !== null) {
                        back.set(property, value);
                    }
                },
                (property) => ({ notes, target, property }),
            );
            for (const property of GML_STYLE_CAPABILITIES[target]) {
                const native = values[property]?.[i] ?? null;
                const w = want(property);
                if (native !== w && native === (back.get(property) ?? null)) {
                    (values[property] ??= new Array<StyleValue | null>(n).fill(null))[i] = w;
                }
            }
        }
    }
}

/** A GML export with styles worked out. */
interface GmlStyledExport {
    /** The graph to write: yEd graphics written from the styles, the block and the per-element style values added. */
    readonly snapshot: GraphSnapshot;
    /** W_STYLE_APPROXIMATED for every value written as the nearest one yEd has. */
    readonly notes: readonly LossNote[];
}

/**
 * Works out a GML export with styles: every node's and edge's `graphics` and `LabelGraphics` records get yEd's keys
 * for what graphty draws in place of every style key they had (positions, bends and other keys stay), the
 * `graphty.styles` block becomes the graph key `graphty_styles` and the per-element values its rules read become
 * element keys. Should two style columns map to one key, the values go inside the block instead.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles, or undefined when none are written
 * @returns the styled export, or null without styles
 */
export function gmlStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
): GmlStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const approximated = new Map<string, { count: number; samples: Set<string> }>();
    const out = snapshot.withColumns();
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
        const graphics: unknown[] = [];
        const labels: unknown[] = [];
        for (let i = 0; i < n; i++) {
            const g = target === "node" ? nodeGraphics(get(i), approximate) : edgeGraphics(get(i), approximate);
            graphics.push(merged(cellOf(table, "graphics", i), OWNED[target], g));
            labels.push(mergedLabels(cellOf(table, "LabelGraphics", i), labelGraphics(get(i))));
        }
        for (const [name, cells] of [
            ["graphics", graphics],
            ["LabelGraphics", labels],
        ] as const) {
            if (cells.some((c) => c !== undefined)) {
                table.set(name, cells, { dtype: "json", nullable: true });
            } else if (table.has(name)) {
                table.remove(name);
            }
        }
        for (const name of [...table.names()]) {
            if (name.startsWith(TAG_PREFIX)) {
                table.remove(name);
            }
        }
    }
    let { block } = input;
    const keys = [...input.rules.columns.node.keys()].map((k) => tagKey("node", k));
    const edgeKeys = [...input.rules.columns.edge.keys()].map((k) => tagKey("edge", k));
    if (new Set(keys).size !== keys.length || new Set(edgeKeys).size !== edgeKeys.length) {
        block = writeStyleBlock(input.rules, { inlineColumns: true, snapshot });
    } else {
        for (const target of ["node", "edge"] as const) {
            const table = target === "node" ? out.nodes : out.edges;
            for (const [key, col] of input.rules.columns[target]) {
                const kinds = new Set(col.filter((v) => v !== null).map((v) => typeof v));
                const text = kinds.size > 1 || kinds.has("string");
                let dtype: "string" | "bool" | "f64" = kinds.has("boolean") ? "bool" : "f64";
                if (text) {
                    dtype = "string";
                }
                table.set(tagKey(target, key), text ? col.map((v) => (v === null ? null : String(v))) : col, { dtype });
            }
        }
    }
    out.graph.set(GML_STYLE_BLOCK_KEY, [block], { dtype: "string" });
    const notes: LossNote[] = [];
    for (const [key, a] of approximated) {
        const [target, property] = key.split(".") as [StyleTarget, string];
        notes.push(
            Object.freeze({
                code: STYLE_ISSUE.APPROXIMATED,
                message: `${target} ${property} is written as the nearest value yEd's GML has for ${String(a.count)} ${target}${a.count === 1 ? "" : "s"} (${[...a.samples].join(", ")}); the graphty.styles block keeps the exact value`,
                column: null,
                count: a.count,
                style: Object.freeze({ target, property: property as never }),
            }),
        );
    }
    return { snapshot: out, notes };
}
