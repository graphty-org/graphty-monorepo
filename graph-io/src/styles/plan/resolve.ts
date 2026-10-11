/**
 * The reference semantics of a file's styles: which value each element gets for one property. Walk the rules from
 * the top; the first rule whose predicate matches and that gives the property a non-null value wins. A passthrough
 * over a null, a discrete key absent from its table and a continuous mapping over a missing or non-numeric value give
 * no value, so the walk continues downward.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { canonEnum } from "../canon/enums.js";
import { canonBoolean, canonNumber, canonOpacity } from "../canon/number.js";
import type { CanonSite } from "../canon/site.js";
import { canonText } from "../canon/text.js";
import { StyleNotes } from "../notes.js";
import type {
    ColumnRef,
    ContinuousPoint,
    ExtractedStyles,
    Mapping,
    Predicate,
    Scalar,
    StyleColumn,
    StyleFeature,
    StyleProperty,
    StyleRule,
    StyleTarget,
    StyleValue,
    StyleWorkBudget,
} from "../types.js";
import { STYLE_PROPERTIES } from "../vocabulary.js";

/** Predicates nested deeper than this match nothing: a file never makes the resolver recurse without bound. */
const MAX_PREDICATE_DEPTH = 32;
/** The most values an `in` predicate may hold in a short predicate. */
const MAX_PREDICATE_TERMS = 8;
const HEX6 = /^#[0-9a-f]{6}$/;

/**
 * Where the per-element values a rule reads come from.
 */
interface RefSource {
    /** The number of elements. */
    readonly n: number;
    /**
     * The values of a column, by element index, or null when nothing holds it.
     * @param ref - the column
     * @returns the values, or null
     */
    column(ref: ColumnRef): ArrayLike<unknown> | null;
}

/**
 * The cache key of a column reference.
 * @param ref - the column
 * @returns a key unique per column
 */
function refKey(ref: ColumnRef): string {
    if ("style" in ref) {
        return `style:${ref.style}`;
    }
    if ("computed" in ref) {
        return `computed:${ref.computed}`;
    }
    return `data:${(ref as { data: string }).data}`;
}

/**
 * A cell of a snapshot column as a plain value: 64-bit integers as numbers, typed-array items as arrays, unset as
 * null.
 * @param v - the value the table returns
 * @returns the plain value
 */
export function plainCell(v: unknown): unknown {
    if (v === undefined || v === null) {
        return null;
    }
    if (typeof v === "bigint") {
        return Number(v);
    }
    if (ArrayBuffer.isView(v)) {
        return Array.from(v as unknown as ArrayLike<number>);
    }
    return v;
}

/**
 * The degree arrays of a snapshot as plain numbers.
 * @param snapshot - the graph
 * @param which - which degree
 * @returns the degree of every node
 */
export function degreeValues(snapshot: GraphSnapshot, which: "degree" | "indegree" | "outdegree"): number[] {
    let arr: ArrayLike<number>;
    if (which === "degree") {
        arr = snapshot.degree();
    } else if (which === "indegree") {
        arr = snapshot.inDegree();
    } else {
        arr = snapshot.outDegree();
    }
    return Array.from(arr);
}

/**
 * A reference source over a target's style columns, its features and, when given, the snapshot itself.
 * @param target - nodes or edges
 * @param n - the element count
 * @param columns - the style columns
 * @param features - candidate features (used for data and computed columns when no snapshot is given)
 * @param snapshot - the graph, read for data and computed columns when given
 * @returns the source
 */
export function refSource(
    target: StyleTarget,
    n: number,
    columns: ReadonlyMap<string, StyleColumn>,
    features: readonly StyleFeature[],
    snapshot?: GraphSnapshot,
): RefSource {
    const cache = new Map<string, ArrayLike<unknown> | null>();
    const byKey = new Map<string, StyleFeature>();
    for (const f of features) {
        byKey.set(refKey(f.ref), f);
    }
    return {
        n,
        column(ref: ColumnRef): ArrayLike<unknown> | null {
            if ("style" in ref) {
                return columns.get(ref.style) ?? null;
            }
            const k = refKey(ref);
            if (cache.has(k)) {
                return cache.get(k) ?? null;
            }
            let out: ArrayLike<unknown> | null = null;
            if (snapshot !== undefined && "computed" in ref) {
                out = target === "node" ? degreeValues(snapshot, ref.computed) : null;
            } else if (snapshot !== undefined && "data" in ref) {
                const table = target === "node" ? snapshot.nodes : snapshot.edges;
                if (table.has(ref.data)) {
                    const vals = new Array<unknown>(n);
                    for (let i = 0; i < n; i++) {
                        vals[i] = plainCell(table.value(ref.data, i));
                    }
                    out = vals;
                }
            } else {
                out = byKey.get(k)?.values ?? null;
            }
            cache.set(k, out);
            return out;
        },
    };
}

