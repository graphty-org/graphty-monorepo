/**
 * Pajek styles: each vertex's shape keyword and drawing parameters (`ic`, `bc`, `bw`, `x_fact`, `y_fact`, `lc`, `fos`)
 * and each line's `c`, `w` and `p`, read the way Pajek 6.02 draws them (parameters carried from line to line, `CARRIED`),
 * with Pajek's own defaults beneath (a #ffd9bc ellipse with a #660000 border, grey arcs with an arrow at the target,
 * teal edges). Colors are Pajek's: the dvips names and the ten Pajek adds, `GrayNN`, `RGBrrggbb`, `RGB(r,g,b)` and the
 * CMYK forms. Lengths are in PostScript points, the unit of Pajek's EPS and SVG export, where the drawing's [0,1] square
 * is [0,500] (`PAJEK_POINTS_PER_UNIT`): a vertex is Pajek's normal size 20 times its `s_size`, `x_fact` and `y_fact`,
 * `bw` and `fos` are points as written, an arc is `w` wide and an edge twice `w`.
 *
 * Writing: the same parameters from what graphty draws, leaving out what Pajek draws by default; a color that is a
 * dvips name is written by name, any other as `RGBrrggbb`, so colors are exact. The `graphty.styles` block, with the
 * per-element values its rules read inside it (Pajek has no other place for them), is one comment line,
 * `% graphty.styles <json>`, which Pajek skips and graph-io reads back.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { explicitWeights } from "../../common/weights.js";
import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { DVIPS_COLORS } from "../../styles/canon/color-tables.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber } from "../../styles/canon/number.js";
import { type CanonSite, noteAt } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { toolDefaults } from "../../styles/defaults.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import { styleBlockLosses, writeStyleBlock } from "../../styles/io/block.js";
import { elementValues, takeFromBlock } from "../../styles/io/round-trip.js";
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
import { type ValueColumns, valueColumns } from "../graphml/styles-yed.js";
import { drawLines, drawVertices, type PajekDraw } from "./draw.js";
import { LABEL_COLUMN, PAJEK_STYLE_COMMENT, SHAPE_COLUMN, VALUE_COLUMN } from "./syntax.js";

/**
 * What the Pajek writer holds natively: the vertex label, the vertex shape keyword and drawing parameters, the line
 * parameters, and the arrows Pajek draws on arcs. The `graphty.styles` block is a comment line the writer places itself.
 * @category Built-in formats
 */
export const PAJEK_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    node: Object.freeze([
        "label",
        "fill",
        "fillOpacity",
        "opacity",
        "borderColor",
        "borderWidth",
        "shape",
        "width",
        "height",
        "labelColor",
        "labelSize",
        "labelFont",
        "labelPosition",
    ] as const),
    edge: Object.freeze([
        "color",
        "opacity",
        "width",
        "lineStyle",
        "sourceArrow",
        "targetArrow",
        "arrowPosition",
        "label",
        "labelColor",
        "labelSize",
        "labelFont",
    ] as const),
    block: "native",
});

/**
 * Pajek's normal vertex size, in points: what `x_fact` and `y_fact` multiply when a vertex sets no `s_size` (the
 * manual, p. 89, names `s_size` "default size" and `x_fact`/`y_fact` "magnification" without stating the value).
 * Measured in Pajek 6.02's own SVG export (`test/fidelity/oracles/pajek-*.svg`): a vertex with no size parameter is
 * drawn 20 across, and `x_fact 1.54` 30.8, on the drawing's [0,500] square.
 */
const PAJEK_VERTEX_SIZE = 20;

/**
 * Points per coordinate unit: "When Postscript picture is obtained, the square [0,1]x[0,1] is transformed to
 * [0,500]x[0,500]" (Pajek, "Pajek to EPS", http://mrvar.fdv.uni-lj.si/pajek/DrawEPS.htm).
 */
export const PAJEK_POINTS_PER_UNIT = 500;

/** The vertex parameters read as styles. */
const NODE_KEYS: readonly string[] = [
    "ic",
    "bc",
    "bw",
    "s_size",
    "x_fact",
    "y_fact",
    "lc",
    "fos",
    "font",
    "lr",
    "lphi",
    "la",
];

/** The line parameters read as styles. */
const EDGE_KEYS: readonly string[] = ["c", "w", "p", "s", "ap", "l", "lc", "fos", "font"];

/**
 * What Pajek carries from one line of a section to the next. A line (arc or edge) that does not set one of these
 * parameters is drawn with the value the line before it set. A vertex line that sets no parameter and names no shape
 * is drawn exactly as the vertex line before it; a vertex line that sets any starts again from Pajek's defaults.
 * Measured in Pajek 6.02's own SVG export: `test/fidelity/oracles/pajek-kdorola.svg` (vertices 2 to 59, which set
 * nothing, drawn with vertex 1's `lr 11 lphi 285 fos 9`, and 61 on as vertex 60's `box`), `pajek-1crn.svg` (vertex 3
 * drawn as vertex 2), `pajek-synth-lines.svg` (arc 3, which sets `w 3` but no `c`, drawn in arc 2's `c Blue`), and
 * the generated `shapes-and-lines.net` (vertex 5 at the default size after vertex 4's `x_fact 8`). A line's label `l`
 * is its own; its label's color, size and font are not carried here, as they only show with a label.
 */
