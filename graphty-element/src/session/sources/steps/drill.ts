/**
 * @file A draft preview's drill-down, exclusion and batch picks (design
 * design/data/multiple-data-sources-design.md, sections 3.10 and 5.4), behind the `source-steps`
 * experiment: the rows, elements and cells behind each count of a step, the step's excluded keys,
 * and picks over many conflicting cells at once. Pure, and free of Babylon.js, Lit and the DOM.
 */

import type { GraphtyErrorCode } from "../../../errors/codes";
import { GraphtyError } from "../../../errors/GraphtyError";
import { isSourceFactKey } from "../ids";
import { isEmpty, normalize, tableRows } from "./build";
import type { DraftState } from "./draft";
import { numberedKey } from "./profile";
import { buildOf, copyMap, mintEditId, type SourceSteps, type StepsEdit } from "./project";
import { type Conflict, conflicts, pickEdit } from "./provenance";
import type {
    BuildResult,
    BuiltEdge,
    BuiltNode,
    CellValue,
    DrillUnit,
    ElementRef,
    NodeRef,
    ReaderOp,
    Row,
    RowFilter,
    Source,
    Step,
    TableName,
    Value,
} from "./types";

/** The counts of a step the drill-down lists, each named as its step's counts name it. */
const DRILL_COUNTS = [
    "newNodes",
    "newEdges",
    "mergedEdges",
    "matched",
    "unmatched",
    "fanOut",
    "rowsDiffer",
    "merged",
    "typeDiffers",
    "untouched",
    "keptNew",
    "selfLoops",
    "pairsBelowMin",
    "emptyKey",
    "repeatedKept",
    "parallelPairs",
    "namedOnly",
    "repeated1",
    "repeated2",
    "valuesDiffer",
    "ruleType",
    "rowsDifferIn",
    "endsMeet",
    "endsMissing",
    "newNodeTypes",
    "newEdgeTypes",
    "hub",
] as const;

/** One count of a step. */
type DrillCount = (typeof DRILL_COUNTS)[number];

/** The outcome each count is reported under, for the counts a preview reports. */
const CODES: Partial<Record<DrillCount, DrillCode>> = {
    fanOut: "W_FAN_OUT",
    unmatched: "W_UNMATCHED",
    untouched: "W_UNTOUCHED",
    parallelPairs: "W_PARALLEL_EDGES",
    selfLoops: "W_SELF_LOOPS",
    rowsDiffer: "W_ROWS_DIFFER",
    rowsDifferIn: "W_ROWS_DIFFER",
    namedOnly: "W_NODE_NAMED_ONLY",
    endsMissing: "W_EDGE_END_MISSING",
    valuesDiffer: "W_VALUES_DIFFER",
    emptyKey: "W_KEY_EMPTY",
};

/** A code a drill-down row carries. */
type DrillCode =
    | "W_FAN_OUT"
    | "W_UNMATCHED"
    | "W_UNTOUCHED"
    | "W_PARALLEL_EDGES"
    | "W_SELF_LOOPS"
    | "W_ROWS_DIFFER"
    | "W_NODE_NAMED_ONLY"
    | "W_EDGE_END_MISSING"
    | "W_VALUES_DIFFER"
    | "W_KEY_EMPTY";

/** Which of a step's counted things to list. */
export interface DrillQuery {
    readonly step: number;
    readonly bucket: DrillCount;
    /** For a count kept by name: only this column, space or type. */
    readonly name?: string;
    readonly offset?: number;
    readonly limit?: number;
}

/** One thing a count counted, as the Preview tab lists it. */
export interface DrillRow {
    readonly source: string;
    readonly table: TableName | null;
    readonly row: number | null;
    readonly key: CellValue | null;
    readonly name: string | null;
    readonly element: ElementRef | null;
    /** For an edge, or a pair of nodes: its two ends. */
    readonly ends: { readonly source: NodeRef; readonly target: NodeRef } | null;
    readonly held: Readonly<Record<string, Value>> | null;
    readonly incoming: Row | null;
    readonly shown: Readonly<Record<string, Value>> | null;
    readonly effect: "added" | "changed" | "removed" | "unchanged" | "left-out";
    readonly codes: readonly DrillCode[];
}

