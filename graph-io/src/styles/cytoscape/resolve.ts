/**
 * Cytoscape's own resolution of a visual style, per element: a bypass over a mapping over a default, per visual
 * property, with the dependencies applied (`nodeSizeLocked` makes `NODE_SIZE` drive width and height,
 * `arrowColorMatchesEdge` makes the edge's paint drive the line and both arrows). Every pass is linear in the number
 * of elements plus the size of the style, and spends from the extraction's one budget.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { type CanonSite, noteAt } from "../canon/site.js";
import { STYLE_ISSUE } from "../codes.js";
import { toolDefaults } from "../defaults.js";
import { StyleNotes } from "../notes.js";
import { discreteLookup, evalContinuous, numberOf } from "../plan/resolve.js";
import type {
    ContinuousPoint,
    Scalar,
    StyleColor,
    StyleColumn,
    StyleTarget,
    StyleTool,
    StyleValue,
    StyleWorkBudget,
} from "../types.js";
import { isStyleValue } from "../vocabulary.js";
import { readCytoscapeCharts } from "./charts.js";
import {
    arrowProportion,
    arrowSizeParser,
    colorParser,
    CYTOSCAPE_LEXICON,
    type CytoscapeValueParser,
    isUncarriedVp,
    NODE_SIZE_VP,
    sizeParser,
} from "./lexicon.js";
import {
    type CytoscapeContinuousPoint,
    type CytoscapeMapping,
    type CytoscapeStyle,
    type CytoscapeTargetStyle,
    emptyCytoscapeStyle,
} from "./mappings.js";

/**
 * One element's bypasses: visual property name to raw value; null or undefined when it has none.
 * @category Styles
 */
export type CytoscapeBypass = ReadonlyMap<string, unknown> | null | undefined;

/**
 * The elements of one target a style is resolved over.
 * @category Styles
 */
export interface CytoscapeElements {
    /** How many elements there are. */
    readonly count: number;
    /**
     * An element's value of an attribute column (a list attribute as an array), or null.
     * @param column - the column's name
     * @param i - the element index
     * @returns the value
     */
    value(column: string, i: number): unknown;
    /** Each element's bypasses, by element index. */
    readonly bypasses?: readonly CytoscapeBypass[];
    /**
     * Edges only: each edge's source and target node index, in the order Cytoscape created the edges. With them,
     * the edges Cytoscape desktop fans apart (parallel edges without bends) are marked curved; with `nodeSize` too
     * (each node's larger drawn side, by node index, as `fanNodeSizes()` reads it), they are given the `fanSpacing`
     * desktop spaces them by.
     */
    readonly ends?: {
        readonly source: ArrayLike<number>;
        readonly target: ArrayLike<number>;
        readonly nodeSize?: ArrayLike<number | null>;
    };
}

/**
 * Options of `resolveCytoscape()`.
 * @category Styles
 */
export interface CytoscapeResolveOptions {
    /** Where problems are noted. */
    readonly notes?: StyleNotes;
    /** The counted work budget. */
    readonly budget?: StyleWorkBudget;
    /**
     * Whose defaults fill what the style leaves unset: `"cytoscape"` (the desktop's default visual style, for CX,
     * CX2 and XGMML), `"cytoscape-fallbacks"` (the renderer's fallbacks, for sessions) or null for none, so an
     * element the style says nothing about is null. Defaults to null.
     */
    readonly defaults?: StyleTool | null;
    /** `resolveCytoscapeBypasses()` only: the edges' ends, as `CytoscapeElements.ends`. */
    readonly ends?: CytoscapeElements["ends"];
    /**
     * `resolveCytoscapeBypasses()` only: an element's value of an attribute column, as `CytoscapeElements.value`,
     * for what is drawn from the element's data (a chart's values); without it no element has any.
     */
    readonly value?: CytoscapeElements["value"];
}

/** How closely desktop stacks the edges it fans, 0..1: its anchors are twice this times the node size apart. */
const EDGE_STACKING_DENSITY_VP = "EDGE_STACKING_DENSITY";
/** Desktop's `EDGE_STACKING_DENSITY` default. */
const EDGE_STACKING_DENSITY_DEFAULT = 0.5;

/**
 * A graph's edge ends for `CytoscapeElements.ends`, with each node's larger side from the nodes' resolved `width`
 * and `height`: what desktop spaces the edges it fans between two nodes by.
 * @param snapshot - the graph
 * @param nodes - the nodes' values per property
 * @returns the ends
 */
