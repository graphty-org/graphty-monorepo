/**
 * Neutral style rules back to a Cytoscape visual style, for the CX, CX2 and session writers: rules over every element
 * become defaults and mappings, everything Cytoscape cannot say as a rule (a rule over a group of elements, a second
 * mapping of one property, a value written per element) becomes per-element bypasses, so what Cytoscape draws is
 * what the rules give. Every value the style cannot hold is a coded note.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { escapeXmlAttribute } from "../../common/escape.js";
import { num6 } from "../canon/number.js";
import { STYLE_ISSUE } from "../codes.js";
import { StyleNotes } from "../notes.js";
import { canonicalFor, degreeValues, refSource, resolveRules } from "../plan/resolve.js";
import type {
    ColumnRef,
    ContinuousPoint,
    ExtractedStyles,
    Mapping,
    Scalar,
    StyleRule,
    StyleTarget,
    StyleValue,
} from "../types.js";
import { STYLE_PROPERTIES } from "../vocabulary.js";
import { JAVA_MONO, JAVA_SANS, JAVA_SERIF, javaFamily, vpStep } from "./lexicon.js";
import {
    type CytoscapeContinuousPoint,
    type CytoscapeMapping,
    type CytoscapeStyle,
    emptyCytoscapeStyle,
} from "./mappings.js";

/**
 * The spelling a Cytoscape style is written in: `"desktop"` for CX version 1 and session files (text values,
 * `NODE_FILL_COLOR`, 0..255 transparency), `"cx2"` for CX2 (typed JSON values, `NODE_BACKGROUND_COLOR`, 0..1
 * opacity).
 * @category Styles
 */
export type CytoscapeDialect = "desktop" | "cx2";

/**
 * Options of `emitCytoscapeStyle()`.
 * @category Styles
 */
export interface CytoscapeEmitOptions {
    /** The spelling to write. */
    readonly dialect: CytoscapeDialect;
    /** Where every loss is noted (`W_STYLE_NOT_WRITTEN`, `W_STYLE_APPROXIMATED`, `W_STYLE_LAYER_FLATTENED`). */
    readonly notes?: StyleNotes;
    /**
     * The name of the attribute column a mapping over a style column or a computed degree reads, which the writer
     * adds to the file; defaults to `graphty.style.<target>.<key>` (`<key>` is the style column's key or the degree's
     * name).
     */
    readonly columnName?: (target: StyleTarget, ref: ColumnRef) => string;
}

/**
 * A Cytoscape style made from neutral rules.
 * @category Styles
 */
export interface CytoscapeEmitted {
    /** The style: defaults, mappings and dependencies, values in the dialect's spelling. */
    readonly style: CytoscapeStyle;
    /** Each element's bypasses (visual property to value in the dialect's spelling), or null where it has none. */
    readonly bypasses: {
        /** Per node, by node index. */
        readonly node: (Map<string, unknown> | null)[];
        /** Per edge, by edge index. */
        readonly edge: (Map<string, unknown> | null)[];
    };
    /** Attribute columns the mappings read that the graph does not hold, by name, with each element's value. */
    readonly columns: {
        /** Node columns. */
        readonly node: Map<string, readonly (StyleValue | null)[]>;
        /** Edge columns. */
        readonly edge: Map<string, readonly (StyleValue | null)[]>;
    };
}

/** Writes one canonical value in a dialect's spelling; calls `approx` when the value is changed to fit. */
type Write = (v: StyleValue, approx: () => void) => unknown;

/** A visual property and how a value is written into it. */
interface Writer {
    readonly vp: string;
    readonly write: Write;
}

/**
 * `#RRGGBB`.
 * @param v - a canonical color
 * @returns the color as Cytoscape writes it
 */
const colorOut: Write = (v) => String(v).toUpperCase();

/**
 * A writer of an enumeration.
 * @param table - canonical value to the dialect's spelling
 * @param near - canonical value to the nearest spelling, for values the dialect does not have
 * @param upper - whether an `other:` value is written uppercase with underscores
 * @param cytoscape - the `other:` values (lowercase, hyphenated) that are Cytoscape's own names, written as they
 *     are; any other `other:` value (another program's, such as Graphviz's `invtrapezium`) is no Cytoscape value and
 *     is written as its nearest
 * @returns the writer
 */
function enumOut(
    table: Readonly<Record<string, string>>,
    near: Readonly<Record<string, string>>,
    upper: boolean,
    cytoscape: ReadonlySet<string> = new Set(),
): Write {
    return (v, approx) => {
        const s = String(v);
        if (Object.hasOwn(table, s)) {
            return table[s];
        }
        if (s.startsWith("other:") && cytoscape.has(s.slice("other:".length).toLowerCase().replaceAll("_", "-"))) {
            const raw = s.slice("other:".length);
            const out = upper ? raw.toUpperCase().replaceAll("-", "_") : raw;
            if (out !== raw) {
                // read back in Cytoscape's spelling, which is another value
                approx();
            }
            return out;
        }
        approx();
        return Object.hasOwn(near, s) ? near[s] : Object.values(table)[0];
    };
}

/** Where a node's border sits: Cytoscape's own place for it is inside the node's size, which it always draws. */
const BORDER_POSITION = "borderPosition";

/**
 * What Cytoscape always draws and no file can change, per target: where a border sits, how far its zigzag and
 * sine-wave strokes swing and how often they repeat (`ding-presentation-impl` `ZigzagStroke`, `SineWaveStroke`), and
 * a label's box round its words alone, its lines one font tall. Nothing is written for them, and any other value is
 * drawn as Cytoscape's.
 */
const FIXED: Readonly<Record<"node" | "edge", ReadonlyMap<string, string | number>>> = {
    node: new Map<string, string | number>([
        [BORDER_POSITION, "inside"],
        ["borderWaveAmplitude", 10],
        ["borderWavePeriod", 20],
        ["labelPadding", 0],
        ["labelLineHeight", 1],
    ]),
    edge: new Map<string, string | number>([
        ["waveAmplitude", 10],
        ["wavePeriod", 20],
        ["labelPadding", 0],
        ["labelLineHeight", 1],
    ]),
};

const DESKTOP_SHAPES = {
    ellipse: "ELLIPSE",
    rectangle: "RECTANGLE",
    "round-rectangle": "ROUND_RECTANGLE",
    triangle: "TRIANGLE",
    diamond: "DIAMOND",
    hexagon: "HEXAGON",
    octagon: "OCTAGON",
    parallelogram: "PARALLELOGRAM",
    vee: "V",
};
const NEAR_SHAPES = {
    pentagon: "hexagon",
    star: "octagon",
    trapezoid: "parallelogram",
    none: "ellipse",
    // Graphviz shapes no canonical shape names
    "other:invtrapezium": "parallelogram",
    "other:house": "hexagon",
    "other:invhouse": "hexagon",
};
const lower = (t: Readonly<Record<string, string>>): Record<string, string> =>
    Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v === "V" ? "vee" : v.toLowerCase()]));
