/**
 * @file Live match counts and the value-overlap list (design
 * design/data/multiple-data-sources-design.md, section 5.2), behind the `source-steps` experiment.
 *
 * Both hash the two columns a Merge or Make an edge would compare and never build: side 1 is the
 * nodes the step joins onto (the keys of a space as the last build holds them, or a column of
 * the source it translates through), side 2 the incoming source's field. Each row is read once,
 * and that one pass hashes it three ways: as the step compares it, and with each toggle that is
 * off turned on. Pure, and free of Babylon.js, Lit and the DOM.
 */

import { type JoinInto, nodeOne, sourceOf } from "./acts";
import { isEmpty, type MatchOptions, normalize, tableRows } from "./build";
import { buildOf, type Copies, copyMap, type SourceSteps } from "./project";
import type { CellValue, Row } from "./types";

/** Side 2: the incoming source and the field it names node 1 by. */
export interface MatchFrom {
    readonly source: string;
    readonly field: string;
}

/** What the two sides are. */
export interface MatchPair {
    readonly from: MatchFrom;
    readonly into: JoinInto;
}

/** The counts `data.matchCounts` returns. Keys count once however many rows hold them. */
export interface MatchCounts {
    /** Keys both sides hold. */
    readonly matched: number;
    /** Keys only side 1 holds: node 1s no row reaches. */
    readonly only1: number;
    /** Keys only side 2 holds: rows naming no node 1. */
    readonly only2: number;
    /** Keys side 1 holds more than once. */
    readonly repeated1: number;
    /** Keys side 2 holds more than once. */
    readonly repeated2: number;
    /** Rows of side 2 whose key side 1 holds more than once: they name several nodes. */
    readonly fanOut: number;
    /** Rows of side 2 that match nothing as text but would as numbers, such as `"007"` and `7`. */
    readonly textVersusNumber: number;
    /** How many more keys match with `ignoreCase` on; null while it is on. */
    readonly moreWithIgnoreCase: number | null;
    /** How many more keys match with `ignoreSpaces` on; null while it is on. */
    readonly moreWithIgnoreSpaces: number | null;
}

/** One value of the overlap list. */
export interface MatchValue {
    /** The value as first read (from side 1 when it holds it). */
    readonly value: CellValue;
    /** Rows (or nodes) of side 1 holding it. */
    readonly count1: number;
    /** Rows of side 2 holding it. */
    readonly count2: number;
}

/** Which values the overlap list keeps, and which page of them. */
export interface MatchValuesOptions extends MatchOptions {
    readonly only?: "matched" | "only1" | "only2";
    readonly offset?: number;
    readonly limit?: number;
}

/** One side hashed: per key, how many rows hold it and the value first read. */
type Hashed = Map<string, { n: number; first: CellValue }>;

/** The values of both sides, as read once. */
interface Sides {
    readonly one: Iterable<CellValue | undefined>;
    readonly two: readonly (CellValue | undefined)[];
}

/**
 * A source's rows of the table its node rows live in, else its edge rows.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The source.
 * @returns The rows.
 */
function rowsOf(value: SourceSteps, copies: Copies, id: string): readonly Row[] {
    const src = sourceOf(value, id);
    return tableRows(src, copyMap(copies), src.mapping.nodes ? "nodes" : "edges") ?? [];
}

/**
 * The cells of one column, each row read once.
 * @param rows - The rows.
 * @param field - The column.
 * @returns The cells.
 */
function column(rows: readonly Row[], field: string): (CellValue | undefined)[] {
    const out: (CellValue | undefined)[] = [];
    for (const row of rows) {
        out.push(row[field]);
    }
    return out;
}

/**
 * The two sides' values. Side 1 is node 1's keys in its space when the field is its key (the
 * last build's nodes, which every act already built), else the column it translates through.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param pair - The two sides.
 * @returns The values.
 */
function sides(value: SourceSteps, copies: Copies, pair: MatchPair): Sides {
    const two = column(rowsOf(value, copies, pair.from.source), pair.from.field);
    const n1 = nodeOne(value, pair.into);
    if (n1.isKey || pair.into.source === undefined) {
        const { space } = n1;
        // ponytail: a merged node's former keys (aliases) are not counted; add them if a Merge
        // into an already merged space reads short.
        const keys = function* (): Generator<string> {
            for (const n of buildOf(value, copies).nodes.values()) {
                if (n.space === space) {
                    yield n.key;
                }
            }
        };
        return { one: keys(), two };
    }
    return { one: column(rowsOf(value, copies, pair.into.source), pair.into.field ?? ""), two };
}

/** The three ways one pass hashes a value: as asked, and with each toggle that is off turned on. */
interface Ways {
    readonly asked: MatchOptions;
    readonly caseOff: MatchOptions | null;
    readonly spacesOff: MatchOptions | null;
}

/**
 * The ways to hash.
 * @param o - The toggles asked for.
 * @returns The ways.
 */
function waysOf(o: MatchOptions): Ways {
    const asked = { ignoreCase: o.ignoreCase === true, ignoreSpaces: o.ignoreSpaces === true };
    return {
        asked,
        caseOff: asked.ignoreCase ? null : { ...asked, ignoreCase: true },
        spacesOff: asked.ignoreSpaces ? null : { ...asked, ignoreSpaces: true },
    };
}

/**
 * Hash one side's values every way in one pass.
 * @param values - The values.
 * @param ways - The ways.
 * @returns One table per way, in `asked`, `caseOff`, `spacesOff` order (null for a way not hashed).
 */