export function edgeEnds(
    snapshot: GraphSnapshot,
    nodes: Partial<Record<string, StyleColumn>>,
): NonNullable<CytoscapeElements["ends"]> {
    const nodeSize = Array.from({ length: snapshot.nodeCount }, (_, i) => {
        const sides = [nodes.width?.[i], nodes.height?.[i]].filter((v): v is number => typeof v === "number");
        return sides.length === 0 ? null : Math.max(...sides);
    });
    const { src, dst } = snapshot.edgeList();
    return { source: src, target: dst, nodeSize };
}

/** Locked node sizes with no `NODE_SIZE` anywhere draw at Cytoscape's lexicon default. */
const NODE_SIZE_FALLBACK = 50;

/** A visual property and the parser that reads it for one neutral property. */
type VpChoice = readonly [vp: string, parse: CytoscapeValueParser];

/**
 * Which visual properties a style or its bypasses mention.
 * @param style - the target's style
 * @param bypasses - the elements' bypasses
 * @returns the names used anywhere, and those used by a bypass
 */
export function vpUsage(
    style: CytoscapeTargetStyle,
    bypasses: readonly CytoscapeBypass[],
): { used: Set<string>; bypassed: Set<string> } {
    const bypassed = new Set<string>();
    for (const b of bypasses) {
        if (b) {
            for (const k of b.keys()) {
                bypassed.add(k);
            }
        }
    }
    for (const [from, to] of style.bypassAliases) {
        if (bypassed.has(from)) {
            bypassed.add(to);
        }
    }
    const used = new Set([...style.defaults.keys(), ...style.mappings.keys(), ...bypassed]);
    return { used, bypassed };
}

/**
 * Which visual property sets each neutral property: the first of its lexicon list the style or any bypass
 * mentions, with the dependencies applied.
 * @param target - nodes or edges
 * @param style - the target's style
 * @param used - the visual properties used anywhere
 * @returns property to its visual property and parser
 */
export function chooseVps(
    target: StyleTarget,
    style: CytoscapeTargetStyle,
    used: ReadonlySet<string>,
): Map<string, VpChoice> {
    const chosen = new Map<string, VpChoice>();
    for (const [prop, list] of CYTOSCAPE_LEXICON[target]) {
        const hit = list.find(([vp]) => used.has(vp));
        if (hit !== undefined) {
            chosen.set(prop, hit);
        }
    }
    if (target === "node" && style.dependencies.get("nodeSizeLocked") === true) {
        chosen.delete("width");
        chosen.delete("height");
    }
    if (target === "edge" && style.dependencies.get("arrowColorMatchesEdge") === true) {
        if (used.has("EDGE_UNSELECTED_PAINT")) {
            chosen.set("color", ["EDGE_UNSELECTED_PAINT", colorParser]);
        }
        chosen.delete("sourceArrowColor");
        chosen.delete("targetArrowColor");
    }
    return chosen;
}

/**
 * A mapping with its values read for one property.
 * @category Styles
 */
export type ParsedMapping =
    | { readonly kind: "passthrough"; readonly column: string }
    | { readonly kind: "discrete"; readonly column: string; readonly table: readonly (readonly [Scalar, StyleValue])[] }
    | { readonly kind: "continuous"; readonly column: string; readonly points: readonly ContinuousPoint[] };

/**
 * Reads a mapping's raw values with a property's parser: table entries and points whose values do not parse are
 * dropped (and noted), points are sorted, and of two points at the same value the later one wins.
 * @param m - the mapping
 * @param parse - the property's parser
 * @param site - where problems are noted
 * @returns the mapping with canonical values
 */
export function parseMapping(m: CytoscapeMapping, parse: CytoscapeValueParser, site: CanonSite): ParsedMapping {
    switch (m.kind) {
        case "passthrough":
            return { kind: "passthrough", column: m.column };
        case "discrete": {
            const table: [Scalar, StyleValue][] = [];
            for (const [k, raw] of m.table) {
                const v = parse(raw, site);
                if (v !== null) {
                    table.push([k, v]);
                }
            }
            return { kind: "discrete", column: m.column, table };
        }
        default:
            return { kind: "continuous", column: m.column, points: parsePoints(m.points, parse, site) };
    }
}