/** Which conflicting cells to list. */
export interface CellQuery {
    readonly step?: number;
    readonly column: string;
    readonly only?: "all" | "open" | "decided";
    readonly offset?: number;
    readonly limit?: number;
}

/** One conflicting cell, and whether a reader decision shows its value. */
export interface DrillCell extends Conflict {
    readonly decided: boolean;
}

/** A built node or edge. */
type Built = BuiltNode | BuiltEdge;

/**
 * A refusal.
 * @param message - For developers.
 * @param details - Its parameters, `reason` first.
 * @returns `E_BAD_COMMAND`.
 */
function badCommand(message: string, details: Record<string, unknown>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", details });
}

/**
 * A reference's identity, whatever order its members were written in.
 * @param ref - The reference.
 * @returns Its key.
 */
function refKey(ref: ElementRef): string {
    return "space" in ref ? `n\u0001${ref.space}\u0001${ref.key}` : `e\u0001${ref.load}\u0001${ref.key}`;
}

/**
 * The column a step's excluded keys are read from: the column its `except` already reads, else the
 * column it matches its rows by (a merge's or values step's key, an edge step's edge id or source end).
 * @param step - The step.
 * @param src - The source whose rows it reads.
 * @returns The column, or null for a `join.add`, which leaves no row out.
 */
function exceptColumn(step: Step, src: Source | undefined): string | null {
    if (step.except !== undefined) {
        return step.except.column;
    }
    switch (step.op) {
        case "join.add":
            return null;
        case "join.merge":
        case "join.node-values":
            return step.read.key;
        case "join.edge-values":
            return step.read.edgeId;
        default:
            // A step that links nodes by the values they carry leaves a node or an edge out by its key; one that
            // links by rows, a row by the node it is or names: the values are what its rows share.
            if (step.link?.of === "nodes") {
                return "key";
            }
            if (step.link !== undefined) {
                const own = step.read.table === "nodes" ? src?.mapping.nodes?.key : undefined;
                return step.read.source ?? own ?? step.link.columns[0] ?? null;
            }
            return step.read.edgeId ?? step.read.source ?? step.read.target ?? null;
    }
}

/**
 * The element an internal id names now, through merge, move and reduction aliases.
 * @param result - The build.
 * @param id - The id it was counted under.
 * @returns The element, or null when the build holds none.
 */
function resolved(result: BuildResult, id: string): Built | null {
    return (
        result.nodes.get(id) ??
        result.nodes.get(result.aliases.get(id) ?? "") ??
        result.edges.get(id) ??
        result.edges.get(result.edgeAliases.get(id) ?? "") ??
        null
    );
}

const refOf = (el: Built): ElementRef =>
    "space" in el ? { space: el.space, key: el.key } : { load: el.load, key: el.key };

/**
 * The page of a list.
 * @param all - The list.
 * @param offset - How many to skip.
 * @param limit - How many at most; absent, the rest.
 * @returns The page.
 */
function page<T>(all: readonly T[], offset: number | undefined, limit: number | undefined): T[] {
    const from = Math.max(0, offset ?? 0);
    return all.slice(from, from + Math.max(0, limit ?? all.length));
}

/**
 * The things one count of one step counted in a build.
 * @param value - The value built.
 * @param result - Its build.
 * @param query - The step, the count and the name.
 * @returns The units, in the order counted.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for no step at `step` (reason `no-step`) or an
 *   unknown count (reason `bucket`).
 */
