/**
 * yFiles 3 styles (yFiles for HTML, yEd Live): the per-element style objects of the `NodeStyle`, `EdgeStyle`,
 * `NodeLabels`, `EdgeLabels`, `NodeGeometry` and `EdgeGeometry` keys, inline or by reference to the graph's `SharedData`, read into
 * the neutral style vocabulary. References are resolved by value with a depth limit; a reference that is circular
 * or deeper than the limit is one `W_STYLE_REFERENCE_CYCLE` note, never a hang.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { type BendPoint, canonBends, canonNodeOffsets } from "../../styles/canon/bends.js";
import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import type { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type { StyleDialect, StyleTarget, StyleWorkBudget } from "../../styles/types.js";
import { META_KEY } from "./constants.js";
import {
    BPMN_ARTIFACTS,
    configurationOutline,
    isTree,
    localOf,
    putBevelLine,
    putBevelPaint,
    putPanelPaint,
    type PutValue,
    type SiteOf,
    treeAttr,
    treeChild,
    treeChildren,
    treeText,
    valueColumns,
    type YedOutline,
    type YedRead,
} from "./styles-yed.js";

/** How deep a chain of shared references is followed. */
const MAX_REFERENCE_DEPTH = 16;

/** A style object: its element's local name and the element. */
interface StyleObject {
    readonly tag: string;
    readonly e: unknown;
}

/** `{x:Null}`: a property explicitly set to nothing. */
const NULL = Symbol("x:Null");

/** A property value resolved through references. */
type Resolved = StyleObject | string | typeof NULL | null;

/** A paint: a color in a dialect, `{x:Null}`, or nothing. */
type Paint = { readonly raw: string; readonly dialect: StyleDialect } | typeof NULL | null;

/** A `{y:GraphMLReference key}` markup extension, whatever the prefix. */
const REFERENCE = /^\{\s*[\w.-]*:?GraphMLReference\s+([^\s}]+)\s*\}$/;

/** A `{x:Null}` markup extension. */
const NULL_MARKUP = /^\{\s*[\w.-]*:?Null\s*\}$/;

/** The yFiles key types the reader reads, by the last segment of their `attr.uri`. */
type KeyKind = "NodeStyle" | "EdgeStyle" | "NodeLabels" | "EdgeLabels" | "NodeGeometry" | "EdgeGeometry" | "SharedData";
const KINDS: ReadonlySet<string> = new Set([
    "NodeStyle",
    "EdgeStyle",
    "NodeLabels",
    "EdgeLabels",
    "NodeGeometry",
    "EdgeGeometry",
]);

/**
 * The kind of a yFiles 3 column, from the `attr.uri` the importer keeps as its origin type.
 * @param type - the origin type
 * @returns the kind, or null
 */
function keyKind(type: string | null | undefined): KeyKind | null {
    if (typeof type !== "string" || !type.includes("://")) {
        return null;
    }
    const last = type.slice(type.lastIndexOf("/") + 1);
    return KINDS.has(last) || last === "SharedData" ? (last as KeyKind) : null;
}

/**
 * The columns of a table by kind.
 * @param table - the table
 * @returns kind to column name
 */
function columnsByKind(table: GraphSnapshot["nodes"]): Map<KeyKind, string> {
    const out = new Map<KeyKind, string>();
    for (const col of table) {
        const kind =
            col.dtype === "json" && col.meta.origin?.namespace === "yfiles" ? keyKind(col.meta.origin.type) : null;
        if (kind !== null && !out.has(kind)) {
            out.set(kind, col.meta.name);
        }
    }
    return out;
}

/** Resolves references against the graph's shared data, counting the ones it gives up on. */
class References {
    private readonly shared = new Map<string, StyleObject>();

    /** The references given up on: circular or deeper than the limit. */
    cycles = 0;

    /**
     * Collects the shared objects of the graph's `SharedData` value.
     * @param data - the `<data>` content of the SharedData key
     * @param yfiles26 - whether the file is yFiles for HTML 2.6's rather than 3's
     */
    constructor(
        data: unknown,
        readonly yfiles26: boolean,
    ) {
        for (const sd of treeChildren(data, "SharedData")) {
            if (isTree(sd)) {
                this.collect(sd);
            }
        }
    }

    /**
     * Collects the shared objects of one SharedData element: the first of each key wins.
     * @param sd - the element
     */
    private collect(sd: Record<string, unknown>): void {
        for (const key of Object.keys(sd).filter((k) => !k.startsWith("@_") && k !== "#text")) {
            for (const e of treeChildren(sd, localOf(key))) {
                const name = sharedKey(e);
                if (name !== null && !this.shared.has(name)) {
                    this.shared.set(name, { tag: localOf(key), e });
                }
            }
        }
    }

    /**
     * Whether a walk has gone too deep; counts it once when it has.
     * @param depth - the walk's depth
     * @returns true past the limit
     */
    tooDeep(depth: number): boolean {
        if (depth > MAX_REFERENCE_DEPTH) {
            this.cycles++;
            return true;
        }
        return false;
    }

    /**
     * A style object, following a `<y:GraphMLReference ResourceKey>` element to what it names.
     * @param tag - the element's local name
     * @param e - the element
     * @returns the object, or null when the reference names nothing
     */
    object(tag: string, e: unknown): StyleObject | null {
        if (tag === "GraphMLReference") {
            return this.shared.get(treeAttr(e, "ResourceKey") ?? "") ?? null;
        }
        return { tag, e };
    }

    /**
     * The first child element of a property element, as a style object.
     * @param d - the property element (or a `<data>` content)
     * @returns the object, or null
     */
    first(d: unknown): StyleObject | null {
        if (!isTree(d)) {
            return null;
        }
        for (const key of Object.keys(d)) {
            if (!key.startsWith("@_") && key !== "#text") {
                return this.object(localOf(key), treeChildren(d, localOf(key))[0]);
            }
        }
        return null;
    }

    /**
     * A property value resolved through references: a style object, text, `{x:Null}` or nothing.
     * @param v - an attribute's text or a property element
     * @param depth - the walk's depth
     * @returns the resolved value
     */
    deref(v: unknown, depth = 0): Resolved {
        if (v === undefined || v === null || this.tooDeep(depth)) {
            return null;
        }
        if (typeof v === "object") {
            return this.first(v);
        }
        if (typeof v !== "string") {
            return null;
        }
        const t = v.trim();
        if (t.length > MAX_STYLE_VALUE_LENGTH) {
            return t;
        }
        if (NULL_MARKUP.test(t)) {
            return NULL;
        }
        const m = REFERENCE.exec(t);
        if (m !== null) {
            return this.shared.get(m[1]) ?? null;
        }
        return t;
    }
}

/**
 * The `x:Key` of a shared object.
 * @param e - the element
 * @returns the key, or null
 */
function sharedKey(e: unknown): string | null {
    if (!isTree(e)) {
        return null;
    }
    for (const key of Object.keys(e)) {
        if (key.startsWith("@_") && localOf(key.slice(2)) === "Key") {
            const value = e[key];
            return typeof value === "string" ? value : null;
        }
    }
    return null;
}

/**
 * A property of a style object: its attribute, or its `<Tag.property>` child element.
 * @param st - the style object
 * @param name - the property name
 * @returns the attribute text, the property element, or undefined
 */
function prop(st: StyleObject, name: string): unknown {
    const attr = treeAttr(st.e, name);
    if (attr !== undefined) {
        return attr;
    }
    return treeChild(st.e, `${st.tag}.${name}`);
}

/**
 * A paint: a color constant or `#AARRGGBB` in the yFiles 3 dialect, a CSS color, the first stop of a gradient
 * (with a note), or `{x:Null}`.
 * @param refs - the references
 * @param v - the property value
 * @param gradient - called when the paint is a gradient
 * @param depth - the walk's depth
 * @returns the paint
 */
