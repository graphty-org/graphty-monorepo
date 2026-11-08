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
import { canonNumber, canonSigned, num6 } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { yedGradientAngle } from "../../styles/canon/yed-gradient.js";
import {
    YED_INSIDE_INSET,
    YED_LABEL_PADDING,
    yedLabelBox,
    yedLabelFillsNodeHeight,
    yedLabelFillsNodeWidth,
} from "../../styles/canon/yed-label.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { JAVA_MONO, JAVA_SANS, JAVA_SERIF, javaFamily } from "../../styles/cytoscape/lexicon.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import { elementValues, takeFromBlock } from "../../styles/io/round-trip.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type { StyleTarget, StyleValue, StyleWorkBudget, StyleWriteCapabilities } from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { YED_UML_STEREOTYPE_DROP, yedNodePicture, yedUmlClassPicture } from "./styles-yed-drawing.js";
import { svgPicture } from "./styles-yed-live-drawing.js";
import { YED_GROUP_INSETS, type YedBox, yedGroupBounds, type YedGroupFrame } from "./yed-group-bounds.js";

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
        const value: unknown = tree[key];
        const r: unknown = Array.isArray(value) ? value[0] : value;
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

/** A shape a yEd node type draws: a neutral shape, with what yEd draws differently from a plain one of it. */
export interface YedOutline {
    readonly shape: string;
    /** The polygon's corners as neutral `shapePoints` (`x,y` fractions of the half sizes, y up). */
    readonly points?: string;
    /** Its corners at a node's width, where they do not scale with it. */
    readonly pointsAt?: (width: number) => string;
    /** A rounded box's corner radius; `pill` rounds its short sides into half circles. */
    readonly cornerRadius?: number | "pill";
    /** The width over the height of the shape, drawn as large as fits in the middle of the node's box. */
    readonly aspect?: number;
    /** Lines drawn over it in its border's color, as neutral `shapeLines`. */
    readonly lines?: string;
    /** The line yEd draws round it, whatever the file sets; 0 draws none. */
    readonly borderWidth?: number;
    /** Whether yEd paints no fill in it. */
    readonly hollow?: boolean;
    /** Whether yEd paints its fill darker than the file's color. */
    readonly darker?: boolean;
    /** Whether yEd raises it, with Java's `fill3DRect`: light and dark strips of 1 px along its edge. */
    readonly raised?: boolean;
    /** Whether yEd paints it as a bevel (`putBevelPaint`), its line this far in (`putBevelLine`). */
    readonly bevelInset?: number;
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

/**
 * Points along a quadratic curve, as `x,y` text, both ends included.
 * @param from - its start
 * @param control - its control point
 * @param to - its end
 * @returns the points
 */
function curvePoints(from: [number, number], control: [number, number], to: [number, number]): string[] {
    const steps = 8;
    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const at = (k: 0 | 1): number => (1 - t) ** 2 * from[k] + 2 * t * (1 - t) * control[k] + t ** 2 * to[k];
        return pointText(at(0), at(1));
    });
}

/**
 * yEd's display at a width: its curves keep their length whatever the node's width, 18 along the left side's and 4.5
 * round the right's, on a node 48 wide (gml-specimen-node-shapes-p3) as on one 56 wide.
 * @param width - the node's width
 * @returns the outline's points
 */
function displayPoints(width: number): string {
    const unit = 2 / width;
    const [left, right] = [-1 + 18 * unit, 1 - 4.5 * unit];
    return [
        ...curvePoints([-1, 0], [-1 + 4.5 * unit, -0.75], [left, -1]),
        ...curvePoints([right, -1], [1 + 4.5 * unit, 0], [right, 1]),
        ...curvePoints([left, 1], [-1 + 4.5 * unit, 0.75], [-1, 0]),
    ].join(" ");
}

/** A cloud: a circle of bumps, stretched to the box. */
const CLOUD = Array.from({ length: 72 }, (_, i) => {
    const t = (2 * Math.PI * i) / 72;
    const r = 0.86 + 0.14 * Math.abs(Math.cos(4 * t));
    return pointText(r * Math.cos(t), r * Math.sin(t));
}).join(" ");

/** The curved right side of yEd's delay and display, bowing 0.16 of the half width past where it starts. */
const YED_RIGHT_BULGE = curvePoints([0.84, -1], [1.16, 0], [0.84, 1]);

/** yEd's old bevel nodes: boxes with corners of 3, or of 10 for the second and third. */
const BEVEL: YedOutline = { shape: "round-rectangle", cornerRadius: 3, bevelInset: 2 };
const ROUND_BEVEL: YedOutline = { shape: "round-rectangle", cornerRadius: 10, bevelInset: 2 };

/**
 * The shape each configuration of yEd's GenericNode palettes draws (flowchart, entity relationship, BPMN, SBGN), by
 * its name after `com.yworks.` without a `.withShadow` suffix, lowercase. Matched whole, before the words below:
 * "data" is a parallelogram, but "storedData" and "directData" are not. A shape no neutral one names is the polygon
 * yEd draws it as (curves as short segments); the lines some draw inside (predefined process, internal storage) and
 * the BPMN symbols are a picture over the node (`readMarks`). The BPMN artifact's outline follows its `com.yworks.bpmn.type` style property (`genericOutline`). The
 * corner radii, the shapes that keep their proportions in a box of another shape and the lines round them are as
 * yEd 3.25 draws them (`yed-graphml-specimen-node-shapes-p2`, `-p3`).
 */
