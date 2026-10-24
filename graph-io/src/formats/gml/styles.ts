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

import {
    type BendPoint,
    bendsToPoints,
    canonBends,
    canonNodeOffsets,
    nodeOffsetsToPoints,
} from "../../styles/canon/bends.js";
import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber, canonSigned, num6 } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt, scalarText } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { CYTOSCAPE_LEXICON, javaFamily } from "../../styles/cytoscape/lexicon.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import {
    parseStyleBlock,
    STYLE_BLOCK_NAME,
    styleBlockLosses,
    styleTag,
    writeStyleBlock,
} from "../../styles/io/block.js";
import { elementValues, takeFromBlock } from "../../styles/io/round-trip.js";
import { dataRead, type ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell } from "../../styles/plan/resolve.js";
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
import { GRAPHVIZ_GLYPH_SHAPES } from "../dot/drawing.js";
import {
    graphvizArrowValue,
    graphvizHasNoOutline,
    graphvizOutline,
    graphvizRouteBends,
    PERIPHERY_GAP,
    putGlyph,
    SHAPE_PERIPHERIES,
} from "../dot/styles.js";
import { gephiRules } from "../gexf/styles.js";
import {
    configurationOutline,
    FONT_STYLES,
    type ValueColumns,
    valueColumns,
    YED_ARROWS,
    YED_LINES,
    YED_SHAPES,
    yedColor,
    yedFontName,
    yedSpelled,
    yedValue,
} from "../graphml/styles-yed.js";
import { writtenByGv2gml } from "./positions.js";
import { KEY_MANGLED_CODE, mangleGmlKey } from "./syntax.js";

/** A GML record as the importer keeps it (a json cell). */
type Rec = Record<string, unknown>;

/** The key vocabulary a file's graphics are read with. */
type Vocabulary = "yed" | "cytoscape" | "ogdf" | "graphlet" | "graphviz";

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
    /** Whether the graph is directed, where its edges' arrows depend on it (gv2gml's). */
    readonly directed?: boolean;
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
            // Gephi's preview draws node labels as the GEXF reader reads them (formats/gexf/styles.ts)
            labelKey: true,
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

/**
 * Graphviz's gv2gml (no `Creator`; `version 2` inside the graph): Graphviz's attribute values (shape names, colors,
 * arrow names, sizes in points, y up) under GML keys, with Graphviz's defaults beneath.
 */
const GV2GML_WRITER: GmlWriter = {
    dialect: "graphviz",
    tool: "graphviz",
    vocabulary: "graphviz",
    spelling: "graphviz",
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
 * A node label's `anchor` as a label position: yEd's `n`, `s`, `e`, `w` and the corners `nw`, `ne`, `sw`, `se` place it
 * outside the node; `c` and the inside places `t`, `b`, `l`, `r`, `tl`, `tr`, `bl`, `br` keep it inside, which graphty
 * draws centered.
 */
const GML_ANCHORS: ReadonlyMap<string, string> = new Map([
    ...["c", "t", "b", "l", "r", "tl", "tr", "bl", "br"].map((a): [string, string] => [a, "center"]),
    ["n", "top"],
    ["s", "bottom"],
    ["e", "right"],
    ["w", "left"],
    ["nw", "top-left"],
    ["ne", "top-right"],
    ["sw", "bottom-left"],
    ["se", "bottom-right"],
]);

/** Node keys only yEd writes: its group hierarchy. */
const YED_NODE_KEYS: readonly string[] = ["isGroup", "gid"];

/**
 * Who wrote a GML file: the `Creator` line (top level, or a key of the graph block as Gephi writes it), graphty when
 * the file holds a `graphty.styles` block, or yEd when a file with no `Creator` holds keys only yEd writes (`isGroup`,
 * `gid`, the graph's `hierarchic`).
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
    // keys only yEd writes name it even without a Creator line (BioNetGen writes yEd GML with none)
    if (
        creator.trim() === "" &&
        (YED_NODE_KEYS.some((k) => snapshot.nodes.has(k)) || snapshot.graph.has("hierarchic"))
    ) {
        return WRITERS[0][1];
    }
    return creator.trim() === "" && writtenByGv2gml(snapshot) ? GV2GML_WRITER : UNKNOWN_WRITER;
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

/**
 * The node shape names Cytoscape's GML reader knows (NodeShapeVisualProperty, any case, with Cytoscape 2.x's `rect`
 * and `round_rect`); any other name it ignores, so its default style's shape is drawn.
 */
const CYTOSCAPE_GML_SHAPES: ReadonlyMap<string, string> = new Map([
    ["ellipse", "ellipse"],
    ["round_rectangle", "round-rectangle"],
    ["round_rect", "round-rectangle"],
    ["rectangle", "rectangle"],
    ["rect", "rectangle"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["parallelogram", "parallelogram"],
    ["triangle", "triangle"],
    ["vee", "vee"],
    ["diamond", "diamond"],
]);

/** OGDF's stroke types (`stipple`): by number as older OGDF writes them, or by name as GraphIO::writeGML does. */
const OGDF_STROKES: readonly string[] = ["none", "solid", "dashed", "dotted", "dash-dot", "dash-dot"];
const OGDF_STROKE_NAMES: ReadonlyMap<string, string> = new Map([
    ["none", "none"],
    ["solid", "solid"],
    ["dash", "dashed"],
    ["dot", "dotted"],
    ["dashdot", "dash-dot"],
    ["dashdotdot", "dash-dot"],
]);

/** OGDF's shape names the common table does not know (an Image node without its image draws as its box). */
const OGDF_SHAPES: ReadonlyMap<string, string> = new Map([
    ["rect", "rectangle"],
    ["roundedrect", "round-rectangle"],
    ["rhomb", "diamond"],
    ["image", "rectangle"],
]);

/**
 * OGDF's shapes that GraphIO::drawSVG draws as polygons no named shape matches, with their corners as `shapePoints`
 * (fractions of the half width and height, y up), measured in its drawing of
 * graph-io/test/fidelity/specimens/gml/specimen-node-shapes-p5.gml: the triangles, the pentagon, the hexagon and the
 * octagon are regular, their corners on the ellipse of the node's box (so they are drawn where the points say, not
 * stretched to the box: `OGDF_REGULAR`); the trapezes and parallelograms fill the box, their short side half its width.
 */
const OGDF_POLYGONS: ReadonlyMap<string, string> = new Map([
    ["triangle", "0,1 0.866,-0.5 -0.866,-0.5"],
    ["invtriangle", "0,-1 0.866,0.5 -0.866,0.5"],
    ["pentagon", "0,1 0.951,0.309 0.588,-0.809 -0.588,-0.809 -0.951,0.309"],
    ["hexagon", "1,0 0.5,0.866 -0.5,0.866 -1,0 -0.5,-0.866 0.5,-0.866"],
    [
        "octagon",
        "0.924,0.383 0.383,0.924 -0.383,0.924 -0.924,0.383 -0.924,-0.383 -0.383,-0.924 0.383,-0.924 0.924,-0.383",
    ],
    ["trapeze", "-1,-1 1,-1 0.5,1 -0.5,1"],
    ["invtrapeze", "-1,1 1,1 0.5,-1 -0.5,-1"],
    ["parallelogram", "-1,-1 0.5,-1 1,1 -0.5,1"],
    ["invparallelogram", "-1,1 0.5,1 1,-1 -0.5,-1"],
]);

/** OGDF's regular polygons, whose corners lie on the ellipse of the node's box rather than reaching its sides. */
const OGDF_REGULAR: ReadonlySet<string> = new Set(["triangle", "invtriangle", "pentagon", "hexagon", "octagon"]);

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
        const stroke = ogdfStroke(raw);
        if (stroke === undefined) {
            noteAt(at, STYLE_ISSUE.UNKNOWN_VALUE, sampleOf(raw));
            return null;
        }
        // stroke "none" draws no line at all: the callers turn the border or the edge off
        return stroke === "none" ? null : stroke;
    }
    return canonEnum(kind, raw, writer.spelling, at);
}