const nearIn = (t: Readonly<Record<string, string>>, near: Readonly<Record<string, string>>): Record<string, string> =>
    Object.fromEntries(Object.entries(near).map(([k, v]) => [k, t[v]]));

const DESKTOP_BORDERS = {
    solid: "SOLID",
    dashed: "EQUAL_DASH",
    dotted: "DOT",
    "dash-dot": "DASH_DOT",
    double: "PARALLEL_LINES",
};
// LONG_DASH is read as dashed (CX2 has no long dash), so long-dash is written as its nearest, EQUAL_DASH
const DESKTOP_LINES = { ...DESKTOP_BORDERS, zigzag: "ZIGZAG", sinewave: "SINEWAVE" };
const CX2_LINES = { solid: "solid", dashed: "dashed", dotted: "dotted", double: "double" };
const NEAR_LINES = { "dash-dot": "dashed", "long-dash": "dashed", zigzag: "solid", sinewave: "solid" };

const DESKTOP_ARROWS = {
    none: "NONE",
    triangle: "DELTA",
    tee: "T",
    diamond: "DIAMOND",
    circle: "CIRCLE",
    square: "SQUARE",
    "triangle-open": "OPEN_DELTA",
    "diamond-open": "OPEN_DIAMOND",
    "circle-open": "OPEN_CIRCLE",
    half: "HALF_TOP",
    "other:cross-delta": "CROSS_DELTA",
    "other:cross-open-delta": "CROSS_OPEN_DELTA",
};
const CX2_ARROWS = {
    none: "none",
    triangle: "triangle",
    vee: "vee",
    tee: "tee",
    diamond: "diamond",
    circle: "circle",
    square: "square",
    "triangle-open": "open-triangle",
    "diamond-open": "open-diamond",
    "circle-open": "open-circle",
    half: "half-top",
    // as Cytoscape 3.10.5 writes CROSS_DELTA and CROSS_OPEN_DELTA in CX2
    "other:cross-delta": "triangle-cross",
    "other:cross-open-delta": "cross_open_delta",
};
const NEAR_ARROWS = { crow: "vee", inverted: "triangle" };
// desktop has no open vee: its ARROW, the nearest, is drawn as a filled delta and read back as one
const DESKTOP_NEAR_ARROWS = { crow: "ARROW", inverted: "DELTA", vee: "ARROW" };

/** The Cytoscape arrow names no canonical arrow names, which Cytoscape's readers keep as `other:` values. */
const CY_OTHER_ARROWS: ReadonlySet<string> = new Set(["open-square", "open-half-circle", "half-circle", "half-bottom"]);
/** The Cytoscape line types no canonical line style names. */
const CY_OTHER_LINES: ReadonlySet<string> = new Set([
    "backward-slash",
    "forward-slash",
    "vertical-slash",
    "separate-arrow",
    "contiguous-arrow",
]);
/** The Cytoscape line types a border can take that no canonical border style names. */
const CY_OTHER_BORDERS: ReadonlySet<string> = new Set([...CY_OTHER_LINES, "zigzag", "sinewave"]);

/**
 * A label position as the point of the node and the point of the label's box pinned to it, in desktop's anchor
 * letters: beside the node, the label's opposite point; inside it, the same point.
 */
const POSITION_ANCHORS: Readonly<Record<string, readonly [node: string, label: string]>> = {
    center: ["C", "C"],
    top: ["N", "S"],
    bottom: ["S", "N"],
    left: ["W", "E"],
    right: ["E", "W"],
    "top-left": ["NW", "SE"],
    "top-right": ["NE", "SW"],
    "bottom-left": ["SW", "NE"],
    "bottom-right": ["SE", "NW"],
    "inside-top": ["N", "N"],
    "inside-bottom": ["S", "S"],
    "inside-left": ["W", "W"],
    "inside-right": ["E", "E"],
    "inside-top-left": ["NW", "NW"],
    "inside-top-right": ["NE", "NE"],
    "inside-bottom-left": ["SW", "SW"],
    "inside-bottom-right": ["SE", "SE"],
};
const DESKTOP_POSITIONS: Readonly<Record<string, string>> = Object.fromEntries(
    Object.entries(POSITION_ANCHORS).map(([k, [node, label]]) => [k, `${node},${label},c,0.00,0.00`]),
);
/** A desktop anchor letter as CX2's horizontal and vertical words. */
const CX2_WORDS: Readonly<Record<string, readonly [string, string]>> = {
    C: ["center", "center"],
    N: ["center", "top"],
    S: ["center", "bottom"],
    W: ["left", "center"],
    E: ["right", "center"],
    NW: ["left", "top"],
    NE: ["right", "top"],
    SW: ["left", "bottom"],
    SE: ["right", "bottom"],
};

const desktopNumber: Write = String;
const cx2Number: Write = (v) => v;

/**
 * A writer for a visual property Cytoscape holds as a whole number (a font size): the value is written as it is, and
 * a fraction is noted, since Cytoscape draws it rounded.
 * @param write - the dialect's number writer
 * @returns the writer
 */
function whole(write: Write): Write {
    return (v, approx) => {
        if (typeof v === "number" && !Number.isInteger(v)) {
            approx();
        }
        return write(v, approx);
    };
}
const textOut: Write = String;
const desktopBool: Write = (v) => String(v === true);
const opacity255: Write = (v, approx) => {
    const b = Math.round(Number(v) * 255);
    if (num6(b / 255) !== v) {
        approx();
    }
    return String(b);
};

