/**
 * @file The two sides of a join before it is made (design design/data/multiple-data-sources-design.md,
 * section 5.2), behind the `source-steps` experiment: what each side's fields hold, which side a
 * join would read as rows, and the rows of both lined up by a match. Nothing here changes a draft;
 * each column is read once per value. Pure, and free of Babylon.js, Lit and the DOM.
 */

import { GraphtyError } from "../../../errors/GraphtyError";
import { isSourceFactKey } from "../ids";
import { type JoinInto, nodeOne, sourceOf, withoutStepAndAdds } from "./acts";
import {
    cellValues,
    freeName,
    isEmpty,
    isStaged,
    type MatchOptions,
    normalize,
    ownTouches,
    rowNodeSpace,
    tableRows,
} from "./build";
import { matchCounts, upTo } from "./match";
import { type ColumnProfile, columnsOf, numberedKey, profileOf } from "./profile";
import { buildOf, type Copies, copyMap, rowSources, type SourceSteps } from "./project";
import type { BuildResult, BuiltNode, Row, TableName, Value } from "./types";

/** One side of a join: a source, or every node of an id space. */
export type Side =
    { readonly source: string; readonly space?: undefined } | { readonly space: string; readonly source?: undefined };

/** A field of one side; absent, its key. */
export type SideRef =
    | { readonly source: string; readonly space?: undefined; readonly field?: string }
    | { readonly space: string; readonly source?: undefined; readonly field?: string };

/** One match of a join: two fields, or a field whose values become new nodes. */
export interface JoinMatch {
    readonly a: SideRef;
    readonly b: SideRef | { readonly new: true };
}

/** One field of a side. */
export interface SideField extends ColumnProfile {
    readonly name: string;
    /** The source a merge brought it from; null for the side's own. */
    readonly from: string | null;
    /** Whether it is the side's key. */
    readonly key: boolean;
}

/** One cell as the rows of a side hold it. */
type Record_ = Readonly<Record<string, Value>>;

/** One field's values: the rows holding each, and the nodes those rows are. */
interface FieldIndex {
    readonly rows: ReadonlyMap<string, readonly number[]>;
    /** Whether two rows hold one value. */
    readonly rowsRepeat: boolean;
    /** Whether one value reaches two nodes. */
    readonly nodesRepeat: boolean;
}

/** A side as read: its rows (a source's) or its nodes (a space's). */
export interface SideData {
    readonly side: Side;
    /** The source's id; undefined for a space. */
    readonly source: string | undefined;
    /** The table a source's rows are read from. */
    readonly table: TableName;
    /** The space the rows' own nodes are in, or the space itself. */
    readonly space: string;
    readonly staged: boolean;
    /** Whether the build holds nodes that are its rows. */
    readonly ownNodes: boolean;
    readonly length: number;
    /** Its own columns, in the order first read. */
    readonly own: readonly string[];
    /** The columns earlier steps brought its nodes, and the source each came from. */
    readonly joined: ReadonlyMap<string, string>;
    /** Its key column's name, or null for none. */
    readonly key: string | null;
    /** The place of its source in the order loaded; a space is before every source. */
    readonly order: number;
    cell(row: number, field: string): Value | undefined;
    record(row: number): Record_;
    /** The node a row is, by internal id once built, else by its key. */
    nodeOf(row: number): string;
    /** The built node a row is. */
    built(row: number): BuiltNode | undefined;
}

/** A field, found on its side. */
export interface FoundField {
    readonly data: SideData;
    readonly name: string;
    /** Whether an earlier step brought it, so only the built nodes hold it. */
    readonly joined: boolean;
    readonly isKey: boolean;
}

/** What is kept per value, so each column is read once. */
interface Kept {
    readonly copies: Copies;
    readonly sides: Map<string, SideData>;
    readonly fields: Map<string, readonly SideField[]>;
    readonly indexes: Map<string, FieldIndex>;
    readonly counts: Map<string, ReturnType<typeof matchCounts>>;
    readonly lines: Map<string, Lines>;
}

const kept = new WeakMap<SourceSteps, Kept>();
const bases = new WeakMap<SourceSteps, Map<number, SourceSteps>>();