/**
 * A continuous mapping's points with canonical values: points whose values do not parse are dropped (and noted),
 * points are sorted, and of two points at the same value the later one wins.
 * @param raw - the points
 * @param parse - the property's parser
 * @param site - where problems are noted
 * @returns the points
 */
function parsePoints(
    raw: readonly CytoscapeContinuousPoint[],
    parse: CytoscapeValueParser,
    site: CanonSite,
): ContinuousPoint[] {
    const parsed: ContinuousPoint[] = [];
    for (const p of raw) {
        const below = parse(p.below, site);
        const value = parse(p.value, site);
        const above = parse(p.above, site);
        if (below !== null && value !== null && above !== null) {
            parsed.push({ at: p.at, below, value, above });
        }
    }
    parsed.sort((a, b) => a.at - b.at);
    const points: ContinuousPoint[] = [];
    for (const p of parsed) {
        if (points.at(-1)?.at === p.at) {
            points[points.length - 1] = p;
        } else {
            points.push(p);
        }
    }
    return points;
}

/**
 * One mapping evaluated for one element's attribute value.
 * @param m - the parsed mapping
 * @param value - the element's value
 * @param parse - the property's parser, for a passthrough
 * @param site - where problems are noted
 * @returns the value, or null when the mapping gives none
 */
function evalMapping(
    m: ParsedMapping,
    value: unknown,
    parse: CytoscapeValueParser,
    site: CanonSite,
): StyleValue | null {
    if (value === null || value === undefined) {
        return null;
    }
    switch (m.kind) {
        case "passthrough":
            return Array.isArray(value) ? null : parse(value, site);
        case "discrete": {
            const j = discreteLookup(m.table)(value);
            return j < 0 ? null : m.table[j][1];
        }
        default:
            return evalContinuous(m.points, numberOf(value));
    }
}

/** The resolver of one target: reads one visual property for one element. */
interface Resolver {
    readonly bypass: (i: number, vp: string) => unknown;
    readonly one: (vp: string, parse: CytoscapeValueParser, property: string, i: number) => StyleValue | null;
}

/**
 * Builds the per-element reader of one target's style.
 * @param target - nodes or edges
 * @param style - the target's style
 * @param elements - the elements
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @returns the reader
 */
function resolver(
    target: StyleTarget,
    style: CytoscapeTargetStyle,
    elements: CytoscapeElements,
    notes: StyleNotes,
    budget: StyleWorkBudget | undefined,
): Resolver {
    const bypasses = elements.bypasses ?? [];
    const parsed = new Map<string, ParsedMapping>();
    const ruleSite = (property: string): CanonSite => ({ notes, target, property, budget });
    const bypass = (i: number, vp: string): unknown => {
        const b = bypasses[i];
        if (!b) {
            return undefined;
        }
        const v = b.get(vp);
        if (v !== undefined && v !== null) {
            return v;
        }
        for (const [from, to] of style.bypassAliases) {
            if (to === vp && !b.has(to)) {
                return b.get(from);
            }
        }
        return undefined;
    };
    // a mapping parsed once per visual property and neutral property
    const mappingOf = (vp: string, parse: CytoscapeValueParser, property: string): ParsedMapping | undefined => {
        const raw = style.mappings.get(vp);
        if (raw === undefined) {
            return undefined;
        }
        const key = `${vp}\u0000${property}`;
        let m = parsed.get(key);
        if (m === undefined) {
            const entries = raw.kind === "discrete" ? raw.table.length : 0;
            budget?.spend(target, 1 + entries + (raw.kind === "continuous" ? raw.points.length : 0));
            m = parseMapping(raw, parse, ruleSite(property));
            parsed.set(key, m);
        }
        return m;
    };
    const one = (vp: string, parse: CytoscapeValueParser, property: string, i: number): StyleValue | null => {
        const site: CanonSite = { notes, target, property, element: i, budget };
        const b = bypass(i, vp);
        const fromBypass = b === undefined || b === null ? null : parse(b, site);
        if (fromBypass !== null) {
            return fromBypass;
        }
        const m = mappingOf(vp, parse, property);
        const mapped = m === undefined ? null : evalMapping(m, elements.value(m.column, i), parse, site);
        if (mapped !== null) {
            return mapped;
        }
        return style.defaults.has(vp) ? parse(style.defaults.get(vp), ruleSite(property)) : null;
    };
    return { bypass, one };
}

