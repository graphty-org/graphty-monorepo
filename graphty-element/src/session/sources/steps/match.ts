/**
 * @file Live match counts and the value-overlap list (design
 * design/data/multiple-data-sources-design.md, section 5.2), behind the `source-steps` experiment.
 *
 * Both hash the two columns a Merge or Make an edge would compare and never build: side 1 is the
 * nodes the step joins onto (the keys of a space, or a column its nodes carry, as the last build
 * holds them, or a column of the source it translates through), side 2 the incoming source's field.
 * A list's values are compared apart. Each row is read once,
 * and that one pass hashes it three ways: as the step compares it, and with each toggle that is
 * off turned on. Pure, and free of Babylon.js, Lit and the DOM.
 */

import type { SourceMatchCounts as MatchCounts } from "../../types";
import { type JoinInto, type NodeOne, nodeOne, sourceOf } from "./acts";
import { cellValues, isEmpty, isStaged, type MatchOptions, normalize, resolveNode, tableRows } from "./build";
import { buildOf, type Copies, copyMap, type SourceSteps } from "./project";
import type { BuildResult, CellValue, Row, Value } from "./types";

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

/** How the keys compare, and which steps side 1 is built by. */
interface CountOptions extends MatchOptions {
    /** Build side 1 with only the steps before this place. */
    readonly before?: number;
}

/** The value with only the steps before a place, one per value and place so its build is kept. */
const truncated = new WeakMap<SourceSteps, Map<number, SourceSteps>>();

/**
 * The value as the steps before a place build it.
 * @param value - The value.
 * @param before - The place; absent keeps every step.
 * @returns The value.
 */
export function upTo(value: SourceSteps, before: number | undefined): SourceSteps {
    if (before === undefined || before >= value.steps.length) {
        return value;
    }
    let held = truncated.get(value);
    if (held === undefined) {
        held = new Map();
        truncated.set(value, held);
    }
    let out = held.get(before);
    if (out === undefined) {
        out = { ...value, steps: value.steps.slice(0, Math.max(0, before)) };
        held.set(before, out);
    }
    return out;
}

/** Which values the overlap list keeps, and which page of them. */
export interface MatchValuesOptions extends CountOptions {
    readonly only?: "matched" | "only1" | "only2";
    readonly offset?: number;
    readonly limit?: number;
}

/** One side hashed: per key, how many rows hold it, the value first read and the nodes it reaches. */
type Hashed = Map<string, { n: number; first: CellValue; nodes: Set<string> }>;