/**
 * An OGDF `stipple`: a StrokeType by number or by name.
 * @param raw - the value
 * @returns the line style, "none", or undefined for a value OGDF does not know
 */
function ogdfStroke(raw: unknown): string | undefined {
    const text = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    return /^\d+$/.test(text) ? OGDF_STROKES[Number(text)] : OGDF_STROKE_NAMES.get(text.toLowerCase());
}

/**
 * Reads an OGDF node `type` (a Shape name): a polygon where OGDF draws one, else the shape it names.
 * @param raw - the value
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readOgdfShape(raw: string, writer: GmlWriter, put: Put, at: At): void {
    const name = raw.trim().toLowerCase();
    const points = OGDF_POLYGONS.get(name);
    if (points !== undefined) {
        put("shape", "polygon");
        put("shapePoints", points);
        if (OGDF_REGULAR.has(name)) {
            put("shapePointsStretch", false);
        }
        return;
    }
    put("shape", canonEnum("shape", OGDF_SHAPES.get(name) ?? raw, writer.spelling, at("shape")));
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
    if (v === "graphviz") {
        readGv2gmlNode(g, writer, put, at);
        return;
    }
    readNodeFill(g, writer, put, at);
    readNodeOutline(g, writer, put, at);
    put(
        "borderStyle",
        strokeStyle(v === "ogdf" ? g.stipple : g.outlineStyle, "borderStyle", writer, at("borderStyle")),
    );
    if (v === "ogdf" && g.stipple !== undefined && ogdfStroke(g.stipple) === "none") {
        put("borderWidth", 0);
    }
    readNodeSize(g, writer, put, at);
    if (v === "ogdf") {
        readOgdfLabelOffset(g.label, put, at);
    }
    readNodeShape(g, writer, put, at);
}

/**
 * Reads a node's size from its `graphics` record.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readNodeSize(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    if (writer.tool === "gephi") {
        // Gephi's w is a node's size, a radius: its disc is twice as wide, and its h is never read
        const size = g.w === undefined ? null : canonNumber(g.w, at("width"));
        put("width", size === null ? null : 2 * size);
        put("height", size === null ? null : 2 * size);
    } else {
        put("width", g.w === undefined ? null : canonNumber(g.w, at("width")));
        put("height", g.h === undefined ? null : canonNumber(g.h, at("height")));
    }
}

/**
 * Reads a node's shape from its `graphics` record, in the writer's vocabulary.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readNodeShape(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    const v = writer.vocabulary;
    if (v === "ogdf" && typeof g.type === "string") {
        readOgdfShape(g.type, writer, put, at);
    } else if (v === "cytoscape" && g.type !== undefined) {
        const name = scalarText(g.type, at("shape"))?.trim().toLowerCase() ?? "";
        const shape = CYTOSCAPE_GML_SHAPES.get(name);
        if (shape === undefined) {
            noteAt(at("shape"), STYLE_ISSUE.UNKNOWN_VALUE, name.slice(0, MAX_STYLE_VALUE_LENGTH));
        }
        put("shape", shape ?? null);
    } else if (g.type !== undefined) {
        put("shape", canonEnum("shape", g.type, writer.spelling, at("shape")));
    } else if (v === "yed" && typeof g.customconfiguration === "string") {
        // yEd's flowchart palette keeps a node's shape as a configuration, not a `type`.
        const outline = configurationOutline(g.customconfiguration);
        put("shape", outline?.shape ?? null);
        if (outline?.points !== undefined) {
            put("shapePoints", outline.points);
        }
    }
}

/**
 * Reads where OGDF draws a node's label: GraphIO::writeGML writes the label's center as an offset from the node's
 * center (`graphics [ label [ x y z ] ]`, GraphAttributes::xLabel / yLabel, y down), and GraphIO::drawSVG draws it there.
 * @param label - the graphics record's `label` value
 * @param put - receives the values
 * @param at - the sites
 */
function readOgdfLabelOffset(label: unknown, put: Put, at: At): void {
    if (typeof label !== "object" || label === null || Array.isArray(label)) {
        return;
    }
    const { x, y } = label as Rec;
    put("labelOffsetX", x === undefined ? null : canonSigned(x, at("labelOffsetX")));
    put("labelOffsetY", y === undefined ? null : canonSigned(y, at("labelOffsetY")));
}