/**
 * What is kept for a value.
 * @param value - The value.
 * @param copies - The rows as read.
 * @returns It, empty the first time.
 */
function keptOf(value: SourceSteps, copies: Copies): Kept {
    let held = kept.get(value);
    if (held?.copies !== copies) {
        held = {
            copies,
            sides: new Map(),
            fields: new Map(),
            indexes: new Map(),
            counts: new Map(),
            lines: new Map(),
        };
        kept.set(value, held);
    }
    return held;
}

/**
 * A member of a map, made when it is not there.
 * @param map - The map.
 * @param key - The member.
 * @param make - Makes it.
 * @returns The member.
 */
function once<V>(map: Map<string, V>, key: string, make: () => V): V {
    const held = map.get(key);
    if (held !== undefined) {
        return held;
    }
    const made = make();
    map.set(key, made);
    return made;
}

/**
 * The value a join step was made on: the steps before it, without the adds its act made for itself.
 * @param value - The value.
 * @param before - The step's place; absent, the whole value.
 * @returns The value, the same one for the same place.
 */
export function baseOf(value: SourceSteps, before: number | undefined): SourceSteps {
    const step = before === undefined ? undefined : value.steps[before];
    if (before === undefined || step === undefined || step.op === "join.add") {
        return upTo(value, before);
    }
    let held = bases.get(value);
    if (held === undefined) {
        held = new Map();
        bases.set(value, held);
    }
    let out = held.get(before);
    if (out === undefined) {
        const without = withoutStepAndAdds(upTo(value, before + 1), before);
        out = without.steps.length === before ? upTo(value, before) : without;
        held.set(before, out);
    }
    return out;
}

const sideKey = (side: Side): string => JSON.stringify([side.source ?? null, side.space ?? null]);

/**
 * A refusal of a field its side does not hold.
 * @param side - The side.
 * @param field - The field.
 * @returns The error.
 */
function noField(side: Side, field: string | undefined): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `${side.source ?? side.space} holds no field ${JSON.stringify(field ?? "")}.`,
        source: "data",
        details: {
            reason: field === undefined ? "no-field" : "no-column",
            ...(side.source === undefined ? { space: side.space } : { source: side.source }),
            ...(field === undefined ? {} : { column: field }),
        },
    });
}

/**
 * A side as read.
 * @param value - The value (see {@link baseOf}).
 * @param copies - The rows as read.
 * @param side - The side.
 * @returns It.
 */
export function sideOf(value: SourceSteps, copies: Copies, side: Side): SideData {
    return once(keptOf(value, copies).sides, sideKey(side), () =>
        side.source === undefined ? spaceSide(value, copies, side.space) : sourceSide(value, copies, side.source),
    );
}

/**
 * The column every source whose rows are nodes of a space keys them by.
 * @param value - The value.
 * @param sources - The sources.
 * @returns It, or null when they name several, or none.
 */
function sharedKey(value: SourceSteps, sources: readonly string[]): string | null {
    const keys = new Set(
        sources.map((id) => {
            const src = sourceOf(value, id);
            return numberedKey(src) === undefined ? (src.mapping.nodes?.key ?? null) : null;
        }),
    );
    const [key = null] = keys;
    return keys.size === 1 ? key : null;
}

/**
 * The columns some nodes carry, with the source that brought each.
 * @param nodes - The nodes.
 * @returns The columns.
 */
function carried(nodes: Iterable<BuiltNode>): Map<string, string> {
    const out = new Map<string, string>();
    for (const n of nodes) {
        for (const [name, v] of Object.entries(n.values)) {
            // a source's own value of a clash is no column of its own
            if (!out.has(name) && !isEmpty(v) && !isSourceFactKey(name) && n.clashColumns?.[name] === undefined) {
                out.set(name, n.origin[name] ?? Object.keys(n.own[name] ?? {})[0] ?? n.loads[0] ?? "");
            }
        }
    }
    return out;
}

/**
 * The columns of rows no step reads were kept per rows array, so a side does not read every cell again.
 */
const ownColumns = new WeakMap<readonly Row[], Map<string, readonly string[]>>();