function paintOf(refs: References, v: unknown, gradient: (() => void) | null, depth = 0): Paint {
    if (refs.tooDeep(depth)) {
        return null;
    }
    const x = refs.deref(v, depth);
    if (x === null || x === NULL) {
        return x;
    }
    if (typeof x === "string") {
        return { raw: x, dialect: "yfiles3" };
    }
    const { tag } = x;
    if (tag === "SolidColorFill") {
        return paintOf(refs, prop(x, "color"), gradient, depth + 1);
    }
    if (tag === "Color") {
        return paintOf(refs, treeAttr(x.e, "value"), gradient, depth + 1);
    }
    if (tag === "CssFill") {
        const css = treeAttr(x.e, "cssString");
        return css === undefined ? null : { raw: css, dialect: "css" };
    }
    if (tag.endsWith("Gradient")) {
        gradient?.();
        const stop =
            treeChildren(x.e, "GradientStop")[0] ??
            treeChildren(treeChild(x.e, `${tag}.GradientStops`), "GradientStop")[0];
        return stop === undefined ? null : paintOf(refs, treeAttr(stop, "color"), null, depth + 1);
    }
    if (tag === "Stroke") {
        return paintOf(refs, prop(x, "fill"), gradient, depth + 1);
    }
    return null;
}

/** A stroke's color, width and line style. */
interface Stroke {
    readonly color: Paint;
    readonly width: unknown;
    readonly line: string;
}

/** yFiles 3's dash style names. */
const DASHES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dash", "dashed"],
    ["dot", "dotted"],
    ["dashdot", "dash-dot"],
    ["dashdotdot", "dash-dot"],
]);

/**
 * A stroke: a `Stroke` object, a color written as a stroke, or `{x:Null}`.
 * @param refs - the references
 * @param v - the property value
 * @returns the stroke, `{x:Null}`, or null
 */
function strokeOf(refs: References, v: unknown): Stroke | typeof NULL | null {
    const x = refs.deref(v);
    if (x === null || x === NULL) {
        return x;
    }
    if (typeof x === "string" || x.tag !== "Stroke") {
        return { color: paintOf(refs, v, null), width: 1, line: "solid" };
    }
    let line = "solid";
    const d = refs.deref(prop(x, "dashStyle"), 1);
    if (typeof d === "string") {
        const lower = d.slice(0, MAX_STYLE_VALUE_LENGTH).toLowerCase().replaceAll("_", "");
        line = DASHES.get(lower) ?? `other:${lower}`;
    } else if (d !== null && d !== NULL) {
        // a DashStyle object: two numbers dash or dot, four dash-dot
        const dashes = (treeAttr(d.e, "dashes") ?? "")
            .slice(0, MAX_STYLE_VALUE_LENGTH)
            .trim()
            .split(/[\s,]+/)
            .map(Number)
            .filter(Number.isFinite);
        if (dashes.length === 2) {
            line = dashes[0] <= 1 ? "dotted" : "dashed";
        } else if (dashes.length === 4) {
            line = "dash-dot";
        } else if (dashes.length > 0) {
            line = `other:dashes ${dashes.slice(0, 8).join(" ")}`;
        }
    }
    const w = prop(x, "thickness");
    return { color: paintOf(refs, prop(x, "fill"), null), width: typeof w === "string" ? w : 1, line };
}

/**
 * Writes a paint into a color property, its alpha into the property's opacity where it has one.
 * @param pt - the paint
 * @param property - the color property
 * @param opacity - its opacity property, or null
 * @param put - receives the values
 * @param at - the sites
 */
function putPaint(pt: Paint, property: string, opacity: string | null, put: PutValue, at: SiteOf): void {
    if (pt === null || pt === NULL) {
        return;
    }
    const c = canonColor(pt.raw, pt.dialect, at(property));
    if (c === null) {
        return;
    }
    put(property, c.color);
    const alpha = colorOpacity(c, null, at(property), opacity !== null);
    if (opacity !== null) {
        put(opacity, alpha);
    }
}

/** BevelNodeStyle's corner `radius` and the `inset` of its line with neither written. */
const BEVEL_RADIUS = 10;
const BEVEL_INSET = 3;

/** yFiles' black, the documented default color of the 2.6 Bevel, ShinyPlate and Panel styles. */
const BLACK = "#FF000000";

/** The demos' FlowchartNodeStyle defaults (yfiles-for-html-demos v2.6, FlowchartStyle.ts): fill rgb(183, 201, 227). */
const FLOWCHART_FILL = "#FFB7C9E3";

/**
 * A SQUIRCLE as yEd Live draws it: four cubic curves from side to side, each with control points 0.2 of a half side from
 * the corner (`yed-live-graphml-specimen-node-shapes`).
 * @returns its points, `x,y` fractions of the half sizes
 */
function squirclePoints(): string {
    const steps = 8;
    const quarter = Array.from({ length: steps }, (_, i): [number, number] => {
        const t = i / steps;
        const [a, b] = [3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2];
        return [-((1 - t) ** 3) - a - 0.8 * b, 0.8 * a + b + t ** 3];
    });
    const turns = [...quarter, ...quarter.map(([x, y]) => [y, -x]), ...quarter.map(([x, y]) => [-x, -y])];
    return [...turns, ...quarter.map(([x, y]) => [-y, x])].map(([x, y]) => polygonPoint(x, y)).join(" ");
}

/**
 * A polygon's corner as `shapePoints` writes it.
 * @param x - across, a fraction of the half width
 * @param y - up, a fraction of the half height
 * @returns the `x,y` text
 */
function polygonPoint(x: number, y: number): string {
    return `${String(Math.round(x * 1e4) / 1e4)},${String(Math.round(y * 1e4) / 1e4)}`;
}

/**
 * yFiles for HTML 2.6 ShapeNodeShape names the neutral shapes do not spell, as the shape yFiles documents them as:
 * SHEARED_RECTANGLE sheared to the right and SHEARED_RECTANGLE2 to the left, TRAPEZ smaller at the bottom and TRAPEZ2
 * at the top, TRIANGLE2 pointing to the bottom, FAT_ARROW an arrow pointing to the right and FAT_ARROW2 to the left
 * (ShapeNodeShape API docs). A mirrored or turned shape is the polygon of its corners (`x,y` fractions of the half
 * sizes, y up). STAR5_UP is a star; PILL, a stadium, is a rectangle with half-circle ends.
 */
const SHAPES_26: ReadonlyMap<string, YedOutline> = new Map<string, YedOutline>([
    ["sheared-rectangle", { shape: "parallelogram" }],
    ["sheared-rectangle2", { shape: "polygon", points: "-0.5,-1 1,-1 0.5,1 -1,1" }],
    ["trapez", { shape: "polygon", points: "-0.5,-1 0.5,-1 1,1 -1,1" }],
    ["trapez2", { shape: "trapezoid" }],
    ["star5-up", { shape: "star" }],
    ["triangle2", { shape: "polygon", points: "-1,1 0,-1 1,1" }],
    ["fat-arrow", { shape: "polygon", points: "-1,-1 0.6,-1 1,0 0.6,1 -1,1 -0.6,0" }],
    ["fat-arrow2", { shape: "polygon", points: "-0.6,-1 1,-1 0.6,0 1,1 -0.6,1 -1,0" }],
    ["pill", { shape: "round-rectangle" }],
    ["hexagon-standing", { shape: "polygon", points: "0,1 1,0.5 1,-0.5 0,-1 -1,-0.5 -1,0.5" }],
    [
        "octagon-standing",
        {
            shape: "polygon",
            points: "0,1 0.7071,0.7071 1,0 0.7071,-0.7071 0,-1 -0.7071,-0.7071 -1,0 -0.7071,0.7071",
        },
    ],
    ["triangle-pointing-down", { shape: "polygon", points: "-1,1 0,-1 1,1" }],
    ["triangle-pointing-left", { shape: "polygon", points: "-1,0 1,1 1,-1" }],
    ["triangle-pointing-right", { shape: "polygon", points: "1,0 -1,1 -1,-1" }],
    ["squircle", { shape: "polygon", points: squirclePoints() }],
]);