/**
 * Reads one node's `graphics` record as Graphviz's gv2gml writes it (cmd/tools/gv2gml.c emitNodeAttrs): `fill` is the
 * node's `fillcolor` (or its `color`), drawn only where `hasFill 1` says `style=filled`; `outline` its pen color,
 * `width` its pen width, `w` and `H` its size in points, `type` its Graphviz shape, `visible 0` its `style=invis`.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readGv2gmlNode(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    const shape = typeof g.type === "string" ? g.type.trim().toLowerCase() : "";
    if (Number(g.hasFill) === 1 || shape === "point") {
        // filled: the opacity is stated even when opaque, over Graphviz's default of no fill
        const c = canonColor(g.fill ?? "black", writer.spelling, at("fill"), { use: "fill" });
        put("fill", c?.color ?? null);
        put("fillOpacity", c?.alpha ?? null);
    } else if (g.fill !== undefined) {
        // Graphviz draws an unfilled node's inside see-through (the tool default), whatever its color
        noteAt(at("fill"), STYLE_ISSUE.UNFILLED, sampleOf(g.fill));
    }
    if (graphvizHasNoOutline(shape)) {
        put("borderWidth", 0);
    } else {
        readColor(g.outline, "borderColor", null, writer, put, at);
        put("borderWidth", g.width === undefined ? null : canonNumber(g.width, at("borderWidth")));
    }
    const borderStyle = strokeStyle(g.outlineStyle, "borderStyle", writer, at("borderStyle"));
    put("borderStyle", borderStyle);
    readGv2gmlRings(g, shape, borderStyle, writer, put, at);
    // gv2gml's w and H are the node's outer size: Graphviz draws each further outline PERIPHERY_GAP outside the one
    // within, so graphty's node (the innermost outline, its ring outside it) is that much smaller
    const rings = 2 * PERIPHERY_GAP * ((SHAPE_PERIPHERIES.get(shape) ?? 1) - 1);
    const inner = (raw: unknown, property: string): number | null => {
        const n = raw === undefined ? null : canonNumber(raw, at(property));
        return n === null ? null : Math.max(0, n - rings);
    };
    put("width", inner(g.w, "width"));
    // gv2gml writes the height as H (gv2gml.c emitReal("H", ...)); h where a later edit spelled it as GML does
    put("height", inner(first(g, "H", "h"), "height"));
    if (Number(g.visible) === 0 && g.visible !== undefined) {
        put("visible", false);
    }
    const outline = graphvizOutline(shape);
    if (shape === "polygon") {
        // ponytail: Graphviz's polygon is a box unless its sides, skew or distortion say otherwise; gv2gml copies
        // those as node keys beside graphics, which this record does not see. Read them when a file has them.
        put("shape", "rectangle");
    } else if (outline !== undefined) {
        put("shape", "polygon");
        put("shapePoints", outline);
        // a Graphviz polygon's corners are where Graphviz draws them, as the DOT reader reads them
        put("shapePointsStretch", false);
    } else if (GRAPHVIZ_GLYPH_SHAPES.has(shape)) {
        const size = (raw: unknown, property: string): number | null =>
            raw === undefined ? null : canonNumber(raw, at(property));
        putGlyph(
            shape,
            size(g.w, "width"),
            size(first(g, "H", "h"), "height"),
            put,
            () => {
                const pen = g.width === undefined ? 1 : Number(g.width);
                return Number.isFinite(pen) ? Math.max(0, pen) : 1;
            },
            () =>
                canonColor(g.outline ?? "black", writer.spelling, at("outerBorderColor"), { use: "line" })?.color ??
                null,
        );
    } else if (g.type !== undefined) {
        put("shape", canonEnum("shape", g.type, "graphviz", at("shape")));
    }
}

/**
 * Reads the second outline Graphviz draws round a `doublecircle`, `doubleoctagon` or `tripleoctagon` (shapes.c):
 * `PERIPHERY_GAP` points outside the first, in its color, width and dashes, as the DOT reader reads it. graphty draws
 * one outer ring, so a third outline is noted as not carried.
 * @param g - the record
 * @param shape - its Graphviz shape, lowercase
 * @param style - its outline's dashes, as read
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readGv2gmlRings(g: Rec, shape: string, style: string | null, writer: GmlWriter, put: Put, at: At): void {
    // ponytail: gv2gml copies a `peripheries` attribute as a node key beside graphics, which this record does not
    // see; the shapes' own outlines are read. Read the key when a file sets it.
    const count = SHAPE_PERIPHERIES.get(shape) ?? 1;
    if (count < 2) {
        return;
    }
    const c = canonColor(g.outline ?? "black", writer.spelling, at("outerBorderColor"), { use: "line" });
    if (c !== null && c.alpha === 0) {
        return;
    }
    const parsed = g.width === undefined ? 1 : Number(g.width);
    const pen = Number.isFinite(parsed) ? Math.max(0, parsed) : 1;
    put("outerBorderColor", c?.color ?? "#000000");
    put("outerBorderOpacity", c !== null && c.alpha < 1 ? c.alpha : null);
    put("outerBorderWidth", pen);
    // the gap between the outline's outer edge and the ring's inner edge
    put("outerBorderOffset", Math.max(0, PERIPHERY_GAP - pen));
    if (style === "dashed" || style === "dotted") {
        put("outerBorderStyle", style);
    }
    if (count > 2) {
        noteAt(at("outerBorderWidth"), STYLE_ISSUE.NOT_CARRIED, `type ${shape}`);
    }
}

/**
 * Reads the fill of one node's `graphics` record.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readNodeFill(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    if (writer.vocabulary === "yed" && Number(g.hasFill) === 0) {
        noteAt(at("fill"), STYLE_ISSUE.NO_FILL, "hasFill 0");
        put("fillOpacity", 0);
        return;
    }
    readColor(g.fill, "fill", "fillOpacity", writer, put, at);
    if (g.fill2 !== undefined) {
        noteAt(at("fill"), STYLE_ISSUE.GRADIENT, sampleOf(g.fill2));
    }
}

/**
 * Reads the outline color and width of one node's `graphics` record.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readNodeOutline(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    const v = writer.vocabulary;
    if (v === "yed" && Number(g.hasOutline) === 0) {
        put("borderWidth", 0);
        return;
    }
    // OGDF's GraphIO::writeGML writes the stroke color as `outline`; older OGDF wrote `line`
    readColor(v === "ogdf" ? first(g, "outline", "line") : g.outline, "borderColor", null, writer, put, at);
    const width = outlineWidthOf(g, v);
    put("borderWidth", width === undefined ? null : canonNumber(width, at("borderWidth")));
}

/**
 * The outline width of a node's `graphics` record, under the key its writer uses.
 * @param g - the record
 * @param v - the writer's vocabulary
 * @returns the raw width, or undefined
 */