/**
 * A source as a side: its rows as read, with the columns earlier steps brought the nodes they are.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The source.
 * @returns The side.
 */
function sourceSide(value: SourceSteps, copies: Copies, id: string): SideData {
    const src = sourceOf(value, id);
    const table: TableName = src.mapping.nodes === undefined ? "edges" : "nodes";
    const rows = tableRows(src, copyMap(copies), table) ?? [];
    const staged = isStaged(value, id);
    const space = rowNodeSpace(src, table);
    const numbered = numberedKey(src);
    const byNumber = ownColumns.get(rows) ?? new Map<string, readonly string[]>();
    ownColumns.set(rows, byNumber);
    const own = once(byNumber, numbered ?? "", () => columnsOf(rows, numbered));
    const keyColumn = table === "nodes" ? src.mapping.nodes?.key : undefined;
    const nodes = new Map<number, BuiltNode>();
    if (!staged) {
        for (const n of buildOf(value, copies).nodes.values()) {
            if (n.space !== space) {
                continue;
            }
            for (const t of table === "nodes" ? ownTouches(n, id) : rowTouches(value, n, id)) {
                nodes.set(t.row, n);
            }
        }
    }
    const held = new Set(own);
    const joined = new Map([...carried(new Set(nodes.values()))].filter(([name]) => !held.has(name)));
    const cell = (row: number, field: string): Value | undefined =>
        joined.has(field) ? nodes.get(row)?.values[field] : rows[row][field];
    return {
        side: Object.freeze({ source: id }),
        source: id,
        table,
        space,
        staged,
        ownNodes: nodes.size > 0,
        length: rows.length,
        own,
        joined,
        key: numbered === undefined ? (keyColumn ?? null) : null,
        order: Object.keys(value.sources).indexOf(id),
        cell,
        record: (row) =>
            Object.freeze(
                Object.fromEntries([...own, ...joined.keys()].map((name) => [name, cell(row, name) ?? null])),
            ),
        nodeOf: (row) => {
            const key = keyColumn === undefined ? undefined : rows[row][keyColumn];
            return nodes.get(row)?.id ?? (isEmpty(key) ? `#${String(row)}` : String(key));
        },
        built: (row) => nodes.get(row),
    };
}

/**
 * The edge rows of a source a node is: only a step that makes each of them a node gives it any.
 * @param value - The value.
 * @param n - The node.
 * @param id - The source.
 * @returns What touched it.
 */
function rowTouches(value: SourceSteps, n: BuiltNode, id: string): BuiltNode["touch"] {
    const makes = value.steps.flatMap((s, i) =>
        s.op === "join.edges" && s.source === id && s.rowNode !== undefined && s.off !== true ? [i] : [],
    );
    return makes.length === 0
        ? []
        : n.touch.filter((t) => t.source === id && t.table === "edges" && makes.includes(t.step) && t.valued !== true);
}

/**
 * An id space as a side: its nodes, keyed by their key.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param space - The space.
 * @returns The side.
 */
function spaceSide(value: SourceSteps, copies: Copies, space: string): SideData {
    const nodes = [...buildOf(value, copies).nodes.values()].filter((n) => n.space === space);
    const columns = carried(nodes);
    const makers = rowSources(value, false).get(space) ?? [];
    const shared = sharedKey(value, makers);
    const key = shared ?? freeName("key", new Set(columns.keys()));
    const own = [key, ...[...columns.keys()].filter((name) => name !== key)];
    const cell = (row: number, field: string): Value | undefined =>
        field === key ? nodes[row].key : nodes[row].values[field];
    return {
        side: Object.freeze({ space }),
        source: undefined,
        table: "nodes",
        space,
        staged: false,
        ownNodes: nodes.length > 0,
        length: nodes.length,
        own,
        joined: new Map([...columns].filter(([name]) => name !== key)),
        key,
        order: -1,
        cell,
        record: (row) => Object.freeze(Object.fromEntries(own.map((name) => [name, cell(row, name) ?? null]))),
        nodeOf: (row) => nodes[row].id,
        built: (row) => nodes[row],
    };
}

