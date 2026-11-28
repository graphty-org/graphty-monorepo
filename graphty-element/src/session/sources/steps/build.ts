/**
 * @file The pure build of sources and steps (design design/data/multiple-data-sources-design.md,
 * sections 3.1 to 3.6), behind the `source-steps` experiment.
 *
 * `build` folds the steps in list order over an empty working graph: a step sees what earlier
 * steps built and nothing after it. It reads only its arguments and keeps no state, so the same
 * input always gives the same graph, and a draft can run it on a copy. Supplied versus named (3.1)
 * is settled once every step is built, so load order never changes it. Free of Babylon.js, Lit and
 * the DOM.
 */

import { reduce } from "../../join";
import { readsAsDate, readTimeValue, type TimeUnit } from "../../time/parse";
import type { JoinReduce, SourceRefreshIssue, SourceRoleName } from "../../types";
import { escapeKey, keylessEdgeKeys, keylessNodeKeys } from "../rowKeys";
import {
    type AddStep,
    type BuildInput,
    type BuildIssue,
    type BuildResult,
    type BuiltEdge,
    type BuiltElement,
    type BuiltNode,
    type CellValue,
    type ClashRule,
    type CopyTables,
    type DrillUnit,
    type EdgesStep,
    type EdgeValuesStep,
    type LinkRead,
    type MergeStep,
    type NodeValuesStep,
    type OwnValue,
    READER_SOURCE,
    READER_SPACE,
    type ReaderOp,
    type ReaderResult,
    type Row,
    type RowFate,
    type RowFateKind,
    type RowFilter,
    type Source,
    type Step,
    type StepStats,
    type TableName,
    type TypeEntry,
    type TypeRule,
    type Value,
} from "./types";

/**
 * The internal id of a node.
 * @param space - The id space its key lives in.
 * @param key - Its key.
 * @returns An id unique in one build.
 */
export const nodeId = (space: string, key: string): string => `${space}\u0001${key}`;

/**
 * The internal id of an edge.
 * @param load - The id of the source that made it.
 * @param key - Its key within that source.
 * @returns An id unique in one build.
 */
const edgeId = (load: string, key: string): string => `${load}\u0001${key}`;

/**
 * A source's own id space, where its keys live when its mapping names none.
 * @param sourceId - The source's id.
 * @returns `source:<id>`.
 */
export const ownSpace = (sourceId: string): string => `source:${sourceId}`;

/**
 * The key a source's rows as read are held under in the copies.
 * @param src - The source.
 * @returns Its `origin.rows`, else its copy id.
 */
export const copyKey = (src: Source): string => src.origin.rows ?? src.origin.copy;

// The name a reader knows a source by, which spells the NodeIds its nodes are first told apart by.
const namedBy = (src: Source): string => src.label ?? src.id;

/**
 * The space a source's node rows key into.
 * @param src - The source.
 * @returns Its mapping's node space, else its own space.
 */
export const nodeSpace = (src: Source): string => src.mapping.nodes?.space ?? ownSpace(src.id);

/**
 * The space a source's rows key into when each is a node of an edge step (`rowNode`).
 * @param src - The source.
 * @param table - The table the step reads.
 * @returns The space its node rows key into; for edge rows, the source's own.
 */
export const rowNodeSpace = (src: Source, table: TableName): string =>
    table === "nodes" ? nodeSpace(src) : ownSpace(src.id);

/**
 * A name no other one takes: itself, or with a number after it.
 * @param name - The name.
 * @param taken - The names taken.
 * @returns The name.
 */
export function freeName(name: string, taken: ReadonlySet<string | undefined>): string {
    let n = 1;
    let out = name;
    while (taken.has(out)) {
        n++;
        out = `${name} ${String(n)}`;
    }
    return out;
}

export const isEmpty = (v: Value | undefined): v is null | undefined | "" => v === undefined || v === null || v === "";
const text = (v: CellValue | undefined): string => (v === undefined || v === null ? "" : String(v));

/** How two keys compare: exactly, or ignoring case or spaces. */
export interface MatchOptions {
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
}

/**
 * A cell as the text a key compares by.
 * @param v - The cell.
 * @param o - Whether case and spaces count.
 * @returns The text, Unicode-normalized.
 */
export function normalize(v: CellValue | undefined, o: MatchOptions = {}): string {
    let s = text(v).normalize("NFC");
    if (o.ignoreCase === true) {
        s = s.toLowerCase();
    }
    if (o.ignoreSpaces === true) {
        s = s.replaceAll(/\s+/g, "");
    }
    return s;
}
const listed = (f: RowFilter, r: Row): boolean => {
    const same = (v: CellValue, column: string): boolean => normalize(v) === normalize(r[column]);
    const { cells } = f;
    return (
        f.values.some((v) => same(v, f.column)) ||
        cells?.pairs.some((pair) => same(pair.value, f.column) && same(pair.with, cells.column)) === true
    );
};

/**
 * A source's rows of one table as read, under their working names (`renamed`, 4.4).
 * @param src - The source.
 * @param copies - Rows as read, by copy id.
 * @param table - Which table.
 * @returns The rows, or null when the source's copy has no such table.
 */
export function tableRows(
    src: Source,
    copies: ReadonlyMap<string, CopyTables>,
    table: TableName,
): readonly Row[] | null {
    const rows = copies.get(copyKey(src))?.[table];
    if (!rows) {
        return null;
    }
    const { numbered } = src;
    const read = numbered === undefined || src.mapping.nodes?.key === numbered ? rows : without(rows, numbered);
    const renamed = src.mapping[table]?.renamed ?? {};
    if (Object.keys(renamed).length === 0) {
        return read;
    }
    // A rename onto a name the row also carries as read is not applied: two columns never share
    // one working name, and neither one's values replace the other's (7.12).
    const name = (r: Row, k: string): string => {
        const w = renamed[k];
        return w === undefined || (w in r && (renamed[w] ?? w) === w) ? k : w;
    };
    return read.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [name(r, k), v])));
}

/** Rows with one column left out, per rows array and column, so every reader shares them. */
const withoutColumn = new WeakMap<readonly Row[], Map<string, readonly Row[]>>();

/**
 * Rows with one column left out.
 * @param rows - The rows.
 * @param column - The column.
 * @returns The rows.
 */
function without(rows: readonly Row[], column: string): readonly Row[] {
    const held = withoutColumn.get(rows) ?? new Map<string, readonly Row[]>();
    withoutColumn.set(rows, held);
    const out = held.get(column) ?? rows.map(({ [column]: _gone, ...row }) => row);
    held.set(column, out);
    return out;
}

// ---------------------------------------------------------------- dependence (3.2)

const suppliesSpace = (src: Source | undefined, space: string): boolean =>
    src !== undefined &&
    [nodeSpace(src), src.mapping.edges?.sourceSpace, src.mapping.edges?.targetSpace].includes(space);

/**
 * Every source a step depends on (3.2).
 * @param step - The step.
 * @param input - The whole build input; with it, a `join.merge` with `unmatchedFrom: "drop"` also
 * depends on the sources whose `join.add` supplied its node 1s.
 * @returns Its `source`, `via`, `lookup` or `edges`, and those suppliers.
 */
export function stepSources(step: Step, input?: BuildInput): string[] {
    const out = [step.source];
    if ("via" in step && step.via !== undefined) {
        out.push(step.via);
    }
    if ("lookup" in step && step.lookup !== undefined) {
        out.push(step.lookup);
    }
    if (step.op === "join.edge-values") {
        out.push(step.edges);
    }
    if (input && step.op === "join.merge" && step.unmatchedFrom === "drop") {
        for (const a of input.steps.slice(0, input.steps.indexOf(step))) {
            if (
                a.op === "join.add" &&
                a.source !== step.source &&
                suppliesSpace(input.sources[a.source], step.read.space)
            ) {
                out.push(a.source);
            }
        }
    }
    return out;
}

// ---------------------------------------------------------------- held steps (7.12)

/** The roles a mapping or a step's read can name, beyond its keys and ends. */
const ROLES = new Set([
    "weight",
    "time",
    "timeEnd",
    "latitude",
    "longitude",
    "coordinates",
    "country",
    "region",
    "city",
]);

/** The keys and ends a mapping or a step's read names. */
const KEYS = ["key", "source", "target", "edgeId"] as const;

/** The column names each table's rows hold, as read, per rows array. */
const rowColumns = new WeakMap<readonly Row[], ReadonlySet<string>>();

/**
 * The working names of a table's columns (4.4): every column a row holds, under its `renamed` name.
 * @param rows - The rows as read.
 * @param renamed - The source's renames for the table.
 * @returns The names.
 */
function workingColumns(
    rows: readonly Row[] | undefined,
    renamed: Readonly<Record<string, string>> | undefined,
): Set<string> {
    let read = rowColumns.get(rows ?? []);
    if (read === undefined) {
        read = new Set((rows ?? []).flatMap((row) => Object.keys(row)));
        rowColumns.set(rows ?? [], read);
    }
    return new Set([...read].map((k) => renamed?.[k] ?? k));
}

/**
 * The working columns of each table of a source's copy.
 * @param src - The source.
 * @param tables - Its copy.
 * @returns The names per table.
 */
export function columnsOf(src: Source, tables: CopyTables | undefined): Record<TableName, Set<string>> {
    return {
        nodes: workingColumns(tables?.nodes, src.mapping.nodes?.renamed),
        edges: workingColumns(tables?.edges, src.mapping.edges?.renamed),
    };
}

/** One column a step reads: its table, its name and the role it plays, if any. */
type Need = readonly [TableName, string, string | undefined];

/**
 * The columns one step reads from one source it depends on (7.12): a `join.add` reads its
 * mapping's keys and roles, any other step its own read and `columns`, and a step translating
 * through the source its mapping table's columns.
 * @param step - The step.
 * @param src - The source.
 * @returns The columns.
 */
function needs(step: Step, src: Source): Need[] {
    const out = step.source === src.id ? ownNeeds(step, src) : [];
    if ("mapping" in step && step.mapping !== undefined && (step.via === src.id || step.lookup === src.id)) {
        const table = step.mapping.table ?? (src.mapping.nodes === undefined ? "edges" : "nodes");
        for (const c of step.mapping.columns) {
            out.push([table, c, undefined]);
        }
    }
    return out;
}

/**
 * The keys, ends, roles and `columns` a step reads from its own source.
 * @param step - The step.
 * @param src - Its source.
 * @returns The columns.
 */
function ownNeeds(step: Step, src: Source): Need[] {
    const out: Need[] = [];
    const named = (table: TableName, read: object | undefined): void => {
        for (const [k, v] of Object.entries(read ?? {})) {
            if (typeof v === "string" && ((KEYS as readonly string[]).includes(k) || ROLES.has(k))) {
                out.push([table, v, ROLES.has(k) ? k : undefined]);
            }
        }
    };
    if (step.op === "join.add") {
        named("nodes", src.mapping.nodes);
        named("edges", src.mapping.edges);
        return out;
    }
    const edgeStep = step.op === "join.edges" || step.op === "join.edge-values";
    const table = step.read.table ?? (edgeStep ? "edges" : "nodes");
    named(table, step.read);
    if (step.op === "join.edges" && step.rowNode !== undefined && table === "nodes") {
        named("nodes", { key: src.mapping.nodes?.key });
    }
    const more =
        step.op === "join.edges"
            ? [...(step.link?.of === "nodes" ? [] : (step.link?.columns ?? [])), ...(step.extract?.columns ?? [])]
            : [];
    for (const c of [...(step.columns ?? []), ...more]) {
        out.push([table, c, undefined]);
    }
    return out;
}

/**
 * The columns a step reads that the rows of its sources no longer hold: such a step is held, kept
 * and listed but not built, until a column takes the name or comes back (7.12). Only the reader
 * turns a step off (7.13).
 * @param value - The sources and steps.
 * @param copyOf - The rows as read, by copy id.
 * @param index - The step's place.
 * @returns One `E_COLUMN_MISSING` or `E_READ_ROLE_MISSING` per missing column.
 */
export function missingColumns(
    value: BuildInput,
    copyOf: (copy: string) => CopyTables | undefined,
    index: number,
): SourceRefreshIssue[] {
    const step = value.steps[index] as Step | undefined;
    if (step === undefined) {
        return [];
    }
    const out: SourceRefreshIssue[] = [];
    for (const id of new Set(stepSources(step))) {
        const src = value.sources[id] as Source | undefined;
        const tables = src === undefined ? undefined : copyOf(copyKey(src));
        if (src === undefined || tables === undefined) {
            continue;
        }
        const have = columnsOf(src, tables);
        for (const [table, column, role] of needs(step, src)) {
            if (have[table].has(column)) {
                continue;
            }
            out.push(
                role === undefined
                    ? { code: "E_COLUMN_MISSING", params: { step: index, source: id, column, table } }
                    : {
                          code: "E_READ_ROLE_MISSING",
                          params: { step: index, source: id, column, role: role as SourceRoleName, table },
                      },
            );
        }
    }
    return out;
}

/**
 * Whether a source is staged: held and saved, but read by no step, so never built (3.1).
 * @param input - The build input.
 * @param sourceId - The source's id.
 * @returns True when no step names it.
 */
export const isStaged = (input: BuildInput, sourceId: string): boolean =>
    !input.steps.some((s) => stepSources(s).includes(sourceId));

// ---------------------------------------------------------------- part minting (3.3)

/** What part minting must stay above, besides the steps and type rules. */
export interface PartFloor {
    /** Saved references to edges (notes, reader edits, run outputs, ...), keyed `{ load, key }`. */
    readonly refs?: readonly { readonly load: string; readonly key: string }[];
    /** A part to stay above besides what the input names. */
    readonly high?: number;
}

/**
 * The next `part` for a new `join.edges` step (3.3).
 * @param input - The build input.
 * @param sourceId - The source the step reads.
 * @param floor - Saved references beyond the reader's edits, and a floor of the caller's own.
 * @returns One above every part a step of the source, a type rule, a reader edit or a reference
 *     names; the file keeps no counter, so a part nothing names any more may be minted again.
 */
export function mintPart(input: BuildInput, sourceId: string, floor: PartFloor = {}): number {
    const parts = [floor.high ?? 0];
    for (const s of input.steps) {
        if (s.source === sourceId && s.op === "join.edges") {
            parts.push(s.part);
        }
    }
    for (const t of input.types ?? []) {
        for (const r of t.rules) {
            if (r.source === sourceId && r.part !== undefined) {
                parts.push(r.part);
            }
        }
    }
    const readerRefs = (input.reader ?? []).flatMap((op) =>
        (op.op === "remove" || op.op === "edit") && op.edge !== undefined ? [op.edge] : [],
    );
    for (const r of [...(floor.refs ?? []), ...readerRefs]) {
        const m = /^(\d+)\//.exec(r.key);
        if (r.load === sourceId && m) {
            parts.push(Number(m[1]));
        }
    }
    return Math.max(...parts) + 1;
}

// ---------------------------------------------------------------- types (3.7)

interface TypeContext {
    readonly source: string;
    readonly end?: "source" | "target";
    readonly part?: number;
}

// The type rule that applies (3.7): a rule's `part` only narrows it to that step, so a rule with none
// also types what a `join.edges` step makes. A column-and-values rule beats a whole rule; between two
// of a kind a rule naming the step's part beats one naming none; then registry order.
function typeOf(types: readonly TypeEntry[], kind: "node" | "edge", ctx: TypeContext, row: Row): string | null {
    let best: string | null = null;
    let rank = -1;
    for (const t of types.filter((each) => each.kind === kind)) {
        for (const r of t.rules) {
            const mine = ruleRank(r, ctx, row);
            if (mine > rank) {
                best = t.name;
                rank = mine;
            }
        }
    }
    return best;
}

// How closely one rule names a row: -1 when it does not; 2 for a column-and-values rule, plus 1 for a part.
function ruleRank(r: TypeRule, ctx: TypeContext, row: Row): number {
    if (r.source !== ctx.source || r.end !== ctx.end || (r.part !== undefined && r.part !== ctx.part)) {
        return -1;
    }
    const valued = r.column !== undefined;
    if (valued && !(r.values && listed({ column: r.column, values: r.values }, row))) {
        return -1;
    }
    return (valued ? 2 : 0) + (r.part === undefined ? 0 : 1);
}