function outlineWidthOf(g: Rec, v: GmlWriter["vocabulary"]): unknown {
    switch (v) {
        case "yed":
            return g.outlineWidth;
        case "cytoscape":
            return first(g, "outline_width", "width");
        case "ogdf":
            return g.lineWidth;
        default:
            return first(g, "width", "outlineWidth");
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
    if (v === "graphviz") {
        readGv2gmlEdge(g, writer, put, at);
        return;
    }
    readColor(g.fill, "color", "opacity", writer, put, at);
    const width = v === "ogdf" ? first(g, "lineWidth", "width") : g.width;
    put("width", width === undefined ? null : canonNumber(width, at("width")));
    put("lineStyle", strokeStyle(v === "ogdf" ? g.stipple : g.style, "lineStyle", writer, at("lineStyle")));
    if (v === "ogdf" && g.stipple !== undefined && ogdfStroke(g.stipple) === "none") {
        put("visible", false);
    }
    readEdgeArrows(g, writer, put, at);
    if (v === "yed") {
        readYedCurve(g, put);
    }
}

/**
 * Reads an edge's arrows from its `graphics` record: `arrow` names the ends that have one, and `sourceArrow` and
 * `targetArrow` (or their snake-case spellings) name each end's arrow.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readEdgeArrows(g: Rec, writer: GmlWriter, put: Put, at: At): void {
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
            writer.vocabulary === "cytoscape" && cytoscapeArrow !== undefined
                ? cytoscapeArrow(raw, at(property))
                : canonEnum("arrow", raw, writer.spelling, at(property)),
        );
    }
}

/** gv2gml's `arrow`, from Graphviz's `dir`: `first` is `dir=forward` (the head's arrow), `last` is `dir=back`. */
const GV2GML_DIRECTIONS: ReadonlyMap<string, readonly [boolean, boolean]> = new Map([
    ["first", [false, true]],
    ["last", [true, false]],
    ["both", [true, true]],
    ["none", [false, false]],
]);

/**
 * Reads one edge's `graphics` record as Graphviz's gv2gml writes it (gv2gml.c emitEdgeAttrs): `fill` its color,
 * `width` its pen width (2 for `style=bold`), `style` its dashes, `visible 0` its `style=invis`, `targetArrow` and
 * `sourceArrow` its `arrowhead` and `arrowtail`, and `arrow` its `dir`. With none of the arrow keys an edge of a
 * directed graph has Graphviz's default arrowhead, and one of an undirected graph none.
 * @param g - the record
 * @param writer - the writer
 * @param put - receives the values
 * @param at - the sites
 */
function readGv2gmlEdge(g: Rec, writer: GmlWriter, put: Put, at: At): void {
    readColor(g.fill, "color", "opacity", writer, put, at);
    put("width", g.width === undefined ? null : canonNumber(g.width, at("width")));
    put("lineStyle", strokeStyle(g.style, "lineStyle", writer, at("lineStyle")));
    if (Number(g.visible) === 0 && g.visible !== undefined) {
        put("visible", false);
    }
    const ends = gv2gmlArrowEnds(g, writer.directed === true);
    if (ends === null) {
        return;
    }
    for (const [end, raw, on] of [
        ["target", g.targetArrow, ends[1]],
        ["source", g.sourceArrow, ends[0]],
    ] as const) {
        const name = typeof raw === "string" ? raw : "normal";
        const arrow = on ? graphvizArrowValue(name, at(`${end}Arrow`)) : null;
        put(`${end}Arrow`, arrow === null ? "none" : arrow.value);
        if (arrow?.side !== null && arrow?.side !== undefined) {
            put(`${end}ArrowSide`, arrow.side);
        }
    }
}

/**
 * Which ends of a gv2gml edge Graphviz draws an arrow at, as its `dir` says (forward in a directed graph when the
 * record names no arrow), or null for an undirected graph's edge that names none.
 * @param g - the edge's `graphics` record
 * @param directed - whether the graph is directed (its `dir` defaults to forward)
 * @returns [source, target], or null
 */
function gv2gmlArrowEnds(g: Rec, directed: boolean): readonly [boolean, boolean] | null {
    if (g.arrow === undefined && g.targetArrow === undefined && g.sourceArrow === undefined) {
        // Graphviz's dir is forward in a digraph and its arrowhead normal: gv2gml writes neither when unset
        return directed ? [false, true] : null;
    }
    let dir = directed ? "first" : "none";
    if (typeof g.arrow === "string") {
        dir = g.arrow.trim().toLowerCase();
    }
    return GV2GML_DIRECTIONS.get(dir) ?? null;
}

/**
 * Reads whether yEd draws an edge curved: `smoothBends` rounds the bends of its `Line`, whose points run from the
 * source through the bends to the target, so a line of two points (or none) stays straight.
 * @param g - the edge's `graphics` record
 * @param put - receives the value
 */
function readYedCurve(g: Rec, put: Put): void {
    if (g.smoothBends !== undefined) {
        const points = isRec(g.Line) ? g.Line.point : undefined;
        put("curved", Number(g.smoothBends) === 1 && Array.isArray(points) && points.length > 2);
    }
}

/**
 * Reads an element's label records: the first visible one with text; further visible ones are noted.
 * @param raw - the `LabelGraphics` value (one record or several)
 * @param writer - the writer
 * @param node - whether the label is a node's: its `anchor` places it (`c`, `n`, `t`, `se`, ...)
 * @param put - receives the values
 * @param at - the sites
 */
function readLabelGraphics(raw: unknown, writer: GmlWriter, node: boolean, put: Put, at: At): void {
    const visible = (Array.isArray(raw) ? raw : [raw]).filter((l): l is Rec => isRec(l) && Number(l.visible) !== 0);
    const lg = visible.at(0);
    if (lg === undefined) {
        return;
    }
    const extra = visible.slice(1).filter((l) => l.text !== undefined).length;
    if (extra > 0) {
        noteAt(at("label"), STYLE_ISSUE.EXTRA_LABELS, `${String(extra + 1)} labels`);
    }
    if (lg.text !== undefined) {
        put(
            "label",
            writer.vocabulary === "graphviz" ? graphvizText(lg.text, at("label")) : canonText(lg.text, at("label")),
        );
    }
    // the GML draft's `fill` is the text color; yEd's is the label's background box, its `color` the text color
    const yedLabel = writer.vocabulary === "yed" || YED_LABEL_KEYS.some((k) => Object.hasOwn(lg, k));
    if (lg.color !== undefined || lg.fontColor !== undefined) {
        // gv2gml writes a label's fontcolor as fontColor (as color with -y); yEd's #RRGGBBAA alpha is the words'
        readColor(lg.color ?? lg.fontColor, "labelColor", "labelOpacity", writer, put, at);
    } else if (lg.fill !== undefined && !yedLabel) {
        readColor(lg.fill, "labelColor", null, writer, put, at);
    }
    if (lg.fill !== undefined && yedLabel) {
        noteAt(at("label"), STYLE_ISSUE.NOT_CARRIED, "label background");
    }
    // yEd and Cytoscape are Java programs: a Java logical font (Dialog, SansSerif, ...) is drawn in Java's face for it
    readLabelFont(lg, yedLabel || writer.vocabulary === "cytoscape", put, at);
    if (node && lg.anchor !== undefined) {
        const anchor = scalarText(lg.anchor, at("labelPosition"))?.trim().toLowerCase() ?? "";
        const known = GML_ANCHORS.get(anchor);
        if (known === undefined) {
            noteAt(at("labelPosition"), STYLE_ISSUE.UNKNOWN_VALUE, anchor.slice(0, MAX_STYLE_VALUE_LENGTH));
        }
        put("labelPosition", known ?? null);
    }
}

/**
 * A label's text as Graphviz draws it: gv2gml copies a DOT label as written, so its line breaks are still the escapes
 * `\n`, `\l` and `\r` (centered, left and right lines, drawn here as plain line breaks).
 * @param raw - the text
 * @param at - the site
 * @returns the text
 */
function graphvizText(raw: unknown, at: CanonSite): string | null {
    const text = canonText(raw, at);
    return text === null ? null : text.replaceAll(/\\[nlr]/g, "\n").replace(/\n$/, "");
}

/**
 * Reads a label record's font: its size, name, weight and slant.
 * @param lg - the record
 * @param java - whether a Java program wrote it, whose logical font names are drawn in Java's faces
 * @param put - receives the values
 * @param at - the sites
 */
function readLabelFont(lg: Rec, java: boolean, put: Put, at: At): void {
    put("labelSize", lg.fontSize === undefined ? null : canonNumber(lg.fontSize, at("labelSize")));
    const font = lg.fontName === undefined ? null : canonText(lg.fontName, at("labelFont"));
    put("labelFont", java && typeof font === "string" ? javaFamily(font) : font);
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
        readLabelGraphics(lg, writer, target === "node", putLabel, at);
    }
    // the GML draft draws the label key; Cytoscape reads it as the node's name, which its default style shows
    const drawn =
        writer.vocabulary === "cytoscape" ? target === "node" : writer.labelKey && (isRec(g) || lg !== undefined);
    if (!text && drawn && label !== null && label !== undefined) {
        put(
            "label",
            writer.vocabulary === "graphviz" ? graphvizText(label, at("label")) : canonText(label, at("label")),
        );
        // the GML draft names no place for a node's label; a plain GML file's is centered on its node, as OGDF and
        // Cytoscape draw it (yEd's GML keeps its own label models, in LabelGraphics)
        if (target === "node" && writer.tool === null && writer.vocabulary === "graphlet") {
            put("labelPosition", "center");
        }
    }
}