/** The writers of each dialect, per target and property. */
const WRITERS: Readonly<Record<CytoscapeDialect, Readonly<Record<StyleTarget, ReadonlyMap<string, Writer>>>>> = {
    desktop: {
        node: new Map<string, Writer>([
            ["fill", { vp: "NODE_FILL_COLOR", write: colorOut }],
            ["fillOpacity", { vp: "NODE_TRANSPARENCY", write: opacity255 }],
            ["borderColor", { vp: "NODE_BORDER_PAINT", write: colorOut }],
            ["borderOpacity", { vp: "NODE_BORDER_TRANSPARENCY", write: opacity255 }],
            ["borderWidth", { vp: "NODE_BORDER_WIDTH", write: desktopNumber }],
            [
                "borderStyle",
                {
                    vp: "NODE_BORDER_LINE_TYPE",
                    write: enumOut(DESKTOP_BORDERS, nearIn(DESKTOP_BORDERS, NEAR_LINES), true, CY_OTHER_BORDERS),
                },
            ],
            ["shape", { vp: "NODE_SHAPE", write: enumOut(DESKTOP_SHAPES, nearIn(DESKTOP_SHAPES, NEAR_SHAPES), true) }],
            ["width", { vp: "NODE_WIDTH", write: desktopNumber }],
            ["height", { vp: "NODE_HEIGHT", write: desktopNumber }],
            ["label", { vp: "NODE_LABEL", write: textOut }],
            ["labelColor", { vp: "NODE_LABEL_COLOR", write: colorOut }],
            ["labelSize", { vp: "NODE_LABEL_FONT_SIZE", write: whole(desktopNumber) }],
            ["labelWrapWidth", { vp: "NODE_LABEL_WIDTH", write: desktopNumber }],
            ["labelPosition", { vp: "NODE_LABEL_POSITION", write: enumOut(DESKTOP_POSITIONS, {}, false) }],
            ["labelRotation", { vp: "NODE_LABEL_ROTATION", write: desktopNumber }],
            ["tooltip", { vp: "NODE_TOOLTIP", write: textOut }],
            ["visible", { vp: "NODE_VISIBLE", write: desktopBool }],
        ]),
        edge: new Map<string, Writer>([
            ["color", { vp: "EDGE_STROKE_UNSELECTED_PAINT", write: colorOut }],
            ["opacity", { vp: "EDGE_TRANSPARENCY", write: opacity255 }],
            ["width", { vp: "EDGE_WIDTH", write: desktopNumber }],
            [
                "lineStyle",
                {
                    vp: "EDGE_LINE_TYPE",
                    write: enumOut(DESKTOP_LINES, nearIn(DESKTOP_LINES, NEAR_LINES), true, CY_OTHER_LINES),
                },
            ],
            [
                "sourceArrow",
                {
                    vp: "EDGE_SOURCE_ARROW_SHAPE",
                    write: enumOut(DESKTOP_ARROWS, DESKTOP_NEAR_ARROWS, true, CY_OTHER_ARROWS),
                },
            ],
            [
                "targetArrow",
                {
                    vp: "EDGE_TARGET_ARROW_SHAPE",
                    write: enumOut(DESKTOP_ARROWS, DESKTOP_NEAR_ARROWS, true, CY_OTHER_ARROWS),
                },
            ],
            ["sourceArrowColor", { vp: "EDGE_SOURCE_ARROW_UNSELECTED_PAINT", write: colorOut }],
            ["targetArrowColor", { vp: "EDGE_TARGET_ARROW_UNSELECTED_PAINT", write: colorOut }],
            ["curved", { vp: "EDGE_CURVED", write: desktopBool }],
            ["label", { vp: "EDGE_LABEL", write: textOut }],
            ["labelColor", { vp: "EDGE_LABEL_COLOR", write: colorOut }],
            ["labelSize", { vp: "EDGE_LABEL_FONT_SIZE", write: whole(desktopNumber) }],
            ["tooltip", { vp: "EDGE_TOOLTIP", write: textOut }],
            ["visible", { vp: "EDGE_VISIBLE", write: desktopBool }],
        ]),
    },
    cx2: {
        node: new Map<string, Writer>([
            ["fill", { vp: "NODE_BACKGROUND_COLOR", write: colorOut }],
            ["fillOpacity", { vp: "NODE_BACKGROUND_OPACITY", write: cx2Number }],
            ["borderColor", { vp: "NODE_BORDER_COLOR", write: colorOut }],
            ["borderOpacity", { vp: "NODE_BORDER_OPACITY", write: cx2Number }],
            ["borderWidth", { vp: "NODE_BORDER_WIDTH", write: cx2Number }],
            [
                "borderStyle",
                {
                    vp: "NODE_BORDER_STYLE",
                    write: enumOut(CX2_LINES, nearIn(CX2_LINES, NEAR_LINES), false, CY_OTHER_BORDERS),
                },
            ],
            [
                "shape",
                {
                    vp: "NODE_SHAPE",
                    write: enumOut(lower(DESKTOP_SHAPES), nearIn(lower(DESKTOP_SHAPES), NEAR_SHAPES), false),
                },
            ],
            ["width", { vp: "NODE_WIDTH", write: cx2Number }],
            ["height", { vp: "NODE_HEIGHT", write: cx2Number }],
            ["label", { vp: "NODE_LABEL", write: textOut }],
            ["labelColor", { vp: "NODE_LABEL_COLOR", write: colorOut }],
            ["labelSize", { vp: "NODE_LABEL_FONT_SIZE", write: whole(cx2Number) }],
            ["labelWrapWidth", { vp: "NODE_LABEL_MAX_WIDTH", write: cx2Number }],
            ["labelPosition", { vp: "NODE_LABEL_POSITION", write: cx2Position }],
            ["labelRotation", { vp: "NODE_LABEL_ROTATION", write: cx2Number }],
            ["visible", { vp: "NODE_VISIBILITY", write: (v) => (v === true ? "element" : "none") }],
        ]),
        edge: new Map<string, Writer>([
            ["color", { vp: "EDGE_LINE_COLOR", write: colorOut }],
            ["opacity", { vp: "EDGE_OPACITY", write: cx2Number }],
            ["width", { vp: "EDGE_WIDTH", write: cx2Number }],
            [
                "lineStyle",
                {
                    vp: "EDGE_LINE_STYLE",
                    write: enumOut(CX2_LINES, nearIn(CX2_LINES, NEAR_LINES), false, CY_OTHER_LINES),
                },
            ],
            [
                "sourceArrow",
                {
                    vp: "EDGE_SOURCE_ARROW_SHAPE",
                    write: enumOut(CX2_ARROWS, nearIn(CX2_ARROWS, NEAR_ARROWS), false, CY_OTHER_ARROWS),
                },
            ],
            [
                "targetArrow",
                {
                    vp: "EDGE_TARGET_ARROW_SHAPE",
                    write: enumOut(CX2_ARROWS, nearIn(CX2_ARROWS, NEAR_ARROWS), false, CY_OTHER_ARROWS),
                },
            ],
            ["sourceArrowColor", { vp: "EDGE_SOURCE_ARROW_COLOR", write: colorOut }],
            ["targetArrowColor", { vp: "EDGE_TARGET_ARROW_COLOR", write: colorOut }],
            ["curved", { vp: "EDGE_CURVED", write: (v) => v === true }],
            ["label", { vp: "EDGE_LABEL", write: textOut }],
            ["labelColor", { vp: "EDGE_LABEL_COLOR", write: colorOut }],
            ["labelSize", { vp: "EDGE_LABEL_FONT_SIZE", write: whole(cx2Number) }],
            ["visible", { vp: "EDGE_VISIBILITY", write: (v) => (v === true ? "element" : "none") }],
        ]),
    },
};

/**
 * CX2's label position object.
 * @param v - a canonical position
 * @returns the object
 */
function cx2Position(v: StyleValue): unknown {
    const [node, label] = Object.hasOwn(POSITION_ANCHORS, String(v)) ? POSITION_ANCHORS[String(v)] : ["C", "C"];
    const [h, vert] = CX2_WORDS[node];
    const [ha, va] = CX2_WORDS[label];
    return {
        HORIZONTAL_ALIGN: ha,
        VERTICAL_ALIGN: va,
        HORIZONTAL_ANCHOR: h,
        VERTICAL_ANCHOR: vert,
        MARGIN_X: 0,
        MARGIN_Y: 0,
        JUSTIFICATION: "center",
    };
}