/** ShapeNodeStyle's ROUND_RECTANGLE corner size (ShapeNodeShape API docs: "The corner size is 10"). */
const ROUND_RECTANGLE_CORNER = 10;

/** RectangleNodeStyle's corner size with no `cornerSize` (`rectangle-style`, which yEd Live rounds by 10). */
const RECTANGLE_STYLE_CORNER = "10";

/** ArrowNodeStyle's `angle` and `shaftRatio` with none written, as yEd Live draws `arrow-node-arrow`. */
const ARROW_ANGLE = Math.PI / 4;
const ARROW_SHAFT_RATIO = 1 / 3;

/** A node's size from its NodeGeometry, where it has one. */
interface Size {
    readonly width: number;
    readonly height: number;
}

/**
 * A rounded box's corner: a radius of 0 is a plain box.
 * @param radius - the style's `radius` attribute
 * @param fallback - the style's documented default radius
 * @param put - receives the values
 * @param at - the sites
 */
function putRounded(radius: string | undefined, fallback: number, put: PutValue, at: SiteOf): void {
    const r = radius === undefined ? fallback : canonNumber(radius, at("cornerRadius"));
    if (r === 0) {
        put("shape", "rectangle");
        return;
    }
    put("shape", "round-rectangle");
    put("cornerRadius", r);
}

/**
 * Reads a BevelNodeStyle: its paint, its corners and the line inside its edge.
 * @param style - the style
 * @param color - its `#rrggbb` color, or null
 * @param put - receives the values
 * @param at - the sites
 */
function readBevelStyle(style: StyleObject, color: string | null, put: PutValue, at: SiteOf): void {
    put("borderWidth", 0);
    putRounded(treeAttr(style.e, "radius"), BEVEL_RADIUS, put, at);
    if (color === null) {
        return;
    }
    putBevelPaint(color, put);
    put("borderColor", color);
    const size = (name: string, fallback: number): number =>
        canonNumber(treeAttr(style.e, name) ?? fallback, at("shapeLines")) ?? fallback;
    putBevelLine(size("radius", BEVEL_RADIUS), size("inset", BEVEL_INSET), put);
}

/**
 * Reads a PanelNodeStyle: a box in its paint.
 * @param color - its `#rrggbb` color, or null
 * @param put - receives the values
 */
function readPanelStyle(color: string | null, put: PutValue): void {
    put("borderWidth", 0);
    if (color !== null) {
        putPanelPaint(color, put);
    }
    put("shape", "rectangle");
}

/**
 * Reads the yFiles for HTML 2.6 node styles yEd Live wrote before yFiles 3, and the demos' FlowchartNodeStyle:
 * BevelNodeStyle and PanelNodeStyle (painted from their `color`), ShinyPlateNodeStyle (an outline only where `stroke`
 * is set) and FlowchartNodeStyle (its `type`'s outline, drawn as yEd's flowchart palette draws the same type).
 * @param refs - the references
 * @param style - the style
 * @param put - receives the values
 * @param at - the sites
 * @returns true when the style is one of these
 */
function readStyle26(refs: References, style: StyleObject, put: PutValue, at: SiteOf): boolean {
    const fill = (v: unknown): string | null => {
        const gradient = (): void => {
            noteAt(at("fill"), STYLE_ISSUE.GRADIENT, style.tag);
        };
        const paint = paintOf(refs, v, gradient);
        putPaint(paint, "fill", "fillOpacity", put, at);
        return paint === null || paint === NULL
            ? null
            : (canonColor(paint.raw, paint.dialect, at("fill"))?.color ?? null);
    };
    switch (style.tag) {
        case "BevelNodeStyle":
            readBevelStyle(style, fill(prop(style, "color") ?? BLACK), put, at);
            return true;
        case "PanelNodeStyle":
            readPanelStyle(fill(prop(style, "color") ?? BLACK), put);
            return true;
        case "ShinyPlateNodeStyle": {
            fill(prop(style, "fill") ?? BLACK);
            const stroke = prop(style, "stroke");
            if (stroke === undefined) {
                put("borderWidth", 0);
            } else {
                putStroke(strokeOf(refs, stroke), put, at);
            }
            putRounded(treeAttr(style.e, "radius"), 5, put, at);
            return true;
        }
        case "FlowchartNodeStyle": {
            fill(prop(style, "fill") ?? FLOWCHART_FILL);
            const type = treeAttr(style.e, "type") ?? "";
            // an annotation's box has no outline (its bracket is not drawn); a style without a type draws the same
            // box, outlined
            if (type === "annotation") {
                put("borderWidth", 0);
            } else {
                putStroke(strokeOf(refs, prop(style, "stroke") ?? BLACK), put, at);
            }
            const outline = type === "" || type === "annotation" ? null : configurationOutline(`flowchart.${type}`);
            if (outline === null && type !== "" && type !== "annotation") {
                noteAt(at("shape"), STYLE_ISSUE.UNKNOWN_VALUE, type.slice(0, MAX_STYLE_VALUE_LENGTH));
            }
            put("shape", outline?.shape ?? "rectangle");
            if (outline?.points !== undefined) {
                put("shapePoints", outline.points);
            }
            return true;
        }
        default:
            return false;
    }
}

/** How yEd Live draws one BPMN node style: its outline shape and, where a sheet shows them, its default colors. */
interface BpmnLook {
    readonly outline: YedOutline;
    readonly cornerRadius?: number;
    readonly background?: string;
    readonly stroke?: string;
    readonly line?: string;
    /** the style's box has no outline of its own (an annotation's bracket is not drawn) */
    readonly unstroked?: boolean;
}

/**
 * The BPMN node styles, measured from yEd Live 8.5.16's drawings of `yed-live-graphml-specimen-node-shapes-p4` to `-p6`.
 * Only the activity, event and choreography have a default color on a sheet; the others' are left unset.
 */
const BPMN_STYLES: ReadonlyMap<string, BpmnLook> = new Map<string, BpmnLook>([
    [
        "ActivityNodeStyle",
        {
            outline: { shape: "round-rectangle" },
            cornerRadius: 6,
            background: "#FFFAFAFA",
            stroke: "#FF00008B",
        },
    ],
    ["EventNodeStyle", { outline: { shape: "ellipse" }, background: "#FFFAFAFA", stroke: "#FF008000" }],
    ["GatewayNodeStyle", { outline: { shape: "diamond" } }],
    ["ConversationNodeStyle", { outline: { shape: "hexagon" } }],
    [
        "ChoreographyNodeStyle",
        {
            outline: { shape: "round-rectangle" },
            cornerRadius: 6,
            background: "#FFFAFAFA",
            stroke: "#FF006400",
        },
    ],
    ["DataObjectNodeStyle", { outline: BPMN_ARTIFACTS.get("artifact_type_data_object") ?? { shape: "polygon" } }],
    ["DataStoreNodeStyle", { outline: BPMN_ARTIFACTS.get("artifact_type_data_store") ?? { shape: "other:database" } }],
    ["AnnotationNodeStyle", { outline: { shape: "rectangle" }, unstroked: true }],
    ["GroupNodeStyle", { outline: { shape: "round-rectangle" }, cornerRadius: 3, line: "dash-dot" }],
]);

/** The BPMN types and characteristics that change a node's line, from the same drawings. */
const BPMN_LINES: ReadonlyMap<string, { readonly width?: number; readonly line?: string }> = new Map([
    ["CALL_ACTIVITY", { width: 3 }],
    ["CALL", { width: 3 }],
    ["CALLING_GLOBAL_CONVERSATION", { width: 3 }],
    ["CALLING_COLLABORATION", { width: 3 }],
    ["END", { width: 3 }],
    ["EVENT_SUB_PROCESS", { line: "dotted" }],
    ["SUB_PROCESS_NON_INTERRUPTING", { line: "dashed" }],
    ["BOUNDARY_NON_INTERRUPTING", { line: "dashed" }],
]);

