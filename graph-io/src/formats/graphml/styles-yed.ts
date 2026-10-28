/**
 * yEd styles (yFiles for Java 2.x GraphML): reading every realizer a yEd graphics tree holds (`y:ShapeNode`,
 * `y:GenericNode`, `y:GroupNode`, `y:SVGNode`, `y:PolyLineEdge`, `y:BezierEdge`, ...) into the neutral style
 * vocabulary, and writing a graph's styles back as `y:ShapeNode` and `y:PolyLineEdge` graphics. The trees are the
 * json columns the GraphML importer keeps (tree.ts), never the typed `yfiles.*` columns read from them.
 *
 * The tree helpers here are shared with the yFiles 3 reader.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { toFilePositions, toNeutral } from "../../positions/convert.js";
import type { PositionColumnExtra } from "../../positions/types.js";
import {
    type BendPoint,
    bendsToPoints,
    canonBends,
    canonNodeOffsets,
    flattenCubic,
    flattenQuadSpline,
    nodeOffsetsToPoints,
} from "../../styles/canon/bends.js";
import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber, canonSigned } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { JAVA_MONO, JAVA_SANS, JAVA_SERIF, javaFamily } from "../../styles/cytoscape/lexicon.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import { elementValues, takeFromBlock } from "../../styles/io/round-trip.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
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

/** A shape a yEd configuration draws: a neutral shape, with its corners where it is a `polygon`. */
export interface YedOutline {
    readonly shape: string;
    /** The polygon's corners as neutral `shapePoints` (`x,y` fractions of the half sizes, y up). */
    readonly points?: string;
}

/**
 * Points along an elliptical arc, as `x,y` text: center (cx, cy), radii (rx, ry), from angle `from` to `to` (radians,
 * counter-clockwise, y up), both ends included.
 * @param cx - center x
 * @param cy - center y
 * @param rx - x radius
 * @param ry - y radius
 * @param from - first angle
 * @param to - last angle
 * @param steps - segments
 * @returns the points
 */
function arcPoints(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 12): string[] {
    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = from + ((to - from) * i) / steps;
        return pointText(cx + rx * Math.cos(t), cy + ry * Math.sin(t));
    });
}

/**
 * Points along a wave y = y0 + amp * sin(pi * x), x from `x0` to `x1`.
 * @param y0 - the wave's middle
 * @param amp - its height
 * @param x0 - first x
 * @param x1 - last x
 * @returns the points
 */
function wavePoints(y0: number, amp: number, x0: number, x1: number): string[] {
    const steps = 16;
    return Array.from({ length: steps + 1 }, (_, i) => {
        const x = x0 + ((x1 - x0) * i) / steps;
        return pointText(x, y0 + amp * Math.sin(Math.PI * x));
    });
}

/**
 * One corner as `x,y`, rounded to three decimals.
 * @param x - x
 * @param y - y
 * @returns the text
 */
function pointText(x: number, y: number): string {
    const r = (v: number): string => String(Math.round(v * 1000) / 1000 + 0);
    return `${r(x)},${r(y)}`;
}

const HALF_PI = Math.PI / 2;

/** A cloud: a circle of bumps, stretched to the box. */
const CLOUD = Array.from({ length: 72 }, (_, i) => {
    const t = (2 * Math.PI * i) / 72;
    const r = 0.86 + 0.14 * Math.abs(Math.cos(4 * t));
    return pointText(r * Math.cos(t), r * Math.sin(t));
}).join(" ");

/** A stadium: a box whose ends are half circles (a pill). */
const STADIUM = [
    ...arcPoints(0.5, 0, 0.5, 1, -HALF_PI, HALF_PI),
    ...arcPoints(-0.5, 0, 0.5, 1, HALF_PI, 3 * HALF_PI),
].join(" ");

/**
 * The shape each configuration of yEd's GenericNode palettes draws (flowchart, entity relationship, BPMN, SBGN), by
 * its name after `com.yworks.` without a `.withShadow` suffix, lowercase. Matched whole, before the words below:
 * "data" is a parallelogram, but "storedData" and "directData" are not. A shape no neutral one names is the polygon
 * yEd draws it as (curves as short segments); the lines some draw inside (predefined process, internal storage) are
 * not drawn. Left out until a drawing by yEd itself shows them (ISSUES.md): the BPMN artifact, whose `type` property
 * picks among a data object, a data store, a message and others, and the SBGN nucleic acid feature and perturbing
 * agent, which draw.io, the stand-in, draws as plain boxes.
 */
