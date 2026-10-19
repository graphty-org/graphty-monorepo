/**
 * Cytoscape desktop's visual style model: per target the defaults, the one mapping per visual property and the
 * dependencies, read from CX version 1 (`cyVisualProperties`, mapping definitions as `COL=...,K=0=a` strings) and CX2
 * (`visualProperties`, `visualEditorProperties`). Every table keyed by file text is a `Map`.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { STYLE_ISSUE } from "../codes.js";
import type { StyleNotes } from "../notes.js";
import type { StyleTarget } from "../types.js";

/**
 * One Cytoscape mapping, with the file's raw values (they are read per property when resolved or translated). A
 * discrete table's keys are typed by the attribute's type (numbers for `integer`, `long` and `double`, booleans for
 * `boolean`), so a key compares with a value the way Cytoscape compares them.
 * @category Styles
 */
export type CytoscapeMapping =
    | {
          /** The column's value is the visual property's value. */
          readonly kind: "passthrough";
          /** The column read. */
          readonly column: string;
          /** The attribute type the file states, or null. */
          readonly type: string | null;
      }
    | {
          /** A table from the column's value to a raw visual property value. */
          readonly kind: "discrete";
          /** The column read. */
          readonly column: string;
          /** The attribute type the file states, or null. */
          readonly type: string | null;
          /** `[key, raw value]` in the file's order. */
          readonly table: readonly (readonly [key: string | number | boolean, value: unknown])[];
      }
    | {
          /** Points between which Cytoscape interpolates. */
          readonly kind: "continuous";
          /** The column read. */
          readonly column: string;
          /** The attribute type the file states, or null. */
          readonly type: string | null;
          /** The points, in the file's order, with raw values. */
          readonly points: readonly CytoscapeContinuousPoint[];
      };

/**
 * One point of a Cytoscape continuous mapping, with raw values: `below` just below `at`, `value` exactly at it,
 * `above` just above it.
 * @category Styles
 */
export interface CytoscapeContinuousPoint {
    /** The attribute value. */
    readonly at: number;
    /** The raw value just below `at`. */
    readonly below: unknown;
    /** The raw value exactly at `at`. */
    readonly value: unknown;
    /** The raw value just above `at`. */
    readonly above: unknown;
}

/**
 * The style of one target: defaults and mappings by visual property name, and the dependencies
 * (`nodeSizeLocked`, `arrowColorMatchesEdge`).
 * @category Styles
 */
export interface CytoscapeTargetStyle {
    /** Visual property name to raw default value. */
    readonly defaults: Map<string, unknown>;
    /** Visual property name to its mapping. */
    readonly mappings: Map<string, CytoscapeMapping>;
    /** Dependency name to whether it is on. */
    readonly dependencies: Map<string, boolean>;
    /**
     * Bypass names read as another visual property when the element has none of that one (CX2's `NODE_WIDTH` bypass
     * drives a locked node size).
     */
    readonly bypassAliases: Map<string, string>;
}

/**
 * A Cytoscape visual style: the network defaults and the style of nodes and edges.
 * @category Styles
 */
export interface CytoscapeStyle {
    /** The network's defaults (`NETWORK_BACKGROUND_PAINT`). */
    readonly network: {
        /** The network's default values by visual property name. */
        readonly defaults: Map<string, unknown>;
    };
    /** Node style. */
    readonly node: CytoscapeTargetStyle;
    /** Edge style. */
    readonly edge: CytoscapeTargetStyle;
}

/**
 * An empty style.
 * @returns a style with no defaults, mappings or dependencies
 * @category Styles
 */
export function emptyCytoscapeStyle(): CytoscapeStyle {
    const target = (): CytoscapeTargetStyle => ({
        defaults: new Map(),
        mappings: new Map(),
        dependencies: new Map(),
        bypassAliases: new Map(),
    });
    return { network: { defaults: new Map() }, node: target(), edge: target() };
}

/** Cytoscape's network-collection columns and the plain columns it fills them from when a file holds only those. */
const SHARED_COLUMNS: ReadonlyMap<string, string> = new Map([
    ["shared name", "name"],
    ["shared interaction", "interaction"],
]);

/**
 * Points every mapping over `shared name` or `shared interaction` at `name` or `interaction` when the file holds only
 * the plain column: Cytoscape fills the shared column from it on import, so the mapping reads the same values.
 * @param style - the target's style, changed in place
 * @param has - whether the file holds a column
 * @category Styles
 */