/**
 * One element's value of a column.
 * @param src - the reference source
 * @param ref - the column
 * @param i - the element
 * @returns the value, or null
 */
function readRef(src: RefSource, ref: ColumnRef, i: number): unknown {
    const col = src.column(ref);
    if (col === null) {
        return null;
    }
    return col[i] ?? null;
}

/**
 * Whether a predicate is short: `all`, `has`, `not has`, `eq` or `in` with at most 8 values, combined with at most
 * one `and` of at most 8 terms.
 * @param where - the predicate
 * @returns true when it is short
 */
export function isShortPredicate(where: Predicate): boolean {
    if ("and" in where) {
        if (!Array.isArray(where.and) || where.and.length === 0) {
            return false;
        }
        let terms = 0;
        for (const p of where.and) {
            const t = atomTerms(p);
            if (t === 0) {
                return false;
            }
            terms += t;
        }
        return terms <= MAX_PREDICATE_TERMS;
    }
    return atomTerms(where) > 0;
}

/**
 * The terms of a short atom, or 0 when the predicate is not one.
 * @param p - the predicate
 * @returns its term count, or 0
 */
function atomTerms(p: Predicate): number {
    if ("all" in p) {
        return p.all ? 1 : 0;
    }
    if ("has" in p) {
        return 1;
    }
    if ("not" in p) {
        return "has" in p.not ? 1 : 0;
    }
    if ("eq" in p) {
        return 1;
    }
    if ("in" in p) {
        const n = Array.isArray(p.in[1]) ? p.in[1].length : 0;
        return n >= 1 && n <= MAX_PREDICATE_TERMS ? n : 0;
    }
    return 0;
}

/**
 * Whether a column value equals a predicate's scalar.
 * @param v - the element's value
 * @param k - the scalar
 * @returns true when equal
 */
function scalarEq(v: unknown, k: Scalar): boolean {
    return v !== null && v !== undefined && v === k;
}

/**
 * Whether a predicate matches an element. Unknown predicate kinds and predicates nested deeper than 32 match nothing.
 * @param where - the predicate
 * @param src - the reference source
 * @param i - the element
 * @param depth - the current nesting depth
 * @returns true when the predicate matches
 */
export function matches(where: Predicate, src: RefSource, i: number, depth = 0): boolean {
    if (depth > MAX_PREDICATE_DEPTH) {
        return false;
    }
    if ("all" in where) {
        return where.all;
    }
    if ("has" in where) {
        const v = readRef(src, where.has, i);
        return v !== null && v !== false;
    }
    if ("eq" in where) {
        return scalarEq(readRef(src, where.eq[0], i), where.eq[1]);
    }
    if ("in" in where) {
        const v = readRef(src, where.in[0], i);
        return where.in[1].some((k) => scalarEq(v, k));
    }
    if ("and" in where) {
        return where.and.every((p) => matches(p, src, i, depth + 1));
    }
    if ("or" in where) {
        return where.or.some((p) => matches(p, src, i, depth + 1));
    }
    if ("not" in where) {
        return !matches(where.not, src, i, depth + 1);
    }
    return false;
}

const ENUM_KINDS: ReadonlySet<string> = new Set(["shape", "borderStyle", "lineStyle", "arrow", "weight", "position"]);

/**
 * How a passthrough reads a raw value as a property's canonical value (CSS spelling for colors).
 * @param target - nodes or edges
 * @param property - the property
 * @returns the reader: a canonical value or null
 */
export function canonicalFor(target: StyleTarget, property: string): (raw: unknown) => StyleValue | null {
    const kind = STYLE_PROPERTIES[target].get(property);
    const site: CanonSite = { notes: new StyleNotes(), target, property };
    if (kind === undefined) {
        return (raw) => (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? raw : null);
    }
    switch (kind) {
        case "color":
            // only an already canonical color: a CSS function or a name may parse differently elsewhere
            return (raw) => (typeof raw === "string" && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : null);
        case "number":
            return (raw) => canonNumber(raw, site);
        case "opacity":
            return (raw) => canonOpacity(raw, "css", site);
        case "boolean":
            return (raw) => canonBoolean(raw, site);
        case "text":
            return (raw) => canonText(raw, site);
        default:
            if (!ENUM_KINDS.has(kind)) {
                return () => null;
            }
            return (raw) =>
                typeof raw === "string" && raw.startsWith("other:") ? raw : canonEnum(kind, raw, "css", site);
    }
}