/** The font properties, written together into one font face. */
const FONT_PROPS = ["labelFont", "labelWeight", "labelItalic"] as const;
const FONT_VP: Readonly<Record<StyleTarget, string>> = { node: "NODE_LABEL_FONT_FACE", edge: "EDGE_LABEL_FONT_FACE" };
// A CSS generic family is written as it is: Java draws a name it does not know in Dialog, and reads it back the same.
const CSS_TO_JAVA: Readonly<Record<string, string>> = {
    // the families the reader gives Java's logical fonts
    [JAVA_SANS]: "SansSerif",
    [JAVA_SERIF]: "Serif",
    [JAVA_MONO]: "Monospaced",
};

/**
 * A font face in a dialect's spelling.
 * @param dialect - the dialect
 * @param family - the family, or null
 * @param weight - the weight, or null
 * @param italic - whether italic, or null
 * @param approx - called when the family had to be shortened
 * @returns the face
 */
function fontOut(
    dialect: CytoscapeDialect,
    family: StyleValue | null,
    weight: StyleValue | null,
    italic: StyleValue | null,
    approx: () => void,
): unknown {
    const bold = weight === "bold";
    const it = italic === true;
    const fam = family === null ? "sans-serif" : String(family);
    if (dialect === "cx2") {
        if (fontReadsAs(fam) !== fam) {
            approx();
        }
        return { FONT_FAMILY: fam, FONT_STYLE: it ? "italic" : "normal", FONT_WEIGHT: bold ? "bold" : "normal" };
    }
    const first = fam.includes(",") ? fam.split(",")[0].trim() : fam;
    const asWritten = Object.hasOwn(CSS_TO_JAVA, first) ? CSS_TO_JAVA[first] : first;
    const java = Object.hasOwn(CSS_TO_JAVA, fam) ? CSS_TO_JAVA[fam] : asWritten;
    if (fontReadsAs(java) !== fam) {
        approx();
    }
    // desktop reads the face from the name alone: bold and italic go on it as a Java face suffix, as desktop itself
    // writes them (`SansSerif.bold,bold,12`); the style word after it is not read (`FontVisualProperty`)
    const style = javaFontStyle(bold, it);
    const face = style === "plain" ? java : `${java}.${style}`;
    return `${face},${bold ? "bold" : "plain"},12`;
}

/**
 * The style part of a Java font face.
 * @param bold - whether bold
 * @param italic - whether italic
 * @returns `plain`, `bold`, `italic` or `bolditalic`
 */
function javaFontStyle(bold: boolean, italic: boolean): string {
    if (!bold && !italic) {
        return "plain";
    }
    return (bold ? "bold" : "") + (italic ? "italic" : "");
}

/**
 * The family a font face reads back as: the reader drops a face suffix (Dialog.plain is Dialog) and reads a Java
 * logical name as the family Cytoscape draws it with (Dialog as sans-serif).
 * @param name - the face
 * @returns the family
 */
function fontReadsAs(name: string): string {
    return javaFamily(name.replace(/\.(?:bold|italic|plain|bolditalic)$/i, ""));
}

/**
 * The default name of the column a mapping over a non-data column reads.
 * @param target - nodes or edges
 * @param ref - the column
 * @returns the name
 */
function defaultColumnName(target: StyleTarget, ref: ColumnRef): string {
    if ("style" in ref) {
        return `graphty.style.${target}.${ref.style}`;
    }
    return `graphty.style.${target}.${"computed" in ref ? ref.computed : (ref as { data: string }).data}`;
}

/** The kinds of value a Cytoscape passthrough reads the same way the neutral reading does. */
const PASSTHROUGH_SAFE: ReadonlySet<string> = new Set(["color", "number", "text", "boolean"]);

/**
 * Turns neutral rules into a Cytoscape visual style. Rules over every element become defaults (a constant) and
 * mappings (one per visual property: the topmost wins); a passthrough of a value Cytoscape spells differently (an
 * opacity, a shape) becomes a discrete table over the values the graph holds. Every element whose value under the
 * rules differs from what that style gives gets a bypass, so Cytoscape draws exactly what the rules give; each rule
 * written that way is noted as `W_STYLE_LAYER_FLATTENED`. A property Cytoscape has no visual property for is noted as
 * `W_STYLE_NOT_WRITTEN`, a value changed to the nearest Cytoscape has as `W_STYLE_APPROXIMATED`.
 * @param extracted - the styles, for this graph
 * @param snapshot - the graph
 * @param options - the dialect, notes and column names
 * @returns the style, the bypasses and the columns the writer adds
 * @category Styles
 */
export function emitCytoscapeStyle(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    options: CytoscapeEmitOptions,
): CytoscapeEmitted {
    const notes = options.notes ?? new StyleNotes();
    const style = emptyCytoscapeStyle();
    const bypasses = {
        node: new Array<Map<string, unknown> | null>(snapshot.nodeCount).fill(null),
        edge: new Array<Map<string, unknown> | null>(snapshot.edgeCount).fill(null),
    };
    const columns = {
        node: new Map<string, readonly (StyleValue | null)[]>(),
        edge: new Map<string, readonly (StyleValue | null)[]>(),
    };
    for (const target of ["node", "edge"] as const) {
        emitTarget(targetEmit(target, extracted, snapshot, options, notes), style, bypasses[target], columns[target]);
    }
    const bg = extracted.styles.graph.background;
    if (bg !== undefined) {
        style.network.defaults.set(
            options.dialect === "cx2" ? "NETWORK_BACKGROUND_COLOR" : "NETWORK_BACKGROUND_PAINT",
            bg.toUpperCase(),
        );
    }
    return { style, bypasses, columns };
}

/** The neutral style one target's Cytoscape style gives, being built. */
interface Model {
    readonly set: Map<string, StyleValue>;
    readonly map: Map<string, Mapping>;
    readonly mappedBy: Map<string, string>;
}

/** What emitting one target reads. */
interface TargetEmit {
    readonly target: StyleTarget;
    readonly extracted: ExtractedStyles;
    readonly snapshot: GraphSnapshot;
    readonly options: CytoscapeEmitOptions;
    readonly notes: StyleNotes;
    /** The element count. */
    readonly n: number;
    readonly src: ReturnType<typeof refSource>;
    /** The target's rules. */
    readonly rules: readonly StyleRule[];
    /** Every element's value of each property the rules write. */
    readonly truth: ReadonlyMap<string, (StyleValue | null)[]>;
    /** The approximation note of a property. */
    readonly approx: (p: string) => () => void;
    /** The approximation note of a default, counted over the elements that draw it. */
    readonly approxDefault: (p: string, value: StyleValue) => () => void;
}

/**
 * What emitting one target reads, worked out once.
 * @param target - nodes or edges
 * @param extracted - the styles
 * @param snapshot - the graph
 * @param options - the options
 * @param notes - where losses are noted
 * @returns the target's emission
 */