export function sharedColumnFallback(style: CytoscapeTargetStyle, has: (column: string) => boolean): void {
    for (const [vp, m] of style.mappings) {
        const plain = SHARED_COLUMNS.get(m.column);
        if (plain !== undefined && !has(m.column) && has(plain)) {
            style.mappings.set(vp, { ...m, column: plain });
        }
    }
}

/**
 * Points every mapping over the attribute an import read as the edge weight at the column it is kept in
 * (`graphty.weight`, which `snapshot.edges.byRole("weight")` finds): the importer takes that attribute out of the
 * plain columns, while Cytoscape keeps it as an ordinary column its mappings read.
 * @param style - the edge style, changed in place
 * @param weightFrom - the attribute read as the weight, or null when none was
 * @param table - the edge table
 * @category Styles
 */
export function weightColumnFallback(
    style: CytoscapeTargetStyle,
    weightFrom: string | null,
    table: GraphSnapshot["edges"],
): void {
    const kept = weightFrom === null || table.has(weightFrom) ? undefined : table.byRole("weight")?.meta.name;
    if (kept === undefined) {
        return;
    }
    for (const [vp, m] of style.mappings) {
        if (m.column === weightFrom) {
            style.mappings.set(vp, { ...m, column: kept });
        }
    }
}

/**
 * Whether a numeric type name is integral (`integer`, `long`), floating (`double`, `real`) or neither.
 * @param type - the type name as a file gives it
 * @returns the family, or null
 */
function numericFamily(type: string | null): "integral" | "floating" | null {
    const t = (type ?? "")
        .toLowerCase()
        .replace(/^list_of_/, "")
        .replace(/^java\.lang\./, "");
    if (t === "integer" || t === "long" || t === "int" || t === "short") {
        return "integral";
    }
    if (t === "double" || t === "float" || t === "real") {
        return "floating";
    }
    return null;
}

/**
 * Empties every discrete mapping whose keys are typed integral (`integer`, `long`) over a floating (`double`)
 * column, or the other way round. Cytoscape compares a Java Integer key with a Double value, which never match, so
 * the mapping sets nothing and the default shows (`4.0` does not match key `4`). Noted as `W_STYLE_BAD_MAPPING`.
 * @param style - the target's style, changed in place
 * @param typeOf - a column's declared type, or null when unknown
 * @param notes - where problems are noted
 * @param target - nodes or edges, for notes
 * @category Styles
 */
export function dropMismatchedKeys(
    style: CytoscapeTargetStyle,
    typeOf: (column: string) => string | null,
    notes: StyleNotes,
    target: StyleTarget,
): void {
    for (const [vp, m] of style.mappings) {
        if (m.kind !== "discrete" || m.table.length === 0) {
            continue;
        }
        const key = numericFamily(m.type);
        const column = numericFamily(typeOf(m.column));
        if (key !== null && column !== null && key !== column) {
            style.mappings.set(vp, { ...m, table: [] });
            notes.add(STYLE_ISSUE.BAD_MAPPING, target, m.column, {
                sample: `${vp}: ${key} keys on a ${column} column`,
            });
        }
    }
}

const NUMERIC_TYPES: ReadonlySet<string> = new Set(["integer", "long", "double", "float", "int", "short"]);
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * A discrete key typed by its attribute's type: a number for a numeric type, a boolean for `boolean`, else the key
 * as the file gives it. A list type (`list_of_integer`) types its items.
 * @param raw - the key as the file gives it
 * @param type - the attribute type, or null
 * @returns the typed key, or null when it is not a scalar
 * @category Styles
 */
export function typedKey(raw: unknown, type: string | null): string | number | boolean | null {
    if (typeof raw === "number") {
        return Number.isFinite(raw) ? raw : null;
    }
    if (typeof raw === "boolean") {
        return raw;
    }
    if (typeof raw !== "string") {
        return null;
    }
    const t = (type ?? "")
        .toLowerCase()
        .replace(/^list_of_/, "")
        .replace(/^java\.lang\./, "");
    if (NUMERIC_TYPES.has(t) && raw.length <= 64 && DECIMAL.test(raw.trim())) {
        return Number(raw.trim());
    }
    if (t === "boolean") {
        const b = raw.trim().toLowerCase();
        if (b === "true" || b === "false") {
            return b === "true";
        }
    }
    return raw;
}

