/**
 * @file Sources and steps in a project file (design design/data/multiple-data-sources-design.md,
 * section 10), behind the `source-steps` experiment.
 *
 * The `graphty-sources` member carries, beside its `loads`, the section 10 names: `sources` (each
 * source with its mapping, its copy id and its rows as read under `copy`, then the reader source
 * with its operations), `types` (the type registry) and `joins` (the ordered steps), plus `parts`
 * (the highest part minted per source) and `build` (the build count). The rows of a copy are saved
 * as columns: `{ rows, columns: { <name>: values } }`, a cell a row lacks written as null; a cell
 * may be any JSON value, a list or an object included.
 *
 * Every source is saved as a copy; a reference (3.11) is not written yet. Pure and free of
 * Babylon.js, Lit and the DOM.
 */

import type { Copies, SourceSteps, StepsSource } from "./project";
import {
    type CellValue,
    type CopyTables,
    READER_SOURCE,
    type ReaderOp,
    type Row,
    type Step,
    type TableName,
    type TypeEntry,
} from "./types";

/** The member names the sources and steps add to the `graphty-sources` member. */
export const STEPS_MEMBER_FIELDS: readonly string[] = ["sources", "types", "joins", "parts", "build"];

/** The step ops a saved `joins` list may hold. */
const OPS: ReadonlySet<string> = new Set([
    "join.add",
    "join.merge",
    "join.node-values",
    "join.edge-values",
    "join.edges",
]);

/** The reader operations a saved reader source may hold. */
const READER_OPS: ReadonlySet<string> = new Set(["remove", "add", "add-edge", "edit"]);

/** One table of a copy as saved. */
interface SavedTable {
    readonly rows: number;
    readonly columns: Readonly<Record<string, readonly (CellValue | null)[]>>;
}

/**
 * One table as columns.
 * @param rows - The rows as read.
 * @returns The table, a cell a row lacks as null.
 */
function tableOut(rows: readonly Row[]): SavedTable {
    const names = new Set(rows.flatMap((row) => Object.keys(row)));
    const columns: Record<string, (CellValue | null)[]> = {};
    for (const name of names) {
        columns[name] = rows.map((row) => row[name] ?? null);
    }
    return { rows: rows.length, columns };
}

/**
 * The member names a save adds for the sources and steps.
 * @param value - The sources and steps.
 * @param copies - Their rows as read.
 * @returns The names and their values, or null when there is nothing to save.
 */
export function stepsMemberFields(value: SourceSteps, copies: Copies): Record<string, unknown> | null {
    const sources = Object.values(value.sources);
    if (sources.length === 0 && value.reader.length === 0 && value.types.length === 0) {
        return null;
    }
    const saved = sources.map(({ input: _session, ...src }) => {
        const copy = copies[src.origin.copy] ?? {};
        const tables = Object.fromEntries(
            (["nodes", "edges"] as const).flatMap((table) => {
                const rows = copy[table];
                return rows === undefined ? [] : [[table, tableOut(rows)]];
            }),
        );
        return { ...src, copy: tables };
    });
    return {
        sources: [...saved, { id: READER_SOURCE, kind: "reader", copy: { operations: value.reader } }],
        types: value.types,
        joins: value.steps,
        ...(value.parts === undefined ? {} : { parts: value.parts }),
        ...(value.build === undefined ? {} : { build: value.build }),
    };
}

/** What a saved member's sources and steps read as. */
export type StepsRead = { readonly value: SourceSteps; readonly copies: Copies } | { readonly pointer: string };

/**
 * Whether a value is a plain JSON object.
 * @param v - The value.
 * @returns True for `{...}`.
 */
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Whether a value is a cell as read. A row read from a JSON file or a registered source may hold a
 * list or an object (a `tags` list, `_source.loads`), so any JSON value is one.
 * @param v - The value.
 * @returns True for a string, a finite number, a boolean, null, or a list or object of those.
 */
const isCell = (v: unknown): v is CellValue | null =>
    v === null ||
    typeof v === "string" ||
    typeof v === "boolean" ||
    (typeof v === "number" && Number.isFinite(v)) ||
    (Array.isArray(v) && v.every(isCell)) ||
    (isObject(v) && Object.values(v).every(isCell));

/**
 * One saved table back as rows.
 * @param saved - The table as saved.
 * @returns The rows, or null when it is not shaped like a table.
 */
function tableIn(saved: unknown): Row[] | null {
    if (!isObject(saved) || !Number.isInteger(saved.rows) || (saved.rows as number) < 0 || !isObject(saved.columns)) {
        return null;
    }
    const count = saved.rows as number;
    const columns = Object.entries(saved.columns);
    if (!columns.every(([, values]) => Array.isArray(values) && values.length === count && values.every(isCell))) {
        return null;
    }
    return Array.from({ length: count }, (_, at) =>
        Object.fromEntries(columns.map(([name, values]) => [name, (values as CellValue[])[at]])),
    );
}

