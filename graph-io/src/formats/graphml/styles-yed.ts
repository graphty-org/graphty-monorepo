/**
 * yEd styles (yFiles for Java 2.x GraphML): reading every realizer a yEd graphics tree holds (`y:ShapeNode`,
 * `y:GenericNode`, `y:GroupNode`, `y:SVGNode`, `y:PolyLineEdge`, `y:BezierEdge`, ...) into the neutral style
 * vocabulary, and writing a graph's styles back as `y:ShapeNode` and `y:PolyLineEdge` graphics. The trees are the
 * json columns the GraphML importer keeps (tree.ts), never the typed `yfiles.*` columns read from them.
 *
 * The tree helpers here are shared with the yFiles 3 reader.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import type { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type { StyleTarget, StyleValue, StyleWorkBudget, StyleWriteCapabilities } from "../../styles/types.js";
import type { LossNote } from "../../types.js";

// ============================================================ the kept trees

/** A tree object as tree.ts builds it: `@_<name>` attributes, `#text`, and child elements by name. */
type Tree = Record<string, unknown>;

/**
 * Whether a value is a tree object.
 * @param value - the value
 * @returns true for a non-array object
 */
export function isTree(value: unknown): value is Tree {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The local part of an element name: `y:ShapeNode` is `ShapeNode`, whatever the prefix.
 * @param name - the name as written
 * @returns the local name
 */
export function localOf(name: string): string {
    const colon = name.indexOf(":");
    return colon < 0 ? name : name.slice(colon + 1);
}

/**
 * The child elements of a tree node with a local name, in file order.
 * @param node - the tree node
 * @param local - the local name
 * @returns the children
 */
export function treeChildren(node: unknown, local: string): unknown[] {
    const out: unknown[] = [];
    if (!isTree(node)) {
        return out;
    }
    for (const key of Object.keys(node)) {
        if (key.startsWith("@_") || key === "#text" || localOf(key) !== local) {
            continue;
        }
        const value = node[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                out.push(item);
            }
        } else {
            out.push(value);
        }
    }
    return out;
}

/**
 * The first child element of a tree node with a local name.
 * @param node - the tree node
 * @param local - the local name
 * @returns the child, or undefined
 */
export function treeChild(node: unknown, local: string): unknown {
    if (!isTree(node)) {
        return undefined;
    }
    for (const key of Object.keys(node)) {
        if (!key.startsWith("@_") && key !== "#text" && localOf(key) === local) {
            const value = node[key];
            return Array.isArray(value) ? value[0] : value;
        }
    }
    return undefined;
}

/**
 * An attribute of a tree node.
 * @param node - the tree node
 * @param name - the attribute name as written
 * @returns its text, or undefined
 */
export function treeAttr(node: unknown, name: string): string | undefined {
    if (!isTree(node) || !Object.hasOwn(node, `@_${name}`)) {
        return undefined;
    }
    const value = node[`@_${name}`];
    return typeof value === "string" ? value : undefined;
}

/**
 * The text of an element: the element itself when it has neither attributes nor children, else its `#text`.
 * @param node - the tree node
 * @returns the text, or null
 */
export function treeText(node: unknown): string | null {
    if (typeof node === "string") {
        return node;
    }
    if (isTree(node) && Object.hasOwn(node, "#text")) {
        const text = node["#text"];
        return typeof text === "string" ? text : null;
    }
    return null;
}

/**
 * The json columns of a table holding yFiles trees.
 * @param table - the node, edge or graph table
 * @returns their names
 */
function treeColumns(table: GraphSnapshot["nodes"]): string[] {
    const out: string[] = [];
    for (const col of table) {
        if (col.dtype === "json" && col.meta.origin?.namespace === "yfiles") {
            out.push(col.meta.name);
        }
    }
    return out;
}

/**
 * Every column of a table the GraphML importer made from yFiles keys: the trees and the typed `yfiles.*` columns
 * read from them. They hold the styles themselves, so the planner never explains a style with them.
 * @param table - the node or edge table
 * @returns their names
 */
export function yfilesColumns(table: GraphSnapshot["nodes"]): string[] {
    const out: string[] = [];
    for (const col of table) {
        if (col.meta.origin?.namespace === "yfiles") {
            out.push(col.meta.name);
        }
    }
    return out;
}

// ============================================================ reading

/** One element's canonical value of a property; null leaves it unset. */
export type PutValue = (property: string, value: StyleValue | null) => void;