/**
 * The tags of a CX version 1 mapping definition that are indexed.
 * @category Styles
 */
export type Cx1IndexedTag = "K" | "V" | "L" | "E" | "G" | "OV";
const INDEXED: ReadonlySet<string> = new Set<Cx1IndexedTag>(["K", "V", "L", "E", "G", "OV"]);

/**
 * A parsed CX version 1 mapping definition.
 * @category Styles
 */
export interface Cx1Definition {
    /** The column (`COL=`), or null. */
    readonly column: string | null;
    /** The attribute type (`T=`), or null. */
    readonly type: string | null;
    /** Each indexed tag's entries by index: `K` keys, `V` values, `L`/`E`/`G` below/at/above, `OV` points. */
    readonly entries: ReadonlyMap<Cx1IndexedTag, ReadonlyMap<number, string>>;
}

/**
 * Splits a definition at single commas; `,,` is a literal comma.
 * @param def - the definition
 * @returns the tokens
 */
function definitionTokens(def: string): string[] {
    const tokens: string[] = [];
    let parts: string[] = [];
    let start = 0;
    let i = def.indexOf(",");
    while (i >= 0) {
        parts.push(def.slice(start, i));
        if (def[i + 1] === ",") {
            parts.push(",");
            i++;
        } else {
            tokens.push(parts.join(""));
            parts = [];
        }
        start = i + 1;
        i = def.indexOf(",", start);
    }
    parts.push(def.slice(start));
    tokens.push(parts.join(""));
    return tokens;
}

/**
 * One indexed entry of a definition: `TAG=index=value`.
 * @param t - the token
 * @returns the tag, the index and the value, or null when the token is no indexed entry
 */
function indexedEntry(t: string): { tag: string; index: number; value: string } | null {
    const eq1 = t.indexOf("=");
    const eq2 = eq1 < 0 ? -1 : t.indexOf("=", eq1 + 1);
    const tag = t.slice(0, eq1);
    if (eq2 < 0 || !INDEXED.has(tag)) {
        return null;
    }
    const indexText = t.slice(eq1 + 1, eq2);
    return /^\d{1,15}$/.test(indexText) ? { tag, index: Number(indexText), value: t.slice(eq2 + 1) } : null;
}

/**
 * Reads a CX version 1 mapping definition: `COL=a,T=string,K=0=x,V=0=y,...`, with `,,` a literal comma. Indexes are
 * collected into Maps and never used as array positions (`K=4294967294=a` is one entry, not four billion holes); an
 * index larger than the number of tokens is ignored and noted as `W_STYLE_BAD_MAPPING`.
 * @param def - the definition string
 * @param notes - where problems are noted
 * @param target - nodes or edges, for the note
 * @returns the definition
 * @category Styles
 */
export function parseCx1Definition(def: string, notes?: StyleNotes, target: StyleTarget | null = null): Cx1Definition {
    const tokens = definitionTokens(def);
    const entries = new Map<Cx1IndexedTag, Map<number, string>>();
    let column: string | null = null;
    let type: string | null = null;
    let beyond = 0;
    for (const t of tokens) {
        if (t.startsWith("COL=")) {
            column = t.slice(4);
            continue;
        }
        if (t.startsWith("T=")) {
            type = t.slice(2);
            continue;
        }
        const indexed = indexedEntry(t);
        if (indexed === null) {
            continue;
        }
        const { tag, index, value } = indexed;
        if (index > tokens.length) {
            beyond++;
            continue;
        }
        let byIndex = entries.get(tag as Cx1IndexedTag);
        if (byIndex === undefined) {
            byIndex = new Map();
            entries.set(tag as Cx1IndexedTag, byIndex);
        }
        byIndex.set(index, value);
    }
    if (beyond > 0) {
        notes?.add(STYLE_ISSUE.BAD_MAPPING, target, column ?? "definition", {
            sample: `${beyond} entries with an index beyond the definition`,
            count: beyond,
        });
    }
    return { column, type, entries };
}

/**
 * The indexes of a tag's entries, ascending.
 * @param d - the definition
 * @param tag - the tag
 * @returns the indexes
 */