const CARRIED: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: [SHAPE_COLUMN, ...NODE_KEYS],
    edge: ["c", "w", "p", "s", "ap"],
};

/** The width Pajek draws an edge (undirected) at for each unit of `w`; an arc is drawn `w` wide. */
const EDGE_WIDTH_PER_W = 2;

/** The color and width Pajek draws an arc with when it sets no `c` or `w` (an edge's are the tool defaults). */
const ARC_DEFAULTS = { color: "#999999", width: 1 } as const;

/**
 * A getter that gives an element the parameters an element before it set, as Pajek reads them: for a line each
 * parameter it leaves out, for a vertex all of them when it sets none (`CARRIED`).
 * @param keys - the parameters carried
 * @param whole - true for vertices: carried only to an element that sets none, and then all together
 * @returns for each element in order, its getter
 */
function carriedParams(keys: readonly string[], whole: boolean): (get: Param) => Param {
    let last = new Map<string, unknown>();
    return (get) => {
        const own = new Map<string, unknown>();
        for (const key of keys) {
            const v = get(key);
            if (v !== null) {
                own.set(key, v);
            }
        }
        if (whole) {
            if (own.size > 0) {
                last = own;
                return get;
            }
        } else {
            for (const [key, v] of own) {
                last.set(key, v);
            }
        }
        const carried = last;
        return (key) => get(key) ?? (keys.includes(key) ? (carried.get(key) ?? null) : null);
    };
}

/** The style column marking arcs, which Pajek draws with an arrow at the target. */
const DIRECTED_KEY = "directed";

/** The properties the reader reads, per target: what a file graphty wrote can bring back from its block. */
const READ: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: [
        "label",
        "shape",
        "fill",
        "fillOpacity",
        "borderColor",
        "borderWidth",
        "width",
        "height",
        "labelColor",
        "labelSize",
        "labelFont",
        "labelPosition",
        "labelRotation",
    ],
    edge: [
        "color",
        "opacity",
        "width",
        "lineStyle",
        "arrowSize",
        "arrowPosition",
        "label",
        "labelColor",
        "labelSize",
        "labelFont",
    ],
};

/** A parameter's value on one element, or null. */
type Param = (key: string) => unknown;

/** Receives one canonical value. */
type Put = (property: string, value: StyleValue | null) => void;

/** The site of a property's value. */
type At = (property: string) => CanonSite;

/**
 * Reads a Pajek color and its alpha.
 * @param raw - the parameter's value, or null
 * @param property - the color property
 * @param opacity - its opacity property, or null
 * @param put - receives the values
 * @param at - the sites
 */