/**
 * One saved source back, with its copy.
 * @param raw - The source as saved.
 * @returns The source and its rows, or null when it is not shaped like one.
 */
function sourceIn(raw: Record<string, unknown>): { source: StepsSource; copy: CopyTables } | null {
    const { copy, ...rest } = raw;
    const origin = rest.origin as { copy?: unknown } | undefined;
    if (
        typeof rest.id !== "string" ||
        typeof rest.kind !== "string" ||
        !isObject(origin) ||
        typeof origin.copy !== "string" ||
        !isObject(rest.mapping) ||
        !Array.isArray(rest.tables) ||
        !(rest.label === null || typeof rest.label === "string") ||
        !isObject(copy)
    ) {
        return null;
    }
    const tables: Partial<Record<TableName, Row[]>> = {};
    for (const [table, saved] of Object.entries(copy)) {
        const rows = tableIn(saved);
        if ((table !== "nodes" && table !== "edges") || rows === null) {
            return null;
        }
        tables[table] = rows;
    }
    return { source: rest as unknown as StepsSource, copy: tables };
}

/**
 * Whether each item of a list is an object with a string at one name, and another check.
 * @param list - The list.
 * @param name - The name that holds a string.
 * @param ok - What else each item must pass.
 * @returns True when every item does.
 */
const listOf = (list: unknown, name: string, ok: (item: Record<string, unknown>) => boolean): boolean =>
    Array.isArray(list) && list.every((item) => isObject(item) && typeof item[name] === "string" && ok(item));

/**
 * Where a member's sources and steps are not shaped as saved, beyond each source.
 * @param member - The `graphty-sources` member.
 * @returns A pointer relative to the member, or null when the lists are shaped as saved.
 */
function shapeProblem(member: Readonly<Record<string, unknown>>): string | null {
    if (!Array.isArray(member.sources) || !member.sources.every(isObject)) {
        return "/sources";
    }
    if (!listOf(member.joins, "op", (step) => OPS.has(step.op as string) && typeof step.source === "string")) {
        return "/joins";
    }
    if (
        !listOf(
            member.types,
            "name",
            (entry) => (entry.kind === "node" || entry.kind === "edge") && Array.isArray(entry.rules),
        )
    ) {
        return "/types";
    }
    const { parts, build } = member;
    if (parts !== undefined && !(isObject(parts) && Object.values(parts).every((n) => Number.isInteger(n)))) {
        return "/parts";
    }
    if (build !== undefined && !Number.isInteger(build)) {
        return "/build";
    }
    return null;
}

/**
 * The reader source's operations as saved.
 * @param raw - The reader source.
 * @returns Its operations, or null when they are not shaped as saved.
 */
function readerOps(raw: Record<string, unknown>): ReaderOp[] | null {
    const operations = isObject(raw.copy) ? raw.copy.operations : undefined;
    return listOf(operations, "id", (op) => READER_OPS.has(op.op as string)) ? (operations as ReaderOp[]) : null;
}

/**
 * Read back the sources and steps a member carries.
 * @param member - The `graphty-sources` member.
 * @returns The value and its copies; a pointer, relative to the member, to what is not shaped as
 *     saved; or null when the member carries none.
 */
export function readStepsMember(member: Readonly<Record<string, unknown>>): StepsRead | null {
    if (STEPS_MEMBER_FIELDS.every((name) => member[name] === undefined)) {
        return null;
    }
    const wrong = shapeProblem(member);
    if (wrong !== null) {
        return { pointer: wrong };
    }
    const { parts, build } = member;
    const sources: Record<string, StepsSource> = {};
    const copies: Record<string, CopyTables> = {};
    let reader: readonly ReaderOp[] = [];
    for (const [at, raw] of (member.sources as Record<string, unknown>[]).entries()) {
        if (raw.id === READER_SOURCE && raw.kind === "reader") {
            const operations = readerOps(raw);
            if (operations === null) {
                return { pointer: `/sources/${String(at)}/copy/operations` };
            }
            reader = operations;
            continue;
        }
        const read = sourceIn(raw);
        if (read === null || read.source.id in sources) {
            return { pointer: `/sources/${String(at)}` };
        }
        sources[read.source.id] = read.source;
        copies[read.source.origin.copy] = read.copy;
    }
    return {
        value: {
            sources,
            steps: member.joins as Step[],
            types: member.types as TypeEntry[],
            reader,
            ...(parts === undefined ? {} : { parts: parts as Record<string, number> }),
            ...(build === undefined ? {} : { build: build as number }),
        },
        copies,
    };
}