function indexesOf(d: Cx1Definition, tag: Cx1IndexedTag): number[] {
    return Array.from(d.entries.get(tag)?.keys() ?? []).sort((a, b) => a - b);
}

/**
 * A finite number from a number or decimal text.
 * @param v - the value
 * @returns the number, or null
 */
function finiteOf(v: unknown): number | null {
    if (typeof v === "number") {
        return Number.isFinite(v) ? v : null;
    }
    if (typeof v === "string" && v.length <= 64 && DECIMAL.test(v.trim())) {
        return Number(v.trim());
    }
    return null;
}

/**
 * A CX version 1 mapping (`{ type: "DISCRETE", definition: "COL=..." }`) as a Cytoscape mapping.
 * @param m - the mapping object
 * @param notes - where problems are noted
 * @param target - nodes or edges, for notes
 * @returns the mapping, or null when it cannot be read
 * @category Styles
 */
export function mappingFromCx1(
    m: unknown,
    notes?: StyleNotes,
    target: StyleTarget | null = null,
): CytoscapeMapping | null {
    if (m === null || typeof m !== "object" || typeof (m as { definition?: unknown }).definition !== "string") {
        return null;
    }
    const { type: kind, definition } = m as { type?: unknown; definition: string };
    const d = parseCx1Definition(definition, notes, target);
    if (d.column === null) {
        return null;
    }
    const at = (tag: Cx1IndexedTag, i: number): string | undefined => d.entries.get(tag)?.get(i);
    switch (String(kind).toUpperCase()) {
        case "PASSTHROUGH":
            return { kind: "passthrough", column: d.column, type: d.type };
        case "DISCRETE": {
            const table: [string | number | boolean, unknown][] = [];
            for (const i of indexesOf(d, "K")) {
                const key = typedKey(at("K", i), d.type);
                const value = at("V", i);
                if (key !== null && value !== undefined) {
                    table.push([key, value]);
                }
            }
            return { kind: "discrete", column: d.column, type: d.type, table };
        }
        case "CONTINUOUS": {
            const points: CytoscapeContinuousPoint[] = [];
            for (const i of indexesOf(d, "OV")) {
                const x = finiteOf(at("OV", i));
                if (x !== null) {
                    points.push({ at: x, below: at("L", i), value: at("E", i), above: at("G", i) });
                }
            }
            return { kind: "continuous", column: d.column, type: d.type, points };
        }
        default:
            return null;
    }
}

/**
 * A property of an object, read only when it is the object's own.
 * @param o - the object
 * @param k - the key
 * @returns the value, or undefined
 */
function own(o: unknown, k: string): unknown {
    return o !== null && typeof o === "object" && Object.hasOwn(o, k) ? (o as Record<string, unknown>)[k] : undefined;
}

/** A continuous point being assembled from CX2 intervals. */
interface PointDraft {
    at: number;
    below?: unknown;
    value?: unknown;
    above?: unknown;
}

/**
 * A CX2 mapping (`{ type, definition: { attribute, map } }`) as a Cytoscape mapping. Continuous intervals
 * (`{ min, max, includeMin, includeMax, minVPValue, maxVPValue }`) become points: an interval's `minVPValue` is the
 * value just above its `min` (and at it when `includeMin`), its `maxVPValue` the value just below its `max` (and at
 * it when `includeMax` and the next interval does not include its `min`).
 * @param m - the mapping object
 * @returns the mapping, or null when it cannot be read
 * @category Styles
 */
export function mappingFromCx2(m: unknown): CytoscapeMapping | null {
    const def = own(m, "definition");
    const column = own(def, "attribute");
    if (typeof column !== "string") {
        return null;
    }
    const declared = own(def, "type");
    const type = typeof declared === "string" ? declared : null;
    const map = own(def, "map");
    const entries = Array.isArray(map) ? (map as unknown[]) : [];
    switch (String(own(m, "type")).toUpperCase()) {
        case "PASSTHROUGH":
            return { kind: "passthrough", column, type };
        case "DISCRETE": {
            const table: [string | number | boolean, unknown][] = [];
            for (const e of entries) {
                const key = typedKey(own(e, "v"), type);
                const value = own(e, "vp");
                if (key !== null && value !== undefined) {
                    table.push([key, value]);
                }
            }
            return { kind: "discrete", column, type, table };
        }
        case "CONTINUOUS":
            return { kind: "continuous", column, type, points: cx2Points(entries) };
        default:
            return null;
    }
}