/**
 * Reads a `bpmn:` node style: `background` and `outline` paint the shape its kind draws. The markers, icons and
 * second rings inside it are not read. yFiles' own GroupNodeStyle has the same local name, and neither color.
 * @param refs - the references
 * @param style - the style
 * @param put - receives the values
 * @param at - the sites
 * @returns true when the style is one of these
 */
function readBpmnStyle(refs: References, style: StyleObject, put: PutValue, at: SiteOf): boolean {
    const look = BPMN_STYLES.get(style.tag);
    const background = prop(style, "background");
    const outline = prop(style, "outline");
    if (look === undefined || (style.tag === "GroupNodeStyle" && background === undefined && outline === undefined)) {
        return false;
    }
    putPaint(paintOf(refs, background ?? look.background, null), "fill", "fillOpacity", put, at);
    if (look.unstroked === true) {
        put("borderWidth", 0);
    } else {
        const kind =
            treeAttr(style.e, "activityType") ?? treeAttr(style.e, "characteristic") ?? treeAttr(style.e, "type");
        const line = BPMN_LINES.get(kind ?? "");
        putStroke(
            {
                color: paintOf(refs, outline ?? look.stroke, null),
                width: line?.width ?? 1,
                line: line?.line ?? look.line ?? "solid",
            },
            put,
            at,
        );
    }
    put("shape", look.outline.shape);
    if (look.outline.points !== undefined) {
        put("shapePoints", look.outline.points);
    }
    if (look.cornerRadius !== undefined) {
        put("cornerRadius", look.cornerRadius);
    }
    return true;
}

/**
 * Reads a UMLNodeStyle as yEd Live 8.5.16 draws it (`yed-live-graphml-specimen-node-shapes-p7`): a box with corners of
 * 10, outlined in its `fill` 2 wide, its model's `className` in white at the top. yEd Live sizes the box from its rows
 * as it loads the file, so the stored size is what is read; the sections and their rows are not drawn.
 * @param refs - the references
 * @param style - the style
 * @param put - receives the values
 * @param at - the sites
 */
function readUmlStyle(refs: References, style: StyleObject, put: PutValue, at: SiteOf): void {
    const fill = paintOf(refs, prop(style, "fill"), null);
    putPaint(fill, "fill", "fillOpacity", put, at);
    putStroke({ color: fill, width: 2, line: "solid" }, put, at);
    put("shape", "round-rectangle");
    put("cornerRadius", 10);
    const model = refs.deref(prop(style, "model"));
    const name =
        model === null || model === NULL || typeof model !== "object" ? undefined : treeAttr(model.e, "className");
    if (name !== undefined) {
        put("label", canonText(name, at("label")));
        put("labelColor", "#ffffff");
        put("labelPosition", "inside-top");
    }
}

/** How far yEd Live 8.5.16's GroupNodeStyle frames its panel on a side with no tab (`yed-live-graphml-specimen-groups`). */
const GROUP_FRAME = 4;

/** yFiles' sides of a group's tab, in the order of `stripeFrame`. */
const TAB_SIDES = ["TOP", "RIGHT", "BOTTOM", "LEFT"];

/**
 * Reads what a GroupNodeStyle paints: its panel (`contentAreaFill`, white unset) as the node's fill, and the band its
 * tab leaves round the panel (`tabFill`, #AAAAAA unset), `tabHeight` (18 unset) deeper on the side of its `tabPosition`
 * and none with no tab. A collapsed group has no panel: its face is the tab's color. All as yEd Live 8.5.16 draws
 * `yed-live-graphml-specimen-groups` and its pages. The notch beside a tab narrower than its side is not drawn.
 * @param refs - the references
 * @param style - the style
 * @param size - the node's size
 * @param collapsed - whether the group is collapsed
 * @param put - receives the values
 * @param at - the sites
 */
function readGroupPanel(
    refs: References,
    style: StyleObject,
    size: Size,
    collapsed: boolean,
    put: PutValue,
    at: SiteOf,
): void {
    const tabFill = paintOf(refs, prop(style, "tabFill") ?? "#FFAAAAAA", null);
    if (collapsed) {
        putPaint(tabFill, "fill", "fillOpacity", put, at);
        return;
    }
    putPaint(paintOf(refs, prop(style, "contentAreaFill") ?? "#FFFFFFFF", null), "fill", "fillOpacity", put, at);
    const position = treeAttr(style.e, "tabPosition") ?? "TOP";
    if (position === "NONE") {
        return;
    }
    putPaint(tabFill, "stripeColors", null, put, at);
    const tab = canonNumber(treeAttr(style.e, "tabHeight") ?? 18, at("stripeFrame")) ?? 18;
    const insets = TAB_SIDES.map((side, i) => {
        const depth = position.startsWith(side) ? tab + GROUP_FRAME : GROUP_FRAME;
        return Number((depth / (i % 2 === 0 ? size.height : size.width)).toFixed(6));
    });
    put("stripeFrame", insets.join(" "));
}

/**
 * Writes a stroke's color, width and line style, or no outline for `{x:Null}`.
 * @param stroke - the stroke
 * @param put - receives the values
 * @param at - the sites
 */
function putStroke(stroke: Stroke | typeof NULL | null, put: PutValue, at: SiteOf): void {
    if (stroke === NULL) {
        put("borderWidth", 0);
    } else if (stroke !== null) {
        putPaint(stroke.color, "borderColor", "borderOpacity", put, at);
        put("borderWidth", canonNumber(stroke.width, at("borderWidth")));
        put("borderStyle", canonEnum("borderStyle", stroke.line, "yfiles3", at("borderStyle")));
    }
}

/**
 * Writes a node style's outline: its shape, its corners, and a RectangleNodeStyle's corner size.
 * @param style - the style
 * @param size - the node's size
 * @param put - receives the values
 * @param at - the sites
 */
function putStyleOutline(style: StyleObject, size: Size | null, put: PutValue, at: SiteOf): void {
    const sized = sizedOutline(style, size, at);
    put("shape", sized === null ? nodeShapeOf(style, at) : "polygon");
    const points = sized ?? SHAPES_26.get(shapeKey(treeAttr(style.e, "shape")) ?? "")?.points;
    if (points !== undefined) {
        put("shapePoints", points);
    }
    if (style.tag === "RectangleNodeStyle" && sized === null) {
        put("cornerRadius", rectangleCorner(style, size, at));
    }
}

/**
 * Reads a node style.
 * @param refs - the references
 * @param data - the `<data>` content of the NodeStyle key
 * @param put - receives the values
 * @param at - the sites
 * @param size - the node's size, for a PILL's half-circle ends
 * @param collapsed - whether a group is collapsed
 */
function readNodeStyle(
    refs: References,
    data: unknown,
    put: PutValue,
    at: SiteOf,
    size: Size | null,
    collapsed: boolean,
): void {
    const st = unwrapped(refs, refs.first(data));
    if (st === null || typeof st !== "object") {
        if (data !== null && data !== undefined && data !== "") {
            noteAt(at("fill"), STYLE_ISSUE.UNRESOLVED, "NodeStyle");
        }
        return;
    }
    const style = st;
    if (readStyle26(refs, style, put, at) || readBpmnStyle(refs, style, put, at)) {
        return;
    }
    if (style.tag === "UMLNodeStyle") {
        readUmlStyle(refs, style, put, at);
        return;
    }
    putPaint(
        paintOf(refs, prop(style, "fill"), () => {
            noteAt(at("fill"), STYLE_ISSUE.GRADIENT, style.tag);
        }),
        "fill",
        "fillOpacity",
        put,
        at,
    );
    putStroke(strokeOf(refs, prop(style, "stroke")), put, at);
    putStyleOutline(style, size, put, at);
    const shape = style.tag === "ShapeNodeStyle" ? shapeKey(treeAttr(style.e, "shape")) : null;
    if (shape === "round-rectangle") {
        put("cornerRadius", ROUND_RECTANGLE_CORNER);
    } else if (shape === "pill" && size !== null) {
        put("cornerRadius", Math.min(size.width, size.height) / 2);
    }
    if (style.tag === "GroupNodeStyle" && size !== null) {
        readGroupPanel(refs, style, size, collapsed, put, at);
    }
}