function readColor(raw: unknown, property: string, opacity: string | null, put: Put, at: At): void {
    if (raw === null) {
        return;
    }
    const c = canonColor(raw, "dvips", at(property));
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
 * Reads a length or factor.
 * @param raw - the parameter's value, or null
 * @param property - the property
 * @param put - receives the value
 * @param at - the sites
 */
function readNumber(raw: unknown, property: string, put: Put, at: At): void {
    if (raw !== null) {
        put(property, canonNumber(raw, at(property)));
    }
}

/**
 * One vertex's style: its label, which Pajek draws beside it, and its shape keyword and drawing parameters.
 * @param get - the vertex's parameters
 * @param put - receives the values
 * @param at - the sites
 */
function readVertex(get: Param, put: Put, at: At): void {
    // an empty label draws nothing
    const label = get(LABEL_COLUMN);
    if (label !== null && label !== "") {
        put("label", canonText(label, at("label")));
    }
    const shape = get(SHAPE_COLUMN);
    if (shape !== null) {
        put("shape", canonEnum("shape", shape, "dvips", at("shape")));
    }
    readColor(get("ic"), "fill", "fillOpacity", put, at);
    readColor(get("bc"), "borderColor", null, put, at);
    readNumber(get("bw"), "borderWidth", put, at);
    readSize(get, put, at);
    readColor(get("lc"), "labelColor", null, put, at);
    readNumber(get("fos"), "labelSize", put, at);
    readText(get("font"), "labelFont", put, at);
    readLabelPosition(get, put, at);
    readLabelAngle(get("la"), put, at);
}

/**
 * A vertex label's angle `la` (manual p. 90), degrees counterclockwise, as a clockwise rotation: Pajek 6.02's SVG export
 * turns the label by `rotate(-la)` (`pajek-specimen-labels`, `la-30` .. `la-270`). An angle of 360 or more turns the
 * label toward the middle of the layout, which depends on where the vertex is drawn; it is left unread.
 * @param raw - the parameter's value, or null
 * @param put - receives the value
 * @param at - the sites
 */
function readLabelAngle(raw: unknown, put: Put, at: At): void {
    const a = raw === null ? null : canonNumber(raw, at("labelRotation"));
    if (a !== null && a < 360) {
        put("labelRotation", (((360 - a) % 360) + 360) % 360);
    }
}

/**
 * A vertex's width and height in points: the normal size times its `s_size`, `x_fact` and `y_fact`, each 1 when unset;
 * a vertex that sets none of the three is left to the default beneath. The manual (p. 89) calls `s_size` "default
 * size" without a unit; it is read as a factor, as the reference scene (`pajek_file.py`) and the corpus generator
 * (`gen_pajek.py`, `s_size` 1 to 3) read it.
 * @param get - the vertex's parameters
 * @param put - receives the values
 * @param at - the sites
 */
function readSize(get: Param, put: Put, at: At): void {
    const raw = get("s_size");
    const s = raw === null ? 1 : canonNumber(raw, at("width"));
    const size = s === null ? null : PAJEK_VERTEX_SIZE * s;
    for (const [key, property] of [
        ["x_fact", "width"],
        ["y_fact", "height"],
    ] as const) {
        const f = get(key);
        if (f === null && raw === null) {
            continue;
        }
        const factor = f === null ? 1 : canonNumber(f, at(property));
        put(property, size === null || factor === null ? null : Number((size * factor).toPrecision(15)));
    }
}

/**
 * A text parameter (a PostScript font name).
 * @param raw - the parameter's value, or null
 * @param property - the property
 * @param put - receives the value
 * @param at - the sites
 */
function readText(raw: unknown, property: string, put: Put, at: At): void {
    if (raw !== null && raw !== "") {
        put(property, canonText(raw, at(property)));
    }
}

/**
 * The side a label falls on for Pajek's label angle `lphi` (degrees counterclockwise from the right). Pajek starts the
 * label's text at the polar point and runs it to the right, so a point above or below the vertex puts the label above
 * or below and to its right. Measured in Pajek 6.02's own SVG export (`test/fidelity/oracles/pajek-*.svg`: every
 * label's text starts at the point, `text-anchor` start).
 * @param angle - `lphi`
 * @returns the side
 */
function labelSide(angle: number): string {
    const a = ((angle % 360) + 360) % 360;
    if (a < 30 || a >= 330) {
        return "right";
    }
    if (a < 150) {
        return "top-right";
    }
    return a < 210 ? "left" : "bottom-right";
}

/** The `lphi` written for each side `labelSide` gives back, and the side written for each it does not. */
const SIDE_ANGLES: ReadonlyMap<string, number> = new Map([
    ["right", 0],
    ["top-right", 90],
    ["left", 180],
    ["bottom-right", 285],
]);
const NEAREST_SIDES: ReadonlyMap<string, string> = new Map([
    ["top", "top-right"],
    ["top-left", "top-right"],
    ["bottom", "bottom-right"],
    ["bottom-left", "bottom-right"],
]);

/**
 * A vertex's label position from Pajek's polar label parameters (manual p. 90): `lr` is the distance of the label from
 * the vertex center, 0 centering it, and `lphi` its angle in degrees, read as the side the label falls on (`labelSide`).
 * A vertex that sets neither is left to the default beneath.
 * @param get - the vertex's parameters
 * @param put - receives the value
 * @param at - the sites
 */
function readLabelPosition(get: Param, put: Put, at: At): void {
    const lr = get("lr");
    const lphi = get("lphi");
    if (lr === null && lphi === null) {
        return;
    }
    const radius = lr === null ? null : canonNumber(lr, at("labelPosition"));
    if (radius === 0) {
        put("labelPosition", "center");
        return;
    }
    const angle = lphi === null ? PAJEK_LABEL_ANGLE : canonNumber(lphi, at("labelPosition"));
    if (angle !== null) {
        put("labelPosition", labelSide(angle));
    }
}

/**
 * The label angle Pajek uses when a vertex sets a radius but no angle: 285, below the vertex. Measured in Pajek 6.02's
 * own SVG export (`test/fidelity/oracles/pajek-football.svg`: every label starts 20 from its vertex at 285 degrees).
 */
const PAJEK_LABEL_ANGLE = 285;

/**
 * One line's style: its color, width and pattern. Pajek draws an edge (undirected) twice as wide as an arc of the
 * same `w`.
 * @param get - the line's parameters
 * @param put - receives the values
 * @param at - the sites
 * @param directed - whether the line is an arc
 */
function readLine(get: Param, put: Put, at: At, directed: boolean): void {
    readColor(get("c"), "color", "opacity", put, at);
    readNumber(
        get("w"),
        "width",
        (property, value) => {
            put(property, typeof value === "number" && !directed ? value * EDGE_WIDTH_PER_W : value);
        },
        at,
    );
    const p = get("p");
    if (p === "Dots" || p === "Solid") {
        put("lineStyle", canonEnum("lineStyle", p, "dvips", at("lineStyle")));
    } else if (p !== null) {
        // Pajek knows Solid and Dots, case for case; any other pattern (`Dashed`, `dots`) draws a solid line
        noteAt(at("lineStyle"), STYLE_ISSUE.UNKNOWN_VALUE, typeof p === "string" ? p : JSON.stringify(p));
        put("lineStyle", "solid");
    }
    // an arrowhead is 6 x `s` long and 5 x `s` wide; `s` 1, Pajek's normal size, is 6 long (the pajek tool arrowhead)
    readNumber(get("s"), "arrowSize", put, at);
    readArrowPosition(get("ap"), put, at);
    readText(get("l"), "label", put, at);
    readColor(get("lc"), "labelColor", null, put, at);
    readNumber(get("fos"), "labelSize", put, at);
    readText(get("font"), "labelFont", put, at);
}

/**
 * What a line's value draws (manual 5.3 p. 90): a line of value 0 is not drawn, and a negative one is dotted unless
 * the line sets a pattern or carries one from the line before.
 * @param value - the line's value, or null
 * @param get - the line's parameters
 * @param put - receives the values
 */
function readLineValue(value: number | null, get: Param, put: Put): void {
    if (value === 0) {
        put("visible", false);
    } else if (value !== null && value < 0 && get("p") === null) {
        put("lineStyle", "dotted");
    }
}

/**
 * A cell's number: a number as is, a numeric text parsed, anything else null.
 * @param raw - the cell
 * @returns the number, or null
 */
function numberOrNull(raw: unknown): number | null {
    if (typeof raw === "string" && raw.trim() !== "") {
        raw = Number(raw);
    }
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/**
 * Where a line's arrowhead sits, Pajek's `ap` (manual p. 90): a fraction of the line from its end up to 1 (0.5 is the
 * middle); a value above 1 is a distance from the end, which the vocabulary does not hold, so it is noted and not read.
 * @param raw - the parameter's value, or null
 * @param put - receives the value
 * @param at - the sites
 */
function readArrowPosition(raw: unknown, put: Put, at: At): void {
    if (raw === null) {
        return;
    }
    const ap = canonNumber(raw, at("arrowPosition"));
    if (ap !== null && ap > 1) {
        noteAt(at("arrowPosition"), STYLE_ISSUE.NOT_CARRIED, `ap ${String(ap)}`);
        return;
    }
    // 0 is Pajek's own place for the arrow, at the line's end, which a line restates after one that moved it
    if (ap !== 0) {
        put("arrowPosition", ap);
    }
}

/**
 * A table's parameter getter for one element: the cell, or null when the table has no such column or no value.
 * @param table - the node or edge table
 * @param i - the element
 * @returns the getter
 */
function cells(table: GraphSnapshot["nodes"], i: number): Param {
    return (key) => (table.has(key) ? plainCell(table.value(key, i)) : null);
}

/**
 * Whether each edge is an arc (directed).
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
 * The columns of a table that hold styles.
 * @param table - the node or edge table
 * @param keys - the style parameters of that table
 * @returns the column names present
 */
function styleColumns(table: GraphSnapshot["nodes"], keys: readonly string[]): string[] {
    return keys.filter((k) => table.has(k));
}

/**
 * The styles of a Pajek file, read the way Pajek draws them, with Pajek's own defaults beneath: a labeled #ffd9bc
 * ellipse with a #660000 border, teal edges, and grey arcs with an arrow at the target. A file graphty wrote gives back its `graphty.styles` block.
 * @param snapshot - the graph the import built
 * @param context - the work budget and the block text the import kept
 * @returns the styles
 */
export function pajekStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const read = (target: StyleTarget): ValueColumns => {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const out = valueColumns(n);
        const carry = carriedParams(CARRIED[target], target === "node");
        for (let i = 0; i < n; i++) {
            context.budget.spend(target, 1);
            const at: At = (property) => ({ notes, target, property, element: i, budget: context.budget });
            const put: Put = (property, value) => {
                out.put(i, property, value);
            };
            const get = carry(cells(table, i));
            if (target === "node") {
                readVertex(get, put, at);
            } else {
                readLine(get, put, at, directed[i]);
                readLineValue(lineValue(i), get, put);
            }
        }
        return out.values;
    };
    const directed = directedEdges(snapshot);
    const weights = explicitWeights(snapshot);
    // the line's value: its weight, or the `value` column when the import kept the value as an attribute
    const lineValue = (e: number): number | null =>
        weights.isExplicit(e) ? weights.value(e) : numberOrNull(cells(snapshot.edges, e)(VALUE_COLUMN));
    const node = read("node");
    const edge = read("edge");
    const { block, draw } = keptOf(context.kept);
    if (draw !== null) {
        drawVertices(draw, snapshot, node);
        drawLines(draw, snapshot, node, edge);
    }
    if (block !== null) {
        exactFromBlock(snapshot, block, { node, edge });
    }
    // Pajek's defaults that are a rule: an arc has an arrow at its target and is drawn grey and thinner, an edge not
    const rules: StyleRule[] = [];
    const columns = new Map<string, StyleColumn>();
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
            set: { targetArrow: "triangle", color: ARC_DEFAULTS.color, width: ARC_DEFAULTS.width },
        });
    }
    return {
        canonical: true,
        dialect: "dvips",
        tool: "pajek",
        units: "px",
        node: { values: node },
        edge: { values: edge, rules, columns },
        notes: notes.list(),
        block,
        readFrom: {
            node: styleColumns(snapshot.nodes, [SHAPE_COLUMN, ...NODE_KEYS]),
            edge: styleColumns(snapshot.edges, EDGE_KEYS),
        },
    };
}