function targetEmit(
    target: StyleTarget,
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    options: CytoscapeEmitOptions,
    notes: StyleNotes,
): TargetEmit {
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const src = refSource(target, n, extracted.columns[target], extracted.features[target], snapshot);
    const rules = extracted.styles.rules.filter((r) => r.target === target);
    const written = new Set(rules.flatMap((r) => [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]));
    const truth = new Map(Array.from(written, (p) => [p, resolveRules(rules, target, p, src)] as const));
    return {
        target,
        extracted,
        snapshot,
        options,
        notes,
        n,
        src,
        rules,
        truth,
        approx: (p) => () => {
            notes.add(STYLE_ISSUE.APPROXIMATED, target, p);
        },
        // a default written as an approximation changes every element that draws it
        approxDefault: (p, value) => () => {
            const count = (truth.get(p) ?? []).filter((v) => v === value).length;
            notes.add(STYLE_ISSUE.APPROXIMATED, target, p, { count: Math.max(count, 1) });
        },
    };
}

/** The properties Cytoscape draws one way only, with that way: what is drawn so needs nothing written. */
const DRAWN_SO: ReadonlyMap<string, StyleValue> = new Map<string, StyleValue>([
    // it measures each word with a space after it when it wraps a label
    ["labelWrapTrailingSpace", true],
    // it curves an edge through its bends' midpoints
    ["bendCurve", "midpoints"],
]);

/**
 * Whether every element's value of a property is how Cytoscape draws it anyway, so there is nothing to write.
 * @param p - the property
 * @param values - each element's value
 * @returns true when nothing is lost by not writing it
 */
function drawnSo(p: string, values: readonly (StyleValue | null)[]): boolean {
    const way = DRAWN_SO.get(p);
    return way !== undefined && values.every((v) => v === null || v === way);
}

/**
 * Emits one target.
 * @param e - the target's emission
 * @param style - the style being written
 * @param bypasses - the target's bypasses, filled in
 * @param columns - the target's added columns, filled in
 */
function emitTarget(
    e: TargetEmit,
    style: CytoscapeStyle,
    bypasses: (Map<string, unknown> | null)[],
    columns: Map<string, readonly (StyleValue | null)[]>,
): void {
    const { target, notes, truth } = e;
    const writers = WRITERS[e.options.dialect][target];
    for (const [p, values] of truth) {
        const fixed = FIXED[target].get(p);
        if (fixed !== undefined) {
            // Cytoscape draws every border inside its node's size and every wave alike: nothing to write, and any
            // other value is lost
            const other = values.filter((v) => v !== null && v !== fixed).length;
            if (other > 0) {
                notes.add(STYLE_ISSUE.APPROXIMATED, target, p, { count: other });
            }
        } else if (!writers.has(p) && !(FONT_PROPS as readonly string[]).includes(p) && !drawnSo(p, values)) {
            const count = values.filter((v) => v !== null).length;
            notes.add(STYLE_ISSUE.NOT_WRITTEN, target, p, { count: Math.max(count, 1) });
        }
    }

    // a rule written as per-element values is noted with the elements that carry one, once per property
    const counted = new Set<string>();
    const carrying = (p: string): number => {
        if (counted.has(p)) {
            return 0;
        }
        counted.add(p);
        return Math.max((truth.get(p) ?? []).filter((v) => v !== null).length, 1);
    };
    const model = buildModel(target, e.rules, writers, notes, carrying);
    const s = style[target];
    s.dependencies.set(target === "node" ? "nodeSizeLocked" : "arrowColorMatchesEdge", false);
    for (const [p, w] of writers) {
        if (truth.has(p)) {
            emitProperty(e, s, model, p, w, columns, carrying);
        }
    }
    addBypasses(e, model, writers, bypasses);
    emitFont(e, model, s, bypasses);
}

/**
 * Emits one property the rules write: its default, and its mapping, or the mapping noted as flattened when
 * Cytoscape cannot read the column it needs.
 * @param e - the target's emission
 * @param s - the target's style
 * @param model - the model; a mapping not written is removed
 * @param p - the property
 * @param w - its writer
 * @param columns - where added columns go
 * @param carrying - how many elements carry a value of a property, once
 */
function emitProperty(
    e: TargetEmit,
    s: CytoscapeStyle["node"],
    model: Model,
    p: string,
    w: Writer,
    columns: Map<string, readonly (StyleValue | null)[]>,
    carrying: (p: string) => number,
): void {
    const set = model.set.get(p);
    if (set !== undefined) {
        s.defaults.set(w.vp, w.write(set, e.approxDefault(p, set)));
    }
    let m = model.map.get(p);
    if (m === undefined) {
        return;
    }
    if (e.options.dialect === "cx2" && m.kind === "continuous") {
        m = cx2Points(m, e.approx(p));
        model.map.set(p, m);
    }
    const cm = cytoscapeMapping(e, p, m, w, columns);
    if (cm === null) {
        e.notes.add(STYLE_ISSUE.LAYER_FLATTENED, e.target, p, { sample: model.mappedBy.get(p), count: carrying(p) });
        model.map.delete(p);
    } else {
        s.mappings.set(w.vp, cm);
    }
}

/**
 * A bypass for every element the written style draws differently from the rules.
 * @param e - the target's emission
 * @param model - the defaults and mappings written
 * @param writers - the dialect's writers
 * @param bypasses - the bypasses, filled in
 */
function addBypasses(
    e: TargetEmit,
    model: Model,
    writers: ReadonlyMap<string, Writer>,
    bypasses: (Map<string, unknown> | null)[],
): void {
    const { target } = e;
    const modelRules: StyleRule[] = [
        {
            id: "defaults",
            target,
            role: "defaults",
            origin: "declared",
            where: { all: true },
            set: Object.fromEntries(model.set),
        },
        {
            id: "mappings",
            target,
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: Object.fromEntries(model.map),
        },
    ];
    for (const [p, w] of writers) {
        const want = e.truth.get(p);
        if (want === undefined) {
            continue;
        }
        const drawn = resolveRules(modelRules, target, p, e.src);
        const step = drawnStep(model.map.get(p), w.vp, STYLE_PROPERTIES[target].get(p));
        let rounded = 0;
        for (let i = 0; i < e.n; i++) {
            const v = want[i];
            if (v !== null && v !== drawn[i]) {
                bypasses[i] ??= new Map();
                bypasses[i]?.set(w.vp, w.write(v, e.approx(p)));
            } else if (offStep(v, step)) {
                rounded++;
            }
        }
        if (rounded > 0) {
            e.notes.add(STYLE_ISSUE.APPROXIMATED, target, p, { count: rounded });
        }
    }
}