/**
 * The facts of each field of a side.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param side - The side.
 * @param before - The place of the step to read it before.
 * @returns The fields: its own in the order first read, then the ones earlier steps brought.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source.
 */
export function sideFields(
    value: SourceSteps,
    copies: Copies,
    side: Side,
    before: number | undefined,
): readonly SideField[] {
    const base = baseOf(value, before);
    return once(keptOf(base, copies).fields, sideKey(side), () => {
        const data = sideOf(base, copies, side);
        const names = data.source === undefined ? data.own : [...data.own, ...data.joined.keys()];
        return Object.freeze(
            names.map((name) =>
                Object.freeze({
                    name,
                    from: data.joined.get(name) ?? null,
                    key: name === data.key,
                    ...profileOf(profiled(data, name)),
                }),
            ),
        );
    });
}

/**
 * The cells of a field, each value of a list once per row.
 * @param data - The side.
 * @param field - The field.
 * @yields The cells.
 */
function* profiled(data: SideData, field: string): Generator<Parameters<typeof normalize>[0]> {
    for (let i = 0; i < data.length; i++) {
        const v = data.cell(i, field);
        if (Array.isArray(v)) {
            yield* new Set(cellValues(v));
        } else {
            yield cellValues(v)[0];
        }
    }
}

/**
 * A field found on its side.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param ref - The field; absent, the side's key.
 * @returns It.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `no-column`, or `no-field` for the key of a
 *   side with none), or `E_LOAD_UNKNOWN`.
 */
export function fieldOf(value: SourceSteps, copies: Copies, ref: SideRef): FoundField {
    const side: Side = ref.source === undefined ? { space: ref.space } : { source: ref.source };
    const data = sideOf(value, copies, side);
    const name = ref.field ?? data.key;
    if (name === null) {
        throw noField(side, undefined);
    }
    const ownField = data.own.includes(name);
    if (!ownField && !data.joined.has(name)) {
        throw noField(side, name);
    }
    const isKey = name === data.key;
    return { data, name, joined: !isKey && data.joined.has(name), isKey };
}

/**
 * A field as a match names it.
 * @param found - The field.
 * @returns The reference.
 */
export function refOfField(found: FoundField): SideRef {
    return Object.freeze({ ...found.data.side, field: found.name });
}

/**
 * The values of a field, hashed.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param found - The field.
 * @param o - How values compare.
 * @returns The index.
 */
export function indexOf(value: SourceSteps, copies: Copies, found: FoundField, o: MatchOptions): FieldIndex {
    const { data, name } = found;
    const at = JSON.stringify([sideKey(data.side), name, o.ignoreCase === true, o.ignoreSpaces === true]);
    return once(keptOf(value, copies).indexes, at, () => {
        const rows = new Map<string, number[]>();
        let rowsRepeat = false;
        let nodesRepeat = false;
        for (let i = 0; i < data.length; i++) {
            const mine = new Set<string>();
            for (const v of cellValues(data.cell(i, name))) {
                if (!isEmpty(v)) {
                    mine.add(normalize(v, o));
                }
            }
            for (const k of mine) {
                const held = rows.get(k);
                if (held === undefined) {
                    rows.set(k, [i]);
                } else {
                    rowsRepeat = true;
                    nodesRepeat ||= data.nodeOf(held[0]) !== data.nodeOf(i);
                    held.push(i);
                }
            }
        }
        return { rows, rowsRepeat, nodesRepeat };
    });
}

/**
 * Whether a value two fields match by is on two rows, or reaches two nodes, of one of them: a value
 * the other side lacks says nothing of the match.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param found - The field.
 * @param other - The field it is matched with.
 * @param o - How values compare.
 * @returns For its rows, and for the nodes they are.
 */
export function repeatsIn(
    value: SourceSteps,
    copies: Copies,
    found: FoundField,
    other: FoundField,
    o: MatchOptions,
): { readonly rows: boolean; readonly nodes: boolean } {
    const mine = indexOf(value, copies, found, o);
    if (!mine.rowsRepeat) {
        return { rows: false, nodes: false };
    }
    const theirs = indexOf(value, copies, other, o).rows;
    let rows = false;
    for (const [k, held] of mine.rows) {
        if (held.length > 1 && theirs.has(k)) {
            rows = true;
            if (new Set(held.map((row) => found.data.nodeOf(row))).size > 1) {
                return { rows, nodes: true };
            }
        }
    }
    return { rows, nodes: false };
}

