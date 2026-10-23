/**
 * Cytoscape's own resolution of a visual style, per element: a bypass over a mapping over a default, per visual
 * property, with the dependencies applied (`nodeSizeLocked` makes `NODE_SIZE` drive width and height,
 * `arrowColorMatchesEdge` makes the edge's paint drive the line and both arrows). Every pass is linear in the number
 * of elements plus the size of the style, and spends from the extraction's one budget.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { num6 } from "../canon/number.js";
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
    arrowGap,
    arrowProportion,
    arrowSizeParser,
    colorParser,
    CYTOSCAPE_LEXICON,
    cytoscapeLabelBase,
    cytoscapeLabelMove,
    type CytoscapeLabelPlace,
    cytoscapeLabelPlace,
    type CytoscapeValueParser,
    halfBack,
    isUncarriedVp,
    NODE_SIZE_VP,
    opacityParser,
    sizeParser,
    vpStep,
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
     * desktop spaces them by. With `nodeBox` (each node's width, height and border width, by node index), each
     * self-loop without bends is given the two handles desktop draws it round.
     */
    readonly ends?: {
        readonly source: ArrayLike<number>;
        readonly target: ArrayLike<number>;
        readonly nodeSize?: ArrayLike<number | null>;
        readonly nodeBox?: ArrayLike<readonly [width: number, height: number, border: number] | null>;
        /** Each node's center on screen, x right and y down, by node index: what an edge's label is placed by. */
        readonly nodeAt?: ArrayLike<readonly [x: number, y: number] | null>;
        /**
         * The order Cytoscape desktop creates the file's nodes and edges in, when it is not the file's (its CX reader
         * creates them in hash order): each element's rank, lower first, by index. With it, `nodeAt` and `nodeSize`,
         * each fanned edge is given desktop's own anchor as its bend, so it bows to the side desktop draws it on.
         */
        readonly created?: { readonly node: ArrayLike<number>; readonly edge: ArrayLike<number> };
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
/** How desktop draws parallel edges: AUTO_BEND (the default) fans them, HAYSTACK draws them straight. */
const EDGE_STACKING_VP = "EDGE_STACKING";
/** Whether an edge's label is turned along its line. */
const AUTOROTATE_VP = "EDGE_LABEL_AUTOROTATE";

/**
 * A map without one key.
 * @param m - the map
 * @param key - the key left out
 * @returns a copy without it
 */
function withoutKey(m: ReadonlyMap<string, unknown>, key: string): ReadonlyMap<string, unknown> {
    return new Map([...m].filter(([k]) => k !== key));
}
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
    const nodeBox = Array.from({ length: snapshot.nodeCount }, (_, i) => {
        const [w, h, b] = [nodes.width?.[i], nodes.height?.[i], nodes.borderWidth?.[i]];
        return typeof w === "number" && typeof h === "number" ? ([w, h, typeof b === "number" ? b : 0] as const) : null;
    });
    const position = snapshot.nodes.byRole("position");
    // stored y up unless the column says otherwise; the label places are worked out y down, as Cytoscape draws
    const down = (position?.meta.extra as { yAxis?: string } | undefined)?.yAxis === "down";
    const nodeAt = Array.from({ length: snapshot.nodeCount }, (_, i) => {
        const v = position?.isSet(i) === true ? (position.value(i) as ArrayLike<number>) : null;
        return v === null ? null : ([v[0], down ? v[1] : -v[1]] as const);
    });
    const { src, dst } = snapshot.edgeList();
    return { source: src, target: dst, nodeSize, nodeBox, nodeAt };
}

/** Locked node sizes with no `NODE_SIZE` anywhere draw at Cytoscape's lexicon default. */
const NODE_SIZE_FALLBACK = 50;

/**
 * The visual property whose bypass each one takes when an element does not bypass it itself: Cytoscape desktop locks
 * a bypassed parent's children too, so a session's `NODE_PAINT` bypass paints the fill and the border, a `NODE_SIZE`
 * bypass sizes the node whatever `nodeSizeLocked` says, and an `EDGE_PAINT` or `EDGE_UNSELECTED_PAINT` bypass paints
 * the line and its arrows (Cytoscape 3.10.5's SVG of the session specimen sheets `node-fills-borders`,
 * `node-sizes-opacity` and `edges-lines`).
 */