/**
 * What the import kept for the styles: the `graphty.styles` block, and the Draw window of the `pajekDraw` option.
 * @param kept - the kept value: the block's text, or `{ block, pajekDraw }`
 * @returns the block and the draw settings, each null when absent
 */
function keptOf(kept: unknown): { readonly block: string | null; readonly draw: PajekDraw | null } {
    if (typeof kept === "string") {
        return { block: kept, draw: null };
    }
    if (typeof kept === "object" && kept !== null) {
        const { block, pajekDraw } = kept as { block?: unknown; pajekDraw?: PajekDraw };
        return { block: typeof block === "string" ? block : null, draw: pajekDraw ?? null };
    }
    return { block: null, draw: null };
}

// ============================================================ writing

/** One element's value of a property. */
type Get = (property: string) => StyleValue | null;

/** Records a value written as the nearest one Pajek has. */
type Approximate = (property: string, value: StyleValue) => void;

/** A parameter's written value. */
type Written = string | number;

/** Pajek's shape keywords for graphty's shapes; a shape not listed is written as its nearest. */
const SHAPES: ReadonlyMap<string, string> = new Map([
    ["ellipse", "ellipse"],
    ["rectangle", "box"],
    ["diamond", "diamond"],
    ["triangle", "triangle"],
    ["none", "empty"],
    ["other:cross", "cross"],
    ["other:house", "house"],
    ["other:man", "man"],
    ["other:woman", "woman"],
]);