/**
 * The step Cytoscape rounds the values of a written mapping to: a continuous mapping, or a passthrough written as
 * one, on a visual property that holds whole numbers (a font size, a 0..255 transparency) is drawn rounded, unless
 * the mapping already rounds to it. A passthrough written as a table writes its values through the property's writer,
 * which notes them itself.
 * @param m - the mapping written, if any
 * @param vp - the visual property it sets
 * @param kind - the kind of value the property holds
 * @returns the step, or undefined when Cytoscape draws the mapping's values as they are
 */
function drawnStep(m: Mapping | undefined, vp: string, kind: string | undefined): number | undefined {
    const ramp = m?.kind === "continuous" && m.step === undefined;
    const passthrough = m?.kind === "passthrough" && PASSTHROUGH_SAFE.has(kind ?? "");
    return ramp || passthrough ? vpStep(vp) : undefined;
}

/**
 * Whether a value is not a multiple of a step, so Cytoscape draws it rounded.
 * @param v - the value
 * @param step - the step, or undefined for none
 * @returns true when the value changes on rounding
 */
function offStep(v: StyleValue | null | undefined, step: number | undefined): boolean {
    return step !== undefined && typeof v === "number" && num6(Math.round(v / step) * step) !== v;
}

/**
 * The defaults and mappings of one target: rules over every element, bottom to top. A constant over every element
 * hides everything beneath it; of two mappings of one property only the topmost is kept. Every rule that cannot be
 * kept whole is noted as `W_STYLE_LAYER_FLATTENED`.
 * @param target - nodes or edges
 * @param rules - the target's rules
 * @param writers - the dialect's writers
 * @param notes - where flattened rules are noted
 * @param carrying - how many elements carry a value of a property
 * @returns the model
 */
function buildModel(
    target: StyleTarget,
    rules: readonly StyleRule[],
    writers: ReadonlyMap<string, Writer>,
    notes: StyleNotes,
    carrying: (p: string) => number,
): Model {
    const model: Model = { set: new Map(), map: new Map(), mappedBy: new Map() };
    const flatten = (p: string, id: string): void => {
        notes.add(STYLE_ISSUE.LAYER_FLATTENED, target, p, { sample: id, count: carrying(p) });
    };
    const holds = (p: string): boolean => writers.has(p) || (FONT_PROPS as readonly string[]).includes(p);
    const applySet = (r: StyleRule, all: boolean): void => {
        for (const [p, v] of Object.entries(r.set ?? {})) {
            if (v === undefined || !holds(p)) {
                continue;
            }
            if (!all) {
                flatten(p, r.id);
                continue;
            }
            model.set.set(p, v);
            model.map.delete(p);
            model.mappedBy.delete(p);
        }
    };
    const applyMap = (r: StyleRule, all: boolean): void => {
        for (const [p, m] of Object.entries(r.map ?? {})) {
            if (m === undefined || !holds(p)) {
                continue;
            }
            if (!all || (FONT_PROPS as readonly string[]).includes(p)) {
                flatten(p, r.id);
                continue;
            }
            const below = model.mappedBy.get(p);
            if (below !== undefined) {
                flatten(p, below);
            }
            model.map.set(p, m);
            model.mappedBy.set(p, r.id);
        }
    };
    for (const r of rules) {
        const all = "all" in r.where && r.where.all;
        applySet(r, all);
        applyMap(r, all);
    }
    return model;
}

/**
 * One neutral mapping as a Cytoscape mapping.
 * @param e - the target's emission
 * @param p - the property
 * @param m - the mapping
 * @param w - the property's writer
 * @param columns - where added columns go
 * @returns the mapping, or null when Cytoscape cannot read the column it needs
 */
function cytoscapeMapping(
    e: TargetEmit,
    p: string,
    m: Mapping,
    w: Writer,
    columns: Map<string, readonly (StyleValue | null)[]>,
): CytoscapeMapping | null {
    const column = mappingColumn(e, m.by, columns);
    if (column === null) {
        return null;
    }
    const approx = e.approx(p);
    const write = (v: StyleValue): unknown => w.write(v, approx);
    if (m.kind === "passthrough") {
        return passthroughMapping(e, p, m.by, column, write);
    }
    if (m.kind === "discrete") {
        return {
            kind: "discrete",
            column,
            type: keyType(
                e,
                m.by,
                m.table.map(([k]) => k),
            ),
            table: m.table.map(([k, v]) => [k, write(v)]),
        };
    }
    if (m.kind === "continuous") {
        const points: CytoscapeContinuousPoint[] = m.points.map((pt: ContinuousPoint) => ({
            at: pt.at,
            below: write(pt.below),
            value: write(pt.value),
            above: write(pt.above),
        }));
        return { kind: "continuous", column, type: "double", points };
    }
    return null;
}

/**
 * The column a mapping reads, by its name in the file: a data column's own, else an added column of the style
 * column's or the degree's values.
 * @param e - the target's emission
 * @param ref - the column
 * @param columns - where added columns go
 * @returns the name, or null when the values cannot be written (a degree of an edge)
 */
function mappingColumn(
    e: TargetEmit,
    ref: ColumnRef,
    columns: Map<string, readonly (StyleValue | null)[]>,
): string | null {
    if ("data" in ref) {
        return ref.data;
    }
    const { target } = e;
    const column = (e.options.columnName ?? defaultColumnName)(target, ref);
    let values: readonly (StyleValue | null)[] | null = null;
    if ("style" in ref) {
        values = e.extracted.columns[target].get(ref.style) ?? null;
    } else if ("computed" in ref && target === "node") {
        values = degreeValues(e.snapshot, ref.computed);
    }
    if (values === null) {
        return null;
    }
    columns.set(column, values);
    return column;
}

/**
 * A passthrough as Cytoscape reads it: a passthrough where Cytoscape reads the values as the neutral reading does,
 * else a table over the values the graph holds, in Cytoscape's spelling.
 * @param e - the target's emission
 * @param p - the property
 * @param by - the column
 * @param column - its name in the file
 * @param write - a value in Cytoscape's spelling
 * @returns the mapping
 */
function passthroughMapping(
    e: TargetEmit,
    p: string,
    by: ColumnRef,
    column: string,
    write: (v: StyleValue) => unknown,
): CytoscapeMapping {
    const { target } = e;
    const kind = STYLE_PROPERTIES[target].get(p) ?? "";
    const cells = e.src.column(by) ?? [];
    if (PASSTHROUGH_SAFE.has(kind)) {
        return { kind: "passthrough", column, type: typeOf(Array.from(cells)) };
    }
    const read = "style" in by ? (v: unknown): StyleValue | null => (isScalar(v) ? v : null) : canonicalFor(target, p);
    const seen = new Map<Scalar, unknown>();
    for (let i = 0; i < cells.length; i++) {
        const raw = cells[i];
        const v = isScalar(raw) && !seen.has(raw) ? read(raw) : null;
        if (v !== null) {
            seen.set(raw as Scalar, write(v));
        }
    }
    const table = Array.from(seen);
    return {
        kind: "discrete",
        column,
        type: keyType(
            e,
            by,
            table.map(([k]) => k),
        ),
        table,
    };
}