/**
 * A field as the node 1 side of a join act.
 * @param found - The field.
 * @returns The side, as `merge`, `connect` and `link` take it.
 */
export function intoOf(found: FoundField): JoinInto {
    const { data, name, joined, isKey } = found;
    if (joined || data.source === undefined) {
        return isKey ? { space: data.space } : { space: data.space, field: name };
    }
    return isKey ? { source: data.source } : { source: data.source, field: name };
}

/**
 * Whether a join can name nodes by a field: any column of nodes, and of a source with node rows or
 * the end of an edge source the field is.
 * @param value - The value.
 * @param found - The field.
 * @returns True when it can.
 */
export function canBeInto(value: SourceSteps, found: FoundField): boolean {
    try {
        nodeOne(value, intoOf(found));
        return true;
    } catch {
        return false;
    }
}

/**
 * Whether a join can read a field's side as its rows: a source's own column, as a column an earlier
 * step brought is in no row.
 * @param found - The field.
 * @returns True when it can.
 */
export function canBeRows(found: FoundField): boolean {
    return found.data.source !== undefined && !found.joined && found.data.length > 0;
}

/**
 * Which side of a match a join reads as rows: the one that can be, then the one whose matched values
 * repeat, then the one with no nodes of its own, then the one loaded later. The values are compared as
 * written, so turning Ignore case or spaces on never swaps the side.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param match - The two fields.
 * @param match.a - One.
 * @param match.b - The other.
 * @returns The side, or null when neither can be.
 */
export function rowsSide(
    value: SourceSteps,
    copies: Copies,
    match: { readonly a: FoundField; readonly b: FoundField },
): "a" | "b" | null {
    const { a, b } = match;
    const aRows = canBeRows(a) && canBeInto(value, b);
    const bRows = canBeRows(b) && canBeInto(value, a);
    if (!aRows || !bRows) {
        if (aRows) {
            return "a";
        }
        return bRows ? "b" : null;
    }
    const exact = {};
    const repeats = repeatsIn(value, copies, a, b, exact).rows;
    if (repeats !== repeatsIn(value, copies, b, a, exact).rows) {
        return repeats ? "a" : "b";
    }
    if (a.data.ownNodes !== b.data.ownNodes) {
        return a.data.ownNodes ? "b" : "a";
    }
    return a.data.order > b.data.order ? "a" : "b";
}

/**
 * The counts of a match read one way.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param rows - The field of the rows.
 * @param into - The field naming nodes.
 * @param o - How values compare.
 * @returns The counts, as `matchCounts` gives them.
 */
export function countsOf(
    value: SourceSteps,
    copies: Copies,
    rows: FoundField,
    into: FoundField,
    o: MatchOptions,
): ReturnType<typeof matchCounts> {
    const pair = { from: { source: rows.data.source ?? "", field: rows.name }, into: intoOf(into) };
    const at = JSON.stringify([pair, o.ignoreCase === true, o.ignoreSpaces === true]);
    return once(keptOf(value, copies).counts, at, () => Object.freeze(matchCounts(value, copies, pair, o)));
}

// ---------------------------------------------------------------- the rows of both sides, lined up

/** The lines of a match: the row of each side, -1 for none, and which side repeats its last row. */
interface Lines {
    readonly a: Int32Array;
    readonly b: Int32Array;
    /** 1 when side a repeats its row, 2 when side b does. */
    readonly repeat: Uint8Array;
    readonly matched: number;
    readonly onlyA: number;
}

/**
 * The lines of a match: each matched value in side a's order, as many lines as the side holding it
 * more often, then the rows only side a holds, then only side b's.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param a - Side a's field.
 * @param b - Side b's.
 * @param o - How values compare.
 * @returns The lines.
 */
