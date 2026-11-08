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
import { canonNumber, num6 } from "../../styles/canon/number.js";
import { type CanonSite, MAX_STYLE_VALUE_LENGTH, noteAt } from "../../styles/canon/site.js";
import { canonText, htmlLabelSpans } from "../../styles/canon/text.js";
import { spreadRamp } from "../../styles/canon/yed-gradient.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import type { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type { StyleDialect, StyleProperty, StyleTarget, StyleWorkBudget } from "../../styles/types.js";
import { META_KEY } from "./constants.js";
import {
    BPMN_ARTIFACTS,
    configurationOutline,
    isTree,
    lineLength,
    localOf,
    pointAlong,
    putBevelLine,
    putBevelPaint,
    putEdgeLabelAt,
    putNodeDrawing,
    putPanelPaint,
    type PutValue,
    type SiteOf,
    towardWhite,
    treeAttr,
    treeChild,
    treeChildren,
    treeText,
    valueColumns,
    YED_LABEL_CHARACTER,
    YED_LABEL_LINE,
    type YedOutline,
    type YedRead,
} from "./styles-yed.js";
import {
    bpmnPicture,
    groupIconPicture,
    type PortEvent,
    shinyPlateGloss,
    type UmlClass,
    umlDrawing,
} from "./styles-yed-live-drawing.js";

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
 * (handed to `gradient`), or `{x:Null}`.
 * @param refs - the references
 * @param v - the property value
 * @param gradient - called with the gradient when the paint is one
 * @param depth - the walk's depth
 * @returns the paint
 */
function paintOf(refs: References, v: unknown, gradient: ((g: StyleObject) => void) | null, depth = 0): Paint {
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
        gradient?.(x);
        const stop = gradientStops(x)[0];
        return stop === undefined ? null : paintOf(refs, treeAttr(stop, "color"), null, depth + 1);
    }
    if (tag === "Stroke") {
        return paintOf(refs, prop(x, "fill"), gradient, depth + 1);
    }
    return null;
}

/**
 * A gradient's GradientStop elements, as written.
 * @param g - the gradient
 * @returns its stops
 */
function gradientStops(g: StyleObject): unknown[] {
    const own = treeChildren(g.e, "GradientStop");
    return own.length > 0 ? own : treeChildren(treeChild(g.e, `${g.tag}.GradientStops`), "GradientStop");
}

/**
 * A point of a LinearGradient: `x,y` fractions of the node's box.
 * @param g - the gradient
 * @param name - `startPoint` or `endPoint`
 * @param fallback - its default
 * @returns the point
 */
function gradientPoint(g: StyleObject, name: string, fallback: readonly [number, number]): readonly [number, number] {
    const [x, y] = (treeAttr(g.e, name) ?? "").split(",").map(Number);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : fallback;
}

/**
 * The most stops a REFLECT or REPEAT ramp is unrolled into across its node, counted as two for each of its stops on
 * each run across the box and the runs past its sides: a file asking for more is noted.
 */
const MAX_UNROLLED_STOPS = 512;

/**
 * Reads a node's gradient fill. A yFiles 3 LinearGradient's startPoint and endPoint are fractions of the node's box
 * (yEd Live draws it as an SVG gradient in objectBoundingBox units), so one whose ramp spans the box -- from side to
 * side, or from corner to corner -- is `fillGradientAngle` at the angle from start to end in those fractions, with
 * its stops as written. Any other gradient is noted, and the node is filled in its first stop.
 * A REFLECT or REPEAT ramp that starts or ends inside the box is unrolled across it (`spreadRamp`).
 * ponytail: a padded ramp inside the box and a RadialGradient are noted, not drawn, and a stop's alpha is dropped.
 * @param refs - the references
 * @param g - the gradient
 * @param owner - the style's tag, for the note
 * @param put - receives the values
 * @param at - the sites
 */
function putGradient(refs: References, g: StyleObject, owner: string, put: PutValue, at: SiteOf): void {
    const [sx, sy] = gradientPoint(g, "startPoint", [0, 0]);
    const [ex, ey] = gradientPoint(g, "endPoint", [1, 0]);
    const [dx, dy] = [ex - sx, ey - sy];
    const len2 = dx * dx + dy * dy;
    // where the box's corners sit along the ramp: its farthest ones at 0 and 1 when the ramp spans the box
    const along = [0, 1].flatMap((x) => [0, 1].map((y) => ((x - sx) * dx + (y - sy) * dy) / len2));
    const spans = len2 > 0 && Math.abs(Math.min(...along)) < 1e-6 && Math.abs(Math.max(...along) - 1) < 1e-6;
    const stops = gradientStops(g)
        .map((st) => {
            const paint = paintOf(refs, treeAttr(st, "color"), null);
            const c =
                paint === null || paint === NULL ? null : canonColor(paint.raw, paint.dialect, at("fillGradient"));
            return { offset: Number(treeAttr(st, "offset") ?? 0), color: c?.color ?? null };
        })
        .sort((a, b) => a.offset - b.offset);
    let colors: string[] = stops.flatMap((st) => (typeof st.color === "string" ? [st.color] : []));
    let offsets = stops.map((st) => num6(st.offset));
    // a REFLECT or REPEAT ramp inside the box paints its stops back and forth across it: unrolled from the box's
    // nearest corner along the ramp to its farthest (yed-live-graphml-specimen-node-fills-borders
    // linear-gradient-reflect, 0.4 to 0.6 across, is white and blue five times over)
    const spread = (treeAttr(g.e, "spreadMethod") ?? "").toLowerCase();
    // a ramp unrolled into more than MAX_UNROLLED_STOPS stops across the box (a hostile file's tiny ramp, or one of
    // thousands of stops) is noted instead
    const repeats = Math.max(...along) - Math.min(...along);
    const small = (repeats + 3) * 2 * stops.length <= MAX_UNROLLED_STOPS;
    const unrolls = !spans && len2 > 0 && small && (spread === "reflect" || spread === "repeat");
    if (g.tag !== "LinearGradient" || !(spans || unrolls) || colors.length < 2 || colors.length !== stops.length) {
        noteAt(at("fill"), STYLE_ISSUE.GRADIENT, owner);
        return;
    }
    if (unrolls) {
        const ramp = spreadRamp({ colors, stops: offsets }, spread, Math.min(...along), Math.max(...along));
        [colors, offsets] = [[...ramp.colors], [...ramp.stops]];
    }
    put("fillGradient", colors.at(-1) ?? null);
    put("fillGradientAngle", num6(((((Math.atan2(dy, dx) * 180) / Math.PI) % 360) + 360) % 360));
    if (colors.length > 2 || offsets[0] !== 0 || offsets[1] !== 1) {
        put("fillGradientColors", colors.join(" "));
        put("fillGradientStops", offsets.join(" "));
    }
}

/** A stroke's color, width and line style. */
interface Stroke {
    readonly color: Paint;
    readonly width: unknown;
    readonly line: string;
}

/**
 * The `dashStyle` attribute values yFiles writes for its DashStyle constants (`dashStyle="Dash"` in a file yFiles for
 * HTML 2.4.0.4 saved, graph-io/test/corpus/styles/graphml/yfiles-html/cheind__autoregressive__wavenet-causal-padding).
 * yEd Live 8.5.16 draws the constants' API spellings `DASH`, `DOT`, `DASH_DOT` and `DASH_DOT_DOT` solid, in 2.6 and 3.0
 * files alike: yed-live-graphml-specimen-edges-lines, -edges-lines-p2 and -node-fills-borders hold 20 such strokes and
 * their SVGs no dash but the one a `<yjs:DashStyle dashes="3 1">` element draws.
 * ponytail: DashDot and DashDotDot follow Dash's spelling, unseen in a drawing; check them when a file holds them.
 */