function unitsOf(value: SourceSteps, result: BuildResult, query: DrillQuery): readonly DrillUnit[] {
    if ((value.steps[query.step] as Step | undefined) === undefined) {
        throw badCommand(`No step at ${String(query.step)}.`, { reason: "no-step", index: query.step });
    }
    if (!(DRILL_COUNTS as readonly string[]).includes(query.bucket)) {
        throw badCommand(`No count ${query.bucket}.`, { reason: "bucket", bucket: query.bucket });
    }
    const all = result.drill.get(query.step)?.get(query.bucket) ?? [];
    return query.name === undefined ? all : all.filter((u) => u.name === query.name);
}

/**
 * What a commit does to one element.
 * @param now - It in the draft's build.
 * @param was - It in the committed build.
 * @returns The effect.
 */
function effectOf(now: Built | null, was: Built | null): DrillRow["effect"] {
    if (now === null) {
        return was === null ? "left-out" : "removed";
    }
    if (was === null) {
        return "added";
    }
    return JSON.stringify(now.values) === JSON.stringify(was.values) ? "unchanged" : "changed";
}

/**
 * A record's columns: without the facts the session keeps beside them (`_source.loads` and the rest)
 * and the key its source's rows were numbered by, which are no column of theirs.
 * @param record - The record.
 * @param numbered - That key, if the rows were numbered.
 * @returns The columns.
 */
function ownColumns<T>(record: Readonly<Record<string, T>>, numbered?: string): Readonly<Record<string, T>> {
    return Object.fromEntries(Object.entries(record).filter(([name]) => !isSourceFactKey(name) && name !== numbered));
}

/**
 * The two ends of an edge, or of a pair of nodes.
 * @param result - The build.
 * @param el - The element listed.
 * @param pair - The nodes' internal ids, for a pair.
 * @returns The ends, or null for neither.
 */
function endsOf(result: BuildResult, el: Built | null, pair: DrillUnit["pair"]): DrillRow["ends"] {
    const [from, to] = pair ?? (el !== null && "from" in el ? [el.from, el.to] : []);
    const a = from === undefined ? null : resolved(result, from);
    const b = to === undefined ? null : resolved(result, to);
    return a !== null && b !== null && "space" in a && "space" in b
        ? { source: { space: a.space, key: a.key }, target: { space: b.space, key: b.key } }
        : null;
}

/**
 * A row as read.
 * @param src - Its source.
 * @param copies - The rows as read.
 * @param table - Its table.
 * @param row - Its place; absent for no row.
 * @returns The row, or null when there is none.
 */
function rowOf(
    src: SourceSteps["sources"][string] | undefined,
    copies: ReturnType<typeof copyMap>,
    table: TableName,
    row: number | undefined,
): Row | null {
    return src === undefined || row === undefined ? null : (tableRows(src, copies, table)?.[row] ?? null);
}

/**
 * The rows behind one count of one step of a draft: each with its key, the element it reached in
 * the draft, that element's values in the committed build and in the draft, the row as read, its
 * effect and the outcome it is reported under (5.4).
 * @param base - The committed value and copies.
 * @param state - The draft.
 * @param query - The step, the count, the name and the page.
 * @returns How many the count counted, and the page.
 */
