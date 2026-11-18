/**
 * @file What a build says about where values came from (design
 * design/data/multiple-data-sources-design.md, sections 3.8 to 3.10), behind the `source-steps`
 * experiment: readable paths, lineage, every source's value for a cell, conflicts and their report,
 * and the checks that refuse a clash rule, a reader edit or a rename. Every outcome is a code and its
 * parameters, never English. Pure and free of Babylon.js, Lit and the DOM.
 */

import { build, isEmpty, resolveEdge, resolveNode, ruleFits } from "./build";
import {
    type BuildInput,
    type BuildResult,
    type BuiltEdge,
    type BuiltNode,
    type CellValue,
    type ClashRule,
    type CopyTables,
    type ElementRef,
    type NodeRef,
    READER_SOURCE,
    type ReaderEdit,
    type Step,
    type TableName,
    type Value,
} from "./types";

/** A refusal or report from the checks and queries here, as a code and its parameters. */
export type StepsOutcome =
    | { readonly code: "E_CLASH_RULE_TYPE"; readonly params: { step: number; column: string; rule: ClashRule } }
    | { readonly code: "E_EDIT_ROLE_COLUMN"; readonly params: { column: string } }
    | {
          readonly code: "E_BAD_COMMAND";
          readonly params: { reason: "name-taken"; source: string; table: TableName; column: string };
      }
    | {
          readonly code: "W_VALUES_DIFFER";
          readonly params: { step: number; column: string; count: number; decided: number; rule: ClashRule };
      };

const isNodeRef = (ref: ElementRef): ref is NodeRef => "space" in ref;

/**
 * The element a reference names in a build, through merge and reduction aliases.
 * @param result - A build.
 * @param ref - `{ space, key }` for a node, `{ load, key }` for an edge.
 * @returns The element, or null when the reference is unbound.
 */
export function element(result: BuildResult, ref: ElementRef): BuiltNode | BuiltEdge | null {
    return isNodeRef(ref) ? resolveNode(result, ref.space, ref.key) : resolveEdge(result, ref.load, ref.key);
}

const refOf = (el: BuiltNode | BuiltEdge): ElementRef =>
    "space" in el ? { space: el.space, key: el.key } : { load: el.load, key: el.key };

// ---------------------------------------------------------------- readable paths (3.9)

/** The paths every built element answers, besides its own columns. */
export const READABLE_PATHS = [
    "graphty.type",
    "graphty.load",
    "_source.loads",
    "graphty.space",
    "graphty.key",
    "graphty.time",
    "graphty.weight",
] as const;

/** One of {@link READABLE_PATHS}. */
export type ReadablePath = (typeof READABLE_PATHS)[number];

/**
 * Whether a path is one every element answers, so a filter on it judges every element.
 * @param path - A path or column name.
 * @returns True for one of {@link READABLE_PATHS}.
 */
export const isReadablePath = (path: string): path is ReadablePath =>
    (READABLE_PATHS as readonly string[]).includes(path);

/**
 * One value of a built element: a readable path, else its shown value for a column.
 * @param el - A built node or edge.
 * @param path - A readable path or a working column name.
 * @returns The value; null for a path the element has no value for (a node's weight, an edge's space).
 */
export function readPath(el: BuiltNode | BuiltEdge, path: string): Value | readonly string[] | undefined {
    switch (path) {
        case "graphty.type":
            return el.type;
        case "graphty.load":
            return el.loads[0] ?? null;
        case "_source.loads":
            return el.loads;
        case "graphty.space":
            return "space" in el ? el.space : null;
        case "graphty.key":
            return el.key;
        case "graphty.time":
            return el.time;
        case "graphty.weight":
            return "weight" in el ? el.weight : null;
        default:
            return el.values[path];
    }
}

// ---------------------------------------------------------------- provenance (3.8)

/** Where one element came from (3.8). */
export interface Lineage {
    readonly type: string | null;
    /** The sources that supplied it, in step order; the reader source is `reader`. */
    readonly supplied: readonly string[];
    /** The sources that only named it. */
    readonly named: readonly string[];
    /** Every row a step read into it. */
    readonly steps: readonly { step: number; source: string; row: number }[];
    /** The references that also reach it: merged node 2s, a moved node's former place, reduced edges' rows. */
    readonly aliases: readonly ElementRef[];
    /** The types other steps would have given it (3.7). */
    readonly otherTypes: readonly (string | null)[];
    /** The ids of the reader edits on it. */
    readonly reader: readonly string[];
}