/** The font size GraphIO::drawSVG draws every label in (SVGSettings), by which it sets a cluster's label off its box. */
const OGDF_SVG_FONT_SIZE = 10;

/**
 * Places each OGDF cluster's label where GraphIO::drawSVG draws it (SvgPrinter::drawCluster): one font size below the
 * cluster's box where more of the drawing lies below it than above, else above it; starting at the box's left side
 * where more of the drawing lies left of it than right, else ending at its right side. The importer reads a cluster as
 * a group node with the id `cluster<id>`; its box is its center and its `w` and `h`.
 * @param snapshot - the graph
 * @param values - the node values read so far, given the label's place
 */
function placeOgdfClusterLabels(snapshot: GraphSnapshot, values: ValueColumns): void {
    const n = snapshot.nodeCount;
    const boxOf = (i: number): [number, number, number, number] => {
        const [x, y] = centerOf(snapshot, i);
        const [w, h] = sizeOf(snapshot, i);
        return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    };
    // ponytail: drawSVG's bounding box also holds the edges' bends; nodes and clusters decide every sheet so far
    const all = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
        const b = boxOf(i);
        if (b.every(Number.isFinite)) {
            all[0] = Math.min(all[0], b[0]);
            all[1] = Math.min(all[1], b[1]);
            all[2] = Math.max(all[2], b[2]);
            all[3] = Math.max(all[3], b[3]);
        }
    }
    const put = (property: string, i: number, value: StyleValue): void => {
        values[property] ??= new Array<StyleValue | null>(n).fill(null);
        values[property][i] = value;
    };
    for (let i = 0; i < n; i++) {
        const id = snapshot.ids.idOf(i);
        const [x0, y0, x1, y1] = boxOf(i);
        if (typeof id !== "string" || !id.startsWith("cluster") || ![x0, y0, x1, y1].every(Number.isFinite)) {
            continue;
        }
        const below = all[3] - y1 > y0 - all[1];
        const start = x0 - all[0] > all[2] - x1;
        put("labelPosition", i, "center");
        put("labelOffsetX", i, ((start ? -1 : 1) * (x1 - x0)) / 2);
        put("labelShiftX", i, start ? 0.5 : -0.5);
        put("labelOffsetY", i, (below ? 1 : -1) * ((y1 - y0) / 2 + OGDF_SVG_FONT_SIZE));
    }
}

/**
 * An element's `label` key. Cytoscape's GML reader names a node by its label and, where the label is empty or
 * missing, by its id, and its default style draws that name.
 * @param snapshot - the graph
 * @param writer - the writer
 * @param target - nodes or edges
 * @param i - the row
 * @returns the label
 */