const YED_CONFIGURATIONS: ReadonlyMap<string, YedOutline> = new Map<string, YedOutline>([
    ["flowchart.process", { shape: "rectangle" }],
    ["flowchart.predefinedprocess", { shape: "rectangle" }],
    ["flowchart.internalstorage", { shape: "rectangle" }],
    ["flowchart.decision", { shape: "diamond" }],
    ["flowchart.terminator", { shape: "round-rectangle" }],
    ["flowchart.start1", { shape: "ellipse" }],
    ["flowchart.start2", { shape: "ellipse" }],
    ["flowchart.onpagereference", { shape: "ellipse" }],
    ["flowchart.sequentialdata", { shape: "ellipse" }],
    ["flowchart.data", { shape: "parallelogram" }],
    ["flowchart.preparation", { shape: "hexagon" }],
    ["flowchart.database", { shape: "other:database" }],
    ["flowchart.looplimit", { shape: "polygon", points: "-1,-1 1,-1 1,0.5 0.8,1 -0.8,1 -1,0.5" }],
    ["flowchart.looplimitend", { shape: "polygon", points: "-1,1 -1,-0.5 -0.8,-1 0.8,-1 1,-0.5 1,1" }],
    ["flowchart.manualinput", { shape: "polygon", points: "-1,-1 1,-1 1,1 -1,0.4" }],
    ["flowchart.card", { shape: "polygon", points: "-1,-1 1,-1 1,1 -0.6,1 -1,0.6" }],
    ["flowchart.manualoperation", { shape: "polygon", points: "-1,1 -0.7,-1 0.7,-1 1,1" }],
    ["flowchart.offpagereference", { shape: "polygon", points: "-1,1 -1,0 0,-1 1,0 1,1" }],
    ["flowchart.usermessage", { shape: "polygon", points: "-1,1 -1,-1 0.6,-1 1,0 0.6,1" }],
    ["flowchart.networkmessage", { shape: "polygon", points: "-1,1 -0.6,0 -1,-1 1,-1 1,1" }],
    ["flowchart.document", { shape: "polygon", points: ["-1,1", ...wavePoints(-0.75, 0.2, -1, 1), "1,1"].join(" ") }],
    [
        "flowchart.papertype",
        {
            shape: "polygon",
            points: [...wavePoints(-0.8, 0.2, -1, 1), ...wavePoints(0.8, 0.2, 1, -1)].join(" "),
        },
    ],
    [
        "flowchart.delay",
        { shape: "polygon", points: ["-1,-1", ...arcPoints(0, 0, 1, 1, -HALF_PI, HALF_PI), "-1,1"].join(" ") },
    ],
    [
        "flowchart.display",
        {
            shape: "polygon",
            points: ["-1,0", "-0.6,-1", ...arcPoints(0.6, 0, 0.4, 1, -HALF_PI, HALF_PI), "-0.6,1"].join(" "),
        },
    ],
    [
        "flowchart.storeddata",
        {
            shape: "polygon",
            points: [
                ...arcPoints(1, 0, -0.2, 1, -HALF_PI, HALF_PI),
                ...arcPoints(-0.8, 0, 0.2, 1, HALF_PI, 3 * HALF_PI),
            ].join(" "),
        },
    ],
    [
        "flowchart.directdata",
        {
            shape: "polygon",
            points: [
                ...arcPoints(0.8, 0, 0.2, 1, -HALF_PI, HALF_PI),
                ...arcPoints(-0.8, 0, 0.2, 1, HALF_PI, 3 * HALF_PI),
            ].join(" "),
        },
    ],
    ["flowchart.cloud", { shape: "polygon", points: CLOUD }],
    ["entityrelationship.relationship", { shape: "diamond" }],
    ["entityrelationship.attribute", { shape: "ellipse" }],
    ["bpmn.conversation", { shape: "hexagon" }],
    ["sbgn.unspecifiedentity", { shape: "ellipse" }],
    ["sbgn.simplechemical", { shape: "ellipse" }],
    ["sbgn.emptyset", { shape: "ellipse" }],
    ["sbgn.operator", { shape: "ellipse" }],
    ["sbgn.macromolecule", { shape: "round-rectangle" }],
    ["sbgn.phenotype", { shape: "hexagon" }],
    ["sbgn.process", { shape: "rectangle" }],
    ["sbgn.submap", { shape: "rectangle" }],
    ["sbgn.unitofinformation", { shape: "rectangle" }],
    ["sbgn.statevariable", { shape: "polygon", points: STADIUM }],
    ["sbgn.tag", { shape: "polygon", points: "-1,1 -1,-1 0.6,-1 1,0 0.6,1" }],
]);

/**
 * The shape a yEd GenericNode configuration draws: a GraphML GenericNode's `configuration`, or a yEd GML node's
 * `customconfiguration`.
 * @param configuration - the configuration
 * @returns the shape, with its corners where it is a polygon, or null for a configuration not known here
 */
export function configurationOutline(configuration: string): YedOutline | null {
    const key = configuration
        .slice(0, MAX_STYLE_VALUE_LENGTH)
        .toLowerCase()
        .replace(/^com\.yworks\./, "")
        .replace(/\.withshadow$/, "");
    return YED_CONFIGURATIONS.get(key) ?? null;
}