/**
 * Where one element came from.
 * @param result - A build.
 * @param ref - The element.
 * @returns Its lineage, or null when the reference is unbound.
 */
export function lineage(result: BuildResult, ref: ElementRef): Lineage | null {
    const el = element(result, ref);
    if (!el) {
        return null;
    }
    let aliases: ElementRef[];
    if ("space" in el) {
        aliases = el.aliases.map(({ space, key }) => ({ space, key }));
    } else {
        aliases = [...result.edgeAliases]
            .filter(([, to]) => to === el.id)
            .map(([from]) => {
                const [load, key] = from.split("\u0001");
                return { load, key };
            });
    }
    return {
        type: el.type,
        supplied: [...el.loads],
        named: [...el.named],
        steps: el.touch.map((t) => ({ step: t.step, source: t.source, row: t.row })),
        aliases,
        otherTypes: "otherTypes" in el ? [...el.otherTypes] : [],
        reader: Object.values(el.edited ?? {}).map((o) => o.id),
    };
}

/** One source's value for a cell. */
export interface SourceValue {
    readonly source: string;
    readonly value: Value;
    readonly step?: number;
    readonly row?: number;
    /** For a value a merge kept only in the provenance: the key of the node 2 it came from. */
    readonly from?: string;
}

/** Every source's value for one cell, and the one shown (3.8). */
export interface CellValues {
    /** In precedence order: step order, then the values merges kept only in the provenance. */
    readonly list: readonly SourceValue[];
    readonly shown: Value | null;
    /** The source whose value shows, `reader` for a reader edit, or `rule:mean` for a computed value. */
    readonly origin: string | null;
    readonly disagree: boolean;
}

const distinct = (vs: readonly Value[]): number => new Set(vs.map((v) => JSON.stringify(v))).size;

/**
 * Every source's value for one cell, the shown value and where it came from.
 * @param result - A build.
 * @param ref - The element.
 * @param column - A working column name.
 * @returns The values, or null when the reference is unbound.
 */
export function values(result: BuildResult, ref: ElementRef, column: string): CellValues | null {
    const el = element(result, ref);
    if (!el) {
        return null;
    }
    const list: SourceValue[] = Object.entries(el.own)
        .filter(([, c]) => column in c)
        .map(([source, c]) => ({ source, step: c[column].step, row: c[column].row, value: c[column].v }));
    for (const a of "alt" in el ? (el.alt ?? []) : []) {
        if (a.col === column) {
            list.push({ source: a.src, value: a.v, ...(a.from === undefined ? {} : { from: a.from }) });
        }
    }
    return {
        list,
        shown: el.values[column] ?? null,
        origin: el.edited?.[column] ? READER_SOURCE : (el.origin[column] ?? null),
        disagree: distinct(list.map((x) => x.value)) > 1,
    };
}

/** What a cell holds, for a table or an inspector (3.8). */
export type CellState =
    | { readonly state: "value"; readonly value: Value; readonly edited?: true }
    | { readonly state: "empty" }
    | { readonly state: "not-carried" };

/**
 * What one cell holds: a value whatever its origin, else empty when a supplying source has the
 * column, else not carried.
 * @param result - A build.
 * @param ref - The element.
 * @param column - A working column name.
 * @returns The cell's state, or null when the reference is unbound.
 */
export function cell(result: BuildResult, ref: ElementRef, column: string): CellState | null {
    const el = element(result, ref);
    if (!el) {
        return null;
    }
    const v = el.values[column];
    if (!isEmpty(v)) {
        return { state: "value", value: v, ...(el.edited?.[column] ? { edited: true as const } : {}) };
    }
    const carried = el.touch.some(
        (t) => t.source !== READER_SOURCE && el.loads.includes(t.source) && column in t.cells,
    );
    return { state: carried ? "empty" : "not-carried" };
}

// ---------------------------------------------------------------- conflicts (3.10)

/** One cell where supplying sources hold different values. */
export interface Conflict {
    readonly ref: ElementRef;
    /** The step whose rule settles the cell. */
    readonly step: number;
    readonly column: string;
    readonly values: readonly { source: string; value: Value }[];
    readonly shown: Value | null;
    /** What shows the value: the rule, or `reader` for a reader decision. */
    readonly by: ClashRule | "reader";
    /** The step's rule for the column, under any reader decision. */
    readonly rule: ClashRule;
}