/**
 * A time cell as epoch milliseconds (or its ordinal value).
 * @param v - The cell; a number is already milliseconds unless `unit` says otherwise.
 * @param zone - The IANA zone a stamp with no offset of its own is read in; absent means UTC.
 * @param unit - How a number reads (`"ms"`, `"s"`, `"year"`, `"ordinal"`); absent means milliseconds.
 * @returns The time, or null for an empty or unreadable cell.
 */
function parseTime(v: CellValue | undefined, zone?: string, unit?: TimeUnit): number | null {
    if (isEmpty(v)) {
        return null;
    }
    if (typeof v === "number" && unit === undefined) {
        return v;
    }
    if (zone === undefined && unit === undefined) {
        const s = String(v);
        const t = Date.parse(/(?:[zZ]|[+-]\d\d:\d\d)$/.test(s) ? s : `${s}Z`);
        return Number.isNaN(t) ? null : t;
    }
    return readTimeValue(v, unit ?? "ms", zone);
}

// ---------------------------------------------------------------- conflict rules (3.10)

/**
 * The rule a step's `clash` sets for one working column.
 * @param step - The step.
 * @param column - A working column name.
 * @returns The column's rule, else the `"*"` rule, else `keep`.
 */
function ruleFor(step: Step, column: string): ClashRule {
    const c = step.clash;
    if (typeof c === "object") {
        return c[column] ?? c["*"] ?? "keep";
    }
    return c ?? "keep";
}

/**
 * The `aggregate` rule a step sets for one working column: its own, else the `"*"` rule, which
 * never reduces a column the step matches or keys its rows by.
 * @param step - The step.
 * @param column - A working column name.
 * @returns The rule, or undefined when the column follows `repeated`.
 */
function aggregateFor(step: Step, column: string): JoinReduce | undefined {
    if (!("aggregate" in step) || step.aggregate === undefined) {
        return undefined;
    }
    const own = step.aggregate[column];
    if (own !== undefined || column === "*") {
        return own;
    }
    const r = step.read;
    const matched =
        ("key" in r && r.key === column) ||
        ("source" in r && (r.source === column || r.target === column)) ||
        ("edgeId" in r && r.edgeId === column);
    return matched ? undefined : step.aggregate["*"];
}

type Held = [origin: string, value: Value];
/**
 * Whether a cell reads as a number, as the numeric clash rules read it.
 * @param v - The cell.
 * @returns True when it does.
 */
export const isNumber = (v: Value | undefined): boolean =>
    !isEmpty(v) && !Array.isArray(v) && !Number.isNaN(Number(v)) && !(typeof v === "string" && v.startsWith("+"));
/**
 * Whether a cell reads as a date, as `min` and `max` order it.
 * @param v - The cell.
 * @returns True when it does.
 */
export const isDate = (v: Value | undefined): boolean =>
    typeof v === "string" && readsAsDate(v) && parseTime(v) !== null;
/**
 * Whether a numeric clash rule fits these values (3.10): `mean` needs numbers, `min` and `max`
 * numbers or dates.
 * @param rule - The rule.
 * @param values - Every source's value for one cell.
 * @returns False when the rule cannot order them.
 */
export function ruleFits(rule: ClashRule, values: readonly Value[]): boolean {
    if (rule !== "min" && rule !== "max" && rule !== "mean") {
        return true;
    }
    return values.every((v) => isNumber(v)) || (rule !== "mean" && values.every((v) => isDate(v)));
}
const numbers = (all: Held[]): [string, number][] | undefined =>
    all.every(([, v]) => isNumber(v)) ? all.map(([s, v]) => [s, Number(v)]) : undefined;
// min and max order numbers, else dates
const ordered = (all: Held[]): [string, number][] | undefined =>
    numbers(all) ??
    (all.every(([, v]) => isDate(v)) ? all.map(([s, v]) => [s, parseTime(v as string) ?? 0]) : undefined);