export function drillRows(
    base: Omit<DraftState, "owned">,
    state: DraftState,
    query: DrillQuery,
): { total: number; rows: DrillRow[] } {
    const b0 = buildOf(base.value, base.copies);
    const b1 = buildOf(state.value, state.copies);
    const units = unitsOf(state.value, b1, query);
    const step = state.value.steps[query.step];
    const column = exceptColumn(step, state.value.sources[step.source]);
    const copies = copyMap(state.copies);
    const codes = CODES[query.bucket] === undefined ? [] : [CODES[query.bucket] as DrillCode];
    // an edge to one value of a cell holding several is listed by that value
    const byValue = query.bucket === "newEdges" && step.op === "join.edges" && step.extract !== undefined;
    const rows = page(units, query.offset, query.limit).map((u): DrillRow => {
        const now = u.element === undefined ? null : resolved(b1, u.element);
        // a count of elements, not rows, lists each by the source that brought it
        const source = u.source ?? (u.row === undefined ? now?.loads[0] : undefined) ?? step.source;
        // A merged row is marked with node 2's id, an alias only in the draft build: look the
        // committed element up by the id the draft resolved it to first.
        const was =
            (now === null ? null : resolved(b0, now.id)) ?? (u.element === undefined ? null : resolved(b0, u.element));
        const touch = u.row === undefined ? undefined : now?.touch.find((t) => t.source === source && t.row === u.row);
        const table = u.table ?? touch?.table ?? null;
        const src = state.value.sources[source] as SourceSteps["sources"][string] | undefined;
        const incoming = table === null ? null : (touch?.cells ?? rowOf(src, copies, table, u.row));
        const cell = incoming === null || column === null ? undefined : incoming[column];
        const ends = endsOf(b1, now, u.pair);
        const own = isEmpty(cell) ? (u.key ?? now?.key ?? null) : cell;
        return {
            source,
            table,
            row: u.row ?? null,
            key: (byValue ? ends?.target.key : undefined) ?? own,
            name: u.name ?? null,
            element: now === null ? null : refOf(now),
            ends,
            held: was === null ? null : ownColumns(was.values),
            incoming: incoming === null ? null : ownColumns(incoming, src && numberedKey(src)),
            shown: now === null ? null : ownColumns(now.values),
            // what the step did not reach is as it was, whatever the other steps did to it
            effect: query.bucket === "untouched" ? "unchanged" : effectOf(now, was),
            codes,
        };
    });
    return { total: units.length, rows };
}

/**
 * The draft elements behind one count of one step, once each.
 * @param state - The draft.
 * @param query - The step, the count and the name.
 * @returns Their references; an element the draft no longer holds is left out.
 */
export function drillElements(state: DraftState, query: Omit<DrillQuery, "offset" | "limit">): ElementRef[] {
    const b1 = buildOf(state.value, state.copies);
    const out = new Map<string, ElementRef>();
    for (const u of unitsOf(state.value, b1, query)) {
        const el = u.element === undefined ? null : resolved(b1, u.element);
        if (el !== null) {
            const ref = refOf(el);
            out.set(refKey(ref), ref);
        }
    }
    return [...out.values()];
}

/**
 * The cells of one column where a draft's supplying sources disagree (3.10, 5.4): each source's
 * value, the shown value, and whether a reader decision shows it.
 * @param state - The draft.
 * @param query - The column, the step, which cells and the page.
 * @returns How many cells the filter keeps, and the page.
 */
export function drillCells(state: DraftState, query: CellQuery): { total: number; cells: DrillCell[] } {
    const all = conflicts(buildOf(state.value, state.copies), {
        column: query.column,
        ...(query.step === undefined ? {} : { step: query.step }),
        ...(query.only === undefined || query.only === "all" ? {} : { only: query.only }),
    });
    const cells = page(all, query.offset, query.limit).map((c) => ({ ...c, decided: c.by === "reader" }));
    return { total: all.length, cells };
}

/** A pair of values naming a row an excluded list holds. */
interface ExceptCell {
    readonly value: CellValue;
    readonly with: CellValue;
}

/** What an excluded list takes: a key, a row a count listed, or a pair it holds. */
type ExceptItem = CellValue | Pick<DrillRow, "key" | "incoming"> | ExceptCell;

/**
 * The column that, with the one a step excludes by, names one row: its source's key, what a link's rows
 * share, or an edge's other end.
 * @param step - The step.
 * @param src - Its source.
 * @param column - The column it excludes by.
 * @param row - The row.
 * @returns The column, or null when none tells the row apart.
 */
function tellingColumn(step: Step, src: Source | undefined, column: string, row: Row): string | null {
    const keys = [src?.mapping.nodes?.key, src?.mapping.edges?.edgeId];
    // a row's own id names it, but not what a link's rows of one node share
    const linked = step.op === "join.edges" && step.link !== undefined;
    if (!linked && keys.includes(column)) {
        return null;
    }
    const ends = step.op === "join.edges" ? [...(step.link?.columns ?? []), step.read.source, step.read.target] : [];
    return [...keys, ...ends].find((each) => each !== undefined && each !== column && !isEmpty(row[each])) ?? null;
}