/** The nearest Pajek shape of a shape Pajek does not have. */
const NEAREST_SHAPES: ReadonlyMap<string, string> = new Map([
    ["round-rectangle", "box"],
    ["parallelogram", "box"],
    ["trapezoid", "box"],
    ["vee", "triangle"],
]);

/** The dvips name of each color that has one: a color with a name is written by it. */
const DVIPS_NAMES: ReadonlyMap<string, string> = new Map(
    [...DVIPS_COLORS].reverse().map(([name, hex]) => [hex, name] as const),
);

/**
 * A color as Pajek writes it: its dvips name when it has one, else `RGBrrggbb`; both are exact.
 * @param color - a canonical `#rrggbb`
 * @returns the text
 */
function pajekColorText(color: string): string {
    return DVIPS_NAMES.get(color) ?? `RGB${color.slice(1).toUpperCase()}`;
}

/**
 * Notes each opacity below 1: Pajek draws every color opaque.
 * @param get - the element's values
 * @param properties - its opacity properties
 * @param approximate - records approximations
 */
function opaque(get: Get, properties: readonly string[], approximate: Approximate): void {
    for (const property of properties) {
        const v = get(property);
        if (v !== null && v !== 1) {
            approximate(property, v);
        }
    }
}

/**
 * A vertex's Pajek shape keyword: its own, else the nearest one (noted), else Pajek's ellipse.
 * @param get - the vertex's values
 * @param approximate - records approximations
 * @returns the keyword
 */
function shapeKeyword(get: Get, approximate: Approximate): string {
    const shape = get("shape");
    if (typeof shape !== "string") {
        return "ellipse";
    }
    const keyword = SHAPES.get(shape);
    if (keyword !== undefined) {
        return keyword;
    }
    approximate("shape", shape);
    return NEAREST_SHAPES.get(shape) ?? "ellipse";
}

/**
 * What Pajek draws by default for a property (`styles/defaults.ts`), which the writer leaves out.
 * @param target - nodes or edges
 * @param property - the property
 * @returns the default, or undefined
 */
function pajekDefault(target: StyleTarget, property: string): StyleValue | undefined {
    const values: Readonly<Record<string, { readonly value: unknown } | undefined>> | undefined =
        toolDefaults("pajek")?.[target];
    return values?.[property]?.value as StyleValue | undefined;
}

/**
 * A vertex's parameters from its values, leaving out the ellipse and the black border 1 wide Pajek draws by default;
 * the inverse of `readVertex`: `x_fact` and `y_fact` are the width and height over the normal size, the other lengths
 * points as they are.
 * @param get - the vertex's values
 * @param approximate - records approximations
 * @returns the parameters, the shape keyword under `shape`
 */