const pickBy = (all: Held[], better: (a: number, b: number) => boolean): Held | undefined => {
    const n = ordered(all);
    if (!n) {
        return undefined;
    }
    let best = 0;
    n.forEach(([, v], i) => {
        if (better(v, n[best][1])) {
            best = i;
        }
    });
    return all[best];
};
// Each returns the source whose value shows, or the rule itself for a computed value; undefined when not numbers.
const FUSE: Partial<Record<ClashRule, (all: Held[]) => Held | undefined>> = {
    min: (all) => pickBy(all, (a, b) => a < b),
    max: (all) => pickBy(all, (a, b) => a > b),
    mean: (all) => {
        const n = numbers(all);
        return n && ["rule:mean", n.reduce((a, [, v]) => a + v, 0) / n.length];
    },
    vote: (all) => {
        // the value most sources hold; a tie keeps the held (first) value
        const counts = new Map<Value, number>();
        for (const [, v] of all) {
            counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        const top = Math.max(...counts.values());
        const win = [...counts].filter(([, c]) => c === top);
        const value = win.length > 1 ? all[0][1] : win[0][0];
        return all.find(([, v]) => v === value);
    },
};

// ---------------------------------------------------------------- the build (3.2)

const HUB_SHARE = 0.05;

function newStats(step: Step, si: number): StepStats {
    return {
        step: si,
        op: step.op,
        source: step.source,
        ...(step.op === "join.edges" ? { part: step.part } : {}),
        newNodes: 0,
        newEdges: 0,
        mergedEdges: 0,
        matched: 0,
        unmatched: 0,
        fanOut: 0,
        rowsDiffer: 0,
        valuesDiffer: {},
        ruleType: {},
        merged: 0,
        typeDiffers: 0,
        untouched: 0,
        keptNew: 0,
        groups: [],
        selfLoops: 0,
        pairsBelowMin: 0,
        emptyKey: 0,
        repeatedKept: 0,
        hub: [],
        rowsDifferIn: {},
        parallelPairs: 0,
        endsMeet: {},
        endsMissing: {},
        namedOnly: 0,
        repeated1: 0,
        repeated2: 0,
        newNodeTypes: {},
        newEdgeTypes: {},
    };
}

/**
 * Add one to a per-name count.
 * @param counts - The counts.
 * @param name - The name.
 */
function bump(counts: Record<string, number>, name: string): void {
    counts[name] = (counts[name] ?? 0) + 1;
}

/**
 * The values a list holds more than once.
 * @param values - The values, each with what it was read from.
 * @returns Each distinct repeated value, with the first of its units that names an element, else its first.
 */
function repeats(values: Iterable<readonly [string, DrillUnit]>): Map<string, DrillUnit> {
    const seen = new Map<string, DrillUnit>();
    const twice = new Map<string, DrillUnit>();
    for (const [v, unit] of values) {
        const first = seen.get(v);
        if (first === undefined) {
            seen.set(v, unit);
        } else {
            // the first of the key's rows that reached an element, so its drill row can name it
            const held = twice.get(v) ?? first;
            twice.set(v, held.element === undefined && unit.element !== undefined ? unit : held);
        }
    }
    return twice;
}

/**
 * The key values a merge's node 2s fold by: one per row of the source each node 2 was made from,
 * so a key two rows share (and the step's `repeated` settles) repeats, unless the step leaves the
 * row out or its key is empty.
 * @param s - The merge.
 * @param node2s - Its node 2s.
 * @returns The keys, one per row, each with the node 2 and its row.
 */
function mergeKeys(s: MergeStep, node2s: readonly BuiltNode[]): (readonly [string, DrillUnit])[] {
    return node2s.flatMap((n2) =>
        n2.touch.flatMap((t) => {
            if (t.source !== s.source || t.table !== "nodes" || t.valued === true) {
                return [];
            }
            const r = t.cells;
            const v = r[s.read.key];
            const out = isEmpty(v) || (s.except !== undefined && listed(s.except, r));
            return out || (s.rows !== undefined && !listed(s.rows, r))
                ? []
                : [[text(v), { table: "nodes", row: t.row, element: n2.id }] as const];
        }),
    );
}

const supply = (el: BuiltElement, src: string): void => {
    if (!el.loads.includes(src)) {
        el.loads.push(src);
    }
    el.named = el.named.filter((s) => s !== src);
};
const name = (n: BuiltElement, src: string): void => {
    if (!n.loads.includes(src) && !n.named.includes(src)) {
        n.named.push(src);
    }
};
// 3.1: an edge end supplies the node it reaches unless some source's rows supply it; settled after the build
const reach = (n: BuiltNode, src: string): void => {
    n.ends ??= [];
    if (!n.ends.includes(src)) {
        n.ends.push(src);
    }
};
const settle = (n: BuiltNode): void => {
    const supplied = n.loads.length > 0;
    for (const src of n.ends ?? []) {
        if (supplied) {
            name(n, src);
        } else if (!n.loads.includes(src)) {
            n.loads.push(src);
        }
    }
    delete n.ends;
};

type Lookup = (v: CellValue | undefined) => string[];
type EndLookups = Readonly<Record<"source" | "target", Lookup | null>>;
const MISS_ORDER = ["left-out:empty-end", "left-out:fan-out", "left-out:unmatched"] as const;
type RowHalf = "source" | "target";
type EndMiss = (typeof MISS_ORDER)[number];
type EndHit = { n: BuiltNode } | { miss: EndMiss };

// Where one written cell came from.
interface WriteAt {
    readonly src: string;
    readonly si: number;
    readonly row: number;
    readonly step: Step;
    readonly st: StepStats;
}

interface EdgeRole {
    readonly weight?: string | null;
    readonly weightMeaning?: string;
    readonly time?: string | null;
    readonly timeUnit?: TimeUnit;
    readonly timeParseZone?: string;
}

interface EdgeArgs {
    readonly load: string;
    readonly key: string;
    readonly from: BuiltNode;
    readonly to: BuiltNode;
    readonly row: Row;
    readonly index: number;
    readonly values: [string, CellValue | undefined][];
    readonly ctx: TypeContext;
    // the source's role columns for the table, and the step's own (`read`), which win
    readonly roles: EdgeRole;
    readonly read?: EdgeRole;
    readonly table: TableName;
    // the columns the step reads the ends from
    readonly ends: { readonly source: string; readonly target: string };
    // the step's `repeated` on join.edges; absent leaves repeats to repeatedEdges
    readonly repeated?: "first" | "last" | "both";
    // under `existing: "merge"`: the edges earlier steps made, and those this step folded rows into
    readonly held?: HeldEdges;
}

// The edges a step found, by end pair, in build order, and the ones its rows folded into.
interface HeldEdges {
    readonly byPair: ReadonlyMap<string, readonly BuiltEdge[]>;
    readonly folded: Set<string>;
}

// One row of a join.edges step.
interface EdgeRow {
    readonly s: EdgesStep;
    readonly si: number;
    readonly st: StepStats;
    readonly src: Source;
    readonly table: TableName;
    readonly row: Row;
    readonly index: number;
    // what its edge is keyed by when no edge id names it
    readonly key: string | undefined;
    // whether a list in one of its cells names several nodes, with an edge to each
    readonly many: boolean;
    readonly held: HeldEdges | undefined;
}

// The index of no row: what a link over nodes makes is read from none.
const NO_ROW = -1;

// One row holding a value of a link.
interface LinkRow {
    readonly row: Row;
    readonly index: number;
}

// One value of a link's columns: how the first row spells it, and the rows of each node holding it.
interface SharedValue {
    readonly column: string;
    readonly given: CellValue | undefined;
    readonly holders: Map<BuiltNode, LinkRow[]>;
}

// A join.edges step that links.
interface LinkAt {
    readonly s: EdgesStep;
    readonly si: number;
    readonly st: StepStats;
    readonly src: Source;
    readonly table: TableName;
    readonly link: LinkRead;
    // the rows that link something
    readonly linked: Map<number, string>;
    // the nodes it links
    readonly linkedNodes: Set<BuiltNode>;
}

// A merge under way: how many rows each node 1 takes, and the values naming several node 1s.
interface MergeAt {
    readonly s: MergeStep;
    readonly si: number;
    readonly st: StepStats;
    readonly groups: Map<string, number>;
    readonly fanned: Map<string, DrillUnit>;
}

// A row as a node (`rowNode`): the key its edges are named by, and the node.
interface RowNode {
    readonly key: string;
    readonly hit: EndHit;
}

// The weight, meaning and time column an edge row carries (3.8, 3.9).
function edgeRoles(a: EdgeArgs): {
    w: CellValue | undefined;
    meaning: string | null;
    weightDefault: boolean;
    timeCol: string | null;
} {
    const { read, roles, row } = a;
    const sourceWeight = roles.weight ?? null;
    let w: CellValue | undefined = null;
    if (read && "weight" in read) {
        w = read.weight === null || read.weight === undefined ? null : row[read.weight];
    } else if (sourceWeight !== null) {
        w = row[sourceWeight];
    }
    const meaning = read?.weightMeaning ?? (w === null ? null : (roles.weightMeaning ?? null));
    const weightDefault = isEmpty(w) && (sourceWeight !== null || read?.weight === null);
    const stepTime = read && "time" in read ? read.time : undefined;
    const timeCol = roles.time === undefined || stepTime === null ? null : (stepTime ?? roles.time);
    return { w, meaning, weightDefault, timeCol };
}

// 3.8: a reduced edge's time spans its rows, earliest start to latest end
function span(e: BuiltEdge, a: EdgeArgs, timeCol: string | null): void {
    if (timeCol === null) {
        return;
    }
    // the step's own time read takes its own unit, else the source's
    const own = a.read && "time" in a.read && a.read.time !== undefined;
    const t = parseTime(
        a.row[timeCol],
        a.roles.timeParseZone,
        (own ? a.read?.timeUnit : undefined) ?? a.roles.timeUnit,
    );
    if (t === null) {
        return;
    }
    if (e.time === null || t < e.time) {
        e.time = t;
        e.timeFrom = a.load;
    }
    e.timeEnd = Math.max(e.timeEnd ?? t, t);
}

// One run of the build: the working graph and its counts, written by the step folds.
class Builder {
    readonly nodes = new Map<string, BuiltNode>();
    readonly edges = new Map<string, BuiltEdge>();
    readonly aliases = new Map<string, string>();
    // The edges ending at each node and the aliases naming each node, so a merge folding one node
    // into another reads only what touches it rather than every edge and alias the build holds.
    private readonly edgesAt = new Map<string, Set<BuiltEdge>>();
    private readonly aliasesOf = new Map<string, Set<string>>();
    readonly edgeAliases = new Map<string, string>();
    readonly pairs = new Map<string, string>();
    readonly stats: StepStats[] = [];
    readonly issues: BuildIssue[] = [];
    duplicate: BuildResult["duplicate"];
    readonly fates = new Map<string, Map<string, RowFate>>();
    readonly readerResults: ReaderResult[] = [];
    // what each count counted, by step place and count name (see DrillUnit)
    readonly drill = new Map<number, Map<string, DrillUnit[]>>();
    // by step place, the nodes it took out (a row nothing links, a node 2 a merge leaves out)
    readonly dropped = new Map<number, Set<string>>();
    // `<source>#<table>` -> the rows a filtered step read, for the no-step fate
    private readonly reads = new Map<string, { src: string; table: TableName; n: number; read: Set<number> }>();
    private readonly types: readonly TypeEntry[];
    // the rows each `aggregate` column read so far, per element (see gather)
    private readonly gathered = new WeakMap<BuiltElement, Map<string, Map<number, Value>>>();
    // the step that made each element, for its counts by type once the build is done
    private readonly madeBy = new WeakMap<BuiltElement, StepStats>();
    // by source, the node each edge row was merged into, and the nodes merges made of rows naming none
    private readonly placed = new Map<string, Map<number, BuiltNode>>();
    private readonly keptRows = new WeakSet<BuiltNode>();
    // by step, the nodes it made of values a column of its end's nodes does not hold
    private readonly columnEnds = new Map<EdgesStep, Map<string, BuiltNode>>();
    // what counts noted of elements since taken back, by step place and count name
    private readonly unmarked = new Map<number, Map<string, Set<string>>>();
    // by source, the rows whose node a merge left out (`unmatchedFrom: "drop"`): a later merge reads them too
    private readonly skipped = new Map<string, Map<number, Row>>();
    // the merge step that last folded one of an edge's ends, for its parallel pair or self-loop
    private readonly endFoldedBy = new WeakMap<BuiltEdge, StepStats>();

    constructor(
        private readonly input: BuildInput,
        private readonly copies: ReadonlyMap<string, CopyTables>,
    ) {
        this.types = input.types ?? [];
    }

    // Note one thing a step's count counted.
    mark(st: StepStats, count: string, unit: DrillUnit): void {
        let byCount = this.drill.get(st.step);
        if (!byCount) {
            byCount = new Map();
            this.drill.set(st.step, byCount);
        }
        const list = byCount.get(count);
        if (list) {
            list.push(unit);
        } else {
            byCount.set(count, [unit]);
        }
    }

    // Take back what a count noted of one element.
    private unmark(st: StepStats, count: string, element: string): void {
        const byCount = this.unmarked.get(st.step) ?? new Map<string, Set<string>>();
        this.unmarked.set(st.step, byCount.set(count, (byCount.get(count) ?? new Set()).add(element)));
    }

    private settleMarks(): void {
        for (const [step, byCount] of this.unmarked) {
            const lists = this.drill.get(step);
            for (const [count, gone] of byCount) {
                lists?.set(
                    count,
                    (lists.get(count) ?? []).filter((unit) => !gone.has(unit.element ?? "")),
                );
            }
        }
    }

    // A count of distinct keys: its size, each key noted with a row of it and the element it reached.
    keys(st: StepStats, count: "repeated1" | "repeated2", keys: ReadonlyMap<string, DrillUnit>): number {
        for (const [key, unit] of keys) {
            this.mark(st, count, { ...unit, key });
        }
        return keys.size;
    }

    resolve(space: string, key: string): string | undefined {
        const id = nodeId(space, key);
        return this.nodes.has(id) ? id : this.aliases.get(id);
    }

    // A held or missing source holds back every step that depends on it (3.2).
    private unbuildable(id: string): boolean {
        const src = this.input.sources[id] as Source | undefined;
        return src === undefined || src.held === true;
    }

    private source(id: string): Source {
        const src = this.input.sources[id] as Source | undefined;
        if (src === undefined) {
            throw new Error(`build: no source ${id}`);
        }
        return src;
    }

    private rows(src: Source, table: TableName): readonly Row[] | null {
        return tableRows(src, this.copies, table);
    }

    private fate(src: string, table: TableName, i: number, f: RowFateKind, el?: string): void {
        let m = this.fates.get(src);
        if (!m) {
            m = new Map();
            this.fates.set(src, m);
        }
        const k = `${table}#${i}`;
        const cur = m.get(k) ?? { fate: f, elements: [] };
        if (f === "built" || cur.fate !== "built") {
            cur.fate = f;
        }
        if (el !== undefined && !cur.elements.includes(el)) {
            cur.elements.push(el);
        }
        m.set(k, cur);
    }

    private touch(
        el: BuiltElement,
        step: Step,
        si: number,
        table: TableName,
        row: Row,
        i: number,
        valued: { readonly valued?: true } = {},
    ): void {
        if (i === NO_ROW) {
            return;
        }
        el.touch.push({ step: si, source: step.source, table, row: i, cells: row, ...valued });
        this.fate(step.source, table, i, "built", el.id);
    }

    private reportEmpty(source: string, perColumn: Map<string, number>): void {
        for (const [column, rows] of perColumn) {
            this.issues.push({ code: "W_KEY_EMPTY", params: { source, column, rows } });
        }
    }

    private mkNode(space: string, key: string, type: string | null): BuiltNode {
        const id = nodeId(space, key);
        const n: BuiltNode = {
            id,
            space,
            key,
            type,
            otherTypes: [],
            loads: [],
            named: [],
            values: {},
            origin: {},
            own: {},
            touch: [],
            aliases: [],
            time: null,
            timeFrom: null,
        };
        this.nodes.set(id, n);
        return n;
    }

    private node(
        space: string,
        key: string,
        ctx: TypeContext,
        row: Row,
        st: StepStats,
        how: "add" | "leave-out" = "add",
    ): BuiltNode | null {
        const id = this.resolve(space, key);
        const met = id === undefined ? undefined : this.nodes.get(id);
        if (met) {
            this.meetType(met, typeOf(this.types, "node", ctx, row), st);
            return met;
        }
        if (how === "leave-out") {
            return null;
        }
        st.newNodes++;
        const made = this.mkNode(space, key, typeOf(this.types, "node", ctx, row));
        this.mark(st, "newNodes", { element: made.id });
        this.madeBy.set(made, st);
        return made;
    }

    // 3.7: the first step to give a node a type sets it; a different type a later step gives stays in its lineage.
    private meetType(n: BuiltNode, type: string | null, st: StepStats): void {
        if (type === null || type === n.type) {
            return;
        }
        if (n.type === null) {
            n.type = type;
        } else if (!n.otherTypes.includes(type)) {
            n.otherTypes.push(type);
            st.typeDiffers++;
            this.mark(st, "typeDiffers", { element: n.id });
        }
    }

    // Writes one cell from one source by the step's clash rule (3.3, 3.10).
    private write(el: BuiltElement, col: string, v: Value | undefined, at: WriteAt): void {
        const { src, st, step } = at;
        const { numbered, mapping } = this.source(src);
        // a key the rows were numbered by is no column of theirs
        if (isEmpty(v) || (col === numbered && col === mapping.nodes?.key)) {
            return;
        }
        el.own[src] ??= {};
        const mine = el.own[src][col] as OwnValue | undefined;
        const agg = aggregateFor(step, col);
        if (agg !== undefined) {
            this.writeOwn(el, col, this.gather(el, col, v, at, agg), at);
            return;
        }
        if (mine) {
            // a repeat within one source: `repeated` decides, absent means first (3.3)
            if (mine.v !== v) {
                st.rowsDiffer++;
                bump(st.rowsDifferIn, col);
                const unit = { source: src, row: at.row, element: el.id, name: col };
                this.mark(st, "rowsDiffer", unit);
                this.mark(st, "rowsDifferIn", unit);
                if (mine.step !== at.si && step.op === "join.merge" && !sameCell(mine.v, v)) {
                    this.meetAgain(el, col, mine, v, at);
                    return;
                }
            }
            if (!("repeated" in step) || step.repeated !== "last") {
                return;
            }
        }
        this.writeOwn(el, col, v, at);
    }

    // Two matches of one source bring an element two values: the later step's clash rule settles them, as
    // it does two sources'.
    private meetAgain(el: BuiltElement, col: string, mine: OwnValue, v: Value, at: WriteAt): void {
        const { src, st, step } = at;
        this.countDiffer(el, col, at);
        el.metAgain ??= {};
        const met = el.metAgain[col] ?? { source: src, values: [mine.v] };
        met.values.push(v);
        el.metAgain[col] = met;
        const clash = ruleFor(step, col);
        el.rule ??= {};
        el.rule[col] = clash;
        el.ruleStep ??= {};
        el.ruleStep[col] = at.si;
        if (clash === "both") {
            this.clashColumn(el, col, v, at);
            return;
        }
        let next = clash === "overwrite" ? v : mine.v;
        const rule = FUSE[clash];
        if (rule) {
            const got = rule([
                [src, mine.v],
                [src, v],
            ]);
            if (!got) {
                st.ruleType[col] = (st.ruleType[col] ?? 0) + 1;
                this.mark(st, "ruleType", { element: el.id, name: col });
            }
            next = got?.[1] ?? mine.v;
        }
        el.own[src][col] = { v: next, step: at.si, row: at.row };
        if (el.origin[col] === src) {
            el.values[col] = next;
        }
    }

    // A cell two steps bring different values counts once per step, however many of the step's rows write it (5.4).
    private countDiffer(el: BuiltElement, col: string, { src, si, st, row }: WriteAt): void {
        el.differAt ??= {};
        const differAt = (el.differAt[col] ??= []);
        if (!differAt.includes(si)) {
            differAt.push(si);
            st.valuesDiffer[col] = (st.valuesDiffer[col] ?? 0) + 1;
            this.mark(st, "valuesDiffer", { source: src, row, element: el.id, name: col });
        }
    }

    // Each row an `aggregate` column read for one element, per source, reduced so far (3.3): a row two
    // steps read counts once.
    private gather(el: BuiltElement, col: string, v: Value, at: WriteAt, rule: JoinReduce): Value {
        const k = `${at.src}\u0001${col}`;
        let byKey = this.gathered.get(el);
        if (!byKey) {
            byKey = new Map();
            this.gathered.set(el, byKey);
        }
        const all = byKey.get(k) ?? new Map<number, Value>();
        all.set(at.row, v);
        byKey.set(k, all);
        return (reduce(rule, [...all.values()]) as Value | undefined) ?? null;
    }

    // Sets one source's value for a cell, then settles the cell against other sources by the clash rule.
    private writeOwn(el: BuiltElement, col: string, v: Value, at: WriteAt): void {
        const { src, st, step } = at;
        el.own[src][col] = { v, step: at.si, row: at.row };
        const heldFrom = el.origin[col] as string | undefined;
        if (heldFrom === undefined || heldFrom === src) {
            el.values[col] = v;
            el.origin[col] = src;
            return;
        }
        const held = el.values[col];
        const differ = !sameCell(held, v);
        if (differ) {
            this.countDiffer(el, col, at);
        }
        const clash = ruleFor(step, col);
        el.rule ??= {};
        el.rule[col] = clash;
        el.ruleStep ??= {};
        el.ruleStep[col] = at.si;
        if (clash === "overwrite" && (differ || held !== v)) {
            el.values[col] = v;
            el.origin[col] = src;
        } else if (clash === "both") {
            this.clashColumn(el, col, v, at);
        } else {
            this.fuse(el, col, clash, st);
        }
    }

    // 3.8: a clash column holds its source's own value, so that source's section reads it
    private clashColumn(el: BuiltElement, col: string, v: Value, at: WriteAt): void {
        const c = `${col} (${at.src})`;
        el.values[c] = v;
        el.origin[c] = at.src;
        el.own[at.src][c] = { v, step: at.si, row: at.row };
        el.clashColumns ??= {};
        el.clashColumns[c] = { column: c, base: col, source: at.src };
    }

    // 3.10: read every source's value for the cell so far, so the order the pair met never matters
    private fuse(el: BuiltElement, col: string, clash: ClashRule, st: StepStats): void {
        const rule = FUSE[clash];
        if (!rule) {
            return;
        }
        const all: Held[] = Object.entries(el.own)
            .filter(([, c]) => col in c)
            .map(([s, c]) => [s, c[col].v]);
        const got = rule(all);
        if (!got) {
            st.ruleType[col] = (st.ruleType[col] ?? 0) + 1; // not numbers: the held value stays
            this.mark(st, "ruleType", { element: el.id, name: col });
            return;
        }
        [el.origin[col], el.values[col]] = got;
    }

    // A field-to-field translation through a mapping table (3.5): value -> nodes.
    private translator(step: MergeStep | NodeValuesStep | EdgesStep): Lookup | null {
        if (step.nodeColumn !== undefined) {
            let space: string | undefined;
            if (step.op === "join.edges") {
                space = step.viaEnd === "source" ? step.read.sourceSpace : step.read.targetSpace;
            } else {
                ({ space } = step.read);
            }
            return this.nodeColumnLookup(step, step.nodeColumn, space);
        }
        const through = step.via ?? step.lookup;
        if (through === undefined || step.mapping === undefined) {
            return null;
        }
        const m = this.source(through);
        const [fromCol, toCol] = step.mapping.columns;
        const table = step.mapping.table ?? (m.mapping.nodes ? "nodes" : "edges");
        const space = step.mapping.space ?? nodeSpace(m);
        const idx = new Map<string, Set<string>>();
        for (const r of this.rows(m, table) ?? []) {
            if (isEmpty(r[toCol])) {
                continue;
            }
            for (const v of cellValues(r[fromCol]).filter((each) => !isEmpty(each))) {
                const k = normalize(v, step);
                const set = idx.get(k) ?? new Set<string>();
                set.add(text(r[toCol]));
                idx.set(k, set);
            }
        }
        const passThrough = step.lookup !== undefined && step.via === undefined;
        return eachValue((v) => {
            const keys = idx.get(normalize(v, step));
            if (!keys) {
                const id = passThrough ? this.resolve(space, text(v)) : undefined;
                return id === undefined ? [] : [id];
            }
            // a key and an alias reaching one node are one match
            return [...keys].map((k) => this.resolve(space, k)).filter((x): x is string => x !== undefined);
        });
    }

    // How each end of an edge step finds its nodes when not by their key: `via` or `nodeColumn` at one
    // end, `otherColumn` at the other.
    private endLookups(s: EdgesStep): EndLookups {
        const one = s.viaEnd ?? "target";
        const other = one === "source" ? "target" : "source";
        const space = other === "source" ? s.read.sourceSpace : s.read.targetSpace;
        return {
            [one]: this.translator(s),
            [other]: s.otherColumn === undefined ? null : this.nodeColumnLookup(s, s.otherColumn, space),
        } as unknown as EndLookups;
    }

    // The nodes of a space by a column of theirs, as built so far, each value of a list apart.
    private nodeColumnLookup(step: MatchOptions, column: string, space: string | undefined): Lookup {
        const idx = new Map<string, string[]>();
        for (const n of this.nodes.values()) {
            for (const v of n.space === space ? cellValues(n.values[column]) : []) {
                if (!isEmpty(v)) {
                    const k = normalize(v, step);
                    const ids = idx.get(k) ?? [];
                    ids.push(n.id);
                    idx.set(k, ids);
                }
            }
        }
        // a node an earlier row of the step folded away is the node it folded into
        const live = (id: string): string | undefined => (this.nodes.has(id) ? id : this.aliases.get(id));
        return eachValue((v) =>
            (idx.get(normalize(v, step)) ?? []).map((id) => live(id)).filter((id) => id !== undefined),
        );
    }

    private lookupIn(step: MergeStep | NodeValuesStep, space: string): Lookup {
        const tr = this.translator(step);
        if (tr) {
            return tr;
        }
        const one = (id: string | undefined): string[] => (id === undefined ? [] : [id]);
        if (step.ignoreCase !== true && step.ignoreSpaces !== true) {
            return eachValue((v) => one(this.resolve(space, text(v))));
        }
        const idx = new Map<string, string>();
        for (const n of this.nodes.values()) {
            if (n.space === space) {
                idx.set(normalize(n.key, step), n.id);
            }
        }
        return eachValue((v) => one(idx.get(normalize(v, step))));
    }

    // The rows of one table a step reads, through its `rows` and `except` filters.
    private filtered(step: Step, table: TableName): [Row, number][] {
        const rows = this.rows(this.source(step.source), table) ?? [];
        const k = `${step.source}#${table}`;
        const seen = this.reads.get(k) ?? { src: step.source, table, n: rows.length, read: new Set<number>() };
        this.reads.set(k, seen);
        const out: [Row, number][] = [];
        rows.forEach((r, i) => {
            if (step.rows && !listed(step.rows, r)) {
                return;
            }
            seen.read.add(i);
            if (!step.except || !listed(step.except, r)) {
                out.push([r, i]);
            }
        });
        return out;
    }

    private runStep(s: Step, si: number, st: StepStats): void {
        switch (s.op) {
            case "join.add":
                this.add(s, si, st);
                break;
            case "join.node-values":
                this.nodeValues(s, si, st);
                break;
            case "join.merge":
                if (s.read.table === "edges") {
                    this.mergeRows(s, si, st);
                } else {
                    this.merge(s, si, st);
                }
                break;
            case "join.edges":
                if (s.link === undefined) {
                    this.edgesStep(s, si, st);
                } else {
                    this.linkStep(s, s.link, si, st);
                }
                break;
            default:
                this.edgeValues(s, si, st);
        }
    }

    run(): BuildResult {
        this.input.steps.forEach((s, si) => {
            if (
                s.off === true ||
                stepSources(s, this.input).some((id) => this.unbuildable(id)) ||
                missingColumns(this.input, (copy) => this.copies.get(copy), si).length > 0
            ) {
                return;
            }
            const st = newStats(s, si);
            this.stats.push(st);
            this.runStep(s, si, st);
        });
        this.settleMarks();
        for (const n of this.nodes.values()) {
            settle(n);
        }
        for (const op of this.input.reader ?? []) {
            this.readerResults.push({ id: op.id, applied: this.applyReader(op) });
        }
        for (const n of this.nodes.values()) {
            this.settleTime(n);
        }
        this.countNewTypes();
        this.countEdgeShapes();
        for (const { src, table, n, read } of this.reads.values()) {
            for (let i = 0; i < n; i++) {
                if (!read.has(i) && this.fates.get(src)?.has(`${table}#${i}`) !== true) {
                    this.fate(src, table, i, "left-out:no-step");
                }
            }
        }
        const { nodes, edges, aliases, edgeAliases, stats, issues, fates, readerResults, drill, dropped, duplicate } =
            this;
        return {
            nodes,
            edges,
            aliases,
            edgeAliases,
            spaceNames: this.spaceNames(),
            nodeIds: this.input.nodeIds ?? {},
            stats,
            issues,
            fates,
            readerResults,
            drill,
            dropped,
            ...(duplicate === undefined ? {} : { duplicate }),
        };
    }

    // What a source's own space is spelled by: its source's name, unless another space has that name.
    private spaceNames(): ReadonlyMap<string, string> {
        const taken = new Set([...this.nodes.values()].map((n) => n.space));
        const out = new Map<string, string>();
        for (const src of Object.values(this.input.sources)) {
            const spelled = freeName(namedBy(src), taken);
            taken.add(spelled);
            out.set(ownSpace(src.id), spelled);
        }
        return out;
    }

    // The elements each step made that the graph still holds, by their final type.
    private countNewTypes(): void {
        for (const [els, field] of [
            [this.nodes, "newNodeTypes"],
            [this.edges, "newEdgeTypes"],
        ] as const) {
            for (const el of els.values()) {
                const st = this.madeBy.get(el);
                if (st !== undefined && el.type !== null) {
                    bump(st[field], el.type);
                    this.mark(st, field, { element: el.id, name: el.type });
                }
            }
        }
    }

    // Parallel pairs and self-loops over the final edges, once merges have settled every end; each is
    // credited to the merge that folded one of its ends, else to the step that made it.
    private countEdgeShapes(): void {
        const joined = new Set<string>();
        for (const e of this.edges.values()) {
            const st = this.endFoldedBy.get(e) ?? this.madeBy.get(e);
            const pair = `${e.from}\u0001${e.to}`;
            if (st !== undefined && joined.has(pair)) {
                st.parallelPairs++;
                this.mark(st, "parallelPairs", { element: e.id });
            }
            joined.add(pair);
            if (st !== undefined && e.from === e.to) {
                st.selfLoops++;
                this.mark(st, "selfLoops", { element: e.id });
            }
        }
    }

    // One edge end: the node already built it found (its id), else none, by the space it looks in.
    private end(st: StepStats, space: string, met: string | undefined, at: DrillUnit): void {
        bump(met === undefined ? st.endsMissing : st.endsMeet, space);
        this.mark(
            st,
            met === undefined ? "endsMissing" : "endsMeet",
            met === undefined ? { ...at, name: space } : { ...at, name: space, element: met },
        );
    }

    private bind(op: Extract<ReaderOp, { op: "remove" | "edit" }>): BuiltNode | BuiltEdge | null {
        if (op.node) {
            const id = this.resolve(op.node.space, op.node.key);
            return id === undefined ? null : (this.nodes.get(id) ?? null);
        }
        const id = edgeId(op.edge.load, op.edge.key);
        return this.edges.get(id) ?? this.edges.get(this.edgeAliases.get(id) ?? "") ?? null;
    }

    // 3.2: the reader source's operations, in the order made, after every step; false when unbound.
    private applyReader(op: ReaderOp): boolean {
        if (op.op === "add") {
            if (this.nodes.has(nodeId(READER_SPACE, op.node.key))) {
                return false;
            }
            const n = this.mkNode(READER_SPACE, op.node.key, op.type ?? null);
            n.loads.push(READER_SOURCE);
            for (const [c, v] of Object.entries(op.columns ?? {})) {
                n.values[c] = v;
                n.origin[c] = READER_SOURCE;
            }
            return true;
        }
        if (op.op === "add-edge") {
            return this.readerEdge(op);
        }
        const el = this.bind(op);
        if (!el) {
            if (op.op === "edit") {
                const ref = op.node ?? op.edge;
                this.issues.push({ code: "W_REFERENCE_UNBOUND", params: { ref, edit: op.id } });
            }
            return false;
        }
        if (op.op === "remove") {
            if ("space" in el) {
                this.dropNode(el);
            } else {
                this.dropEdge(el.id);
            }
            return true;
        }
        el.values[op.column] = op.value;
        el.origin[op.column] = READER_SOURCE;
        el.edited ??= {};
        el.edited[op.column] = op;
        return true;
    }

    // A reader edge: its ends bind through live keys and aliases, an end nothing holds is added in the reader space.
    private readerEdge(op: Extract<ReaderOp, { op: "add-edge" }>): boolean {
        const id = edgeId(READER_SOURCE, op.edge.key);
        if (this.edges.has(id)) {
            return false;
        }
        const end = (ref: { space: string; key: string }): BuiltNode => {
            const at = this.resolve(ref.space, ref.key) ?? this.resolve(READER_SPACE, ref.key);
            const met = at === undefined ? undefined : this.nodes.get(at);
            if (met) {
                return met;
            }
            const n = this.mkNode(READER_SPACE, ref.key, null);
            n.loads.push(READER_SOURCE);
            return n;
        };
        const from = end(op.from);
        const to = end(op.to);
        const weight = op.weight ?? null;
        const e: BuiltEdge = {
            id,
            load: READER_SOURCE,
            key: op.edge.key,
            from: from.id,
            to: to.id,
            type: null,
            loads: [READER_SOURCE],
            named: [],
            values: {},
            origin: {},
            own: {},
            touch: [],
            weight,
            weightMeaning: null,
            weightDefault: false,
            time: null,
            timeFrom: null,
        };
        for (const [c, v] of Object.entries(op.columns ?? {})) {
            e.values[c] = v;
            e.origin[c] = READER_SOURCE;
        }
        this.putEdge(e);
        return true;
    }

    // 3.9: when every supplying source reads time from one column, the time comes from the source whose
    // value that column shows (its rule's pick or the reader's pick); a computed value (mean) keeps step order
    private settleTime(n: BuiltNode): void {
        const timed = n.loads.filter((id) => this.input.sources[id]?.mapping.nodes?.time !== undefined);
        const cols = new Set(timed.map((id) => this.input.sources[id].mapping.nodes?.time));
        const [col] = cols;
        if (cols.size !== 1 || col === undefined) {
            return;
        }
        const shown = n.origin[col] as string | undefined;
        const from = shown === READER_SOURCE ? n.edited?.[col]?.picked : shown;
        if (from === undefined || !timed.includes(from)) {
            return;
        }
        const v = n.own[from]?.[col]?.v;
        const t = Array.isArray(v)
            ? null
            : parseTime(
                  v as CellValue | undefined,
                  this.input.sources[from].mapping.nodes?.timeParseZone,
                  this.input.sources[from].mapping.nodes?.timeUnit,
              );
        if (t !== null) {
            n.time = t;
            n.timeFrom = from;
        }
    }

    // ---- join.add (3.4)
    private add(s: AddStep, si: number, st: StepStats): void {
        const src = this.source(s.source);
        const empties = new Map<string, number>();
        const nodeRows = src.mapping.nodes ? this.rows(src, "nodes") : null;
        const seen = new Set<string>();
        // a source with no key column keys its node rows by their content (spec 6.1)
        const keyless = nodeRows && src.mapping.nodes?.key === undefined ? keylessNodeKeys(nodeRows) : [];
        const moved = this.movedOff(s.source, "nodes");
        nodeRows?.forEach((r, i) => {
            this.addNodeRow(s, src, { si, st, seen, empties, keyless, moved }, r, i);
        });
        const key = src.mapping.nodes?.key;
        if (nodeRows && key !== undefined) {
            st.repeated2 = this.keys(
                st,
                "repeated2",
                repeats(
                    nodeRows.flatMap((r, i) => {
                        if (isEmpty(r[key])) {
                            return [];
                        }
                        const unit = { table: "nodes", row: i, element: nodeId(nodeSpace(src), text(r[key])) } as const;
                        return [[text(r[key]), unit] as const];
                    }),
                ),
            );
        }
        this.addEdges(s, si, st, src, empties);
        this.reportEmpty(s.source, empties);
    }

    // Whether a column of a row is carried by a node one of the source's other steps reads it onto: a row
    // whose own cell names no such node keeps it.
    private movedOff(source: string, table: TableName): (row: Row, column: string) => boolean {
        interface Move {
            readonly names: (row: Row) => boolean;
            readonly columns: ReadonlySet<string>;
        }
        const on = this.input.steps.filter((o) => o.source === source && o.off !== true);
        const moves = on.flatMap((o): Move[] => {
            if (o.op === "join.edges" && (o.read.table ?? "edges") === table) {
                const { extract, read } = o;
                return extract?.columns === undefined || read.target === undefined
                    ? []
                    : [{ names: (row) => makesNode(o, row), columns: new Set(extract.columns) }];
            }
            if (table !== "edges" || o.op !== "join.node-values" || (o.read.table ?? "nodes") !== table) {
                return [];
            }
            const { key, space } = o.read;
            // the nodes an Extract makes of the same column: a row it leaves out makes none
            const made = on.find(
                (e): e is EdgesStep => e.op === "join.edges" && e.read.target === key && e.read.targetSpace === space,
            );
            return [
                {
                    names: (row) => (made === undefined ? !isEmpty(row[key]) : makesNode(made, row)),
                    columns: new Set(o.columns),
                },
            ];
        });
        return (row, column) => moves.some((m) => m.columns.has(column) && m.names(row));
    }

    private addNodeRow(
        s: AddStep,
        src: Source,
        at: {
            si: number;
            st: StepStats;
            seen: Set<string>;
            empties: Map<string, number>;
            keyless: readonly string[];
            moved: (row: Row, column: string) => boolean;
        },
        r: Row,
        i: number,
    ): void {
        const m = src.mapping.nodes ?? {};
        const { st, si } = at;
        const key = m.key === undefined ? at.keyless[i] : r[m.key];
        if (isEmpty(key)) {
            st.emptyKey++;
            this.mark(st, "emptyKey", { table: "nodes", row: i });
            at.empties.set(m.key ?? "", (at.empties.get(m.key ?? "") ?? 0) + 1);
            this.fate(s.source, "nodes", i, "left-out:empty-key");
            return;
        }
        const space = nodeSpace(src);
        const met = this.resolve(space, text(key));
        // A row whose key names a node an earlier step built meets it, as an edge end does.
        if (met !== undefined && !at.seen.has(met)) {
            this.end(st, space, met, { table: "nodes", row: i });
        }
        const n = this.node(space, text(key), { source: s.source }, r, st) as BuiltNode;
        const repeat = at.seen.has(n.id);
        at.seen.add(n.id);
        // `refuse` never meets a repeat here (the load refused it), so it keeps the first as `first` does:
        // the row is left out, its node keeping the first row's values
        if (repeat && (s.duplicateIds ?? src.settings?.duplicateIds ?? "first") !== "merge") {
            this.fate(s.source, "nodes", i, "left-out:repeated-key", n.id);
            return;
        }
        this.touch(n, s, si, "nodes", r, i);
        supply(n, s.source);
        n.brought ??= new Set();
        n.brought.add(s.source);
        const roles = new Set(Object.values(m).filter((v): v is string => typeof v === "string"));
        const brings = (c: string): boolean => !at.moved(r, c) && (!s.columns || s.columns.includes(c));
        for (const [c, v] of Object.entries(r).filter(([c]) => brings(c) || roles.has(c))) {
            if (!repeat || isEmpty(n.own[s.source]?.[c]?.v)) {
                this.write(n, c, v, { src: s.source, si, row: i, step: s, st });
            }
        }
        if (m.time !== undefined && n.time === null) {
            n.time = parseTime(r[m.time], m.timeParseZone, m.timeUnit);
            n.timeFrom = n.time === null ? null : s.source;
        }
    }

    private addEdges(s: AddStep, si: number, st: StepStats, src: Source, empties: Map<string, number>): void {
        const m = src.mapping.edges;
        const rows = m ? this.rows(src, "edges") : null;
        if (!m || !rows) {
            return;
        }
        // columns another step of this source moves onto nodes stay off the edges (3.3)
        const moved = this.movedOff(s.source, "edges");
        const sSpace = m.sourceSpace ?? ownSpace(src.id);
        const tSpace = m.targetSpace ?? ownSpace(src.id);
        const how = src.settings?.unmatched ?? "add";
        const own = src.mapping.nodes === undefined ? null : nodeSpace(src);
        const named = new Set<BuiltNode>();
        const keyless = keylessEdgeKeys(rows, m);
        rows.forEach((r, i) => {
            const a = r[m.source];
            const b = r[m.target];
            if (isEmpty(a) || isEmpty(b)) {
                const column = isEmpty(a) ? m.source : m.target;
                st.emptyKey++;
                this.mark(st, "emptyKey", { table: "edges", row: i });
                empties.set(column, (empties.get(column) ?? 0) + 1);
                this.fate(s.source, "edges", i, "left-out:empty-end");
                return;
            }
            const here = { table: "edges", row: i } as const;
            this.end(st, sSpace, this.resolve(sSpace, text(a)), here);
            const na = this.node(sSpace, text(a), { source: s.source, end: "source" }, r, st, how);
            this.end(st, tSpace, this.resolve(tSpace, text(b)), here);
            const nb = this.node(tSpace, text(b), { source: s.source, end: "target" }, r, st, how);
            for (const n of [na, nb]) {
                if (n?.space === own) {
                    named.add(n);
                }
            }
            if (!na || !nb) {
                st.unmatched++;
                this.mark(st, "unmatched", here);
                this.fate(s.source, "edges", i, "left-out:unmatched");
                return;
            }
            reach(na, s.source);
            reach(nb, s.source);
            const id = m.edgeId === undefined ? undefined : r[m.edgeId];
            const key = isEmpty(id) ? (keyless[i] as string) : text(id);
            const values = Object.entries(r).filter(([c]) => !moved(r, c) && (!s.columns || s.columns.includes(c)));
            this.addEdge(s, si, st, {
                load: s.source,
                key,
                from: na,
                to: nb,
                row: r,
                index: i,
                values,
                ctx: { source: s.source },
                roles: m,
                table: "edges",
                ends: { source: m.source, target: m.target },
            });
        });
        const only = [...named].filter((n) => !n.touch.some((t) => t.source === s.source && t.table === "nodes"));
        for (const n of only) {
            this.mark(st, "namedOnly", { element: n.id });
        }
        st.namedOnly = only.length;
    }

    // ---- join.node-values (3.4)
    private nodeValues(s: NodeValuesStep, si: number, st: StepStats): void {
        const src = this.source(s.source);
        const table = s.read.table ?? "nodes";
        const look = this.lookupIn(s, s.read.space);
        const rows = this.filtered(s, table);
        const roles = new Set<string>([s.read.key]);
        for (const v of Object.values(src.mapping[table] ?? {})) {
            if (typeof v === "string") {
                roles.add(v);
            }
        }
        let empty = 0;
        const keys: (readonly [string, DrillUnit])[] = [];
        const fanned = new Map<string, DrillUnit>();
        for (const [r, i] of rows) {
            if (isEmpty(r[s.read.key])) {
                empty++;
                this.mark(st, "emptyKey", { table, row: i });
                continue;
            }
            const k = text(r[s.read.key]);
            const unit: { table: TableName; row: number; element?: string } = { table, row: i };
            keys.push([k, unit]);
            const fans = st.fanOut;
            const n = this.nodeValuesTarget(s, st, look, r, i);
            if (st.fanOut > fans) {
                fanned.set(k, fanned.get(k) ?? { table, row: i });
            }
            if (!n) {
                continue;
            }
            unit.element = n.id;
            st.matched++;
            this.mark(st, "matched", { table, row: i, element: n.id });
            this.touch(n, s, si, table, r, i);
            supply(n, s.source);
            for (const c of s.columns ?? Object.keys(r).filter((c) => !roles.has(c))) {
                this.write(n, c, r[c], { src: s.source, si, row: i, step: s, st });
            }
        }
        st.emptyKey += empty;
        st.repeated1 = this.keys(st, "repeated1", fanned);
        st.repeated2 = this.keys(st, "repeated2", repeats(keys));
        this.reportEmpty(s.source, new Map(empty > 0 ? [[s.read.key, empty]] : []));
        if (table === "edges") {
            st.hub.push(...hubs(rows, s.read.key));
        }
    }

    // The node a join.node-values row writes to, or null when it is left out.
    private nodeValuesTarget(s: NodeValuesStep, st: StepStats, look: Lookup, r: Row, i: number): BuiltNode | null {
        const table = s.read.table ?? "nodes";
        const v = r[s.read.key];
        const ids = look(v);
        if (ids.length > 1) {
            st.fanOut++;
            this.mark(st, "fanOut", { table, row: i });
            this.fate(s.source, table, i, "left-out:fan-out");
            return null;
        }
        let n = ids.length === 1 ? (this.nodes.get(ids[0]) ?? null) : null;
        if (!n && (s.unmatchedRows ?? "leave-out") === "add" && byKey(s)) {
            n = this.node(s.read.space, text(v), { source: s.source }, r, st);
        }
        if (!n) {
            st.unmatched++;
            this.mark(st, "unmatched", { table, row: i });
            this.fate(s.source, table, i, "left-out:unmatched");
        }
        return n;
    }

    // ---- join.edges (3.4, 3.6)
    private edgesStep(s: EdgesStep, si: number, st: StepStats): void {
        const src = this.source(s.source);
        const table = s.read.table ?? "edges";
        const rd = s.read;
        const rows = this.filtered(s, table);
        const values = rows.flatMap(([r, i]) => endCells(s, r, "target").map((each): [Row, number] => [each, i]));
        for (const hub of rd.target === undefined ? [] : hubs(values, rd.target)) {
            st.hub.push(hub);
            this.issues.push({ code: "W_VALUE_HUB", params: { source: s.source, column: rd.target ?? "", ...hub } });
        }
        const tr = this.endLookups(s);
        const empties = new Map<string, number>();
        const loose = s.ignoreCase === true || s.ignoreSpaces === true ? new Map<string, Map<string, string>>() : null;
        // keyless rows count over every row of the table, read by this step or not (spec 4.1.8 rule 3)
        const keyless = s.rowNode === undefined ? keylessEdgeKeys(this.rows(src, table) ?? [], bothEnds(rd)) : [];
        const rowNode = s.rowNode === undefined ? null : this.rowNodes(s, si, st, src);
        const held = s.existing === "merge" ? { byPair: this.edgesByPair(), folded: new Set<string>() } : undefined;
        const asNodes = new Map<number, EndHit>();
        for (const [r, i] of rows) {
            const here = { table, row: i };
            const row = rowNode?.(r, i);
            asNodes.set(i, row?.hit ?? { miss: "left-out:unmatched" });
            const ends = (end: "source" | "target"): EndHit[] =>
                s.rowNode === end && row
                    ? [row.hit]
                    : endCells(s, r, end).flatMap((each) => this.edgeEnds(s, st, tr, each, end, loose, here));
            const as = ends("source");
            const bs = ends("target");
            const many = s.extract === undefined && as.length * bs.length > 1;
            // ponytail: a keyless row naming several nodes by a list is keyed by its place; key it by content if
            // references to such edges must survive a re-sorted refresh
            const key = row?.key ?? keyless[i] ?? (many ? String(i) : undefined);
            const at = { s, si, st, src, table, row: r, index: i, key, many, held };
            const middle = s.rowNode === "middle" ? row?.hit : undefined;
            const made = this.rowEdges(at, as, bs, middle);
            bs.forEach((each) => {
                this.fillExtracted(at, each);
            });
            // a cell of several values counts its row once
            const a = as.find((each) => "n" in each) ?? as[0];
            const b = bs.find((each) => "n" in each) ?? bs[0];
            const misses = [a, b, middle].map((x) => (x && "miss" in x ? x.miss : null));
            this.countEdgeRow(at, misses, made, empties, this.rowAsNode(s, row?.hit, a, b, src, r));
        }
        st.mergedEdges = held?.folded.size ?? 0;
        this.reportEmpty(s.source, empties);
        this.dropUnlinked(s, st, src, rows, asNodes);
    }

    // The node a row is of itself: the step's own (`rowNode`), or the end its key names.
    private rowAsNode(
        s: EdgesStep,
        own: EndHit | undefined,
        a: EndHit | undefined,
        b: EndHit | undefined,
        src: Source,
        r: Row,
    ): EndHit | undefined {
        if (own !== undefined || s.read.table !== "nodes") {
            return own;
        }
        const n = this.ownNode(src, r);
        return n !== undefined && [a, b].some((end) => end !== undefined && "n" in end && end.n === n)
            ? { n }
            : undefined;
    }

    // The node a row of a source's node rows is, by its key.
    private ownNode(src: Source, r: Row): BuiltNode | undefined {
        const key = src.mapping.nodes?.key;
        const id = key === undefined || isEmpty(r[key]) ? undefined : this.resolve(nodeSpace(src), text(r[key]));
        return id === undefined ? undefined : this.nodes.get(id);
    }

    // Whether a node is the step's to take out: no other source's row is it, and a join made it or
    // `unlinked` takes out the ones the graph held before too.
    private mayTakeOut(s: EdgesStep, n: BuiltNode): boolean {
        const joined =
            s.unlinked === "remove" ||
            !this.input.steps.some(
                (o) => o.op === "join.add" && o.source === s.source && o.joined !== true && o.off !== true,
            );
        return joined && n.loads.every((id) => id === s.source);
    }

    // Takes out the node of each row no edge of any step reaches: under `unlinked: "drop"` only one a join
    // made, under `"remove"` one the graph held before too.
    private dropUnlinked(
        s: EdgesStep,
        st: StepStats,
        src: Source,
        rows: readonly [Row, number][],
        asNodes: ReadonlyMap<number, EndHit>,
    ): void {
        for (const [r, i] of s.unlinked === undefined ? [] : rows) {
            const hit = asNodes.get(i);
            const n = hit && "n" in hit ? hit.n : this.ownNode(src, r);
            const held = n !== undefined && this.nodes.has(n.id) && (this.edgesAt.get(n.id)?.size ?? 0) === 0;
            if (!held || !this.mayTakeOut(s, n)) {
                continue;
            }
            this.takeOut(st, n);
            this.unmake(n);
            // built by the source's add, and now by nothing
            this.fates.get(s.source)?.set(`${s.read.table ?? "edges"}#${i}`, {
                fate: "left-out:unmatched",
                elements: [],
            });
        }
    }

    // One join.edges row counted: matched, or the first thing its ends missed.
    private countEdgeRow(
        at: EdgeRow,
        misses: readonly (EndMiss | null)[],
        made: readonly string[],
        empties: Map<string, number>,
        asNode: EndHit | undefined,
    ): void {
        const { s, st, table, index } = at;
        const here = { table, row: index };
        // an empty end counts first, then fan-out, then unmatched
        const miss = MISS_ORDER.find((m) => misses.includes(m));
        if (miss === undefined) {
            st.matched++;
            this.mark(st, "matched", { ...here, element: made[0] });
            return;
        }
        const empty = { 0: s.read.source, 1: s.read.target }[misses.indexOf("left-out:empty-end")];
        // a row the step or its source keeps as a node is that node, linked to nothing
        const kept = asNode !== undefined && "n" in asNode ? { element: asNode.n.id } : {};
        this.countMiss(st, miss, empty ?? at.src.mapping.nodes?.key ?? "", empties, { ...here, ...kept });
        this.fate(s.source, table, index, miss);
    }

    // The edges one join.edges row makes, by id: one between its ends, or, a row kept as a node
    // between them (`middle`), one to each end it names.
    private rowEdges(at: EdgeRow, as: readonly EndHit[], bs: readonly EndHit[], middle: EndHit | undefined): string[] {
        const { s, src, row } = at;
        const rd = s.read;
        const halves: [RowHalf | null, EndHit, EndHit][] =
            middle === undefined
                ? as.flatMap((a) => bs.map((b): [null, EndHit, EndHit] => [null, a, b]))
                : [
                      ...as.map((a): [RowHalf, EndHit, EndHit] => ["source", a, middle]),
                      ...bs.map((b): [RowHalf, EndHit, EndHit] => ["target", middle, b]),
                  ];
        const skip = new Set([rd.source, rd.target]);
        const cols = s.columns ?? Object.keys(row).filter((c) => !skip.has(c));
        const out: string[] = [];
        for (const [half, from, to] of halves) {
            if ("miss" in from || "miss" in to) {
                continue;
            }
            reach(from.n, s.source);
            reach(to.n, s.source);
            const made = this.addEdge(s, at.si, at.st, {
                load: s.source,
                key: edgeStepKey(at, from.n, to.n, half),
                from: from.n,
                to: to.n,
                row,
                index: at.index,
                values: cols.map((c) => [c, row[c]]),
                ctx: { source: s.source, part: s.part },
                roles: src.mapping[at.table] ?? {},
                read: rd,
                table: at.table,
                ends: endColumns(half === "target" ? undefined : rd.source, half === "source" ? undefined : rd.target),
                repeated: s.repeated,
                ...(at.held === undefined ? {} : { held: at.held }),
            });
            out.push(made);
        }
        return out;
    }

    // The columns an Extract's new node carries, from a row naming it.
    private fillExtracted(at: EdgeRow, hit: EndHit): void {
        const columns = at.s.extract?.columns ?? [];
        if ("miss" in hit || columns.length === 0) {
            return;
        }
        const { s, si, st, row, index } = at;
        this.touch(hit.n, s, si, at.table, row, index, { valued: true });
        supply(hit.n, s.source);
        for (const c of columns) {
            this.write(hit.n, c, row[c], { src: s.source, si, row: index, step: s, st });
        }
    }

    // ---- join.edges that links nodes sharing a value (3.4)
    private linkStep(s: EdgesStep, link: LinkRead, si: number, st: StepStats): void {
        const src = this.source(s.source);
        const table = s.read.table ?? "edges";
        const at = {
            s,
            si,
            st,
            src,
            table,
            link,
            linked: new Map<number, string>(),
            linkedNodes: new Set<BuiltNode>(),
        };
        const rows = link.of === "nodes" ? [] : this.filtered(s, table);
        const holding = link.of === "nodes" ? this.nodeValuesHeld(at) : null;
        const { values, left } = holding ?? this.sharedValues(at, rows);
        const used: SharedValue[] = [];
        for (const value of values) {
            if (value.holders.size > link.maxShared) {
                this.linkHub(at, value);
            } else if (value.holders.size > 1) {
                used.push(value);
            }
        }
        if (link.as === "nodes") {
            this.linkNodes(at, used);
        } else {
            this.linkPairs(at, used);
        }
        const held = new Set(holding?.values.flatMap((value) => [...value.holders.keys()]));
        for (const n of held) {
            const count = at.linkedNodes.has(n) ? "matched" : "unmatched";
            st[count]++;
            this.mark(st, count, { element: n.id });
        }
        const empties = new Map<string, number>();
        for (const [r, i] of rows) {
            const here: DrillUnit = { table, row: i };
            if (at.linked.has(i)) {
                st.matched++;
                this.mark(st, "matched", { ...here, element: at.linked.get(i) });
            } else {
                // a row whose value is shared with no other node, or with too many
                const miss = left.get(i) ?? "left-out:unmatched";
                const empty = [s.read.source, ...link.columns].find((c) => c !== undefined && isEmpty(r[c]));
                this.countMiss(st, miss, empty ?? src.mapping.nodes?.key ?? "", empties, here);
                this.fate(s.source, table, i, miss);
            }
        }
        this.reportEmpty(s.source, empties);
    }

    // A value too many nodes hold to link them.
    private linkHub({ s, st, table }: LinkAt, value: SharedValue): void {
        const hub = { value: text(value.given), rows: [...value.holders.values()].flat().length };
        st.hub.push(hub);
        for (const [n, [{ index }]] of value.holders) {
            const row = index === NO_ROW ? {} : { table, row: index };
            this.mark(st, "hub", { ...row, element: n.id, key: hub.value, name: value.column });
        }
        this.issues.push({ code: "W_VALUE_HUB", params: { source: s.source, column: value.column, ...hub } });
    }

    // Each value of a link's columns with the nodes holding it, and the rows that hold none.
    private sharedValues(
        at: LinkAt,
        rows: readonly [Row, number][],
    ): { values: readonly SharedValue[]; left: ReadonlyMap<number, EndMiss> } {
        const { s, st, src, table, link } = at;
        const tr = this.endLookups(s);
        const loose = s.ignoreCase === true || s.ignoreSpaces === true ? new Map<string, Map<string, string>>() : null;
        const rowNode = s.rowNode === undefined ? null : this.rowNodes(s, at.si, st, src);
        const values = new Map<string, SharedValue>();
        const left = new Map<number, EndMiss>();
        for (const [r, i] of rows) {
            const holder = rowNode?.(r, i).hit ?? this.edgeEnd(s, st, tr, r, "source", loose, { table, row: i });
            const cells = link.columns.flatMap((column) =>
                cellValues(r[column]).map((v) => ({ column, given: v, compared: normalize(v, s) })),
            );
            const full = cells.filter((each) => each.compared !== "");
            if ("miss" in holder || full.length === 0) {
                left.set(i, "miss" in holder ? holder.miss : "left-out:empty-end");
                continue;
            }
            for (const { column, given, compared } of full) {
                const k = `${column}\u0001${compared}`;
                const value = values.get(k) ?? { column, given, holders: new Map<BuiltNode, LinkRow[]>() };
                values.set(k, value);
                value.holders.set(holder.n, [...(value.holders.get(holder.n) ?? []), { row: r, index: i }]);
            }
        }
        return { values: [...values.values()], left };
    }

    // Each value of a link's columns the nodes of its space carry, as built so far, read from no row.
    private nodeValuesHeld(at: LinkAt): {
        values: readonly SharedValue[];
        left: ReadonlyMap<number, EndMiss>;
    } {
        const { s, link } = at;
        const values = new Map<string, SharedValue>();
        for (const n of this.nodes.values()) {
            // a node is left out by its key, the only thing a link over nodes lists it by
            const out = s.except !== undefined && listed({ ...s.except, column: "key" }, { key: n.key });
            for (const column of n.space === s.read.sourceSpace && !out ? link.columns : []) {
                for (const given of cellValues(n.values[column]).filter((v) => !isEmpty(v))) {
                    const k = `${column}\u0001${normalize(given, s)}`;
                    const value = values.get(k) ?? { column, given, holders: new Map<BuiltNode, LinkRow[]>() };
                    values.set(k, value);
                    value.holders.set(n, [{ row: {}, index: NO_ROW }]);
                }
            }
        }
        return { values: [...values.values()], left: new Map() };
    }

    // One edge per pair of nodes sharing at least `minShared` values, with the count in `shared`.
    // ponytail: pairs per value are quadratic in its holders, bounded by maxShared.
    private linkPairs(at: LinkAt, used: readonly SharedValue[]): void {
        // an edge runs from the node built earlier, as the graph orders them
        const place = new Map([...this.nodes.values()].map((n, i) => [n, i]));
        const of = (n: BuiltNode): number => place.get(n) ?? 0;
        const pairs = new Map<string, { a: BuiltNode; b: BuiltNode; count: number; rows: Map<number, Row> }>();
        for (const { holders } of used) {
            const all = [...holders].sort(([a], [b]) => of(a) - of(b));
            all.forEach(([a, rowsA], n) => {
                for (const [b, rowsB] of all.slice(n + 1)) {
                    const k = `${String(of(a))}|${String(of(b))}`;
                    const pair = pairs.get(k) ?? { a, b, count: 0, rows: new Map<number, Row>() };
                    pairs.set(k, pair);
                    pair.count++;
                    [...rowsA, ...rowsB].forEach(({ row, index }) => pair.rows.set(index, row));
                }
            });
        }
        for (const { a, b, count, rows } of pairs.values()) {
            if (count < at.link.minShared) {
                at.st.pairsBelowMin++;
                this.mark(at.st, "pairsBelowMin", { key: `${a.key}|${b.key}`, pair: [a.id, b.id] });
            } else {
                this.linkEdge(at, a, b, [["shared", count]], rows);
            }
        }
    }

    // One node per shared value, with an edge to it from each node holding it.
    private linkNodes(at: LinkAt, used: readonly SharedValue[]): void {
        const { s, si, st, table } = at;
        const space = s.read.targetSpace ?? ownSpace(s.source);
        for (const { column, given, holders } of used) {
            const ctx = { source: s.source, part: s.part, end: "target" as const };
            const [[first]] = holders.values();
            const n = this.node(space, `${column}:${text(given)}`, ctx, first.row, st);
            if (n === null) {
                continue;
            }
            supply(n, s.source);
            for (const [holder, rows] of holders) {
                for (const { row, index } of rows) {
                    this.touch(n, s, si, table, row, index, { valued: true });
                }
                this.linkEdge(at, holder, n, [], new Map(rows.map((each) => [each.index, each.row])));
            }
            this.write(n, column, given, { src: s.source, si, row: first.index, step: s, st });
        }
    }

    // One edge of a link, read from every row that makes it.
    private linkEdge(
        at: LinkAt,
        from: BuiltNode,
        to: BuiltNode,
        values: [string, CellValue | undefined][],
        rows: ReadonlyMap<number, Row>,
    ): void {
        const { s, si, st, src, table } = at;
        const [[index, row], ...others] = rows;
        const key = `${s.part}/${escapeKey(from.key)}|${escapeKey(to.key)}`;
        // a link over nodes lists its edges by their keys, so an edge is left out by its key too
        if (at.link.of === "nodes" && s.except !== undefined && listed({ ...s.except, column: "key" }, { key })) {
            return;
        }
        reach(from, s.source);
        reach(to, s.source);
        const id = this.addEdge(s, si, st, {
            load: s.source,
            key,
            from,
            to,
            row,
            index,
            values,
            ctx: { source: s.source, part: s.part },
            roles: src.mapping[table] ?? {},
            read: s.read,
            table,
            ends: endColumns(undefined, undefined),
        });
        const e = this.edges.get(id);
        for (const [i, r] of others) {
            if (e !== undefined) {
                this.touch(e, s, si, table, r, i);
            }
        }
        for (const i of rows.keys()) {
            at.linked.set(i, at.linked.get(i) ?? id);
        }
        at.linkedNodes.add(from).add(to);
    }

    // Every edge built so far, by its end pair, in build order.
    private edgesByPair(): Map<string, BuiltEdge[]> {
        const out = new Map<string, BuiltEdge[]>();
        for (const e of this.edges.values()) {
            const pair = `${e.from}\u0001${e.to}`;
            const list = out.get(pair);
            if (list) {
                list.push(e);
            } else {
                out.set(pair, [e]);
            }
        }
        return out;
    }

    // Each row of a step as a node (`rowNode`): the node the source's `join.add` made of it, else one
    // the step makes, with every column of the row.
    private rowNodes(s: EdgesStep, si: number, st: StepStats, src: Source): (r: Row, i: number) => RowNode {
        const table = s.read.table ?? "edges";
        const column = table === "nodes" ? src.mapping.nodes?.key : undefined;
        const keyless = column === undefined ? keylessNodeKeys(this.rows(src, table) ?? []) : [];
        const space = rowNodeSpace(src, table);
        const added =
            table === "nodes" &&
            this.input.steps.slice(0, si).some((o) => o.op === "join.add" && o.source === s.source && o.off !== true);
        const times = new Map<string, number>();
        return (r, i) => {
            const key = column === undefined ? keyless[i] : text(r[column]);
            if (key === "") {
                return { key, hit: { miss: "left-out:empty-end" } };
            }
            // two rows of one key are one node, with an edge each
            const n = (times.get(key) ?? 0) + 1;
            times.set(key, n);
            const named = n === 1 ? key : `${key}#${String(n)}`;
            const ctx = { source: s.source, part: s.part };
            const node = this.node(space, key, ctx, r, st, added ? "leave-out" : "add");
            if (node === null) {
                return { key: named, hit: { miss: "left-out:unmatched" } };
            }
            if (!added) {
                this.fillRowNode(node, s, si, st, src.mapping[table] ?? {}, r, i);
            }
            return { key: named, hit: { n: node } };
        };
    }

    // A node a step makes of a row takes every column of it, and its time.
    private fillRowNode(
        node: BuiltNode,
        s: EdgesStep,
        si: number,
        st: StepStats,
        roles: EdgeRole,
        r: Row,
        i: number,
    ): void {
        this.touch(node, s, si, s.read.table ?? "edges", r, i);
        supply(node, s.source);
        for (const [c, v] of Object.entries(r)) {
            this.write(node, c, v, { src: s.source, si, row: i, step: s, st });
        }
        if (typeof roles.time === "string" && node.time === null) {
            node.time = parseTime(r[roles.time], roles.timeParseZone, roles.timeUnit);
            node.timeFrom = node.time === null ? null : s.source;
        }
    }

    private countMiss(
        st: StepStats,
        miss: RowFateKind,
        column: string,
        empties: Map<string, number>,
        at: DrillUnit,
    ): void {
        if (miss === "left-out:empty-end") {
            st.emptyKey++;
            this.mark(st, "emptyKey", at);
            empties.set(column, (empties.get(column) ?? 0) + 1);
        } else if (miss === "left-out:fan-out") {
            st.fanOut++;
            this.mark(st, "fanOut", at);
        } else {
            st.unmatched++;
            this.mark(st, "unmatched", at);
        }
    }

    // The nodes one end of a join.edges row reaches: one, or, under `fanOut: "each"`, each its value names.
    private edgeEnds(
        s: EdgesStep,
        st: StepStats,
        tr: EndLookups,
        r: Row,
        which: "source" | "target",
        loose: Map<string, Map<string, string>> | null,
        at: DrillUnit,
    ): EndHit[] {
        const column = s.read[which];
        const look = tr[which];
        if (s.fanOut === "each" && look && column !== undefined) {
            const met = look(r[column]).flatMap((id) => this.nodes.get(id) ?? []);
            if (met.length > 1) {
                for (const n of met) {
                    this.end(st, n.space, n.id, at);
                }
                return met.map((n) => ({ n }));
            }
        }
        return [this.edgeEnd(s, st, tr, r, which, loose, at)];
    }

    // The node one end of a join.edges row reaches, through `via` on `viaEnd`; under `ignoreCase` or
    // `ignoreSpaces` an end meets the node of its space whose key compares equal, kept per space in `loose`.
    private edgeEnd(
        s: EdgesStep,
        st: StepStats,
        tr: EndLookups,
        r: Row,
        which: "source" | "target",
        loose: Map<string, Map<string, string>> | null,
        at: DrillUnit,
    ): EndHit {
        const [column, space] =
            which === "source" ? [s.read.source, s.read.sourceSpace] : [s.read.target, s.read.targetSpace];
        const v = column === undefined ? undefined : r[column];
        if (isEmpty(v) || space === undefined) {
            return { miss: "left-out:empty-end" };
        }
        const look = tr[which];
        if (look) {
            const ids = look(v);
            if (ids.length > 1) {
                return { miss: "left-out:fan-out" };
            }
            const n = ids.length === 1 ? this.nodes.get(ids[0]) : this.namedByColumn(s, st, r, which, space);
            this.end(st, n?.space ?? space, n?.id, at);
            return n ? { n } : { miss: "left-out:unmatched" };
        }
        const how = this.unmatchedEnd(s, which);
        const idx = loose === null ? null : this.looseKeys(loose, space, s);
        const key = idx?.get(normalize(v, s)) ?? text(v);
        this.end(st, space, this.resolve(space, key), at);
        const n = this.node(space, key, { source: s.source, part: s.part, end: which }, r, st, how);
        if (n && idx && !idx.has(normalize(v, s))) {
            idx.set(normalize(v, s), n.key);
        }
        return n ? { n } : { miss: "left-out:unmatched" };
    }

    // The node an end looked up by a column of its nodes makes of a value none of them holds: keyed by the
    // value and holding it in that column, so a later row of the value is the same node. None when the end
    // adds no nodes, or a node has that key already.
    private namedByColumn(
        s: EdgesStep,
        st: StepStats,
        r: Row,
        which: "source" | "target",
        space: string,
    ): BuiltNode | undefined {
        const at = s.read[which];
        // Through a source's rows (`via`), the column is the one its value is found in there.
        const viaColumn = s.via === undefined ? undefined : s.mapping?.columns[0];
        const column = (s.viaEnd ?? "target") === which ? (s.nodeColumn ?? viaColumn) : s.otherColumn;
        if (at === undefined || column === undefined || this.unmatchedEnd(s, which) !== "add") {
            return undefined;
        }
        const v = r[at] ?? "";
        const made = `${which}\u0001${normalize(v, s)}`;
        const byValue = this.columnEnds.get(s) ?? new Map<string, BuiltNode>();
        this.columnEnds.set(s, byValue);
        const met = byValue.get(made);
        if (met !== undefined || this.resolve(space, text(v)) !== undefined) {
            return met;
        }
        const n = this.node(space, text(v), { source: s.source, part: s.part, end: which }, r, st, "add");
        if (n !== null) {
            n.values[column] = v;
            n.origin[column] = s.source;
            n.own[s.source] = { ...n.own[s.source], [column]: { v, step: st.step, row: 0 } };
            byValue.set(made, n);
        }
        return n ?? undefined;
    }

    // What an end's value naming no node does: the end the step adds nodes at, else what the step or its source says.
    private unmatchedEnd(s: EdgesStep, which: "source" | "target"): "add" | "leave-out" {
        return s.addEnd === which ? "add" : (s.unmatchedRows ?? this.source(s.source).settings?.unmatched ?? "add");
    }

    // Each node key of a space, by its compared form, built once per step.
    private looseKeys(loose: Map<string, Map<string, string>>, space: string, o: MatchOptions): Map<string, string> {
        let idx = loose.get(space);
        if (!idx) {
            idx = new Map();
            for (const n of this.nodes.values()) {
                if (n.space === space && !idx.has(normalize(n.key, o))) {
                    idx.set(normalize(n.key, o), n.key);
                }
            }
            loose.set(space, idx);
        }
        return idx;
    }

    // ---- join.edge-values (3.4)
    private edgeValues(s: EdgeValuesStep, si: number, st: StepStats): void {
        const table = s.read.table ?? "edges";
        const rows = this.filtered(s, table);
        st.repeated2 = this.keys(
            st,
            "repeated2",
            repeats(
                rows
                    .filter(([r]) => !isEmpty(r[s.read.edgeId]))
                    .map(([r, i]) => {
                        const id = edgeId(s.edges, text(r[s.read.edgeId]));
                        return [
                            text(r[s.read.edgeId]),
                            { table, row: i, ...(this.edges.has(id) ? { element: id } : {}) },
                        ];
                    }),
            ),
        );
        for (const [r, i] of rows) {
            const e = this.edges.get(edgeId(s.edges, text(r[s.read.edgeId])));
            if (!e) {
                st.unmatched++;
                this.mark(st, "unmatched", { table, row: i });
                this.fate(s.source, table, i, "left-out:unmatched");
                continue;
            }
            st.matched++;
            this.mark(st, "matched", { table, row: i, element: e.id });
            this.touch(e, s, si, table, r, i);
            supply(e, s.source);
            for (const c of s.columns ?? Object.keys(r).filter((c) => c !== s.read.edgeId)) {
                this.write(e, c, r[c], { src: s.source, si, row: i, step: s, st });
            }
        }
    }

    // One edge, keyed { load, key }, reduced by the step's `repeated`, else the graph's repeatedEdges (3.4, 3.8);
    // returns the id of the edge the row went into.
    private addEdge(step: Step, si: number, st: StepStats, a: EdgeArgs): string {
        const id = edgeId(a.load, a.key);
        const { w, meaning, weightDefault, timeCol } = edgeRoles(a);
        const existing = this.edges.get(id);
        if (existing) {
            this.repeatEdge(existing, step, si, st, a, timeCol);
            return existing.id;
        }
        const policy = a.repeated === undefined ? (this.input.repeatedEdges ?? "keep") : "keep";
        const type = typeOf(this.types, "edge", a.ctx, a.row);
        const into = heldEdge(a, type);
        if (into) {
            this.foldEdgeRow(into, id, step, si, st, a, timeCol);
            return into.id;
        }
        // 3.8, 8.6: edges of different types never reduce; meanings matter only to a combining rule
        const byMeaning = policy !== "first" && policy !== "last" && policy !== "error";
        const pairKey = (m: string | null): string => JSON.stringify([a.from.id, a.to.id, type, byMeaning ? m : null]);
        if (policy !== "keep") {
            // ponytail: the pair index is not updated by later merges; fine for reductions inside the adds that make the pairs
            const twin = this.edges.get(this.pairs.get(pairKey(meaning)) ?? "");
            if (twin && policy === "error") {
                // the build stays whole for a preview; a commit refuses it (E_DUPLICATE_EDGE)
                this.duplicate ??= { from: a.from.id, to: a.to.id, repeat: a.row };
            } else if (twin) {
                // reduced across rows or sources: every contributing source supplies it, the row's key is an alias
                supply(twin, a.load);
                this.touch(twin, step, si, a.table, a.row, a.index);
                this.edgeAliases.set(id, twin.id);
                span(twin, a, timeCol);
                reduceWeight(twin, policy, w, meaning, weightDefault);
                return twin.id;
            }
        }
        const e: BuiltEdge = {
            id,
            load: a.load,
            key: a.key,
            from: a.from.id,
            to: a.to.id,
            type,
            loads: [],
            named: [],
            values: {},
            origin: {},
            own: {},
            touch: [],
            weight: isEmpty(w) ? null : Number(w),
            weightMeaning: isEmpty(w) ? null : meaning,
            weightDefault,
            time: null,
            timeFrom: null,
            ends: a.ends,
            ...linked(step),
        };
        this.putEdge(e);
        if (!this.pairs.has(pairKey(e.weightMeaning))) {
            this.pairs.set(pairKey(e.weightMeaning), id);
        }
        st.newEdges++;
        const unit = a.index === NO_ROW ? {} : { table: a.table, row: a.index };
        this.mark(st, "newEdges", { ...unit, element: e.id });
        this.madeBy.set(e, st);
        supply(e, a.load);
        this.touch(e, step, si, a.table, a.row, a.index);
        for (const [c, v] of a.values) {
            this.write(e, c, v, { src: a.load, si, row: a.index, step, st });
        }
        span(e, a, timeCol);
        return e.id;
    }

    // A row folded into an edge an earlier step made (`existing: "merge"`): its columns meet the
    // edge's by the step's clash rule, and its key is an alias of the edge.
    private foldEdgeRow(
        into: BuiltEdge,
        id: string,
        step: Step,
        si: number,
        st: StepStats,
        a: EdgeArgs,
        timeCol: string | null,
    ): void {
        if (a.held?.folded.has(into.id) === false) {
            a.held.folded.add(into.id);
            this.mark(st, "mergedEdges", { table: a.table, row: a.index, element: into.id });
        }
        supply(into, a.load);
        this.touch(into, step, si, a.table, a.row, a.index);
        this.edgeAliases.set(id, into.id);
        for (const [c, v] of a.values) {
            this.write(into, c, v, { src: a.load, si, row: a.index, step, st });
        }
        span(into, a, timeCol);
    }

    // A second row with an existing edge's key: the step's `repeated`, else E_EDGE_KEY_COLLISION (3.3).
    private repeatEdge(
        existing: BuiltEdge,
        step: Step,
        si: number,
        st: StepStats,
        a: EdgeArgs,
        timeCol: string | null,
    ): void {
        span(existing, a, timeCol);
        const aggregates = "aggregate" in step && step.aggregate !== undefined;
        if (a.repeated === undefined && !aggregates) {
            this.issues.push({ code: "E_EDGE_KEY_COLLISION", params: { load: a.load, key: a.key, steps: [si] } });
            return;
        }
        this.touch(existing, step, si, a.table, a.row, a.index);
        for (const [c, v] of a.values) {
            if (aggregateFor(step, c) !== undefined) {
                this.write(existing, c, v, { src: a.load, si, row: a.index, step, st });
            } else if (a.repeated === "last" && !isEmpty(v)) {
                existing.values[c] = v;
            }
        }
    }

    // ---- join.merge (3.4, 3.6)
    private merge(s: MergeStep, si: number, st: StepStats): void {
        const { space } = s.read;
        const look = this.lookupIn(s, space);
        const node2s = [...this.nodes.values()].filter((n) =>
            n.touch.some((t) => t.source === s.source && t.table === "nodes" && t.step < si && t.valued !== true),
        );
        const at: MergeAt = { s, si, st, groups: new Map(), fanned: new Map() };
        const kept = new Map<string, BuiltNode[]>();
        const before = [...this.nodes.values()].filter((n) => n.space === space).map((n) => n.id);
        // A row an earlier merge folded or left out, or whose node another source's rows are too, is no node
        // of its own: only its columns join the node it names, and the node it is in stays. A node other rows
        // were folded into is its own source's still, and takes them along.
        const isOwn = (n: BuiltNode): boolean => n.brought?.size === 1 && n.brought.has(s.source);
        const own = node2s.filter((n) => isOwn(n));
        const shared = node2s.filter((n) => !isOwn(n));
        this.mergeRowsAgain(at, shared, look);
        for (const n2 of own) {
            this.mergeNode2(at, n2, look, kept);
        }
        this.settleKept(st, space, kept);
        // What the merge leaves of source 2 as nodes of their own: neither folded nor dropped.
        const live = new Set(this.nodes.values());
        for (const n2 of own) {
            if (live.has(n2)) {
                st.keptNew++;
                this.mark(st, "keptNew", { element: n2.id, key: n2.key });
            }
        }
        const untouched = before.filter((id) => !at.groups.has(id) && this.nodes.has(id));
        for (const id of untouched) {
            this.mark(st, "untouched", { element: id });
        }
        st.untouched = untouched.length;
        st.groups = [...at.groups.values()].sort((a, b) => b - a);
        st.repeated1 = this.keys(st, "repeated1", at.fanned);
        st.repeated2 = this.keys(st, "repeated2", repeats(mergeKeys(s, node2s)));
    }

    // The rows of a merge's source that are no node of their own (see `merge`), each once: its columns fold
    // into the nodes its value names, and a row naming none is left where it is.
    private mergeRowsAgain(at: MergeAt, shared: readonly BuiltNode[], look: Lookup): void {
        const { s } = at;
        const rows = new Map<number, { readonly r: Row; readonly held?: BuiltNode }>();
        for (const [row, r] of this.skipped.get(s.source) ?? []) {
            rows.set(row, { r });
        }
        for (const n of shared) {
            for (const t of ownTouches(n, s.source).filter((each) => !rows.has(each.row))) {
                rows.set(t.row, { r: t.cells, held: n });
            }
        }
        for (const [i, { r, held }] of rows) {
            this.mergeRowAgain(at, look, r, i, held);
        }
    }

    // The nodes a value folds into: the one it names, or each of several under `fanOut`, noted as such.
    private mergeTargets({ s, fanned }: MergeAt, ids: readonly string[], value: string, unit: DrillUnit): BuiltNode[] {
        if (ids.length > 1) {
            fanned.set(value, fanned.get(value) ?? unit);
        }
        return (ids.length === 1 || s.fanOut === "each" ? ids : []).flatMap((id) => this.nodes.get(id) ?? []);
    }

    // One such row, and the node it is in, if any.
    private mergeRowAgain(at: MergeAt, look: Lookup, r: Row, i: number, held: BuiltNode | undefined): void {
        const { s, si, st } = at;
        const v = r[s.read.key];
        const ids = leftOut(s, r) || isEmpty(v) ? [] : look(v);
        const unit = { table: "nodes", row: i, key: text(v) } as const;
        const n1s = this.mergeTargets(at, ids, text(v), unit);
        for (const n1 of n1s) {
            this.countMergedRow(at, n1, { ...unit, element: n1.id });
            this.foldSharedRow(n1, s, si, st, r, i);
        }
        if (n1s.length === 0) {
            const count = ids.length > 1 ? "fanOut" : "unmatched";
            st[count]++;
            this.mark(st, count, held === undefined ? unit : { ...unit, element: held.id });
        }
    }

    // One such row's columns onto a node it names: those the source's add brings.
    private foldSharedRow(n1: BuiltNode, s: MergeStep, si: number, st: StepStats, r: Row, i: number): void {
        const brought = this.input.steps.find((o): o is AddStep => o.op === "join.add" && o.source === s.source);
        this.touch(n1, s, si, "nodes", r, i);
        supply(n1, s.source);
        for (const c of Object.keys(r).filter((each) => brought?.columns?.includes(each) !== false)) {
            this.write(n1, c, r[c], { src: s.source, si, row: i, step: s, st });
        }
    }

    // One node 2 of a merge: folded into the node 1 it names (or each of several, under `fanOut`), or kept or dropped.
    private mergeNode2(at: MergeAt, n2: BuiltNode, look: Lookup, kept: Map<string, BuiltNode[]>): void {
        const { s, si, st, groups } = at;
        const own = ownTouches(n2, s.source);
        const rows = own.map((t) => t.cells);
        const [r] = rows;
        const excluded = leftOut(s, r);
        const v = r[s.read.key];
        const ids = excluded || isEmpty(v) ? [] : look(v).filter((id) => id !== n2.id);
        const unit = { table: "nodes", row: own[0].row, element: n2.id, key: n2.key } as const;
        const n1s = this.mergeTargets(at, ids, text(v), unit);
        for (const n1 of n1s) {
            groups.set(n1.id, (groups.get(n1.id) ?? 1) + rows.length);
            st.merged++;
            this.mark(st, "merged", { ...unit, element: n1.id });
        }
        if (n1s.length > 0) {
            this.foldInto(n1s, n2, { src: s.source, si, row: 0, step: s, st }, own);
        } else if (ids.length > 1) {
            st.fanOut++;
            this.mark(st, "fanOut", unit);
            // it names nodes, so it is no new one: left out with the rows that name none
            if (s.unmatchedFrom === "drop") {
                this.skipNode2(s, st, n2);
            }
        } else {
            st.unmatched++;
            this.mark(st, "unmatched", unit);
            this.unmatchedNode2(s, st, n2, { excluded, v }, kept);
        }
    }

    // A merge reading edge rows, which are no node 2s: each row's columns fold into the node 1 it
    // names; a row naming none makes the node (one per value), or is left out under Only 2: Drop.
    private mergeRows(s: MergeStep, si: number, st: StepStats): void {
        const look = this.lookupIn(s, s.read.space);
        const before = [...this.nodes.values()].filter((n) => n.space === s.read.space);
        const type = before[0]?.type ?? null;
        const made = new Set<string>();
        const groups = new Map<string, number>();
        const keys: (readonly [string, DrillUnit])[] = [];
        const fanned = new Map<string, DrillUnit>();
        const at: MergeAt = { s, si, st, groups, fanned };
        for (const [r, i] of this.filtered(s, "edges")) {
            this.mergeEdgeRow(at, look, { made, type, keys }, r, i);
        }
        for (const n of before.filter((each) => !groups.has(each.id))) {
            st.untouched++;
            this.mark(st, "untouched", { element: n.id });
        }
        st.groups = [...groups.values()].sort((x, y) => y - x);
        st.repeated1 = this.keys(st, "repeated1", fanned);
        st.repeated2 = this.keys(st, "repeated2", repeats(keys));
        this.reportEmpty(s.source, new Map(st.emptyKey > 0 ? [[s.read.key, st.emptyKey]] : []));
    }

    // One edge row of a merge: folded into the node 1 it names, or into each of several, or kept or left out.
    private mergeEdgeRow(
        at: MergeAt,
        look: Lookup,
        into: {
            readonly made: Set<string>;
            readonly type: string | null;
            readonly keys: (readonly [string, DrillUnit])[];
        },
        r: Row,
        i: number,
    ): void {
        const { s, si, st } = at;
        const { made, type, keys } = into;
        const here = { table: "edges", row: i } as const;
        const v = r[s.read.key];
        if (isEmpty(v)) {
            st.emptyKey++;
            this.mark(st, "emptyKey", here);
            this.fate(s.source, "edges", i, "left-out:empty-key");
            return;
        }
        const unit: DrillUnit = { ...here, key: text(v) };
        const ids = look(v);
        const before = this.placedIn(s.source, i);
        if (ids.length > 1) {
            keys.push([text(v), s.fanOut === "each" ? { ...unit, element: ids[0] } : unit]);
            if (s.fanOut === "each" && before !== undefined && this.keptRows.has(before)) {
                this.mergeFannedAgain(at, before, ids, unit);
            } else {
                this.mergeFannedRow(at, ids, unit, r, i);
            }
            return;
        }
        const met = made.has(ids[0] ?? "") ? undefined : this.nodes.get(ids[0] ?? "");
        if (before !== undefined && before !== met && (met === undefined || this.keptRows.has(before))) {
            keys.push([text(v), { ...unit, element: (met ?? before).id }]);
            this.mergeAgain(at, before, met, unit);
            return;
        }
        const n = met ?? this.keptRow(s, st, text(v), type, made, unit);
        const reached = n === null ? unit : { ...unit, element: n.id };
        keys.push([text(v), reached]);
        if (met) {
            this.countMergedRow(at, met, reached);
        } else {
            st.unmatched++;
            this.mark(st, "unmatched", reached);
        }
        this.mergeRow(s, si, st, n, r, i);
    }

    // An edge row an earlier match put in a node: one it made of the row folds whole into the node the row
    // names now, and a row naming none stays where it is.
    private mergeAgain(at: MergeAt, before: BuiltNode, met: BuiltNode | undefined, unit: DrillUnit): void {
        const { s, si, st } = at;
        if (met === undefined) {
            st.unmatched++;
            this.mark(st, "unmatched", { ...unit, element: before.id });
            return;
        }
        this.unmake(before);
        const rows = before.touch.filter((t) => t.source === s.source && t.table === "edges");
        this.fold(met, before, { src: s.source, si, row: unit.row ?? 0, step: s, st }, rows);
        this.countMergedRow(at, met, { ...unit, element: met.id });
    }

    // An edge row an earlier match kept as a node of its own, now naming several node 1s under `fanOut: each`:
    // that node folds whole into each of them, as `mergeAgain` folds it into one.
    private mergeFannedAgain(at: MergeAt, before: BuiltNode, ids: readonly string[], unit: DrillUnit): void {
        const { s, si, st, fanned } = at;
        fanned.set(unit.key ?? "", fanned.get(unit.key ?? "") ?? unit);
        const mets = ids.flatMap((id) => this.nodes.get(id) ?? []);
        this.unmake(before);
        const rows = before.touch.filter((t) => t.source === s.source && t.table === "edges");
        this.foldInto(mets, before, { src: s.source, si, row: unit.row ?? 0, step: s, st }, rows);
        for (const met of mets) {
            this.countMergedRow(at, met, { ...unit, element: met.id });
        }
    }

    // The node an earlier match put an edge row in.
    private placedIn(source: string, row: number): BuiltNode | undefined {
        const n = this.placed.get(source)?.get(row);
        const id = n === undefined ? "" : n.id;
        return this.nodes.get(id) ?? this.nodes.get(this.aliases.get(id) ?? "");
    }

    // A node a step made that the graph no longer holds is no new one of that step's.
    private unmake(n: BuiltNode): void {
        const made = this.madeBy.get(n);
        if (made !== undefined) {
            made.newNodes--;
            this.unmark(made, "newNodes", n.id);
        }
        if (made !== undefined && this.keptRows.has(n)) {
            made.keptNew--;
            this.unmark(made, "keptNew", n.id);
        }
    }

    // One edge row folded into a node 1, counted.
    private countMergedRow({ st, groups }: MergeAt, met: BuiltNode, unit: DrillUnit): void {
        st.merged++;
        this.mark(st, "merged", unit);
        groups.set(met.id, (groups.get(met.id) ?? 1) + 1);
    }

    // An edge row whose value names several node 1s: folded into each under `fanOut`, else left out.
    private mergeFannedRow(at: MergeAt, ids: readonly string[], unit: DrillUnit, r: Row, i: number): void {
        const { s, si, st, fanned } = at;
        const value = unit.key ?? "";
        fanned.set(value, fanned.get(value) ?? unit);
        if (s.fanOut !== "each") {
            st.fanOut++;
            this.mark(st, "fanOut", unit);
            this.fate(s.source, "edges", i, "left-out:fan-out");
            return;
        }
        for (const met of ids.flatMap((id) => this.nodes.get(id) ?? [])) {
            this.countMergedRow(at, met, { ...unit, element: met.id });
            this.mergeRow(s, si, st, met, r, i);
        }
    }

    // One edge row's columns onto the node it folds into, or left out when there is none.
    private mergeRow(s: MergeStep, si: number, st: StepStats, n: BuiltNode | null, r: Row, i: number): void {
        if (n === null) {
            this.fate(s.source, "edges", i, "left-out:unmatched");
            return;
        }
        this.touch(n, s, si, "edges", r, i);
        supply(n, s.source);
        const placed = this.placed.get(s.source) ?? new Map<number, BuiltNode>();
        this.placed.set(s.source, placed.set(i, n));
        for (const c of s.columns ?? Object.keys(r).filter((c) => c !== s.read.key)) {
            this.write(n, c, r[c], { src: s.source, si, row: i, step: s, st });
        }
    }

    // The node a merged edge row naming no node 1 makes, one per value: in node 1's space, of its
    // type, or, when the field is not node 1's key, in the source's own space. Null under Only 2: Drop.
    private keptRow(
        s: MergeStep,
        st: StepStats,
        key: string,
        type: string | null,
        made: Set<string>,
        unit: DrillUnit,
    ): BuiltNode | null {
        if (s.unmatchedFrom === "drop") {
            return null;
        }
        const space = byKey(s) ? s.read.space : ownSpace(s.source);
        const met = this.nodes.get(this.resolve(space, key) ?? "");
        if (met) {
            return met;
        }
        const n = this.mkNode(space, key, byKey(s) ? type : null);
        made.add(n.id);
        st.newNodes++;
        st.keptNew++;
        this.mark(st, "newNodes", { ...unit, element: n.id });
        this.mark(st, "keptNew", { ...unit, element: n.id });
        this.madeBy.set(n, st);
        this.keptRows.add(n);
        return n;
    }

    // Kept node 2s move into node 1's space by their key, unless several share it or it is taken.
    private settleKept(st: StepStats, space: string, kept: Map<string, BuiltNode[]>): void {
        for (const [v, list] of kept) {
            if (list.length > 1 || this.nodes.has(nodeId(space, v))) {
                st.repeatedKept += list.length;
                for (const n of list) {
                    this.mark(st, "repeatedKept", { element: n.id, key: v });
                }
            } else {
                this.move(list[0], space, v);
            }
        }
    }

    // Only 2: Drop drops it; Keep, when field 1 is node 1's key and field 2 node 2's own, moves it into node 1's
    // space later (3.6 item 3). A node 2 joined by another of its fields keeps its id: its value names no node.
    // A node 2 of a source with no key column has no id of its own, so it takes the value it is joined by.
    private unmatchedNode2(
        s: MergeStep,
        st: StepStats,
        n2: BuiltNode,
        { excluded, v }: { readonly excluded: boolean; readonly v: CellValue | undefined },
        kept: Map<string, BuiltNode[]>,
    ): void {
        if (s.unmatchedFrom === "drop") {
            this.skipNode2(s, st, n2);
        } else if (byKey(s) && !excluded && !isEmpty(v) && (text(v) === n2.key || this.keyless(s.source))) {
            const k = text(v);
            kept.set(k, [...(kept.get(k) ?? []), n2]);
        }
    }

    // A source with no key column: its rows are keyed by their content, or numbered.
    private keyless(source: string): boolean {
        const { numbered, mapping } = this.source(source);
        return mapping.nodes?.key === undefined || mapping.nodes.key === numbered;
    }

    // A node 2 left out: its rows, which make no node now, are still there for a later merge to read.
    private skipNode2(s: MergeStep, st: StepStats, n2: BuiltNode): void {
        for (const source of new Set([s.source, ...n2.loads])) {
            const rows = this.skipped.get(source) ?? new Map<number, Row>();
            for (const t of ownTouches(n2, source)) {
                rows.set(t.row, t.cells);
            }
            this.skipped.set(source, rows);
        }
        this.takeOut(st, n2);
    }

    // A node a step takes out, noted as that step's.
    private takeOut(st: StepStats, n: BuiltNode): void {
        const dropped = this.dropped.get(st.step) ?? new Set<string>();
        this.dropped.set(st.step, dropped.add(n.id));
        this.dropNode(n);
    }

    // A kept node 2 moves into node 1's space; its former place becomes its alias (3.6).
    private move(n2: BuiltNode, space: string, key: string): void {
        const old = n2.id;
        const id = nodeId(space, key);
        this.nodes.delete(old);
        n2.aliases.push({ space: n2.space, key: n2.key, type: n2.type });
        n2.id = id;
        n2.space = space;
        n2.key = key;
        this.nodes.set(id, n2);
        this.alias(old, id);
        this.retarget(old, id);
    }

    private dropNode(n: BuiltNode): void {
        this.nodes.delete(n.id);
        for (const e of [...(this.edgesAt.get(n.id) ?? [])]) {
            this.dropEdge(e.id);
        }
    }

    private putEdge(e: BuiltEdge): void {
        this.dropEdge(e.id);
        this.edges.set(e.id, e);
        for (const end of [e.from, e.to]) {
            const at = this.edgesAt.get(end) ?? new Set<BuiltEdge>();
            at.add(e);
            this.edgesAt.set(end, at);
        }
    }

    private dropEdge(id: string): void {
        const e = this.edges.get(id);
        if (e !== undefined) {
            this.edges.delete(id);
            this.edgesAt.get(e.from)?.delete(e);
            this.edgesAt.get(e.to)?.delete(e);
        }
    }

    // Every edge ending at `from` ends at `to` instead.
    private retarget(from: string, to: string): void {
        const moved = this.edgesAt.get(from);
        if (moved === undefined) {
            return;
        }
        this.edgesAt.delete(from);
        const at = this.edgesAt.get(to) ?? new Set<BuiltEdge>();
        for (const e of moved) {
            if (e.from === from) {
                e.from = to;
            }
            if (e.to === from) {
                e.to = to;
            }
            at.add(e);
        }
        this.edgesAt.set(to, at);
    }

    private alias(id: string, to: string): void {
        const before = this.aliases.get(id);
        if (before !== undefined) {
            this.aliasesOf.get(before)?.delete(id);
        }
        this.aliases.set(id, to);
        const of = this.aliasesOf.get(to) ?? new Set<string>();
        of.add(id);
        this.aliasesOf.set(to, of);
    }

    // Node 2 folds into each node 1 its value names: the first takes its edges and its key with its values,
    // the others its values.
    private foldInto(n1s: readonly BuiltNode[], n2: BuiltNode, at: WriteAt, rows: BuiltNode["touch"]): void {
        const [first, ...others] = n1s;
        for (const n1 of others) {
            n2.loads.forEach((l) => {
                supply(n1, l);
            });
            n1.touch.push(...n2.touch);
            this.foldValues(n1, n2, at, rows);
        }
        this.fold(first, n2, at, rows);
    }

    // Node 2 folds into node 1 (3.4 join.merge): edges, sources, aliases, then values.
    private fold(n1: BuiltNode, n2: BuiltNode, at: WriteAt, rows: BuiltNode["touch"]): void {
        for (const e of this.edgesAt.get(n2.id) ?? []) {
            this.endFoldedBy.set(e, at.st);
        }
        this.retarget(n2.id, n1.id);
        n2.loads.forEach((l) => {
            supply(n1, l);
        });
        n2.named.forEach((l) => {
            name(n1, l);
        });
        (n2.ends ?? []).forEach((l) => {
            reach(n1, l);
        });
        n1.touch.push(...n2.touch);
        for (const [col, steps] of Object.entries(n2.differAt ?? {})) {
            n1.differAt ??= {};
            n1.differAt[col] = [...new Set([...(n1.differAt[col] ?? []), ...steps])];
        }
        if (n2.metAgain !== undefined) {
            n1.metAgain = { ...n2.metAgain, ...n1.metAgain };
        }
        n1.aliases.push({ space: n2.space, key: n2.key, type: n2.type }, ...n2.aliases);
        if (n2.type !== n1.type) {
            n1.otherTypes.push(n2.type);
            at.st.typeDiffers++;
            this.mark(at.st, "typeDiffers", { element: n1.id, key: n2.key });
        }
        this.nodes.delete(n2.id);
        this.alias(n2.id, n1.id);
        for (const a of n2.aliases) {
            this.alias(nodeId(a.space, a.key), n1.id);
        }
        for (const k of [...(this.aliasesOf.get(n2.id) ?? [])]) {
            this.alias(k, n1.id);
        }
        this.foldValues(n1, n2, at, rows);
        if (n1.time === null && n2.time !== null) {
            n1.time = n2.time;
            n1.timeFrom = n2.timeFrom;
        }
    }

    // Every row of every node 2 is one value of the merge source's aggregate columns.
    private foldAggregates(n1: BuiltNode, n2: BuiltNode, at: WriteAt, rows: BuiltNode["touch"]): void {
        for (const col of Object.keys(n2.own[at.src] ?? {})) {
            if (aggregateFor(at.step, col) !== undefined) {
                for (const { cells, row } of rows) {
                    this.write(n1, col, cells[col], { ...at, row });
                }
            }
        }
    }

    private foldValues(n1: BuiltNode, n2: BuiltNode, at: WriteAt, rows: BuiltNode["touch"]): void {
        const last = "repeated" in at.step && at.step.repeated === "last";
        const pick = last ? [...rows].reverse() : rows;
        this.foldAggregates(n1, n2, at, rows);
        const aggregated = (src: string, col: string): boolean =>
            src === at.src && aggregateFor(at.step, col) !== undefined;
        const readFrom = (src: string, col: string): Value | undefined =>
            src === at.src ? pick.map(({ cells }) => cells[col]).find((x) => !isEmpty(x)) : undefined;
        for (const [src, cells] of Object.entries(n2.own)) {
            for (const [col, cell] of Object.entries(cells).filter(([c]) => !aggregated(src, c))) {
                const v = readFrom(src, col) ?? cell.v;
                const had = n1.own[src]?.[col] as OwnValue | undefined;
                n1.alt ??= [];
                const here = { ...at, src, row: cell.row };
                if (had === undefined) {
                    this.write(n1, col, v, here);
                } else if (src === at.src && had.step !== at.si && !sameCell(had.v, v)) {
                    this.meetAgain(n1, col, had, v, here);
                } else if (last && had.v !== v) {
                    this.takeLater(n1, col, had, v, here);
                } else {
                    n1.alt.push({ src, col, v, from: n2.key });
                }
            }
        }
    }

    // 3.3: several node 2s of one source folding into one node 1 are repeats; Last takes the later value
    private takeLater(n1: BuiltNode, col: string, had: OwnValue, v: Value, { src, si, st, row }: WriteAt): void {
        n1.alt?.push({ src, col, v: had.v });
        n1.own[src][col] = { v, step: si, row };
        if (n1.origin[col] === src) {
            n1.values[col] = v;
        }
        st.rowsDiffer++;
        this.mark(st, "rowsDiffer", { source: src, row, element: n1.id, name: col });
    }
}

// Values of one column held by an outsized share of rows (W_VALUE_HUB).
function hubs(rows: [Row, number][], column: string): { value: string; rows: number }[] {
    const counts = new Map<string, number>();
    for (const [r] of rows) {
        if (!isEmpty(r[column])) {
            const k = text(r[column]);
            counts.set(k, (counts.get(k) ?? 0) + 1);
        }
    }
    return [...counts].filter(([, c]) => c > HUB_SHARE * rows.length).map(([value, c]) => ({ value, rows: c }));
}

// A join.edges row's key: <part>/<key>, <part>/<from>|<to> escaped when reduced, else <part>/<from>|<to>#<n> (spec 4.1.8 rule 3);
// the two edges of a row kept as a node between its ends add which end each is (`|source`, `|target`).
function edgeStepKey(at: EdgeRow, from: BuiltNode, to: BuiltNode, half: RowHalf | null): string {
    const { s, row: r } = at;
    const pair = `${escapeKey(from.key)}|${escapeKey(to.key)}`;
    const halved = half === null ? "" : `|${half}`;
    const end = at.many ? `|${pair}${halved}` : halved;
    const row = at.key ?? "";
    const keyless = `${s.part}/${s.rowNode === undefined ? row : escapeKey(row)}${end}`;
    if (s.read.edgeId !== undefined && s.rowNode === undefined) {
        const v = r[s.read.edgeId];
        return isEmpty(v) ? keyless : `${s.part}/${text(v)}${end}`;
    }
    // only a step that reduces its rows to one edge per end pair keys by the pair; `both` keeps every row
    if ((s.repeated !== undefined && s.repeated !== "both") || s.aggregate !== undefined) {
        return `${s.part}/${pair}${halved}`;
    }
    // a row of several extracted values is an edge to each
    return s.extract === undefined ? keyless : `${s.part}/${escapeKey(row)}|${escapeKey(to.key)}`;
}

/**
 * A cell's values: each of a list's, which a cell as read may hold at run time too, or the cell.
 * @param v - The cell.
 * @returns Its values.
 */
export function cellValues(v: Value | undefined): readonly (CellValue | undefined)[] {
    return Array.isArray(v) ? (v as readonly CellValue[]) : [v as CellValue | undefined];
}

// A lookup of a cell by each of its values: every node any of them finds, once.
function eachValue(one: Lookup): Lookup {
    return (v) => (Array.isArray(v) ? [...new Set(cellValues(v).flatMap((each) => one(each)))] : [...new Set(one(v))]);
}

// Whether a step looks its values up by the nodes' key, so a value naming none may become one.
function byKey(s: MergeStep | NodeValuesStep): boolean {
    return s.via === undefined && s.nodeColumn === undefined;
}

// A row as each node the cell of one end names: itself, or once per value of a list (or, the target of
// an `extract`, of a split cell), each a row of that value.
function endCells(s: EdgesStep, r: Row, end: "source" | "target"): readonly Row[] {
    const column = s.read[end];
    const extracted = end === "target" && s.extract !== undefined;
    if (column === undefined || !(extracted || Array.isArray(r[column]))) {
        return [r];
    }
    const split = extracted ? s.extract?.split : undefined;
    const values = cellValues(r[column]);
    const parts =
        split === undefined
            ? values
            : values.flatMap((v) =>
                  text(v)
                      .split(split)
                      .map((part) => part.trim()),
              );
    const out = extracted && s.except?.column === column ? s.except : undefined;
    const full = [
        ...new Set(parts.filter((v) => !isEmpty(v) && (out === undefined || !listed(out, { ...r, [column]: v })))),
    ];
    // an empty cell is one row naming nothing
    return full.length === 0 ? [{ ...r, [column]: null }] : full.map((v) => ({ ...r, [column]: v }));
}

/**
 * Whether two cells say the same: a code one file holds as text and another as a number is one code, and a
 * list of nothing but a value is that value.
 * @param a - One cell.
 * @param b - The other.
 * @returns True when they do.
 */
export function sameCell(a: Value | undefined, b: Value | undefined): boolean {
    const many = (v: Value | undefined): v is readonly CellValue[] => Array.isArray(v);
    const all = (list: readonly CellValue[], one: Value | undefined): boolean =>
        list.length > 0 && list.every((each) => sameCell(each, one));
    if (many(a) && !many(b)) {
        return all(a, b);
    }
    if (many(b) && !many(a)) {
        return all(b, a);
    }
    return a === b || (!Array.isArray(a) && typeof a !== typeof b && String(a) === String(b));
}

/**
 * The node rows of a source a node is, not those only naming it.
 * @param n - The node.
 * @param source - The source.
 * @returns What touched it.
 */
export function ownTouches(n: BuiltNode, source: string): BuiltNode["touch"] {
    return n.touch.filter((t) => t.source === source && t.table === "nodes" && t.valued !== true);
}

// Whether a step leaves a row out.
function leftOut(s: Step, r: Row): boolean {
    return (s.except !== undefined && listed(s.except, r)) || (s.rows !== undefined && !listed(s.rows, r));
}

// What an edge linking nodes that share a value says of its direction.
function linked(step: Step): Pick<BuiltEdge, "undirected"> {
    return step.op === "join.edges" && step.link !== undefined ? { undirected: true } : {};
}

// Whether a row names a node at the target end of a step: its cell holds a value, and neither the
// value nor the row is left out.
function makesNode(s: EdgesStep, r: Row): boolean {
    const { target } = s.read;
    const out = s.except !== undefined && s.except.column !== target && listed(s.except, r);
    if (target === undefined || out || (s.rows !== undefined && !listed(s.rows, r))) {
        return false;
    }
    return endCells(s, r, "target").some(
        (each) => !isEmpty(each[target]) && (s.except?.column !== target || !listed(s.except, each)),
    );
}

// The edge an earlier step made that a row folds into (`existing: "merge"`): a row of no type folds
// into an edge of any type, a typed one only into its own.
function heldEdge(a: EdgeArgs, type: string | null): BuiltEdge | undefined {
    return a.held?.byPair.get(`${a.from.id}\u0001${a.to.id}`)?.find((e) => type === null || e.type === type);
}

// The columns of a step reading both ends.
function bothEnds(rd: EdgesStep["read"]): { source: string; target: string; edgeId?: string } {
    return { source: rd.source ?? "", target: rd.target ?? "", edgeId: rd.edgeId };
}

// The columns a join.edges edge's ends are read from. An end that is the row's own node reads none,
// and a row whose two ends read one column (a key met by the same column) keeps them apart.
function endColumns(
    source: string | undefined,
    target: string | undefined,
): { readonly source: string; readonly target: string } {
    const ends = { source: source ?? "source", target: target ?? "target" };
    return ends.source === ends.target ? { source: "source", target: "target" } : ends;
}

function reduceWeight(
    twin: BuiltEdge,
    policy: string,
    w: CellValue | undefined,
    meaning: string | null,
    weightDefault: boolean,
): void {
    const x = Number(w);
    if (policy === "sum") {
        twin.weight = (twin.weight ?? 0) + (Number.isFinite(x) ? x : 0);
    } else if (policy === "min" || policy === "max") {
        twin.weight = twin.weight === null ? x : Math[policy](twin.weight, x);
    } else if (policy === "last") {
        twin.weight = isEmpty(w) ? null : x;
        twin.weightMeaning = isEmpty(w) ? null : meaning;
        twin.weightDefault = weightDefault;
    }
}

/**
 * Build the working graph: fold the steps in list order over an empty graph. An `off` step, and
 * every step that depends on a held or missing source, is skipped. Pure: the same arguments always
 * give the same result, and neither argument is changed.
 * @param input - The sources, steps, type registry and `repeatedEdges`.
 * @param copies - Each source's rows as read, by copy id.
 * @returns The working graph, each step's counts, the issues and each row's fate.
 */
export function build(input: BuildInput, copies: ReadonlyMap<string, CopyTables>): BuildResult {
    return new Builder(input, copies).run();
}

/**
 * The node a `{ space, key }` reference names, through merge aliases.
 * @param result - A build.
 * @param space - The id space.
 * @param key - The key.
 * @returns The node, or null when the reference is unbound.
 */
export function resolveNode(result: BuildResult, space: string, key: string): BuiltNode | null {
    const id = nodeId(space, key);
    return result.nodes.get(id) ?? result.nodes.get(result.aliases.get(id) ?? "") ?? null;
}

/**
 * The edge a `{ load, key }` reference names, through reduction aliases.
 * @param result - A build.
 * @param load - The id of the source that made it.
 * @param key - Its key.
 * @returns The edge, or null when the reference is unbound.
 */
export function resolveEdge(result: BuildResult, load: string, key: string): BuiltEdge | null {
    const id = edgeId(load, key);
    return result.edges.get(id) ?? result.edges.get(result.edgeAliases.get(id) ?? "") ?? null;
}