/**
 * A ShapeNodeStyle `shape` as a lookup key: lowercase, underscores as hyphens.
 * @param shape - the attribute
 * @returns the key, or null
 */
function shapeKey(shape: string | undefined): string | null {
    return shape === undefined
        ? null
        : shape.slice(0, MAX_STYLE_VALUE_LENGTH).trim().toLowerCase().replaceAll("_", "-");
}

/**
 * The style a collapsible group's decorators wrap; a decorator that wraps itself is a cycle.
 * @param refs - the references
 * @param first - the node's style
 * @returns the style that draws the node, or null for a cycle
 */
function unwrapped(refs: References, first: Resolved): Resolved {
    let st = first;
    const seen = new Set<unknown>();
    while (st !== null && typeof st === "object" && st.tag === "CollapsibleNodeStyleDecorator") {
        if (seen.has(st.e) || refs.tooDeep(seen.size)) {
            refs.cycles++;
            return null;
        }
        seen.add(st.e);
        st = refs.deref(prop(st, "wrappedStyle"));
    }
    return st;
}

/** The shapes of a RectangleNodeStyle that rounds only the corners of one side (`corners`). */
const ONE_SIDE_ROUND: ReadonlyMap<string, string> = new Map([
    ["TOP", "other:top-round-rectangle"],
    ["BOTTOM", "other:bottom-round-rectangle"],
]);

/**
 * What a RectangleNodeStyle draws: a box rounded on the corners it names (`sizedOutline` draws a CUT one). Its other
 * `corners` values (one corner, the left or right side) and a SQUIRCLE `cornerStyle` are read as rounded all round.
 * @param style - the style
 * @returns the shape
 */
function rectangleStyleShape(style: StyleObject): string {
    const round = (treeAttr(style.e, "cornerStyle") ?? "ROUND") === "ROUND";
    return (round ? ONE_SIDE_ROUND.get(treeAttr(style.e, "corners") ?? "") : undefined) ?? "round-rectangle";
}

/**
 * A RectangleNodeStyle's corner size: `cornerSize`, a share of the node's shorter side under `scaleCornerSize`
 * (`scaleCornerSize=true cornerSize=0.3` on a 48 x 36 node draws corners of 10.8).
 * @param style - the style
 * @param size - the node's size
 * @param at - the sites
 * @returns the size, or null when it does not parse
 */
function rectangleCorner(style: StyleObject, size: Size | null, at: SiteOf): number | null {
    const corner = canonNumber(treeAttr(style.e, "cornerSize") ?? RECTANGLE_STYLE_CORNER, at("cornerRadius"));
    const scaled = treeAttr(style.e, "scaleCornerSize") === "true" && corner !== null && size !== null;
    return scaled ? corner * Math.min(size.width, size.height) : corner;
}

/**
 * A RectangleNodeStyle with `cornerStyle="CUT"`: a box with the corners its `corners` names (all of them unset) cut
 * off by `cornerSize`, at most half of a side.
 * @param style - the style
 * @param size - the node's size
 * @param at - the sites
 * @returns its points
 */
function cutCorners(style: StyleObject, size: Size, at: SiteOf): string {
    const cut = rectangleCorner(style, size, at) ?? 0;
    const [dx, dy] = [Math.min(1, (2 * cut) / size.width), Math.min(1, (2 * cut) / size.height)];
    const corners = treeAttr(style.e, "corners") ?? "ALL";
    const corner = (name: string, x: number, y: number): [number, number][] => {
        if (corners !== "ALL" && !name.includes(corners)) {
            return [[x, y]];
        }
        const ends: [number, number][] = [
            [x, y * (1 - dy)],
            [x * (1 - dx), y],
        ];
        return x * y < 0 ? ends : ends.reverse();
    };
    return [
        ...corner("TOP_LEFT", -1, 1),
        ...corner("TOP_RIGHT", 1, 1),
        ...corner("BOTTOM_RIGHT", 1, -1),
        ...corner("BOTTOM_LEFT", -1, -1),
    ]
        .map(([x, y]) => polygonPoint(x, y))
        .join(" ");
}

/** An outline's corners along and across the way an arrow points. */
type ArrowPoints = [number, number][];

/**
 * An ArrowNodeStyle's outline as yEd Live 8.5.16 draws them (`yed-live-graphml-specimen-node-shapes`). Along the way
 * `direction` points, a head reaches back the half width across it times the tangent of `angle`, and the shaft is that
 * half width times `shaftRatio`; a PARALLELOGRAM leans and a TRAPEZOID narrows by twice as much, narrowing to a point
 * at most. Only the arrows are measured turned; the other two turn the same way.
 * @param style - the style
 * @param size - the node's size
 * @param at - the sites
 * @returns its points
 */
function arrowOutline(style: StyleObject, size: Size, at: SiteOf): string {
    const number = (name: string, fallback: number): number => {
        const text = treeAttr(style.e, name);
        return text === undefined ? fallback : (canonNumber(text, at("shapePoints")) ?? fallback);
    };
    const direction = treeAttr(style.e, "direction") ?? "RIGHT";
    const upright = direction === "UP" || direction === "DOWN";
    const [a, b] = upright ? [size.height / 2, size.width / 2] : [size.width / 2, size.height / 2];
    const lean = 2 * b * Math.tan(number("angle", ARROW_ANGLE));
    const shaft = b * number("shaftRatio", ARROW_SHAFT_RATIO);
    const head = Math.min(lean / 2, treeAttr(style.e, "shape") === "DOUBLE_ARROW" ? a : 2 * a);
    const nose: ArrowPoints = [
        [a - head, shaft],
        [a - head, b],
        [a, 0],
        [a - head, -b],
        [a - head, -shaft],
    ];
    const inset = Math.min(lean, a);
    const skew = Math.min(lean, 2 * a);
    const outlines: Record<string, ArrowPoints> = {
        ARROW: [...nose, [-a, -shaft], [-a, shaft]],
        DOUBLE_ARROW: [...nose, [head - a, -shaft], [head - a, -b], [-a, 0], [head - a, b], [head - a, shaft]],
        NOTCHED_ARROW: [...nose, [-a, -shaft], [-a + (shaft * lean) / (2 * b), 0], [-a, shaft]],
        PARALLELOGRAM: [
            [a, b],
            [a - skew, -b],
            [-a, -b],
            [skew - a, b],
        ],
        // narrowed to a point, its top has one corner
        TRAPEZOID: [[a - inset, b], [a, -b], [-a, -b], ...(inset < a ? ([[inset - a, b]] as ArrowPoints) : [])],
    };
    const local = outlines[treeAttr(style.e, "shape") ?? "ARROW"] ?? outlines.ARROW;
    const turn = { RIGHT: [1, 0], UP: [0, 1], LEFT: [-1, 0], DOWN: [0, -1] }[direction] ?? [1, 0];
    return local
        .map(([u, v]) =>
            polygonPoint(
                (u * turn[0] - v * turn[1]) / (size.width / 2),
                (u * turn[1] + v * turn[0]) / (size.height / 2),
            ),
        )
        .join(" ");
}

/**
 * The outline of a node style whose proportions depend on the node's size.
 * @param style - the style
 * @param size - the node's size, or null for a square
 * @param at - the sites
 * @returns its points, or null for a style that has none of its own
 */