function linesOf(value: SourceSteps, copies: Copies, a: FoundField, b: FoundField, o: MatchOptions): Lines {
    const at = JSON.stringify([refOfField(a), refOfField(b), o.ignoreCase === true, o.ignoreSpaces === true]);
    return once(keptOf(value, copies).lines, at, () => {
        const ofA = indexOf(value, copies, a, o).rows;
        const ofB = indexOf(value, copies, b, o).rows;
        const outA: number[] = [];
        const outB: number[] = [];
        const repeat: number[] = [];
        const metA = new Uint8Array(a.data.length);
        const metB = new Uint8Array(b.data.length);
        for (const [k, rowsA] of ofA) {
            const rowsB = ofB.get(k);
            if (rowsB === undefined) {
                continue;
            }
            const lines = Math.max(rowsA.length, rowsB.length);
            for (let i = 0; i < lines; i++) {
                const x = rowsA[Math.min(i, rowsA.length - 1)];
                const y = rowsB[Math.min(i, rowsB.length - 1)];
                metA[x] = 1;
                metB[y] = 1;
                outA.push(x);
                outB.push(y);
                repeat.push(repeated(i, rowsA.length, rowsB.length));
            }
        }
        const matched = outA.length;
        for (let i = 0; i < metA.length; i++) {
            if (metA[i] === 0) {
                outA.push(i);
                outB.push(-1);
            }
        }
        const onlyA = outA.length - matched;
        for (let i = 0; i < metB.length; i++) {
            if (metB[i] === 0) {
                outA.push(-1);
                outB.push(i);
            }
        }
        return {
            a: Int32Array.from(outA),
            b: Int32Array.from(outB),
            repeat: Uint8Array.from(repeat),
            matched,
            onlyA,
        };
    });
}

/**
 * Which side a line repeats the last row of.
 * @param line - The line's place in its value.
 * @param a - How many rows side a holds.
 * @param b - How many side b holds.
 * @returns 1 for side a, 2 for side b, 0 for neither.
 */
function repeated(line: number, a: number, b: number): number {
    if (line >= a) {
        return 1;
    }
    return line >= b ? 2 : 0;
}

/** Which rows {@link joinRows} lists, and how they line up. */
export interface JoinRowsOptions extends MatchOptions {
    readonly a: Side;
    readonly b?: Side;
    readonly match?: JoinMatch;
    readonly before?: number;
    readonly only?: "matched" | "a" | "b";
    readonly offset?: number;
    readonly limit?: number;
}

/** One line: each side's row, null where it has none. */
interface JoinRow {
    readonly a: Record_ | null;
    readonly b: Record_ | null;
    readonly repeat?: "a" | "b";
}

/** A page of lines. */
export interface JoinRows {
    readonly total: number;
    readonly rows: readonly JoinRow[];
    readonly rowsOf: "a" | "b" | null;
    readonly counts: ReturnType<typeof matchCounts> | null;
}

/**
 * The rows of two sides, lined up by a match, or in the order each is read.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param o - The sides, the match and the page.
 * @returns The page, how many lines there are, and the match's counts.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, or `E_BAD_COMMAND` (reason
 *   `no-column`) for a match naming a field its side does not hold, or (reason `new`) new nodes.
 */