/**
 * The pair naming one listed row, or its key when no second column tells it apart.
 * @param step - The step.
 * @param src - Its source.
 * @param column - The column it excludes by.
 * @param item - The row, key or pair.
 * @returns The pair and its second column, or the key.
 */
function exceptItem(
    step: Step,
    src: Source | undefined,
    column: string,
    item: ExceptItem,
): { readonly column: string | null; readonly pair: ExceptCell } | { readonly key: CellValue } {
    if (item === null || typeof item !== "object") {
        return { key: item };
    }
    if ("with" in item) {
        return { column: step.except?.cells?.column ?? null, pair: item };
    }
    const { key, incoming } = item;
    const other = incoming === null ? null : tellingColumn(step, src, column, incoming);
    const held = step.except?.cells?.column;
    // a list tells rows apart by one second column
    return other === null || incoming === null || (held !== undefined && held !== other)
        ? { key }
        : { column: other, pair: { value: key, with: incoming[other] ?? null } };
}

/**
 * Add keys or rows to a step's excluded list, or take them off it (5.4): the step's `except`.
 * @param value - The value.
 * @param index - The step's place.
 * @param items - The keys, rows or pairs.
 * @param mode - `"exclude"` adds them, `"include"` takes them off.
 * @param column - The column the keys are in; absent, the one {@link exceptColumn} names.
 * @returns The step's new `except`, or null to take it off.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for no step at `index` (reason `no-step`), a
 *   `join.add` (reason `no-except`) or a column other than the one the step's `except` reads
 *   (reason `except-column`).
 */
export function exceptOf(
    value: SourceSteps,
    index: number,
    items: readonly ExceptItem[],
    mode: "exclude" | "include",
    column?: string,
): RowFilter | null {
    const step = value.steps[index] as Step | undefined;
    if (step === undefined) {
        throw badCommand(`No step at ${String(index)}.`, { reason: "no-step", index });
    }
    const own = exceptColumn(step, value.sources[step.source]);
    if (own === null) {
        throw badCommand("A join.add step leaves no row out.", { reason: "no-except", index });
    }
    if (column !== undefined && step.except !== undefined && column !== own) {
        throw badCommand(`Step ${String(index)} excludes by ${own}.`, {
            reason: "except-column",
            index,
            column: own,
        });
    }
    const at = column ?? own;
    const named = items.map((item) => exceptItem(step, value.sources[step.source], at, item));
    const telling =
        step.except?.cells?.column ?? named.flatMap((each) => ("pair" in each ? [each.column] : [])).find(Boolean);
    const told = (each: (typeof named)[number]): boolean => "pair" in each && each.column === telling;
    const keys = named.filter((each) => !told(each)).map((each) => ("pair" in each ? each.pair.value : each.key));
    const pairs = named.flatMap((each) => (told(each) && "pair" in each ? [each.pair] : []));
    const pairKey = (p: ExceptCell): string => JSON.stringify([normalize(p.value), normalize(p.with)]);
    const values = changed(step.except?.values ?? [], keys, mode, (k) => normalize(k));
    const cells = changed(step.except?.cells?.pairs ?? [], pairs, mode, pairKey);
    if (values.length === 0 && cells.length === 0) {
        return null;
    }
    return {
        column: at,
        values,
        ...(cells.length === 0 || telling === undefined || telling === null
            ? {}
            : { cells: { column: telling, pairs: cells } }),
    };
}

/**
 * A list with some things added, each once, or taken off.
 * @param held - The list.
 * @param items - The things.
 * @param mode - Which.
 * @param key - What tells two apart.
 * @returns The list.
 */