/**
 * Every element's value per neutral property under a Cytoscape style, the way Cytoscape draws it: per visual
 * property a bypass, else the mapping's value, else the default; `nodeSizeLocked` and `arrowColorMatchesEdge`
 * applied (under `nodeSizeLocked` a node's own `NODE_WIDTH` or `NODE_HEIGHT` bypass still sets that dimension). `EDGE_CURVED` only rounds an edge's bends, so an edge without bends is `curved: false` unless desktop fans it out of a bundle of parallel edges (given `elements.ends`). Visual properties
 * no neutral property carries are noted as `W_STYLE_NOT_CARRIED`.
 * @param target - nodes or edges
 * @param style - the style
 * @param elements - the elements, their attribute values and their bypasses
 * @param options - notes, the budget and whose defaults fill what the style leaves unset
 * @returns per property, each element's value (null where nothing gives one)
 * @category Styles
 */
export function resolveCytoscape(
    target: StyleTarget,
    style: CytoscapeStyle,
    elements: CytoscapeElements,
    options: CytoscapeResolveOptions = {},
): Partial<Record<string, StyleColumn>> {
    const notes = options.notes ?? new StyleNotes();
    const s = style[target];
    const n = elements.count;
    const { used, bypassed } = vpUsage(s, elements.bypasses ?? []);
    const chosen = chooseVps(target, s, used);
    const { one, bypass } = resolver(target, s, elements, notes, options.budget);
    const out: Partial<Record<string, StyleColumn>> = {};
    const column = (vp: string, parse: CytoscapeValueParser, property: string): (StyleValue | null)[] => {
        options.budget?.spend(target, n);
        const values = new Array<StyleValue | null>(n);
        for (let i = 0; i < n; i++) {
            values[i] = one(vp, parse, property, i);
        }
        return values;
    };
    for (const [prop, [vp, parse]] of chosen) {
        out[prop] = column(vp, parse, prop);
    }
    if (target === "node" && s.dependencies.get("nodeSizeLocked") === true) {
        // a node's own width or height still wins over the locked size: Cytoscape draws it
        const size = column(NODE_SIZE_VP, sizeParser, "width").map((v) => v ?? NODE_SIZE_FALLBACK);
        const own = (vp: string, property: string): StyleColumn =>
            size.map((v, i) => {
                const b = bypass(i, vp);
                const parsed =
                    b === undefined || b === null ? null : sizeParser(b, { notes, target, property, element: i });
                return parsed ?? v;
            });
        out.width = own("NODE_WIDTH", "width");
        out.height = own("NODE_HEIGHT", "height");
    }
    if (target === "node") {
        squashHexagons(out);
        // the value as written: a chart is text, or an object in CX2; a size a number or its text
        const raw: CytoscapeValueParser = (v) => {
            if (typeof v === "string" || typeof v === "number") {
                return String(v);
            }
            return typeof v === "object" && v !== null ? JSON.stringify(v) : null;
        };
        readCytoscapeCharts(
            out,
            n,
            (slot, i) => {
                const v = one(slot, raw, "pieColors", i);
                return typeof v === "string" && v.startsWith("{") ? (JSON.parse(v) as unknown) : v;
            },
            (column, i) => elements.value(column, i),
            s.dependencies.get("nodeCustomGraphicsSizeSync") !== false,
        );
    }
    if (target === "edge" && s.dependencies.get("arrowColorMatchesEdge") === true && out.color !== undefined) {
        out.sourceArrowColor = out.color.slice();
        out.targetArrowColor = out.color.slice();
        // the dependency sets the line and the arrows from EDGE_UNSELECTED_PAINT; an element's own bypass of one of
        // them still wins for that one (Cytoscape draws a bypassed EDGE_STROKE_UNSELECTED_PAINT line in its color)
        const own: readonly [string, string][] = [
            ["color", "EDGE_STROKE_UNSELECTED_PAINT"],
            ["sourceArrowColor", "EDGE_SOURCE_ARROW_UNSELECTED_PAINT"],
            ["targetArrowColor", "EDGE_TARGET_ARROW_UNSELECTED_PAINT"],
        ];
        for (const [prop, vp] of own) {
            out[prop] = (out[prop] ?? []).map((v, i) => {
                const b = bypass(i, vp);
                const site = { notes, target, property: prop, element: i };
                return (b === undefined || b === null ? null : colorParser(b, site)) ?? v;
            });
        }
    }
    noteUncarried(target, s, used, bypassed, notes);
    if (target === "edge") {
        const bends = column(EDGE_BEND_VP, bendsParser, "bends");
        if (bends.some((v) => v !== null)) {
            out.bends = bends;
        }
        // before the tool's defaults: an edge the style leaves unset is curved as Cytoscape's EDGE_CURVED default is
        straightenBendless(out, one, n, elements.ends);
        arrowProportions(out, column);
    }
    fillToolDefaults(target, out, n, options.defaults ?? null);
    return out;
}