/** GenericNode configurations, by a word they contain, to the shape they draw; the first match wins. */
const GENERIC_SHAPES: readonly (readonly [string, string])[] = [
    // yEd's BPMN and entity-relationship palettes: a task is a rounded box, an event a circle, a
    // gateway a diamond, an attribute an ellipse
    ["bpmn.activity", "round-rectangle"],
    ["bpmn.event", "ellipse"],
    ["bpmn.gateway", "diamond"],
    ["entityrelationship.attribute", "ellipse"],
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

/**
 * yEd's label positions (`modelPosition` of the internal, sides, sandwich, corners and eight-position models). The
 * internal model's `t` (inside the top of the box: a group's title) is `inside-top`; its other inside positions have
 * no neutral value and read as the nearest side or corner.
 */
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
 * @param geometry - a node label's node `y:Geometry`, which places the label inside or outside the node
 */
function readLabels(labels: readonly unknown[], node: boolean, put: PutValue, at: SiteOf, geometry?: unknown): void {
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
    readLabelLook(label, node, put, at, geometry);
}

/**
 * Reads a label's look: its color, background box and its border, font and, for a node label, its position.
 * @param label - the label element
 * @param node - whether it is a node label
 * @param put - receives the values
 * @param at - the sites
 * @param geometry - a node label's node `y:Geometry`
 */
function readLabelLook(label: unknown, node: boolean, put: PutValue, at: SiteOf, geometry?: unknown): void {
    readColor(treeAttr(label, "textColor"), "labelColor", null, put, at);
    // yEd draws a box behind the words in `backgroundColor` unless `hasBackgroundColor` is false
    if (treeAttr(label, "hasBackgroundColor") !== "false") {
        readColor(treeAttr(label, "backgroundColor"), "labelBackground", null, put, at);
    }
    // and a one-pixel line round that box in `lineColor` unless `hasLineColor` is false
    if (treeAttr(label, "hasLineColor") !== "false" && treeAttr(label, "lineColor") !== undefined) {
        readColor(treeAttr(label, "lineColor"), "labelBorderColor", null, put, at);
        put("labelBorderWidth", 1);
    }
    put("labelSize", canonNumber(treeAttr(label, "fontSize"), at("labelSize")));
    // yEd is a Java program: its logical fonts (Dialog, SansSerif, Monospaced, ...) are drawn in the faces Java gives
    // them, and a font it does not have in Dialog's
    const font = canonText(treeAttr(label, "fontFamily"), at("labelFont"));
    put("labelFont", font === null ? null : javaFamily(font));
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
    readRotation(label, put, at);
    if (node) {
        const position = nodeLabelPosition(label, geometry, at);
        put("labelPosition", position);
        readInsideInset(label, geometry, position, put);
        readOutsideOffset(label, geometry, position, put);
    }
}

/**
 * Reads a label's `rotationAngle`: yEd is a Java2D program, whose angles turn clockwise on screen (y down), as the
 * neutral `labelRotation` does.
 * @param label - the label element
 * @param put - receives the values
 * @param at - the sites
 */
function readRotation(label: unknown, put: PutValue, at: SiteOf): void {
    const angle = canonSigned(treeAttr(label, "rotationAngle"), at("labelRotation"));
    if (angle === null) {
        return;
    }
    const turn = ((angle % 360) + 360) % 360;
    put("labelRotation", turn === 0 ? null : turn);
}

/**
 * How far from where its position puts it a label outside its node, or placed freely, is drawn: yEd writes every
 * label's box as it draws it, so an outside label keeps its model's distance from the node (4 by default) and a
 * free label its offset. Across the side it is beside, the label is moved by the gap between the node and its box;
 * along that side (and on both axes for a free label over the node), by how far its box's middle is from the node's.
 * A turned label's box is not its words' box, so it is left where its position puts it.
 * @param label - the label element
 * @param geometry - the node's `y:Geometry`
 * @param position - where the label is placed
 * @param put - receives the values
 */
function readOutsideOffset(label: unknown, geometry: unknown, position: string | null, put: PutValue): void {
    const model = treeAttr(label, "modelName");
    const free = position === "center" && model !== undefined && model !== "internal";
    if (position === null || position.startsWith("inside-") || (position === "center" && !free)) {
        return;
    }
    if (Number(treeAttr(label, "rotationAngle") ?? 0) % 360 !== 0) {
        return;
    }
    const num = (o: unknown, k: string): number => Number(treeAttr(o, k) ?? Number.NaN);
    const [x, y, w, h] = ["x", "y", "width", "height"].map((k) => num(label, k));
    const [nw, nh] = [num(geometry, "width"), num(geometry, "height")];
    if (![x, y, w, h, nw, nh].every(Number.isFinite)) {
        return;
    }
    const signed = (value: number): number | null => {
        const r = Math.round(value * 1000) / 1000;
        return r === 0 ? null : r;
    };
    // across a side: the gap between the node and the box; along it: the box's middle against the node's
    const offset = (lo: number, size: number, extent: number, before: boolean, after: boolean): number | null => {
        if (before) {
            return signed(lo + size);
        }
        return after ? signed(lo - extent) : signed(lo + size / 2 - extent / 2);
    };
    put("labelOffsetX", offset(x, w, nw, position.includes("left"), position.includes("right")));
    put("labelOffsetY", offset(y, h, nh, position.includes("top"), position.includes("bottom")));
}

/**
 * How far in from the sides it is drawn against yEd puts a label inside its node (its internal model's insets, 4 by
 * default), from the label's stored box, for a label sized to its words: the label is moved that far right of a left side, left of a right side, down
 * from the top and up from the bottom.
 * @param label - the label element
 * @param geometry - the node's `y:Geometry`
 * @param position - where the label is placed
 * @param put - receives the values
 */
function readInsideInset(label: unknown, geometry: unknown, position: string | null, put: PutValue): void {
    // a label sized to its node (a group's header band) has a box that is not its words'
    const sized = treeAttr(label, "autoSizePolicy")?.startsWith("node_") === true;
    if (position?.startsWith("inside-") !== true || sized) {
        return;
    }
    const num = (o: unknown, k: string): number => Number(treeAttr(o, k) ?? Number.NaN);
    const [x, y, w, h] = ["x", "y", "width", "height"].map((k) => num(label, k));
    const [nw, nh] = [num(geometry, "width"), num(geometry, "height")];
    const inset = (value: number): number | null =>
        Number.isFinite(value) && value > 0 ? Math.round(value * 1000) / 1000 : null;
    if (position.includes("left")) {
        put("labelOffsetX", inset(x));
    } else if (position.includes("right")) {
        const gap = inset(nw - x - w);
        put("labelOffsetX", gap === null ? null : -gap);
    }
    if (position.includes("top")) {
        put("labelOffsetY", inset(y));
    } else if (position.includes("bottom")) {
        const gap = inset(nh - y - h);
        put("labelOffsetY", gap === null ? null : -gap);
    }
}

/**
 * Where yEd draws a node label: from the label's box, which every model yEd writes stores relative to the node's
 * top-left corner (a label entirely beside the node is outside it on that side), else from its model. A label inside
 * the node is placed by its model: yEd's `internal` model puts it against a side or in a corner (`t`, `bl`, ...), or
 * in the middle (`c`); any other model's label inside the node is in its middle.
 * @param label - the label element
 * @param geometry - the node's `y:Geometry`
 * @param at - the sites
 * @returns the position, or null
 */
function nodeLabelPosition(label: unknown, geometry: unknown, at: SiteOf): string | null {
    const outside = boxPosition(label, geometry);
    if (outside !== null && outside !== "center") {
        return outside;
    }
    const position = treeAttr(label, "modelPosition");
    const model = treeAttr(label, "modelName");
    if (model === "internal") {
        return insidePosition(label, position);
    }
    if (model === "custom") {
        return customPosition(label, outside, at);
    }
    if (outside !== null || position === undefined) {
        return outside;
    }
    const known = YED_POSITIONS.get(position.trim().toLowerCase());
    if (known === undefined) {
        noteAt(at("labelPosition"), STYLE_ISSUE.UNKNOWN_VALUE, position.slice(0, MAX_STYLE_VALUE_LENGTH));
    }
    return known ?? null;
}

/**
 * Where a SmartNodeLabelModel (`custom`) label is drawn: where its stored box puts it, as for any other model, and
 * where its ratios put it when the file stores no box (a label hung from the node's top edge into it is a header
 * along its top). A box beside the node is handled before this.
 * @param label - the label element
 * @param outside - the box's position against the node, `center` or null
 * @param at - the sites
 * @returns the position, or null
 */
function customPosition(label: unknown, outside: string | null, at: SiteOf): string | null {
    const smart = treeChild(treeChild(label, "ModelParameter"), "SmartNodeLabelModelParameter");
    if (smart === undefined) {
        noteAt(at("labelPosition"), STYLE_ISSUE.UNKNOWN_VALUE, "custom");
        return outside;
    }
    // the stored box is where yEd drew the label; the ratios place it only when the file stores no box
    return outside ?? smartPosition(smart);
}

/**
 * The nearest neutral position of a SmartNodeLabelModel placement. yEd puts the point `labelRatio` of the label
 * (-0.5..0.5 of its size from its center) on the point `nodeRatio` of the node; the offsets are ignored. On each axis
 * a node ratio below or above zero is that side, zero is the middle. A label on the node's top edge that hangs down
 * into it (labelRatioY at or below zero) is `inside-top`; every other edge or corner placement is the outside side
 * or corner, the nearest neutral value (an inside bottom or side has none).
 * @param smart - the `y:SmartNodeLabelModelParameter` element
 * @returns the position
 */
function smartPosition(smart: unknown): string {
    const ratio = (name: string): number => {
        const n = Number(treeAttr(smart, name));
        return Number.isFinite(n) ? n : 0;
    };
    const h = sideOf(ratio("nodeRatioX"), "left", "right");
    const v = sideOf(ratio("nodeRatioY"), "top", "bottom");
    if (v === "top" && h === "" && ratio("labelRatioY") <= 0) {
        return "inside-top";
    }
    if (v === "" || h === "") {
        return v + h || "center";
    }
    return `${v}-${h}`;
}

/**
 * One axis of a SmartNodeLabelModel node ratio.
 * @param ratio - the ratio, -0.5..0.5
 * @param low - the side below zero
 * @param high - the side above zero
 * @returns the side, or "" for the middle
 */
function sideOf(ratio: number, low: string, high: string): string {
    if (ratio < 0) {
        return low;
    }
    return ratio > 0 ? high : "";
}

/**
 * Where a label's box lies against its node: beside a side or a corner, or `center` when it overlaps the node.
 * @param label - the label element
 * @param geometry - the node's `y:Geometry`
 * @returns the position, or null when the label or the node has no box
 */
function boxPosition(label: unknown, geometry: unknown): string | null {
    const num = (o: unknown, k: string): number => Number(treeAttr(o, k) ?? Number.NaN);
    const [x, y, w, h] = ["x", "y", "width", "height"].map((k) => num(label, k));
    const [nw, nh] = [num(geometry, "width"), num(geometry, "height")];
    if (![x, y, w, h, nw, nh].every(Number.isFinite)) {
        return null;
    }
    const side = (lo: number, size: number, extent: number): -1 | 0 | 1 => {
        if (lo + size <= 0) {
            return -1;
        }
        return lo >= extent ? 1 : 0;
    };
    return BOX_POSITIONS[side(y, h, nh) + 1][side(x, w, nw) + 1];
}

/**
 * Where yEd's internal model draws a label: in the middle, or inside the node against the side or in the corner its
 * `modelPosition` names. A label as wide as its node (a group's header) is drawn against the side its `alignment`
 * names, so a right-aligned header along the top is in the top-right corner.
 * @param label - the label element
 * @param position - its `modelPosition`
 * @returns the position
 */
function insidePosition(label: unknown, position: string | undefined): string {
    const inside = INTERNAL_POSITIONS.get((position ?? "c").trim().toLowerCase()) ?? "center";
    const align = treeAttr(label, "alignment");
    const across = treeAttr(label, "autoSizePolicy") === "node_width" && (align === "left" || align === "right");
    return across && (inside === "inside-top" || inside === "inside-bottom") ? `${inside}-${align}` : inside;
}

/** yEd's internal label model positions, as the neutral position inside the node. */
const INTERNAL_POSITIONS: ReadonlyMap<string, string> = new Map([
    ["c", "center"],
    ["t", "inside-top"],
    ["b", "inside-bottom"],
    ["l", "inside-left"],
    ["r", "inside-right"],
    ["tl", "inside-top-left"],
    ["tr", "inside-top-right"],
    ["bl", "inside-bottom-left"],
    ["br", "inside-bottom-right"],
]);

/** A label's position by the side of the node it lies on: rows above, level, below; columns left, level, right. */
const BOX_POSITIONS: readonly (readonly string[])[] = [
    ["top-left", "top", "top-right"],
    ["left", "center", "right"],
    ["bottom-left", "bottom", "bottom-right"],
];

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
    if (real.type === "TableNode") {
        // a yEd table or pool is a rectangle of bands
        return canonEnum("shape", "rectangle", "yed", at("shape"));
    }
    if (real.type === "GenericNode") {
        const conf = treeAttr(real.r, "configuration") ?? "";
        const known = configurationOutline(conf);
        if (known !== null) {
            return known.shape;
        }
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

/** yEd's gradient: from the fill color at a node's top-left corner to `color2` at its bottom-right one. */
const YED_GRADIENT_ANGLE = 45;

/**
 * Reads a node realizer's fill: its color, and a gradient into `color2`. yEd paints no fill where the fill has no
 * color or is transparent.
 * @param real - the realizer
 * @param put - receives the values
 * @param at - the sites
 */
function readFill(real: Realizer, put: PutValue, at: SiteOf): void {
    const fill = treeChild(real.r, "Fill");
    if (fill === undefined) {
        return;
    }
    if (treeAttr(fill, "hasColor") === "false" || treeAttr(fill, "transparent") === "true") {
        noteAt(at("fill"), STYLE_ISSUE.NO_FILL, "transparent");
        put("fillOpacity", 0);
        return;
    }
    readColor(treeAttr(fill, "color"), "fill", "fillOpacity", put, at);
    const second = canonColor(treeAttr(fill, "color2"), "yed", at("fillGradient"));
    if (second !== null) {
        put("fillGradient", second.color);
        put("fillGradientAngle", YED_GRADIENT_ANGLE);
    }
}

/**
 * A `y:TableNode`'s `yed.table.*` style property, as a color.
 * @param real - the table realizer
 * @param name - the property's name
 * @param at - the sites
 * @returns the `#rrggbb` color, or null when the table does not set it
 */
function tableColor(real: Realizer, name: string, at: SiteOf): string | null {
    const props = treeChildren(treeChild(real.r, "StyleProperties"), "Property");
    const prop = props.find((p) => treeAttr(p, "name") === name);
    return prop === undefined ? null : (canonColor(treeAttr(prop, "value"), "yed", at("stripeColors"))?.color ?? null);
}

/**
 * Reads a `y:TableNode` (a yEd table or BPMN pool) as bands over the node: its header (the table's top inset, or
 * its left one for columns side by side) in `yed.table.header.color.main`, then its rows top to bottom (or its
 * columns left to right) in `yed.table.lane.color.main` and `.alternating` by turns, then the opposite inset. A
 * color the table does not set is the node's fill. The lines between the lanes and the row and column headers
 * (`yed.table.header.color.alternating`) are not drawn.
 * @param real - the realizer
 * @param put - receives the values
 * @param at - the sites
 */
function readTable(real: Realizer, put: PutValue, at: SiteOf): void {
    const table = treeChild(real.r, "Table");
    const rows = treeChildren(treeChild(table, "Rows"), "Row");
    const columns = treeChildren(treeChild(table, "Columns"), "Column");
    const across = columns.length > 1 && rows.length <= 1;
    const lanes = (across ? columns : rows).map((l) => Number(treeAttr(l, across ? "width" : "height")));
    const insets = treeChild(table, "Insets");
    const inset = (side: string): number => Math.max(0, Number(treeAttr(insets, side) ?? 0) || 0);
    const [head, tail] = across ? [inset("left"), inset("right")] : [inset("top"), inset("bottom")];
    const sizes = [head, ...lanes, tail];
    const total = sizes.reduce((a, b) => a + b, 0);
    if (lanes.length === 0 || !sizes.every(Number.isFinite) || total <= 0) {
        return;
    }
    const fill =
        canonColor(treeAttr(treeChild(real.r, "Fill"), "color"), "yed", at("stripeColors"))?.color ?? "#ffffff";
    const main = tableColor(real, "yed.table.lane.color.main", at) ?? fill;
    const alternating = tableColor(real, "yed.table.lane.color.alternating", at) ?? main;
    const header = tableColor(real, "yed.table.header.color.main", at) ?? fill;
    const bands = (
        [[head, header], ...lanes.map((size, i) => [size, i % 2 === 0 ? main : alternating]), [tail, fill]] as [
            number,
            string,
        ][]
    ).filter(([size]) => size > 0);
    put("stripeColors", bands.map(([, color]) => color).join(" "));
    put("stripeSizes", bands.map(([size]) => String(Number((size / total).toFixed(6)))).join(" "));
    if (across) {
        put("stripeDirection", "right");
    }
}

/**
 * yEd's shared pictures (`<y:Resources>` on the graph): each resource's id to the picture as a URL, an SVG's text as
 * a `data:image/svg+xml` URL and a `java.awt.image.BufferedImage` (base64 PNG) as a `data:image/png` one.
 * @param snapshot - the graph
 * @returns the pictures by id
 */
function yedResources(snapshot: GraphSnapshot): ReadonlyMap<string, string> {
    const out = new Map<string, string>();
    for (const col of snapshot.graph) {
        if (col.dtype !== "json" || col.meta.origin?.namespace !== "yfiles") {
            continue;
        }
        addYedResources(plainCell(snapshot.graph.value(col.meta.name, 0)), out);
    }
    return out;
}

/**
 * Adds the pictures of one yFiles graph value's `<y:Resources>`; an id already there keeps its picture.
 * @param root - the graph's yFiles value
 * @param out - the pictures by id, added to
 */
function addYedResources(root: unknown, out: Map<string, string>): void {
    for (const resources of treeChildren(root, "Resources")) {
        for (const r of treeChildren(resources, "Resource")) {
            const id = treeAttr(r, "id");
            const url = id === undefined || out.has(id) ? null : yedResourceUrl(r);
            if (id !== undefined && url !== null) {
                out.set(id, url);
            }
        }
    }
}

/**
 * One `<y:Resource>` as a picture URL: a `java.awt.image.BufferedImage` (base64 PNG) as a `data:image/png` URL and
 * an SVG's text as a `data:image/svg+xml` one.
 * @param r - the resource element
 * @returns the URL, or null for an empty resource or one that is no picture
 */
function yedResourceUrl(r: unknown): string | null {
    const text = treeText(r)?.trim() ?? "";
    if (text === "") {
        return null;
    }
    const type = treeAttr(r, "type") ?? "";
    if (type.endsWith("BufferedImage")) {
        return `data:image/png;base64,${text.replaceAll(/\s+/g, "")}`;
    }
    if (text.includes("<svg")) {
        return `data:image/svg+xml;utf8,${encodeURIComponent(text)}`;
    }
    return null;
}

/**
 * The picture an image or SVG node realizer draws (`y:Image refid`, `y:SVGModel/y:SVGContent refid`), stretched over
 * the node's box, as yEd draws `y:ImageNode` and `y:SVGNode`. The realizer's own fill and border are kept beneath it:
 * whether yEd paints them under the picture waits for a drawing by yEd itself (ISSUES.md).
 * @param real - the realizer
 * @param resources - the graph's shared pictures
 * @param put - receives the values
 */
function readPicture(real: Realizer, resources: ReadonlyMap<string, string>, put: PutValue): void {
    const ref =
        real.type === "ImageNode"
            ? treeAttr(treeChild(real.r, "Image"), "refid")
            : treeAttr(treeChild(treeChild(real.r, "SVGModel"), "SVGContent"), "refid");
    const src = ref === undefined ? undefined : resources.get(ref);
    if (src === undefined) {
        return;
    }
    put("image", src);
    put("imageFit", "fill");
    put("imageClip", "none");
}

/**
 * Reads one node realizer.
 * @param real - the realizer
 * @param put - receives the values
 * @param at - the sites
 * @param resources - the graph's shared pictures, for image and SVG nodes
 */
function readNode(real: Realizer, put: PutValue, at: SiteOf, resources?: ReadonlyMap<string, string>): void {
    const { r } = real;
    readFill(real, put, at);
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
    const points =
        real.type === "GenericNode" ? configurationOutline(treeAttr(r, "configuration") ?? "")?.points : undefined;
    if (points !== undefined) {
        put("shapePoints", points);
    }
    if (real.type === "TableNode") {
        readTable(real, put, at);
    }
    if (resources !== undefined && (real.type === "ImageNode" || real.type === "SVGNode")) {
        readPicture(real, resources, put);
    }
    readLabels(treeChildren(r, "NodeLabel"), true, put, at, geometry);
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
    put("curved", edgeCurved(real));
    if (real.type === "ArcEdge") {
        // the bend yEd saves is the arc's apex, `y:Arc height` from the line between the ends (every yEd-saved arc
        // in the corpus: scala-collection-mutable, Animatron__player__flow), so the arc is the circle through it
        put("bendCurve", "arc");
    }
    readLabels(treeChildren(r, "EdgeLabel"), false, put, at);
}

/**
 * Whether an edge is drawn curved through its bends: an arc always; a spline only through its control points (with
 * none it is a straight line); a polyline, and a generic edge (a framed or styled polyline), only when it smooths
 * bends it has. A quad curve edge never, nor a Bezier edge of whole cubic pieces (two control points, five, ...): its
 * curve is flattened into points on it (`readEdgeRoute`), drawn straight from one to the next, as a Graphviz spline
 * is; rounding their corners cut inside the curve (a quad curve of straightness 1, whose points are its control
 * polygon, was drawn bowed).
 * @param real - the edge realizer
 * @returns true when curved, null when a polyline does not say whether it smooths
 */
function edgeCurved(real: Realizer): boolean | null {
    if (real.type === "ArcEdge") {
        return true;
    }
    const points = treeChildren(treeChild(real.r, "Path"), "Point").length;
    if (real.type === "QuadCurveEdge") {
        return false;
    }
    if (real.type === "BezierEdge") {
        // a count of control points no run of cubic pieces takes is not flattened: its corners are rounded
        return points > 0 && (points + 1) % 3 !== 0;
    }
    const bent = points > 0;
    if (real.type !== "PolyLineEdge" && real.type !== "GenericEdge") {
        return bent;
    }
    const smoothed = treeAttr(treeChild(real.r, "BendStyle"), "smoothed");
    return smoothed === undefined ? null : smoothed === "true" && bent;
}

/**
 * An edge's route from its `y:Path`: the ports its ends attach at (`sx sy`, `tx ty`: offsets from the node centers),
 * relative to each node's size, and its bends, relative to the centers of its two nodes (a self-loop's to its node's
 * size). yEd draws a polyline, an arc or a spline through the points; a Bezier or quad curve edge takes them as
 * control points its curve does not pass through, so its curve is flattened into the points it does pass through.
 * @param real - the edge realizer
 * @param nodes - each node's center x and y, width and height
 * @param source - the source node's index
 * @param target - the target node's index
 * @param put - receives the values
 */
function readEdgeRoute(real: Realizer, nodes: Float64Array, source: number, target: number, put: PutValue): void {
    const path = treeChild(real.r, "Path");
    const at = (k: number): BendPoint => [nodes[4 * k], nodes[4 * k + 1]];
    const size = (k: number): BendPoint => [nodes[4 * k + 2], nodes[4 * k + 3]];
    const offset = (key: string): number => Number(treeAttr(path, key) ?? 0) || 0;
    const ends: readonly [BendPoint, BendPoint] = [
        [at(source)[0] + offset("sx"), at(source)[1] + offset("sy")],
        [at(target)[0] + offset("tx"), at(target)[1] + offset("ty")],
    ];
    const port = (k: number, end: BendPoint): string | null =>
        end[0] === at(k)[0] && end[1] === at(k)[1] ? null : canonNodeOffsets(at(k), size(k), [end], true);
    put("sourcePort", port(source, ends[0]));
    put("targetPort", port(target, ends[1]));
    let points = treeChildren(path, "Point").map((p): BendPoint => [
        Number(treeAttr(p, "x")),
        Number(treeAttr(p, "y")),
    ]);
    if (points.length > 0 && (real.type === "BezierEdge" || real.type === "QuadCurveEdge")) {
        const controls = [ends[0], ...points, ends[1]];
        const curve =
            real.type === "BezierEdge"
                ? flattenCubic(controls)
                : flattenQuadSpline(controls, Number(treeAttr(real.r, "straightness") ?? YED_STRAIGHTNESS));
        points = (curve ?? controls).slice(1, -1);
    }
    put(
        "bends",
        source === target
            ? canonNodeOffsets(at(source), size(source), points, true)
            : canonBends(at(source), at(target), points, true),
    );
}

/** yEd's quad curve straightness when a file gives none. */
const YED_STRAIGHTNESS = 0.1;

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
    const resources = yedResources(snapshot);
    // each node's center, width and height, read with the node, for its edges' routes; NaN without yEd graphics
    const boxes = new Float64Array(4 * snapshot.nodeCount).fill(Number.NaN);
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
                readNode(real, put, at, resources);
                const geometry = treeChild(real.r, "Geometry");
                const [w, h] = [Number(treeAttr(geometry, "width")), Number(treeAttr(geometry, "height"))];
                boxes.set(
                    [Number(treeAttr(geometry, "x")) + w / 2, Number(treeAttr(geometry, "y")) + h / 2, w, h],
                    4 * i,
                );
            } else {
                readEdge(real, put, at);
                readEdgeRoute(real, boxes, snapshot.edgeSource(i), snapshot.edgeTarget(i), put);
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
    tool: "yed",
    node: Object.freeze([
        "fill",
        "fillOpacity",
        "fillGradient",
        "fillGradientAngle",
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

/** yEd's internal label model positions by neutral position: the center, and against a side or in a corner inside. */
const INTERNAL_MODEL_POSITIONS: ReadonlyMap<string, string> = new Map(
    [...INTERNAL_POSITIONS].map(([model, position]) => [position, model]),
);

/** yEd's eight-position label model positions by neutral position, all outside the node. */
const YED_MODEL_POSITIONS: ReadonlyMap<string, string> = new Map([
    ["top", "n"],
    ["bottom", "s"],
    ["left", "w"],
    ["right", "e"],
    ["top-left", "nw"],
    ["top-right", "ne"],
    ["bottom-left", "sw"],
    ["bottom-right", "se"],
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

/** The Java logical font each family the reader gives one is written back as. */
const JAVA_LOGICAL: Readonly<Record<string, string>> = {
    [JAVA_SANS]: "Dialog",
    [JAVA_SERIF]: "Serif",
    [JAVA_MONO]: "Monospaced",
};

/**
 * A CSS family as the one font name yEd reads: a Java logical font's family as that font, else the list's first name.
 * @param family - the CSS family or family list
 * @returns the font name
 */
export function yedFontName(family: string): string {
    return Object.hasOwn(JAVA_LOGICAL, family) ? JAVA_LOGICAL[family] : family.split(",")[0].trim();
}

/**
 * A label's font attributes: family, size and style.
 * @param get - the element's values
 * @returns the label element holding them
 */
function labelFontTree(get: GetValue): Tree {
    const label: Tree = {};
    const font = get("labelFont");
    if (typeof font === "string") {
        label["@_fontFamily"] = yedFontName(font);
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
    return label;
}

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
    const label = labelFontTree(get);
    const color = get("labelColor");
    if (typeof color === "string") {
        label["@_textColor"] = color.toUpperCase();
    }
    const position = node ? get("labelPosition") : null;
    if (typeof position === "string") {
        const inside = INTERNAL_MODEL_POSITIONS.get(position);
        const outside = YED_MODEL_POSITIONS.get(position);
        if (inside === undefined && outside === undefined) {
            approximate("labelPosition", position);
        }
        // the center and the inside positions in yEd's internal model, the outside ones in its eight-position one
        label["@_modelName"] = outside === undefined ? "internal" : "eight_pos";
        label["@_modelPosition"] = outside ?? inside ?? "c";
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
        const second = get("fillGradient");
        if (typeof second === "string") {
            (node["y:Fill"] as Tree)["@_color2"] = second.toUpperCase();
            const angle = get("fillGradientAngle");
            if (angle !== YED_GRADIENT_ANGLE) {
                approximate("fillGradientAngle", angle ?? 0);
            }
        }
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
 * For a file graphty wrote: where a value read from the yEd graphics is what the writer writes for the block's own
 * value (a pentagon written as a hexagon, an opacity rounded to yEd's 255 steps), the block's exact value is the
 * truth, so a re-import gives back the same rules; a value another program changed since stays the truth.
 * @param snapshot - the graph
 * @param text - the block's text
 * @param read - the values the reader read, changed in place
 */
export function exactFromBlock(snapshot: GraphSnapshot, text: string, read: YedRead): void {
    const notes = new StyleNotes();
    takeFromBlock(snapshot, text, "graphml", (target) => ({
        values: read[target],
        properties: GRAPHML_STYLE_CAPABILITIES[target],
        writes: GRAPHML_STYLE_CAPABILITIES[target],
        readBack: (_i, want) => {
            const back = writtenAndReadBack(target, want, notes);
            return back === null ? null : (property) => back.get(property) ?? null;
        },
    }));
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
 * A node's `y:Geometry` x and y from the graph's position column, for a node with no yEd graphics of its own: the
 * column's coordinate read in its declared spelling (center, y up when it declares none), written as yEd places a
 * box, by its top-left corner with y growing downward.
 * @param snapshot - the graph
 * @param i - the node
 * @param get - the node's values (its drawn width and height)
 * @returns the x and y to write, or null when the node has no finite position
 */
function columnPosition(snapshot: GraphSnapshot, i: number, get: GetValue): [string, string] | null {
    const column = snapshot.nodes.byRole("position");
    if (column === null || column.meta.components < 2 || !column.isSet(i)) {
        return null;
    }
    const v = column.value(i) as ArrayLike<number>;
    const width = get("width");
    const height = get("height");
    const size: [number, number] = [typeof width === "number" ? width : 0, typeof height === "number" ? height : 0];
    const p: [number, number, number] = [v[0], v[1], 0];
    toNeutral(p, column.meta.extra ?? {}, size, false);
    const [x, y] = toFilePositions(Float64Array.from(p), YED_SPELLING, {
        width: Float64Array.of(size[0]),
        height: Float64Array.of(size[1]),
    });
    return Number.isFinite(x) && Number.isFinite(y) ? [String(x), String(y)] : null;
}

/** How yEd spells a node's place: its box's top-left corner, y growing downward. */
const YED_SPELLING: PositionColumnExtra = { yAxis: "down", anchor: "top-left" };

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

/** A written node's center and its width and height. */
type WrittenBox = readonly [center: BendPoint, size: BendPoint];

/**
 * An edge's `y:Path` with its points placed from its `bends` value between the written node centers (a self-loop's
 * around its node) and its ports from its `sourcePort` and `targetPort`, so they read back as written; a port with no
 * value keeps the one of the path it had. Without a bend or port value, or without both centers, the path it had.
 * @param kept - the path from the graphics the edge had, or undefined
 * @param get - the edge's values
 * @param ends - the written boxes of its source and target
 * @param loop - whether the edge is a self-loop
 * @returns the path, or undefined
 */
function pathWithRoute(kept: unknown, get: GetValue, ends: readonly [WrittenBox, WrittenBox], loop: boolean): unknown {
    const bends = get("bends");
    const [[c0, size0], [c1]] = ends;
    let points: BendPoint[] | null = null;
    if (typeof bends === "string") {
        points = loop ? nodeOffsetsToPoints(c0, size0, bends, true) : bendsToPoints(c0, c1, bends, true);
    }
    const ports = (["sourcePort", "targetPort"] as const).map((property, k) => {
        const value = get(property);
        const [center, size] = ends[k];
        const at = typeof value === "string" ? nodeOffsetsToPoints(center, size, value, true) : null;
        return at === null ? null : [at[0][0] - center[0], at[0][1] - center[1]];
    });
    if (points === null && ports.every((p) => p === null)) {
        return kept;
    }
    const path: Tree = {};
    ["sx", "sy", "tx", "ty"].forEach((key, k) => {
        const port = ports[k >> 1];
        path[`@_${key}`] = port === null ? (treeAttr(kept, key) ?? "0.0") : String(port[k & 1]);
    });
    const written =
        points ??
        treeChildren(kept, "Point").map((q): BendPoint => [Number(treeAttr(q, "x")), Number(treeAttr(q, "y"))]);
    path["y:Point"] = written.map(([x, y]) => ({ "@_x": String(x), "@_y": String(y) }));
    return path;
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
    const getNode = elementValues(picture, "node", GRAPHML_STYLE_CAPABILITIES.node);
    const getEdge = elementValues(picture, "edge", GRAPHML_STYLE_CAPABILITIES.edge);
    const nodeTrees: (Tree | null)[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const get = getNode(i);
        const at = keptPosition(snapshot.nodes, nodeColumns, i) ?? columnPosition(snapshot, i, get);
        nodeTrees.push(shapeNodeTree(get, at, approximateFor("node")));
    }
    const boxes = nodeTrees.map((tree): WrittenBox => {
        const geometry = treeChild(treeChild(tree, "ShapeNode"), "Geometry");
        const at = (k: string): number => Number(treeAttr(geometry, k) ?? Number.NaN);
        return [
            [at("x") + at("width") / 2, at("y") + at("height") / 2],
            [at("width"), at("height")],
        ];
    });
    const edgeTrees: (Tree | null)[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const get = getEdge(e);
        const [source, target] = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
        const path = pathWithRoute(
            keptPath(snapshot.edges, edgeColumns, e),
            get,
            [boxes[source], boxes[target]],
            source === target,
        );
        edgeTrees.push(polyLineEdgeTree(get, path, approximateFor("edge")));
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