/** A value as read, or a list's, with the node 1 its row reaches (side 1 only). */
type Entry = readonly [Value | undefined, string?];

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
        const { space, nodeColumn } = n1;
        // ponytail: a merged node's former keys (aliases) are not counted; add them if a Merge
        // into an already merged space reads short.
        const keys = function* (): Generator<Entry> {
            for (const n of buildOf(value, copies).nodes.values()) {
                if (n.space === space) {
                    yield [nodeColumn === undefined ? n.key : n.values[nodeColumn], n.id];
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
    /** Both toggles on, when neither is. */
    readonly bothOff: MatchOptions | null;
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
        bothOff: asked.ignoreCase || asked.ignoreSpaces ? null : { ignoreCase: true, ignoreSpaces: true },
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
 * Hash one value every way.
 * @param tables - One table per way, null for a way not hashed.
 * @param opts - The ways.
 * @param v - The value.
 * @param node - The node 1 its row reaches, for side 1.
 */
function hashOne(
    tables: readonly (Hashed | null)[],
    opts: readonly (MatchOptions | null)[],
    v: CellValue,
    node: string | undefined,
): void {
    tables.forEach((table, i) => {
        const o = opts[i];
        if (table !== null && o !== null) {
            add(table, normalize(v, o), v, node);
        }
    });
}

/**
 * Hash one side's values every way in one pass, each value of a list apart.
 * @param values - The values.
 * @param ways - The ways.
 * @returns One table per way, in `asked`, `caseOff`, `spacesOff`, `bothOff` order (null for a way not hashed).
 */
function hash(values: Iterable<Entry>, ways: Ways): [Hashed, Hashed | null, Hashed | null, Hashed | null] {
    const table = (way: MatchOptions | null): Hashed | null => (way === null ? null : (new Map() as Hashed));
    const out: [Hashed, Hashed | null, Hashed | null, Hashed | null] = [
        new Map() as Hashed,
        table(ways.caseOff),
        table(ways.spacesOff),
        table(ways.bothOff),
    ];
    const opts = [ways.asked, ways.caseOff, ways.spacesOff, ways.bothOff];
    for (const [cell, node] of values) {
        for (const v of new Set(cellValues(cell).filter((each) => !isEmpty(each)))) {
            hashOne(out, opts, v ?? null, node);
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
 * Rows of side 2 with a value side 1 holds, compared one way: a list's row counts once.
 * @param a - Side 1, hashed that way.
 * @param two - Side 2's cells.
 * @param o - The way.
 * @returns How many rows.
 */
function rowsMeeting(a: Hashed, two: readonly Entry[], o: MatchOptions): number {
    let n = 0;
    for (const [cell] of two) {
        if (cellValues(cell).some((v) => !isEmpty(v) && a.has(normalize(v, o)))) {
            n++;
        }
    }
    return n;
}

/**
 * The nodes of side 1 some value of side 2 names.
 * @param a - Side 1, hashed one way.
 * @param b - Side 2, hashed that way.
 * @returns How many.
 */
function nodesMeeting(a: Hashed, b: Hashed): number {
    const nodes = new Set<string>();
    for (const k of b.keys()) {
        a.get(k)?.nodes.forEach((id) => nodes.add(id));
    }
    return nodes.size;
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
 * @param o - Whether case and spaces count, and the place side 1 is built before.
 * @returns The counts.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, or `E_AMBIGUOUS_ID` when
 *   `into` names no one end of an edge source.
 */
export function matchCounts(value: SourceSteps, copies: Copies, pair: MatchPair, o: CountOptions = {}): MatchCounts {
    const ways = waysOf(o);
    const { one, two } = sides(upTo(value, o.before), copies, pair);
    const [a, aCase, aSpaces, aBoth] = hash(one, ways);
    const [b, bCase, bSpaces, bBoth] = hash(two, ways);
    const matched = both(a, b);
    const matchedNodes = nodesMeeting(a, b);
    const moreNodes = (one: Hashed | null, other: Hashed | null): number | null =>
        one === null || other === null ? null : nodesMeeting(one, other) - matchedNodes;
    const matchedRows = rowsMeeting(a, two, ways.asked);
    const more = (table: Hashed | null, o: MatchOptions | null): number | null =>
        table === null || o === null ? null : rowsMeeting(table, two, o) - matchedRows;
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
        rows: two.length,
        matchedRows,
        emptyRows: two.filter(([cell]) => cellValues(cell).every((v) => isEmpty(v))).length,
        moreRowsWithIgnoreCase: more(aCase, ways.caseOff),
        moreRowsWithIgnoreSpaces: more(aSpaces, ways.spacesOff),
        moreRowsWithBoth: more(aBoth, ways.bothOff),
        matchedNodes,
        moreNodesWithIgnoreCase: moreNodes(aCase, bCase),
        moreNodesWithIgnoreSpaces: moreNodes(aSpaces, bSpaces),
        moreNodesWithBoth: moreNodes(aBoth, bBoth),
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
    const ways: Ways = { asked, caseOff: null, spacesOff: null, bothOff: null };
    const { one, two } = sides(upTo(value, o.before), copies, pair);
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

/** A suggestion, how likely it is. */
export interface RankedSuggestion {
    readonly suggestion: MatchSuggestion;
    /** The share of the rows' values that meet. */
    readonly share: number;
    /** What it names nodes by: lower is likelier. */
    readonly rank: number;
}

/** The share of a field's values that must meet to call a suggestion confident. */
const CONFIDENT_SHARE = 0.8;

/** The share of a column's cells that must be different values for it to identify its rows. */
const IDENTIFYING_SHARE = 0.8;

/** The values of one column or of a space's keys, as they compare, and how many cells held one. */
interface Values {
    readonly keys: ReadonlySet<string>;
    readonly cells: number;
}

/** A column's values per rows array, so every source's guess reads each column once. */
const columnValues = new WeakMap<readonly Row[], Map<string, Values>>();

/** A space's keys, and its nodes' columns, per build. */
const spaceValues = new WeakMap<BuildResult, Map<string, Values>>();

/**
 * The different values of some cells, each of a list's apart.
 * @param cells - The cells.
 * @returns The values.
 */
function valuesOf(cells: Iterable<Value | undefined>): Values {
    const keys = new Set<string>();
    let filled = 0;
    for (const cell of cells) {
        for (const v of cellValues(cell)) {
            if (!isEmpty(v)) {
                filled++;
                keys.add(normalize(v));
            }
        }
    }
    return { keys, cells: filled };
}

/**
 * A member of a map, made when it is not there.
 * @param map - The map.
 * @param key - The member.
 * @param make - Makes it.
 * @returns The member.
 */
function kept<V>(map: Map<string, V>, key: string, make: () => V): V {
    const held = map.get(key) ?? make();
    map.set(key, held);
    return held;
}

/**
 * The values of one column of a source's rows.
 * @param rows - The rows.
 * @param field - The column.
 * @returns The values.
 */
function ofColumn(rows: readonly Row[], field: string): Values {
    const byField = columnValues.get(rows) ?? new Map<string, Values>();
    columnValues.set(rows, byField);
    return kept(byField, field, () => valuesOf(rows.map((row) => row[field])));
}

/**
 * The keys of a space's nodes, or the values of a column of theirs.
 * @param built - The build.
 * @param space - The space.
 * @param field - The column; absent for the keys.
 * @returns The values.
 */
function ofSpace(built: BuildResult, space: string, field?: string): Values {
    const bySpace = spaceValues.get(built) ?? new Map<string, Values>();
    spaceValues.set(built, bySpace);
    return kept(bySpace, field === undefined ? space : `${space}\u0001${field}`, () => {
        const cells: (Value | undefined)[] = [];
        for (const n of built.nodes.values()) {
            if (n.space === space) {
                cells.push(field === undefined ? n.key : n.values[field]);
            }
        }
        return valuesOf(cells);
    });
}

// Whether a column names its rows: nearly every cell holds another value.
const identifies = (v: Values): boolean => v.keys.size > 1 && v.keys.size >= IDENTIFYING_SHARE * v.cells;

/**
 * The joins a source most likely makes onto the graph, best first: each node column of the source
 * against the keys of each id space other than its own and of each other staged source, and against a
 * column of the same name there when both name their rows; ranked by the share of its values that
 * meet. A column whose values are the space's keys, or that names its rows on both sides, merges; any
 * other connects.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param source - The source.
 * @param columns - The source's node columns.
 * @param spaces - The id spaces with nodes, and the source's own space.
 * @param spaces.all - Every space holding nodes.
 * @param spaces.own - The space the source's rows land in, which it never joins onto.
 * @param spaces.staged - The other sources whose rows a join can name by their keys too: the staged ones.
 * @param spaces.brought - Columns earlier steps brought the nodes of a space, each matched by a column
 *   that names its rows.
 * @param key - The source's key column, if any.
 * @returns The suggestions, best first; none when no value meets.
 */
export function suggestMatches(
    value: SourceSteps,
    copies: Copies,
    source: string,
    columns: readonly string[],
    spaces: {
        readonly all: readonly string[];
        readonly own: string | undefined;
        readonly staged?: readonly string[];
        readonly brought?: readonly { readonly space: string; readonly field: string }[];
    },
    key: string | undefined,
): RankedSuggestion[] {
    const built = buildOf(value, copies);
    const rows = rowsOf(value, copies, source);
    const found: RankedSuggestion[] = [];
    const meet = (field: string, into: JoinInto, other: Values, merges: boolean): void => {
        const { keys } = ofColumn(rows, field);
        let matched = 0;
        for (const k of keys) {
            matched += other.keys.has(k) ? 1 : 0;
        }
        if (matched === 0) {
            return;
        }
        const share = matched / keys.size;
        found.push({
            share,
            // a source that waits comes after what the graph holds, and a column after the keys
            rank: (into.source === undefined ? 0 : 2) + (into.field === undefined ? 0 : 1),
            suggestion: Object.freeze({
                result: merges ? "merge" : "connect",
                matches: Object.freeze([Object.freeze({ from: { source, field }, into })]),
                confident: share >= CONFIDENT_SHARE,
            }),
        });
    };
    const named = (field: string, into: JoinInto, keys: Values, other: () => Values): void => {
        if (!identifies(ofColumn(rows, field))) {
            return;
        }
        const values = other();
        // a column holding the keys is the keys
        const isKey = values.keys.size === keys.keys.size && [...values.keys].every((k) => keys.keys.has(k));
        if (identifies(values) && !isKey) {
            meet(field, { ...into, field }, values, true);
        }
    };
    for (const space of spaces.all.filter((each) => each !== spaces.own)) {
        for (const field of columns) {
            meet(field, { space }, ofSpace(built, space), field === key);
            named(field, { space }, ofSpace(built, space), () => ofSpace(built, space, field));
        }
    }
    for (const id of spaces.staged ?? []) {
        const theirs = rowsOf(value, copies, id);
        const theirKey = sourceOf(value, id).mapping.nodes?.key;
        const columnsThere = new Set(theirs.length === 0 ? [] : Object.keys(theirs[0]));
        for (const field of columns) {
            const keys = ofColumn(theirs, theirKey ?? "");
            meet(field, { source: id }, keys, field === key);
            if (columnsThere.has(field)) {
                named(field, { source: id }, keys, () => ofColumn(theirs, field));
            }
        }
    }
    for (const into of spaces.brought ?? []) {
        for (const field of columns.filter((each) => identifies(ofColumn(rows, each)))) {
            meet(field, into, ofSpace(built, into.space, into.field), true);
        }
    }
    return bestFirst(found);
}

/**
 * Suggestions in order, the likeliest first.
 * @param found - The suggestions.
 * @returns Them.
 */
export function bestFirst(found: readonly RankedSuggestion[]): RankedSuggestion[] {
    return [...found].sort((a, b) => a.rank - b.rank || b.share - a.share);
}
