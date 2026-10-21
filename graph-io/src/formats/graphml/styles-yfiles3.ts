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
import { MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import type { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type { StyleDialect, StyleTarget, StyleWorkBudget } from "../../styles/types.js";
import {
    configurationOutline,
    isTree,
    localOf,
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
     */
    constructor(data: unknown) {
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

/** yFiles' black, the documented default color of the 2.6 Bevel, ShinyPlate and Panel styles. */
const BLACK = "#FF000000";

/** The demos' FlowchartNodeStyle defaults (yfiles-for-html-demos v2.6, FlowchartStyle.ts): fill rgb(183, 201, 227). */
const FLOWCHART_FILL = "#FFB7C9E3";

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
]);

/** ShapeNodeStyle's ROUND_RECTANGLE corner size (ShapeNodeShape API docs: "The corner size is 10"). */
const ROUND_RECTANGLE_CORNER = 10;

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
 * Reads the yFiles for HTML 2.6 node styles yEd Live wrote before yFiles 3, and the demos' FlowchartNodeStyle:
 * BevelNodeStyle and PanelNodeStyle (a `color` fill, no outline), ShinyPlateNodeStyle (an outline only where `stroke`
 * is set) and FlowchartNodeStyle (its `type`'s outline, drawn as yEd's flowchart palette draws the same type).
 * @param refs - the references
 * @param style - the style
 * @param put - receives the values
 * @param at - the sites
 * @returns true when the style is one of these
 */
function readStyle26(refs: References, style: StyleObject, put: PutValue, at: SiteOf): boolean {
    const fill = (v: unknown): void => {
        const gradient = (): void => {
            noteAt(at("fill"), STYLE_ISSUE.GRADIENT, style.tag);
        };
        putPaint(paintOf(refs, v, gradient), "fill", "fillOpacity", put, at);
    };
    switch (style.tag) {
        case "BevelNodeStyle":
            fill(prop(style, "color") ?? BLACK);
            put("borderWidth", 0);
            putRounded(treeAttr(style.e, "radius"), 10, put, at);
            return true;
        case "PanelNodeStyle":
            fill(prop(style, "color") ?? BLACK);
            put("borderWidth", 0);
            put("shape", "rectangle");
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
 * Reads a node style.
 * @param refs - the references
 * @param data - the `<data>` content of the NodeStyle key
 * @param put - receives the values
 * @param at - the sites
 * @param size - the node's size, for a PILL's half-circle ends
 */
function readNodeStyle(refs: References, data: unknown, put: PutValue, at: SiteOf, size: Size | null): void {
    const st = unwrapped(refs, refs.first(data));
    if (st === null || typeof st !== "object") {
        if (data !== null && data !== undefined && data !== "") {
            noteAt(at("fill"), STYLE_ISSUE.UNRESOLVED, "NodeStyle");
        }
        return;
    }
    const style = st;
    if (readStyle26(refs, style, put, at)) {
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
    put("shape", nodeShapeOf(style, at));
    const points = SHAPES_26.get(shapeKey(treeAttr(style.e, "shape")) ?? "")?.points;
    if (points !== undefined) {
        put("shapePoints", points);
    }
    const cornerSize = style.tag === "RectangleNodeStyle" ? treeAttr(style.e, "cornerSize") : undefined;
    if (cornerSize !== undefined) {
        put("cornerRadius", canonNumber(cornerSize, at("cornerRadius")));
    }
    const shape = style.tag === "ShapeNodeStyle" ? shapeKey(treeAttr(style.e, "shape")) : null;
    if (shape === "round-rectangle") {
        put("cornerRadius", ROUND_RECTANGLE_CORNER);
    } else if (shape === "pill" && size !== null) {
        put("cornerRadius", Math.min(size.width, size.height) / 2);
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
        return treeAttr(style.e, "cornerSize") === undefined ? "rectangle" : "round-rectangle";
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
    } else if (typeof a === "string") {
        type = a;
    }
    if (type !== null) {
        const arrow = canonEnum("arrow", RENAMED_ARROWS.get(type.toUpperCase()) ?? type, "yfiles3", at(property));
        put(property, hollow ? (HOLLOW_ARROWS.get(arrow ?? "") ?? arrow) : arrow);
    }
}

/**
 * yFiles 3.0 renamed 2.6's DEFAULT arrow to STEALTH and CIRCLE to ELLIPSE
 * (https://docs.yfiles.com/yfiles-html/api/ArrowType/); each is read as its 2.6 name is.
 */
const RENAMED_ARROWS: ReadonlyMap<string, string> = new Map([
    ["DEFAULT", "triangle"],
    ["STEALTH", "triangle"],
    ["ELLIPSE", "circle"],
]);

/** The filled arrows whose `{x:Null}` fill draws them as their open outline. */
const HOLLOW_ARROWS: ReadonlyMap<string, string> = new Map([
    ["triangle", "triangle-open"],
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
 * centered position or any other model (the free and ratio-anchored models' offsets have no neutral property).
 * @param refs - the references
 * @param label - the `y:Label` element
 * @returns the position
 */
function labelPositionOf(refs: References, label: unknown): string {
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
    put(
        "labelPosition",
        at("label").target === "node" ? labelPositionOf(refs, label) : edgeLabelPositionOf(refs, label),
    );
    const ls = refs.deref(treeAttr(label, "Style") ?? treeChild(label, "Label.Style"));
    if (ls === null || ls === NULL || typeof ls !== "object" || !ls.tag.endsWith("LabelStyle")) {
        return;
    }
    putPaint(paintOf(refs, prop(ls, "textFill"), null), "labelColor", null, put, at);
    readLabelFont(refs.deref(prop(ls, "font")), put, at);
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
            readNodeStyle(refs, cell(style, i), put, at, size);
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
    const refs = new References(sharedName === undefined ? null : plainCell(snapshot.graph.value(sharedName, 0)));
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