/** Where a value of an element was read, by property. */
export type SiteOf = (property: string) => CanonSite;

/** The yEd node realizers, by local name. */
const NODE_REALIZERS: ReadonlySet<string> = new Set([
    "ShapeNode",
    "GenericNode",
    "GroupNode",
    "GenericGroupNode",
    "SVGNode",
    "ImageNode",
    "TableNode",
    "UMLClassNode",
    "UMLNoteNode",
    "ProxyAutoBoundsNode",
]);

/** The yEd edge realizers, by local name. */
const EDGE_REALIZERS: ReadonlySet<string> = new Set([
    "PolyLineEdge",
    "ArcEdge",
    "BezierEdge",
    "QuadCurveEdge",
    "SplineEdge",
    "GenericEdge",
]);

/** A realizer: its local name and its element. */
interface Realizer {
    readonly type: string;
    readonly r: unknown;
}

/**
 * The realizer a graphics tree holds; a `y:ProxyAutoBoundsNode` (a folder or group) gives its active realizer.
 * @param tree - the `<data>` content
 * @param names - the realizer names of the target
 * @returns the realizer, or null
 */
function realizerOf(tree: unknown, names: ReadonlySet<string>): Realizer | null {
    if (!isTree(tree)) {
        return null;
    }
    for (const key of Object.keys(tree)) {
        const type = localOf(key);
        if (key.startsWith("@_") || !names.has(type)) {
            continue;
        }
        const value = tree[key];
        const r = Array.isArray(value) ? value[0] : value;
        return type === "ProxyAutoBoundsNode" ? activeRealizer(r) : { type, r };
    }
    return null;
}

/**
 * The active realizer of a `y:ProxyAutoBoundsNode`, else its first.
 * @param proxy - the proxy element
 * @returns the realizer, or null when it has none
 */
function activeRealizer(proxy: unknown): Realizer | null {
    const realizers = treeChild(proxy, "Realizers");
    const all: Realizer[] = [];
    if (isTree(realizers)) {
        for (const k of Object.keys(realizers).filter((key) => !key.startsWith("@_") && key !== "#text")) {
            for (const item of treeChildren(realizers, localOf(k))) {
                all.push({ type: localOf(k), r: item });
            }
        }
    }
    const active = Number(treeAttr(realizers, "active") ?? "0");
    return all[Number.isInteger(active) && active >= 0 && active < all.length ? active : 0] ?? null;
}