/**
 * The points of CX2's continuous intervals.
 * @param entries - the intervals
 * @returns the points, ascending
 */
function cx2Points(entries: readonly unknown[]): CytoscapeContinuousPoint[] {
    const byAt = new Map<number, PointDraft>();
    const point = (x: number): PointDraft => {
        let p = byAt.get(x);
        if (p === undefined) {
            p = { at: x };
            byAt.set(x, p);
        }
        return p;
    };
    for (const iv of entries) {
        if (iv !== null && typeof iv === "object") {
            addInterval(iv, point);
        }
    }
    return Array.from(byAt.values())
        .sort((a, b) => a.at - b.at)
        .map((p): CytoscapeContinuousPoint => {
            const below = p.below ?? p.value ?? p.above;
            const above = p.above ?? p.value ?? below;
            return { at: p.at, below, value: p.value ?? below, above };
        });
}

/**
 * One CX2 interval into its points: its `minVPValue` is the value just above its `min` (and at it when
 * `includeMin`), its `maxVPValue` the value just below its `max` (and at it when `includeMax` and the next interval
 * does not include its `min`).
 * @param iv - the interval
 * @param point - the point at a position, made on first use
 */
function addInterval(iv: object, point: (x: number) => PointDraft): void {
    const lo = finiteOf(own(iv, "min"));
    const hi = finiteOf(own(iv, "max"));
    const minValue = own(iv, "minVPValue") ?? own(iv, "maxVPValue");
    const maxValue = own(iv, "maxVPValue") ?? own(iv, "minVPValue");
    if (lo !== null) {
        const p = point(lo);
        p.above = minValue;
        if (own(iv, "includeMin") !== false) {
            p.value = minValue;
        }
    }
    if (hi !== null) {
        const p = point(hi);
        p.below = maxValue;
        if (own(iv, "includeMax") !== false && p.value === undefined) {
            p.value = maxValue;
        }
    }
}

/**
 * The element's own record of values, or an empty one.
 * @param x - the value
 * @returns the record
 */
function record(x: unknown): Record<string, unknown> {
    return x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
}

/**
 * The style of a CX version 1 file from its `cyVisualProperties` aspect: the first view's `network`,
 * `nodes:default` and `edges:default` entries (defaults, mappings, dependencies). Other views are skipped with one
 * `W_STYLE_OTHER_VIEWS` note; a mapping that cannot be read is noted as `W_STYLE_BAD_MAPPING`.
 * @param entries - the aspect's entries
 * @param notes - where problems are noted
 * @returns the style
 * @category Styles
 */
export function cytoscapeStyleFromCx(entries: readonly unknown[], notes?: StyleNotes): CytoscapeStyle {
    const style = emptyCytoscapeStyle();
    const viewOf = (v: unknown): unknown => own(v, "applies_to") ?? own(v, "view") ?? null;
    const views: unknown[] = [];
    for (const v of entries) {
        if (/default|network/.test(String(own(v, "properties_of"))) && !views.includes(viewOf(v))) {
            views.push(viewOf(v));
        }
    }
    if (views.length > 1) {
        notes?.add(STYLE_ISSUE.OTHER_VIEWS, null, "cyVisualProperties", {
            sample: `${views.length - 1} more`,
            count: views.length - 1,
        });
    }
    for (const v of entries) {
        const target =
            v !== null && typeof v === "object" && viewOf(v) === views[0]
                ? CX_SECTIONS.get(String(own(v, "properties_of")))
                : undefined;
        if (target === undefined) {
            continue;
        }
        const props = record(own(v, "properties"));
        for (const k of Object.keys(props)) {
            style[target].defaults.set(k, props[k]);
        }
        if (target !== "network") {
            readCxMappings(style, target, v, notes);
        }
    }
    return style;
}

/** The style section each `properties_of` of a CX `cyVisualProperties` entry fills. */
const CX_SECTIONS: ReadonlyMap<string, StyleTarget | "network"> = new Map([
    ["nodes:default", "node"],
    ["edges:default", "edge"],
    ["network", "network"],
]);

/**
 * The mappings and dependencies of a CX `nodes:default` or `edges:default` entry, into the style.
 * @param style - the style, changed in place
 * @param target - nodes or edges
 * @param v - the entry
 * @param notes - where a mapping that cannot be read is noted
 */