function vertexParams(get: Get, approximate: Approximate): Map<string, Written> {
    const out = new Map<string, Written>();
    opaque(get, ["fillOpacity", "opacity"], approximate);
    const keyword = shapeKeyword(get, approximate);
    if (keyword !== "ellipse") {
        out.set(SHAPE_COLUMN, keyword);
    }
    const colors = [
        ["fill", "ic"],
        ["borderColor", "bc"],
        ["labelColor", "lc"],
    ] as const;
    const numbers = [
        ["width", "x_fact", PAJEK_VERTEX_SIZE],
        ["height", "y_fact", PAJEK_VERTEX_SIZE],
        ["labelSize", "fos", 1],
    ] as const;
    for (const [property, key] of colors) {
        const v = get(property);
        if (typeof v === "string" && v !== pajekDefault("node", property)) {
            out.set(key, pajekColorText(v));
        }
    }
    for (const [property, key, per] of numbers) {
        const v = get(property);
        if (typeof v === "number" && v !== pajekDefault("node", property)) {
            out.set(key, Number((v / per).toPrecision(15)));
        }
    }
    const bw = get("borderWidth");
    if (typeof bw === "number" && bw !== pajekDefault("node", "borderWidth")) {
        out.set("bw", bw);
    }
    const font = get("labelFont");
    if (typeof font === "string" && font !== "" && font !== pajekDefault("node", "labelFont")) {
        out.set("font", font);
    }
    labelPositionParams(get, out, approximate);
    return out;
}

/**
 * A label position as Pajek's polar label parameters, leaving out the default (below and to the right): the center is
 * `lr 0`, a side its angle `lphi`; a side Pajek cannot put a label on is written as the nearest it can, and noted.
 * @param get - the vertex's values
 * @param out - the parameters, changed in place
 * @param approximate - records approximations
 */
function labelPositionParams(get: Get, out: Map<string, Written>, approximate: Approximate): void {
    const position = get("labelPosition");
    if (typeof position !== "string" || position === pajekDefault("node", "labelPosition")) {
        return;
    }
    if (position === "center") {
        out.set("lr", 0);
        return;
    }
    const nearest = NEAREST_SIDES.get(position);
    if (nearest !== undefined) {
        approximate("labelPosition", position);
    }
    const angle = SIDE_ANGLES.get(nearest ?? position);
    if (angle !== undefined && (nearest ?? position) !== pajekDefault("node", "labelPosition")) {
        out.set("lphi", angle);
    }
}

/**
 * A line's color and width when it sets neither: an arc's, or an edge's (the tool defaults).
 * @param directed - whether the line is an arc
 * @returns the color and width
 */
function lineDefaults(directed: boolean): {
    readonly color: StyleValue | undefined;
    readonly width: StyleValue | undefined;
} {
    return directed ? ARC_DEFAULTS : { color: pajekDefault("edge", "color"), width: pajekDefault("edge", "width") };
}

/**
 * A line's parameters from its values, leaving out the solid line Pajek draws by default (grey and 1 wide for an arc,
 * teal and 2 wide for an edge; `w` is half an edge's width). Arrows are Pajek's own: an arc has one at its target and
 * an edge none, so any other arrow is noted.
 * @param get - the line's values
 * @param directed - whether the line is an arc
 * @param approximate - records approximations
 * @returns the parameters
 */
function lineParams(get: Get, directed: boolean, approximate: Approximate): Map<string, Written> {
    const out = new Map<string, Written>();
    opaque(get, ["opacity"], approximate);
    const defaults = lineDefaults(directed);
    const color = get("color");
    if (typeof color === "string" && color !== defaults.color) {
        out.set("c", pajekColorText(color));
    }
    const width = get("width");
    if (typeof width === "number" && width !== defaults.width) {
        out.set("w", directed ? width : Number((width / EDGE_WIDTH_PER_W).toPrecision(15)));
    }
    const lineStyle = get("lineStyle");
    if (typeof lineStyle === "string" && lineStyle !== "solid" && pajekDots(lineStyle, approximate)) {
        out.set("p", "Dots");
    }
    const position = get("arrowPosition");
    if (typeof position === "number" && position > 0) {
        out.set("ap", position);
    }
    lineLabelParams(get, out, approximate);
    const target = get("targetArrow");
    if (target !== null && target !== (directed ? "triangle" : "none")) {
        approximate("targetArrow", target);
    }
    const source = get("sourceArrow");
    if (source !== null && source !== "none") {
        approximate("sourceArrow", source);
    }
    return out;
}

/**
 * A line's label parameters: its text `l` (a line break or a double quote written as Pajek can hold it, noted), its
 * color `lc`, size `fos` and font `font`.
 * @param get - the line's values
 * @param out - the parameters, changed in place
 * @param approximate - records approximations
 */