/** GenericNode configurations, by a word they contain, to the shape they draw; the first match wins. */
const GENERIC_SHAPES: readonly (readonly [string, string])[] = [
    ["ellipse", "ellipse"],
    ["circle", "ellipse"],
    ["oval", "ellipse"],
    ["diamond", "diamond"],
    ["decision", "diamond"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["triangle", "triangle"],
    ["rect", "rectangle"],
    ["process", "rectangle"],
    ["box", "rectangle"],
];

/** yEd's label positions (`modelPosition` of the internal, sides and eight-position models). */
const YED_POSITIONS: ReadonlyMap<string, string> = new Map([
    ["c", "center"],
    ["t", "top"],
    ["b", "bottom"],
    ["l", "left"],
    ["r", "right"],
    ["tl", "top-left"],
    ["tr", "top-right"],
    ["bl", "bottom-left"],
    ["br", "bottom-right"],
    ["n", "top"],
    ["s", "bottom"],
    ["e", "right"],
    ["w", "left"],
    ["nw", "top-left"],
    ["ne", "top-right"],
    ["sw", "bottom-left"],
    ["se", "bottom-right"],
]);

/** yEd's font styles, as label weight and italic. */
export const FONT_STYLES: ReadonlyMap<string, readonly [string, boolean]> = new Map([
    ["plain", ["normal", false]],
    ["bold", ["bold", false]],
    ["italic", ["normal", true]],
    ["bolditalic", ["bold", true]],
]);

/**
 * Reads a color into a property and its alpha into the property's opacity (or notes the alpha dropped).
 * @param raw - the attribute
 * @param property - the color property
 * @param opacity - its opacity property, or null when it has none
 * @param put - receives the values
 * @param at - the sites
 */
function readColor(raw: unknown, property: string, opacity: string | null, put: PutValue, at: SiteOf): void {
    const c = canonColor(raw, "yed", at(property));
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
 * Reads an element's label: the first visible label with text (yEd icon nodes put an empty, `hasText="false"`
 * label first); further visible labels are noted for the element.
 * @param labels - the label elements, in file order
 * @param node - whether they are node labels (which have a position)
 * @param put - receives the values
 * @param at - the sites
 */
function readLabels(labels: readonly unknown[], node: boolean, put: PutValue, at: SiteOf): void {
    let label: unknown = undefined;
    let text = "";
    let extra = 0;
    for (const l of labels) {
        const t = treeText(l)?.trim() ?? "";
        if (t.length === 0 || treeAttr(l, "visible") === "false" || treeAttr(l, "hasText") === "false") {
            continue;
        }
        if (label === undefined) {
            label = l;
            text = t;
        } else {
            extra++;
        }
    }
    if (label === undefined) {
        return;
    }
    if (extra > 0) {
        noteAt(at("label"), STYLE_ISSUE.EXTRA_LABELS, `${String(extra + 1)} labels`);
    }
    put("label", canonText(text, at("label")));
    readLabelLook(label, node, put, at);
}

/**
 * Reads a label's look: its color, font and, for a node label, its position.
 * @param label - the label element
 * @param node - whether it is a node label
 * @param put - receives the values
 * @param at - the sites
 */
function readLabelLook(label: unknown, node: boolean, put: PutValue, at: SiteOf): void {
    readColor(treeAttr(label, "textColor"), "labelColor", null, put, at);
    put("labelSize", canonNumber(treeAttr(label, "fontSize"), at("labelSize")));
    put("labelFont", canonText(treeAttr(label, "fontFamily"), at("labelFont")));
    const style = treeAttr(label, "fontStyle");
    if (style !== undefined) {
        const known = FONT_STYLES.get(style.trim().toLowerCase());
        if (known === undefined) {
            noteAt(at("labelWeight"), STYLE_ISSUE.UNKNOWN_VALUE, style.slice(0, MAX_STYLE_VALUE_LENGTH));
        } else {
            put("labelWeight", known[0]);
            put("labelItalic", known[1]);
        }
    }
    const position = node ? treeAttr(label, "modelPosition") : undefined;
    if (position !== undefined) {
        const known = YED_POSITIONS.get(position.trim().toLowerCase());
        if (known === undefined) {
            noteAt(at("labelPosition"), STYLE_ISSUE.UNKNOWN_VALUE, position.slice(0, MAX_STYLE_VALUE_LENGTH));
        }
        put("labelPosition", known ?? null);
    }
}

/**
 * The shape of a node realizer: its `y:Shape` where it has one, a GenericNode's configuration, or the realizer
 * type itself for one that draws an image (SVG, image, table, UML).
 * @param real - the realizer
 * @param at - the sites
 * @returns the shape, or null
 */
function realizerShape(real: Realizer, at: SiteOf): string | null {
    const shape = treeChild(real.r, "Shape");
    if (shape !== undefined) {
        return canonEnum("shape", treeAttr(shape, "type"), "yed", at("shape"));
    }
    if (real.type === "ShapeNode" || real.type === "GroupNode" || real.type === "GenericGroupNode") {
        return null;
    }
    if (real.type === "GenericNode") {
        const conf = treeAttr(real.r, "configuration") ?? "";
        const lower = conf.slice(0, MAX_STYLE_VALUE_LENGTH).toLowerCase();
        for (const [word, value] of GENERIC_SHAPES) {
            if (lower.includes(word)) {
                return value;
            }
        }
        if (lower.length === 0) {
            return null;
        }
        noteAt(at("shape"), STYLE_ISSUE.UNKNOWN_VALUE, lower);
        return `other:${lower}`;
    }
    noteAt(at("shape"), STYLE_ISSUE.UNKNOWN_VALUE, real.type);
    return `other:${real.type}`;
}

/**
 * Reads one node realizer.
 * @param real - the realizer
 * @param put - receives the values
 * @param at - the sites
 */
function readNode(real: Realizer, put: PutValue, at: SiteOf): void {
    const { r } = real;
    const fill = treeChild(r, "Fill");
    if (fill !== undefined) {
        if (treeAttr(fill, "hasColor") === "false" || treeAttr(fill, "transparent") === "true") {
            noteAt(at("fill"), STYLE_ISSUE.NO_FILL, "transparent");
            put("fillOpacity", 0);
        } else {
            readColor(treeAttr(fill, "color"), "fill", "fillOpacity", put, at);
            const second = treeAttr(fill, "color2");
            if (second !== undefined) {
                noteAt(at("fill"), STYLE_ISSUE.GRADIENT, second);
            }
        }
    }
    const border = treeChild(r, "BorderStyle");
    if (border !== undefined) {
        if (treeAttr(border, "hasColor") === "false") {
            put("borderWidth", 0);
        } else {
            readColor(treeAttr(border, "color"), "borderColor", null, put, at);
            put("borderWidth", canonNumber(treeAttr(border, "width"), at("borderWidth")));
        }
        put("borderStyle", canonEnum("borderStyle", treeAttr(border, "type"), "yed", at("borderStyle")));
    }
    const geometry = treeChild(r, "Geometry");
    put("width", canonNumber(treeAttr(geometry, "width"), at("width")));
    put("height", canonNumber(treeAttr(geometry, "height"), at("height")));
    put("shape", realizerShape(real, at));
    readLabels(treeChildren(r, "NodeLabel"), true, put, at);
}

/**
 * Reads one edge realizer.
 * @param real - the realizer
 * @param put - receives the values
 * @param at - the sites
 */
function readEdge(real: Realizer, put: PutValue, at: SiteOf): void {
    const { r } = real;
    const line = treeChild(r, "LineStyle");
    if (line !== undefined) {
        readColor(treeAttr(line, "color"), "color", "opacity", put, at);
        put("width", canonNumber(treeAttr(line, "width"), at("width")));
        put("lineStyle", canonEnum("lineStyle", treeAttr(line, "type"), "yed", at("lineStyle")));
    }
    const arrows = treeChild(r, "Arrows");
    if (arrows !== undefined) {
        put("sourceArrow", canonEnum("arrow", treeAttr(arrows, "source"), "yed", at("sourceArrow")));
        put("targetArrow", canonEnum("arrow", treeAttr(arrows, "target"), "yed", at("targetArrow")));
    }
    // yEd curves an edge through its bends (y:Path's y:Point): with none, every type but an arc is drawn straight
    const bends = treeChildren(treeChild(r, "Path"), "Point").length > 0;
    if (real.type === "ArcEdge") {
        put("curved", true);
    } else if (real.type !== "PolyLineEdge") {
        put("curved", bends);
    } else {
        const smoothed = treeAttr(treeChild(r, "BendStyle"), "smoothed");
        put("curved", smoothed === undefined ? null : smoothed === "true" && bends);
    }
    readLabels(treeChildren(r, "EdgeLabel"), false, put, at);
}

/** Canonical values per property, by element index. */
export type ValueColumns = Record<string, (StyleValue | null)[]>;

/**
 * A collector of canonical values for one target.
 * @param n - the element count
 * @returns the values and a setter for element i
 */
export function valueColumns(n: number): {
    readonly values: ValueColumns;
    put(i: number, property: string, value: StyleValue | null): void;
} {
    const values: ValueColumns = Object.create(null) as ValueColumns;
    return {
        values,
        put(i, property, value) {
            if (value !== null) {
                values[property] ??= new Array<StyleValue | null>(n).fill(null);
                values[property][i] = value;
            }
        },
    };
}

/** What the yEd reader read. */
export interface YedRead {
    /** Node values. */
    readonly node: ValueColumns;
    /** Edge values. */
    readonly edge: ValueColumns;
}

/**
 * The yEd styles of a graph: each element's realizer read into canonical values.
 * @param snapshot - the graph
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @returns the values, or null when no element has a yEd realizer
 */
export function readYedStyles(snapshot: GraphSnapshot, notes: StyleNotes, budget: StyleWorkBudget): YedRead | null {
    let found = false;
    const read = (target: StyleTarget): ValueColumns => {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const names = target === "node" ? NODE_REALIZERS : EDGE_REALIZERS;
        const columns = treeColumns(table);
        const out = valueColumns(n);
        if (columns.length === 0) {
            return out.values;
        }
        for (let i = 0; i < n; i++) {
            budget.spend(target, columns.length);
            let real: Realizer | null = null;
            for (let c = 0; c < columns.length && real === null; c++) {
                real = realizerOf(plainCell(table.value(columns[c], i)), names);
            }
            if (real === null) {
                continue;
            }
            found = true;
            const at: SiteOf = (property) => ({ notes, target, property, element: i, budget });
            const put: PutValue = (property, value) => {
                out.put(i, property, value);
            };
            if (target === "node") {
                readNode(real, put, at);
            } else {
                readEdge(real, put, at);
            }
        }
        return out.values;
    };
    const node = read("node");
    const edge = read("edge");
    return found ? { node, edge } : null;
}

// ============================================================ writing

/**
 * What the GraphML writer holds natively: yEd `y:ShapeNode` and `y:PolyLineEdge` graphics. The `graphty.styles`
 * block is a graph `<data>` under its own key, and the per-element values its rules read are keys of their own.
 * @category Built-in formats
 */
export const GRAPHML_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
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
    block: "attributes",
});