const LOCK_PARENT: ReadonlyMap<string, string> = new Map([
    ["NODE_FILL_COLOR", "NODE_PAINT"],
    ["NODE_BORDER_PAINT", "NODE_PAINT"],
    ["NODE_WIDTH", "NODE_SIZE"],
    ["NODE_HEIGHT", "NODE_SIZE"],
    ["EDGE_UNSELECTED_PAINT", "EDGE_PAINT"],
    ["EDGE_STROKE_UNSELECTED_PAINT", "EDGE_UNSELECTED_PAINT"],
    ["EDGE_SOURCE_ARROW_UNSELECTED_PAINT", "EDGE_UNSELECTED_PAINT"],
    ["EDGE_TARGET_ARROW_UNSELECTED_PAINT", "EDGE_UNSELECTED_PAINT"],
]);

/**
 * An element's bypass of a visual property: its own, else the nearest bypassed parent's (`LOCK_PARENT`).
 * @param b - the element's bypasses
 * @param vp - the visual property
 * @returns the bypass value, or undefined
 */
function lockedValue(b: NonNullable<CytoscapeBypass>, vp: string): unknown {
    for (let p: string | undefined = vp; p !== undefined; p = LOCK_PARENT.get(p)) {
        const v = b.get(p);
        if (v !== undefined && v !== null) {
            return v;
        }
    }
    return undefined;
}

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
    // a bypassed parent bypasses its children (LOCK_PARENT lists a parent's own entry before its children's)
    for (const [child, parent] of LOCK_PARENT) {
        if (bypassed.has(parent)) {
            bypassed.add(child);
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
        // the line is EDGE_UNSELECTED_PAINT's, not the stroke's, even where the style sets only the stroke
        if (used.has("EDGE_UNSELECTED_PAINT") || used.has("EDGE_STROKE_UNSELECTED_PAINT")) {
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
    | {
          readonly kind: "continuous";
          readonly column: string;
          readonly points: readonly ContinuousPoint[];
          /** The step Cytoscape rounds a value to, for an integer visual property. */
          readonly step?: number;
      };

/**
 * Reads a mapping's raw values with a property's parser: table entries and points whose values do not parse are
 * dropped (and noted), points are sorted, and of two points at the same value the later one wins.
 * @param m - the mapping
 * @param parse - the property's parser
 * @param site - where problems are noted
 * @param vp - the visual property it sets, whose type decides whether an interpolated value is rounded
 * @returns the mapping with canonical values
 */
export function parseMapping(
    m: CytoscapeMapping,
    parse: CytoscapeValueParser,
    site: CanonSite,
    vp: string,
): ParsedMapping {
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
        default: {
            const step = vpStep(vp);
            const points = parsePoints(m.points, parse, site);
            return { kind: "continuous", column: m.column, points, ...(step === undefined ? {} : { step }) };
        }
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
            return evalContinuous(m.points, numberOf(value), m.step);
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
        return lockedValue(b, vp);
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
            m = parseMapping(raw, parse, ruleSite(property), vp);
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
    labelDress(target, out, one, n, elements.ends);
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
    if (
        target === "edge" &&
        s.dependencies.get("arrowColorMatchesEdge") === true &&
        !used.has("EDGE_UNSELECTED_PAINT") &&
        used.has("EDGE_STROKE_UNSELECTED_PAINT")
    ) {
        // the dependency draws the line and the arrows in EDGE_UNSELECTED_PAINT, Cytoscape's own when the style has
        // none: the stroke's default and its mapping are not drawn, only an element's own bypass of the stroke (below;
        // Cytoscape 3.10.5 on specimen-mappings-bypass draws a passthrough of the stroke #404040, as its XGMML says)
        const paint = (toolDefaults("cytoscape-fallbacks")?.edge.color?.value ?? null) as StyleValue | null;
        out.color = Array.from({ length: n }, (_, i) => one("EDGE_UNSELECTED_PAINT", colorParser, "color", i) ?? paint);
    }
    if (target === "edge" && s.dependencies.get("arrowColorMatchesEdge") === true && out.color !== undefined) {
        // CX2's EDGE_LINE_COLOR bypass is the stroke's alone (its writer spells a desktop EDGE_UNSELECTED_PAINT
        // bypass out as the line and both arrow colors): the arrows keep the style's line color (Cytoscape 3.10.5's
        // SVG of the CX2 specimen-mappings-bypass, bypass-over-edge-passthrough, draws its arrow #505050)
        const lineVp = chosen.get("color")?.[0];
        const unbypassed = resolver(target, s, { ...elements, bypasses: [] }, notes, options.budget).one;
        const arrows =
            lineVp === "EDGE_LINE_COLOR"
                ? Array.from({ length: n }, (_, i) => unbypassed(lineVp, colorParser, "color", i))
                : out.color;
        out.sourceArrowColor = arrows.slice();
        out.targetArrowColor = arrows.slice();
        // the dependency sets the line and the arrows from EDGE_UNSELECTED_PAINT; an element's own bypass of one of
        // them still wins for that one (Cytoscape draws a bypassed EDGE_STROKE_UNSELECTED_PAINT line in its color)
        const own: readonly [string, string][] = [
            ["color", "EDGE_STROKE_UNSELECTED_PAINT"],
            ["sourceArrowColor", "EDGE_SOURCE_ARROW_UNSELECTED_PAINT"],
            ["targetArrowColor", "EDGE_TARGET_ARROW_UNSELECTED_PAINT"],
            ["sourceArrowColor", "EDGE_SOURCE_ARROW_COLOR"],
            ["targetArrowColor", "EDGE_TARGET_ARROW_COLOR"],
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
        const curvedAsSet = out.curved?.slice();
        straightenBendless(out, one, n, elements.ends);
        loopHandles(out, one, curvedAsSet, elements.ends);
        arrowProportions(out, column);
    }
    fillToolDefaults(target, out, n, options.defaults ?? null);
    return out;
}

/**
 * A visual property's value as written, a CX2 object as its JSON.
 * @param v - the value
 * @returns its text, or null
 */
const rawText: CytoscapeValueParser = (v) => {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        return String(v);
    }
    return typeof v === "object" && v !== null ? JSON.stringify(v) : null;
};

/**
 * Reads what Cytoscape draws of each element's label beyond its words, font and color: the box behind it (drawn only
 * with a `*_LABEL_BACKGROUND_SHAPE` other than NONE, the default, in its color and transparency), where it is placed
 * (`*_LABEL_POSITION` read whole: which point of the label's box is pinned to which point of the node, or of the
 * edge's line, and the offset) and how its lines are justified. Each column is kept only where some element needs it;
 * an edge's place is kept whenever it has one, since Cytoscape centers an edge's label on its line.
 * @param target - nodes or edges
 * @param out - the values per property, changed in place
 * @param one - reads one visual property of one element
 * @param n - the element count
 * @param ends - the edges' ends and their nodes' centers, when known
 */
function labelDress(
    target: StyleTarget,
    out: Partial<Record<string, StyleColumn>>,
    one: Resolver["one"],
    n: number,
    ends: CytoscapeElements["ends"],
): void {
    const vp = (name: string): string => `${target === "node" ? "NODE" : "EDGE"}_LABEL_${name}`;
    const columns: Record<string, (StyleValue | null)[]> = {};
    const put = (property: string, i: number, v: StyleValue | null): void => {
        let column = columns[property];
        if (column === undefined) {
            column = new Array<StyleValue | null>(n).fill(null);
            columns[property] = column;
        }
        column[i] = v;
    };
    for (let i = 0; i < n; i++) {
        labelBox(vp, one, i, put);
        // read whole, quietly (the lexicon's reading of the same value notes a bad one), under a name of its own: a
        // mapping is parsed once per visual property and neutral property
        const placed = one(vp("POSITION"), rawText, "labelPlace", i);
        const raw = typeof placed === "string" && placed.startsWith("{") ? (JSON.parse(placed) as unknown) : placed;
        const place = cytoscapeLabelPlace(raw, { notes: new StyleNotes(), target, property: "labelPosition" });
        if (place !== null) {
            placeLabel(target, place, i, out, put, ends);
        }
        if (target === "edge") {
            autorotate(one, i, out, n, ends);
        }
    }
    const kept = (property: string, v: StyleValue | null): boolean =>
        v !== null && v !== 0 && (v !== "center" || (property === "labelPosition" && target === "edge"));
    for (const [property, values] of Object.entries(columns)) {
        if (values.some((v) => kept(property, v))) {
            out[property] = values;
        }
    }
}

/**
 * The box Cytoscape draws behind one label, when its shape is not NONE: its color (`#B6B6B6` unset, the lexicon's
 * default), its opacity, and for ROUND_RECTANGLE its corners, rounded an eighth of the box's height: 1.455 on the
 * 11.64-tall box of a 10 px label (xgmml-specimen-labels.svg, label-background-shape-round-rectangle), so 0.1455 of the
 * label's size. ponytail: one line's height; a box of several lines is rounded as one line's.
 * @param vp - names a label visual property of the target
 * @param one - reads one visual property of one element
 * @param i - the element
 * @param put - sets one element's value of a property
 */
function labelBox(
    vp: (name: string) => string,
    one: Resolver["one"],
    i: number,
    put: (property: string, i: number, v: StyleValue | null) => void,
): void {
    const shape = one(vp("BACKGROUND_SHAPE"), rawText, "labelBackgroundShape", i);
    if (typeof shape !== "string" || shape.trim().toUpperCase() === "NONE") {
        return;
    }
    put("labelBackground", i, one(vp("BACKGROUND_COLOR"), colorParser, "labelBackground", i) ?? "#b6b6b6");
    const [t, o] = [vp("BACKGROUND_TRANSPARENCY"), vp("BACKGROUND_OPACITY")];
    const opacity =
        one(t, opacityParser(t), "labelBackgroundOpacity", i) ?? one(o, opacityParser(o), "labelBackgroundOpacity", i);
    put("labelBackgroundOpacity", i, opacity ?? 1);
    // CX2 spells it round-rectangle
    if (shape.trim().toUpperCase().replace("-", "_") === "ROUND_RECTANGLE") {
        const size = one(vp("FONT_SIZE"), sizeParser, "labelSize", i);
        // desktop's default label sizes: 12 on a node, 10 on an edge
        const defaultSize = vp("FONT_SIZE").startsWith("EDGE") ? 10 : 12;
        put("labelCornerRadius", i, num6(LABEL_CORNER_PER_SIZE * (typeof size === "number" ? size : defaultSize)));
    }
}

/** How far Cytoscape rounds a ROUND_RECTANGLE label box's corners, as a fraction of the label's font size. */
const LABEL_CORNER_PER_SIZE = 0.1455;

/**
 * Where one label is placed, from its Cytoscape label position: its neutral `labelPosition`, offsets, shifts and
 * line justification. A node's label is pinned against the node's box. An edge's is pinned to a point of its drawn
 * line, the middle unless the anchor's horizontal letter names an end (W the source's, E the target's; its vertical
 * letter changes nothing, measured on Cytoscape 3.10.5's SVG), from the line's middle, where it is centered.
 * @param target - nodes or edges
 * @param place - the label position
 * @param i - the element
 * @param out - the values per property (the node sizes are read)
 * @param put - sets one element's value of a property
 * @param ends - the edges' ends and their nodes' centers, when known
 */
function placeLabel(
    target: StyleTarget,
    place: CytoscapeLabelPlace,
    i: number,
    out: Partial<Record<string, StyleColumn>>,
    put: (property: string, i: number, v: StyleValue | null) => void,
    ends: CytoscapeElements["ends"],
): void {
    let move: ReturnType<typeof cytoscapeLabelMove>;
    if (target === "node") {
        const [w, h] = [out.width?.[i], out.height?.[i]];
        move = cytoscapeLabelMove(place, typeof w === "number" ? w : 0, typeof h === "number" ? h : 0);
        put("labelPosition", i, cytoscapeLabelBase(place));
    } else {
        const [ax, ay] = lineEnd(ends, i, place.node[0]);
        move = {
            offset: [ax + place.offset[0], ay + place.offset[1]],
            shift: [halfBack(place.label[0]), halfBack(place.label[1])],
        };
        put("labelPosition", i, "center");
    }
    put("labelOffsetX", i, num6(move.offset[0]));
    put("labelOffsetY", i, num6(move.offset[1]));
    put("labelShiftX", i, move.shift[0]);
    put("labelShiftY", i, move.shift[1]);
    put("labelTextAlign", i, place.justify);
}

/**
 * Turns an edge's label along its line under `EDGE_LABEL_AUTOROTATE`, as Cytoscape draws it: the line's angle from
 * its source's center to its target's (kept between -90 and 90 so the words read left to right), plus its
 * `EDGE_LABEL_ROTATION`.
 * ponytail: the angle is the file's node places at import; a layout that moves the nodes leaves it as it was, until
 * the neutral styles can say "along the line"
 * @param one - reads one visual property of one element
 * @param e - the edge
 * @param out - the values per property, changed in place
 * @param n - the edge count
 * @param ends - the edges' ends and their nodes' centers
 */
function autorotate(
    one: Resolver["one"],
    e: number,
    out: Partial<Record<string, StyleColumn>>,
    n: number,
    ends: CytoscapeElements["ends"],
): void {
    const on = one(AUTOROTATE_VP, rawText, "labelRotation", e);
    const [si, ti] = [ends?.source[e], ends?.target[e]];
    const [s, t] = [si === undefined ? null : ends?.nodeAt?.[si], ti === undefined ? null : ends?.nodeAt?.[ti]];
    if (String(on).toLowerCase() !== "true" || !s || !t || (s[0] === t[0] && s[1] === t[1])) {
        return;
    }
    const a = (Math.atan2(t[1] - s[1], t[0] - s[0]) * 180) / Math.PI;
    let upright = a;
    if (a > 90) {
        upright = a - 180;
    } else if (a <= -90) {
        upright = a + 180;
    }
    out.labelRotation ??= new Array<StyleValue | null>(n).fill(null);
    const column = out.labelRotation as (StyleValue | null)[];
    const own = column[e];
    column[e] = num6((((upright + (typeof own === "number" ? own : 0)) % 360) + 360) % 360);
}

/**
 * How far from the middle of an edge's drawn line one of its ends is, on screen (y down): the line between its two
 * nodes' centers, cut where it meets each node's ellipse; 0 for the middle, or where the centers are not known.
 * @param ends - the edges' ends, their nodes' centers and boxes
 * @param e - the edge
 * @param side - -1 for the source's end, 1 for the target's, 0 for the middle
 * @returns the offset from the line's middle
 */
function lineEnd(ends: CytoscapeElements["ends"], e: number, side: number): readonly [number, number] {
    const [si, ti] = [ends?.source[e], ends?.target[e]];
    const [s, t] = [si === undefined ? null : ends?.nodeAt?.[si], ti === undefined ? null : ends?.nodeAt?.[ti]];
    if (side === 0 || s === null || s === undefined || t === null || t === undefined) {
        return [0, 0];
    }
    const length = Math.hypot(t[0] - s[0], t[1] - s[1]);
    if (length === 0) {
        return [0, 0];
    }
    const [ux, uy] = [(t[0] - s[0]) / length, (t[1] - s[1]) / length];
    // where the line leaves a node's ellipse, along it from the center
    const reach = (node: number | undefined): number => {
        const box = node === undefined ? null : ends?.nodeBox?.[node];
        if (box === null || box === undefined) {
            return 0;
        }
        const [a, b] = [box[0] / 2, box[1] / 2];
        return a === 0 || b === 0 ? 0 : (a * b) / Math.hypot(b * ux, a * uy);
    };
    const from = reach(si);
    const to = length - reach(ti);
    // the drawn line's middle and the end asked for, both measured along the line from the source's center
    const along = (side < 0 ? from : to) - (from + to) / 2;
    return [ux * along, uy * along];
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
 * crossed arrows against their neutral shape's, and how far off its node each arrow stands. Each is kept only where
 * some edge needs it.
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
    // the arrows desktop draws standing off their node (T, the half circles, HALF_TOP, the squares)
    for (const [prop, vp] of [
        ["sourceArrowGap", "EDGE_SOURCE_ARROW_SHAPE"],
        ["targetArrowGap", "EDGE_TARGET_ARROW_SHAPE"],
    ] as const) {
        const values = column(vp, arrowGap, prop).map((v) => (v === 0 ? null : v));
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
 * `fanSpacing`, when the node sizes are known. A fanned edge is drawn curved even under `EDGE_CURVED` false, and an
 * edge whose `EDGE_STACKING` is HAYSTACK is neither fanned nor counted: desktop draws it straight (both measured on
 * Cytoscape 3.10.5's SVG of the edges-lines specimen sheet).
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
    const haystack = (i: number): boolean =>
        String(one(EDGE_STACKING_VP, rawText, "fanned", i) ?? "").toUpperCase() === "HAYSTACK";
    // each fanned edge's place in its pair's walk (1 for the first fanned)
    const place = ends === undefined ? new Map<number, number>() : fanPlaces(ends, curved.length, bent, haystack);
    const fanned = new Set(place.keys());
    const rounds = (i: number): boolean => fanned.has(i) || bent(i);
    const rounded = curved.map((c, i) => {
        if (c === null) {
            return rounds(i) ? true : null;
        }
        return c === true || fanned.has(i) ? rounds(i) : c;
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
    fanAnchors(out, ends, place);
}

/**
 * The edges desktop fans, each with its place in its node pair's walk (1 for the first fanned). Desktop walks a node
 * pair's edges newest first (its adjacency lists take each new edge at the head); the first it meets is drawn
 * straight, and each later one fanned unless that first one has bends. Loops and haystack edges are left out.
 * @param ends - each edge's source and target node index, and the order they were created in
 * @param count - the edge count
 * @param bent - whether an edge has bends of its own
 * @param haystack - whether an edge is a haystack edge
 * @returns each fanned edge's place, in walk order
 */
function fanPlaces(
    ends: NonNullable<CytoscapeElements["ends"]>,
    count: number,
    bent: (i: number) => boolean,
    haystack: (i: number) => boolean,
): Map<number, number> {
    const place = new Map<number, number>();
    const first = new Map<string, { f: number; k: number }>();
    for (const i of newestFirst(count, ends.created?.edge)) {
        const [s, t] = [ends.source[i], ends.target[i]];
        if (s === t || haystack(i)) {
            continue;
        }
        const key = `${Math.min(s, t)},${Math.max(s, t)}`;
        const f = first.get(key);
        if (f === undefined) {
            first.set(key, { f: i, k: 0 });
        } else if (!bent(f.f)) {
            f.k++;
            place.set(i, f.k);
        }
    }
    return place;
}

/**
 * The edges newest first: by the order they were created in when it is known, else last index first.
 * @param count - the edge count
 * @param created - each edge's place in the creation order, when known
 * @returns the edge indices in that order
 */
function newestFirst(count: number, created: ArrayLike<number> | undefined): number[] {
    const walk = Array.from({ length: count }, (_, i) => i);
    walk.sort(created === undefined ? (a, b) => b - a : (a, b) => created[b] - created[a]);
    return walk;
}

/**
 * Gives each fanned edge its place in desktop's fan as a bend, when the order desktop created the nodes in is known:
 * the fan's side is then desktop's, not graphty's. Desktop measures each pair's fan from the node whose view it made
 * first, and it makes views newest node first (`DEdgeDetails.getAnchors`: the pair's lower view SUID is its source;
 * `SimpleNetwork.getNodeList` lists the newest node first); the `k`-th fanned edge bows `ceil(k / 2)` fan spacings
 * off the middle of the line, to the right of the fan's direction (y down) for odd `k`, to the left for even. The
 * bend is the control point of a quadratic Bezier whose middle lies there, twice as far off.
 * @param out - the values per property, with `fanSpacing` set; changed in place
 * @param ends - the edges' ends, their nodes' centers and creation order
 * @param place - each fanned edge's place in its pair's walk, from 1
 */
function fanAnchors(
    out: Partial<Record<string, StyleColumn>>,
    ends: NonNullable<CytoscapeElements["ends"]>,
    place: ReadonlyMap<number, number>,
): void {
    const { created, nodeAt, source, target } = ends;
    const spacing = out.fanSpacing?.slice();
    if (created === undefined || nodeAt === undefined || spacing === undefined) {
        return;
    }
    const bends = out.bends?.slice() ?? new Array<StyleValue | null>(source.length).fill(null);
    const bendCurve = out.bendCurve?.slice() ?? new Array<StyleValue | null>(source.length).fill(null);
    let changed = false;
    for (const [i, k] of place) {
        const [s, t] = [source[i], target[i]];
        const [ps, pt, f] = [nodeAt[s], nodeAt[t], spacing[i]];
        if (ps === null || ps === undefined || pt === null || pt === undefined || typeof f !== "number") {
            continue;
        }
        const len = Math.hypot(pt[0] - ps[0], pt[1] - ps[1]);
        if (len === 0) {
            continue;
        }
        // the fan's direction: from the node desktop made a view of first, the one created last
        const sign = created.node[s] > created.node[t] ? 1 : -1;
        const [nx, ny] = [(sign * (pt[0] - ps[0])) / len, (sign * (pt[1] - ps[1])) / len];
        const offset = Math.ceil(k / 2) * (k % 2 === 0 ? 1 : -1) * 2 * f;
        const [vx, vy] = [offset * ny, -offset * nx];
        // to the left of source -> target, y up, as a fraction of the length
        const across = (vx * (pt[1] - ps[1]) - vy * (pt[0] - ps[0])) / (len * len);
        bends[i] = `0.5,${String(Math.round(across * 1e6) / 1e6 || 0)}`;
        bendCurve[i] = "bezier";
        spacing[i] = null;
        changed = true;
    }
    if (changed) {
        out.bends = bends;
        out.bendCurve = bendCurve;
        out.fanSpacing = spacing;
    }
}

/**
 * Gives each self-loop without bends of its own the two handles Cytoscape desktop draws it round
 * (`DEdgeDetails.getAnchors`): one left of the node's center and one above it, each `(i + 3) / 2` of the node's
 * size times twice `EDGE_STACKING_DENSITY` away, where the size is the larger side of the node with its border
 * (its extents in desktop's spatial index) and `i` counts the node's earlier loops without bends, newest first as
 * desktop walks them. A loop is curved through them unless `EDGE_CURVED` says false. Measured on Cytoscape
 * 3.10.5's SVG of the edges-lines specimen sheet (within 0.3 px of its loops).
 * @param out - the values per property, changed in place
 * @param one - reads one visual property of one element
 * @param curvedAsSet - each edge's `curved` as the style set it, before bendless edges were straightened
 * @param ends - each edge's source and target node index, in creation order, and each node's box, when known
 */
function loopHandles(
    out: Partial<Record<string, StyleColumn>>,
    one: Resolver["one"],
    curvedAsSet: readonly (StyleValue | null)[] | undefined,
    ends: CytoscapeElements["ends"],
): void {
    const box = ends?.nodeBox;
    if (ends === undefined || box === undefined) {
        return;
    }
    const bends = out.bends?.slice() ?? new Array<StyleValue | null>(ends.source.length).fill(null);
    const curved = out.curved?.slice() ?? new Array<StyleValue | null>(ends.source.length).fill(null);
    const earlier = new Map<number, number>();
    const fraction = (v: number): string => String(Math.round(v * 1e4) / 1e4 || 0);
    let changed = false;
    for (let i = ends.source.length - 1; i >= 0; i--) {
        const node = ends.source[i];
        const b = box[node];
        if (node !== ends.target[i] || bends[i] !== null) {
            continue;
        }
        const rank = earlier.get(node) ?? 0;
        earlier.set(node, rank + 1);
        if (b === null || b === undefined || b[0] <= 0 || b[1] <= 0) {
            continue;
        }
        const read = one(EDGE_STACKING_DENSITY_VP, sizeParser, "fanSpacing", i);
        const density = Math.min(1, typeof read === "number" ? read : EDGE_STACKING_DENSITY_DEFAULT);
        const reach = (((rank + 3) * (Math.max(b[0], b[1]) + b[2])) / 2) * 2 * density;
        // as `x,y` fractions of the node's half width and half height, y up: left of the center, then above it
        bends[i] = `${fraction(-reach / (b[0] / 2))},0 0,${fraction(reach / (b[1] / 2))}`;
        curved[i] = curvedAsSet?.[i] !== false;
        changed = true;
    }
    if (changed) {
        out.bends = bends;
        out.curved = curved;
    }
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
 * @param input - the value: an `EDGE_BEND` text, or CX2's `EDGE_CONTROL_POINTS` objects
 * @param site - where it was read
 * @returns the bends, or null for an edge without handles or a value that is not handles
 */
const bendsParser: CytoscapeValueParser = (input, site) => {
    // CX2's EDGE_CONTROL_POINTS: one object per handle, whose `sin` Cytoscape fills with EDGE_BEND's first number and
    // `cos` with its second (it reads them back the same way: specimen-edges-lines bend-one-handle bends)
    const raw = Array.isArray(input)
        ? input
              .map((h: unknown) => {
                  const o = (h ?? {}) as Record<string, unknown>;
                  return `${Number(o.sin)},${Number(o.cos)},${Number(o.ratio)}`;
              })
              .join("|")
        : input;
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
        // Cytoscape 3.10.5 draws an XGMML edge's EDGE_LABEL_AUTOROTATE true level, where it turns the same edge read
        // from CX, CX2 or a session along its line (the label-autorotate-true edge of the edge-labels and
        // mappings-bypass-p13 sheets in its SVG): its XGMML reader does not apply it, so neither does graph-io
        bypasses: maps.map((m) => (m?.has(AUTOROTATE_VP) === true ? withoutKey(m, AUTOROTATE_VP) : m)),
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
