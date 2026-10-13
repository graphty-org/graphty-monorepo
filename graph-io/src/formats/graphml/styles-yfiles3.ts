/**
 * yFiles 3 styles (yFiles for HTML, yEd Live): the per-element style objects of the `NodeStyle`, `EdgeStyle`,
 * `NodeLabels`, `EdgeLabels` and `NodeGeometry` keys, inline or by reference to the graph's `SharedData`, read into
 * the neutral style vocabulary. References are resolved by value with a depth limit; a reference that is circular
 * or deeper than the limit is one `W_STYLE_REFERENCE_CYCLE` note, never a hang.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

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
    isTree,
    localOf,
    type PutValue,
    type SiteOf,
    treeAttr,
    treeChild,
    treeChildren,
    treeText,
    valueColumns,
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
type KeyKind = "NodeStyle" | "EdgeStyle" | "NodeLabels" | "EdgeLabels" | "NodeGeometry" | "SharedData";
const KINDS: ReadonlySet<string> = new Set(["NodeStyle", "EdgeStyle", "NodeLabels", "EdgeLabels", "NodeGeometry"]);

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

/**
 * Reads a node style.
 * @param refs - the references
 * @param data - the `<data>` content of the NodeStyle key
 * @param put - receives the values
 * @param at - the sites
 */
function readNodeStyle(refs: References, data: unknown, put: PutValue, at: SiteOf): void {
    const st = unwrapped(refs, refs.first(data));
    if (st === null || typeof st !== "object") {
        if (data !== null && data !== undefined && data !== "") {
            noteAt(at("fill"), STYLE_ISSUE.UNRESOLVED, "NodeStyle");
        }
        return;
    }
    const style = st;
    putPaint(
        paintOf(refs, prop(style, "fill"), () => {
            noteAt(at("fill"), STYLE_ISSUE.GRADIENT, style.tag);
        }),
        "fill",
        "fillOpacity",
        put,
        at,
    );
    const stroke = strokeOf(refs, prop(style, "stroke"));
    if (stroke === NULL) {
        put("borderWidth", 0);
    } else if (stroke !== null) {
        putPaint(stroke.color, "borderColor", null, put, at);
        put("borderWidth", canonNumber(stroke.width, at("borderWidth")));
        put("borderStyle", canonEnum("borderStyle", stroke.line, "yfiles3", at("borderStyle")));
    }
    put("shape", nodeShapeOf(style, at));
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
        return canonEnum("shape", shape, "yfiles3", at("shape"));
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
        const a = refs.deref(prop(st, `${end}Arrow`));
        const property = `${end}Arrow`;
        let type: string | null = null;
        if (a !== null && a !== NULL && typeof a === "object") {
            type = treeAttr(a.e, "type") ?? "DEFAULT";
            putPaint(paintOf(refs, prop(a, "fill"), null), `${end}ArrowColor`, null, put, at);
        } else if (typeof a === "string") {
            type = a;
        }
        if (type !== null) {
            put(property, canonEnum("arrow", /^default$/i.test(type) ? "triangle" : type, "yfiles3", at(property)));
        }
    }
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
    const ls = refs.deref(treeAttr(label, "Style") ?? treeChild(label, "Label.Style"));
    if (ls === null || ls === NULL || typeof ls !== "object" || !ls.tag.endsWith("LabelStyle")) {
        return;
    }
    putPaint(paintOf(refs, prop(ls, "textFill"), null), "labelColor", null, put, at);
    const f = refs.deref(prop(ls, "font"));
    if (f !== null && f !== NULL && typeof f === "object" && f.tag === "Font") {
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
    const read = (target: StyleTarget, kinds: Map<KeyKind, string>): ReturnType<typeof valueColumns>["values"] => {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const out = valueColumns(n);
        const style = kinds.get(target === "node" ? "NodeStyle" : "EdgeStyle");
        const labels = kinds.get(target === "node" ? "NodeLabels" : "EdgeLabels");
        const geometry = target === "node" ? kinds.get("NodeGeometry") : undefined;
        const readStyle = target === "node" ? readNodeStyle : readEdgeStyle;
        const cell = (name: string | undefined, i: number): unknown =>
            name === undefined ? undefined : plainCell(table.value(name, i));
        for (let i = 0; i < n; i++) {
            budget.spend(target, 1);
            const at: SiteOf = (property) => ({ notes, target, property, element: i, budget });
            const put: PutValue = (property, value) => {
                out.put(i, property, value);
            };
            if (style !== undefined) {
                readStyle(refs, cell(style, i), put, at);
            }
            if (labels !== undefined) {
                readLabels(refs, cell(labels, i), put, at);
            }
            if (geometry !== undefined) {
                const rect = treeChild(cell(geometry, i), "RectD");
                put("width", canonNumber(treeAttr(rect, "Width"), at("width")));
                put("height", canonNumber(treeAttr(rect, "Height"), at("height")));
            }
        }
        return out.values;
    };
    const node = read("node", nodeKinds);
    const edge = read("edge", edgeKinds);
    if (refs.cycles > 0) {
        notes.add(STYLE_ISSUE.REFERENCE_CYCLE, null, null, {
            sample: `references deeper than ${String(MAX_REFERENCE_DEPTH)} or circular (${String(refs.cycles)})`,
        });
    }
    return { node, edge };
}