function sizedOutline(style: StyleObject, size: Size | null, at: SiteOf): string | null {
    const box = size ?? { width: 1, height: 1 };
    if (style.tag === "ArrowNodeStyle") {
        return arrowOutline(style, box, at);
    }
    const cut = style.tag === "RectangleNodeStyle" && treeAttr(style.e, "cornerStyle") === "CUT";
    return cut ? cutCorners(style, box, at) : null;
}

/**
 * A node style's shape: its `shape`, else what its kind draws.
 * @param style - the style
 * @param at - the sites
 * @returns the shape, or null when it does not parse
 */
function nodeShapeOf(style: StyleObject, at: SiteOf): string | null {
    const shape = treeAttr(style.e, "shape");
    if (shape !== undefined) {
        return SHAPES_26.get(shapeKey(shape) ?? "")?.shape ?? canonEnum("shape", shape, "yfiles3", at("shape"));
    }
    if (style.tag === "RectangleNodeStyle") {
        return rectangleStyleShape(style);
    }
    if (style.tag === "ShapeNodeStyle") {
        return "rectangle";
    }
    noteAt(at("shape"), STYLE_ISSUE.UNKNOWN_VALUE, style.tag);
    return `other:${style.tag}`;
}

/**
 * Reads an edge style.
 * @param refs - the references
 * @param data - the `<data>` content of the EdgeStyle key
 * @param put - receives the values
 * @param at - the sites
 */
function readEdgeStyle(refs: References, data: unknown, put: PutValue, at: SiteOf): void {
    const st = refs.first(data);
    if (st === null) {
        return;
    }
    const stroke = strokeOf(refs, prop(st, "stroke"));
    if (stroke === NULL) {
        noteAt(at("color"), STYLE_ISSUE.NO_STROKE, "{x:Null}");
    } else if (stroke !== null) {
        putPaint(stroke.color, "color", "opacity", put, at);
        put("width", canonNumber(stroke.width, at("width")));
        put("lineStyle", canonEnum("lineStyle", stroke.line, "yfiles3", at("lineStyle")));
    }
    for (const end of ["source", "target"] as const) {
        readEdgeArrow(refs, refs.deref(prop(st, `${end}Arrow`)), end, put, at);
    }
}

/**
 * Reads one end's arrow of an edge style: its type, and for an arrow element its color, drawn hollow in its
 * stroke's color when its fill is `{x:Null}`.
 * @param refs - the references
 * @param a - the dereferenced `sourceArrow` or `targetArrow` value
 * @param end - which end
 * @param put - receives the values
 * @param at - the sites
 */
function readEdgeArrow(
    refs: References,
    a: ReturnType<References["deref"]>,
    end: "source" | "target",
    put: PutValue,
    at: SiteOf,
): void {
    const property = `${end}Arrow`;
    let type: string | null = null;
    let hollow = false;
    if (a !== null && a !== NULL && typeof a === "object") {
        type = treeAttr(a.e, "type") ?? "DEFAULT";
        const fill = paintOf(refs, prop(a, "fill"), null);
        // a `{x:Null}` fill draws the arrow's outline alone, in its stroke's color
        const open = fill === NULL ? strokeOf(refs, prop(a, "stroke")) : null;
        hollow = open !== null && open !== NULL;
        putPaint(open !== null && open !== NULL ? open.color : fill, `${end}ArrowColor`, null, put, at);
        readArrowSize(refs, a.e, type.toUpperCase(), end, put, at);
    } else if (typeof a === "string") {
        type = a;
    }
    if (type !== null) {
        const arrow = canonEnum("arrow", RENAMED_ARROWS.get(type.toUpperCase()) ?? type, "yfiles3", at(property));
        put(property, hollow ? (HOLLOW_ARROWS.get(arrow ?? "") ?? arrow) : arrow);
    }
}

/** yEd Live's chevron is 8 wide, its default head 6, and both read as the vee (yed-live-graphml-specimen-arrows). */
const CHEVRON_WIDTH = 8 / 6;

/** The namespace of yFiles for HTML 2.6's styles. */
const YFILES_26_XAML = "http://www.yworks.com/xml/yfiles-for-html/2.0/xaml";

/** The arrows a yFiles for HTML 2.6 file draws 4 long and 9 wide (yed-live-graphml-specimen-arrows-p2). */
const STUBBY_26_ARROWS: ReadonlySet<string> = new Set(["TRIANGLE", "SHORT", "SIMPLE"]);

/**
 * The `length` an arrow draws at its normal size: `length="12"` is the one length drawn, three quarters of normal in
 * both directions (yed-live-graphml-specimen-arrows).
 */
const NORMAL_ARROW_LENGTH = 16;

/**
 * Reads how an arrow element's size differs from its shape's normal size in yEd Live.
 * @param refs - the references
 * @param arrow - the arrow element
 * @param type - its type, in capitals
 * @param end - which end
 * @param put - receives the values
 * @param at - the sites
 */
function readArrowSize(
    refs: References,
    arrow: unknown,
    type: string,
    end: "source" | "target",
    put: PutValue,
    at: SiteOf,
): void {
    const [lengthSite, widthSite] = [at(`${end}ArrowLength`), at(`${end}ArrowWidth`)];
    const stubby = refs.yfiles26 && STUBBY_26_ARROWS.has(type);
    const fixed =
        treeAttr(arrow, "length") === undefined ? 1 : arrowScale(arrow, "length", lengthSite) / NORMAL_ARROW_LENGTH;
    const scale = arrowScale(arrow, "scale", lengthSite) * fixed;
    const along = arrowScale(arrow, "lengthScale", lengthSite) * scale * (stubby ? 4 / 8 : 1);
    const across =
        arrowScale(arrow, "widthScale", widthSite) *
        scale *
        (stubby ? 9 / 6 : 1) *
        (type === "CHEVRON" ? CHEVRON_WIDTH : 1);
    put(`${end}ArrowLength`, along === 1 ? null : along);
    put(`${end}ArrowWidth`, across === 1 ? null : across);
}

/**
 * One of an arrow element's scale attributes.
 * @param arrow - the arrow element
 * @param name - the attribute
 * @param site - where a bad value is noted
 * @returns the scale; 1 where it is unset or bad
 */
function arrowScale(arrow: unknown, name: string, site: CanonSite): number {
    const raw = treeAttr(arrow, name);
    return raw === undefined ? 1 : (canonNumber(raw, site) ?? 1);
}

/**
 * yFiles 3.0 renamed 2.6's DEFAULT arrow to STEALTH and CIRCLE to ELLIPSE
 * (https://docs.yfiles.com/yfiles-html/api/ArrowType/); each is read as its 2.6 name is. STEALTH is "an arrow that is
 * notched on the side opposite its tip": a vee.
 */
const RENAMED_ARROWS: ReadonlyMap<string, string> = new Map([
    ["DEFAULT", "vee"],
    ["STEALTH", "vee"],
    ["ELLIPSE", "circle"],
]);

/** The filled arrows whose `{x:Null}` fill draws them as their open outline (a stealth's as the open triangle's). */
const HOLLOW_ARROWS: ReadonlyMap<string, string> = new Map([
    ["triangle", "triangle-open"],
    ["vee", "triangle-open"],
    ["diamond", "diamond-open"],
    ["circle", "circle-open"],
]);

/**
 * Reads an edge's route from its EdgeGeometry: the `y:Bend` locations, relative to its two nodes' centers (a
 * self-loop's to its node's size), and, for a PolylineEdgeStyle with a `smoothingLength` above 0, its rounded bends.
 * @param refs - the references
 * @param geometry - the `<data>` content of the EdgeGeometry key
 * @param style - the `<data>` content of the EdgeStyle key
 * @param ends - the source and target nodes' boxes (center x, y, width, height)
 * @param put - receives the values
 */