const LOOKUPS = new WeakMap<object, (value: unknown) => number>();
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * A number from a number or a decimal string.
 * @param v - the value
 * @returns the number, or null
 */
export function numberOf(v: unknown): number | null {
    if (typeof v === "number") {
        return Number.isFinite(v) ? v : null;
    }
    if (typeof v === "string" && v.length <= 64 && DECIMAL.test(v.trim())) {
        return Number(v.trim());
    }
    return null;
}

/**
 * The lookup of a discrete table: keys compared by their text (numbers numerically, booleans without case), a list
 * value matched by its first item that has an entry. Built once per table through hash indexes.
 * @param table - the table
 * @returns the index of the matching entry, or -1
 */
export function discreteLookup(table: readonly (readonly [Scalar, StyleValue])[]): (value: unknown) => number {
    const cached = LOOKUPS.get(table);
    if (cached !== undefined) {
        return cached;
    }
    const byStr = new Map<string, number>();
    const byNum = new Map<number, number>();
    const byBool = new Map<string, number>();
    table.forEach(([k], j) => {
        if (k === null || typeof k === "object") {
            return;
        }
        const ks = String(k);
        if (!byStr.has(ks)) {
            byStr.set(ks, j);
        }
        const kn = numberOf(k);
        if (kn !== null && !byNum.has(kn)) {
            byNum.set(kn, j);
        }
        const kb = ks.toLowerCase();
        if ((kb === "true" || kb === "false") && !byBool.has(kb)) {
            byBool.set(kb, j);
        }
    });
    const one = (value: unknown): number => {
        if (typeof value === "number") {
            return byNum.get(value) ?? -1;
        }
        if (typeof value === "boolean") {
            return byBool.get(String(value)) ?? -1;
        }
        if (typeof value === "string") {
            return byStr.get(value) ?? -1;
        }
        return -1;
    };
    const f = (value: unknown): number => {
        if (Array.isArray(value)) {
            for (const v of value) {
                const j = one(v);
                if (j >= 0) {
                    return j;
                }
            }
            return -1;
        }
        return one(value);
    };
    LOOKUPS.set(table, f);
    return f;
}

/**
 * Two hex digits.
 * @param v - a channel 0..255
 * @returns its hex
 */
function hex2(v: number): string {
    return Math.min(255, Math.max(0, Math.round(v)))
        .toString(16)
        .padStart(2, "0");
}

/**
 * A number at 6 significant digits.
 * @param x - the number
 * @returns the rounded number
 */
function num6(x: number): number {
    return Number(x.toPrecision(6)) + 0;
}

/**
 * Interpolates two values: numbers linearly at 6 significant digits, colors per sRGB channel; anything else steps at
 * the right end.
 * @param a - the left value
 * @param b - the right value
 * @param t - 0..1
 * @returns the value
 */
export function interpolate(a: StyleValue, b: StyleValue, t: number): StyleValue {
    if (typeof a === "number" && typeof b === "number") {
        return num6(a + (b - a) * t);
    }
    if (typeof a === "string" && typeof b === "string" && HEX6.test(a) && HEX6.test(b)) {
        let out = "#";
        for (const k of [1, 3, 5]) {
            const ca = parseInt(a.slice(k, k + 2), 16);
            const cb = parseInt(b.slice(k, k + 2), 16);
            out += hex2(ca + (cb - ca) * t);
        }
        return out;
    }
    return t < 1 ? a : b;
}

/**
 * Evaluates a continuous mapping at x.
 * @param points - the points, in increasing `at`
 * @param x - the input
 * @returns the value, or null for a missing or non-finite input
 */
export function evalContinuous(points: readonly ContinuousPoint[], x: number | null): StyleValue | null {
    if (x === null || !Number.isFinite(x) || points.length === 0) {
        return null;
    }
    if (x < points[0].at) {
        return points[0].below;
    }
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (x === p.at) {
            return p.value;
        }
        const q = points.at(i + 1);
        if (q === undefined) {
            return p.above;
        }
        if (x < q.at) {
            return interpolate(p.above, q.below, (x - p.at) / (q.at - p.at));
        }
    }
    return null;
}

/**
 * The value one mapping gives one element.
 * @param m - the mapping
 * @param canon - the property's passthrough reader
 * @param src - the reference source
 * @param i - the element
 * @returns the value, or null when the mapping gives none
 */