function lineLabelParams(get: Get, out: Map<string, Written>, approximate: Approximate): void {
    const label = get("label");
    if (typeof label === "string" && label !== "") {
        const text = pajekLabelText(label);
        if (text !== label) {
            approximate("label", label);
        }
        out.set("l", text);
    }
    const labelColor = get("labelColor");
    if (typeof labelColor === "string") {
        out.set("lc", pajekColorText(labelColor));
    }
    const labelSize = get("labelSize");
    if (typeof labelSize === "number") {
        out.set("fos", labelSize);
    }
    const font = get("labelFont");
    if (typeof font === "string" && font !== "") {
        out.set("font", font);
    }
}

/**
 * Whether a line other than a solid one is written as Pajek's Dots: Pajek draws Solid and Dots only; a dashed kind is
 * nearest to Dots, any other line to Solid.
 * @param lineStyle - the line style
 * @param approximate - records approximations
 * @returns true for Dots
 */
function pajekDots(lineStyle: string, approximate: Approximate): boolean {
    if (lineStyle === "dotted") {
        return true;
    }
    approximate("lineStyle", lineStyle);
    return lineStyle === "dashed" || lineStyle === "dash-dot" || lineStyle === "long-dash";
}

/**
 * For a file graphty wrote: where a value read from the parameters is what the writer writes for the block's own
 * value (a hexagon written as an ellipse, a dashed line as Dots), the block's exact value is the truth, so a re-import
 * gives back the same rules; a value another program changed since stays the truth.
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
    const directed = directedEdges(snapshot);
    takeFromBlock(snapshot, text, "pajek", (target) => ({
        values: read[target],
        properties: READ[target],
        writes: PAJEK_STYLE_CAPABILITIES[target],
        readBack: (i, want) => {
            const back = writtenAndReadBack(target, want, directed[i], notes);
            return (property) => back.get(property) ?? null;
        },
        take: (_property, wanted) => wanted !== null,
    }));
}

/**
 * An element's values written as the writer writes them and read back as the reader reads them.
 * @param target - nodes or edges
 * @param want - its values
 * @param directed - for a line, whether it is an arc
 * @param notes - a scratch for the notes the round trip makes
 * @returns the values read back, by property
 */
function writtenAndReadBack(
    target: StyleTarget,
    want: Get,
    directed: boolean,
    notes: StyleNotes,
): Map<string, StyleValue> {
    const ignore: Approximate = () => undefined;
    const params = target === "node" ? vertexParams(want, ignore) : lineParams(want, directed, ignore);
    const back = new Map<string, StyleValue>();
    const label = target === "node" ? want("label") : null;
    if (typeof label === "string") {
        params.set(LABEL_COLUMN, pajekLabelText(label));
    }
    // what the writer restates so that nothing is carried to this element (`restateCarried`)
    if (target === "node" && [...params.keys()].every((key) => key === LABEL_COLUMN)) {
        params.set(SHAPE_COLUMN, "ellipse");
    }
    for (const key of target === "edge" ? CARRIED.edge : []) {
        if (!params.has(key)) {
            params.set(key, lineRestated(key, directed));
        }
    }
    const get: Param = (key) => params.get(key) ?? null;
    const put: Put = (property, value) => {
        if (value !== null) {
            back.set(property, value);
        }
    };
    const at: At = (property) => ({ notes, target, property });
    if (target === "node") {
        readVertex(get, put, at);
    } else {
        readLine(get, put, at, directed);
    }
    return back;
}

/** A Pajek export with styles worked out. */
interface PajekStyledExport {
    /** The graph to write: the shape keyword and parameters written from the styles. */
    readonly snapshot: GraphSnapshot;
    /** The comment line carrying the `graphty.styles` block, without its line end. */
    readonly comment: string;
    /** W_STYLE_APPROXIMATED for every value written as the nearest one Pajek has. */
    readonly notes: readonly LossNote[];
}

/**
 * Works out a Pajek export with styles: every vertex's shape keyword and drawing parameters and every line's `c`, `w`
 * and `p` from what graphty draws, in place of every such parameter it had, and the `graphty.styles` block, with the
 * per-element values its rules read inside it, as a comment line.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles, or undefined when none are written
 * @returns the styled export, or null without styles
 */
export function pajekStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
): PajekStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const approximated = new StyleApproximations();
    const out = snapshot.withColumns();
    const directed = directedEdges(snapshot);
    for (const target of ["node", "edge"] as const) {
        const table = target === "node" ? out.nodes : out.edges;
        const approximate: Approximate = (property, value) => {
            approximated.add(target, property, value);
        };
        const get = elementValues((t, p) => input.picture(t, p as never), target, PAJEK_STYLE_CAPABILITIES[target]);
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const params = (i: number): Map<string, Written> =>
            target === "node" ? vertexParams(get(i), approximate) : lineParams(get(i), directed[i], approximate);
        const columns = paramColumns(n, params);
        restateCarried(target, columns, directed);
        replaceParamColumns(table, target === "node" ? [SHAPE_COLUMN, ...NODE_KEYS] : EDGE_KEYS, columns);
    }
    out.nodes.set(
        LABEL_COLUMN,
        drawnLabels(input, snapshot.nodeCount, approximated),
        { dtype: "string", role: "label" },
        {
            replaceRole: true,
        },
    );
    const notes = approximated.notes("Pajek");
    const block = writeStyleBlock(input.rules, { inlineColumns: true, snapshot });
    notes.push(...styleBlockLosses(block, input.rules.styles.rules.length, "size"));
    return { snapshot: out, comment: PAJEK_STYLE_COMMENT + block, notes };
}