function readEdgeGeometry(
    refs: References,
    geometry: unknown,
    style: unknown,
    ends: readonly [Float64Array, Float64Array, boolean],
    put: PutValue,
): void {
    const points = treeChildren(treeChild(geometry, "List"), "Bend").map((b): BendPoint => {
        const [x, y] = (treeAttr(b, "Location") ?? "").split(",").map(Number);
        return [x, y];
    });
    const [s, t, loop] = ends;
    const bends = loop
        ? canonNodeOffsets([s[0], s[1]], [s[2], s[3]], points, true)
        : canonBends([s[0], s[1]], [t[0], t[1]], points, true);
    put("bends", bends);
    const st = refs.first(style);
    const smoothing = st === null ? undefined : treeAttr(st.e, "smoothingLength");
    if (bends !== null && st?.tag === "PolylineEdgeStyle" && Number(smoothing) > 0) {
        put("curved", true);
    }
}

/** yFiles' label positions (2.6 compass names and yFiles 3 side names, lowercase without `_`) as neutral sides. */
const SIDES: ReadonlyMap<string, string> = new Map([
    ["north", "top"],
    ["south", "bottom"],
    ["east", "right"],
    ["west", "left"],
    ["northeast", "top-right"],
    ["northwest", "top-left"],
    ["southeast", "bottom-right"],
    ["southwest", "bottom-left"],
    ["top", "top"],
    ["bottom", "bottom"],
    ["right", "right"],
    ["left", "left"],
    ["topright", "top-right"],
    ["topleft", "top-left"],
    ["bottomright", "bottom-right"],
    ["bottomleft", "bottom-left"],
]);

/**
 * The node label models by their parameter's local name: whether the label lies outside the node (exterior,
 * sandwich) or inside it (interior, stretch).
 */
const NODE_LABEL_MODELS: ReadonlyMap<string, "outside" | "inside"> = new Map([
    ["ExteriorLabelModelParameter", "outside"],
    ["ExteriorNodeLabelModelParameter", "outside"],
    ["SandwichParameter", "outside"],
    ["SandwichLabelModelParameter", "outside"],
    ["InteriorLabelModelParameter", "inside"],
    ["InteriorNodeLabelModelParameter", "inside"],
    ["InteriorStretchLabelModelParameter", "inside"],
    ["StretchNodeLabelModelParameter", "inside"],
]);

/** A `{x:Static y:SomeLabelModel.Position}` markup extension: the model's local name and the member. */
const STATIC_PARAMETER = /^\{\s*[\w.-]*:?Static\s+(?:[\w.-]+:)?(\w+)\.(\w+)\s*\}$/;

/**
 * A label's layout parameter, as a parameter element's local name and the element: the `Label.LayoutParameter`
 * child, a `LayoutParameter` attribute naming a shared one, or a model's constant (`{x:Static
 * y:InteriorStretchLabelModel.North}`), read as that model's parameter with that `Position`.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @returns the parameter, or null
 */
function layoutParameter(refs: References, label: unknown): StyleObject | null {
    const attr = treeAttr(label, "LayoutParameter");
    if (attr !== undefined) {
        const m = STATIC_PARAMETER.exec(attr.slice(0, MAX_STYLE_VALUE_LENGTH).trim());
        if (m !== null) {
            return { tag: `${m[1]}Parameter`, e: { "@_Position": m[2] } };
        }
    }
    const p = refs.deref(attr ?? treeChild(label, "Label.LayoutParameter"));
    return p === null || p === NULL || typeof p !== "object" ? null : p;
}

/**
 * Where yFiles draws a node label, from its layout parameter's model and `Position`: outside the node for the
 * exterior and sandwich models, inside it (`inside-*`) for the interior and stretch models, and the center for a
 * centered position or any other model (the free and ratio-anchored models' offsets have no neutral property). A
 * label with no layout parameter at all sits below the node, as yEd Live 8.5.16 draws every such label on its sheets;
 * no file saved by yEd Live in the corpus leaves one out.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @returns the position
 */
function labelPositionOf(refs: References, label: unknown): string {
    if (treeAttr(label, "LayoutParameter") === undefined && treeChild(label, "Label.LayoutParameter") === undefined) {
        return "bottom";
    }
    const parameter = layoutParameter(refs, label);
    const model = parameter === null ? undefined : NODE_LABEL_MODELS.get(parameter.tag);
    if (parameter === null || model === undefined) {
        return "center";
    }
    const raw = treeAttr(parameter.e, "Position") ?? "";
    const side = SIDES.get(raw.slice(0, MAX_STYLE_VALUE_LENGTH).toLowerCase().replaceAll("_", ""));
    if (side === undefined) {
        return "center";
    }
    return model === "inside" ? `inside-${side}` : side;
}

/**
 * What a node label's box is sized to: a stretch model's box reaches across its node (up it against the left or right
 * side, which no box here does), and any model inside the node holds its label against the side it names however large
 * it is.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @param position - where the label is placed
 * @returns the `labelBox`, or null for one that takes the default
 */
function labelBoxOf(refs: References, label: unknown, position: string): string | null {
    const tag = layoutParameter(refs, label)?.tag;
    if (tag === undefined || NODE_LABEL_MODELS.get(tag) !== "inside") {
        return null;
    }
    return tag.includes("Stretch") && !/left|right/.test(position) ? "target-width" : "words-at-side";
}

/** yFiles' edge label sides (`SideOfEdge`, and the nine-position model's middle row), as neutral positions. */
const EDGE_SIDES: ReadonlyMap<string, string> = new Map([
    ["aboveedge", "top"],
    ["belowedge", "bottom"],
    ["onedge", "center"],
    ["centerabove", "top"],
    ["centerbelow", "bottom"],
    ["centercentered", "center"],
]);

/** The edge label models that place a label above, on or below the line, and the attribute that says which. */
const EDGE_SIDE_ATTRIBUTES: ReadonlyMap<string, string> = new Map([
    ["NinePositionsEdgeLabelModelParameter", "Position"],
    ["EdgePathLabelModelParameter", "SideOfEdge"],
]);

/**
 * Where yFiles draws an edge label at the middle of its edge, above, on or below the line: the path model's
 * `SideOfEdge` at a ratio of 0.5, and the nine-position model's center row. Other places (the ends, a
 * segment's middle, left or right of the edge's direction, a free offset) give none.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @returns the position, or null
 */
function edgeLabelPositionOf(refs: References, label: unknown): string | null {
    const parameter = layoutParameter(refs, label);
    if (parameter === null) {
        return null;
    }
    const ratio = treeAttr(parameter.e, "Ratio");
    if (ratio !== undefined && Number(ratio) !== 0.5) {
        return null;
    }
    const attribute = EDGE_SIDE_ATTRIBUTES.get(parameter.tag);
    const raw = attribute === undefined ? undefined : treeAttr(parameter.e, attribute);
    return raw === undefined ? null : (EDGE_SIDES.get(raw.slice(0, MAX_STYLE_VALUE_LENGTH).toLowerCase()) ?? null);
}

/**
 * Reads an element's labels: the first one with text; further ones are noted for the element.
 * @param refs - the references
 * @param data - the `<data>` content of the NodeLabels or EdgeLabels key
 * @param put - receives the values
 * @param at - the sites
 */