function hash(values: Iterable<CellValue | undefined>, ways: Ways): [Hashed, Hashed | null, Hashed | null] {
    const out: [Hashed, Hashed | null, Hashed | null] = [
        new Map() as Hashed,
        ways.caseOff ? (new Map() as Hashed) : null,
        ways.spacesOff ? (new Map() as Hashed) : null,
    ];
    const opts = [ways.asked, ways.caseOff, ways.spacesOff];
    for (const v of values) {
        if (isEmpty(v)) {
            continue;
        }
        for (let i = 0; i < 3; i++) {
            const table = out[i];
            const o = opts[i];
            if (table === null || o === null) {
                continue;
            }
            const k = normalize(v, o);
            const held = table.get(k);
            if (held === undefined) {
                table.set(k, { n: 1, first: v });
            } else {
                held.n++;
            }
        }
    }
    return out;
}

/**
 * Keys both tables hold.
 * @param a - Side 1.
 * @param b - Side 2.
 * @returns How many.
 */
function both(a: Hashed, b: Hashed): number {
    let n = 0;
    for (const k of b.keys()) {
        if (a.has(k)) {
            n++;
        }
    }
    return n;
}

/**
 * Keys held more than once.
 * @param t - The table.
 * @returns How many.
 */
function repeats(t: Hashed): number {
    let n = 0;
    for (const { n: rows } of t.values()) {
        if (rows > 1) {
            n++;
        }
    }
    return n;
}

/**
 * A cell as a number, when it reads as one.
 * @param v - The cell.
 * @returns The number, or null.
 */
function asNumber(v: CellValue): number | null {
    if (typeof v === "number") {
        return Number.isFinite(v) ? v : null;
    }
    if (typeof v !== "string" || v.trim() === "") {
        return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/**
 * Rows of side 2 that match nothing as text but whose number side 1 holds.
 * @param a - Side 1.
 * @param b - Side 2.
 * @returns How many rows.
 */
function numbersOnly(a: Hashed, b: Hashed): number {
    const numbers = new Set<number>();
    for (const { first } of a.values()) {
        const n = asNumber(first);
        if (n !== null) {
            numbers.add(n);
        }
    }
    let rows = 0;
    for (const [k, { n, first }] of b) {
        const num = asNumber(first);
        if (!a.has(k) && num !== null && numbers.has(num)) {
            rows += n;
        }
    }
    return rows;
}

/**
 * Live match counts for two picked fields, building nothing (design 5.2).
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param pair - The two sides.
 * @param o - Whether case and spaces count.
 * @returns The counts.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, or `E_AMBIGUOUS_ID` when
 *   `into` names no one end of an edge source.
 */
export function matchCounts(value: SourceSteps, copies: Copies, pair: MatchPair, o: MatchOptions = {}): MatchCounts {
    const ways = waysOf(o);
    const { one, two } = sides(value, copies, pair);
    const [a, aCase, aSpaces] = hash(one, ways);
    const [b, bCase, bSpaces] = hash(two, ways);
    const matched = both(a, b);
    let fanOut = 0;
    for (const [k, { n }] of b) {
        if ((a.get(k)?.n ?? 0) > 1) {
            fanOut += n;
        }
    }
    return {
        matched,
        only1: a.size - matched,
        only2: b.size - matched,
        repeated1: repeats(a),
        repeated2: repeats(b),
        fanOut,
        textVersusNumber: numbersOnly(a, b),
        moreWithIgnoreCase: aCase && bCase ? both(aCase, bCase) - matched : null,
        moreWithIgnoreSpaces: aSpaces && bSpaces ? both(aSpaces, bSpaces) - matched : null,
    };
}

/**
 * The value-overlap list (design 5.2): each value either side holds, with how many rows of each
 * hold it, most held first, building nothing.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param pair - The two sides.
 * @param o - Which values, which page, and whether case and spaces count.
 * @returns The page and how many values the filter keeps in all.
 * @throws As {@link matchCounts}.
 */
export function matchValues(
    value: SourceSteps,
    copies: Copies,
    pair: MatchPair,
    o: MatchValuesOptions = {},
): { readonly total: number; readonly values: readonly MatchValue[] } {
    const asked = { ignoreCase: o.ignoreCase === true, ignoreSpaces: o.ignoreSpaces === true };
    const ways: Ways = { asked, caseOff: null, spacesOff: null };
    const { one, two } = sides(value, copies, pair);
    const [a] = hash(one, ways);
    const [b] = hash(two, ways);
    const keep = (k: string): boolean => {
        switch (o.only) {
            case "matched":
                return a.has(k) && b.has(k);
            case "only1":
                return !b.has(k);
            case "only2":
                return !a.has(k);
            default:
                return true;
        }
    };
    const all: MatchValue[] = [];
    for (const k of new Set([...a.keys(), ...b.keys()])) {
        if (keep(k)) {
            const x = a.get(k);
            const y = b.get(k);
            all.push({ value: (x ?? y)?.first ?? null, count1: x?.n ?? 0, count2: y?.n ?? 0 });
        }
    }
    // Stable: values held equally often keep the order they were first read in.
    all.sort((p, q) => q.count1 + q.count2 - (p.count1 + p.count2));
    const offset = Math.max(0, o.offset ?? 0);
    return { total: all.length, values: all.slice(offset, offset + Math.max(0, o.limit ?? all.length)) };
}
