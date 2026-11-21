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
import { readTimeValue, type TimeUnit } from "../../time/parse";
import type { JoinReduce, SourceRefreshIssue, SourceRoleName } from "../../types";
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
    type EdgesStep,
    type EdgeValuesStep,
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

/**
 * The space a source's node rows key into.
 * @param src - The source.
 * @returns Its mapping's node space, else its own space.
 */
export const nodeSpace = (src: Source): string => src.mapping.nodes?.space ?? ownSpace(src.id);

const escapeKey = (k: string): string => k.replaceAll(/[\\|]/g, String.raw`\$&`);
export const isEmpty = (v: Value | undefined): v is null | undefined | "" => v === undefined || v === null || v === "";
const text = (v: CellValue | undefined): string => (v === undefined || v === null ? "" : String(v));

interface MatchOptions {
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
}
function normalize(v: CellValue | undefined, o: MatchOptions = {}): string {
    let s = text(v).normalize("NFC");
    if (o.ignoreCase === true) {
        s = s.toLowerCase();
    }
    if (o.ignoreSpaces === true) {
        s = s.replaceAll(/\s+/g, "");
    }
    return s;
}
const listed = (f: RowFilter, r: Row): boolean => f.values.some((v) => normalize(v) === normalize(r[f.column]));

/**
 * A source's rows of one table as read, under their working names (`renamed`, 4.4).
 * @param src - The source.
 * @param copies - Rows as read, by copy id.
 * @param table - Which table.
 * @returns The rows, or null when the source's copy has no such table.
 */
function tableRows(src: Source, copies: ReadonlyMap<string, CopyTables>, table: TableName): readonly Row[] | null {
    const rows = copies.get(copyKey(src))?.[table];
    if (!rows) {
        return null;
    }
    const renamed = src.mapping[table]?.renamed ?? {};
    if (Object.keys(renamed).length === 0) {
        return rows;
    }
    // A rename onto a name the row also carries as read is not applied: two columns never share
    // one working name, and neither one's values replace the other's (7.12).
    const name = (r: Row, k: string): string => {
        const w = renamed[k];
        return w === undefined || (w in r && (renamed[w] ?? w) === w) ? k : w;
    };
    return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [name(r, k), v])));
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
    for (const c of step.columns ?? []) {
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
 * The `aggregate` rule a step sets for one working column.
 * @param step - The step.
 * @param column - A working column name.
 * @returns The rule, or undefined when the column follows `repeated`.
 */
function aggregateFor(step: Step, column: string): JoinReduce | undefined {
    return "aggregate" in step ? step.aggregate?.[column] : undefined;
}

type Held = [origin: string, value: Value];
const isNumber = (v: Value | undefined): boolean => !isEmpty(v) && !Array.isArray(v) && !Number.isNaN(Number(v));
const isDate = (v: Value | undefined): boolean => typeof v === "string" && parseTime(v) !== null;
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
        matched: 0,
        unmatched: 0,
        fanOut: 0,
        rowsDiffer: 0,
        valuesDiffer: {},
        ruleType: {},
        merged: 0,
        typeDiffers: 0,
        untouched: 0,
        groups: [],
        selfLoops: 0,
        emptyKey: 0,
        repeatedKept: 0,
        hub: [],
    };
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
const retarget = (edges: Iterable<BuiltEdge>, from: string, to: string): void => {
    for (const e of edges) {
        if (e.from === from) {
            e.from = to;
        }
        if (e.to === from) {
            e.to = to;
        }
    }
};