export function joinRows(value: SourceSteps, copies: Copies, o: JoinRowsOptions): JoinRows {
    const base = baseOf(value, o.before);
    const a = sideOf(base, copies, o.a);
    const b = o.b === undefined ? null : sideOf(base, copies, o.b);
    const from = Math.max(0, o.offset ?? 0);
    const line = (x: number, y: number, repeat: number): JoinRow =>
        Object.freeze({
            a: x < 0 || x >= a.length ? null : a.record(x),
            b: b === null || y < 0 || y >= b.length ? null : b.record(y),
            ...(repeat === 0 ? {} : { repeat: repeat === 1 ? ("a" as const) : ("b" as const) }),
        });
    const page = (total: number, at: (i: number) => JoinRow): readonly JoinRow[] => {
        const end = Math.min(total, from + Math.max(0, o.limit ?? total));
        return Object.freeze(Array.from({ length: Math.max(0, end - from) }, (_, i) => at(from + i)));
    };
    if (o.match === undefined || b === null) {
        const total = Math.max(a.length, b?.length ?? 0);
        return { total, rows: page(total, (i) => line(i, i, 0)), rowsOf: null, counts: null };
    }
    const found = foundMatch(base, copies, o.match);
    if (found.b === null) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "New nodes have no rows to line up.",
            source: "data",
            details: { reason: "new" },
        });
    }
    const lines = linesOf(base, copies, found.a, found.b, o);
    const onlyB = lines.a.length - lines.matched - lines.onlyA;
    const [start, total] = {
        all: [0, lines.a.length],
        matched: [0, lines.matched],
        a: [lines.matched, lines.onlyA],
        b: [lines.matched + lines.onlyA, onlyB],
    }[o.only ?? "all"];
    const rowsOf = rowsSide(base, copies, { a: found.a, b: found.b });
    return {
        total,
        rows: page(total, (i) => line(lines.a[start + i], lines.b[start + i], lines.repeat[start + i] ?? 0)),
        rowsOf,
        counts:
            rowsOf === null
                ? null
                : countsOf(base, copies, rowsOf === "a" ? found.a : found.b, rowsOf === "a" ? found.b : found.a, o),
    };
}

/**
 * A match's two fields, found.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param match - The match.
 * @returns The fields; `b` null for new nodes.
 */
export function foundMatch(
    value: SourceSteps,
    copies: Copies,
    match: JoinMatch,
): { readonly a: FoundField; readonly b: FoundField | null } {
    return {
        a: fieldOf(value, copies, match.a),
        b: "new" in match.b ? null : fieldOf(value, copies, match.b),
    };
}

/**
 * The built nodes each value of a field names.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param found - The field.
 * @param o - How values compare.
 * @returns The nodes a cell of the other side names, by internal id.
 */
export function nodesNamed(
    value: SourceSteps,
    copies: Copies,
    found: FoundField,
    o: MatchOptions,
): (cell: Value | undefined) => readonly string[] {
    const index = indexOf(value, copies, found, o).rows;
    return (cell) =>
        cellValues(cell).flatMap((v) =>
            isEmpty(v) ? [] : (index.get(normalize(v, o)) ?? []).flatMap((row) => found.data.built(row)?.id ?? []),
        );
}

/** How many edges join each pair of nodes, either way round, per build. */
const pairs = new WeakMap<BuildResult, ReadonlyMap<string, number>>();

/**
 * How many edges of a build join each pair of nodes, either way round.
 * @param value - The value.
 * @param copies - The rows as read.
 * @returns The counts, by the pair's ids in order.
 */
export function edgePairs(value: SourceSteps, copies: Copies): ReadonlyMap<string, number> {
    const result = buildOf(value, copies);
    const held = pairs.get(result);
    if (held !== undefined) {
        return held;
    }
    const out = new Map<string, number>();
    for (const e of result.edges.values()) {
        const at = pairKey(e.from, e.to);
        out.set(at, (out.get(at) ?? 0) + 1);
    }
    pairs.set(result, out);
    return out;
}

/**
 * A pair of nodes, whichever way round.
 * @param a - One.
 * @param b - The other.
 * @returns The pair.
 */
export function pairKey(a: string, b: string): string {
    return a < b ? `${a}\u0002${b}` : `${b}\u0002${a}`;
}

/**
 * What the nodes of one side can be named by.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param side - The side.
 * @param by - The source whose rows name them: a column it brought itself says nothing.
 * @returns It, as `suggestMatches` takes it.
 */
export function joinableOf(
    value: SourceSteps,
    copies: Copies,
    side: Side,
    by: string,
): {
    readonly all: readonly string[];
    readonly own: undefined;
    readonly staged: readonly string[];
    readonly brought: readonly { readonly space: string; readonly field: string }[];
} {
    const data = sideOf(value, copies, side);
    const ofNodes = data.source !== undefined && value.sources[data.source].mapping.nodes !== undefined;
    return {
        all: data.source === undefined ? [data.space] : [],
        own: undefined,
        staged: data.source !== undefined && ofNodes ? [data.source] : [],
        brought: [...data.joined].flatMap(([field, from]) => (from === by ? [] : [{ space: data.space, field }])),
    };
}