/** A written value and whether it is the exact value. */
interface Written {
    readonly value: string;
    readonly exact: boolean;
}

/** yEd's ShapeNode types, by the neutral shape each draws exactly. */
export const YED_SHAPES: ReadonlyMap<string, string> = new Map([
    ["ellipse", "ellipse"],
    ["rectangle", "rectangle"],
    ["round-rectangle", "roundrectangle"],
    ["triangle", "triangle"],
    ["diamond", "diamond"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["parallelogram", "parallelogram"],
    ["trapezoid", "trapezoid"],
    ["star", "star5"],
]);

/** yEd's line types, by the neutral line style each draws exactly. */
export const YED_LINES: ReadonlyMap<string, string> = new Map([
    ["solid", "line"],
    ["dashed", "dashed"],
    ["dotted", "dotted"],
    ["dash-dot", "dashed_dotted"],
]);

/** yEd's arrows, by the neutral arrow each draws exactly. */
export const YED_ARROWS: ReadonlyMap<string, string> = new Map([
    ["none", "none"],
    ["triangle", "standard"],
    ["triangle-open", "white_delta"],
    ["vee", "concave"],
    ["tee", "t_shape"],
    ["diamond", "diamond"],
    ["diamond-open", "white_diamond"],
    ["circle", "circle"],
    ["circle-open", "white_circle"],
    ["square", "skewed_dash"],
    ["crow", "crows_foot_many"],
]);

/** yEd's label positions in the internal model, by neutral position. */
const YED_MODEL_POSITIONS: ReadonlyMap<string, string> = new Map([
    ["center", "c"],
    ["top", "t"],
    ["bottom", "b"],
    ["left", "l"],
    ["right", "r"],
    ["top-left", "tl"],
    ["top-right", "tr"],
    ["bottom-left", "bl"],
    ["bottom-right", "br"],
]);

/**
 * A value of a table, or the nearest value the table has.
 * @param table - neutral value to yEd value
 * @param value - the neutral value
 * @param nearest - the yEd value written when the table has none
 * @returns the written value
 */
export function yedValue(table: ReadonlyMap<string, string>, value: string, nearest: string): Written {
    const exact = table.get(value);
    if (exact !== undefined) {
        return { value: exact, exact: true };
    }
    // a value the reader kept as other:<raw> goes back as written
    return value.startsWith("other:") ? { value: value.slice(6), exact: true } : { value: nearest, exact: false };
}

/**
 * A color with an alpha from an opacity, as yEd writes it: `#RRGGBB`, or `#RRGGBBAA` with the alpha last.
 * @param color - the canonical color
 * @param opacity - the opacity, or null
 * @returns the text
 */
export function yedColor(color: string, opacity: StyleValue | null): string {
    const hex = color.toUpperCase();
    if (typeof opacity !== "number" || opacity >= 1) {
        return hex;
    }
    return (
        hex +
        Math.round(Math.max(0, opacity) * 255)
            .toString(16)
            .toUpperCase()
            .padStart(2, "0")
    );
}

/** Records a value written as the nearest one yEd has. */
type Approximate = (property: string, value: StyleValue) => void;

/**
 * A value in yEd's spelling, recorded as approximated when yEd has no exact one.
 * @param table - yEd's spellings
 * @param value - the neutral value
 * @param nearest - the spelling written when there is no exact one
 * @param property - the property, for the approximation note
 * @param approximate - records approximations
 * @returns the spelling
 */
export function yedSpelled(
    table: ReadonlyMap<string, string>,
    value: string,
    nearest: string,
    property: string,
    approximate: Approximate,
): string {
    const w = yedValue(table, value, nearest);
    if (!w.exact) {
        approximate(property, value);
    }
    return w.value;
}

/** One element's value of a property. */
type GetValue = (property: string) => StyleValue | null;

/**
 * The label attributes and text of one element.
 * @param get - the element's values
 * @param node - whether it is a node label (which has a position)
 * @param approximate - records approximations
 * @returns the label element, or null when the element has no label text
 */
function labelTree(get: GetValue, node: boolean, approximate: Approximate): Tree | null {
    const text = get("label");
    if (typeof text !== "string" || text.trim().length === 0) {
        return null;
    }
    const label: Tree = {};
    const font = get("labelFont");
    if (typeof font === "string") {
        label["@_fontFamily"] = font;
    }
    const size = get("labelSize");
    if (typeof size === "number") {
        label["@_fontSize"] = String(size);
    }
    const weight = get("labelWeight");
    const italic = get("labelItalic");
    if (weight !== null || italic !== null) {
        const style = (weight === "bold" ? "bold" : "") + (italic === true ? "italic" : "");
        label["@_fontStyle"] = style.length === 0 ? "plain" : style;
    }
    const color = get("labelColor");
    if (typeof color === "string") {
        label["@_textColor"] = color.toUpperCase();
    }
    const position = node ? get("labelPosition") : null;
    if (typeof position === "string") {
        const written = YED_MODEL_POSITIONS.get(position);
        if (written === undefined) {
            approximate("labelPosition", position);
        }
        label["@_modelName"] = "internal";
        label["@_modelPosition"] = written ?? "c";
    }
    label["#text"] = text;
    return label;
}

/**
 * A node's `y:ShapeNode` from its values.
 * @param get - the node's values
 * @param at - the node's position from the graphics it had, or null
 * @param approximate - records approximations
 * @returns the graphics tree
 */
function shapeNodeTree(get: GetValue, at: readonly [string, string] | null, approximate: Approximate): Tree {
    const node: Tree = {};
    node["y:Geometry"] = geometryTree(get, at);
    const fill = get("fill");
    const fillOpacity = get("fillOpacity");
    if (typeof fill === "string") {
        node["y:Fill"] = { "@_color": yedColor(fill, fillOpacity), "@_transparent": "false" };
    } else if (fillOpacity === 0) {
        node["y:Fill"] = { "@_hasColor": "false", "@_transparent": "false" };
    }
    const border = lineTree(get, ["borderColor", "borderWidth", "borderStyle"], approximate);
    if (border !== null) {
        node["y:BorderStyle"] = border;
    }
    const label = labelTree(get, true, approximate);
    if (label !== null) {
        node["y:NodeLabel"] = label;
    }
    const shape = get("shape");
    if (typeof shape === "string") {
        node["y:Shape"] = {
            "@_type": yedSpelled(YED_SHAPES, shape, shape === "vee" ? "triangle" : "rectangle", "shape", approximate),
        };
    }
    return { "y:ShapeNode": node };
}

/**
 * A node's `y:Geometry`: its size, and its position from the graphics it had.
 * @param get - the node's values
 * @param at - the node's position, or null
 * @returns the geometry
 */
function geometryTree(get: GetValue, at: readonly [string, string] | null): Tree {
    const geometry: Tree = {};
    const height = get("height");
    const width = get("width");
    if (typeof height === "number") {
        geometry["@_height"] = String(height);
    }
    if (typeof width === "number") {
        geometry["@_width"] = String(width);
    }
    if (at !== null) {
        geometry["@_x"] = at[0];
        geometry["@_y"] = at[1];
    }
    return geometry;
}

/**
 * A `y:BorderStyle` or `y:LineStyle`: a color, a width and a line type. A node's border color is written opaque; an
 * edge's color carries its opacity.
 * @param get - the element's values
 * @param properties - the color, width and style properties
 * @param approximate - records approximations
 * @param opacity - the opacity of the color, for an edge's line
 * @returns the element, or null when none of the three is set
 */
function lineTree(
    get: GetValue,
    properties: readonly [string, string, string],
    approximate: Approximate,
    opacity?: StyleValue | null,
): Tree | null {
    const [colorKey, widthKey, styleKey] = properties;
    const color = get(colorKey);
    const width = get(widthKey);
    const style = get(styleKey);
    if (color === null && width === null && style === null) {
        return null;
    }
    const line: Tree = {};
    if (typeof color === "string") {
        line["@_color"] = opacity === undefined ? color.toUpperCase() : yedColor(color, opacity);
    }
    if (typeof style === "string") {
        const nearest = styleKey === "lineStyle" && style === "long-dash" ? "dashed" : "line";
        line["@_type"] = yedSpelled(YED_LINES, style, nearest, styleKey, approximate);
    }
    if (typeof width === "number") {
        line["@_width"] = String(width);
    }
    return line;
}

/**
 * An edge's `y:PolyLineEdge` from its values.
 * @param get - the edge's values
 * @param path - the `y:Path` of the graphics it had, or undefined
 * @param approximate - records approximations
 * @returns the graphics tree
 */
function polyLineEdgeTree(get: GetValue, path: unknown, approximate: Approximate): Tree {
    const edge: Tree = {};
    if (path !== undefined) {
        edge["y:Path"] = path;
    }
    const line = lineTree(get, ["color", "width", "lineStyle"], approximate, get("opacity"));
    if (line !== null) {
        edge["y:LineStyle"] = line;
    }
    const source = get("sourceArrow");
    const target = get("targetArrow");
    if (source !== null || target !== null) {
        const arrow = (property: string, value: StyleValue | null): string =>
            typeof value === "string" ? yedSpelled(YED_ARROWS, value, "standard", property, approximate) : "none";
        edge["y:Arrows"] = { "@_source": arrow("sourceArrow", source), "@_target": arrow("targetArrow", target) };
    }
    const label = labelTree(get, false, approximate);
    if (label !== null) {
        edge["y:EdgeLabel"] = label;
    }
    const curved = get("curved");
    if (typeof curved === "boolean") {
        edge["y:BendStyle"] = { "@_smoothed": String(curved) };
    }
    return { "y:PolyLineEdge": edge };
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
): (i: number) => GetValue {
    const columns = new Map<string, readonly (StyleValue | null)[]>();
    for (const p of GRAPHML_STYLE_CAPABILITIES[target]) {
        columns.set(p, picture(target, p));
    }
    return (i) => (property) => columns.get(property)?.[i] ?? null;
}

/**
 * For a file graphty wrote: where a value read from the yEd graphics is what the writer writes for the block's own
 * value (a pentagon written as a hexagon, an opacity rounded to yEd's 255 steps), the block's exact value is the
 * truth, so a re-import gives back the same rules; a value another program changed since stays the truth.
 * @param read - the values the reader read, changed in place
 * @param picture - each element's value of a property under the block's rules
 * @param counts - the node and edge counts
 * @param counts.node - the node count
 * @param counts.edge - the edge count
 * @param notes - a scratch note list for reading back what the writer writes
 */
export function exactFromBlock(
    read: YedRead,
    picture: (target: StyleTarget, property: string) => readonly (StyleValue | null)[],
    counts: { readonly node: number; readonly edge: number },
    notes: StyleNotes,
): void {
    for (const target of ["node", "edge"] as const) {
        const values = read[target];
        const get = getter(picture, target);
        for (let i = 0; i < counts[target]; i++) {
            const want = get(i);
            const back = writtenAndReadBack(target, want, notes);
            if (back === null) {
                continue;
            }
            for (const property of GRAPHML_STYLE_CAPABILITIES[target]) {
                const native = values[property]?.[i] ?? null;
                const w = want(property);
                if (native !== w && native === (back.get(property) ?? null)) {
                    values[property] ??= new Array<StyleValue | null>(counts[target]).fill(null);
                    values[property][i] = w;
                }
            }
        }
    }
}

/**
 * An element's values written as the writer writes them and read back as the reader reads them.
 * @param target - nodes or edges
 * @param want - its values
 * @param notes - a scratch for the notes the round trip makes
 * @returns the values read back, by property, or null when the written graphics hold no realizer
 */
function writtenAndReadBack(target: StyleTarget, want: GetValue, notes: StyleNotes): Map<string, StyleValue> | null {
    const ignore: Approximate = () => undefined;
    const tree = target === "node" ? shapeNodeTree(want, null, ignore) : polyLineEdgeTree(want, undefined, ignore);
    const real = realizerOf(tree, target === "node" ? NODE_REALIZERS : EDGE_REALIZERS);
    if (real === null) {
        return null;
    }
    const back = new Map<string, StyleValue>();
    const at: SiteOf = (property) => ({ notes, target, property });
    const put: PutValue = (property, value) => {
        if (value !== null) {
            back.set(property, value);
        }
    };
    if (target === "node") {
        readNode(real, put, at);
    } else {
        readEdge(real, put, at);
    }
    return back;
}

/** A GraphML export with styles worked out. */
interface GraphmlStyledExport {
    /** The graph to write: the yFiles drawing columns replaced by yEd graphics written from the styles. */
    readonly snapshot: GraphSnapshot;
    /** W_STYLE_APPROXIMATED for every value written as the nearest one yEd has. */
    readonly notes: readonly LossNote[];
}

/** The yFiles key type of the written node and edge graphics. */
const GRAPHICS_TYPES: Readonly<Record<StyleTarget, string>> = { node: "nodegraphics", edge: "edgegraphics" };

/**
 * A node's position from the graphics it had: a yEd realizer's `y:Geometry` x and y, or a yFiles 3 `y:RectD`'s.
 * @param table - the node table
 * @param columns - its tree columns
 * @param i - the node
 * @returns the x and y as written, or null
 */
function keptPosition(table: GraphSnapshot["nodes"], columns: readonly string[], i: number): [string, string] | null {
    for (const name of columns) {
        const tree = plainCell(table.value(name, i));
        const real = realizerOf(tree, NODE_REALIZERS);
        const geometry = real === null ? treeChild(tree, "RectD") : treeChild(real.r, "Geometry");
        const x = treeAttr(geometry, real === null ? "X" : "x");
        const y = treeAttr(geometry, real === null ? "Y" : "y");
        if (x !== undefined && y !== undefined) {
            return [x, y];
        }
    }
    return null;
}

/**
 * An edge's `y:Path` (its bends) from the yEd graphics it had.
 * @param table - the edge table
 * @param columns - its tree columns
 * @param e - the edge
 * @returns the path, or undefined
 */
function keptPath(table: GraphSnapshot["edges"], columns: readonly string[], e: number): unknown {
    for (const name of columns) {
        const real = realizerOf(plainCell(table.value(name, e)), EDGE_REALIZERS);
        const path = real === null ? undefined : treeChild(real.r, "Path");
        if (path !== undefined) {
            return path;
        }
    }
    return undefined;
}

/**
 * A column name not yet taken in a table.
 * @param table - the table
 * @param base - the preferred name
 * @returns the name
 */
function freeName(table: GraphSnapshot["nodes"], base: string): string {
    let name = base;
    let k = 2;
    while (table.has(name)) {
        name = `${base}#${String(k)}`;
        k++;
    }
    return name;
}

/**
 * Works out a GraphML export with styles: every node and edge column made from yFiles keys (the graphics trees,
 * the typed `yfiles.*` columns and yFiles 3's drawing state) is replaced by yEd graphics written from what graphty
 * draws, keeping each node's position and each edge's bends from the graphics it had; graph data from yFiles 3
 * keys goes too, since its `y:` elements are not yEd's.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles, or undefined when none are written
 * @returns the styled export, or null without styles
 */
export function graphmlStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
): GraphmlStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const approximated = new StyleApproximations();
    const approximateFor =
        (target: StyleTarget): Approximate =>
        (property, value) => {
            approximated.add(target, property, value);
        };
    const picture = (target: StyleTarget, property: string): readonly (StyleValue | null)[] =>
        input.picture(target, property as never);
    const nodeColumns = treeColumns(snapshot.nodes);
    const edgeColumns = treeColumns(snapshot.edges);
    const getNode = getter(picture, "node");
    const getEdge = getter(picture, "edge");
    const nodeTrees: (Tree | null)[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        nodeTrees.push(shapeNodeTree(getNode(i), keptPosition(snapshot.nodes, nodeColumns, i), approximateFor("node")));
    }
    const edgeTrees: (Tree | null)[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        edgeTrees.push(polyLineEdgeTree(getEdge(e), keptPath(snapshot.edges, edgeColumns, e), approximateFor("edge")));
    }
    const out = snapshot.withColumns();
    for (const [table, trees, target] of [
        [out.nodes, nodeTrees, "node"],
        [out.edges, edgeTrees, "edge"],
    ] as const) {
        for (const name of yfilesColumns(table)) {
            table.remove(name);
        }
        const name = freeName(table, GRAPHICS_TYPES[target]);
        table.set(name, trees, {
            dtype: "json",
            nullable: true,
            origin: { format: "graphml", id: null, title: null, type: GRAPHICS_TYPES[target], namespace: "yfiles" },
        });
    }
    const yfiles3 = [...out.graph].filter(
        (col) => col.meta.origin?.namespace === "yfiles" && (col.meta.origin.type ?? "").includes("://"),
    );
    for (const col of yfiles3) {
        out.graph.remove(col.meta.name);
    }
    return { snapshot: out, notes: approximated.notes("yEd") };
}