function evalMapping(
    m: Mapping,
    canon: (raw: unknown) => StyleValue | null,
    src: RefSource,
    i: number,
): StyleValue | null {
    const v = readRef(src, m.by, i);
    if (v === null || v === undefined) {
        return null;
    }
    switch (m.kind) {
        case "passthrough":
            if (Array.isArray(v)) {
                return null;
            }
            // a style column already holds canonical values; a data column is read as the property's value
            if ("style" in m.by) {
                return typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : null;
            }
            return canon(v);
        case "discrete": {
            const j = discreteLookup(m.table)(v);
            return j < 0 ? null : m.table[j][1];
        }
        case "continuous":
            return Array.isArray(v) ? null : evalContinuous(m.points, numberOf(v));
        default:
            return null;
    }
}

/**
 * A rule's constant value of a property: its own member only, so a property named like a built-in object member
 * (`constructor`, `toString`) is never found on the prototype.
 * @param rule - the rule
 * @param property - the property
 * @returns the value, or undefined
 */
function setOf(rule: StyleRule, property: string): StyleValue | undefined {
    const set: Readonly<Record<string, StyleValue | undefined>> = rule.set ?? {};
    return Object.hasOwn(set, property) ? set[property] : undefined;
}

/**
 * A rule's mapping of a property: its own member only.
 * @param rule - the rule
 * @param property - the property
 * @returns the mapping, or undefined
 */
function mapOf(rule: StyleRule, property: string): Mapping | undefined {
    const map: Readonly<Record<string, Mapping | undefined>> = rule.map ?? {};
    return Object.hasOwn(map, property) ? map[property] : undefined;
}

/**
 * Resolves one property for every element over a rule list.
 * @param rules - the rules, bottom to top (other targets are skipped)
 * @param target - nodes or edges
 * @param property - the property
 * @param src - the reference source
 * @param budget - spent once per rule visited, when given
 * @returns each element's value, or null where no rule gives one
 */
export function resolveRules(
    rules: readonly StyleRule[],
    target: StyleTarget,
    property: string,
    src: RefSource,
    budget?: StyleWorkBudget,
): (StyleValue | null)[] {
    const writers: StyleRule[] = [];
    for (let r = rules.length - 1; r >= 0; r--) {
        const rule = rules[r];
        if (rule.target !== target) {
            continue;
        }
        if (setOf(rule, property) !== undefined || mapOf(rule, property) !== undefined) {
            writers.push(rule);
        }
    }
    const canon = canonicalFor(target, property);
    const out = new Array<StyleValue | null>(src.n).fill(null);
    let visits = 0;
    for (let i = 0; i < src.n; i++) {
        for (const rule of writers) {
            visits++;
            if (!matches(rule.where, src, i)) {
                continue;
            }
            const set = setOf(rule, property);
            const mapping = mapOf(rule, property);
            let v: StyleValue | null = null;
            if (set !== undefined) {
                v = set;
            } else if (mapping !== undefined) {
                v = evalMapping(mapping, canon, src, i);
            }
            if (v !== null) {
                out[i] = v;
                break;
            }
        }
    }
    budget?.spend(target, visits + src.n);
    return out;
}

/**
 * Every element's value of one property under a file's styles: the reference semantics of the format.
 * @param extracted - the styles
 * @param target - nodes or edges
 * @param property - the property
 * @param snapshot - the graph; when given, data columns and degrees are read from it (so a degree mapping follows
 * the graph), otherwise from `extracted.features`
 * @returns each element's value, or null where the file gives none
 * @category Styles
 */
export function resolveStyles(
    extracted: ExtractedStyles,
    target: StyleTarget,
    property: StyleProperty,
    snapshot?: GraphSnapshot,
): readonly (StyleValue | null)[] {
    let n = extracted.fingerprint[target === "node" ? "nodes" : "edges"];
    if (snapshot !== undefined) {
        n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    }
    const src = refSource(target, n, extracted.columns[target], extracted.features[target], snapshot);
    return resolveRules(extracted.styles.rules, target, property, src);
}

/**
 * Whether two values agree within the rounding a writing tool does: 2 of 255 per color channel, or 1e-5 relative for
 * numbers.
 * @param a - one value
 * @param b - the other
 * @returns true when equal or within the rounding
 */
export function within(a: StyleValue | null, b: StyleValue | null): boolean {
    if (a === b) {
        return true;
    }
    if (typeof a === "number" && typeof b === "number") {
        return Math.abs(a - b) <= 1e-5 * Math.max(Math.abs(a), Math.abs(b), 1e-9);
    }
    if (typeof a === "string" && typeof b === "string" && HEX6.test(a) && HEX6.test(b)) {
        for (const k of [1, 3, 5]) {
            if (Math.abs(parseInt(a.slice(k, k + 2), 16) - parseInt(b.slice(k, k + 2), 16)) > 2) {
                return false;
            }
        }
        return true;
    }
    return false;
}