/**
 * Each vertex's label as graphty draws it; a vertex graphty draws without one gets an empty label, which Pajek draws
 * as nothing (with no label, Pajek writes and draws the vertex's id).
 * @param input - the styles
 * @param n - the vertex count
 * @param approximated - records approximations
 * @returns the labels
 */
function drawnLabels(input: ExporterStyleInput, n: number, approximated: StyleApproximations): string[] {
    const drawn = input.picture("node", "label");
    const out = new Array<string>(n).fill("");
    for (let i = 0; i < n; i++) {
        const v = drawn[i] ?? null;
        if (typeof v === "string") {
            out[i] = pajekLabelText(v);
            if (out[i] !== v) {
                approximated.add("node", "label", v);
            }
        }
    }
    return out;
}

/**
 * A label as Pajek can write it: a line break becomes a space and a double quote a single one, which Pajek's labels
 * cannot hold.
 * @param label - the label graphty draws
 * @returns the text written
 */
function pajekLabelText(label: string): string {
    return label.replaceAll(/\r\n|[\r\n]/g, " ").replaceAll('"', "'");
}

/**
 * Replaces every drawing parameter column of a table with the ones written from the styles.
 * @param table - the node or edge columns, changed in place
 * @param keys - every drawing parameter key of the target
 * @param columns - the written columns, by key
 */
function replaceParamColumns(
    table: ReturnType<GraphSnapshot["withColumns"]>["nodes"],
    keys: readonly string[],
    columns: Map<string, (Written | null)[]>,
): void {
    for (const key of keys) {
        if (table.has(key)) {
            table.remove(key);
        }
    }
    for (const [key, col] of columns) {
        const numeric = col.every((v) => v === null || typeof v === "number");
        table.set(key, col, { dtype: numeric ? "f64" : "string" });
    }
}

/**
 * Keeps Pajek from drawing an element with the parameters of the one before it (`CARRIED`): a line writes Pajek's own
 * default for each parameter another line writes and it leaves out, and a vertex that writes no parameter while
 * another does writes its shape, `ellipse`, which starts it again from Pajek's defaults.
 * @param target - nodes or edges
 * @param columns - the written columns, by key, changed in place
 * @param directed - for each line, whether it is an arc
 */
function restateCarried(
    target: StyleTarget,
    columns: Map<string, (Written | null)[]>,
    directed: readonly boolean[],
): void {
    if (target === "node") {
        const all = [...columns.values()];
        if (all.length === 0) {
            return;
        }
        const n = all[0].length;
        const shape = columns.get(SHAPE_COLUMN) ?? new Array<Written | null>(n).fill(null);
        for (let i = 0; i < n; i++) {
            if (all.every((col) => col[i] === null)) {
                shape[i] = "ellipse";
            }
        }
        columns.set(SHAPE_COLUMN, shape);
        return;
    }
    for (const key of CARRIED.edge) {
        const col = columns.get(key);
        if (col === undefined) {
            continue;
        }
        for (let i = 0; i < col.length; i++) {
            col[i] ??= lineRestated(key, directed[i]);
        }
    }
}

/**
 * What a line writes for a carried parameter it leaves at Pajek's default.
 * @param key - the parameter
 * @param directed - whether the line is an arc
 * @returns the value written
 */
function lineRestated(key: string, directed: boolean): Written {
    const defaults = lineDefaults(directed);
    switch (key) {
        case "c":
            return pajekColorText(String(defaults.color));
        case "w":
            return directed ? Number(defaults.width) : Number(defaults.width) / EDGE_WIDTH_PER_W;
        case "p":
            return "Solid";
        default:
            return 0;
    }
}

/**
 * Every element's parameters, as columns.
 * @param n - the element count
 * @param params - an element's parameters
 * @returns the columns, by parameter key
 */
function paramColumns(n: number, params: (i: number) => Map<string, Written>): Map<string, (Written | null)[]> {
    const columns = new Map<string, (Written | null)[]>();
    for (let i = 0; i < n; i++) {
        for (const [key, value] of params(i)) {
            let col = columns.get(key);
            if (col === undefined) {
                col = new Array<Written | null>(n).fill(null);
                columns.set(key, col);
            }
            col[i] = value;
        }
    }
    return columns;
}