/**
 * A continuous mapping as CX2 holds it: CX2's intervals give the value exactly at a point only as the value just
 * below or just above it, so a third value becomes the one below (noted; the elements exactly at it get bypasses).
 * @param m - the mapping
 * @param approx - called when a point changes
 * @returns the mapping CX2 reads back
 */
function cx2Points(m: Extract<Mapping, { kind: "continuous" }>, approx: () => void): Mapping {
    let changed = false;
    const points = m.points.map((pt) => {
        if (pt.value === pt.below || pt.value === pt.above) {
            return pt;
        }
        changed = true;
        return { ...pt, value: pt.below };
    });
    if (!changed) {
        return m;
    }
    approx();
    return { ...m, points };
}

/**
 * Whether a value is a scalar.
 * @param v - the value
 * @returns true for a string, a finite number or a boolean
 */
function isScalar(v: unknown): v is Scalar {
    return typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));
}

/**
 * The type a discrete mapping's keys are written with: `double` over a column the exporter writes as Double
 * (Cytoscape compares an Integer key with a Double cell and finds no match), else the keys' own type.
 * @param e - the target's emission
 * @param by - the column the mapping reads
 * @param keys - the keys
 * @returns the type
 */
function keyType(e: TargetEmit, by: ColumnRef, keys: readonly unknown[]): string {
    const type = typeOf(keys);
    if (type !== "integer") {
        return type;
    }
    if (!("data" in by)) {
        // a column the exporter adds holds numbers as Double
        return "double";
    }
    const meta = (e.target === "node" ? e.snapshot.nodes : e.snapshot.edges).get(by.data)?.meta;
    const floating = (meta?.dtype === "f32" || meta?.dtype === "f64") && meta.origin?.type !== "long";
    return floating ? "double" : type;
}

/**
 * Cytoscape's attribute type of a set of values: `integer`, `double`, `boolean` or `string`.
 * @param values - the values
 * @returns the type
 */
function typeOf(values: readonly unknown[]): string {
    let numbers = 0;
    let integers = 0;
    let booleans = 0;
    let all = 0;
    for (const v of values) {
        if (v === null || v === undefined) {
            continue;
        }
        all++;
        if (typeof v === "number") {
            numbers++;
            if (Number.isInteger(v)) {
                integers++;
            }
        } else if (typeof v === "boolean") {
            booleans++;
        }
    }
    if (all > 0 && numbers === all) {
        return integers === all ? "integer" : "double";
    }
    if (all > 0 && booleans === all) {
        return "boolean";
    }
    return "string";
}

/**
 * The font face: a default from the constant font properties, and a bypass for every element whose family, weight
 * or italic differs from it.
 * @param e - the target's emission
 * @param model - the model
 * @param s - the target's style
 * @param bypasses - the bypasses
 */
function emitFont(
    e: TargetEmit,
    model: Model,
    s: CytoscapeStyle["node"],
    bypasses: (Map<string, unknown> | null)[],
): void {
    const { target, truth, n, approx, approxDefault } = e;
    const { dialect } = e.options;
    if (!FONT_PROPS.some((p) => truth.has(p))) {
        return;
    }
    const [fd, wd, id] = FONT_PROPS.map((p) => model.set.get(p) ?? null);
    const vp = FONT_VP[target];
    if (fd !== null || wd !== null || id !== null) {
        s.defaults.set(
            vp,
            fontOut(dialect, fd, wd, id, fd === null ? approx("labelFont") : approxDefault("labelFont", fd)),
        );
    }
    const [ft, wt, it] = FONT_PROPS.map((p) => truth.get(p) ?? null);
    for (let i = 0; i < n; i++) {
        const f = ft?.[i] ?? null;
        const w = wt?.[i] ?? null;
        const t = it?.[i] ?? null;
        const differs = (f !== null && f !== fd) || (w !== null && w !== wd) || (t !== null && t !== id);
        if (differs) {
            bypasses[i] ??= new Map();
            bypasses[i]?.set(vp, fontOut(dialect, f ?? fd, w ?? wd, t ?? id, approx("labelFont")));
        }
    }
}

// ------------------------------------------------------------------ the file forms

/**
 * A raw value as text: `,` doubled inside a CX version 1 definition.
 * @param v - the value
 * @returns the text
 */
function defText(v: unknown): string {
    return String(v).replaceAll(",", ",,");
}

/**
 * A mapping as a CX version 1 definition string.
 * @param m - the mapping
 * @returns the definition
 * @category Styles
 */
export function cx1Definition(m: CytoscapeMapping): string {
    const parts = [`COL=${defText(m.column)}`, `T=${m.type ?? "string"}`];
    if (m.kind === "discrete") {
        m.table.forEach(([k, v], i) => {
            parts.push(`K=${i}=${defText(k)}`, `V=${i}=${defText(v)}`);
        });
    } else if (m.kind === "continuous") {
        m.points.forEach((p, i) => {
            parts.push(
                `L=${i}=${defText(p.below)}`,
                `E=${i}=${defText(p.value)}`,
                `G=${i}=${defText(p.above)}`,
                `OV=${i}=${p.at}`,
            );
        });
    }
    return parts.join(",");
}

/**
 * A record of a Map with text keys.
 * @param map - the map
 * @param value - how each value is written
 * @returns the record
 */
function recordOf<V>(map: ReadonlyMap<string, V>, value: (v: V) => unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of map) {
        Object.defineProperty(out, k, { value: value(v), enumerable: true, writable: true, configurable: true });
    }
    return out;
}

/**
 * A style (in the desktop dialect) as the default entries of a CX version 1 `cyVisualProperties` aspect: `network`,
 * `nodes:default` and `edges:default`, with every value as text and every mapping as a definition string. The
 * writer adds each element's bypasses as `nodes` / `edges` entries.
 * @param style - the style
 * @returns the entries
 * @category Styles
 */
export function cytoscapeCxAspect(style: CytoscapeStyle): Record<string, unknown>[] {
    const entry = (of: string, t: CytoscapeStyle["node"]): Record<string, unknown> => ({
        properties_of: of,
        properties: recordOf(t.defaults, String),
        dependencies: recordOf(t.dependencies, String),
        mappings: recordOf(t.mappings, (m) => ({ type: m.kind.toUpperCase(), definition: cx1Definition(m) })),
    });
    return [
        { properties_of: "network", properties: recordOf(style.network.defaults, String) },
        entry("nodes:default", style.node),
        entry("edges:default", style.edge),
    ];
}

/**
 * A continuous mapping's points as CX2 intervals: below the first point, between each two, above the last. The
 * value exactly at a point is the interval that includes it.
 * @param points - the points
 * @returns the intervals
 */
