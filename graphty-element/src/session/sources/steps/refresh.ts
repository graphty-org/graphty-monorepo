/**
 * @file Removal, refresh and replace of one source, behind the `source-steps` experiment (design
 * design/data/multiple-data-sources-design.md, sections 3.2, 3.10 and 7.12).
 *
 * A refresh or a replace keeps the source's id and swaps its copy (its rows as read). Every step
 * that depends on the source checks the columns it reads in the new rows: a step missing one is
 * held (kept, listed and not built) until the reader picks a column for it or the column comes
 * back. Reader edits are checked against what the source says now (`was`, and `picked` for a pick
 * or Use), and settled by the reader with Follow, Keep or Drop. Every outcome is a code and its
 * parameters. Pure and free of Babylon.js, Lit and the DOM.
 */

import type { SourceRefreshIssue, SourceRoleName } from "../../types";
import { build, stepSources } from "./build";
import type { Copies, SourceSteps, StepsSource } from "./project";
import { element, values } from "./provenance";
import type { BuildResult, CopyTables, ReaderEdit, ReaderOp, Row, Step, TableName, Value } from "./types";

/** What a removal, refresh or replace reports, as a code and its parameters. */
export type RefreshIssue = SourceRefreshIssue;

/** Where a reader edit stands against the sources now (7.12). */
export interface EditState {
    readonly id: string;
    /** `applies`; `lost`: it names no element; `source-changed`: the value under it moved. */
    readonly state: "applies" | "lost" | "source-changed";
    /** For `source-changed`: the value it was made over (a pick: the value it took). */
    readonly was?: Value | null;
    /** For `source-changed`: what the source says now (a pick: what the picked source says). */
    readonly now?: Value | null;
}

/** One change a refresh, a replace or a reader decision makes. */
export type RefreshEdit =
    /** Swap a source's copy for newer rows, under the same source id. */
    | {
          readonly kind: "replace-copy";
          readonly id: string;
          /** The new copy's id. */
          readonly copy: string;
          /** What the new copy was read from, its name and its tables, as `data.sources()` lists them. */
          readonly label?: string | null;
          readonly input?: string;
          readonly tables?: readonly string[];
      }
    /** Settle a reader edit whose source moved under it. */
    | { readonly kind: "settle-edit"; readonly id: string; readonly choice: "follow" | "keep" | "drop" }
    /** A held step's way out: a column of the new rows takes the vanished name, or a role is cleared. */
    | { readonly kind: "resolve-step"; readonly index: number; readonly column?: string; readonly none?: true };

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

const same = (a: Value | null | undefined, b: Value | null | undefined): boolean =>
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Each working name two read columns of one table would share (7.12): a rename took a name the
 * source's rows also carry, as when a newer file brings a column under a renamed column's name.
 * @param src - The source.
 * @param tables - Its rows as read.
 * @returns One table and working name per collision.
 */
export function takenNames(
    src: StepsSource,
    tables: CopyTables | undefined,
): { readonly table: TableName; readonly column: string }[] {
    const out: { readonly table: TableName; readonly column: string }[] = [];
    for (const table of ["nodes", "edges"] as const) {
        const renamed = src.mapping[table]?.renamed ?? {};
        const read = new Set((tables?.[table] ?? []).flatMap((r) => Object.keys(r)));
        const seen = new Set<string>();
        for (const k of read) {
            const w = renamed[k] ?? k;
            if (seen.has(w)) {
                out.push({ table, column: w });
            }
            seen.add(w);
        }
    }
    return out;
}

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
    const out = new Set<string>();
    for (const row of rows ?? []) {
        for (const k of Object.keys(row)) {
            out.add(renamed?.[k] ?? k);
        }
    }
    return out;
}

/**
 * The working columns of each table of a source's copy.
 * @param src - The source.
 * @param tables - Its copy.
 * @returns The names per table.
 */