/** Which conflicts to list. */
export interface ConflictQuery {
    readonly step?: number;
    readonly column?: string;
    /** Only cells this source holds a value for. */
    readonly source?: string;
    /** `open`: no reader decision; `decided`: a reader decision shows the value. */
    readonly only?: "open" | "decided";
}

/**
 * The cells where supplying sources hold different values, with the rule or reader decision that
 * shows one.
 * @param result - A build.
 * @param query - Which cells.
 * @returns The conflicts, nodes first, in build order.
 */
export function conflicts(result: BuildResult, query: ConflictQuery = {}): Conflict[] {
    const out: Conflict[] = [];
    for (const el of [...result.nodes.values(), ...result.edges.values()]) {
        const cols = new Set(Object.values(el.own).flatMap((c) => Object.keys(c)));
        for (const column of cols) {
            const c = query.column === undefined || column === query.column ? conflictAt(el, column) : null;
            if (c && wanted(c, query)) {
                out.push(c);
            }
        }
    }
    return out;
}

// One element's conflict in one column, or null when its sources agree.
function conflictAt(el: BuiltNode | BuiltEdge, column: string): Conflict | null {
    const list = Object.entries(el.own)
        .filter(([, c]) => column in c)
        .map(([source, c]) => ({ source, value: c[column].v }));
    if (distinct(list.map((x) => x.value)) < 2) {
        return null;
    }
    const rule = el.rule?.[column] ?? "keep";
    const by = el.edited?.[column] ? READER_SOURCE : rule;
    const step = el.ruleStep?.[column] ?? Math.max(...el.touch.map((t) => t.step));
    return { ref: refOf(el), step, column, values: list, shown: el.values[column] ?? null, by, rule };
}

function wanted(c: Conflict, query: ConflictQuery): boolean {
    if (query.only !== undefined && (c.by === READER_SOURCE) !== (query.only === "decided")) {
        return false;
    }
    if (query.step !== undefined && c.step !== query.step) {
        return false;
    }
    return query.source === undefined || c.values.some((x) => x.source === query.source);
}

/**
 * The conflict report: one `W_VALUES_DIFFER` per step and column, counting its cells and those a
 * reader decision settles.
 * @param result - A build.
 * @returns The report, in the order the conflicts are listed.
 */
export function conflictReport(result: BuildResult): StepsOutcome[] {
    const per = new Map<string, { step: number; column: string; count: number; decided: number; rule: ClashRule }>();
    for (const c of conflicts(result)) {
        const k = JSON.stringify([c.step, c.column]);
        const r = per.get(k) ?? { step: c.step, column: c.column, count: 0, decided: 0, rule: c.rule };
        r.count++;
        if (c.by === READER_SOURCE) {
            r.decided++;
        }
        per.set(k, r);
    }
    return [...per.values()].map((params) => ({ code: "W_VALUES_DIFFER", params }));
}

// ---------------------------------------------------------------- clash rules (3.10)

/**
 * Refuse a numeric rule on a column whose conflicting values it cannot order.
 * @param result - The build the rule would change.
 * @param step - The step's index.
 * @param column - The working column.
 * @param rule - The rule asked for.
 * @returns `E_CLASH_RULE_TYPE`, or null when the rule fits.
 */
export function checkClashRule(
    result: BuildResult,
    step: number,
    column: string,
    rule: ClashRule,
): StepsOutcome | null {
    const bad = conflicts(result, { column }).some(
        (c) =>
            !ruleFits(
                rule,
                c.values.map((x) => x.value),
            ),
    );
    return bad ? { code: "E_CLASH_RULE_TYPE", params: { step, column, rule } } : null;
}

/**
 * A step with one column's clash rule set, saved per column with `"*"` for the rest.
 * @param step - The step.
 * @param column - The working column.
 * @param rule - The rule.
 * @returns A new step; the argument is unchanged.
 */
export function withClash<S extends Step>(step: S, column: string, rule: ClashRule): S {
    const cur = step.clash;
    const base = typeof cur === "object" ? cur : { "*": cur ?? "keep" };
    return { ...step, clash: { ...base, [column]: rule } };
}

// ---------------------------------------------------------------- guarded columns (3.8, 4.4)