function cx2Intervals(points: readonly CytoscapeContinuousPoint[]): Record<string, unknown>[] {
    const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
    const out: Record<string, unknown>[] = [];
    for (let i = 0; i <= points.length; i++) {
        const lo = points.at(i - 1);
        const hi = points.at(i);
        const iv: Record<string, unknown> = {};
        if (i > 0 && lo !== undefined) {
            iv.min = lo.at;
            iv.minVPValue = lo.above;
            iv.includeMin = same(lo.value, lo.above);
        }
        if (i < points.length && hi !== undefined) {
            iv.max = hi.at;
            iv.maxVPValue = hi.below;
            iv.includeMax = !same(hi.value, hi.above) && same(hi.value, hi.below);
        }
        out.push(iv);
    }
    return out;
}

/**
 * A style (in the CX2 dialect) as CX2's `visualProperties` and `visualEditorProperties` aspects. The writer adds the
 * bypasses as `nodeBypasses` / `edgeBypasses`.
 * @param style - the style
 * @returns the two aspects
 * @category Styles
 */
export function cytoscapeCx2Aspects(style: CytoscapeStyle): {
    /** The `visualProperties` aspect. */
    visualProperties: Record<string, unknown>[];
    /** The `visualEditorProperties` aspect. */
    visualEditorProperties: Record<string, unknown>[];
} {
    const mapping = (m: CytoscapeMapping): Record<string, unknown> => {
        if (m.kind === "passthrough") {
            return { type: "PASSTHROUGH", definition: { attribute: m.column } };
        }
        if (m.kind === "discrete") {
            return {
                type: "DISCRETE",
                definition: { attribute: m.column, map: m.table.map(([v, vp]) => ({ v, vp })) },
            };
        }
        return { type: "CONTINUOUS", definition: { attribute: m.column, map: cx2Intervals(m.points) } };
    };
    const id = (v: unknown): unknown => v;
    return {
        visualProperties: [
            {
                default: {
                    network: recordOf(style.network.defaults, id),
                    node: recordOf(style.node.defaults, id),
                    edge: recordOf(style.edge.defaults, id),
                },
                nodeMapping: recordOf(style.node.mappings, mapping),
                edgeMapping: recordOf(style.edge.mappings, mapping),
            },
        ],
        visualEditorProperties: [
            {
                properties: {
                    nodeSizeLocked: style.node.dependencies.get("nodeSizeLocked") === true,
                    arrowColorMatchesEdge: style.edge.dependencies.get("arrowColorMatchesEdge") === true,
                },
            },
        ],
    };
}

/**
 * An attribute pair.
 * @param name - the attribute
 * @param value - its value
 * @returns ` name="value"`, escaped
 */
function attr(name: string, value: unknown): string {
    return ` ${name}="${escapeXmlAttribute(String(value))}"`;
}

/**
 * A style (in the desktop dialect) as one `<visualStyle>` element of a session's `session_vizmap.xml`.
 * @param style - the style
 * @param name - the style's name
 * @returns the element's XML
 * @category Styles
 */
export function cytoscapeVizmapXml(style: CytoscapeStyle, name: string): string {
    const lines = [`<visualStyle${attr("name", name)}>`];
    const section = (tag: string, defaults: ReadonlyMap<string, unknown>, t?: CytoscapeStyle["node"]): void => {
        lines.push(`  <${tag}>`);
        for (const [dep, on] of t?.dependencies ?? []) {
            lines.push(`    <dependency${attr("name", dep)}${attr("value", on)}/>`);
        }
        const vps = new Set([...defaults.keys(), ...(t?.mappings.keys() ?? [])]);
        for (const vp of vps) {
            const d = defaults.has(vp) ? attr("default", defaults.get(vp)) : "";
            const m = t?.mappings.get(vp);
            if (m === undefined) {
                lines.push(`    <visualProperty${attr("name", vp)}${d}/>`);
            } else {
                lines.push(`    <visualProperty${attr("name", vp)}${d}>`, ...mappingXml(m), "    </visualProperty>");
            }
        }
        lines.push(`  </${tag}>`);
    };
    section("network", style.network.defaults);
    section("node", style.node.defaults, style.node);
    section("edge", style.edge.defaults, style.edge);
    lines.push("</visualStyle>");
    return lines.join("\n");
}

/**
 * A mapping as the lines of its `session_vizmap.xml` element.
 * @param m - the mapping
 * @returns the lines
 */
function mappingXml(m: CytoscapeMapping): string[] {
    const head = `${attr("attributeName", m.column)}${attr("attributeType", m.kind === "continuous" ? "float" : (m.type ?? "string"))}`;
    if (m.kind === "passthrough") {
        return [`      <passthroughMapping${head}/>`];
    }
    if (m.kind === "discrete") {
        return [
            `      <discreteMapping${head}>`,
            ...m.table.map(
                ([k, v]) => `        <discreteMappingEntry${attr("attributeValue", k)}${attr("value", v)}/>`,
            ),
            "      </discreteMapping>",
        ];
    }
    return [
        `      <continuousMapping${head}>`,
        ...m.points.map(
            (p) =>
                `        <continuousMappingPoint${attr("attrValue", p.at)}${attr("lesserValue", p.below)}${attr("equalValue", p.value)}${attr("greaterValue", p.above)}/>`,
        ),
        "      </continuousMapping>",
    ];
}

// ------------------------------------------------------------------ per-element values

/**
 * The neutral properties a Cytoscape dialect holds per element: what a writer of resolved per-element values (XGMML
 * graphics, a session view's bypasses) can write.
 * @param target - nodes or edges
 * @param dialect - the spelling
 * @returns the properties
 */
export function cytoscapeWritableProperties(target: StyleTarget, dialect: CytoscapeDialect): string[] {
    // a label wrapped as Cytoscape wraps it needs nothing written: emitTarget notes any other value
    return [
        ...WRITERS[dialect][target].keys(),
        ...FONT_PROPS,
        ...FIXED[target].keys(),
        ...(target === "node" ? ["labelWrapTrailingSpace"] : ["bendCurve"]),
    ];
}

/**
 * One element's values as Cytoscape visual properties in a dialect's spelling, for a writer of per-element values.
 * The label font, weight and italic are written together as one font face.
 * @param target - nodes or edges
 * @param value - the element's value of a neutral property, or null
 * @param dialect - the spelling
 * @param approx - called with the property when a value is written as its nearest
 * @returns visual property name to raw value
 */
export function cytoscapeElementProperties(
    target: StyleTarget,
    value: (property: string) => StyleValue | null,
    dialect: CytoscapeDialect,
    approx: (property: string) => void,
): Map<string, unknown> {
    const out = new Map<string, unknown>();
    for (const [p, w] of WRITERS[dialect][target]) {
        const v = value(p);
        if (v !== null) {
            out.set(
                w.vp,
                w.write(v, () => {
                    approx(p);
                }),
            );
        }
    }
    const [f, wt, it] = FONT_PROPS.map((p) => value(p));
    if (f !== null || wt !== null || it !== null) {
        out.set(
            FONT_VP[target],
            fontOut(dialect, f, wt, it, () => {
                approx("labelFont");
            }),
        );
    }
    return out;
}