function readCxMappings(style: CytoscapeStyle, target: StyleTarget, v: unknown, notes: StyleNotes | undefined): void {
    const mappings = record(own(v, "mappings"));
    for (const vp of Object.keys(mappings)) {
        const m = mappingFromCx1(mappings[vp], notes, target);
        if (m === null) {
            notes?.add(STYLE_ISSUE.BAD_MAPPING, target, vp, { sample: mappings[vp] });
        } else {
            style[target].mappings.set(vp, m);
        }
    }
    const deps = record(own(v, "dependencies"));
    for (const d of Object.keys(deps)) {
        style[target].dependencies.set(d, String(deps[d]).toLowerCase() === "true");
    }
}

/**
 * The style of a CX2 file from its `visualProperties` and `visualEditorProperties` aspects (the first entry of
 * each). CX2 has no `NODE_SIZE`, so a locked node size follows `NODE_WIDTH` (its default, mapping and bypasses)
 * unless the file writes `NODE_SIZE` anyway.
 * @param visualProperties - the `visualProperties` aspect
 * @param visualEditorProperties - the `visualEditorProperties` aspect, or undefined
 * @param notes - where problems are noted
 * @returns the style
 * @category Styles
 */
export function cytoscapeStyleFromCx2(
    visualProperties: unknown,
    visualEditorProperties?: unknown,
    notes?: StyleNotes,
): CytoscapeStyle {
    const style = emptyCytoscapeStyle();
    const first = (x: unknown): unknown => (Array.isArray(x) ? x[0] : x);
    const vp = record(first(visualProperties));
    const editor = record(own(record(first(visualEditorProperties)), "properties"));
    const defaults = record(own(vp, "default"));
    for (const target of ["network", "node", "edge"] as const) {
        const d = record(own(defaults, target));
        for (const k of Object.keys(d)) {
            style[target].defaults.set(k, d[k]);
        }
    }
    style.node.dependencies.set("nodeSizeLocked", own(editor, "nodeSizeLocked") === true);
    style.edge.dependencies.set("arrowColorMatchesEdge", own(editor, "arrowColorMatchesEdge") === true);
    // charts are fitted to their node unless the editor says otherwise
    style.node.dependencies.set("nodeCustomGraphicsSizeSync", own(editor, "nodeCustomGraphicsSizeSync") !== false);
    for (const [target, key] of [
        ["node", "nodeMapping"],
        ["edge", "edgeMapping"],
    ] as const) {
        const mappings = record(own(vp, key));
        for (const name of Object.keys(mappings)) {
            const m = mappingFromCx2(mappings[name]);
            if (m === null) {
                notes?.add(STYLE_ISSUE.BAD_MAPPING, target, name, { sample: mappings[name] });
            } else {
                style[target].mappings.set(name, m);
            }
        }
    }
    lockedSizeFromWidth(style.node);
    // CX2 names an edge's bend handles EDGE_CONTROL_POINTS
    for (const part of [style.edge.defaults, style.edge.mappings] as Map<string, unknown>[]) {
        if (part.has("EDGE_CONTROL_POINTS") && !part.has("EDGE_BEND")) {
            part.set("EDGE_BEND", part.get("EDGE_CONTROL_POINTS"));
        }
    }
    style.edge.bypassAliases.set("EDGE_CONTROL_POINTS", "EDGE_BEND");
    return style;
}

/**
 * CX2 has no `NODE_SIZE`: a locked node size follows `NODE_WIDTH` (its default, mapping and bypasses) unless the
 * file writes `NODE_SIZE` anyway.
 * @param node - the node section, changed in place
 */
function lockedSizeFromWidth(node: CytoscapeStyle["node"]): void {
    if (
        node.dependencies.get("nodeSizeLocked") !== true ||
        node.defaults.has("NODE_SIZE") ||
        node.mappings.has("NODE_SIZE")
    ) {
        return;
    }
    if (node.defaults.has("NODE_WIDTH")) {
        node.defaults.set("NODE_SIZE", node.defaults.get("NODE_WIDTH"));
    }
    const width = node.mappings.get("NODE_WIDTH");
    if (width !== undefined) {
        node.mappings.set("NODE_SIZE", width);
    }
    node.bypassAliases.set("NODE_WIDTH", "NODE_SIZE");
}