function readLabels(refs: References, data: unknown, put: PutValue, at: SiteOf): void {
    let label: unknown = undefined;
    let text = "";
    let extra = 0;
    for (const l of treeChildren(treeChild(data, "List"), "Label")) {
        const raw = treeAttr(l, "Text") ?? treeText(treeChild(l, "Label.Text")) ?? "";
        if (raw.trim().length === 0) {
            continue;
        }
        if (label === undefined) {
            label = l;
            text = raw;
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
    if (at("label").target === "node") {
        const position = labelPositionOf(refs, label);
        put("labelPosition", position);
        put("labelBox", labelBoxOf(refs, label, position));
    } else {
        put("labelPosition", edgeLabelPositionOf(refs, label));
    }
    const ls = refs.deref(treeAttr(label, "Style") ?? treeChild(label, "Label.Style"));
    if (ls === null || ls === NULL || typeof ls !== "object" || !ls.tag.endsWith("LabelStyle")) {
        return;
    }
    putPaint(paintOf(refs, prop(ls, "textFill"), null), "labelColor", null, put, at);
    readLabelBox(refs, ls, put, at);
    readLabelFont(refs.deref(prop(ls, "font")), put, at);
}

/**
 * Reads the box a label style draws behind its words: its `backgroundFill`, its `backgroundStroke` and how far it
 * stands off the words (`padding`, `insets` in the 2.6 style; none where neither is set).
 * @param refs - the references
 * @param ls - the label style
 * @param put - receives the values
 * @param at - the sites
 */
function readLabelBox(refs: References, ls: StyleObject, put: PutValue, at: SiteOf): void {
    const fill = prop(ls, "backgroundFill");
    const stroke = strokeOf(refs, prop(ls, "backgroundStroke"));
    if (fill === undefined && (stroke === null || stroke === NULL)) {
        return;
    }
    putPaint(paintOf(refs, fill, null), "labelBackground", "labelBackgroundOpacity", put, at);
    if (stroke !== null && stroke !== NULL) {
        putPaint(stroke.color, "labelBorderColor", "labelBorderOpacity", put, at);
        put("labelBorderWidth", canonNumber(stroke.width, at("labelBorderWidth")));
    }
    put("labelPadding", canonNumber(prop(ls, "padding") ?? prop(ls, "insets") ?? "0", at("labelPadding")));
}

/**
 * Reads a label style's `Font`: its size, family and weight.
 * @param f - the dereferenced `font` property
 * @param put - receives the values
 * @param at - the sites
 */
function readLabelFont(f: ReturnType<References["deref"]>, put: PutValue, at: SiteOf): void {
    if (f === null || f === NULL || typeof f !== "object" || f.tag !== "Font") {
        return;
    }
    put("labelSize", canonNumber(treeAttr(f.e, "fontSize"), at("labelSize")));
    const family = treeAttr(f.e, "fontFamily");
    if (family !== undefined) {
        put("labelFont", canonText(family.replaceAll(/(^['"])|(['"]$)/g, ""), at("labelFont")));
    }
    const weight = treeAttr(f.e, "fontWeight");
    if (weight !== undefined) {
        put("labelWeight", canonEnum("weight", weight, "yfiles3", at("labelWeight")));
    }
}

/** The style, labels and geometry key kinds of nodes and of edges. */
const YFILES3_KINDS: Readonly<Record<StyleTarget, readonly KeyKind[]>> = {
    node: ["NodeStyle", "NodeLabels", "NodeGeometry"],
    edge: ["EdgeStyle", "EdgeLabels", "EdgeGeometry"],
};

/** What reading one table's yFiles 3 styles shares. */
interface Yfiles3Context {
    readonly snapshot: GraphSnapshot;
    readonly notes: StyleNotes;
    readonly budget: StyleWorkBudget;
    readonly refs: References;
    /** each node's center x and y, width and height from its NodeGeometry, for its edges' bends; NaN without one */
    readonly boxes: Float64Array;
}

/**
 * Reads the yFiles 3 styles of every node or every edge.
 * @param ctx - the shared state
 * @param target - nodes or edges
 * @param kinds - the table's columns by key kind
 * @returns the values
 */
function readYfiles3Target(
    ctx: Yfiles3Context,
    target: StyleTarget,
    kinds: Map<KeyKind, string>,
): ReturnType<typeof valueColumns>["values"] {
    const { snapshot, notes, budget, refs, boxes } = ctx;
    const isNode = target === "node";
    const table = isNode ? snapshot.nodes : snapshot.edges;
    const n = isNode ? snapshot.nodeCount : snapshot.edgeCount;
    const out = valueColumns(n);
    const [style, labels, geometry] = YFILES3_KINDS[target].map((kind) => kinds.get(kind));
    const cell = (name: string | undefined, i: number): unknown =>
        name === undefined ? undefined : plainCell(table.value(name, i));
    const expanded = isNode ? [...table].find((col) => col.meta.name === "Expanded")?.meta.name : undefined;
    for (let i = 0; i < n; i++) {
        budget.spend(target, 1);
        const at: SiteOf = (property) => ({ notes, target, property, element: i, budget });
        const put: PutValue = (property, value) => {
            out.put(i, property, value);
        };
        let size: Size | null = null;
        if (geometry !== undefined && !isNode) {
            const box = (k: number): Float64Array => boxes.subarray(4 * k, 4 * k + 4);
            const [s, t] = [snapshot.edgeSource(i), snapshot.edgeTarget(i)];
            readEdgeGeometry(refs, cell(geometry, i), cell(style, i), [box(s), box(t), s === t], put);
        } else if (geometry !== undefined) {
            size = readNodeGeometry(cell(geometry, i), i, boxes, put, at);
        }
        if (style !== undefined && isNode) {
            readNodeStyle(refs, cell(style, i), put, at, size, cell(expanded, i) === false);
        } else if (style !== undefined) {
            readEdgeStyle(refs, cell(style, i), put, at);
        }
        if (labels !== undefined) {
            readLabels(refs, cell(labels, i), put, at);
        }
    }
    return out.values;
}

/**
 * Reads a node's NodeGeometry: its width and height, and its box for its edges' bends.
 * @param geometry - the `<data>` content of the NodeGeometry key
 * @param i - the node's index
 * @param boxes - receives the node's center x and y, width and height
 * @param put - receives the values
 * @param at - the sites
 * @returns the node's size, or null when its width or height is not a number
 */
function readNodeGeometry(geometry: unknown, i: number, boxes: Float64Array, put: PutValue, at: SiteOf): Size | null {
    const rect = treeChild(geometry, "RectD");
    const width = canonNumber(treeAttr(rect, "Width"), at("width"));
    const height = canonNumber(treeAttr(rect, "Height"), at("height"));
    put("width", width);
    put("height", height);
    if (width === null || height === null) {
        return null;
    }
    const [x, y] = [Number(treeAttr(rect, "X")), Number(treeAttr(rect, "Y"))];
    boxes.set([x + width / 2, y + height / 2, width, height], 4 * i);
    return { width, height };
}

/**
 * The yFiles 3 styles of a graph.
 * @param snapshot - the graph
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @returns the values, or null when the graph has none of yFiles 3's style keys
 */
export function readYfiles3Styles(snapshot: GraphSnapshot, notes: StyleNotes, budget: StyleWorkBudget): YedRead | null {
    const nodeKinds = columnsByKind(snapshot.nodes);
    const edgeKinds = columnsByKind(snapshot.edges);
    const styled = [...nodeKinds.keys(), ...edgeKinds.keys()].some((k) => k !== "SharedData");
    if (!styled) {
        return null;
    }
    const graphKinds = columnsByKind(snapshot.graph);
    const sharedName = graphKinds.get("SharedData");
    const meta = snapshot.meta.extra[META_KEY] as { readonly namespaces?: Record<string, string> } | undefined;
    const refs = new References(
        sharedName === undefined ? null : plainCell(snapshot.graph.value(sharedName, 0)),
        Object.values(meta?.namespaces ?? {}).includes(YFILES_26_XAML),
    );
    const boxes = new Float64Array(4 * snapshot.nodeCount).fill(Number.NaN);
    const read = (target: StyleTarget, kinds: Map<KeyKind, string>): ReturnType<typeof valueColumns>["values"] =>
        readYfiles3Target({ snapshot, notes, budget, refs, boxes }, target, kinds);
    const node = read("node", nodeKinds);
    const edge = read("edge", edgeKinds);
    if (refs.cycles > 0) {
        notes.add(STYLE_ISSUE.REFERENCE_CYCLE, null, null, {
            sample: `references deeper than ${String(MAX_REFERENCE_DEPTH)} or circular (${String(refs.cycles)})`,
        });
    }
    return { node, edge };
}