const YED_CONFIGURATIONS: ReadonlyMap<string, YedOutline> = new Map<string, YedOutline>([
    ["flowchart.process", { shape: "rectangle" }],
    ["flowchart.predefinedprocess", { shape: "rectangle" }],
    ["flowchart.internalstorage", { shape: "rectangle" }],
    ["flowchart.decision", { shape: "diamond" }],
    ["flowchart.terminator", { shape: "round-rectangle", cornerRadius: "pill" }],
    ["flowchart.start1", { shape: "ellipse" }],
    ["flowchart.start2", { shape: "ellipse", aspect: 1 }],
    ["flowchart.onpagereference", { shape: "ellipse", aspect: 1 }],
    ["flowchart.sequentialdata", { shape: "ellipse", aspect: 1 }],
    // its bracket is not drawn
    ["flowchart.annotation", { shape: "rectangle", borderWidth: 0 }],
    ["flowchart.data", { shape: "parallelogram" }],
    ["flowchart.preparation", { shape: "hexagon" }],
    ["flowchart.database", { shape: "other:database" }],
    ["flowchart.looplimit", { shape: "polygon", points: "-1,-1 1,-1 1,0.5 0.8,1 -0.8,1 -1,0.5" }],
    ["flowchart.looplimitend", { shape: "polygon", points: "-1,1 -1,-0.5 -0.8,-1 0.8,-1 1,-0.5 1,1" }],
    ["flowchart.manualinput", { shape: "polygon", points: "-1,-1 1,-1 1,1 -1,0.4" }],
    ["flowchart.card", { shape: "polygon", points: "-1,-1 1,-1 1,1 -0.6,1 -1,0.6" }],
    ["flowchart.manualoperation", { shape: "polygon", points: "-1,1 -0.7,-1 0.7,-1 1,1" }],
    ["flowchart.offpagereference", { shape: "polygon", points: "-1,1 -1,0 0,-1 1,0 1,1", aspect: 1 }],
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
    ["flowchart.delay", { shape: "polygon", points: ["-1,-1", ...YED_RIGHT_BULGE, "-1,1"].join(" ") }],
    ["flowchart.display", { shape: "polygon", points: displayPoints(56), pointsAt: displayPoints }],
    [
        "flowchart.storeddata",
        {
            shape: "polygon",
            points: [
                ...curvePoints([1, -1], [0.68, 0], [1, 1]),
                ...curvePoints([-0.84, 1], [-1.16, 0], [-0.84, -1]),
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
    ["entityrelationship.big_entity", { shape: "round-rectangle", cornerRadius: 4 }],
    ["bpmn.activity", { shape: "round-rectangle", cornerRadius: 4 }],
    ["bpmn.event", { shape: "ellipse", aspect: 1 }],
    ["bpmn.gateway", { shape: "diamond", aspect: 1 }],
    // a regular hexagon
    ["bpmn.conversation", { shape: "hexagon", aspect: 2 / Math.sqrt(3) }],
    ["bevelnode", BEVEL],
    ["bevelnode2", ROUND_BEVEL],
    ["bevelnode3", ROUND_BEVEL],
    ["bevelnodewithshadow", BEVEL],
    ["sbgn.unspecifiedentity", { shape: "ellipse" }],
    ["sbgn.simplechemical", { shape: "round-rectangle", cornerRadius: "pill" }],
    ["sbgn.emptyset", { shape: "ellipse", aspect: 1 }],
    ["sbgn.operator", { shape: "ellipse", aspect: 1 }],
    ["sbgn.macromolecule", { shape: "round-rectangle" }],
    ["sbgn.phenotype", { shape: "hexagon" }],
    ["sbgn.process", { shape: "rectangle" }],
    ["sbgn.submap", { shape: "rectangle" }],
    ["sbgn.unitofinformation", { shape: "rectangle" }],
    ["sbgn.statevariable", { shape: "round-rectangle", cornerRadius: "pill" }],
    ["sbgn.tag", { shape: "polygon", points: "-1,1 -1,-1 0.6,-1 1,0 0.6,1" }],
    ["sbgn.perturbingagent", { shape: "polygon", points: "-1,1 1,1 0.679,0 1,-1 -1,-1 -0.679,0" }],
    [
        "sbgn.nucleicacidfeature",
        {
            shape: "polygon",
            points: [
                "-1,1",
                "1,1",
                ...arcPoints(0.571, -0.333, 0.429, 0.667, 0, -HALF_PI),
                ...arcPoints(-0.571, -0.333, 0.429, 0.667, -HALF_PI, -Math.PI),
            ].join(" "),
        },
    ],
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

/** A BPMN message's flap: from the envelope's top corners to its middle. */
const ENVELOPE_FLAP = "-1,1 0,0 1,1";

/** How far inside a BPMN node's outline yEd draws the second line of a double one. */
const BPMN_DOUBLE_LINE_INSET = 2.5;

/**
 * One coordinate of a point inside the node: the fraction of its half side, less a length toward its middle.
 * @param fraction - the fraction
 * @param length - the length in from there, along the fraction's sign
 * @returns the coordinate as `shapeLines` text
 */
function insetCoordinate(fraction: number, length: number): string {
    const r = (v: number): number => Math.round(v * 1000) / 1000 + 0;
    const by = r(-Math.sign(fraction) * length);
    return `${String(r(fraction))}${by < 0 ? "" : "+"}${String(by)}`;
}

/** The second line of a BPMN event: a circle `BPMN_DOUBLE_LINE_INSET` inside the node's, closed. */
const EVENT_DOUBLE_LINE = Array.from({ length: 49 }, (_, i) => {
    const [c, s] = [Math.cos((2 * Math.PI * i) / 48), Math.sin((2 * Math.PI * i) / 48)];
    const inset = BPMN_DOUBLE_LINE_INSET;
    return `${insetCoordinate(c, Math.abs(c) * inset)},${insetCoordinate(s, Math.abs(s) * inset)}`;
}).join(" ");

/** The second line of a BPMN transaction: a box `BPMN_DOUBLE_LINE_INSET` inside the activity's, its corners of 4. */
const TRANSACTION_DOUBLE_LINE = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
]
    .flatMap(([sx, sy], corner) => {
        const start = (corner * Math.PI) / 2;
        return Array.from({ length: 7 }, (_, i) => {
            const t = start + (i * Math.PI) / 12;
            const [x, y] = [Math.abs(Math.cos(t)), Math.abs(Math.sin(t))];
            const toCenter = BPMN_DOUBLE_LINE_INSET + 4;
            return `${insetCoordinate(sx, toCenter - 4 * x)},${insetCoordinate(sy, toCenter - 4 * y)}`;
        });
    })
    .join(" ");

/** The BPMN `characteristic` and `activityType` values yEd draws with a double line. */
const BPMN_DOUBLE_LINES: ReadonlyMap<string, string> = new Map([
    ["event_characteristic_intermediate_catching", EVENT_DOUBLE_LINE],
    ["event_characteristic_intermediate_throwing", EVENT_DOUBLE_LINE],
    ["event_characteristic_intermediate_boundary_interrupting", EVENT_DOUBLE_LINE],
    ["event_characteristic_intermediate_boundary_non_interrupting", EVENT_DOUBLE_LINE],
    ["activity_type_transaction", `${TRANSACTION_DOUBLE_LINE} ${TRANSACTION_DOUBLE_LINE.split(" ")[0]}`],
]);

/**
 * The BPMN artifact's outline, by its `com.yworks.bpmn.type` style property, as yEd draws it
 * (`yed-graphml-specimen-node-shapes-p5`): a data object is a page with its top right corner folded, a data store a
 * cylinder, a group an empty rounded box, an annotation a box with no outline (its bracket is not drawn) and a message
 * an envelope, a reply's darker. A box 36 x 44 draws an envelope 36 x 24; only that one
 * size has been drawn, so that its proportions hold in a wide box too is unproven.
 */
export const BPMN_ARTIFACTS: ReadonlyMap<string, YedOutline> = new Map<string, YedOutline>([
    ["artifact_type_data_object", { shape: "polygon", points: "-1,-1 1,-1 1,0.4 0.2,1 -1,1" }],
    ["artifact_type_data_store", { shape: "other:database" }],
    ["artifact_type_group", { shape: "round-rectangle", cornerRadius: 4, hollow: true }],
    ["artifact_type_annotation", { shape: "rectangle", borderWidth: 0 }],
    ["artifact_type_request_message", { shape: "rectangle", aspect: 3 / 2, lines: ENVELOPE_FLAP }],
    ["artifact_type_reply_message", { shape: "rectangle", aspect: 3 / 2, darker: true, lines: ENVELOPE_FLAP }],
]);

/** The BPMN `characteristic` and `activityType` values yEd draws with a line of 3, whatever the file's width. */
const BPMN_HEAVY: ReadonlySet<string> = new Set(["event_characteristic_end", "activity_type_call_activity"]);

/**
 * A `com.yworks.bpmn.*` style property of a GenericNode.
 * @param r - the realizer element
 * @param name - the name after `com.yworks.bpmn.`
 * @returns its value in lowercase, or undefined
 */
function bpmnProperty(r: unknown, name: string): string | undefined {
    return styleProperty(r, `com.yworks.bpmn.${name}`);
}

/**
 * A style property of a GenericNode.
 * @param r - the realizer element
 * @param name - its full name
 * @returns its value in lowercase, or undefined
 */
function styleProperty(r: unknown, name: string): string | undefined {
    const props = treeChildren(treeChild(r, "StyleProperties"), "Property");
    return treeAttr(
        props.find((p) => treeAttr(p, "name") === name),
        "value",
    )
        ?.slice(0, MAX_STYLE_VALUE_LENGTH)
        .toLowerCase();
}

/** How far down and right yEd draws the copy behind an SBGN multimer, and the corner radius of a macromolecule. */
const MULTIMER_OFFSET = 6;
const MACROMOLECULE_RADIUS = 12;

/** A rounded box: its left, top, right and bottom, and its corners' radius. */
type RoundBox = readonly [number, number, number, number, number];

/**
 * Points along the right and bottom of a rounded box, from its top right corner round to its bottom left one.
 * @param box - the box
 * @returns the points along its three corners, eight steps each
 */
function lowerRightCorners(box: RoundBox): [number, number][] {
    const [x0, y0, x1, y1, r] = box;
    const corners: [number, number][][] = [
        [
            [x1 - r, y0],
            [x1, y0],
            [x1, y0 + r],
        ],
        [
            [x1, y1 - r],
            [x1, y1],
            [x1 - r, y1],
        ],
        [
            [x0 + r, y1],
            [x0, y1],
            [x0, y1 - r],
        ],
    ];
    const steps = 8;
    return corners.flatMap(([from, control, to]) =>
        Array.from({ length: steps + 1 }, (_, i): [number, number] => {
            const t = i / steps;
            const at = (k: 0 | 1): number => (1 - t) ** 2 * from[k] + 2 * t * (1 - t) * control[k] + t ** 2 * to[k];
            return [at(0), at(1)];
        }),
    );
}

/**
 * Whether a rounded box holds a point.
 * @param box - the box
 * @param point - the point
 * @returns true when the point is in it or on its outline
 */
function roundBoxHolds(box: RoundBox, point: [number, number]): boolean {
    const [x0, y0, x1, y1, r] = box;
    const [x, y] = point;
    const [cx, cy] = [Math.min(Math.max(x, x0 + r), x1 - r), Math.min(Math.max(y, y0 + r), y1 - r)];
    return x >= x0 && x <= x1 && y >= y0 && y <= y1 && (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 1e-9;
}

/** A node's border's color and width, as the picture drawn over it paints them. */
interface NodePaint {
    readonly line: string;
    readonly width: number;
}

/** The most of a UML class's attributes or methods drawn: a class's rows, not a block of text. */
const MAX_UML_WORDS = 16 * MAX_STYLE_VALUE_LENGTH;

/**
 * What yEd draws in a UMLClassNode beside its name (`yedUmlClassPicture`), from its `y:UML` and its first label.
 * @param r - the UMLClassNode realizer element
 * @param width - the node's width
 * @param height - its height
 * @param paint - its border as the file gives it: a raised class draws none, but its rules take the border's color
 * @returns the picture URL, or null
 */
function umlClassPicture(r: unknown, width: number, height: number, paint: NodePaint): string | null {
    const uml = treeChild(r, "UML");
    if (uml === undefined) {
        return null;
    }
    const label = treeChildren(r, "NodeLabel")[0];
    const size = Number(treeAttr(label, "fontSize") ?? 12);
    const words = (name: string): string => (treeText(treeChild(uml, name)) ?? "").trim();
    return yedUmlClassPicture({
        width,
        height,
        border: treeAttr(uml, "use3DEffect") === "true" ? 0 : paint.width,
        line: paint.line === "none" ? "#000000" : paint.line,
        family: javaFamily(treeAttr(label, "fontFamily") ?? "Dialog"),
        nameSize: Number.isFinite(size) && size > 0 ? size : 12,
        stereotype: (treeAttr(uml, "stereotype") ?? "").slice(0, MAX_STYLE_VALUE_LENGTH),
        constraint: (treeAttr(uml, "constraint") ?? "").slice(0, MAX_STYLE_VALUE_LENGTH),
        attributes: words("AttributeLabel").slice(0, MAX_UML_WORDS),
        methods: words("MethodLabel").slice(0, MAX_UML_WORDS),
        omitDetails: treeAttr(uml, "omitDetails") === "true",
    });
}

/**
 * What yEd strokes over a node beside its outline, as a picture over the node: the fold of a UMLNoteNode (a white
 * triangle in the cut corner, outlined: its two creases), and the part of an SBGN multimer macromolecule's copy that
 * shows, `MULTIMER_OFFSET` down and right of it behind it (`com.yworks.sbgn.style.mcount` 2 or more), as yEd 3.25
 * draws them (`yed-graphml-specimen-node-shapes-p3`, `graphml-libcitygml-mapping`).
 * @param real - the realizer
 * @param width - the node's width
 * @param height - its height
 * @param paint - its border
 * @returns the picture and how far it reaches past the node's right and bottom, or null where yEd strokes nothing more
 */
function realizerOverlay(
    real: Realizer,
    width: number,
    height: number,
    paint: NodePaint,
): { picture: string; reach: number } | null {
    const stroke = `stroke="${paint.line}" stroke-width="${String(paint.width)}"`;
    if (real.type === "UMLNoteNode") {
        const [x, y] = [width - Math.min(NOTE_FOLD, width), Math.min(NOTE_FOLD, height)];
        const d = `M${pointText(x, 0)} L${pointText(x, y)} L${pointText(width, y)} Z`;
        const body = `<path fill="white" d="${d}"/><path fill="none" ${stroke} d="${d}"/>`;
        return { picture: svgPicture(width, height, paint.width, body), reach: 0 };
    }
    if (real.type === "UMLClassNode") {
        const picture = umlClassPicture(real.r, width, height, paint);
        return picture === null ? null : { picture, reach: 0 };
    }
    const multimer = Number(styleProperty(real.r, "com.yworks.sbgn.style.mcount") ?? 1) > 1;
    const conf = treeAttr(real.r, "configuration") ?? "";
    if (real.type !== "GenericNode" || !multimer || !/^com\.yworks\.sbgn\.macromolecule$/i.test(conf)) {
        return null;
    }
    const [o, r] = [MULTIMER_OFFSET, Math.min(MACROMOLECULE_RADIUS, width / 2, height / 2)];
    const node: RoundBox = [0, 0, width, height, r];
    const copy: RoundBox = [o, o, width + o, height + o, r];
    // ponytail: the copy's outline outside the node, unfilled: yEd also fills the sliver between it and the node in the
    // node's color, but a closed piece there reads as a stray of graphty's own wherever the oracle's reading takes the
    // copy's outline for the node's (the scorecard's matched view of yed-graphml-specimen-node-shapes-p3)
    const shown = lowerRightCorners(copy).filter((q) => !roundBoxHolds(node, q));
    const body = `<path fill="none" ${stroke} d="M${shown.map(([x, y]) => pointText(x, y)).join(" L")}"/>`;
    const reach = { left: 0, top: 0, right: o, bottom: o };
    return { picture: svgPicture(width, height, paint.width, body, "", reach), reach: o };
}

/**
 * The shape a yEd GraphML GenericNode draws: its configuration's (`configurationOutline`), a BPMN artifact's by its
 * `com.yworks.bpmn.type` style property, with the heavy line of an end event or a call activity and the double line of
 * an intermediate event or a transaction.
 * @param r - the GenericNode realizer element
 * @returns the shape, or null for a configuration not known here
 */
function genericOutline(r: unknown): YedOutline | null {
    const conf = treeAttr(r, "configuration") ?? "";
    const known = configurationOutline(conf);
    if (known === null) {
        const artifact = /^com\.yworks\.bpmn\.artifact(\.withshadow)?$/i.test(conf);
        return artifact ? (BPMN_ARTIFACTS.get(bpmnProperty(r, "type") ?? "") ?? null) : null;
    }
    const kinds = ["characteristic", "activityType"].map((name) => bpmnProperty(r, name) ?? "");
    const lines = kinds.map((kind) => BPMN_DOUBLE_LINES.get(kind)).find((line) => line !== undefined);
    return {
        ...known,
        ...(kinds.some((kind) => BPMN_HEAVY.has(kind)) ? { borderWidth: 3 } : {}),
        ...(lines === undefined ? {} : { lines }),
    };
}

/** yEd's ShapeNode types the common shape names do not hold, as yEd 3.25 draws them. */
const YED_TYPES: ReadonlyMap<string, YedOutline> = new Map<string, YedOutline>([
    ["fatarrow", { shape: "polygon", points: "-1,1 0.8,1 1,0 0.8,-1 -1,-1 -0.8,0" }],
    ["fatarrow2", { shape: "polygon", points: "-0.8,1 1,1 0.8,0 1,-1 -0.8,-1 -1,0" }],
    ["triangle2", { shape: "polygon", points: "-1,1 1,1 0,-1" }],
    ["rectangle3d", { shape: "rectangle", borderWidth: 0, raised: true }],
]);

/**
 * The shape a yEd `type` draws, where the common shape names do not say. yEd 3.25 has no `hexagon2` or `octagon2` and
 * draws what it draws for a type it does not know: a rectangle in GraphML and an ellipse in GML.
 * @param type - the `y:Shape` type or the GML `type`
 * @param unknown - the shape yEd draws for an unknown type in this format
 * @returns the shape, or null where the common names hold
 */
export function typeOutline(type: unknown, unknown: string): YedOutline | null {
    const key = typeof type === "string" ? type.trim().toLowerCase() : "";
    return key === "hexagon2" || key === "octagon2" ? { shape: unknown } : (YED_TYPES.get(key) ?? null);
}

/**
 * Writes what an outline draws. Reading the width and the height first lets an outline with proportions of its own
 * replace them.
 * @param outline - the outline
 * @param width - the node's box width, or null
 * @param height - its height, or null
 * @param put - receives the values
 */
export function putOutline(outline: YedOutline, width: number | null, height: number | null, put: PutValue): void {
    const { aspect, cornerRadius } = outline;
    put("shape", outline.shape);
    put("shapePoints", (width === null ? undefined : outline.pointsAt?.(width)) ?? outline.points ?? null);
    put("shapeLines", outline.lines ?? null);
    put("borderWidth", outline.borderWidth ?? null);
    put("fillOpacity", outline.hollow === true ? 0 : null);
    put("cornerRadius", typeof cornerRadius === "number" ? cornerRadius : null);
    if (width === null || height === null) {
        return;
    }
    if (aspect !== undefined) {
        const drawn = Math.min(width, height * aspect);
        put("width", Math.round(drawn * 1000) / 1000);
        put("height", Math.round((drawn / aspect) * 1000) / 1000);
    }
    if (cornerRadius === "pill") {
        put("cornerRadius", Math.min(width, height) / 2);
    }
}

/** The side of the corner yEd folds down from a UML note, whatever the note's size. */
const NOTE_FOLD = 15;

/**
 * A UML note's outline: a box with a square out of its top right corner.
 * @param width - the note's width
 * @param height - its height
 * @returns the outline
 */
function noteOutline(width: number, height: number): YedOutline {
    const x = 1 - (2 * Math.min(NOTE_FOLD, width)) / width;
    const y = 1 - (2 * Math.min(NOTE_FOLD, height)) / height;
    const points = ["-1,1", pointText(x, 1), pointText(x, y), pointText(1, y), "1,-1", "-1,-1"];
    return { shape: "polygon", points: points.join(" ") };
}

/**
 * What a node realizer draws, where its kind says more than its `y:Shape`'s name.
 * @param real - the realizer
 * @param width - its width, or null
 * @param height - its height, or null
 * @returns the outline, or null where `realizerShape` says
 */
function realizerOutline(real: Realizer, width: number | null, height: number | null): YedOutline | null {
    const shape = treeChild(real.r, "Shape");
    if (shape !== undefined) {
        return typeOutline(treeAttr(shape, "type"), "rectangle");
    }
    if (real.type === "GenericNode") {
        return genericOutline(real.r);
    }
    return real.type === "UMLNoteNode" && width !== null && height !== null ? noteOutline(width, height) : null;
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

/**
 * yEd's label positions (`modelPosition` of the internal, sides, sandwich, corners and eight-position models), as in
 * yFiles' InteriorLabelModel and ExteriorLabelModel: `c` and the places `t`, `b`, `l`, `r`, `tl`, `tr`, `bl`, `br`
 * are inside the node (the internal model, yEd's default when a label names no model); the compass places `n`, `s`,
 * `e`, `w`, `nw`, `ne`, `sw`, `se` are outside it.
 */
const YED_POSITIONS: ReadonlyMap<string, string> = new Map([
    ["c", "center"],
    ["t", "inside-top"],
    ["b", "inside-bottom"],
    ["l", "inside-left"],
    ["r", "inside-right"],
    ["tl", "inside-top-left"],
    ["tr", "inside-top-right"],
    ["bl", "inside-bottom-left"],
    ["br", "inside-bottom-right"],
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
 * Whether yEd draws a label: it is visible and has words.
 * @param label - the label element
 * @returns true when it is drawn
 */
function labelShown(label: unknown): boolean {
    const hidden = treeAttr(label, "visible") === "false" || treeAttr(label, "hasText") === "false";
    return !hidden && (treeText(label)?.trim() ?? "").length > 0;
}

/**
 * Reads an element's label: the first visible label with text (yEd icon nodes put an empty, `hasText="false"`
 * label first); further visible labels are noted for the element.
 * @param labels - the label elements, in file order
 * @param node - whether they are node labels (which have a position)
 * @param put - receives the values
 * @param at - the sites
 * @param geometry - a node label's node `y:Geometry`, which places the label inside or outside the node
 * @param uml - whether the node is a UML class
 */
function readLabels(
    labels: readonly unknown[],
    node: boolean,
    put: PutValue,
    at: SiteOf,
    geometry?: unknown,
    uml = false,
): void {
    let label: unknown = undefined;
    let text = "";
    let extra = 0;
    for (const l of labels) {
        if (!labelShown(l)) {
            continue;
        }
        if (label === undefined) {
            label = l;
            text = treeText(l)?.trim() ?? "";
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
    if (node && !uml) {
        readSmartPlace(label, geometry, put);
    }
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
        const position = sizedLabelPosition(label, nodeLabelPosition(label, geometry, at));
        put("labelPosition", position);
        readInsideInset(label, geometry, position, put);
        readCroppedWrap(label, geometry, put);
        readLabelBoxSize(label, position, put);
        readOutsideOffset(label, geometry, position, put);
    }
}

/**
 * Reads where a SmartNodeLabelModel pins a label over its node: yEd puts the point `labelRatio` of the label's box on
 * the screen (-0.5..0.5 of its size from its middle) on the point `nodeRatio` of the node, moved by the offsets, and
 * places it by these on load, not by the box's stored place. Its stored size is the size yEd drew it. A UML class draws
 * its stereotype above the label, so there the stored place is the true one, and a box beside the node has its side.
 * @param label - the label element
 * @param geometry - the node's `y:Geometry`
 * @param put - receives the values
 */
function readSmartPlace(label: unknown, geometry: unknown, put: PutValue): void {
    const smart = treeChild(treeChild(label, "ModelParameter"), "SmartNodeLabelModelParameter");
    if (smart === undefined || sizedLabelPosition(label, boxPosition(label, geometry)) !== "center") {
        return;
    }
    const num = (o: unknown, k: string): number => {
        const n = Number(treeAttr(o, k));
        return Number.isFinite(n) ? n : 0;
    };
    const turn = (num(label, "rotationAngle") * Math.PI) / 180;
    const [cos, sin] = [Math.abs(Math.cos(turn)), Math.abs(Math.sin(turn))];
    const [w, h] = [num(label, "width"), num(label, "height")];
    const point = (axis: "X" | "Y", extent: string, drawn: number): number =>
        Math.round(
            1000 *
                (num(smart, `nodeRatio${axis}`) * num(geometry, extent) +
                    num(smart, `offset${axis}`) -
                    num(smart, `labelRatio${axis}`) * drawn),
        ) / 1000;
    put("labelOffsetX", point("X", "width", w * cos + h * sin));
    put("labelOffsetY", point("Y", "height", w * sin + h * cos));
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
 * Where a label as tall as its node is drawn: yEd centers the label's box, which then fills the node, and writes the
 * words at the top of that box, so a label in the middle is drawn inside the node's top.
 * @param label - the label element
 * @param position - where its model and box place it
 * @returns the position
 */
function sizedLabelPosition(label: unknown, position: string | null): string | null {
    return position === "center" && yedLabelFillsNodeHeight(treeAttr(label, "autoSizePolicy"))
        ? "inside-top"
        : position;
}

/**
 * Whether yEd sized a label's box: it writes every box it drew; graphty's own GraphML writer stores none, and what it
 * means is in the file's style block.
 * @param label - the label element
 * @returns true when the label has a stored width
 */
function hasStoredBox(label: unknown): boolean {
    return Number.isFinite(Number(treeAttr(label, "width") ?? Number.NaN));
}

/**
 * Reads what a label's box is sized to; a box as wide as its node lines its words up by the label's `alignment`.
 * @param label - the label element
 * @param position - where the label is placed
 * @param put - receives the values
 */
function readLabelBoxSize(label: unknown, position: string | null, put: PutValue): void {
    if (!hasStoredBox(label)) {
        return;
    }
    const policy = treeAttr(label, "autoSizePolicy");
    put("labelBox", yedLabelBox(policy, position));
    if (yedLabelFillsNodeWidth(policy)) {
        put("labelTextAlign", treeAttr(label, "alignment") ?? null);
    }
}

/**
 * The width a `CroppingLabel` breaks its words at: yEd lines them up inside a label box sized to its node.
 * @param label - the label element
 * @param geometry - the node's `y:Geometry`
 * @param put - receives the value
 */
function readCroppedWrap(label: unknown, geometry: unknown, put: PutValue): void {
    const width = Number(treeAttr(geometry, "width"));
    if (treeAttr(label, "configuration") === "CroppingLabel" && Number.isFinite(width)) {
        put("labelWrapWidth", width - 2 * YED_LABEL_PADDING);
    }
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
    if (position?.startsWith("inside-") !== true || !hasStoredBox(label)) {
        return;
    }
    // a label sized to its node (a group's header band) has no inset along the side its box fills
    const policy = treeAttr(label, "autoSizePolicy");
    const [across, down] = [!yedLabelFillsNodeWidth(policy), !yedLabelFillsNodeHeight(policy)];
    const num = (o: unknown, k: string): number => Number(treeAttr(o, k) ?? Number.NaN);
    const [x, y, w, h] = ["x", "y", "width", "height"].map((k) => num(label, k));
    const [nw, nh] = [num(geometry, "width"), num(geometry, "height")];
    // a box stored without its place has the model's own inset
    const inset = (value: number): number | null => {
        if (Number.isNaN(value)) {
            return YED_INSIDE_INSET;
        }
        return value > 0 ? Math.round(value * 1000) / 1000 : null;
    };
    if (across && position.includes("left")) {
        put("labelOffsetX", inset(x));
    } else if (across && position.includes("right")) {
        const gap = inset(nw - x - w);
        put("labelOffsetX", gap === null ? null : -gap);
    }
    if (down && position.includes("top")) {
        put("labelOffsetY", inset(y));
    } else if (down && position.includes("bottom")) {
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
    // with a stored box over the node, `readSmartPlace` pins the label; the ratios name a side only when none is stored
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
    if (yedDefaultPainted(real)) {
        return canonEnum("shape", "rectangle", "yed", at("shape"));
    }
    if (real.type === "GenericNode") {
        const lower = (treeAttr(real.r, "configuration") ?? "").slice(0, MAX_STYLE_VALUE_LENGTH).toLowerCase();
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

/** The direction a gradient on a node yEd has no measured drawing for (a group, a UML or picture node) is read in. */
const YED_GRADIENT_ANGLE = 45;

/**
 * Whether a GenericNode names a configuration of yEd's old `com.yjava` family (BevelNode, ShinyPlateNode and their
 * variants), which yEd 3.25 no longer registers under that name: it draws the node with its default painter, a box in
 * the fill's color and a solid line of 1 in the border's color, without `color2`, the border's width or its dashes
 * (yed-graphml-specimen-node-shapes-p2, graphml-synthetic-nodes). The same names without the prefix are its bevels.
 * @param real - the realizer
 * @returns true for a node yEd draws with its default painter
 */
function yedDefaultPainted(real: Realizer): boolean {
    return real.type === "GenericNode" && /^com\.yjava\./i.test(treeAttr(real.r, "configuration") ?? "");
}

/**
 * The direction yEd draws a realizer's gradient in: a generic node, and a shape node's diamond, corner to corner; any
 * other shape node left to right (`yedGradientAngle`); a table or pool draws none (yed-graphml-specimen-groups, its
 * p2 and graphml-synthetic-nodes' table-node are flat in `color`); other realizers keep a corner-to-corner ramp.
 * @param real - the realizer
 * @returns the `fillGradientAngle`, or null for no gradient
 */
function realizerGradientAngle(real: Realizer): number | null {
    if (real.type === "TableNode") {
        return null;
    }
    const geometry = treeChild(real.r, "Geometry");
    const [w, h] = [Number(treeAttr(geometry, "width")), Number(treeAttr(geometry, "height"))];
    if (real.type === "ShapeNode") {
        const diamond = treeAttr(treeChild(real.r, "Shape"), "type") === "diamond";
        return yedGradientAngle(diamond ? "corner" : "across", w, h);
    }
    return real.type === "GenericNode" ? yedGradientAngle("corner", w, h) : YED_GRADIENT_ANGLE;
}

/**
 * Whether a `y:Fill` paints nothing.
 * @param fill - the `y:Fill`
 * @returns true for no color or a transparent one
 */
function unfilled(fill: unknown): boolean {
    return treeAttr(fill, "hasColor") === "false" || treeAttr(fill, "transparent") === "true";
}

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
    if (unfilled(fill)) {
        noteAt(at("fill"), STYLE_ISSUE.NO_FILL, "transparent");
        put("fillOpacity", 0);
        return;
    }
    readColor(treeAttr(fill, "color"), "fill", "fillOpacity", put, at);
    const second = yedDefaultPainted(real) ? null : canonColor(treeAttr(fill, "color2"), "yed", at("fillGradient"));
    const angle = second === null ? null : realizerGradientAngle(real);
    if (second !== null && angle !== null) {
        put("fillGradient", second.color);
        put("fillGradientAngle", angle);
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
    )
        .filter(([size]) => size > 0)
        // yEd paints neighbouring lanes of one color as one band
        .reduce<[number, string][]>((merged, [size, color]) => {
            const last = merged.at(-1);
            if (last?.[1] === color) {
                last[0] += size;
            } else {
                merged.push([size, color]);
            }
            return merged;
        }, []);
    put("stripeColors", bands.map(([, color]) => color).join(" "));
    put("stripeSizes", bands.map(([size]) => String(Number((size / total).toFixed(6)))).join(" "));
    if (across) {
        put("stripeDirection", "right");
    }
}

/** The depth of an entity's header over its lines of words, and each line against the font's size (yEd 3.25.1). */
const ENTITY_HEADER_INSET = 12;
const ENTITY_HEADER_LINE = 1.164;

/**
 * Reads the header of an entity relationship node: yEd paints its name label's background not behind the words but
 * across the node, down to `12 + 1.164 x font size` per line of the name (graphml-galaxy-lcms-workflow's one and two
 * lines at 12, yed-graphml-specimen-labels at 10). The line yEd draws under the header is not drawn.
 * @param real - the realizer
 * @param height - the node's height
 * @param put - receives the values
 * @param at - the sites
 * @returns the name label, whose background is the header, or null for a node with no header
 */
function readEntityHeader(real: Realizer, height: number | null, put: PutValue, at: SiteOf): unknown {
    const name = treeChildren(real.r, "NodeLabel").find(
        (l) => treeAttr(l, "configuration")?.toLowerCase() === "com.yworks.entityrelationship.label.name",
    );
    const color =
        name === undefined || treeAttr(name, "hasBackgroundColor") === "false"
            ? null
            : canonColor(treeAttr(name, "backgroundColor"), "yed", at("stripeColors"))?.color;
    if (color === null || color === undefined || height === null || height <= 0) {
        return null;
    }
    const lines = (treeText(name)?.trim() ?? "").split("\n").length;
    const size = Number(treeAttr(name, "fontSize") ?? 12) || 12;
    const depth = ENTITY_HEADER_INSET + lines * ENTITY_HEADER_LINE * size;
    put("stripeColors", color);
    put("stripeSizes", String(Number(Math.min(1, depth / height).toFixed(6))));
    return name;
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
 * the node's box, as yEd draws `y:ImageNode` and `y:SVGNode`, with neither the realizer's fill nor its border
 * (`readNode`).
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
 * A color as Java's `Color.darker()` paints it: each channel at 0.7.
 * @param hex - the `#rrggbb` color
 * @returns the darker color
 */
function javaDarker(hex: string): string {
    return hexOf(channelsOf(hex).map((c) => Math.floor(c * 0.7)));
}

/**
 * A color as Java's `Color.brighter()` paints it: each channel over 0.7, a channel under 3 raised to 3 first, and black
 * as `#030303`.
 * @param hex - the `#rrggbb` color
 * @returns the brighter color
 */
function javaBrighter(hex: string): string {
    const channels = channelsOf(hex);
    return channels.every((c) => c === 0)
        ? "#030303"
        : hexOf(channels.map((c) => Math.min(255, Math.floor((c > 0 && c < 3 ? 3 : c) / 0.7))));
}

/**
 * The red, green and blue of a color.
 * @param hex - the `#rrggbb` color
 * @returns the three channels, 0 to 255
 */
function channelsOf(hex: string): number[] {
    return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

/**
 * A color from its channels.
 * @param channels - red, green and blue, 0 to 255
 * @returns the `#rrggbb` color
 */
function hexOf(channels: number[]): string {
    return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Writes the raised border Java's `fill3DRect` draws round a fill of this color: strips of 1 px in its `brighter()` and
 * `darker()` colors, no line. No fill draws no strips.
 * @param fill - the `#rrggbb` fill, or null
 * @param put - receives the values
 */
export function putRaisedBorder(fill: string | null, put: PutValue): void {
    put("borderWidth", 0);
    if (fill !== null) {
        put("raisedBorderWidth", 1);
        put("raisedBorderLightColor", javaBrighter(fill));
        put("raisedBorderDarkColor", javaDarker(fill));
    }
}

/**
 * A color a share of the way to white.
 * @param hex - the `#rrggbb` color
 * @param share - how far, 0 to 1
 * @returns the lighter color
 */
export function towardWhite(hex: string, share: number): string {
    return hexOf(channelsOf(hex).map((c) => Math.round(c + (255 - c) * share)));
}

/**
 * Writes the paint of yFiles' bevel, which yEd's BevelNode family and yEd Live's BevelNodeStyle share: its upper half
 * a ramp from three quarters of the way to white down to a fifth of the way, its lower half flat in its color
 * (`yed-graphml-specimen-node-shapes-p2`, `yed-live-graphml-specimen-node-shapes-p2`).
 * @param color - the `#rrggbb` color
 * @param put - receives the values
 */
export function putBevelPaint(color: string, put: PutValue): void {
    put("fillGradientColors", `${towardWhite(color, 0.75)} ${towardWhite(color, 0.2)} ${color} ${color}`);
    put("fillGradientStops", "0 0.5 0.5 1");
    put("fillGradientAngle", 90);
}

/**
 * Writes the line a bevel draws inside its edge, in the node's border color, in place of a border: a box `inset` in
 * from the node's, its corners `radius` less that. yFiles draws it over a wider, lighter line (`shapeLineHaloColor`),
 * which the reader of each style writes where it knows that line's color.
 * @param radius - the node's corner radius
 * @param inset - how far in the line runs
 * @param put - receives the values
 */
export function putBevelLine(radius: number, inset: number, put: PutValue): void {
    const r = Math.max(0, radius - inset);
    const steps = r > 0 ? 4 : 0;
    const side = (sign: number, d: number): string => `${String(sign)}${sign < 0 ? "+" : "-"}${d.toFixed(3)}`;
    const corners = [
        [-1, 1],
        [1, 1],
        [1, -1],
        [-1, -1],
    ].flatMap(([sx, sy], corner) =>
        Array.from({ length: steps + 1 }, (_, i) => {
            // the corners of the top right and bottom left run from the top or bottom side to the other
            const a = ((corner % 2 === 0 ? i : steps - i) / (steps || 1)) * (Math.PI / 2);
            const [dx, dy] = [inset + r * (1 - Math.cos(a)), inset + r * (1 - Math.sin(a))];
            return `${side(sx, dx)},${side(sy, dy)}`;
        }),
    );
    put("borderWidth", 0);
    put("shapeLineWidth", 1);
    put("shapeLines", [...corners, corners[0]].join(" "));
}

/**
 * Writes the bevel of one of yEd's BevelNode family.
 * @param outline - its outline
 * @param color - its `#rrggbb` fill, or null for none
 * @param inset - how far in its line runs
 * @param lined - whether its border has a color: with none it draws no line
 * @param put - receives the values
 */
function putBevel(outline: YedOutline, color: string | null, inset: number, lined: boolean, put: PutValue): void {
    if (color !== null) {
        putBevelPaint(color, put);
    }
    if (lined) {
        putBevelLine(Number(outline.cornerRadius), inset, put);
    }
}

/**
 * Writes the paint of yFiles' PanelNodeStyle: a ramp down from three quarters of the way to white into its color, and a
 * line of 1 in its color at 0.8. yFiles runs that line into the color from top left to bottom right; it is drawn flat.
 * @param color - the `#rrggbb` color
 * @param put - receives the values
 */
export function putPanelPaint(color: string, put: PutValue): void {
    put("fill", towardWhite(color, 0.75));
    put("fillGradient", color);
    put("fillGradientAngle", 90);
    put("borderColor", hexOf(channelsOf(color).map((c) => Math.round(c * 0.8))));
    put("borderWidth", 1);
}

/**
 * Whether a `y:BorderStyle` draws a line: not with no color, nor with a color of no alpha at all (`#FFFFFF00`,
 * graphml-stm32-func).
 * @param border - the `y:BorderStyle`, if any
 * @returns true for a line
 */
function hasLine(border: unknown): boolean {
    const color = treeAttr(border, "color");
    return treeAttr(border, "hasColor") !== "false" && !/^#[0-9a-f]{6}00$/i.test(String(color));
}

/**
 * Reads a node realizer's border.
 * @param border - the `y:BorderStyle`, if any
 * @param put - receives the values
 * @param at - the sites
 */
function readBorder(border: unknown, put: PutValue, at: SiteOf): void {
    if (border === undefined) {
        return;
    }
    if (hasLine(border)) {
        readColor(treeAttr(border, "color"), "borderColor", null, put, at);
        put("borderWidth", yedDrawnWidth(canonNumber(treeAttr(border, "width"), at("borderWidth"))));
    } else {
        put("borderWidth", 0);
    }
    put("borderStyle", canonEnum("borderStyle", treeAttr(border, "type"), "yed", at("borderStyle")));
}

/**
 * Writes what yEd strokes over a node beside its outline (`realizerOverlay`) as the node's picture.
 * @param real - the realizer
 * @param width - the node's width
 * @param height - its height
 * @param painted - the border values written for it
 * @param put - receives the values
 */
function putOverlay(
    real: Realizer,
    width: number,
    height: number,
    painted: ReadonlyMap<string, unknown>,
    put: PutValue,
): void {
    const [color, line] = [painted.get("borderColor"), Number(painted.get("borderWidth") ?? 1)];
    const paint: NodePaint = {
        line: line > 0 && typeof color === "string" ? color : "none",
        width: Math.max(line, 0),
    };
    const overlay = realizerOverlay(real, width, height, paint);
    if (overlay === null) {
        return;
    }
    put("image", overlay.picture);
    put("imageClip", "none");
    if (overlay.reach === 0) {
        put("imageFit", "fill");
        return;
    }
    put("imageFit", "none");
    put("imageWidth", width - paint.width + overlay.reach);
    put("imageHeight", height - paint.width + overlay.reach);
    put("imageOffsetX", overlay.reach / 2);
    put("imageOffsetY", overlay.reach / 2);
}

/**
 * Reads what a node realizer draws over its fill: a table's bands, an image or SVG node's picture, or what yEd strokes
 * over the node beside its outline (`putOverlay`).
 * @param real - the realizer
 * @param width - the node's width, or null
 * @param height - its height, or null
 * @param painted - the border values written for it
 * @param put - receives the values
 * @param at - the sites
 * @param resources - the graph's shared pictures, for image and SVG nodes
 */
function readFace(
    real: Realizer,
    width: number | null,
    height: number | null,
    painted: ReadonlyMap<string, unknown>,
    put: PutValue,
    at: SiteOf,
    resources?: ReadonlyMap<string, string>,
): void {
    if (real.type === "TableNode") {
        readTable(real, put, at);
    }
    if (resources !== undefined && (real.type === "ImageNode" || real.type === "SVGNode")) {
        readPicture(real, resources, put);
    }
    if (width !== null && height !== null) {
        putOverlay(real, width, height, painted, put);
    }
}

/**
 * Reads what yEd draws inside a GenericNode beside its outline (`yedNodePicture`) as a picture over the
 * node's box as drawn: a node kept square in a box of another shape is drawn in the middle square.
 * @param real - the realizer
 * @param outline - its outline, if known
 * @param size - its stored size
 * @param size.width - its width
 * @param size.height - its height
 * @param fill - its fill, or null
 * @param put - receives the values
 * @param at - the sites
 */
function readMarks(
    real: Realizer,
    outline: YedOutline | null,
    size: { width: number; height: number },
    fill: string | null,
    put: PutValue,
    at: SiteOf,
): void {
    const aspect = outline?.aspect;
    const width = aspect === undefined ? size.width : Math.min(size.width, size.height * aspect);
    const height = aspect === undefined ? size.height : width / aspect;
    const border = treeChild(real.r, "BorderStyle");
    const props = treeChildren(treeChild(real.r, "StyleProperties"), "Property");
    const picture = yedNodePicture({
        kind: real.type === "GenericNode" ? (treeAttr(real.r, "configuration") ?? "") : real.type,
        property: (name) =>
            treeAttr(
                props.find((p) => treeAttr(p, "name") === `com.yworks.bpmn.${name}`),
                "value",
            )?.slice(0, MAX_STYLE_VALUE_LENGTH),
        width,
        height,
        fill,
        line: hasLine(border) ? (canonColor(treeAttr(border, "color"), "yed", at("borderColor"))?.color ?? null) : null,
        border: hasLine(border) ? (yedDrawnWidth(canonNumber(treeAttr(border, "width"), at("borderWidth"))) ?? 1) : 0,
    });
    if (picture !== null) {
        put("image", picture);
        put("imageFit", "fill");
        put("imageClip", "none");
    }
}

/**
 * The soft shadow yEd 3.25 paints under a GenericNode (`y.view.ShadowNodePainter`), as its drawings show it: the node's
 * outline, border included, in black at 75/255, moved 2.5 down and right, its edge fading over 4 on each side
 * (`yed-graphml-specimen-node-shapes-p2`'s entity relationship nodes, `-p3`'s BPMN `.withShadow` nodes,
 * `graphml-galaxy-lcms-workflow`'s artifacts); and the one under its old `BevelNode3` and `BevelNodeWithShadow`, drawn
 * in nine pieces, moved 3 and fading over 3.5 (`-p2`).
 */
const SOFT_SHADOW = { opacity: 0.294, offset: 2.5, blur: 4 };
const LEGACY_SHADOW = { opacity: 0.294, offset: 3, blur: 3.5 };

/**
 * The shadow yEd paints under a GenericNode, or null: the one its configuration paints by default (a BPMN
 * `.withShadow` configuration, an entity relationship node, the old `BevelNode3` and `BevelNodeWithShadow`), turned on
 * or off by its `y.view.ShadowNodePainter.SHADOW_PAINTING` style property, which turns it on for any other
 * configuration (a flowchart process in `yed-graphml-specimen-node-fills-borders`). A flowchart node is drawn with none
 * by default, and an entity relationship node with `SHADOW_PAINTING` false draws none (`graphml-galaxy-lcms-workflow`).
 * @param real - the realizer
 * @returns the shadow, or null
 */
function genericShadow(real: Realizer): typeof SOFT_SHADOW | null {
    if (real.type !== "GenericNode") {
        return null;
    }
    const conf = (treeAttr(real.r, "configuration") ?? "").toLowerCase();
    const legacy = conf === "bevelnode3" || conf === "bevelnodewithshadow";
    const painting = styleProperty(real.r, "y.view.ShadowNodePainter.SHADOW_PAINTING");
    const byDefault = legacy || conf.endsWith(".withshadow") || conf.startsWith("com.yworks.entityrelationship.");
    if (painting === undefined ? !byDefault : painting !== "true") {
        return null;
    }
    return legacy ? LEGACY_SHADOW : SOFT_SHADOW;
}

/**
 * Reads the shadow drawn under a node: a `y:DropShadow` (a hard copy of the node's shape in its color, moved by its
 * offsets, as yEd draws it in `yed-graphml-specimen-node-fills-borders`), or the soft one a GenericNode's painter draws
 * (`genericShadow`).
 * @param real - the realizer
 * @param put - receives the values
 * @param at - the sites
 */
function readShadow(real: Realizer, put: PutValue, at: SiteOf): void {
    const drop = treeChild(real.r, "DropShadow");
    if (drop !== undefined) {
        const color = canonColor(treeAttr(drop, "color"), "yed", at("shadowColor"));
        if (color !== null) {
            put("shadowColor", color.color);
            put("shadowOpacity", color.alpha);
            put("shadowBlur", 0);
            put("shadowOffsetX", canonSigned(treeAttr(drop, "offsetX") ?? "0", at("shadowOffsetX")));
            put("shadowOffsetY", canonSigned(treeAttr(drop, "offsetY") ?? "0", at("shadowOffsetY")));
            return;
        }
    }
    const soft = genericShadow(real);
    if (soft !== null) {
        put("shadowColor", "#000000");
        put("shadowOpacity", soft.opacity);
        put("shadowBlur", soft.blur);
        put("shadowOffsetX", soft.offset);
        put("shadowOffsetY", soft.offset);
    }
}

/**
 * The fill an outline darkens, and the raised and bevelled borders it draws round it.
 * @param r - the node realizer element
 * @param outline - the node's outline, or null for a plain shape
 * @param border - its y:BorderStyle
 * @param put - receives the values
 * @param at - the sites
 * @returns the node's fill color, or null
 */
function readOutlineFaces(
    r: unknown,
    outline: ReturnType<typeof realizerOutline>,
    border: unknown,
    put: PutValue,
    at: SiteOf,
): string | null {
    const fill = treeChild(r, "Fill");
    const color = canonColor(treeAttr(fill, "color"), "yed", at("fill"))?.color ?? null;
    const face = unfilled(fill) ? null : color;
    if (outline?.darker === true) {
        put("fill", color === null ? null : javaDarker(color));
    }
    if (outline?.raised === true || treeAttr(treeChild(r, "UML"), "use3DEffect") === "true") {
        putRaisedBorder(face, put);
    }
    if (outline?.bevelInset !== undefined) {
        putBevel(outline, face, outline.bevelInset, hasLine(border), put);
    }
    return color;
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
    const pictured = real.type === "ImageNode" || real.type === "SVGNode";
    // yEd paints an image or SVG node's picture alone, never its y:Fill or y:BorderStyle (its own SVGs of
    // graphml-stm32-func and graphml-synthetic-nodes draw an <image> and no #CCCCFF box): a node of no shape
    if (!pictured) {
        readFill(real, put, at);
    }
    const border = pictured ? undefined : treeChild(r, "BorderStyle");
    const painted = new Map<string, unknown>();
    readBorder(
        border,
        (property, value) => {
            painted.set(property, value);
            put(property, value);
        },
        at,
    );
    if (yedDefaultPainted(real) && border !== undefined && hasLine(border)) {
        put("borderWidth", 1);
        put("borderStyle", canonEnum("borderStyle", "line", "yed", at("borderStyle")));
    }
    const geometry = treeChild(r, "Geometry");
    const width = canonNumber(treeAttr(geometry, "width"), at("width"));
    const height = canonNumber(treeAttr(geometry, "height"), at("height"));
    put("width", width);
    put("height", height);
    const outline = realizerOutline(real, width, height);
    if (pictured) {
        put("shape", "none");
    } else if (outline === null) {
        put("shape", realizerShape(real, at));
    } else {
        putOutline(outline, width, height, put);
    }
    const color = readOutlineFaces(r, outline, border, put, at);
    if (width !== null && height !== null && real.type === "GenericNode") {
        readMarks(real, outline, { width, height }, color, put, at);
    }
    readShadow(real, put, at);
    readFace(real, width, height, painted, put, at, resources);
    const header = readEntityHeader(real, height, put, at);
    const drop = umlNameDrop(r);
    const labelPut: PutValue = (property, value) => {
        if (header === null || property !== "labelBackground") {
            put(property, property === "labelOffsetY" && typeof value === "number" ? value + drop : value);
        }
    };
    readLabels(treeChildren(r, "NodeLabel"), true, labelPut, at, geometry, treeChild(r, "UML") !== undefined);
}

/**
 * How far yEd draws a UML class's name below where its `internal` label model puts it: under the stereotype, when it
 * has one (`yed-graphml-specimen-node-shapes-p3` uml-stereotype, `graphml-synthetic-nodes` uml-class). A label of
 * another model is stored where it is drawn (`graphml-libcitygml-mapping`).
 * @param r - the node realizer element
 * @returns the drop, 0 for any other node
 */
function umlNameDrop(r: unknown): number {
    const label = treeChildren(r, "NodeLabel")[0];
    const stereotype = treeAttr(treeChild(r, "UML"), "stereotype") ?? "";
    const internalTop = treeAttr(label, "modelName") === "internal" && treeAttr(label, "modelPosition") === "t";
    return stereotype !== "" && internalTop ? Math.round(YED_UML_STEREOTYPE_DROP * 1000) / 1000 : 0;
}

/**
 * The width yEd draws a line or a node's border of a given width: the whole pixels of it, at least 1. 0.2, 0.5, 1.5
 * and 1.9 draw 1, 2.5 and 2.9 draw 2, 3.5 draws 3, 7.5 draws 7 (yEd 3.25.1's own SVG export of a sheet of each width,
 * lines and borders alike; yed-graphml-specimen-arrows, yed-graphml-specimen-node-fills-borders).
 * @param width - the file's width
 * @returns the drawn width
 */
export function yedDrawnWidth(width: number | null): number | null {
    return width !== null && width > 0 ? Math.max(1, Math.floor(width)) : width;
}

/**
 * The arrows yEd draws at another size than the shape they read as, as fractions of its length and width
 * (yed-graphml-specimen-arrows at line width 1): `short` is a standard head (12 x 10) drawn 8 x 12, and `concave` and
 * `convex` are `plain`'s two arms (12 x 12) drawn 10 x 12 and 10 x 10.
 */
const YED_ARROW_SIZES: ReadonlyMap<unknown, { length: number; width?: number }> = new Map([
    ["short", { length: 8 / 12, width: 12 / 10 }],
    ["concave", { length: 10 / 12 }],
    ["convex", { length: 10 / 12, width: 10 / 12 }],
]);

/**
 * How long yEd draws an arrow as a fraction of its shape's length.
 * @param arrow - the arrow's name in the file
 * @returns the fraction, or null for the shape's own length
 */
export function yedArrowLength(arrow: unknown): number | null {
    return YED_ARROW_SIZES.get(arrow)?.length ?? null;
}

/**
 * How wide yEd draws an arrow as a fraction of its shape's width.
 * @param arrow - the arrow's name in the file
 * @returns the fraction, or null for the shape's own width
 */
export function yedArrowWidth(arrow: unknown): number | null {
    return YED_ARROW_SIZES.get(arrow)?.width ?? null;
}

/**
 * Reads a framed edge (GenericEdge `com.yworks.edge.framed`) as yEd draws it: a closed outline 1 wide in the line's
 * color round a band as wide as the line, filled with `FramedEdgePainter.fillColor` (graphml-galaxy-lcms-workflow: a
 * band 3 wide stroked 1 wide over a #ffffff fill of the same outline). The fill is the line, 1 narrower than the band,
 * and the outline reaches 1 past the band each side: 2 wider than the line. With no fill color yEd draws the outline
 * alone (graphml-synthetic-edges), as is a band too narrow to show a fill inside its outline: one line 1 wider than the
 * band, in the line's color.
 * @param r - the realizer element
 * @param line - its `y:LineStyle`
 * @param put - receives the values
 * @param at - the sites
 */
function readFramedEdge(r: unknown, line: unknown, put: PutValue, at: SiteOf): void {
    const band = canonNumber(treeAttr(line, "width"), at("width")) ?? 1;
    const props = treeChildren(treeChild(r, "StyleProperties"), "Property");
    const fill = treeAttr(
        props.find((p) => treeAttr(p, "name") === "FramedEdgePainter.fillColor"),
        "value",
    );
    if (fill === undefined || band <= 1) {
        put("width", band + 1);
        return;
    }
    readColor(treeAttr(line, "color"), "outlineColor", "outlineOpacity", put, at);
    // its arrowheads are part of the outline, in the line's color (yed-graphml-specimen-edges-lines generic-framed)
    readColor(treeAttr(line, "color"), "sourceArrowColor", null, put, at);
    readColor(treeAttr(line, "color"), "targetArrowColor", null, put, at);
    readColor(fill, "color", "opacity", put, at);
    put("width", band - 1);
    put("outlineWidth", 2);
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
        put("width", yedDrawnWidth(canonNumber(treeAttr(line, "width"), at("width"))));
        put("lineStyle", canonEnum("lineStyle", treeAttr(line, "type"), "yed", at("lineStyle")));
        if (real.type === "GenericEdge" && treeAttr(r, "configuration") === "com.yworks.edge.framed") {
            readFramedEdge(r, line, put, at);
        }
    }
    const arrows = treeChild(r, "Arrows");
    if (arrows !== undefined) {
        put("sourceArrow", canonEnum("arrow", treeAttr(arrows, "source"), "yed", at("sourceArrow")));
        put("targetArrow", canonEnum("arrow", treeAttr(arrows, "target"), "yed", at("targetArrow")));
        put("sourceArrowLength", yedArrowLength(treeAttr(arrows, "source")));
        put("targetArrowLength", yedArrowLength(treeAttr(arrows, "target")));
        put("sourceArrowWidth", yedArrowWidth(treeAttr(arrows, "source")));
        put("targetArrowWidth", yedArrowWidth(treeAttr(arrows, "target")));
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

/**
 * Where graphty-element hangs an edge's label on a route drawn through these points (its centers and bends): the
 * middle of its middle segment, or the joint between its two middle ones; `labelOffsetX` / `labelOffsetY` move it
 * from there.
 * @param points - the route, from the source's center to the target's
 * @returns the point
 */
export function routeMiddle(points: readonly BendPoint[]): BendPoint {
    const m = points.length - 1;
    if (m % 2 === 0) {
        return points[m / 2];
    }
    const [a, b] = [points[(m - 1) / 2], points[(m + 1) / 2]];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Where a yEd edge label model's position sits: along the line, and -1 left of it, 0 on it, 1 right of it. */
type EdgeSpot = readonly ["source" | "middle" | "target", -1 | 0 | 1];

/** Each yEd edge label model's positions, `model/position` (yed-graphml-specimen-edge-labels). */
const YED_EDGE_SPOTS: ReadonlyMap<string, EdgeSpot> = new Map([
    ["centered/center", ["middle", 0]],
    ["center_slider/center", ["middle", 0]],
    ["side_slider/center", ["middle", -1]],
    ["two_pos/head", ["middle", -1]],
    ["two_pos/tail", ["middle", 1]],
    ["three_center/scentr", ["source", 0]],
    ["three_center/center", ["middle", 0]],
    ["three_center/tcentr", ["target", 0]],
    ["six_pos/shead", ["source", -1]],
    ["six_pos/head", ["middle", -1]],
    ["six_pos/thead", ["target", -1]],
    ["six_pos/stail", ["source", 1]],
    ["six_pos/tail", ["middle", 1]],
    ["six_pos/ttail", ["target", 1]],
] as [string, EdgeSpot][]);

/** How far from the line's end yEd starts a label at a source or target position. */
const YED_EDGE_LABEL_END = 10;

/** A label's box round its lines of words: yEd's padding, and each line against the font's size. */
export const YED_LABEL_BOX_PADDING = 4;
export const YED_LABEL_LINE = 1.164;

/** A label's words against their font size, for a file that stores no width. */
export const YED_LABEL_CHARACTER = 0.55;

/**
 * Where a line from a point in a box leaves the box, or the line's end for one that stays inside.
 * @param box - the box's center x and y, width and height
 * @param from - the point
 * @param to - the line's end
 * @returns the point
 */
function boxExit(box: readonly number[], from: BendPoint, to: BendPoint): BendPoint {
    const [x, y, w, h] = box;
    const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
    const reach = (d: number, start: number, middle: number, half: number): number =>
        d === 0 ? Infinity : Math.max(0, (middle + Math.sign(d) * half - start) / d);
    const k = Math.min(1, reach(dx, from[0], x, w / 2), reach(dy, from[1], y, h / 2));
    return [from[0] + k * dx, from[1] + k * dy];
}

/**
 * A point along a polyline and the way the line runs there.
 * @param line - the polyline
 * @param distance - how far from its start
 * @returns the point and its direction
 */
export function pointAlong(line: readonly BendPoint[], distance: number): { at: BendPoint; dir: BendPoint } {
    let left = distance;
    for (let i = 1; i < line.length; i++) {
        const [a, b] = [line[i - 1], line[i]];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > 0 && (left <= len || i === line.length - 1)) {
            const dir: BendPoint = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
            return { at: [a[0] + left * dir[0], a[1] + left * dir[1]], dir };
        }
        left -= len;
    }
    return { at: line[0], dir: [1, 0] };
}

/**
 * A polyline's length.
 * @param line - the polyline
 * @returns its length
 */
export function lineLength(line: readonly BendPoint[]): number {
    return line.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);
}

/** What a yEd edge label's place is worked out from. */
interface YedEdgeLabel {
    /** Its model's name and position, as `YED_EDGE_SPOTS` keys them. */
    spot: string;
    /** The file's `x`, `y`, `width` and `height`, where the file's box is the label's place; null where its model is. */
    stored: readonly number[] | null;
    /** Whether a stored box is in the file's coordinates (yEd's GML), not from where the line starts (its GraphML). */
    storedOnPage?: boolean;
    /** How far it stays clear of the line. */
    distance: number;
    width: number;
    fontSize: number;
    lines: number;
}

/**
 * The middle of a yEd edge label's box.
 * @param label - the label
 * @param line - the line drawn between the nodes' sides
 * @returns the point, or null for a model not read here
 */
function edgeLabelCenter(label: YedEdgeLabel, line: readonly BendPoint[]): BendPoint | null {
    if (label.stored !== null) {
        const [x, y, w, h] = label.stored;
        const [ox, oy] = label.storedOnPage === true ? [0, 0] : line[0];
        return [ox + x + w / 2, oy + y + h / 2];
    }
    const spot =
        YED_EDGE_SPOTS.get(label.spot) ?? YED_EDGE_SPOTS.get(`${label.spot.slice(0, label.spot.indexOf("/"))}/center`);
    if (spot === undefined) {
        return null;
    }
    const [along, side] = spot;
    const length = lineLength(line);
    const end = YED_EDGE_LABEL_END + label.width / 2;
    const reach = { source: end, middle: length / 2, target: Math.max(0, length - end) };
    const { at, dir } = pointAlong(line, reach[along]);
    const clear = label.distance + (label.lines * YED_LABEL_LINE * label.fontSize + YED_LABEL_BOX_PADDING) / 2;
    return [at[0] - side * dir[1] * clear, at[1] + side * dir[0] * clear];
}

/**
 * Puts a place worked out on the line drawn between the nodes' sides as an offset from where graphty-element hangs the
 * edge's label.
 * @param boxes - the source's and the target's center x and y, width and height
 * @param route - the route, from port to port through its bends
 * @param centerOn - the middle of the label's box on that line, or null to keep graphty's place
 * @param put - receives the values
 */
export function putEdgeLabelAt(
    boxes: readonly [readonly number[], readonly number[]],
    route: readonly BendPoint[],
    centerOn: (line: readonly BendPoint[]) => BendPoint | null,
    put: PutValue,
): void {
    const last = route.length - 1;
    const line = [
        boxExit(boxes[0], route[0], route[1]),
        ...route.slice(1, -1),
        boxExit(boxes[1], route[last], route[last - 1]),
    ];
    const center = centerOn(line);
    if (center?.every(Number.isFinite) !== true) {
        return;
    }
    const hang = routeMiddle(route);
    put("labelPosition", "center");
    put("labelOffsetX", num6(center[0] - hang[0]) || null);
    put("labelOffsetY", num6(center[1] - hang[1]) || null);
}

/**
 * Puts where yEd draws an edge's label: a model's position is an end or the middle of the line drawn between the nodes'
 * sides, on the line or `distance` clear of it to one side; a stored box is relative to where that line starts.
 * @param boxes - the source's and the target's center x and y, width and height
 * @param route - the route, from port to port through its bends
 * @param label - the label
 * @param put - receives the values
 */
export function putYedEdgeLabel(
    boxes: readonly [readonly number[], readonly number[]],
    route: readonly BendPoint[],
    label: YedEdgeLabel,
    put: PutValue,
): void {
    putEdgeLabelAt(boxes, route, (line) => edgeLabelCenter(label, line), put);
}

/**
 * Reads where yEd draws an edge's label, from the model the file names; a free label and a SmartEdgeLabelModel off the
 * line's middle by the box the file stores. A curved line, a self-loop or a label naming no model (as graphty writes
 * one, its place in the styles block) keeps graphty's place.
 * @param real - the edge realizer
 * @param nodes - each node's center x and y, width and height
 * @param source - the source node's index
 * @param target - the target node's index
 * @param put - receives the values
 */
function readEdgeLabelPlace(real: Realizer, nodes: Float64Array, source: number, target: number, put: PutValue): void {
    const label = treeChildren(real.r, "EdgeLabel").find(labelShown);
    const path = treeChild(real.r, "Path");
    const points = treeChildren(path, "Point").map((p): BendPoint => [
        Number(treeAttr(p, "x")),
        Number(treeAttr(p, "y")),
    ]);
    const model = treeAttr(label, "modelName");
    if (model === undefined || source === target || (real.type !== "PolyLineEdge" && points.length > 0)) {
        return;
    }
    const box = (k: number): number[] => [...nodes.subarray(4 * k, 4 * k + 4)];
    const [s, t] = [box(source), box(target)];
    const offset = (key: string): number => Number(treeAttr(path, key) ?? 0) || 0;
    const smart = treeChild(treeChild(label, "ModelParameter"), "SmartEdgeLabelModelParameter");
    const smartMiddle = treeAttr(smart, "position") === "center" && Number(treeAttr(smart, "ratio")) === 0.5;
    const stored = model === "free" || (model === "custom" && smart !== undefined && !smartMiddle);
    const position = smartMiddle ? "center" : (treeAttr(label, "modelPosition") ?? "tail");
    putYedEdgeLabel(
        [s, t],
        [[s[0] + offset("sx"), s[1] + offset("sy")], ...points, [t[0] + offset("tx"), t[1] + offset("ty")]],
        {
            spot: `${smartMiddle ? "centered" : model}/${position}`,
            stored: stored ? ["x", "y", "width", "height"].map((k) => Number(treeAttr(label, k))) : null,
            distance: Number(treeAttr(label, "distance") ?? 2) || 0,
            width: Number(treeAttr(label, "width")) || 0,
            fontSize: Number(treeAttr(label, "fontSize") ?? 12) || 12,
            lines: (treeText(label)?.trim() ?? "").split("\n").length,
        },
        put,
    );
}

/** Canonical values per property, by element index. */
export type ValueColumns = Partial<Record<string, (StyleValue | null)[]>>;

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
 * The height yEd gives a label of some lines of text: each line its font's ascent plus descent, and the box's padding.
 * @param text - the label's text
 * @param fontSize - its font size
 * @returns the height
 */
export function yedLabelHeight(text: string, fontSize: number): number {
    return text.split("\n").length * YED_LABEL_LINE * fontSize + YED_LABEL_BOX_PADDING;
}

/**
 * The frame of an open yEd GraphML group (a `y:ProxyAutoBoundsNode` whose active realizer is not closed): its
 * `y:Insets` plus its `y:BorderInsets` (`graphml-magiclantern-architecture`'s outer group stores left 9.1 and right 91
 * of them, and yEd draws it at its stored width), and the height yEd measures for its visible labels inside its top
 * (`internal` at `t`, `tl` or `tr`) and its bottom (`b`, `bl`, `br`), not the height the file stores (17 for a 10 pt
 * label yEd draws 15.6406 high in `yed-graphml-specimen-groups`, where the group with its label at `b` grows down).
 * @param tree - the node's graphics tree
 * @returns the frame, or null for a node that is not an open group
 */
function graphmlGroupFrame(tree: unknown): YedGroupFrame | null {
    const proxy = treeChild(tree, "ProxyAutoBoundsNode");
    const real = proxy === undefined ? null : activeRealizer(proxy);
    if (real === null || treeAttr(treeChild(real.r, "State"), "closed") === "true") {
        return null;
    }
    const side = (element: unknown, name: string, unset: number): number => {
        const v = Number(treeAttr(element, `${name}F`) ?? treeAttr(element, name));
        return element !== undefined && Number.isFinite(v) ? v : unset;
    };
    const [insets, border] = [treeChild(real.r, "Insets"), treeChild(real.r, "BorderInsets")];
    // the border insets are how far a reader has dragged the group's sides out past its insets
    const inset = (name: string): number => side(insets, name, YED_GROUP_INSETS) + side(border, name, 0);
    const shown = treeChildren(real.r, "NodeLabel").filter(
        (l) =>
            treeAttr(l, "visible") !== "false" &&
            (treeAttr(l, "modelName") ?? "internal") === "internal" &&
            (treeText(l)?.trim() ?? "") !== "",
    );
    const label = (positions: readonly string[]): number =>
        Math.max(
            0,
            ...shown
                .filter((l) => positions.includes(treeAttr(l, "modelPosition") ?? "c"))
                .map((l) => yedLabelHeight(treeText(l)?.trim() ?? "", Number(treeAttr(l, "fontSize") ?? 12) || 12)),
        );
    return {
        insets: [inset("top"), inset("left"), inset("bottom"), inset("right")],
        top: label(["t", "tl", "tr"]),
        bottom: label(["b", "bl", "br"]),
    };
}

/**
 * The boxes yEd draws the open groups of a yEd GraphML graph in (`yedGroupBounds`), by node index: left, top, right
 * and bottom, y down.
 * @param snapshot - the graph
 * @returns the boxes of the open groups with members
 */
export function graphmlGroupBounds(snapshot: GraphSnapshot): Map<number, YedBox> {
    const columns = treeColumns(snapshot.nodes);
    const treeOf = (row: number): unknown =>
        columns.map((c) => plainCell(snapshot.nodes.value(c, row))).find((t) => realizerOf(t, NODE_REALIZERS) !== null);
    if (columns.length === 0) {
        return new Map();
    }
    return yedGroupBounds(
        snapshot,
        (row) => memberBox(treeOf(row)),
        (row) => graphmlGroupFrame(treeOf(row)),
    );
}

/**
 * The box a node takes in its group: its `y:Geometry` and its labels' boxes (`x` and `y` from the node's corner,
 * `width`, `height`), as yEd grows a group round its members' labels too (`graphml-yed-voctomix`'s group reaches 31.8
 * left of its leftmost member, to the start of that member's label), hidden and empty ones included
 * (`graphml-galaxy-lcms-workflow`'s group n0::n23 ends at its member's hidden 4 x 4 label, 15.4 right of the member).
 * @param tree - the node's graphics tree
 * @returns the box, or null for a node with no geometry
 */
function memberBox(tree: unknown): YedBox | null {
    const real = realizerOf(tree, NODE_REALIZERS);
    const boxOf = (element: unknown, x0: number, y0: number): YedBox | null => {
        const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => Number(treeAttr(element, a)));
        return [x, y, w, h].every(Number.isFinite) ? [x0 + x, y0 + y, x0 + x + w, y0 + y + h] : null;
    };
    const node = boxOf(treeChild(real?.r, "Geometry"), 0, 0);
    if (node === null) {
        return null;
    }
    const labels = treeChildren(real?.r, "NodeLabel");
    const boxes = [node, ...labels.map((label) => boxOf(label, node[0], node[1]))].filter((b) => b !== null);
    return [
        Math.min(...boxes.map((b) => b[0])),
        Math.min(...boxes.map((b) => b[1])),
        Math.max(...boxes.map((b) => b[2])),
        Math.max(...boxes.map((b) => b[3])),
    ];
}

/**
 * A realizer with its `y:Geometry` replaced by a box.
 * @param real - the realizer
 * @param box - the box
 * @returns the realizer drawn at the box
 */
function realizerAt(real: Realizer, box: YedBox): Realizer {
    const geometry = {
        "@_x": String(box[0]),
        "@_y": String(box[1]),
        "@_width": String(box[2] - box[0]),
        "@_height": String(box[3] - box[1]),
    };
    const kept = Object.fromEntries(
        Object.entries(real.r as Tree).filter(([key]) => key.startsWith("@_") || localOf(key) !== "Geometry"),
    );
    return { type: real.type, r: { "y:Geometry": geometry, ...kept } };
}

/**
 * The yEd styles of a graph: each element's realizer read into canonical values.
 * @param snapshot - the graph
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @returns the values, or null when no element has a yEd realizer
 */
export function readYedStyles(snapshot: GraphSnapshot, notes: StyleNotes, budget: StyleWorkBudget): YedRead | null {
    // set by read(), which TypeScript does not see change it
    let found = false as boolean;
    const resources = yedResources(snapshot);
    // each node's center, width and height, read with the node, for its edges' routes; NaN without yEd graphics
    const boxes = new Float64Array(4 * snapshot.nodeCount).fill(Number.NaN);
    const groups = graphmlGroupBounds(snapshot);
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
                const box = groups.get(i);
                real = box === undefined ? real : realizerAt(real, box);
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
                readEdgeLabelPlace(real, boxes, snapshot.edgeSource(i), snapshot.edgeTarget(i), put);
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
    ["triangle", "delta"],
    ["triangle-open", "white_delta"],
    ["vee", "standard"],
    ["tee", "t_shape"],
    ["diamond", "diamond"],
    ["diamond-open", "white_diamond"],
    ["circle", "circle"],
    ["circle-open", "white_circle"],
    ["square", "skewed_dash"],
    ["other:skewed-dash", "skewed_dash"],
    ["crow", "crows_foot_many"],
    ["other:open-vee", "plain"],
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
            noteGradientAngle(get, approximate);
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
 * Records a gradient's angle as approximated unless it is the one yEd draws a y:ShapeNode's gradient in for its shape
 * (`realizerGradientAngle`).
 * @param get - the node's values
 * @param approximate - records approximations
 */
function noteGradientAngle(get: GetValue, approximate: Approximate): void {
    const [w, h] = [get("width"), get("height")];
    const drawn = yedGradientAngle(
        get("shape") === "diamond" ? "corner" : "across",
        typeof w === "number" ? w : 0,
        typeof h === "number" ? h : 0,
    );
    const angle = get("fillGradientAngle") ?? 0;
    if (typeof angle !== "number" || Math.abs(angle - drawn) > 0.01) {
        approximate("fillGradientAngle", angle);
    }
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
            typeof value === "string" ? yedSpelled(YED_ARROWS, value, "delta", property, approximate) : "none";
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
 * A corner's coordinate moved so a box written at another size keeps its center: a node's drawn size may be smaller
 * than the box it had (a BPMN message in a 36 x 44 box draws 36 x 24).
 * @param at - the coordinate as written
 * @param had - the box's side as written
 * @param now - the side the node is written with
 * @returns the coordinate, as written when the side is the same
 */
function centeredOn(at: string, had: string | undefined, now: StyleValue | null): string {
    const side = Number(had);
    return typeof now === "number" && Number.isFinite(side) && side !== now
        ? String(Number(at) + (side - now) / 2)
        : at;
}

/**
 * A node's position from the graphics it had: a yEd realizer's `y:Geometry` x and y, or a yFiles 3 `y:RectD`'s, moved
 * to keep the box's center where the node is written at another size.
 * @param table - the node table
 * @param columns - its tree columns
 * @param i - the node
 * @param get - the node's values (its drawn width and height)
 * @returns the x and y to write, or null
 */
function keptPosition(
    table: GraphSnapshot["nodes"],
    columns: readonly string[],
    i: number,
    get: GetValue,
): [string, string] | null {
    for (const name of columns) {
        const tree = plainCell(table.value(name, i));
        const real = realizerOf(tree, NODE_REALIZERS);
        const geometry = real === null ? treeChild(tree, "RectD") : treeChild(real.r, "Geometry");
        const x = treeAttr(geometry, real === null ? "X" : "x");
        const y = treeAttr(geometry, real === null ? "Y" : "y");
        if (x !== undefined && y !== undefined) {
            return [
                centeredOn(x, treeAttr(geometry, real === null ? "Width" : "width"), get("width")),
                centeredOn(y, treeAttr(geometry, real === null ? "Height" : "height"), get("height")),
            ];
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
    toNeutral(p, column.meta.extra, size, false);
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
        const at = keptPosition(snapshot.nodes, nodeColumns, i, get) ?? columnPosition(snapshot, i, get);
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
