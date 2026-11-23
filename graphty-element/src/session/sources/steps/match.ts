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

import type { SourceMatchCounts as MatchCounts } from "../../types";
import { type JoinInto, type NodeOne, nodeOne, sourceOf } from "./acts";
import { isEmpty, isStaged, type MatchOptions, normalize, resolveNode, tableRows } from "./build";
import { buildOf, type Copies, copyMap, type SourceSteps } from "./project";
import type { CellValue, Row } from "./types";

/** Side 2: the incoming source and the field it names node 1 by. */
interface MatchFrom {
    readonly source: string;
    readonly field: string;
}

/** What the two sides are. */
export interface MatchPair {
    readonly from: MatchFrom;
    readonly into: JoinInto;
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

/** One side hashed: per key, how many rows hold it, the value first read and the nodes it reaches. */
type Hashed = Map<string, { n: number; first: CellValue; nodes: Set<string> }>;

/** A value as read, with the node 1 its row reaches (side 1 only). */
type Entry = readonly [CellValue | undefined, string?];

/** The values of both sides, as read once. */
interface Sides {
    readonly one: Iterable<Entry>;
    readonly two: readonly Entry[];
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
function column(rows: readonly Row[], field: string): Entry[] {
    const out: Entry[] = [];
    for (const row of rows) {
        out.push([row[field]]);
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
    const { source } = pair.into;
    if (source !== undefined && n1.keyCol !== undefined && isStaged(value, source)) {
        // A staged node 1 is not built yet: its rows' keys stand for the nodes adding it makes.
        return { one: translated(value, copies, source, pair.into.field ?? n1.keyCol, n1), two };
    }
    if (n1.isKey || source === undefined) {
        const { space } = n1;
        // ponytail: a merged node's former keys (aliases) are not counted; add them if a Merge
        // into an already merged space reads short.
        const keys = function* (): Generator<Entry> {
            for (const n of buildOf(value, copies).nodes.values()) {
                if (n.space === space) {
                    yield [n.key, n.id];
                }
            }
        };
        return { one: keys(), two };
    }
    return { one: translated(value, copies, source, pair.into.field ?? "", n1), two };
}

/**
 * Side 1 when the field is not node 1's key: each row's field value with the node its key reaches,
 * as the build's translator reads it. A row with no key, or whose key reaches no built node, is
 * skipped; a staged source is not built yet, so its keys stand for the nodes adding it makes.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param source - Node 1's source.
 * @param field - The column it translates through.
 * @param n1 - Node 1.
 * @returns The entries.
 */
function translated(value: SourceSteps, copies: Copies, source: string, field: string, n1: NodeOne): Entry[] {
    const keyCol = n1.keyCol ?? "";
    const staged = isStaged(value, source);
    const built = staged ? null : buildOf(value, copies);
    const out: Entry[] = [];
    for (const row of rowsOf(value, copies, source)) {
        const key = row[keyCol];
        if (isEmpty(row[field]) || isEmpty(key)) {
            continue;
        }
        const node = built === null ? String(key) : resolveNode(built, n1.space, String(key))?.id;
        if (node !== undefined) {
            out.push([row[field], node]);
        }
    }
    return out;
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
 * Count one row under its key.
 * @param table - The table.
 * @param k - The key.
 * @param v - The value as read.
 * @param node - The node 1 the row reaches, for side 1.
 */
function add(table: Hashed, k: string, v: CellValue, node: string | undefined): void {
    let held = table.get(k);
    if (held === undefined) {
        held = { n: 0, first: v, nodes: new Set() };
        table.set(k, held);
    }
    held.n++;
    if (node !== undefined) {
        held.nodes.add(node);
    }
}

/**
 * Hash one side's values every way in one pass.
 * @param values - The values.
 * @param ways - The ways.
 * @returns One table per way, in `asked`, `caseOff`, `spacesOff` order (null for a way not hashed).
 */
function hash(values: Iterable<Entry>, ways: Ways): [Hashed, Hashed | null, Hashed | null] {
    const out: [Hashed, Hashed | null, Hashed | null] = [
        new Map() as Hashed,
        ways.caseOff ? (new Map() as Hashed) : null,
        ways.spacesOff ? (new Map() as Hashed) : null,
    ];
    const opts = [ways.asked, ways.caseOff, ways.spacesOff];
    for (const [v, node] of values) {
        if (isEmpty(v)) {
            continue;
        }
        for (let i = 0; i < 3; i++) {
            const table = out[i];
            const o = opts[i];
            if (table === null || o === null) {
                continue;
            }
            add(table, normalize(v, o), v, node);
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
 * Keys held more than once: by more than one row, or for side 1 reaching more than one node.
 * @param t - The table.
 * @param byNodes - Count the nodes a key reaches, not the rows holding it.
 * @returns How many.
 */
function repeats(t: Hashed, byNodes: boolean): number {
    let n = 0;
    for (const held of t.values()) {
        if ((byNodes ? held.nodes.size : held.n) > 1) {
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
        if ((a.get(k)?.nodes.size ?? 0) > 1) {
            fanOut += n;
        }
    }
    return {
        matched,
        only1: a.size - matched,
        only2: b.size - matched,
        repeated1: repeats(a, true),
        repeated2: repeats(b, false),
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

/** One join `suggestMatches` proposes. */
export interface MatchSuggestion {
    readonly result: "merge" | "connect";
    readonly matches: readonly MatchPair[];
    readonly confident: boolean;
}

/** The share of a field's values that must meet to call a suggestion confident. */
const CONFIDENT_SHARE = 0.8;

/**
 * The joins a source most likely makes onto the graph, best first: each node column of the source
 * against the keys of each id space other than its own, ranked by the share of its values that
 * meet. A column whose values are the space's keys merges; any other connects.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param source - The source.
 * @param columns - The source's node columns.
 * @param spaces - The id spaces with nodes, and the source's own space.
 * @param spaces.all - Every space holding nodes.
 * @param spaces.own - The space the source's rows land in, which it never joins onto.
 * @param key - The source's key column, if any.
 * @returns The suggestions; none when no value meets.
 */
export function suggestMatches(
    value: SourceSteps,
    copies: Copies,
    source: string,
    columns: readonly string[],
    spaces: { readonly all: readonly string[]; readonly own: string | undefined },
    key: string | undefined,
): MatchSuggestion[] {
    const out: { share: number; suggestion: MatchSuggestion }[] = [];
    for (const space of spaces.all) {
        if (space === spaces.own) {
            continue;
        }
        for (const field of columns) {
            const pair: MatchPair = { from: { source, field }, into: { space } };
            let counts: MatchCounts;
            try {
                counts = matchCounts(value, copies, pair);
            } catch {
                continue;
            }
            const held = counts.matched + counts.only2;
            if (counts.matched === 0 || held === 0) {
                continue;
            }
            const share = counts.matched / held;
            out.push({
                share,
                suggestion: Object.freeze({
                    result: field === key ? "merge" : "connect",
                    matches: Object.freeze([Object.freeze(pair)]),
                    confident: share >= CONFIDENT_SHARE,
                }),
            });
        }
    }
    out.sort((a, b) => b.share - a.share);
    return out.map((each) => each.suggestion);
}