const DASHES: ReadonlyMap<string, string> = new Map([
    ["Solid", "solid"],
    ["Dash", "dashed"],
    ["Dot", "dotted"],
    ["DashDot", "dash-dot"],
    ["DashDotDot", "dash-dot"],
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
        line = DASHES.get(d.trim()) ?? "solid";
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
    return {
        color: paintOf(refs, prop(x, "fill"), null),
        width: typeof w === "string" ? w : (treeText(treeChild(w, "Double")) ?? 1),
        line,
    };
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
/** How far toward white, and how wide, the lighter line under a BevelNodeStyle's line is drawn. */
const BEVEL_HALO_SHARE = 0.85;
const BEVEL_HALO_WIDTH = 2;

/** ShinyPlateNodeStyle's corner `radius` with none written. */
const SHINY_RADIUS = 5;

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
 * @returns the radius, or null where it is not a number
 */
function putRounded(radius: string | undefined, fallback: number, put: PutValue, at: SiteOf): number | null {
    const r = radius === undefined ? fallback : canonNumber(radius, at("cornerRadius"));
    if (r === 0) {
        put("shape", "rectangle");
        return r;
    }
    put("shape", "round-rectangle");
    put("cornerRadius", r);
    return r;
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
    // under it yFiles for HTML draws a line of 2 most of the way to white (#c8c8c8 over #f7f7f7, #3366ff over
    // #e0e8ff: yed-live-graphml-specimen-node-shapes-p2)
    put("shapeLineHaloColor", towardWhite(color, BEVEL_HALO_SHARE));
    put("shapeLineHaloWidth", BEVEL_HALO_WIDTH);
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
 * Reads the rest of a ShinyPlateNodeStyle past its fill: an outline only where `stroke` is set, its corners, and the
 * gloss yEd Live draws over its upper left, as the node's picture where its size is known.
 * @param refs - the references
 * @param style - the style
 * @param size - the node's size, where it has one
 * @param put - receives the values
 * @param at - the sites
 */
function readShinyPlateStyle(refs: References, style: StyleObject, size: Size | null, put: PutValue, at: SiteOf): void {
    const stroke = prop(style, "stroke") === undefined ? NULL : strokeOf(refs, prop(style, "stroke"));
    putStroke(stroke, put, at);
    const radius = putRounded(treeAttr(style.e, "radius"), SHINY_RADIUS, put, at) ?? 0;
    if (size !== null) {
        const border = stroke === null || stroke === NULL ? 0 : Number(stroke.width) || 0;
        put("image", shinyPlateGloss(size.width, size.height, radius, border));
        put("imageFit", "fill");
        put("imageClip", "none");
    }
}

/**
 * Reads the yFiles for HTML 2.6 node styles yEd Live wrote before yFiles 3, and the demos' FlowchartNodeStyle:
 * BevelNodeStyle and PanelNodeStyle (painted from their `color`), ShinyPlateNodeStyle (an outline only where `stroke`
 * is set) and FlowchartNodeStyle (its `type`'s outline, drawn as yEd's flowchart palette draws the same type).
 * @param refs - the references
 * @param style - the style
 * @param size - the node's size, where it has one
 * @param put - receives the values
 * @param at - the sites
 * @returns true when the style is one of these
 */
function readStyle26(refs: References, style: StyleObject, size: Size | null, put: PutValue, at: SiteOf): boolean {
    const fill = (v: unknown): string | null => {
        const gradient = (g: StyleObject): void => {
            putGradient(refs, g, style.tag, put, at);
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
        case "ShinyPlateNodeStyle":
            fill(prop(style, "fill") ?? BLACK);
            readShinyPlateStyle(refs, style, size, put, at);
            return true;
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
 * Reads a `bpmn:` node style: `background` and `outline` paint the shape its kind draws, and its symbols are drawn as
 * a picture over it (`bpmnPicture`). yFiles' own GroupNodeStyle has the same local name, and neither color.
 * @param refs - the references
 * @param style - the style
 * @param size - the node's size
 * @param put - receives the values
 * @param at - the sites
 * @param ports - the node's ports, as the ports column holds them
 * @returns true when the style is one of these
 */
function readBpmnStyle(
    refs: References,
    style: StyleObject,
    size: Size | null,
    put: PutValue,
    at: SiteOf,
    ports: unknown,
): boolean {
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
    if (size !== null) {
        putBpmnPicture(refs, style, size, put, at, ports);
    }
    return true;
}

/**
 * A style's attributes and colors, as a node picture reads them: a color as `#rrggbb`, undefined where it has none.
 * @param refs - the references
 * @param style - the style
 * @param at - the sites
 * @returns the readers
 */
function styleReader(refs: References, style: StyleObject, at: SiteOf): Pick<PortEvent, "attr" | "color"> {
    return {
        attr: (name) => treeAttr(style.e, name),
        color: (name) => {
            const paint = paintOf(refs, prop(style, name), null);
            return paint === null || paint === NULL
                ? undefined
                : canonColor(paint.raw, paint.dialect, at("image"))?.color;
        },
    };
}

/** The attributes yEd Live 8.5.16 reads on an EventPortStyle: it draws no port whose style has another. */
const PORT_EVENT_ATTRIBUTES: ReadonlySet<string> = new Set([
    "type",
    "characteristic",
    "background",
    "outline",
    "iconColor",
    "renderSize",
]);

/**
 * The BPMN events on a node's ports: each port drawn with an EventPortStyle and placed by a
 * FreeNodePortLocationModelParameter (its `Ratio` of the node's box, then its `Offset`). yEd Live draws nothing for a
 * port whose style has an attribute it does not read (`checked` on `yed-live-graphml-specimen-node-shapes-p6`).
 * ponytail: the free model only, the one yEd Live writes; another location model's port is not drawn.
 * @param refs - the references
 * @param ports - the node's ports, as the ports column holds them
 * @param size - the node's size
 * @param at - the sites
 * @returns the events
 */
function portEvents(refs: References, ports: unknown, size: Size, at: SiteOf): PortEvent[] {
    return (Array.isArray(ports) ? ports : []).flatMap((entry: unknown): PortEvent[] => {
        const style = isTree(entry) ? refs.first(entry.PortStyle) : null;
        const point = freePortPoint(refs, entry, size);
        if (style?.tag !== "EventPortStyle" || point === null || !isTree(style.e)) {
            return [];
        }
        const unread = Object.keys(style.e).some(
            (k) => k.startsWith("@_") && !k.includes(":") && !PORT_EVENT_ATTRIBUTES.has(k.slice(2)),
        );
        return unread ? [] : [{ x: point[0], y: point[1], ...styleReader(refs, style, at) }];
    });
}

/**
 * Where a port sits on its node, from the top-left corner of the node's box: its FreeNodePortLocationModelParameter's
 * `Ratio` of the box, then its `Offset`, written in place or as a `<y:GraphMLReference>` to the graph's shared data.
 * ponytail: the free model only, the one yFiles for HTML and yEd Live write in the corpus; another model reads as null.
 * @param refs - the references
 * @param entry - the port's entry in its node's ports column
 * @param size - the node's size
 * @returns the point, or null when the port has no free location
 */
function freePortPoint(refs: References, entry: unknown, size: Size): BendPoint | null {
    const where = isTree(entry) ? refs.first(entry.PortLocationParameter) : null;
    if (where?.tag !== "FreeNodePortLocationModelParameter") {
        return null;
    }
    const pair = (name: string, unset: string): number[] => (treeAttr(where.e, name) ?? unset).split(",").map(Number);
    const [[rx, ry], [ox, oy]] = [pair("Ratio", "0.5,0.5"), pair("Offset", "0,0")];
    const x = rx * size.width + ox;
    const y = ry * size.height + oy;
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

/**
 * Writes the picture of a BPMN node's symbols, its messages and the events on its ports, where it has any. A picture
 * reaching past the node (a port's event, a message) is drawn at its own size, as far off the node's middle as it
 * reaches further on one side than the other.
 * @param refs - the references
 * @param style - the style
 * @param size - the node's size
 * @param put - receives the values
 * @param at - the sites
 * @param ports - the node's ports, as the ports column holds them
 */
function putBpmnPicture(
    refs: References,
    style: StyleObject,
    size: Size,
    put: PutValue,
    at: SiteOf,
    ports: unknown,
): void {
    const drawing = bpmnPicture(style.tag, styleReader(refs, style, at), size, portEvents(refs, ports, size, at));
    if (drawing !== null) {
        putNodeDrawing(drawing, put);
    }
}

/** How far under the top of a UMLNodeStyle yEd Live writes its class's name, past where `inside-top` puts it. */
const UML_NAME_DROP = 13;

/**
 * The words of a UMLClassModel: its name's neighbours and its two sections.
 * @param model - the model's element
 * @returns the words
 */
function umlClass(model: unknown): UmlClass {
    const rows = (name: string): string[] =>
        treeChildren(treeChild(treeChild(model, `UMLClassModel.${name}`), "Array"), "String").map(
            (row) => treeText(row) ?? "",
        );
    return {
        stereotype: treeAttr(model, "stereotype") ?? "",
        constraint: treeAttr(model, "constraint") ?? "",
        sections: [
            { name: "Attributes", rows: rows("attributes"), open: treeAttr(model, "attributesOpen") !== "false" },
            { name: "Operations", rows: rows("operations"), open: treeAttr(model, "operationsOpen") !== "false" },
        ],
    };
}

/**
 * Reads a UMLNodeStyle as yEd Live 8.5.16 draws it (`yed-live-graphml-specimen-node-shapes-p7`): a box with corners of
 * 10, outlined in its `fill` 2 wide, its model's `className` in white at the top, and its sections drawn as a picture
 * over it (`umlDrawing`) at the size they need.
 * @param refs - the references
 * @param style - the style
 * @param size - the node's stored size
 * @param put - receives the values
 * @param at - the sites
 */
function readUmlStyle(refs: References, style: StyleObject, size: Size | null, put: PutValue, at: SiteOf): void {
    const fill = paintOf(refs, prop(style, "fill"), null);
    putPaint(fill, "fill", "fillOpacity", put, at);
    putStroke({ color: fill, width: 2, line: "solid" }, put, at);
    put("shape", "round-rectangle");
    put("cornerRadius", 10);
    const model = refs.deref(prop(style, "model"));
    if (model === null || model === NULL || typeof model !== "object") {
        return;
    }
    const name = treeAttr(model.e, "className");
    if (name !== undefined) {
        put("label", canonText(name, at("label")));
        put("labelColor", "#ffffff");
        put("labelPosition", "inside-top");
        put("labelOffsetY", UML_NAME_DROP);
    }
    const color = fill === null || fill === NULL ? null : canonColor(fill.raw, fill.dialect, at("fill"));
    const drawing = umlDrawing(umlClass(model.e), size ?? { width: 0, height: 0 }, color?.color ?? "none");
    put("width", drawing.width);
    put("height", drawing.height);
    put("image", drawing.picture);
    put("imageFit", "fill");
}

/**
 * Reads a style that draws a picture: an ImageNodeStyle's `href` and a ColoredIconNodeStyle's `image`, stretched to the
 * node, with no body but an ImageNodeStyle's background. yEd Live 8.5.16 draws the icon in its own colors whatever its
 * `color` (`yed-live-graphml-specimen-node-shapes-p7`).
 * @param refs - the references
 * @param style - the style
 * @param put - receives the values
 * @param at - the sites
 * @returns true when the style is one of these
 */
function readPictureStyle(refs: References, style: StyleObject, put: PutValue, at: SiteOf): boolean {
    if (style.tag !== "ImageNodeStyle" && style.tag !== "ColoredIconNodeStyle") {
        return false;
    }
    const src = treeAttr(style.e, "href") ?? treeText(treeChild(style.e, `${style.tag}.image`));
    if (src === null) {
        return true;
    }
    const fill = prop(style, "backgroundFill");
    const stroke = prop(style, "backgroundStroke");
    if (fill === undefined && stroke === undefined) {
        put("shape", "none");
    } else {
        putPaint(paintOf(refs, fill, null), "fill", "fillOpacity", put, at);
        putStroke(strokeOf(refs, stroke), put, at);
        put("shape", treeAttr(style.e, "backgroundShape") === "ELLIPSE" ? "ellipse" : "rectangle");
    }
    put("image", src.trim());
    put("imageFit", "fill");
    put("imageClip", "none");
    return true;
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
    const position = treeAttr(style.e, "tabPosition") ?? "TOP";
    putGroupIcon(refs, style, size, collapsed, position, put, at);
    if (collapsed) {
        putPaint(tabFill, "fill", "fillOpacity", put, at);
        return;
    }
    putPaint(paintOf(refs, prop(style, "contentAreaFill") ?? "#FFFFFFFF", null), "fill", "fillOpacity", put, at);
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
 * Writes the picture of a GroupNodeStyle's icon on its tab (`groupIconPicture`): `groupIcon` (none unset) on an open
 * group, `folderIcon` (a plus unset) on a collapsed one, over a white round square (`iconBackgroundShape`,
 * `iconBackgroundFill`) in #AAAAAA (`iconForegroundFill`), 14 across (`iconSize`), as yEd Live 8.5.16 draws
 * `yed-live-graphml-specimen-groups-p2` to `-p4`.
 * ponytail: a tab on the top only, the one place the sheets draw an icon; another side's icon is not drawn.
 * @param refs - the references
 * @param style - the style
 * @param size - the group's size
 * @param collapsed - whether the group is collapsed
 * @param position - its `tabPosition`
 * @param put - receives the values
 * @param at - the sites
 */
function putGroupIcon(
    refs: References,
    style: StyleObject,
    size: Size,
    collapsed: boolean,
    position: string,
    put: PutValue,
    at: SiteOf,
): void {
    const { attr, color } = styleReader(refs, style, at);
    const sign = collapsed ? (attr("folderIcon") ?? "PLUS") : (attr("groupIcon") ?? "NONE");
    if (position !== "TOP") {
        return;
    }
    const number = (name: string, unset: number): number => canonNumber(attr(name) ?? unset, at("image")) ?? unset;
    const stroke = strokeOf(refs, prop(style, "stroke"));
    const picture = groupIconPicture(size, stroke === null || stroke === NULL ? 0 : Number(stroke.width) || 0, {
        sign,
        background: attr("iconBackgroundShape") ?? "ROUND_RECTANGLE_SOLID",
        position: attr("iconPosition") ?? "TRAILING",
        size: number("iconSize", 14),
        offset: number("iconOffset", 0),
        foregroundFill: color("iconForegroundFill") ?? "#aaaaaa",
        backgroundFill: color("iconBackgroundFill") ?? "#ffffff",
    });
    if (picture !== null) {
        put("image", picture);
        put("imageFit", "fill");
        put("imageClip", "none");
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
 * @param ports - the node's ports, as the ports column holds them
 */
function readNodeStyle(
    refs: References,
    data: unknown,
    put: PutValue,
    at: SiteOf,
    size: Size | null,
    collapsed: boolean,
    ports: unknown,
): void {
    const st = unwrapped(refs, refs.first(data));
    if (st === null || typeof st !== "object") {
        if (data !== null && data !== undefined && data !== "") {
            noteAt(at("fill"), STYLE_ISSUE.UNRESOLVED, "NodeStyle");
        }
        return;
    }
    const style = st;
    if (readStyle26(refs, style, size, put, at) || readBpmnStyle(refs, style, size, put, at, ports)) {
        return;
    }
    if (style.tag === "UMLNodeStyle") {
        readUmlStyle(refs, style, size, put, at);
        return;
    }
    if (readPictureStyle(refs, style, put, at)) {
        return;
    }
    putPaint(
        paintOf(refs, prop(style, "fill"), (g) => {
            putGradient(refs, g, style.tag, put, at);
        }),
        "fill",
        "fillOpacity",
        put,
        at,
    );
    putStroke(strokeOf(refs, prop(style, "stroke")), put, at);
    putStyleOutline(style, size, put, at);
    const shape = style.tag === "ShapeNodeStyle" ? shapeKey(treeAttr(style.e, "shape")) : null;
    putIntrinsicSize(refs, style, shape, size, put);
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
 * The width over the height of the ShapeNodeStyle shapes that have proportions of their own, which yEd Live keeps
 * under `keepIntrinsicAspectRatio`: a regular five-pointed star, measured from yEd Live 8.5.16's drawing of
 * `yed-live-graphml-specimen-node-shapes` (31.54 by 30); yFiles for HTML 2.6 files draw it to the box. ponytail: the star only, the one shape a sheet measures.
 */
const INTRINSIC_ASPECTS: ReadonlyMap<string, number> = new Map([
    ["star5", (2 * Math.sin((2 * Math.PI) / 5)) / (1 + Math.cos(Math.PI / 5))],
]);

/**
 * Sizes a ShapeNodeStyle whose shape has proportions of its own and keeps them (`keepIntrinsicAspectRatio`): as large
 * as fits its box, about its center. A yFiles for HTML 2.6 file's is drawn to the whole box
 * (yed-live-graphml-specimen-node-shapes-p2).
 * @param refs - the references
 * @param style - the style
 * @param shape - its shape's lookup key
 * @param size - the node's size
 * @param put - receives the values
 */
function putIntrinsicSize(
    refs: References,
    style: StyleObject,
    shape: string | null,
    size: Size | null,
    put: PutValue,
): void {
    const aspect = INTRINSIC_ASPECTS.get(shape ?? "");
    if (aspect === undefined || size === null || refs.yfiles26) {
        return;
    }
    if (treeAttr(style.e, "keepIntrinsicAspectRatio") === "true") {
        put("width", Math.min(size.width, size.height * aspect));
        put("height", Math.min(size.height, size.width / aspect));
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
    if (st.tag === "BpmnEdgeStyle") {
        readBpmnEdgeStyle(refs, st, put, at);
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
 * How yEd Live 8.5.16 draws each `bpmn:BpmnEdgeStyle` type (yed-live-graphml-specimen-edges-lines-p3.svg): its line
 * pattern (a message flow dashed 2,2, the associations dotted 0.01,2 with round caps) and its arrowheads as yFiles
 * arrow types (a filled 8 x 6 triangle, a hollow one, a hollow 6 wide circle, a hollow 16 x 8 diamond, two stroked
 * arms). A default flow's slash across its source end has no arrow shape and is left out. Against the normal head,
 * 8 long and 6 wide, a conditional flow's diamond is 2 long and 4/3 wide; a message flow's circle is yEd Live's
 * normal ELLIPSE head, 6 across.
 */
const BPMN_EDGE_TYPES: ReadonlyMap<string, { line: string; source: string; target: string }> = new Map([
    ["SEQUENCE_FLOW", { line: "solid", source: "none", target: "TRIANGLE" }],
    ["DEFAULT_FLOW", { line: "solid", source: "none", target: "TRIANGLE" }],
    ["CONDITIONAL_FLOW", { line: "solid", source: "diamond-open", target: "TRIANGLE" }],
    ["MESSAGE_FLOW", { line: "dashed", source: "circle-open", target: "triangle-open" }],
    ["ASSOCIATION", { line: "dotted", source: "none", target: "none" }],
    ["DIRECTED_ASSOCIATION", { line: "dotted", source: "none", target: "OPEN" }],
    ["BIDIRECTED_ASSOCIATION", { line: "dotted", source: "OPEN", target: "OPEN" }],
    ["CONVERSATION", { line: "solid", source: "none", target: "none" }],
]);

/**
 * Reads a `bpmn:BpmnEdgeStyle`: its `color` (black unset) and its `type` (a sequence flow unset). A conversation is
 * drawn as a band 3 wide in its color with a line 1 wide in its `innerColor` (white unset) along its middle.
 * @param refs - the references
 * @param st - the style
 * @param put - receives the values
 * @param at - the sites
 */
function readBpmnEdgeStyle(refs: References, st: StyleObject, put: PutValue, at: SiteOf): void {
    const raw = treeAttr(st.e, "type") ?? "SEQUENCE_FLOW";
    const look = BPMN_EDGE_TYPES.get(raw.toUpperCase());
    if (look === undefined) {
        noteAt(at("lineStyle"), STYLE_ISSUE.BAD_VALUE, raw);
        return;
    }
    const color = paintOf(refs, prop(st, "color") ?? "#FF000000", null);
    if (raw.toUpperCase() === "CONVERSATION") {
        putPaint(paintOf(refs, prop(st, "innerColor") ?? "#FFFFFFFF", null), "color", "opacity", put, at);
        putPaint(color, "outlineColor", "outlineOpacity", put, at);
        put("width", 1);
        put("outlineWidth", 2);
    } else {
        putPaint(color, "color", "opacity", put, at);
    }
    put("lineStyle", look.line);
    put("sourceArrow", canonEnum("arrow", look.source, "yfiles3", at("sourceArrow")));
    put("targetArrow", canonEnum("arrow", look.target, "yfiles3", at("targetArrow")));
    const [length, width] = BPMN_SOURCE_SIZES.get(look.source) ?? [null, null];
    put("sourceArrowLength", length);
    put("sourceArrowWidth", width);
}

/** The length and width of a BPMN edge's source heads against the normal head's (yed-live-graphml-specimen-edges-lines-p3.svg). */
const BPMN_SOURCE_SIZES: ReadonlyMap<string, readonly [number, number]> = new Map([["diamond-open", [16 / 8, 8 / 6]]]);

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
 * An edge's bends.
 * @param geometry - the `<data>` content of the EdgeGeometry key
 * @returns the `y:Bend` locations
 */
function edgeBends(geometry: unknown): BendPoint[] {
    return treeChildren(treeChild(geometry, "List"), "Bend").map((b): BendPoint => {
        const [x, y] = (treeAttr(b, "Location") ?? "").split(",").map(Number);
        return [x, y];
    });
}

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
    const points = edgeBends(geometry);
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
    ["GroupNodeLabelModelParameter", "inside"],
]);

/** The models that hang a label's top left corner from the node's by a `LayoutOffset`. */
const FREE_NODE_LABEL_MODELS: ReadonlySet<string> = new Set([
    "FreeNodeLabelModelParameter",
    "RatioAnchoredLabelModelParameter",
]);

/**
 * How far right of a free label's corner yEd Live draws its words: it centers them in a box it measures a little wider
 * than it draws them (0.2 to 1.1 px, most 0.8, on `graphml-yfiles-html-stag-flowchart`'s 35 labels; none down).
 */
const FREE_LABEL_WORDS_INSET = 0.8;

/** The attributes a node label model states its label's distance from the node's side in. */
const MODEL_GAP_ATTRIBUTES = ["Padding", "Insets", "Margins", "YOffset"];

/** How far down a group's top a yFiles group label's middle is: the middle of the tab and the frame round it. */
const GROUP_LABEL_MIDDLE = (18 + GROUP_FRAME) / 2;

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
    if (p === null || p === NULL || typeof p !== "object") {
        return null;
    }
    if (p.tag !== "CompositeLabelModelParameter") {
        return p;
    }
    // a composite model places its label by the parameter of the model it holds
    const inner = refs.deref(treeChild(p.e, "CompositeLabelModelParameter.Parameter"));
    return inner === null || inner === NULL || typeof inner !== "object" ? null : inner;
}

/**
 * Where yFiles draws a node label, from its layout parameter's model and `Position`: outside the node for the
 * exterior and sandwich models, inside it (`inside-*`) for the interior and stretch models and on a group's top, and
 * the center for a centered position or any other model (`readLabelPlace` moves a free model's label from there). A
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
    if (parameter.tag === "GroupNodeLabelModelParameter") {
        return "inside-top";
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

/**
 * The distance from the node's side its label model states, for a shared model that says one.
 * @param refs - the references
 * @param parameter - the label's layout parameter
 * @returns the distance, or 0
 */
function modelGap(refs: References, parameter: StyleObject): number {
    const model = refs.deref(treeAttr(parameter.e, "Model"));
    if (model === null || model === NULL || typeof model !== "object") {
        return 0;
    }
    const name = MODEL_GAP_ATTRIBUTES.find((a) => treeAttr(model.e, a) !== undefined);
    const gap = name === undefined ? Number.NaN : Number(treeAttr(model.e, name));
    return Number.isFinite(gap) ? gap : 0;
}

/**
 * Reads how far from where its position puts it a node label is drawn: a free model's label by its top left corner, a
 * group's label on the middle of its tab, and any other model's by the distance the model states, in from the side of
 * a label inside the node and out from it otherwise.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @param position - where the label is placed
 * @param size - the node's size
 * @param put - receives the values
 * @returns whether the label's place is set, so the words' alignment in its box must leave it
 */
function readLabelPlace(refs: References, label: unknown, position: string, size: Size | null, put: PutValue): boolean {
    const parameter = layoutParameter(refs, label);
    if (parameter === null) {
        return false;
    }
    if (parameter.tag === "GroupNodeLabelModelParameter") {
        put("labelOffsetY", GROUP_LABEL_MIDDLE);
        put("labelShiftY", -0.5);
        return true;
    }
    const offset = treeAttr(parameter.e, "LayoutOffset")?.split(",").map(Number) ?? [];
    if (
        FREE_NODE_LABEL_MODELS.has(parameter.tag) &&
        size !== null &&
        offset.length === 2 &&
        offset.every(Number.isFinite)
    ) {
        put("labelOffsetX", offset[0] - size.width / 2 + FREE_LABEL_WORDS_INSET);
        put("labelOffsetY", offset[1] - size.height / 2);
        put("labelShiftX", 0.5);
        put("labelShiftY", 0.5);
        return true;
    }
    const inside = position.startsWith("inside-");
    const gap = modelGap(refs, parameter) * (inside ? 1 : -1);
    const toward = (low: string, high: string): number =>
        Number(position.includes(low)) - Number(position.includes(high));
    const [x, y] = [toward("left", "right"), toward("top", "bottom")];
    if (gap !== 0 && inside && size !== null && !parameter.tag.includes("Stretch")) {
        // the model's distance is the words', and a box here stands off them: pin the words themselves
        put("labelPosition", "center");
        put("labelOffsetX", x * (gap - size.width / 2) || null);
        put("labelOffsetY", y * (gap - size.height / 2) || null);
        put("labelShiftX", x / 2 || null);
        put("labelShiftY", y / 2 || null);
        return true;
    }
    put("labelOffsetX", x * gap || null);
    put("labelOffsetY", y * gap || null);
    return false;
}

/**
 * Reads where a label's words stand in a box larger than them: a style's `minimumSize` makes the label's box, and
 * its text alignments hold the words against that box's sides. Read for a label in its node's middle, the box's.
 * @param ls - the label style
 * @param put - receives the values
 */
function readWordsInBox(ls: StyleObject, put: PutValue): void {
    const box = (treeAttr(ls.e, "minimumSize") ?? "").split(",").map(Number);
    if (box.length !== 2 || !box.every(Number.isFinite)) {
        return;
    }
    const side = (name: string, low: string, high: string): number =>
        Number(treeAttr(ls.e, name) === high) - Number(treeAttr(ls.e, name) === low);
    const [x, y] = [side("horizontalTextAlignment", "LEFT", "RIGHT"), side("verticalTextAlignment", "TOP", "BOTTOM")];
    put("labelOffsetX", (x * box[0]) / 2 || null);
    put("labelShiftX", -x / 2 || null);
    put("labelOffsetY", (y * box[1]) / 2 || null);
    put("labelShiftY", -y / 2 || null);
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

/** The boxes an edge runs between and its route through its bends, for placing its label. */
interface EdgePath {
    boxes: readonly [readonly number[], readonly number[]];
    route: readonly BendPoint[];
}

/** Where a yFiles edge label model puts its label. */
interface EdgeLabelPlace {
    /** The segment it is placed on, counted from the end it is placed from; null for the whole line. */
    segment: number | null;
    /** How far along, as a part of the room its box has there: 0 against the start, 1 against the end. */
    ratio: number;
    /** How far from the line's ends that room stops. */
    inset: number;
    /** Whether it is placed from the target, not the source. */
    fromTarget?: boolean;
    /** How far off the line, right of its way for a positive one. */
    offset: number;
    /** Whether `offset` stops at the side of its box, not at its middle. */
    clear: boolean;
    /** Whether above and below are the page's, not the line's way's. */
    level: boolean;
    /** The turn it is drawn at, in radians; null when `follow` says. */
    angle: number | null;
    /** Whether, with no angle, it turns with its segment. */
    follow: boolean;
}

/**
 * Where yEd Live 8.5.16 draws an edge label with no layout parameter, or with one it does not read: 5 clear of the
 * middle of the edge's first segment, below it, turned with it. It does not read a `Ratio` on a
 * SmartEdgeLabelModelParameter, or an EdgePathLabelModelParameter or EdgeSegmentLabelModelParameter whatever it says:
 * `yed-live-graphml-specimen-edge-labels` draws all of them so, its `OnEdge`, `Distance="12"` and `Angle="0.7"` ones
 * too. No file yFiles saved in the corpus spells one so.
 */
const DEFAULT_EDGE_LABEL_PLACE: EdgeLabelPlace = {
    segment: 0,
    ratio: 0.5,
    inset: 0,
    offset: 5,
    clear: true,
    level: true,
    angle: null,
    follow: true,
};

/** The distance a NinePositionsEdgeLabelModel with none stated keeps: yFiles' default, on no sample here. */
const NINE_POSITIONS_DISTANCE = 10;

/** The nine-position model's positions: where along the line, and which side of it. */
const NINE_POSITION = /^(source|center|target)(above|centered|below)$/i;

/** The ratio of each of the nine-position model's places along the line. */
const NINE_ALONG: Readonly<Record<string, number>> = { source: 0, center: 0.5, target: 1 };

/** The side of each of the nine-position model's rows. */
const NINE_SIDE: Readonly<Record<string, number>> = { above: -1, centered: 0, below: 1 };

/** The yEd Live label size for a label whose style states none. */
const YFILES_LABEL_SIZE = 12;

/**
 * A number a parameter or model states.
 * @param e - the element
 * @param name - the attribute
 * @param fallback - what it is when not stated
 * @returns the number
 */
function numberAttr(e: unknown, name: string, fallback: number): number {
    const value = Number(treeAttr(e, name) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
}

/**
 * The model an edge label parameter names.
 * @param refs - the references
 * @param parameter - the parameter
 * @returns the model element, or undefined
 */
function parameterModel(refs: References, parameter: StyleObject): unknown {
    const model = refs.deref(treeAttr(parameter.e, "Model"));
    return model === null || model === NULL || typeof model !== "object" ? undefined : model.e;
}

/**
 * A FreeEdgeLabelModel's place: its box's middle `Ratio` along the whole line and `Distance` off it, at its `Angle`.
 * @param parameter - the parameter
 * @returns the place
 */
function freeEdgeLabelPlace(parameter: StyleObject): EdgeLabelPlace {
    return {
        ...DEFAULT_EDGE_LABEL_PLACE,
        segment: null,
        ratio: numberAttr(parameter.e, "Ratio", 0.5),
        offset: numberAttr(parameter.e, "Distance", 0),
        clear: false,
        level: false,
        angle: numberAttr(parameter.e, "Angle", 0),
    };
}

/**
 * A NinePositionsEdgeLabelModel's place: the model's `Distance` in from an end of the line, or its middle, and that far
 * clear of the line above or below it, at the model's `Angle`.
 * @param refs - the references
 * @param parameter - the parameter
 * @returns the place, or null for a position that is not one of the nine
 */
function nineEdgeLabelPlace(refs: References, parameter: StyleObject): EdgeLabelPlace | null {
    const m = NINE_POSITION.exec((treeAttr(parameter.e, "Position") ?? "").slice(0, MAX_STYLE_VALUE_LENGTH));
    if (m === null) {
        return null;
    }
    const model = parameterModel(refs, parameter);
    const distance = numberAttr(model, "Distance", NINE_POSITIONS_DISTANCE);
    return {
        ...DEFAULT_EDGE_LABEL_PLACE,
        segment: null,
        ratio: NINE_ALONG[m[1].toLowerCase()],
        inset: distance,
        offset: NINE_SIDE[m[2].toLowerCase()] * distance,
        angle: numberAttr(model, "Angle", 0),
        follow: false,
    };
}

/**
 * A SmartEdgeLabelModel's place: `SegmentRatio` along segment `SegmentIndex`, counted from the source or, by
 * `Location`, the target, and `Distance` clear of it, right of the line's way when positive.
 * @param refs - the references
 * @param parameter - the parameter
 * @returns the place
 */
function smartEdgeLabelPlace(refs: References, parameter: StyleObject): EdgeLabelPlace {
    const model = parameterModel(refs, parameter);
    const angle = treeAttr(model, "Angle");
    return {
        ...DEFAULT_EDGE_LABEL_PLACE,
        segment: numberAttr(parameter.e, "SegmentIndex", 0),
        ratio: numberAttr(parameter.e, "SegmentRatio", 0.5),
        fromTarget: treeAttr(parameter.e, "Location") === "FromTarget",
        offset: numberAttr(parameter.e, "Distance", 0),
        level: false,
        angle: angle === undefined ? null : numberAttr(model, "Angle", 0),
        follow: treeAttr(model, "AutoRotation") !== "false",
    };
}

/**
 * Where a label's layout parameter puts it on its edge.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @returns the place
 */
function edgeLabelPlaceOf(refs: References, label: unknown): EdgeLabelPlace {
    const parameter = layoutParameter(refs, label);
    switch (parameter?.tag) {
        case "FreeEdgeLabelModelParameter":
            return freeEdgeLabelPlace(parameter);
        case "NinePositionsEdgeLabelModelParameter":
            return nineEdgeLabelPlace(refs, parameter) ?? DEFAULT_EDGE_LABEL_PLACE;
        case "SmartEdgeLabelModelParameter":
            return treeAttr(parameter.e, "Ratio") === undefined
                ? smartEdgeLabelPlace(refs, parameter)
                : DEFAULT_EDGE_LABEL_PLACE;
        default:
            return DEFAULT_EDGE_LABEL_PLACE;
    }
}

/**
 * A label's font size.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @returns the size
 */
function labelFontSize(refs: References, label: unknown): number {
    const style = refs.deref(treeAttr(label, "Style") ?? treeChild(label, "Label.Style"));
    const raw = style === null || style === NULL || typeof style !== "object" ? undefined : labelSizeOf(refs, style);
    const size = Number(raw);
    return raw !== undefined && Number.isFinite(size) && size > 0 ? size : YFILES_LABEL_SIZE;
}

/**
 * The size a label style's words are drawn at, as the file writes it. yEd Live 8.5.16 sizes a yFiles for HTML 2.6
 * label by its style's `textSize` alone and draws a `Font`'s `fontSize` there at 12 (yed-live-graphml-specimen-labels-p3:
 * the one label with textSize="16" is drawn at 16px, its twin with Font fontSize="16" alone at 12px, as every 2.6 label
 * of -labels-p4, -edge-labels-p2, -groups-p4 and -labels-p5); a 3.0 label by its `Font`'s `fontSize`
 * (yed-live-graphml-specimen-labels draws its 6, 8, 16, 20 and 24).
 * @param refs - the references
 * @param ls - the label style
 * @returns the size as written, or undefined where the style leaves it to the default
 */
function labelSizeOf(refs: References, ls: StyleObject): unknown {
    if (refs.yfiles26) {
        return prop(ls, "textSize");
    }
    const f = refs.deref(prop(ls, "font"));
    return f === null || f === NULL || typeof f !== "object" || f.tag !== "Font"
        ? undefined
        : treeAttr(f.e, "fontSize");
}

/**
 * The turn a place draws its label at: its angle, or its segment's, kept upright.
 * @param place - the place
 * @param dir - the way the line runs there
 * @returns the turn, in radians
 */
function edgeLabelTurn(place: EdgeLabelPlace, dir: BendPoint): number {
    if (place.angle !== null || !place.follow) {
        return place.angle ?? 0;
    }
    const turn = Math.atan2(dir[1], dir[0]);
    return Math.abs(turn) > Math.PI / 2 ? turn - Math.sign(turn) * Math.PI : turn;
}

/**
 * The middle of a label's box on the line drawn between its edge's nodes, and the turn it is drawn at.
 * @param place - where its model puts it
 * @param box - its width and height
 * @param line - the line
 * @returns the point and the turn, in radians
 */
function edgeLabelSpot(
    place: EdgeLabelPlace,
    box: readonly [number, number],
    line: readonly BendPoint[],
): { center: BendPoint; turn: number } {
    const [width, height] = box;
    const way = place.fromTarget === true ? [...line].reverse() : line;
    const index = Math.max(0, Math.min(place.segment ?? 0, way.length - 2));
    const run = place.segment === null ? way : way.slice(index, index + 2);
    const room = lineLength(run) - width - 2 * place.inset;
    const { at, dir } = pointAlong(run, place.inset + width / 2 + place.ratio * room);
    const turn = edgeLabelTurn(place, dir);
    const relative = turn - Math.atan2(dir[1], dir[0]);
    const half = Math.abs(Math.sin(relative) * width) / 2 + Math.abs(Math.cos(relative) * height) / 2;
    const off = place.offset + (place.clear ? Math.sign(place.offset) * half : 0);
    const flip = (place.fromTarget === true) === (place.level && dir[0] < 0) ? 1 : -1;
    return { center: [at[0] - flip * dir[1] * off, at[1] + flip * dir[0] * off], turn };
}

/**
 * Reads where yFiles draws an edge's label from its layout parameter, measured on yEd Live 8.5.16's drawings of
 * `yed-live-graphml-specimen-edge-labels` and its `-p2`. Its width is estimated, since the file stores none.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @param words - the label's text
 * @param path - the edge's boxes and route
 * @param put - receives the values
 */
function readEdgeLabelPlace(refs: References, label: unknown, words: string, path: EdgePath, put: PutValue): void {
    const place = edgeLabelPlaceOf(refs, label);
    const fontSize = labelFontSize(refs, label);
    const lines = words.split("\n");
    const width = Math.max(...lines.map((l) => l.length)) * YED_LABEL_CHARACTER * fontSize;
    const box = [width, lines.length * YED_LABEL_LINE * fontSize] as const;
    let turn = 0;
    const centerOn = (line: readonly BendPoint[]): BendPoint => {
        const spot = edgeLabelSpot(place, box, line);
        ({ turn } = spot);
        return spot.center;
    };
    putEdgeLabelAt(path.boxes, path.route, centerOn, put);
    put("labelRotation", turn === 0 ? null : ((turn * 180) / Math.PI + 360) % 360);
}

/**
 * Reads an element's labels: the first one with text; further ones are noted for the element.
 * @param refs - the references
 * @param data - the `<data>` content of the NodeLabels or EdgeLabels key
 * @param put - receives the values
 * @param at - the sites
 * @param size - a node's size
 * @param path - an edge's boxes and route; null for a node, a self-loop or an edge with an end of no known place
 */
function readLabels(
    refs: References,
    data: unknown,
    put: PutValue,
    at: SiteOf,
    size: Size | null,
    path: EdgePath | null,
): void {
    const worded = treeChildren(treeChild(data, "List"), "Label").flatMap((l) => {
        const raw = treeAttr(l, "Text") ?? treeText(treeChild(l, "Label.Text")) ?? "";
        return raw.trim().length === 0 ? [] : [{ l, raw }];
    });
    if (worded.length === 0) {
        return;
    }
    if (worded.length > 1) {
        noteAt(at("label"), STYLE_ISSUE.EXTRA_LABELS, `${String(worded.length)} labels`);
    }
    const label = worded[0].l;
    let text = worded[0].raw;
    const ls = refs.deref(treeAttr(label, "Style") ?? treeChild(label, "Label.Style"));
    const runs = typeof ls === "object" && ls !== null && ls.tag === "MarkupLabelStyle" ? markupRuns(text, at) : null;
    if (runs !== null) {
        text = runs.map((r) => r.text).join("");
    }
    put("label", canonText(text, at("label")));
    const inBox = readLabelPlacing(refs, label, text, { size, path }, put, at);
    if (ls === null || ls === NULL || typeof ls !== "object" || !ls.tag.endsWith("LabelStyle")) {
        return;
    }
    putPaint(paintOf(refs, prop(ls, "textFill"), null), "labelColor", null, put, at);
    if (inBox) {
        readWordsInBox(ls, put);
    }
    readLabelBox(refs, ls, put, at);
    readLabelFont(refs.deref(prop(ls, "font")), put, at);
    readLabelLayout(ls, put);
    if (at("label").target === "node") {
        put("labelRotation", stretchTurn(refs, label));
    }
    put("labelSize", canonNumber(labelSizeOf(refs, ls), at("labelSize")));
    if (runs !== null) {
        putMarkupRuns(runs, labelFontSize(refs, label), put);
    }
}

/**
 * Reads where a label is placed on its node or its edge.
 * @param refs - the references
 * @param label - the `y:Label` element
 * @param text - its words
 * @param on - a node's size, an edge's boxes and route
 * @param on.size - the node's size
 * @param on.path - the edge's boxes and route, or null
 * @param put - receives the values
 * @param at - the sites
 * @returns whether a node's label is drawn in its box, where its words wrap
 */
function readLabelPlacing(
    refs: References,
    label: unknown,
    text: string,
    on: { size: Size | null; path: EdgePath | null },
    put: PutValue,
    at: SiteOf,
): boolean {
    if (at("label").target === "node") {
        const position = labelPositionOf(refs, label);
        put("labelPosition", position);
        put("labelBox", labelBoxOf(refs, label, position));
        return !readLabelPlace(refs, label, position, on.size, put) && position === "center";
    }
    put("labelPosition", edgeLabelPositionOf(refs, label));
    if (on.path !== null) {
        readEdgeLabelPlace(refs, label, text, on.path, put);
    }
    return false;
}

/** A run of a MarkupLabelStyle's words in one font: what differs from the label's own font. */
interface MarkupRun {
    text: string;
    weight?: "bold";
    italic?: true;
    /** its size over the label's */
    scale?: number;
    color?: string;
}

/**
 * The font each markup tag sets, as yEd Live 8.5.16 draws them (yed-live-graphml-specimen-labels-p2 and -p5): `<b>` as
 * class yfiles-label-strong (bold), `<i>` as yfiles-label-em (italic), `<h2>` at 1.5em in bold, and `<h3>` at 1.17em
 * not bold and `<h4>` at 1em in bold (graphml-yfiles-html-ss13-tree). `<u>` underlines, which no label property holds, and the words of any other
 * tag are drawn in the font around them; a `<p>` is a line of its own.
 */
const MARKUP_TAGS: ReadonlyMap<string, Omit<MarkupRun, "text">> = new Map<string, Omit<MarkupRun, "text">>([
    ["b", { weight: "bold" }],
    ["strong", { weight: "bold" }],
    ["i", { italic: true }],
    ["em", { italic: true }],
    ["h2", { weight: "bold", scale: 1.5 }],
    ["h3", { scale: 1.17 }],
    ["h4", { weight: "bold" }],
]);

/**
 * A MarkupLabelStyle's words as runs in their fonts: tags dropped, `<br>` a line break, entities decoded, a `<span>`'s
 * `style` color kept (yEd Live draws `<span style="color:#ff0000">` red).
 * @param markup - the label's text
 * @param at - the sites
 * @returns the runs, neighbors in one font joined, blank ends trimmed
 */
function markupRuns(markup: string, at: SiteOf): MarkupRun[] {
    const open: { name: string; font: Omit<MarkupRun, "text"> }[] = [];
    const runs: MarkupRun[] = [];
    const add = (text: string): void => {
        const font = Object.assign({}, ...open.map((o) => o.font)) as Omit<MarkupRun, "text">;
        const last = runs.at(-1);
        // a line break or blank shows no font: it joins the run before it
        const same =
            text.trim() === "" || JSON.stringify({ ...last, text: "" }) === JSON.stringify({ text: "", ...font });
        if (last !== undefined && same) {
            last.text += text;
        } else {
            runs.push({ text, ...font });
        }
    };
    // each alternative is one negated character class, so a token is matched once per character, over a capped text
    const tokens = markup.slice(0, MAX_STYLE_VALUE_LENGTH).matchAll(/<[^>]*>|[^<]+/g); // NOSONAR(typescript:S5852): linear, no nested or overlapping quantifier
    for (const [token] of tokens) {
        const tag = markupTag(token);
        if (tag === null) {
            add(
                htmlLabelSpans(token)
                    .map((s) => s.text)
                    .join(""),
            );
        } else if (tag.name === "br") {
            add("\n");
        } else if (tag.closing) {
            if (tag.name === "p") {
                add("\n");
            }
            const i = open.map((o) => o.name).lastIndexOf(tag.name);
            if (i >= 0) {
                open.splice(i);
            }
        } else if (!token.endsWith("/>")) {
            open.push({ name: tag.name, font: markupFont(token, tag.name, at) });
        }
    }
    return trimRuns(runs);
}

/**
 * A markup token's tag: its name, lower case, and whether it closes one; null for words.
 * @param token - the token, a whole `<...>` tag or words
 * @returns the tag, or null
 */
function markupTag(token: string): { name: string; closing: boolean } | null {
    if (!token.startsWith("<")) {
        return null;
    }
    const inner = token.slice(1).trimStart();
    const closing = inner.startsWith("/");
    const name = /^[a-z][a-z0-9]*/i.exec(closing ? inner.slice(1).trimStart() : inner)?.[0];
    return name === undefined ? null : { name: name.toLowerCase(), closing };
}

/**
 * The font an opening markup tag sets: a `<span>`'s `style` color, else the tag's own (`MARKUP_TAGS`).
 * @param token - the tag
 * @param name - its name
 * @param at - the sites
 * @returns the font
 */
function markupFont(token: string, name: string, at: SiteOf): Omit<MarkupRun, "text"> {
    const color = /color\s*:\s*([^;"']+)/i.exec(name === "span" ? token : "")?.[1];
    const css = color === undefined ? null : canonColor(color.trim(), "css", at("labelRuns"));
    return css === null ? (MARKUP_TAGS.get(name) ?? {}) : { color: css.color };
}

/**
 * Runs without blank runs at either end, and the first and last trimmed.
 * @param runs - the runs, changed in place
 * @returns the runs
 */
function trimRuns(runs: MarkupRun[]): MarkupRun[] {
    while (runs.length > 0 && runs[0].text.trim() === "") {
        runs.shift();
    }
    while (runs.length > 0 && (runs.at(-1)?.text.trim() ?? "") === "") {
        runs.pop();
    }
    const [first, last] = [runs.at(0), runs.at(-1)];
    if (first !== undefined && last !== undefined) {
        first.text = first.text.trimStart();
        last.text = last.text.trimEnd();
    }
    return runs;
}

/**
 * Writes a markup label's fonts: one run's as the label's own, several as `labelRuns`.
 * @param runs - the runs
 * @param size - the label's own font size
 * @param put - receives the values
 */
function putMarkupRuns(runs: readonly MarkupRun[], size: number, put: PutValue): void {
    const fields = runs.map(({ text, scale, ...font }) => ({
        text,
        ...font,
        ...(scale === undefined ? {} : { size: scale * size }),
    }));
    if (fields.length === 1) {
        for (const [field, property] of [
            ["weight", "labelWeight"],
            ["italic", "labelItalic"],
            ["size", "labelSize"],
            ["color", "labelColor"],
        ] as const) {
            if (fields[0][field] !== undefined) {
                put(property, fields[0][field]);
            }
        }
    } else if (fields.some((f) => Object.keys(f).length > 1)) {
        put("labelRuns", JSON.stringify(fields));
    }
}

/**
 * What a BPMN label style fills its box with: an annotation's `background`, and a message's `initiatingColor`, or its
 * `responseColor` when `isInitiating` is false, as yEd Live 8.5.16 draws `yed-live-graphml-specimen-labels-p5`.
 * @param ls - the label style
 * @returns the fill
 */
function bpmnLabelFill(ls: StyleObject): unknown {
    if (ls.tag === "AnnotationLabelStyle") {
        return prop(ls, "background") ?? "#FFFFFFFF";
    }
    return treeAttr(ls.e, "isInitiating") === "false"
        ? (prop(ls, "responseColor") ?? "#FF808080")
        : (prop(ls, "initiatingColor") ?? "#FFFFFFFF");
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
    const bpmn = ls.tag === "AnnotationLabelStyle" || ls.tag === "MessageLabelStyle";
    const fill = bpmn ? bpmnLabelFill(ls) : prop(ls, "backgroundFill");
    // an annotation's `outline` is its bracket, no box round the words
    const stroke = strokeOf(refs, prop(ls, ls.tag === "MessageLabelStyle" ? "outline" : "backgroundStroke"));
    if (fill === undefined && (stroke === null || stroke === NULL)) {
        return;
    }
    putPaint(paintOf(refs, fill, null), "labelBackground", "labelBackgroundOpacity", put, at);
    if (stroke !== null && stroke !== NULL) {
        putPaint(stroke.color, "labelBorderColor", "labelBorderOpacity", put, at);
        put("labelBorderWidth", canonNumber(stroke.width, at("labelBorderWidth")));
    }
    const padding = prop(ls, "padding") ?? prop(ls, "insets") ?? (ls.tag === "AnnotationLabelStyle" ? "5" : "0");
    put("labelPadding", canonNumber(padding, at("labelPadding")));
    // the box is the words' own line: 12 tall at 10 px in 3.0, and 14 at the 12 px yEd Live draws every 2.6 label at
    put("labelLineHeight", 1);
}

/**
 * Reads a label style's `Font`: its family and weight (its size is `labelSizeOf`'s).
 * @param f - the dereferenced `font` property
 * @param put - receives the values
 * @param at - the sites
 */
function readLabelFont(f: ReturnType<References["deref"]>, put: PutValue, at: SiteOf): void {
    if (f === null || f === NULL || typeof f !== "object" || f.tag !== "Font") {
        return;
    }
    const family = treeAttr(f.e, "fontFamily");
    if (family !== undefined) {
        put("labelFont", canonText(family.replaceAll(/(^['"])|(['"]$)/g, ""), at("labelFont")));
    }
    const weight = treeAttr(f.e, "fontWeight");
    if (weight !== undefined) {
        put("labelWeight", canonEnum("weight", weight, "yfiles3", at("labelWeight")));
    }
    // yEd Live 8.5.16 draws ITALIC as font-style="italic" and OBLIQUE as "oblique" (yed-live-graphml-specimen-labels)
    if (/^(italic|oblique)$/i.test(treeAttr(f.e, "fontStyle") ?? "")) {
        put("labelItalic", true);
    }
}

/** A label style's `horizontalTextAlignment`, as the neutral text alignment. */
const TEXT_ALIGNS: ReadonlyMap<string, string> = new Map([
    ["LEFT", "left"],
    ["CENTER", "center"],
    ["RIGHT", "right"],
]);

/**
 * How a label style's `wrapping` fits its words to its `maximumSize`'s width, as yEd Live 8.5.16 draws them: a 2.6
 * `CHARACTER` label broken between any letters and a `WORD` label at its spaces (yed-live-graphml-specimen-labels-p3),
 * and a 3.0 label, whose box is one line tall, cut between letters with an ellipsis for `TRIM_CHARACTER_ELLIPSIS`,
 * `WRAP_CHARACTER_ELLIPSIS` and `WRAP_WORD_ELLIPSIS` (-p2: "A long la..." for all three).
 */
const WRAPPINGS: ReadonlyMap<string, readonly StyleProperty[]> = new Map([
    ["CHARACTER", ["labelWrapAnywhere"]],
    ["CHARACTER_ELLIPSIS", ["labelWrapAnywhere"]],
    ["WORD", []],
    ["WORD_ELLIPSIS", []],
    ["TRIM_CHARACTER_ELLIPSIS", ["labelWrapEllipsis"]],
    ["WRAP_CHARACTER_ELLIPSIS", ["labelWrapEllipsis"]],
    ["WRAP_WORD_ELLIPSIS", ["labelWrapEllipsis"]],
]);

/** The corner radius yEd Live 8.5.16 draws a `ROUND_RECTANGLE` label box with: rx="5" at 10 and at 12 px. */
const LABEL_BOX_CORNER = 5;

/**
 * Reads how a label style lays its words out: their alignment, its box's rounded corners and its wrapping.
 * @param ls - the label style
 * @param put - receives the values
 */
function readLabelLayout(ls: StyleObject, put: PutValue): void {
    put("labelTextAlign", TEXT_ALIGNS.get(treeAttr(ls.e, "horizontalTextAlignment") ?? "") ?? null);
    if (treeAttr(ls.e, "shape") === "ROUND_RECTANGLE") {
        put("labelCornerRadius", LABEL_BOX_CORNER);
    }
    // ponytail: the lines past the box's height (yEd Live drops them, or ends the last with an ellipsis) are kept
    const wrap = WRAPPINGS.get(treeAttr(ls.e, "wrapping") ?? "");
    const width = Number((treeAttr(ls.e, "maximumSize") ?? "").split(",")[0]);
    if (wrap === undefined || !Number.isFinite(width) || width <= 0) {
        return;
    }
    put("labelWrapWidth", width);
    for (const property of wrap) {
        put(property, true);
    }
}

/**
 * How far yEd Live 8.5.16 turns a stretch model's label: up (-90) against the left side or down the vertical middle,
 * and down (90) against the right (yed-live-graphml-specimen-labels-p2 and -p4).
 * @param refs - the references
 * @param label - the `y:Label` element
 * @returns the turn in degrees clockwise, or null for none
 */
function stretchTurn(refs: References, label: unknown): number | null {
    const parameter = layoutParameter(refs, label);
    if (!parameter?.tag.includes("Stretch")) {
        return null;
    }
    const position = (treeAttr(parameter.e, "Position") ?? "").toLowerCase();
    if (position === "left" || position === "west" || position === "centervertical") {
        return 270;
    }
    return position === "right" || position === "east" ? 90 : null;
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
    /** the name of the nodes' ports column, if the graph has one */
    readonly ports: string | undefined;
}

/**
 * Where one end of an edge attaches: its `sourceport` / `targetport`'s free location on its node, else the node's
 * center (yEd Live's oracle drawings start and end every port edge there, e.g. e31 of
 * graphml-yfiles-html-stag-flowchart at Ratio 0.75,1 of n30 and 0.5,0 of n32).
 * @param ctx - the reading's context
 * @param i - the edge's index
 * @param end - which end
 * @returns the point, NaN when the node has no NodeGeometry
 */
function edgeEnd(ctx: Yfiles3Context, i: number, end: "sourcePort" | "targetPort"): BendPoint {
    const { snapshot, boxes, ports, refs } = ctx;
    const k = end === "sourcePort" ? snapshot.edgeSource(i) : snapshot.edgeTarget(i);
    const [cx, cy, width, height] = boxes.subarray(4 * k, 4 * k + 4);
    const name = snapshot.edges.byRole(end)?.value(i);
    const list = ports === undefined || typeof name !== "string" ? null : plainCell(snapshot.nodes.value(ports, k));
    const entry: unknown = Array.isArray(list) ? list.find((p: unknown) => isTree(p) && p.name === name) : undefined;
    const point = entry === undefined ? null : freePortPoint(refs, entry, { width, height });
    return point === null ? [cx, cy] : [cx - width / 2 + point[0], cy - height / 2 + point[1]];
}

/**
 * Writes where an edge's ends attach, relative to their nodes' sizes, for an end whose port is off the node's center.
 * @param ctx - the reading's context
 * @param i - the edge's index
 * @param put - receives the values
 */
function putEdgePorts(ctx: Yfiles3Context, i: number, put: PutValue): void {
    for (const end of ["sourcePort", "targetPort"] as const) {
        const k = end === "sourcePort" ? ctx.snapshot.edgeSource(i) : ctx.snapshot.edgeTarget(i);
        const [cx, cy, width, height] = ctx.boxes.subarray(4 * k, 4 * k + 4);
        const point = edgeEnd(ctx, i, end);
        if (point[0] !== cx || point[1] !== cy) {
            put(end, canonNodeOffsets([cx, cy], [width, height], [point], true));
        }
    }
}

/**
 * An edge's boxes and route, for its label.
 * @param ctx - the reading's context
 * @param i - the edge's index
 * @param geometry - the `<data>` content of the EdgeGeometry key
 * @returns them, or null for a self-loop or an end with no NodeGeometry
 */
function edgePath(ctx: Yfiles3Context, i: number, geometry: unknown): EdgePath | null {
    const [s, t] = [ctx.snapshot.edgeSource(i), ctx.snapshot.edgeTarget(i)];
    const box = (k: number): number[] => [...ctx.boxes.subarray(4 * k, 4 * k + 4)];
    const [from, to] = [box(s), box(t)];
    if (s === t || ![...from, ...to].every(Number.isFinite)) {
        return null;
    }
    return {
        boxes: [from, to],
        route: [edgeEnd(ctx, i, "sourcePort"), ...edgeBends(geometry), edgeEnd(ctx, i, "targetPort")],
    };
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
    const { snapshot, notes, budget, refs, boxes, ports } = ctx;
    const isNode = target === "node";
    const table = isNode ? snapshot.nodes : snapshot.edges;
    const n = isNode ? snapshot.nodeCount : snapshot.edgeCount;
    const out = valueColumns(n);
    const [style, labels, geometry] = YFILES3_KINDS[target].map((kind) => kinds.get(kind));
    const cell = (name: string | undefined, i: number): unknown =>
        name === undefined ? undefined : plainCell(table.value(name, i));
    const expanded = isNode ? [...table].find((col) => col.meta.name === "Expanded")?.meta.name : undefined;
    const viewState = isNode ? [...table].find((col) => col.meta.name === "NodeViewState")?.meta.name : undefined;
    for (let i = 0; i < n; i++) {
        budget.spend(target, 1);
        const at: SiteOf = (property) => ({ notes, target, property, element: i, budget });
        const put: PutValue = (property, value) => {
            out.put(i, property, value);
        };
        if (isNode) {
            const collapsed = cell(expanded, i) === false;
            const folder = collapsed ? folderLayout(cell(viewState, i)) : null;
            const size =
                geometry === undefined ? null : readNodeGeometry(folder ?? cell(geometry, i), i, boxes, put, at);
            if (style !== undefined) {
                readNodeStyle(refs, cell(style, i), put, at, size, collapsed, cell(ports, i));
            }
            readLabels(refs, cell(labels, i), put, at, size, null);
        } else {
            readYfiles3Edge(ctx, i, { style, labels, geometry }, (name) => cell(name, i), put, at);
        }
    }
    return out.values;
}

/**
 * Reads one edge's yFiles 3 geometry, ports, style and labels.
 * @param ctx - the shared state
 * @param i - the edge
 * @param columns - the edge table's style, labels and geometry columns, each undefined where the file has none
 * @param columns.style - the style column
 * @param columns.labels - the labels column
 * @param columns.geometry - the geometry column
 * @param cell - the edge's cell of a column
 * @param put - receives the values
 * @param at - the sites
 */
function readYfiles3Edge(
    ctx: Yfiles3Context,
    i: number,
    columns: { style: string | undefined; labels: string | undefined; geometry: string | undefined },
    cell: (name: string | undefined) => unknown,
    put: PutValue,
    at: SiteOf,
): void {
    const { snapshot, refs, boxes } = ctx;
    if (columns.geometry !== undefined) {
        const box = (k: number): Float64Array => boxes.subarray(4 * k, 4 * k + 4);
        const [s, t] = [snapshot.edgeSource(i), snapshot.edgeTarget(i)];
        readEdgeGeometry(refs, cell(columns.geometry), cell(columns.style), [box(s), box(t), s === t], put);
    }
    putEdgePorts(ctx, i, put);
    if (columns.style !== undefined) {
        readEdgeStyle(refs, cell(columns.style), put, at);
    }
    readLabels(refs, cell(columns.labels), put, at, null, edgePath(ctx, i, cell(columns.geometry)));
}

/**
 * The box a collapsed group is drawn in: its NodeViewState's `<y:FolderNodeState Layout="x,y,w,h"/>`, as a
 * NodeGeometry `RectD`. yEd Live 8.5.16 draws the collapsed group of `yed-live-graphml-specimen-groups-p4` at that
 * layout (990,416,60,40), not at its expanded NodeGeometry (945,396,150,80).
 * @param viewState - the NodeViewState cell
 * @returns a geometry holding that box, or null when the file stores none
 */
function folderLayout(viewState: unknown): unknown {
    const layout = treeAttr(treeChild(treeChild(viewState, "ViewState"), "FolderNodeState"), "Layout");
    const parts = typeof layout === "string" ? layout.split(",").map(Number) : [];
    if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v))) {
        return null;
    }
    const [x, y, w, h] = parts.map(String);
    return { RectD: { "@_X": x, "@_Y": y, "@_Width": w, "@_Height": h } };
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
    const ports = [...snapshot.nodes].find(
        (col) => col.meta.origin?.namespace === "yfiles" && col.meta.origin.type === "port",
    )?.meta.name;
    const read = (target: StyleTarget, kinds: Map<KeyKind, string>): ReturnType<typeof valueColumns>["values"] =>
        readYfiles3Target({ snapshot, notes, budget, refs, boxes, ports }, target, kinds);
    const node = read("node", nodeKinds);
    const edge = read("edge", edgeKinds);
    if (refs.cycles > 0) {
        notes.add(STYLE_ISSUE.REFERENCE_CYCLE, null, null, {
            sample: `references deeper than ${String(MAX_REFERENCE_DEPTH)} or circular (${String(refs.cycles)})`,
        });
    }
    return { node, edge };
}