function labelOf(snapshot: GraphSnapshot, writer: GmlWriter, target: StyleTarget, i: number): unknown {
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const label = cellOf(table, "label", i);
    if (writer.vocabulary === "cytoscape" && target === "node" && (label === undefined || label === "")) {
        return String(snapshot.ids.idOf(i));
    }
    return label;
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
 * A node's center: the `graphics` `x` and `y` the importer moved into the position column.
 * @param snapshot - the graph
 * @param i - the node's index
 * @returns the center; NaN where the node has none
 */
function centerOf(snapshot: GraphSnapshot, i: number): BendPoint {
    const column = snapshot.nodes.byRole("position");
    const v = column?.isSet(i) === true ? (column.value(i) as ArrayLike<number>) : null;
    return v === null ? [Number.NaN, Number.NaN] : [v[0], v[1]];
}

/**
 * A node's width and height: its `graphics` `w` and `h`.
 * @param snapshot - the graph
 * @param i - the node's index
 * @returns the size; NaN where the node has none
 */
function sizeOf(snapshot: GraphSnapshot, i: number): BendPoint {
    const g = cellOf(snapshot.nodes, "graphics", i);
    return isRec(g) ? [Number(g.w ?? Number.NaN), Number(g.h ?? Number.NaN)] : [Number.NaN, Number.NaN];
}

/**
 * An edge's route from its `graphics` `Line`, whose first and last points are where it attaches to its source and
 * target (its ports: the centers unless yEd moved them) and whose points between are its bends: the bends relative to
 * the two node centers (a self-loop's to its node's size), and each port off its node's center relative to the node.
 * OGDF's `Line` holds the bends alone (GraphIO::writeGML writes no end point).
 * @param snapshot - the graph
 * @param g - the edge's `graphics` value
 * @param e - the edge's row
 * @param bendsOnly - whether the points are the bends alone (OGDF)
 * @param put - receives the values
 */
function readLineRoute(
    snapshot: GraphSnapshot,
    g: unknown,
    e: number,
    bendsOnly: boolean,
    put: (property: string, value: string) => void,
): void {
    const raw = isRec(g) && isRec(g.Line) ? g.Line.point : undefined;
    const list = isRec(raw) ? [raw] : raw;
    if (!Array.isArray(list) || list.length < (bendsOnly ? 1 : 2)) {
        return;
    }
    const all = list.map((p): BendPoint => (isRec(p) ? [Number(p.x), Number(p.y)] : [Number.NaN, 0]));
    const [s, t] = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
    const points = bendsOnly ? all : all.slice(1, -1);
    const bends =
        s === t
            ? canonNodeOffsets(centerOf(snapshot, s), sizeOf(snapshot, s), points, true)
            : canonBends(centerOf(snapshot, s), centerOf(snapshot, t), points, true);
    if (bends !== null) {
        put("bends", bends);
    }
    if (bendsOnly) {
        return;
    }
    for (const [property, k, end] of [
        ["sourcePort", s, all[0]],
        ["targetPort", t, all.at(-1) ?? all[0]],
    ] as const) {
        const center = centerOf(snapshot, k);
        const port =
            end[0] === center[0] && end[1] === center[1]
                ? null
                : canonNodeOffsets(center, sizeOf(snapshot, k), [end], true);
        if (port !== null) {
            put(property, port);
        }
    }
}

/**
 * A gv2gml edge's route: its `Line` is the edge's Graphviz `pos`, the B-spline's `3n + 1` control points from the tail
 * to the head (y up), with the arrow tips Graphviz keeps apart (`s,` and `e,`) written as plain first and last points;
 * the points beyond `3n + 1` are those tips (the source's first when there are two or it has the arrow). A route on
 * the line between the centers is the straight edge it looks like and gives no bends.
 * @param snapshot - the graph
 * @param g - the edge's `graphics` value
 * @param e - the edge's row
 * @param put - receives the values
 */
function readGv2gmlRoute(
    snapshot: GraphSnapshot,
    g: unknown,
    e: number,
    put: (property: string, value: string) => void,
): void {
    const raw = isRec(g) && isRec(g.Line) ? g.Line.point : undefined;
    const list = isRec(raw) ? [raw] : raw;
    if (!Array.isArray(list) || !isRec(g)) {
        return;
    }
    let points = list.map((p): BendPoint => (isRec(p) ? [Number(p.x), Number(p.y)] : [Number.NaN, 0]));
    const tips = (points.length - 1) % 3;
    const sourceTip = tips === 2 || (tips === 1 && gv2gmlArrowEnds(g, snapshot.directed)?.[0] === true);
    points = points.slice(sourceTip ? 1 : 0, points.length - (tips === 2 || (tips === 1 && !sourceTip) ? 1 : 0));
    const bends = graphvizRouteBends(
        centerOf(snapshot, snapshot.edgeSource(e)),
        centerOf(snapshot, snapshot.edgeTarget(e)),
        [points],
    );
    if (bends !== null) {
        put("bends", bends);
    }
}

/**
 * Where graphty-element hangs an edge's label on a route drawn through these points (its centers and bends): the
 * middle of its middle segment, or the joint between its two middle ones; `labelOffsetX` / `labelOffsetY` move it
 * from there.
 * @param points - the route, from the source's center to the target's
 * @returns the point
 */
function routeMiddle(points: readonly BendPoint[]): BendPoint {
    const m = points.length - 1;
    if (m % 2 === 0) {
        return points[m / 2];
    }
    const [a, b] = [points[(m - 1) / 2], points[(m + 1) / 2]];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/**
 * Puts an edge label's offset from where graphty-element hangs it, when the program draws it elsewhere.
 * @param at - the label's center, in the file's coordinates
 * @param middle - where graphty-element hangs it, in the same coordinates
 * @param yUp - whether the file's y grows upward
 * @param put - receives the values
 */
function putEdgeLabelOffset(
    at: BendPoint,
    middle: BendPoint,
    yUp: boolean,
    put: (property: string, value: StyleValue) => void,
): void {
    const dx = num6(at[0] - middle[0]);
    const dy = num6((yUp ? -1 : 1) * (at[1] - middle[1]));
    if (Number.isFinite(dx) && Number.isFinite(dy) && (dx !== 0 || dy !== 0)) {
        // moved from the line's middle itself, not from graphty's default place beside the line
        put("labelPosition", "center");
        put("labelOffsetX", dx);
        put("labelOffsetY", dy);
    }
}

/**
 * A gv2gml edge label's place: gv2gml copies Graphviz's `lp` (the label's center, in points, y up) as a plain edge
 * key, and Graphviz draws the label there, beside its line rather than on it.
 * @param snapshot - the graph
 * @param e - the edge's row
 * @param bent - whether its route has bends
 * @param put - receives the values
 */
function readGv2gmlLabelPlace(
    snapshot: GraphSnapshot,
    e: number,
    bent: boolean,
    put: (property: string, value: StyleValue) => void,
): void {
    const lp = cellOf(snapshot.edges, "lp", e);
    const m = typeof lp === "string" ? /^\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$/.exec(lp) : null;
    // ponytail: a curved route's middle is where graphty-element samples its curve; only a straight one is placed
    if (m === null || bent) {
        return;
    }
    const [s, t] = [centerOf(snapshot, snapshot.edgeSource(e)), centerOf(snapshot, snapshot.edgeTarget(e))];
    putEdgeLabelOffset([Number(m[1]), Number(m[2])], routeMiddle([s, t]), true, put);
}

/**
 * An OGDF edge label's place: GraphIO::drawSVG (SvgPrinter::drawEdge) draws it at the middle of the route's first
 * segment, from the source's center to its first bend, not at the route's middle.
 * @param snapshot - the graph
 * @param g - the edge's `graphics` value
 * @param e - the edge's row
 * @param put - receives the values
 */
function readOgdfLabelPlace(
    snapshot: GraphSnapshot,
    g: unknown,
    e: number,
    put: (property: string, value: StyleValue) => void,
): void {
    const raw = isRec(g) && isRec(g.Line) ? g.Line.point : undefined;
    const list = isRec(raw) ? [raw] : raw;
    const [s, t] = [centerOf(snapshot, snapshot.edgeSource(e)), centerOf(snapshot, snapshot.edgeTarget(e))];
    if (!Array.isArray(list) || snapshot.edgeSource(e) === snapshot.edgeTarget(e)) {
        return;
    }
    const same = (a: BendPoint, b: BendPoint): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
    // the Line OGDF writes may start and end at the centers
    const bends = list
        .map((p): BendPoint => (isRec(p) ? [Number(p.x), Number(p.y)] : [Number.NaN, 0]))
        .filter((p) => !same(p, s) && !same(p, t));
    if (bends.length === 0) {
        return;
    }
    const route = [s, ...bends, t];
    putEdgeLabelOffset(
        [(route[0][0] + route[1][0]) / 2, (route[0][1] + route[1][1]) / 2],
        routeMiddle(route),
        false,
        put,
    );
}

/**
 * Hides the edges Gephi's own GML importer leaves out: an edge whose `directed` key disagrees with the graph's
 * `directed` header (Gephi 0.11 loads 4 of `specimen-arrows-p6`'s 5 edges). A file with no header is read as mixed and
 * every edge is loaded. The edge and its data stay; Gephi draws nothing there, so graphty draws nothing.
 * @param snapshot - the graph
 * @param values - the edge values read so far, given `visible`
 */
function hideGephiDroppedEdges(snapshot: GraphSnapshot, values: ValueColumns): void {
    const header = (snapshot.meta.extra.gml as Record<string, unknown> | undefined)?.directed;
    const directed = snapshot.edges.byRole("directed");
    // with no `directed` header Gephi reads a mixed graph and loads every edge (Gephi Toolkit 0.11.3, checked)
    if (directed === null || header === undefined) {
        return;
    }
    const graphDirected = Number(header) === 1;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const v = plainCell(directed.value(e));
        if (typeof v === "boolean" && v !== graphDirected) {
            values.visible ??= new Array<StyleValue | null>(snapshot.edgeCount).fill(null);
            values.visible[e] = false;
        }
    }
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
        if (!table.has("graphics") && !table.has("LabelGraphics") && writer.vocabulary !== "cytoscape") {
            return out.values;
        }
        for (let i = 0; i < n; i++) {
            context.budget.spend(target, 1);
            const at: At = (property) => ({ notes, target, property, element: i, budget: context.budget });
            readElement(
                target,
                cellOf(table, "graphics", i),
                cellOf(table, "LabelGraphics", i),
                labelOf(snapshot, writer, target, i),
                writer,
                (property, value) => {
                    if (value !== null) {
                        found = true;
                        out.put(i, property, value);
                    }
                },
                at,
            );
            if (target === "edge" && writer.vocabulary === "graphviz") {
                let bent = false;
                readGv2gmlRoute(snapshot, cellOf(table, "graphics", i), i, (property, value) => {
                    found = true;
                    bent ||= property === "bends";
                    out.put(i, property, value);
                });
                readGv2gmlLabelPlace(snapshot, i, bent, (property, value) => {
                    out.put(i, property, value);
                });
            } else if (target === "edge" && writer.vocabulary === "ogdf") {
                readOgdfLabelPlace(snapshot, cellOf(table, "graphics", i), i, (property, value) => {
                    out.put(i, property, value);
                });
            }
            if (target === "edge" && writer.vocabulary !== "graphviz") {
                readLineRoute(
                    snapshot,
                    cellOf(table, "graphics", i),
                    i,
                    writer.vocabulary === "ogdf",
                    (property, value) => {
                        found = true;
                        out.put(i, property, value);
                    },
                );
            }
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
    const node = tagValues(snapshot, "node", parsed.block.columns.node);
    const edge = tagValues(snapshot, "edge", parsed.block.columns.edge);
    if (node === null || edge === null) {
        // a style column is missing: graph-io ignores the block with a note
        return text;
    }
    const raw = JSON.parse(text) as Record<string, unknown>;
    return JSON.stringify({ ...raw, values: { node, edge } });
}

/**
 * The per-element values of a target's style columns, read from their `graphty_style_*` keys.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param keys - the style columns the block names
 * @returns the values by key, or null when a key is missing
 */
function tagValues(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    keys: readonly string[],
): Record<string, StyleColumn> | null {
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const values: Record<string, StyleColumn> = {};
    for (const key of keys) {
        const name = tagKey(target, key);
        if (!table.has(name)) {
            return null;
        }
        values[key] = Array.from({ length: n }, (_, i) => {
            const v = plainCell(table.value(name, i));
            return typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : null;
        });
    }
    return values;
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
    const writer = { ...writerOf(snapshot), directed: snapshot.directed };
    const values = readValues(snapshot, writer, notes, context);
    if (writer.vocabulary === "ogdf") {
        placeOgdfClusterLabels(snapshot, values.node);
    }
    const blockText = graphText(snapshot, GML_STYLE_BLOCK_KEY);
    const block = blockText === null ? null : blockWithValues(snapshot, blockText);
    if (block !== null) {
        exactFromBlock(snapshot, block, values);
    }
    if (writer.tool === null && !values.found && block === null) {
        return null;
    }
    if (writer.tool === "gephi" && block === null) {
        // Gephi draws every edge in its end nodes' mixed color (EdgeColor MIXED), whatever its own
        delete values.edge.color;
        // and as thick as its weight, the `value` Gephi writes, also where the reader kept `value` as plain data
        if (snapshot.edges.byRole("weight") === null && snapshot.edges.has("value")) {
            values.edge.width = Array.from({ length: snapshot.edgeCount }, (_, e) => {
                const w = cellOf(snapshot.edges, "value", e);
                if (typeof w !== "number" || !Number.isFinite(w)) {
                    return null;
                }
                // a weight of 0 or below is drawn 1 wide, so the edge stays visible
                return w > 0 ? w : 1;
            });
        }
        hideGephiDroppedEdges(snapshot, values.edge);
    }
    const none = { rules: [], columns: new Map<string, StyleColumn>() };
    const gephi =
        writer.tool === "gephi"
            ? gephiRules(
                  snapshot,
                  { fill: values.node.fill, width: values.node.width },
                  { color: values.edge.color, width: values.edge.width },
                  context.budget,
              )
            : { node: none, edge: none };
    return {
        canonical: true,
        dialect: writer.dialect,
        tool: writer.tool,
        units: writer.units,
        node: { values: values.node, ...gephi.node },
        edge: { values: values.edge, ...gephi.edge },
        notes: notes.list(),
        opacityInColor: true,
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
    tool: "yed",
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
        "bends",
        "sourcePort",
        "targetPort",
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
        g.style = yedSpelled(
            YED_LINES,
            lineStyle,
            lineStyle === "long-dash" ? "dashed" : "line",
            "lineStyle",
            approximate,
        );
    }
    for (const property of ["sourceArrow", "targetArrow"]) {
        const arrow = get(property);
        if (typeof arrow === "string") {
            g[property] = yedSpelled(YED_ARROWS, arrow, "standard", property, approximate);
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
        // a Java face is written back as the logical font yEd draws in it
        lg.fontName = yedFontName(font);
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
    const notes = new StyleNotes();
    takeFromBlock(snapshot, text, "gml", (target) => ({
        values: read[target],
        properties: GML_STYLE_CAPABILITIES[target],
        writes: GML_STYLE_CAPABILITIES[target],
        readBack: (_i, want) => {
            const back = writtenAndReadBack(target, want, notes);
            return (property) => back.get(property) ?? null;
        },
    }));
}

/**
 * An element's values written as the writer writes them and read back as the reader reads them.
 * @param target - nodes or edges
 * @param want - its values
 * @param notes - a scratch for the notes the round trip makes
 * @returns the values read back, by property
 */
function writtenAndReadBack(target: StyleTarget, want: Get, notes: StyleNotes): Map<string, StyleValue> {
    const ignore: Approximate = () => undefined;
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
    return back;
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
    const approximated = new StyleApproximations();
    const out = snapshot.withColumns();
    const renames: LossNote[] = [];
    for (const target of ["node", "edge"] as const) {
        const table = target === "node" ? out.nodes : out.edges;
        writeGraphicsColumns(snapshot, input, target, table, approximated);
        // the per-element style values of an earlier write go; a data column the rules read, or any other whose key
        // would read back as a style value, is renamed out of the keys the style values take
        const read = dataRead(input.rules.styles.rules, target);
        for (const name of table.names().filter((c) => mangleGmlKey(c).startsWith(TAG_PREFIX))) {
            const col = table.get(name);
            table.remove(name);
            if (col !== null && !(name.startsWith(TAG_PREFIX) && !read.has(name))) {
                renames.push(renameDataColumn(table, target, name, col));
            }
        }
    }
    let { block } = input;
    const keys = [...input.rules.columns.node.keys()].map((k) => tagKey("node", k));
    const edgeKeys = [...input.rules.columns.edge.keys()].map((k) => tagKey("edge", k));
    if (new Set(keys).size !== keys.length || new Set(edgeKeys).size !== edgeKeys.length) {
        block = writeStyleBlock(input.rules, { inlineColumns: true, snapshot });
    } else {
        setTagColumns(out, input);
    }
    out.graph.set(GML_STYLE_BLOCK_KEY, [block], { dtype: "string" });
    const notes: LossNote[] = [
        ...renames,
        ...(block === input.block ? [] : styleBlockLosses(block, input.rules.styles.rules.length, "size")),
        ...approximated.notes("yEd's GML"),
    ];
    return { snapshot: out, notes };
}

/**
 * Writes every element's `graphics` and `LabelGraphics` records of a target with yEd's keys for what graphty draws,
 * keeping the keys that are not style keys.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles
 * @param target - nodes or edges
 * @param table - the target's table being written, changed in place
 * @param approximated - where approximations are counted
 */
function writeGraphicsColumns(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput,
    target: StyleTarget,
    table: GraphSnapshot["nodes"],
    approximated: StyleApproximations,
): void {
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const approximate: Approximate = (property, value) => {
        approximated.add(target, property, value);
    };
    const get = elementValues((t, p) => input.picture(t, p as never), target, GML_STYLE_CAPABILITIES[target]);
    const getNode = elementValues((t, p) => input.picture(t, p as never), "node", GML_STYLE_CAPABILITIES.node);
    const size = (k: number): BendPoint => {
        const [w, h] = [getNode(k)("width"), getNode(k)("height")];
        return typeof w === "number" && typeof h === "number" ? [w, h] : sizeOf(snapshot, k);
    };
    const graphics: unknown[] = [];
    const labels: unknown[] = [];
    for (let i = 0; i < n; i++) {
        const g = target === "node" ? nodeGraphics(get(i), approximate) : edgeGraphics(get(i), approximate);
        if (target === "edge") {
            const line = routeLine(snapshot, get(i), i, size);
            if (line !== null) {
                g.Line = line;
            }
        }
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
}

/**
 * An edge's `Line` from its `bends`, `sourcePort` and `targetPort` values: from its source port (the node's center
 * without one) through the bends placed between the node centers (a self-loop's around its node) to its target port,
 * so the route reads back as written.
 * @param snapshot - the graph handed to the exporter
 * @param get - the edge's values
 * @param e - the edge's row
 * @param size - each node's written width and height
 * @returns the `Line` record, or null without a value or without both centers
 */
function routeLine(snapshot: GraphSnapshot, get: Get, e: number, size: (k: number) => BendPoint): Rec | null {
    const [s, t] = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
    const source = centerOf(snapshot, s);
    const target = centerOf(snapshot, t);
    if (![...source, ...target].every(Number.isFinite)) {
        return null;
    }
    const bends = get("bends");
    let points: BendPoint[] | null = null;
    if (typeof bends === "string") {
        points =
            s === t ? nodeOffsetsToPoints(source, size(s), bends, true) : bendsToPoints(source, target, bends, true);
    }
    const port = (property: string, k: number, center: BendPoint): BendPoint | null => {
        const value = get(property);
        return typeof value === "string" ? (nodeOffsetsToPoints(center, size(k), value, true)?.[0] ?? null) : null;
    };
    const from = port("sourcePort", s, source);
    const to = port("targetPort", t, target);
    if (points === null && from === null && to === null) {
        return null;
    }
    return { point: [from ?? source, ...(points ?? []), to ?? target].map(([x, y]) => ({ x, y })) };
}

/**
 * Writes a data column under a name out of the keys the style values take.
 * @param table - the table, changed in place
 * @param target - nodes or edges
 * @param name - the column's name
 * @param col - the column
 * @returns the note saying so
 */
function renameDataColumn(
    table: GraphSnapshot["nodes"],
    target: StyleTarget,
    name: string,
    col: NonNullable<ReturnType<GraphSnapshot["nodes"]["get"]>>,
): LossNote {
    let renamed = `data_${name}`;
    let k = 2;
    while (table.has(renamed)) {
        renamed = `data_${name}_${String(k)}`;
        k++;
    }
    table.set(renamed, col);
    return Object.freeze({
        code: KEY_MANGLED_CODE,
        message: `${target} column "${name}" is written as "${renamed}": keys starting with ${TAG_PREFIX} hold graphty's style values`,
        column: name,
        count: null,
    });
}

/**
 * Sets the per-element values the rules read as element keys.
 * @param out - the graph, changed in place
 * @param input - the styles
 */
function setTagColumns(out: GraphSnapshot, input: ExporterStyleInput): void {
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