type Lookup = (v: CellValue | undefined) => string[];
const MISS_ORDER = ["left-out:empty-end", "left-out:fan-out", "left-out:unmatched"] as const;
type EndHit = { n: BuiltNode } | { miss: "left-out:empty-end" | "left-out:fan-out" | "left-out:unmatched" };

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
    readonly edgeAliases = new Map<string, string>();
    readonly pairs = new Map<string, string>();
    readonly stats: StepStats[] = [];
    readonly issues: BuildIssue[] = [];
    readonly fates = new Map<string, Map<string, RowFate>>();
    readonly readerResults: ReaderResult[] = [];
    // `<source>#<table>` -> the rows a filtered step read, for the no-step fate
    private readonly reads = new Map<string, { src: string; table: TableName; n: number; read: Set<number> }>();
    private readonly types: readonly TypeEntry[];
    // the rows each `aggregate` column read so far, per element (see gather)
    private readonly gathered = new WeakMap<BuiltElement, Map<string, Value[]>>();

    constructor(
        private readonly input: BuildInput,
        private readonly copies: ReadonlyMap<string, CopyTables>,
    ) {
        this.types = input.types ?? [];
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

    private touch(el: BuiltElement, step: Step, si: number, table: TableName, row: Row, i: number): void {
        el.touch.push({ step: si, source: step.source, table, row: i, cells: row });
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
        return this.mkNode(space, key, typeOf(this.types, "node", ctx, row));
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
        }
    }

    // Writes one cell from one source by the step's clash rule (3.3, 3.10).
    private write(el: BuiltElement, col: string, v: Value | undefined, at: WriteAt): void {
        if (isEmpty(v)) {
            return;
        }
        const { src, st, step } = at;
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
            }
            if (!("repeated" in step) || step.repeated !== "last") {
                return;
            }
        }
        this.writeOwn(el, col, v, at);
    }

    // Each row an `aggregate` column read for one element, per step and source, reduced so far (3.3).
    private gather(el: BuiltElement, col: string, v: Value, at: WriteAt, rule: JoinReduce): Value {
        const k = `${at.si}\u0001${at.src}\u0001${col}`;
        let byKey = this.gathered.get(el);
        if (!byKey) {
            byKey = new Map();
            this.gathered.set(el, byKey);
        }
        const all = [...(byKey.get(k) ?? []), v];
        byKey.set(k, all);
        return (reduce(rule, all) as Value | undefined) ?? null;
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
        const differ = el.values[col] !== v;
        if (differ) {
            st.valuesDiffer[col] = (st.valuesDiffer[col] ?? 0) + 1;
        }
        const clash = ruleFor(step, col);
        el.rule ??= {};
        el.rule[col] = clash;
        el.ruleStep ??= {};
        el.ruleStep[col] = at.si;
        if (clash === "overwrite" && differ) {
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
            return;
        }
        [el.origin[col], el.values[col]] = got;
    }

    // A field-to-field translation through a mapping table (3.5): value -> nodes.
    private translator(step: MergeStep | NodeValuesStep | EdgesStep): Lookup | null {
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
            if (isEmpty(r[fromCol]) || isEmpty(r[toCol])) {
                continue;
            }
            const k = normalize(r[fromCol], step);
            const set = idx.get(k) ?? new Set<string>();
            set.add(text(r[toCol]));
            idx.set(k, set);
        }
        const passThrough = step.lookup !== undefined && step.via === undefined;
        return (v) => {
            const keys = idx.get(normalize(v, step));
            if (!keys) {
                const id = passThrough ? this.resolve(space, text(v)) : undefined;
                return id === undefined ? [] : [id];
            }
            // a key and an alias reaching one node are one match
            return [
                ...new Set([...keys].map((k) => this.resolve(space, k)).filter((x): x is string => x !== undefined)),
            ];
        };
    }

    private lookupIn(step: MergeStep | NodeValuesStep, space: string): Lookup {
        const tr = this.translator(step);
        if (tr) {
            return tr;
        }
        const one = (id: string | undefined): string[] => (id === undefined ? [] : [id]);
        if (step.ignoreCase !== true && step.ignoreSpaces !== true) {
            return (v) => one(this.resolve(space, text(v)));
        }
        const idx = new Map<string, string>();
        for (const n of this.nodes.values()) {
            if (n.space === space) {
                idx.set(normalize(n.key, step), n.id);
            }
        }
        return (v) => one(idx.get(normalize(v, step)));
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
                this.merge(s, si, st);
                break;
            case "join.edges":
                this.edgesStep(s, si, st);
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
        for (const n of this.nodes.values()) {
            settle(n);
        }
        for (const op of this.input.reader ?? []) {
            this.readerResults.push({ id: op.id, applied: this.applyReader(op) });
        }
        for (const n of this.nodes.values()) {
            this.settleTime(n);
        }
        for (const { src, table, n, read } of this.reads.values()) {
            for (let i = 0; i < n; i++) {
                if (!read.has(i) && this.fates.get(src)?.has(`${table}#${i}`) !== true) {
                    this.fate(src, table, i, "left-out:no-step");
                }
            }
        }
        const { nodes, edges, aliases, edgeAliases, stats, issues, fates, readerResults } = this;
        return { nodes, edges, aliases, edgeAliases, stats, issues, fates, readerResults };
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
                this.edges.delete(el.id);
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
        this.edges.set(id, e);
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
        nodeRows?.forEach((r, i) => {
            this.addNodeRow(s, src, { si, st, seen, empties }, r, i);
        });
        this.addEdges(s, si, st, src, empties);
        this.reportEmpty(s.source, empties);
    }

    private addNodeRow(
        s: AddStep,
        src: Source,
        at: { si: number; st: StepStats; seen: Set<string>; empties: Map<string, number> },
        r: Row,
        i: number,
    ): void {
        const m = src.mapping.nodes ?? {};
        const { st, si } = at;
        const key = m.key === undefined ? `${src.origin.copy}#${i}` : r[m.key];
        if (isEmpty(key)) {
            st.emptyKey++;
            at.empties.set(m.key ?? "", (at.empties.get(m.key ?? "") ?? 0) + 1);
            this.fate(s.source, "nodes", i, "left-out:empty-key");
            return;
        }
        const n = this.node(nodeSpace(src), text(key), { source: s.source }, r, st) as BuiltNode;
        const repeat = at.seen.has(n.id);
        at.seen.add(n.id);
        this.touch(n, s, si, "nodes", r, i);
        supply(n, s.source);
        // `refuse` never meets a repeat here (the load refused it), so it keeps the first as `first` does
        if (repeat && (s.duplicateIds ?? src.settings?.duplicateIds ?? "first") !== "merge") {
            return;
        }
        const roles = new Set(Object.values(m).filter((v): v is string => typeof v === "string"));
        for (const [c, v] of Object.entries(r).filter(([c]) => !s.columns || s.columns.includes(c) || roles.has(c))) {
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
        const moved = new Set(
            this.input.steps
                .filter(
                    (o) =>
                        o !== s &&
                        o.source === s.source &&
                        o.op === "join.node-values" &&
                        (o.read.table ?? "nodes") === "edges",
                )
                .flatMap((o) => o.columns ?? []),
        );
        const sSpace = m.sourceSpace ?? ownSpace(src.id);
        const tSpace = m.targetSpace ?? ownSpace(src.id);
        const how = src.settings?.unmatched ?? "add";
        rows.forEach((r, i) => {
            const a = r[m.source];
            const b = r[m.target];
            if (isEmpty(a) || isEmpty(b)) {
                const column = isEmpty(a) ? m.source : m.target;
                st.emptyKey++;
                empties.set(column, (empties.get(column) ?? 0) + 1);
                this.fate(s.source, "edges", i, "left-out:empty-end");
                return;
            }
            const na = this.node(sSpace, text(a), { source: s.source, end: "source" }, r, st, how);
            const nb = this.node(tSpace, text(b), { source: s.source, end: "target" }, r, st, how);
            if (!na || !nb) {
                st.unmatched++;
                this.fate(s.source, "edges", i, "left-out:unmatched");
                return;
            }
            reach(na, s.source);
            reach(nb, s.source);
            const id = m.edgeId === undefined ? undefined : r[m.edgeId];
            const key = isEmpty(id) ? `${src.origin.copy}#${i}` : text(id);
            const values = Object.entries(r).filter(([c]) => !moved.has(c) && (!s.columns || s.columns.includes(c)));
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
        for (const [r, i] of rows) {
            if (isEmpty(r[s.read.key])) {
                empty++;
                continue;
            }
            const n = this.nodeValuesTarget(s, st, look, r, i);
            if (!n) {
                continue;
            }
            st.matched++;
            this.touch(n, s, si, table, r, i);
            supply(n, s.source);
            for (const c of s.columns ?? Object.keys(r).filter((c) => !roles.has(c))) {
                this.write(n, c, r[c], { src: s.source, si, row: i, step: s, st });
            }
        }
        st.emptyKey += empty;
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
            this.fate(s.source, table, i, "left-out:fan-out");
            return null;
        }
        let n = ids.length === 1 ? (this.nodes.get(ids[0]) ?? null) : null;
        if (!n && (s.unmatchedRows ?? "leave-out") === "add" && s.via === undefined) {
            n = this.node(s.read.space, text(v), { source: s.source }, r, st);
        }
        if (!n) {
            st.unmatched++;
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
        for (const hub of hubs(rows, rd.target)) {
            st.hub.push(hub);
            this.issues.push({ code: "W_VALUE_HUB", params: { source: s.source, column: rd.target, ...hub } });
        }
        const tr = this.translator(s);
        const empties = new Map<string, number>();
        const loose = s.ignoreCase === true || s.ignoreSpaces === true ? new Map<string, Map<string, string>>() : null;
        for (const [r, i] of rows) {
            const a = this.edgeEnd(s, st, tr, r, "source", loose);
            const b = this.edgeEnd(s, st, tr, r, "target", loose);
            if ("miss" in a || "miss" in b) {
                // an empty end counts first, then fan-out, then unmatched
                const misses = [a, b].map((x) => ("miss" in x ? x.miss : null));
                const miss = MISS_ORDER.find((m) => misses.includes(m)) ?? "left-out:unmatched";
                this.countMiss(st, miss, misses[0] === "left-out:empty-end" ? rd.source : rd.target, empties);
                this.fate(s.source, table, i, miss);
                continue;
            }
            st.matched++;
            reach(a.n, s.source);
            reach(b.n, s.source);
            const skip = new Set([rd.source, rd.target, rd.edgeId]);
            const cols = s.columns ?? Object.keys(r).filter((c) => !skip.has(c));
            this.addEdge(s, si, st, {
                load: s.source,
                key: edgeStepKey(s, src, r, i, a.n, b.n),
                from: a.n,
                to: b.n,
                row: r,
                index: i,
                values: cols.map((c) => [c, r[c]]),
                ctx: { source: s.source, part: s.part },
                roles: src.mapping[table] ?? {},
                read: rd,
                table,
                ends: { source: rd.source, target: rd.target },
                repeated: s.repeated,
            });
        }
        this.reportEmpty(s.source, empties);
    }

    private countMiss(st: StepStats, miss: RowFateKind, column: string, empties: Map<string, number>): void {
        if (miss === "left-out:empty-end") {
            st.emptyKey++;
            empties.set(column, (empties.get(column) ?? 0) + 1);
        } else if (miss === "left-out:fan-out") {
            st.fanOut++;
        } else {
            st.unmatched++;
        }
    }

    // The node one end of a join.edges row reaches, through `via` on `viaEnd`; under `ignoreCase` or
    // `ignoreSpaces` an end meets the node of its space whose key compares equal, kept per space in `loose`.
    private edgeEnd(
        s: EdgesStep,
        st: StepStats,
        tr: Lookup | null,
        r: Row,
        which: "source" | "target",
        loose: Map<string, Map<string, string>> | null,
    ): EndHit {
        const rd = s.read;
        const v = r[which === "source" ? rd.source : rd.target];
        if (isEmpty(v)) {
            return { miss: "left-out:empty-end" };
        }
        if (tr && which === (s.viaEnd ?? "target")) {
            const ids = tr(v);
            if (ids.length > 1) {
                return { miss: "left-out:fan-out" };
            }
            const n = ids.length === 1 ? this.nodes.get(ids[0]) : undefined;
            return n ? { n } : { miss: "left-out:unmatched" };
        }
        const space = which === "source" ? rd.sourceSpace : rd.targetSpace;
        const how = s.unmatchedRows ?? this.source(s.source).settings?.unmatched ?? "add";
        const idx = loose === null ? null : this.looseKeys(loose, space, s);
        const key = idx?.get(normalize(v, s)) ?? text(v);
        const n = this.node(space, key, { source: s.source, part: s.part, end: which }, r, st, how);
        if (n && idx && !idx.has(normalize(v, s))) {
            idx.set(normalize(v, s), n.key);
        }
        return n ? { n } : { miss: "left-out:unmatched" };
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
        for (const [r, i] of this.filtered(s, table)) {
            const e = this.edges.get(edgeId(s.edges, text(r[s.read.edgeId])));
            if (!e) {
                st.unmatched++;
                this.fate(s.source, table, i, "left-out:unmatched");
                continue;
            }
            st.matched++;
            this.touch(e, s, si, table, r, i);
            supply(e, s.source);
            for (const c of s.columns ?? Object.keys(r).filter((c) => c !== s.read.edgeId)) {
                this.write(e, c, r[c], { src: s.source, si, row: i, step: s, st });
            }
        }
    }

    // One edge, keyed { load, key }, reduced by the step's `repeated`, else the graph's repeatedEdges (3.4, 3.8).
    private addEdge(step: Step, si: number, st: StepStats, a: EdgeArgs): void {
        const id = edgeId(a.load, a.key);
        const { w, meaning, weightDefault, timeCol } = edgeRoles(a);
        const existing = this.edges.get(id);
        if (existing) {
            this.repeatEdge(existing, step, si, st, a, timeCol);
            return;
        }
        const policy = a.repeated === undefined ? (this.input.repeatedEdges ?? "keep") : "keep";
        const type = typeOf(this.types, "edge", a.ctx, a.row);
        // 3.8, 8.6: edges of different types never reduce; meanings matter only to a combining rule
        const byMeaning = policy !== "first" && policy !== "last";
        const pairKey = (m: string | null): string => JSON.stringify([a.from.id, a.to.id, type, byMeaning ? m : null]);
        if (policy !== "keep" && policy !== "error") {
            // ponytail: the pair index is not updated by later merges; fine for reductions inside the adds that make the pairs
            const twin = this.edges.get(this.pairs.get(pairKey(meaning)) ?? "");
            if (twin) {
                // reduced across rows or sources: every contributing source supplies it, the row's key is an alias
                supply(twin, a.load);
                this.touch(twin, step, si, a.table, a.row, a.index);
                this.edgeAliases.set(id, twin.id);
                span(twin, a, timeCol);
                reduceWeight(twin, policy, w, meaning, weightDefault);
                return;
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
        };
        this.edges.set(id, e);
        if (!this.pairs.has(pairKey(e.weightMeaning))) {
            this.pairs.set(pairKey(e.weightMeaning), id);
        }
        st.newEdges++;
        if (a.from.id === a.to.id) {
            st.selfLoops++;
        }
        supply(e, a.load);
        this.touch(e, step, si, a.table, a.row, a.index);
        for (const [c, v] of a.values) {
            this.write(e, c, v, { src: a.load, si, row: a.index, step, st });
        }
        span(e, a, timeCol);
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
            n.touch.some((t) => t.source === s.source && t.table === "nodes" && t.step < si),
        );
        const groups = new Map<string, number>();
        const kept = new Map<string, BuiltNode[]>();
        const reached = new Set<string>();
        const before = [...this.nodes.values()].filter((n) => n.space === space).map((n) => n.id);
        for (const n2 of node2s) {
            const rows = n2.touch.filter((t) => t.source === s.source && t.table === "nodes").map((t) => t.cells);
            const [r] = rows;
            const excluded =
                (s.except !== undefined && listed(s.except, r)) || (s.rows !== undefined && !listed(s.rows, r));
            const v = r[s.read.key];
            const ids = excluded || isEmpty(v) ? [] : look(v).filter((id) => id !== n2.id);
            const n1 = ids.length === 1 ? this.nodes.get(ids[0]) : undefined;
            if (ids.length > 1) {
                st.fanOut++;
            } else if (n1) {
                this.fold(n1, n2, { src: s.source, si, row: 0, step: s, st }, rows);
                reached.add(n1.id);
                groups.set(n1.id, (groups.get(n1.id) ?? 1) + rows.length);
                st.merged++;
            } else {
                st.unmatched++;
                this.unmatchedNode2(s, n2, excluded, v, kept);
            }
        }
        for (const [v, list] of kept) {
            if (list.length > 1 || this.nodes.has(nodeId(space, v))) {
                st.repeatedKept += list.length;
            } else {
                this.move(list[0], space, v);
            }
        }
        st.untouched = before.filter((id) => !reached.has(id) && this.nodes.has(id)).length;
        st.groups = [...groups.values()].sort((a, b) => b - a);
    }

    // Only 2: Drop drops it; Keep, when field 1 is node 1's key, moves it into node 1's space later (3.6 item 3).
    private unmatchedNode2(
        s: MergeStep,
        n2: BuiltNode,
        excluded: boolean,
        v: CellValue | undefined,
        kept: Map<string, BuiltNode[]>,
    ): void {
        if (s.unmatchedFrom === "drop") {
            this.dropNode(n2);
        } else if (s.via === undefined && !excluded && !isEmpty(v)) {
            const k = text(v);
            kept.set(k, [...(kept.get(k) ?? []), n2]);
        }
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
        this.aliases.set(old, id);
        retarget(this.edges.values(), old, id);
    }

    private dropNode(n: BuiltNode): void {
        this.nodes.delete(n.id);
        for (const [id, e] of this.edges) {
            if (e.from === n.id || e.to === n.id) {
                this.edges.delete(id);
            }
        }
    }

    // Node 2 folds into node 1 (3.4 join.merge): edges, sources, aliases, then values.
    private fold(n1: BuiltNode, n2: BuiltNode, at: WriteAt, rows: Row[]): void {
        retarget(this.edges.values(), n2.id, n1.id);
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
        n1.aliases.push({ space: n2.space, key: n2.key, type: n2.type }, ...n2.aliases);
        if (n2.type !== n1.type) {
            n1.otherTypes.push(n2.type);
            at.st.typeDiffers++;
        }
        this.nodes.delete(n2.id);
        this.aliases.set(n2.id, n1.id);
        for (const a of n2.aliases) {
            this.aliases.set(nodeId(a.space, a.key), n1.id);
        }
        for (const [k, v] of this.aliases) {
            if (v === n2.id) {
                this.aliases.set(k, n1.id);
            }
        }
        this.foldValues(n1, n2, at, rows);
        if (n1.time === null && n2.time !== null) {
            n1.time = n2.time;
            n1.timeFrom = n2.timeFrom;
        }
    }

    // Every row of every node 2 is one value of the merge source's aggregate columns.
    private foldAggregates(n1: BuiltNode, n2: BuiltNode, at: WriteAt, rows: Row[]): void {
        for (const [col, cell] of Object.entries(n2.own[at.src] ?? {})) {
            if (aggregateFor(at.step, col) !== undefined) {
                for (const r of rows) {
                    this.write(n1, col, r[col], { ...at, row: cell.row });
                }
            }
        }
    }

    private foldValues(n1: BuiltNode, n2: BuiltNode, at: WriteAt, rows: Row[]): void {
        const last = "repeated" in at.step && at.step.repeated === "last";
        const pick = last ? [...rows].reverse() : rows;
        this.foldAggregates(n1, n2, at, rows);
        const aggregated = (src: string, col: string): boolean =>
            src === at.src && aggregateFor(at.step, col) !== undefined;
        for (const [src, cells] of Object.entries(n2.own)) {
            for (const [col, cell] of Object.entries(cells).filter(([c]) => !aggregated(src, c))) {
                const v = pick.map((r) => r[col]).find((x) => !isEmpty(x)) ?? cell.v;
                const had = n1.own[src]?.[col] as OwnValue | undefined;
                n1.alt ??= [];
                if (had && last && had.v !== v) {
                    // 3.3: several node 2s of one source folding into one node 1 are repeats; Last takes the later value
                    n1.alt.push({ src, col, v: had.v });
                    n1.own[src][col] = { v, step: at.si, row: cell.row };
                    if (n1.origin[col] === src) {
                        n1.values[col] = v;
                    }
                    at.st.rowsDiffer++;
                } else if (had) {
                    n1.alt.push({ src, col, v, from: n2.key });
                } else {
                    this.write(n1, col, v, { ...at, src, row: cell.row });
                }
            }
        }
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

// A join.edges row's key: <part>/<key>, <part>/<from>|<to> escaped when reduced, else <part>/<copy id>#<row> (section 10 item 4).
function edgeStepKey(s: EdgesStep, src: Source, r: Row, i: number, from: BuiltNode, to: BuiltNode): string {
    const keyless = `${s.part}/${src.origin.copy}#${i}`;
    if (s.read.edgeId !== undefined) {
        const v = r[s.read.edgeId];
        return isEmpty(v) ? keyless : `${s.part}/${text(v)}`;
    }
    // only a step that reduces its rows to one edge per end pair keys by the pair; `both` keeps every row
    if ((s.repeated !== undefined && s.repeated !== "both") || s.aggregate !== undefined) {
        return `${s.part}/${escapeKey(from.key)}|${escapeKey(to.key)}`;
    }
    return keyless;
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