const ROLE_KEYS = [
    "key",
    "source",
    "target",
    "edgeId",
    "weight",
    "time",
    "timeEnd",
    "latitude",
    "longitude",
    "coordinates",
    "country",
    "region",
    "city",
] as const;
// a pick or Use may write these, and the role follows the picked source (3.9)
const PICKABLE = new Set<string>([
    "time",
    "timeEnd",
    "latitude",
    "longitude",
    "coordinates",
    "country",
    "region",
    "city",
]);

/**
 * The columns of one source that a type rule, a role or a step reads.
 * @param input - The build input.
 * @param source - The source's id.
 * @param picked - True for a pick or Use, which may write a time or location column.
 * @returns The working column names.
 */
export function readColumns(input: BuildInput, source: string, picked = false): Set<string> {
    const keys = ROLE_KEYS.filter((k) => !picked || !PICKABLE.has(k));
    const out = new Set<string>();
    const strings = (rec: Readonly<Record<string, unknown>> | undefined): void => {
        for (const k of keys) {
            const v = rec?.[k];
            if (typeof v === "string") {
                out.add(v);
            }
        }
    };
    for (const r of (input.types ?? []).flatMap((t) => t.rules)) {
        if (r.source === source && r.column !== undefined) {
            out.add(r.column);
        }
    }
    const src = input.sources[source] as BuildInput["sources"][string] | undefined;
    strings(src?.mapping.nodes as Readonly<Record<string, unknown>> | undefined);
    strings(src?.mapping.edges as Readonly<Record<string, unknown>> | undefined);
    for (const st of input.steps) {
        if (st.source === source && "read" in st) {
            strings(st.read as Readonly<Record<string, unknown>>);
        }
        if ("mapping" in st && st.mapping && (st.via ?? st.lookup) === source) {
            st.mapping.columns.forEach((c) => out.add(c));
        }
    }
    return out;
}

/**
 * Refuse a reader edit, Use or pick on a column a type rule, a role or a step of the element's
 * supplying sources reads (3.8).
 * @param input - The build input.
 * @param result - Its build.
 * @param ref - The element.
 * @param column - The working column.
 * @param picked - True for a pick or Use.
 * @returns `E_EDIT_ROLE_COLUMN`, or null when the edit may be made.
 */
export function checkEdit(
    input: BuildInput,
    result: BuildResult,
    ref: ElementRef,
    column: string,
    picked = false,
): StepsOutcome | null {
    const el = element(result, ref);
    const guarded = (el?.loads ?? []).some((id) => readColumns(input, id, picked).has(column));
    return guarded ? { code: "E_EDIT_ROLE_COLUMN", params: { column } } : null;
}

/**
 * A reader edit of one cell, recording the value shown under it (7.12); a second edit of the same
 * cell keeps the first one's `was`.
 * @param input - The build input, whose reader operations are searched for an earlier edit.
 * @param result - Its build.
 * @param edit - The edit: its id, element, column, value and, for a pick or Use, the source picked.
 * @param edit.id - The new operation's id.
 * @param edit.ref - The element.
 * @param edit.column - The working column.
 * @param edit.value - The value.
 * @param edit.picked - The source whose value a pick or Use took.
 * @returns The operation to append to the reader source.
 */
export function readerEdit(
    input: BuildInput,
    result: BuildResult,
    edit: { id: string; ref: ElementRef; column: string; value: CellValue; picked?: string },
): ReaderEdit {
    const target = JSON.stringify(edit.ref);
    let prior: ReaderEdit | undefined;
    for (const o of input.reader ?? []) {
        if (o.op === "edit" && o.column === edit.column && JSON.stringify(o.node ?? o.edge) === target) {
            prior = o;
        }
    }
    const was = prior ? (prior.was ?? null) : (values(result, edit.ref, edit.column)?.shown ?? null);
    const common = {
        id: edit.id,
        op: "edit" as const,
        column: edit.column,
        value: edit.value,
        was,
        ...(edit.picked === undefined ? {} : { picked: edit.picked }),
    };
    return isNodeRef(edit.ref) ? { ...common, node: edit.ref } : { ...common, edge: edit.ref };
}

/**
 * A pick or Use: a reader edit taking one source's value for a cell (3.10).
 * @param input - The build input.
 * @param result - Its build.
 * @param pick - The new operation's id, the element, the column and the source picked.
 * @param pick.id - The new operation's id.
 * @param pick.ref - The element.
 * @param pick.column - The working column.
 * @param pick.source - The source whose value to take.
 * @returns The edit, `E_EDIT_ROLE_COLUMN` for a guarded column, or null when the source holds no value there.
 */