/** How tall a regular hexagon is for its width. */
const HEXAGON_ASPECT = Math.sqrt(3) / 2;

/**
 * Gives every hexagon node the height Cytoscape desktop draws it at. Its HEXAGON is a regular hexagon squashed to
 * the node's box rather than one filling it: the corners reach the box's sides, the flat top and bottom only
 * `sqrt(3) / 2` of the way up and down, so a 40 x 40 node with a border of 1 is a 39 x 33.8 path (its border is
 * inside its size, `borderPosition` inside). The neutral hexagon fills its box, so the node is that much shorter.
 * @param out - the node values per property, changed in place
 */
function squashHexagons(out: Partial<Record<string, StyleColumn>>): void {
    const { shape, height } = out;
    if (shape === undefined || height === undefined || !shape.includes("hexagon")) {
        return;
    }
    const border = out.borderWidth;
    out.height = height.map((h, i) => {
        if (shape[i] !== "hexagon" || typeof h !== "number") {
            return h;
        }
        const b = border?.[i];
        const w = typeof b === "number" ? Math.min(b, h) : 0;
        return (h - w) * HEXAGON_ASPECT + w;
    });
}

/**
 * What Cytoscape draws of each end's arrow beyond its shape and the one neutral `arrowSize`: the source end's own
 * size where it differs from the target's (an unset size is Cytoscape's 6), and the length and width of the short and
 * crossed arrows against their neutral shape's. Each is kept only where some edge needs it.
 * @param out - the values per property, changed in place
 * @param column - reads one visual property of every element
 */
function arrowProportions(
    out: Partial<Record<string, StyleColumn>>,
    column: (vp: string, parse: CytoscapeValueParser, property: string) => (StyleValue | null)[],
): void {
    const size = out.arrowSize;
    const own = column("EDGE_SOURCE_ARROW_SIZE", arrowSizeParser, "sourceArrowSize").map((v) => v ?? 1);
    if (own.some((v, i) => v !== (size?.[i] ?? 1))) {
        out.sourceArrowSize = own;
    }
    for (const [prop, vp, side] of [
        ["sourceArrowLength", "EDGE_SOURCE_ARROW_SHAPE", "length"],
        ["targetArrowLength", "EDGE_TARGET_ARROW_SHAPE", "length"],
        ["sourceArrowWidth", "EDGE_SOURCE_ARROW_SHAPE", "width"],
        ["targetArrowWidth", "EDGE_TARGET_ARROW_SHAPE", "width"],
    ] as const) {
        const values = column(vp, arrowProportion(side), prop).map((v) => (v === 1 ? null : v));
        if (values.some((v) => v !== null)) {
            out[prop] = values;
        }
    }
}

/**
 * Marks straight every curved edge without bends, except where Cytoscape desktop fans it: `EDGE_CURVED` only
 * rounds the bends an edge has, and the bends Cytoscape adds itself. Among the edges joining the same two nodes
 * (either way round, not loops), it draws the last it created straight and bends each earlier one without bends
 * of its own round an anchor beside the line (`DEdgeDetails.getAnchors`, `EDGE_STACKING` `AUTO_BEND`, the default;
 * it walks the pair's edges newest first, measured on Cytoscape 3.10.5's SVG of edges joining two nodes both ways)
 * -- unless the last has bends, when every anchor falls on the line. Its anchors are the larger side of the two
 * nodes times twice `EDGE_STACKING_DENSITY` apart, so the curves' middles half that: each fanned edge's
 * `fanSpacing`, when the node sizes are known.
 * @param out - the values per property, changed in place
 * @param one - reads one visual property of one element
 * @param n - the edge count
 * @param ends - each edge's source and target node index, in creation order, when known
 */