function changed<T>(
    held: readonly T[],
    items: readonly T[],
    mode: "exclude" | "include",
    key: (item: T) => string,
): T[] {
    const names = new Set((mode === "exclude" ? held : items).map((each) => key(each)));
    return mode === "include"
        ? held.filter((each) => !names.has(key(each)))
        : [...held, ...items.filter((each) => !names.has(key(each)) && Boolean(names.add(key(each))))];
}

/** Which cells a batch pick takes one source's value for. */
export interface PickAllQuery {
    readonly column: string;
    /** The source whose value to take; give this or `otherThan`. */
    readonly source?: string;
    /** In each cell, the first source other than this one. */
    readonly otherThan?: string;
    /** `"open"` (default): cells no reader decision settles; `"decided"`; `"all"`. */
    readonly only?: "all" | "open" | "decided";
    readonly step?: number;
    /** Only these elements' cells. */
    readonly refs?: readonly ElementRef[];
}

/**
 * A batch pick (3.10, 5.4): one reader edit per cell taking one source's value, as one edit.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param query - The column, the source, which cells, the step and the elements.
 * @returns The edit and how many cells it picks; no edit when it picks none.
 * @throws A `GraphtyError` with the code a single pick throws for a column it guards, or
 * `E_BAD_COMMAND` (`no-source`) when the query names neither `source` nor `otherThan`.
 */
export function pickAllEdit(
    value: SourceSteps,
    copies: DraftState["copies"],
    query: PickAllQuery,
): { edit: StepsEdit | null; count: number } {
    if (query.source === undefined && query.otherThan === undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `pickAll names no source for ${query.column}.`,
            source: "data",
            details: { reason: "no-source", column: query.column },
        });
    }
    const result = buildOf(value, copies);
    const only = query.only ?? "open";
    const wanted = query.refs === undefined ? null : new Set(query.refs.map((r) => refKey(r)));
    const cells = conflicts(result, {
        column: query.column,
        ...(query.source === undefined ? {} : { source: query.source }),
        ...(query.step === undefined ? {} : { step: query.step }),
        ...(only === "all" ? {} : { only }),
    }).filter((c) => wanted === null || wanted.has(refKey(c.ref)));
    const reader: ReaderOp[] = [...value.reader];
    for (const c of cells) {
        const source = query.source ?? c.values.find((x) => x.source !== query.otherThan)?.source;
        if (source === undefined) {
            continue;
        }
        const op = pickEdit({ ...value, reader }, result, {
            id: mintEditId(),
            ref: c.ref,
            column: query.column,
            source,
        });
        if (op !== null && "code" in op) {
            throw new GraphtyError({
                code: op.code as GraphtyErrorCode,
                message: `${op.code} for ${query.column}.`,
                source: "data",
                details: op.params,
            });
        }
        if (op !== null) {
            reader.push(op);
        }
    }
    const ops = reader.slice(value.reader.length);
    return { edit: ops.length === 0 ? null : { kind: "reader", ops }, count: ops.length };
}

/** Which picks to clear. */
export interface ClearPicksQuery {
    readonly column: string;
    /** Only these elements' picks; absent, every pick in the column. */
    readonly refs?: readonly ElementRef[];
}

/**
 * Take back the picks of one column (5.4): the reader edits naming a picked source. Typed edits stay.
 * @param value - The value.
 * @param query - The column and the elements.
 * @returns The edit and how many picks it takes back; no edit when it takes none.
 */
export function clearPicksEdit(value: SourceSteps, query: ClearPicksQuery): { edit: StepsEdit | null; count: number } {
    const wanted = query.refs === undefined ? null : new Set(query.refs.map((r) => refKey(r)));
    const cleared = (o: ReaderOp): boolean => {
        if (o.op !== "edit" || o.picked === undefined || o.column !== query.column) {
            return false;
        }
        return wanted === null || wanted.has(refKey(o.node ?? o.edge));
    };
    const reader = value.reader.filter((o) => !cleared(o));
    const count = value.reader.length - reader.length;
    return { edit: count === 0 ? null : { kind: "set", value: { ...value, reader } }, count };
}
