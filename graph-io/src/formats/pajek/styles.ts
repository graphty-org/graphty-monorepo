/**
 * Pajek styles: each vertex's shape keyword and drawing parameters (`ic`, `bc`, `bw`, `x_fact`, `y_fact`, `lc`, `fos`)
 * and each line's `c`, `w` and `p`, read the way Pajek draws them, with Pajek's stated defaults beneath (an ellipse,
 * black solid lines, an arrow at the target of every arc). Colors are Pajek's: the dvips names, `GrayNN`,
 * `RGBrrggbb`, `RGB(r,g,b)` and the CMYK forms. Lengths are in PostScript points, the unit of Pajek's EPS and SVG
 * export, where the drawing's [0,1] square is [0,500] (`PAJEK_POINTS_PER_UNIT`): a vertex is Pajek's normal size 5
 * times its `s_size`, `x_fact` and `y_fact`, and `bw`, `w` and `fos` are points as written.
 *
 * Writing: the same parameters from what graphty draws, leaving out what Pajek draws by default; a color that is a
 * dvips name is written by name, any other as `RGBrrggbb`, so colors are exact. The `graphty.styles` block, with the
 * per-element values its rules read inside it (Pajek has no other place for them), is one comment line,
 * `% graphty.styles <json>`, which Pajek skips and graph-io reads back.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { DVIPS_COLORS } from "../../styles/canon/color-tables.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber } from "../../styles/canon/number.js";
import type { CanonSite } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
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
import { LABEL_COLUMN, PAJEK_STYLE_COMMENT, SHAPE_COLUMN } from "./syntax.js";

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
 * Assumed, not measured: 5 is the size the reference scene (`test/fidelity/references/pajek_file.py`, BASE) and graph-io
 * have always used, and it puts Pajek's default `bw 1` at a fifth of a vertex; confirm it in Pajek's Export Options
 * ("EPS, SVG, X3D, VRML Size of Vertices") when Pajek can be run.
 */
export const PAJEK_VERTEX_SIZE = 5;

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
];

/** The line parameters read as styles. */
const EDGE_KEYS: readonly string[] = ["c", "w", "p", "l", "lc", "fos", "font"];

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
    ],
    edge: ["color", "opacity", "width", "lineStyle", "label", "labelColor", "labelSize", "labelFont"],
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

/** The label positions by Pajek's label angle `lphi`, from 0 degrees (to the right) counterclockwise by 45. */
const LABEL_ANGLES = [
    "right",
    "top-right",
    "top",
    "top-left",
    "left",
    "bottom-left",
    "bottom",
    "bottom-right",
] as const;

/**
 * A vertex's label position from Pajek's polar label parameters (manual p. 90): `lr` is the distance of the label from
 * the vertex center, 0 centering it, and `lphi` its angle in degrees, read as the nearest of the eight neutral sides.
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
        const step = Math.round((((angle % 360) + 360) % 360) / 45) % 8;
        put("labelPosition", LABEL_ANGLES[step]);
    }
}

/**
 * The label angle Pajek uses when a vertex sets a radius but no angle: 0, to the right. Assumed, as the tool default
 * label position "right" is (`styles/defaults.ts`): the manual names the parameter (p. 90) but not its default.
 */
const PAJEK_LABEL_ANGLE = 0;

/**
 * One line's style: its color, width and pattern.
 * @param get - the line's parameters
 * @param put - receives the values
 * @param at - the sites
 */
function readLine(get: Param, put: Put, at: At): void {
    readColor(get("c"), "color", "opacity", put, at);
    readNumber(get("w"), "width", put, at);
    const p = get("p");
    if (p !== null) {
        put("lineStyle", canonEnum("lineStyle", p, "dvips", at("lineStyle")));
    }
    readText(get("l"), "label", put, at);
    readColor(get("lc"), "labelColor", null, put, at);
    readNumber(get("fos"), "labelSize", put, at);
    readText(get("font"), "labelFont", put, at);
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
 * The styles of a Pajek file, read the way Pajek draws them, with Pajek's stated defaults beneath: a labeled ellipse
 * with a black border, black solid lines, and an arrow at the target of every arc. A file graphty wrote gives back its `graphty.styles` block.
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
        for (let i = 0; i < n; i++) {
            context.budget.spend(target, 1);
            const at: At = (property) => ({ notes, target, property, element: i, budget: context.budget });
            (target === "node" ? readVertex : readLine)(
                cells(table, i),
                (property, value) => {
                    out.put(i, property, value);
                },
                at,
            );
        }
        return out.values;
    };
    const node = read("node");
    const edge = read("edge");
    const block = typeof context.kept === "string" ? context.kept : null;
    if (block !== null) {
        exactFromBlock(snapshot, block, { node, edge });
    }
    // Pajek's default that is a rule: an arc has an arrow at its target, an edge none
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
    if (typeof bw === "number" && bw !== 1) {
        out.set("bw", bw);
    }
    const font = get("labelFont");
    if (typeof font === "string" && font !== "") {
        out.set("font", font);
    }
    labelPositionParams(get, out);
    return out;
}

/**
 * A label position as Pajek's polar label parameters, leaving out the default (to the right): the center is `lr 0`,
 * a side its angle `lphi`.
 * @param get - the vertex's values
 * @param out - the parameters, changed in place
 */
function labelPositionParams(get: Get, out: Map<string, Written>): void {
    const position = get("labelPosition");
    if (position === "center") {
        out.set("lr", 0);
        return;
    }
    const step = LABEL_ANGLES.indexOf(position as (typeof LABEL_ANGLES)[number]);
    if (step > 0) {
        out.set("lphi", step * 45);
    }
}

/**
 * A line's parameters from its values, leaving out Pajek's black solid line. Arrows are Pajek's own: an arc has one
 * at its target and an edge none, so any other arrow is noted.
 * @param get - the line's values
 * @param directed - whether the line is an arc
 * @param approximate - records approximations
 * @returns the parameters
 */
function lineParams(get: Get, directed: boolean, approximate: Approximate): Map<string, Written> {
    const out = new Map<string, Written>();
    opaque(get, ["opacity"], approximate);
    const color = get("color");
    if (typeof color === "string" && color !== "#000000") {
        out.set("c", pajekColorText(color));
    }
    const width = get("width");
    if (typeof width === "number" && width !== pajekDefault("edge", "width")) {
        out.set("w", width);
    }
    const lineStyle = get("lineStyle");
    if (typeof lineStyle === "string" && lineStyle !== "solid" && pajekDots(lineStyle, approximate)) {
        out.set("p", "Dots");
    }
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
    (target === "node" ? readVertex : readLine)(
        (key) => params.get(key) ?? null,
        (property, value) => {
            if (value !== null) {
                back.set(property, value);
            }
        },
        (property) => ({ notes, target, property }),
    );
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
        replaceParamColumns(
            table,
            target === "node" ? [SHAPE_COLUMN, ...NODE_KEYS] : EDGE_KEYS,
            paramColumns(n, params),
        );
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