function columnsOf(src: StepsSource, tables: CopyTables | undefined): Record<TableName, Set<string>> {
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
function needs(step: Step, src: StepsSource): Need[] {
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
function ownNeeds(step: Step, src: StepsSource): Need[] {
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
 * The columns a step reads that the rows of its sources no longer hold.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param index - The step's place.
 * @returns One `E_COLUMN_MISSING` or `E_READ_ROLE_MISSING` per missing column.
 */
export function missingColumns(value: SourceSteps, copies: Copies, index: number): RefreshIssue[] {
    const step = value.steps[index] as Step | undefined;
    if (step === undefined) {
        return [];
    }
    const out: RefreshIssue[] = [];
    for (const id of new Set(stepSources(step))) {
        const src = value.sources[id] as StepsSource | undefined;
        const tables = src === undefined ? undefined : copies[src.origin.copy];
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
 * Each type rule of a source reading a column its rows no longer hold.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param id - The source.
 * @returns One `E_COLUMN_MISSING` per rule.
 */
function missingRuleColumns(value: SourceSteps, copies: Copies, id: string): RefreshIssue[] {
    const src = value.sources[id] as StepsSource | undefined;
    if (src === undefined) {
        return [];
    }
    const have = columnsOf(src, copies[src.origin.copy]);
    return value.types.flatMap((t) =>
        t.rules
            .filter((r) => r.source === id && r.column !== undefined)
            .filter((r) => !have.nodes.has(r.column as string) && !have.edges.has(r.column as string))
            .map((r): RefreshIssue => {
                const table: TableName =
                    t.kind === "node" && r.end === undefined && src.mapping.nodes ? "nodes" : "edges";
                return {
                    code: "E_COLUMN_MISSING",
                    params: { source: id, column: r.column as string, table, type: t.name },
                };
            }),
    );
}

/**
 * The value with each step that depends on a source held while a column it reads is missing, and
 * turned back on once every column it was held for is back.
 * @param prior - The value before the change.
 * @param next - The value after it.
 * @param copies - Every copy either value names.
 * @param ids - The sources whose rows changed.
 * @returns The value with the steps held or let go.
 */
function holdSteps(prior: SourceSteps, next: SourceSteps, copies: Copies, ids: readonly string[]): SourceSteps {
    const steps = next.steps.map((step, index) => {
        if (!stepSources(step).some((id) => ids.includes(id))) {
            return step;
        }
        if (missingColumns(next, copies, index).length > 0) {
            return step.off === true ? step : { ...step, off: true };
        }
        const wasHeld = step.off === true && missingColumns(prior, copies, index).length > 0;
        if (!wasHeld) {
            return step;
        }
        const { off: _off, ...on } = step;
        return on;
    });
    return { ...next, steps };
}

/**
 * Swap a source's copy, keeping its id, mapping and steps; a step reading a column the new rows
 * lack is held (7.12).
 * @param prior - The value.
 * @param edit - The swap.
 * @param copies - Every copy, the new one included.
 * @returns The next value.
 */
function replaceCopy(
    prior: SourceSteps,
    edit: Extract<RefreshEdit, { kind: "replace-copy" }>,
    copies: Copies,
): SourceSteps {
    const src = prior.sources[edit.id] as StepsSource | undefined;
    if (src === undefined) {
        return prior;
    }
    const swapped: StepsSource = {
        ...src,
        origin: { ...src.origin, copy: edit.copy },
        ...(edit.label === undefined ? {} : { label: edit.label }),
        ...(edit.input === undefined ? {} : { input: edit.input }),
        ...(edit.tables === undefined ? {} : { tables: edit.tables }),
    };
    const next = { ...prior, sources: { ...prior.sources, [edit.id]: swapped } };
    return holdSteps(prior, next, copies, [edit.id]);
}

/**
 * A held step's way out (7.12): `column` names a column of the new rows that takes the vanished
 * working name (written to the source's `renamed`); `none` clears a vanished weight, time or
 * location role. The step is built again once nothing it reads is missing.
 * @param prior - The value.
 * @param edit - The choice.
 * @param copies - The rows as read.
 * @returns The next value; the same value when the step is missing nothing.
 */
function resolveStep(
    prior: SourceSteps,
    edit: Extract<RefreshEdit, { kind: "resolve-step" }>,
    copies: Copies,
): SourceSteps {
    const [first] = missingColumns(prior, copies, edit.index);
    if (first === undefined || first.code === "W_COLUMN_UNUSED") {
        return prior;
    }
    const { source, table, column } = first.params as { source: string; table: TableName; column: string };
    const src = prior.sources[source];
    const mapping = src.mapping[table] ?? {};
    let next = prior;
    if (edit.column !== undefined) {
        const renamed = { ...mapping.renamed, [edit.column]: column };
        next = withMapping(prior, src, table, { ...mapping, renamed });
    } else if (edit.none === true && first.code === "E_READ_ROLE_MISSING") {
        const step = prior.steps[edit.index];
        if (step.op === "join.add") {
            const { [first.params.role]: _gone, ...rest } = mapping as Record<string, unknown>;
            next = withMapping(prior, src, table, rest);
        } else if (step.op === "join.edges" && (first.params.role === "weight" || first.params.role === "time")) {
            // A step's own weight or time read: `null` means none (3.9).
            const cleared: Step = { ...step, read: { ...step.read, [first.params.role]: null } };
            next = { ...prior, steps: prior.steps.map((s, i) => (i === edit.index ? cleared : s)) };
        }
    }
    return holdSteps(prior, next, copies, [source]);
}

/**
 * The value with one table of one source's mapping replaced.
 * @param value - The value.
 * @param src - The source.
 * @param table - The table.
 * @param mapping - Its new mapping.
 * @returns The value.
 */
function withMapping(value: SourceSteps, src: StepsSource, table: TableName, mapping: object): SourceSteps {
    const next: StepsSource = { ...src, mapping: { ...src.mapping, [table]: mapping } };
    return { ...value, sources: { ...value.sources, [src.id]: next } };
}

const noEdits = new WeakMap<SourceSteps, { readonly copies: Copies; readonly result: BuildResult }>();

/**
 * The build with every reader edit of one cell left out: what the sources say under the edits.
 * @param value - The value.
 * @param copies - The rows as read.
 * @returns The build.
 */
function underEdits(value: SourceSteps, copies: Copies): BuildResult {
    const held = noEdits.get(value);
    if (held?.copies === copies) {
        return held.result;
    }
    const result = build(
        { ...value, reader: value.reader.filter((op) => op.op !== "edit") },
        new Map(Object.entries(copies)),
    );
    noEdits.set(value, { copies, result });
    return result;
}

/**
 * Where one reader edit stands (7.12, 3.10): a typed edit against the value it was made over, a
 * pick against what its picked source says now (a pick whose source no longer has the cell is the
 * reader's own value and applies).
 * @param op - The edit.
 * @param base - The build under the edits.
 * @returns Its state and, when the source moved, the value under it now.
 */
function stateOf(op: ReaderEdit, base: BuildResult): EditState & { readonly under?: Value | null } {
    const ref = op.node ?? op.edge;
    if (element(base, ref) === null) {
        return { id: op.id, state: "lost" };
    }
    const cell = values(base, ref, op.column);
    const under = cell?.shown ?? null;
    if (op.picked !== undefined) {
        const mine = cell?.list.find((x) => x.source === op.picked && x.from === undefined);
        return mine === undefined || same(mine.value, op.value)
            ? { id: op.id, state: "applies" }
            : { id: op.id, state: "source-changed", was: op.value, now: mine.value, under };
    }
    return op.was === undefined || same(under, op.was)
        ? { id: op.id, state: "applies" }
        : { id: op.id, state: "source-changed", was: op.was, now: under, under };
}

/**
 * Where each reader edit of one cell stands against the sources now.
 * @param value - The value.
 * @param copies - The rows as read.
 * @returns One state per edit, in the order made.
 */
export function editStates(value: SourceSteps, copies: Copies): readonly EditState[] {
    const edits = value.reader.filter((op): op is ReaderEdit => op.op === "edit");
    if (edits.length === 0) {
        return [];
    }
    const base = underEdits(value, copies);
    return edits.map((op) => {
        const { under: _under, ...state } = stateOf(op, base);
        return state;
    });
}

/**
 * Settle a reader edit (7.12, 3.10): `drop` takes it back; `keep` keeps its value as the reader's
 * own (a pick loses `picked`) and stops reporting the move; `follow` takes the picked source's new
 * value. An edit whose source did not move is left as it is, except by `drop`.
 * @param prior - The value.
 * @param edit - The edit and the choice.
 * @param copies - The rows as read.
 * @returns The next value.
 */
function settleEdit(
    prior: SourceSteps,
    edit: Extract<RefreshEdit, { kind: "settle-edit" }>,
    copies: Copies,
): SourceSteps {
    if (edit.choice === "drop") {
        return { ...prior, reader: prior.reader.filter((op) => op.id !== edit.id) };
    }
    const op = prior.reader.find((o): o is ReaderEdit => o.id === edit.id && o.op === "edit");
    if (op === undefined) {
        return prior;
    }
    const state = stateOf(op, underEdits(prior, copies));
    if (state.state !== "source-changed") {
        return prior;
    }
    const under = state.under ?? null;
    let settled: ReaderOp;
    if (edit.choice === "follow" && op.picked !== undefined) {
        settled = { ...op, value: state.now as ReaderEdit["value"], was: under };
    } else {
        const { picked: _picked, ...own } = op;
        settled = { ...own, was: under };
    }
    return { ...prior, reader: prior.reader.map((o) => (o.id === edit.id ? settled : o)) };
}

/**
 * The value a refresh edit makes.
 * @param prior - The value.
 * @param edit - The edit.
 * @param copies - Every copy, a new one included.
 * @returns The next value.
 */
export function applyRefreshEdit(prior: SourceSteps, edit: RefreshEdit, copies: Copies): SourceSteps {
    switch (edit.kind) {
        case "replace-copy":
            return replaceCopy(prior, edit, copies);
        case "settle-edit":
            return settleEdit(prior, edit, copies);
        default:
            return resolveStep(prior, edit, copies);
    }
}

/**
 * The steps a source's removal takes with it (`W_STEP_REMOVED`): every step that depends on it,
 * a merge dropping what meets no node of the source included.
 * @param value - The value before the removal.
 * @param id - The source.
 * @returns One issue per step.
 */
export function removedSteps(value: SourceSteps, id: string): RefreshIssue[] {
    return value.steps.flatMap((step, index): RefreshIssue[] =>
        stepSources(step, value).includes(id)
            ? [{ code: "W_STEP_REMOVED", params: { step: index, reason: "source-removed", source: id } }]
            : [],
    );
}

/**
 * What a swap of a source's copy reports: each column a step or a type rule reads that the new
 * rows lack, each column the new rows bring that the old ones did not, and each reader edit whose
 * source moved under it.
 * @param prior - The value before.
 * @param next - The value after.
 * @param copies - Every copy either value names.
 * @param id - The source.
 * @returns The issues.
 */
export function refreshIssues(prior: SourceSteps, next: SourceSteps, copies: Copies, id: string): RefreshIssue[] {
    const missing = next.steps.flatMap((step, index) =>
        stepSources(step).includes(id) ? missingColumns(next, copies, index) : [],
    );
    const before = prior.sources[id] as StepsSource | undefined;
    const after = next.sources[id] as StepsSource | undefined;
    const unused: RefreshIssue[] = [];
    if (before !== undefined && after !== undefined) {
        const old = columnsOf(before, copies[before.origin.copy]);
        const now = columnsOf(after, copies[after.origin.copy]);
        for (const table of ["nodes", "edges"] as const) {
            for (const column of now[table]) {
                if (!old[table].has(column)) {
                    unused.push({ code: "W_COLUMN_UNUSED", params: { source: id, column } });
                }
            }
        }
    }
    const moved = editStates(next, copies)
        .filter((s) => s.state === "source-changed")
        .map((s): RefreshIssue => {
            const op = next.reader.find((o) => o.id === s.id) as ReaderEdit;
            return {
                code: "W_EDIT_SOURCE_CHANGED",
                params: {
                    edit: s.id,
                    was: s.was ?? null,
                    now: s.now ?? null,
                    ...(op.picked === undefined ? {} : { picked: op.picked }),
                },
            };
        });
    return [...missing, ...missingRuleColumns(next, copies, id), ...unused, ...moved];
}

/** How many nodes and edges a change added, removed and changed. */
export interface ChangeCounts {
    readonly nodes: { readonly added: number; readonly removed: number; readonly changed: number };
    readonly edges: { readonly added: number; readonly removed: number; readonly changed: number };
}

/**
 * Count what changed between two builds, by element id and values.
 * @param before - The build before.
 * @param after - The build after.
 * @returns The counts.
 */
export function changeCounts(before: BuildResult, after: BuildResult): ChangeCounts {
    const count = <E extends { readonly values: Readonly<Record<string, Value>> }>(
        a: ReadonlyMap<string, E>,
        b: ReadonlyMap<string, E>,
    ): ChangeCounts["nodes"] => {
        let changed = 0;
        let removed = 0;
        for (const [id, el] of a) {
            const next = b.get(id);
            if (next === undefined) {
                removed++;
            } else if (JSON.stringify(next.values) !== JSON.stringify(el.values)) {
                changed++;
            }
        }
        const added = [...b.keys()].filter((id) => !a.has(id)).length;
        return { added, removed, changed };
    };
    return { nodes: count(before.nodes, after.nodes), edges: count(before.edges, after.edges) };
}

/**
 * Whether a copy holds the same rows as another.
 * @param a - One copy.
 * @param b - The other.
 * @returns True when every table holds the same rows in the same order.
 */
export function sameRows(a: CopyTables | undefined, b: CopyTables | undefined): boolean {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
