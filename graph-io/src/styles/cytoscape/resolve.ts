/**
 * Cytoscape's own resolution of a visual style, per element: a bypass over a mapping over a default, per visual
 * property, with the dependencies applied (`nodeSizeLocked` makes `NODE_SIZE` drive width and height,
 * `arrowColorMatchesEdge` makes the edge's paint drive the line and both arrows). Every pass is linear in the number
 * of elements plus the size of the style, and spends from the extraction's one budget.
 */

import type { CanonSite } from "../canon/site.js";
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
import {
    colorParser,
    CYTOSCAPE_LEXICON,
    type CytoscapeValueParser,
    isUncarriedVp,
    NODE_SIZE_VP,
    sizeParser,
} from "./lexicon.js";
import {
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
        default: {
            const parsed: ContinuousPoint[] = [];
            for (const p of m.points) {
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
                if (points.length > 0 && points[points.length - 1].at === p.at) {
                    points[points.length - 1] = p;
                } else {
                    points.push(p);
                }
            }
            return { kind: "continuous", column: m.column, points };
        }
    }
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
    const one = (vp: string, parse: CytoscapeValueParser, property: string, i: number): StyleValue | null => {
        const site: CanonSite = { notes, target, property, element: i, budget };
        const b = bypass(i, vp);
        if (b !== undefined && b !== null) {
            const v = parse(b, site);
            if (v !== null) {
                return v;
            }
        }
        const raw = style.mappings.get(vp);
        if (raw !== undefined) {
            const key = `${vp}\u0000${property}`;
            let m = parsed.get(key);
            if (m === undefined) {
                budget?.spend(
                    target,
                    1 +
                        (raw.kind === "discrete" ? raw.table.length : 0) +
                        (raw.kind === "continuous" ? raw.points.length : 0),
                );
                m = parseMapping(raw, parse, ruleSite(property));
                parsed.set(key, m);
            }
            const v = evalMapping(m, elements.value(m.column, i), parse, site);
            if (v !== null) {
                return v;
            }
        }
        return style.defaults.has(vp) ? parse(style.defaults.get(vp), ruleSite(property)) : null;
    };
    return { bypass, one };
}

/**
 * Every element's value per neutral property under a Cytoscape style, the way Cytoscape draws it: per visual
 * property a bypass, else the mapping's value, else the default; `nodeSizeLocked` and `arrowColorMatchesEdge`
 * applied. Visual properties no neutral property carries are noted as `W_STYLE_NOT_CARRIED`.
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
    const { one } = resolver(target, s, elements, notes, options.budget);
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
        const size = column(NODE_SIZE_VP, sizeParser, "width").map((v) => v ?? NODE_SIZE_FALLBACK);
        out.width = size;
        out.height = size.slice();
    }
    if (target === "edge" && s.dependencies.get("arrowColorMatchesEdge") === true && out.color !== undefined) {
        out.sourceArrowColor = out.color.slice();
        out.targetArrowColor = out.color.slice();
    }
    noteUncarried(target, s, used, bypassed, notes);
    fillToolDefaults(target, out, n, options.defaults ?? null);
    return out;
}

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
    const elements: CytoscapeElements = { count: maps.length, value: () => null, bypasses: maps };
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