function straightenBendless(
    out: Partial<Record<string, StyleColumn>>,
    one: Resolver["one"],
    n: number,
    ends: CytoscapeElements["ends"],
): void {
    // an edge the style leaves unset takes EDGE_CURVED's default, true
    const curved = out.curved ?? new Array<StyleValue | null>(n).fill(null);
    const bent = (i: number): boolean => one(EDGE_BEND_VP, bendParser, "curved", i) === true;
    const fanned = new Set<number>();
    if (ends !== undefined) {
        // ponytail: EDGE_STACKING is taken as AUTO_BEND (the default); HAYSTACK draws these edges straight
        // desktop walks a node pair's edges newest first (its adjacency lists take each new edge at the head)
        const first = new Map<string, number>();
        for (let i = curved.length - 1; i >= 0; i--) {
            const [s, t] = [ends.source[i], ends.target[i]];
            if (s === t) {
                continue;
            }
            const key = s < t ? `${s},${t}` : `${t},${s}`;
            const f = first.get(key);
            if (f === undefined) {
                first.set(key, i);
            } else if (!bent(f)) {
                fanned.add(i);
            }
        }
    }
    const rounds = (i: number): boolean => fanned.has(i) || bent(i);
    const rounded = curved.map((c, i) => {
        if (c === null) {
            return rounds(i) ? true : null;
        }
        return c === true ? rounds(i) : c;
    });
    if (out.curved !== undefined || rounded.includes(true)) {
        out.curved = rounded;
    }
    if (ends?.nodeSize === undefined || fanned.size === 0) {
        return;
    }
    const { source, target, nodeSize } = ends;
    out.fanSpacing = curved.map((_, i) => {
        const size = Math.max(nodeSize[source[i]] ?? Number.NaN, nodeSize[target[i]] ?? Number.NaN);
        if (out.curved?.[i] !== true || !fanned.has(i) || bent(i) || !Number.isFinite(size)) {
            return null;
        }
        const read = one(EDGE_STACKING_DENSITY_VP, sizeParser, "fanSpacing", i);
        const density = Math.min(1, typeof read === "number" ? read : EDGE_STACKING_DENSITY_DEFAULT);
        return size * density;
    });
}

/** An edge's bend handles. */
export const EDGE_BEND_VP = "EDGE_BEND";

/**
 * Whether an `EDGE_BEND` value holds any handle: Cytoscape writes an edge without bends as an empty string.
 * @param raw - the value
 * @returns true when the edge bends
 */
export const bendParser: CytoscapeValueParser = (raw) => {
    if (typeof raw === "string") {
        const text = raw.trim();
        return text !== "" && text !== '""';
    }
    return Array.isArray(raw) ? raw.length > 0 : raw !== null && raw !== undefined && typeof raw === "object";
};

/**
 * An `EDGE_BEND` value as the neutral `bends`: Cytoscape keeps each handle as `cos,sin,ratio`, the handle at the
 * source center plus `ratio` times the source-to-target vector turned by the angle (y down), handles separated by
 * `|`. Relative to the same line, y up, that is `ratio * cos` along it and `-ratio * sin` across it.
 * @param raw - the value
 * @param site - where it was read
 * @returns the bends, or null for an edge without handles or a value that is not handles
 */
const bendsParser: CytoscapeValueParser = (raw, site) => {
    if (typeof raw !== "string" || !bendParser(raw, site)) {
        return null;
    }
    const points: string[] = [];
    for (const handle of raw.trim().split("|")) {
        const [c, sin, ratio] = handle.split(",").map((t) => Number(t.trim()));
        if (![c, sin, ratio].every((v) => Number.isFinite(v))) {
            noteAt(site, STYLE_ISSUE.BAD_VALUE, raw.slice(0, 64));
            return null;
        }
        const fraction = (v: number): string => String(Math.round(v * 1e4) / 1e4 || 0);
        points.push(`${fraction(ratio * c)},${fraction(-ratio * sin)}`);
    }
    return points.join(" ");
};

/** Default values that mean "nothing drawn": a VP left at one of these is not worth a note. */
const INERT_DEFAULT = /NullCustomGraphics|^255$|^0(?:\.0+)?$|^$|^C,C,c,0\.00,0\.00$|^false$/;