export function pickEdit(
    input: BuildInput,
    result: BuildResult,
    pick: { id: string; ref: ElementRef; column: string; source: string },
): ReaderEdit | StepsOutcome | null {
    const refused = checkEdit(input, result, pick.ref, pick.column, true);
    if (refused) {
        return refused;
    }
    const v = values(result, pick.ref, pick.column)?.list.find((x) => x.source === pick.source && x.from === undefined);
    if (v === undefined || Array.isArray(v.value)) {
        return null;
    }
    return readerEdit(input, result, {
        id: pick.id,
        ref: pick.ref,
        column: pick.column,
        value: v.value as CellValue,
        picked: pick.source,
    });
}

// ---------------------------------------------------------------- rename (4.4)

/** One column of one source renamed. */
export interface Rename {
    readonly source: string;
    readonly table: TableName;
    readonly from: string;
    readonly to: string;
}

const renameKeys = <T>(rec: Readonly<Record<string, T>>, from: string, to: string): Record<string, T> =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k === from ? to : k, v]));

/**
 * Rename one value column of one source (4.4): its mapping's `renamed`, its steps' columns, rules
 * and filters, and the reader edits of its cells no other source fills move with it.
 * @param input - The build input.
 * @param copies - Each source's rows as read, by copy id.
 * @param r - The source, table and names.
 * @returns The new build input, `E_EDIT_ROLE_COLUMN` for a column a role, rule or step reads, or
 * `E_BAD_COMMAND` (`name-taken`) when the table already has a column of the new name.
 */
export function renameColumn(
    input: BuildInput,
    copies: ReadonlyMap<string, CopyTables>,
    r: Rename,
): BuildInput | StepsOutcome {
    const src = input.sources[r.source];
    if (readColumns(input, r.source).has(r.from)) {
        return { code: "E_EDIT_ROLE_COLUMN", params: { column: r.from } };
    }
    const renamed = src.mapping[r.table]?.renamed ?? {};
    const first = copies.get(src.origin.copy)?.[r.table]?.[0] ?? {};
    if (r.to !== r.from && Object.keys(first).some((k) => (renamed[k] ?? k) === r.to)) {
        return {
            code: "E_BAD_COMMAND",
            params: { reason: "name-taken", source: r.source, table: r.table, column: r.to },
        };
    }
    const read = Object.entries(renamed).find(([, w]) => w === r.from)?.[0] ?? r.from;
    const result = build(input, copies);
    const col = (c: string): string => (c === r.from ? r.to : c);
    const filter = <F extends { column: string }>(f: F | undefined): F | undefined =>
        f && { ...f, column: col(f.column) };
    const steps = input.steps.map((st): Step => {
        if (st.source !== r.source) {
            return st;
        }
        const out: Record<string, unknown> = { ...st };
        if (st.columns) {
            out.columns = st.columns.map((c) => col(c));
        }
        if (typeof st.clash === "object") {
            out.clash = renameKeys(st.clash, r.from, r.to);
        }
        if ("aggregate" in st && st.aggregate) {
            out.aggregate = renameKeys(st.aggregate, r.from, r.to);
        }
        if (st.rows) {
            out.rows = filter(st.rows);
        }
        if (st.except) {
            out.except = filter(st.except);
        }
        return out as unknown as Step;
    });
    const reader = (input.reader ?? []).map((o) => {
        if (o.op !== "edit" || o.column !== r.from) {
            return o;
        }
        const ref = o.node ?? o.edge;
        const mine = element(result, ref)?.loads.includes(r.source) === true;
        const others = values(result, ref, r.from)?.list.some((x) => x.source !== r.source) === true;
        return mine && !others ? { ...o, column: r.to } : o;
    });
    const mapping = { ...src.mapping, [r.table]: { ...src.mapping[r.table], renamed: { ...renamed, [read]: r.to } } };
    return {
        ...input,
        sources: { ...input.sources, [r.source]: { ...src, mapping } },
        steps,
        reader,
    };
}

/**
 * Whether a value from the checks here is a refusal rather than a result.
 * @param v - What a check returned.
 * @returns True for a `{ code, params }` outcome.
 */
export const isOutcome = (v: unknown): v is StepsOutcome =>
    typeof v === "object" && v !== null && "code" in v && "params" in v;