/**
 * Notes every visual property the style uses that no neutral property carries.
 * @param target - nodes or edges
 * @param s - the target's style
 * @param used - the visual properties used anywhere
 * @param bypassed - those used by a bypass
 * @param notes - where to note
 */
function noteUncarried(
    target: StyleTarget,
    s: CytoscapeTargetStyle,
    used: ReadonlySet<string>,
    bypassed: ReadonlySet<string>,
    notes: StyleNotes,
): void {
    for (const vp of used) {
        if (!isUncarriedVp(vp)) {
            continue;
        }
        const d = s.defaults.get(vp);
        const text = typeof d === "string" || typeof d === "number" || typeof d === "boolean" ? String(d) : "";
        if (INERT_DEFAULT.test(text.slice(0, 64)) && !s.mappings.has(vp) && !bypassed.has(vp)) {
            continue;
        }
        notes.add(STYLE_ISSUE.NOT_CARRIED, target, vp, { sample: text });
    }
}

/**
 * Fills what nothing gave with a tool's defaults.
 * @param target - nodes or edges
 * @param out - the values per property
 * @param n - the element count
 * @param tool - the tool, or null for none
 */
function fillToolDefaults(
    target: StyleTarget,
    out: Partial<Record<string, StyleColumn>>,
    n: number,
    tool: StyleTool | null,
): void {
    const d = tool === null ? null : toolDefaults(tool);
    if (d === null) {
        return;
    }
    for (const [prop, entry] of Object.entries(d[target]) as [string, { value: unknown } | undefined][]) {
        if (entry === undefined || !isStyleValue(target, prop, entry.value)) {
            continue;
        }
        const value = entry.value as StyleValue;
        const values = out[prop] === undefined ? new Array<StyleValue | null>(n).fill(null) : out[prop].slice();
        for (let i = 0; i < n; i++) {
            values[i] ??= value;
        }
        out[prop] = values;
    }
}

/**
 * The style's network background color (`NETWORK_BACKGROUND_PAINT`, CX2's `NETWORK_BACKGROUND_COLOR`).
 * @param style - the style
 * @param notes - where a bad value is noted
 * @returns the color, or null
 * @category Styles
 */
export function cytoscapeBackground(style: CytoscapeStyle, notes?: StyleNotes): StyleColor | null {
    const d = style.network.defaults;
    const raw = d.get("NETWORK_BACKGROUND_PAINT") ?? d.get("NETWORK_BACKGROUND_COLOR");
    if (raw === undefined) {
        return null;
    }
    const v = colorParser(raw, { notes: notes ?? new StyleNotes(), target: "graph", property: "background" });
    return typeof v === "string" ? (v as StyleColor) : null;
}

/**
 * Every element's values when each element carries its own resolved visual properties and no style (XGMML files
 * and Cytoscape 2.x sessions). Width and height are read from `NODE_SIZE` when no element states them; keys with no
 * visual property name (`?<key>` from `normalizeVisualProperties()`) are noted as `W_STYLE_NOT_CARRIED`.
 * @param target - nodes or edges
 * @param maps - each element's visual properties
 * @param options - notes, the budget and whose defaults fill what is unset
 * @returns per property, each element's value
 * @category Styles
 */
export function resolveCytoscapeBypasses(
    target: StyleTarget,
    maps: readonly CytoscapeBypass[],
    options: CytoscapeResolveOptions = {},
): Partial<Record<string, StyleColumn>> {
    const notes = options.notes ?? new StyleNotes();
    const style = emptyCytoscapeStyle();
    const elements: CytoscapeElements = {
        count: maps.length,
        value: options.value ?? (() => null),
        bypasses: maps,
        ends: options.ends,
    };
    const out = resolveCytoscape(target, style, elements, { notes, budget: options.budget });
    if (target === "node" && out.width === undefined) {
        const size = maps.map((m) => {
            const raw = m?.get(NODE_SIZE_VP);
            return raw === undefined ? null : sizeParser(raw, { notes, target, property: "width" });
        });
        if (size.some((v) => v !== null)) {
            out.width = size;
            out.height = size.slice();
        }
    }
    for (const m of maps) {
        if (!m) {
            continue;
        }
        for (const [k, v] of m) {
            if (k.startsWith("?")) {
                notes.add(STYLE_ISSUE.NOT_CARRIED, target, k.slice(1), { sample: v });
            }
        }
    }
    fillToolDefaults(target, out, maps.length, options.defaults ?? null);
    return out;
}
