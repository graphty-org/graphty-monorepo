/**
 * @file Sources and steps in a project file (design design/data/multiple-data-sources-design.md,
 * section 10), behind the `source-steps` experiment.
 *
 * The `graphty-sources` member carries, beside its `loads`, the section 10 names in version 2's
 * spelling (graphty-element/spec/README.md, 4.1): `sources` (each source record with its mapping,
 * its copy id and its rows as read under `copy`, then the reader source with its operations),
 * `types` (the type registry), `joins` (the ordered steps) and `build` (the build stamp, a ULID).
 * A copy is tables: `{ nodes: { <column>: values }, edges: {...} }`, with each column's graph-format
 * dtype in the record's `columns`, so an unset cell and a null one come back apart.
 *
 * The session keeps some of this in other shapes (a source's `type` and `config`, the kind
 * `"server"`, reader operation ids, `add-edge`); they are converted here on save and on open. What
 * a session derives again on open is not written: a source's table names and join come back from
 * its `loads` entry, its staged type, end types and picked space from its type rules and mapping,
 * and a network source's `_source.loads` cells from its id. A source's key-overlap reports are
 * session-only. The file keeps no part counter: parts are minted from the parts present (3.3).
 *
 * Every source is saved as a copy; a reference (3.11) is not written yet. Pure and free of
 * Babylon.js, Lit and the DOM.
 */

import type { JoinRecord } from "../../types";
import { copyKey, ownSpace } from "./build";
import { stagedJoinSteps } from "./compile";
import { type Copies, mintEditId, mintUlid, type SourceSteps, type StepsSource, type StepsSourceKind } from "./project";
import {
    type CellValue,
    type CopyTables,
    type Mapping,
    READER_SOURCE,
    type ReaderOp,
    type Row,
    type RowFilter,
    type Step,
    type TableName,
    type TypeEntry,
} from "./types";

/** The member names the sources and steps add to the `graphty-sources` member. */
export const STEPS_MEMBER_FIELDS: readonly string[] = ["sources", "types", "joins", "build"];

/** The step ops a saved `joins` list may hold. */
const OPS: ReadonlySet<string> = new Set([
    "join.add",
    "join.merge",
    "join.node-values",
    "join.edge-values",
    "join.edges",
]);

/** The reader operations a saved reader source may hold. */
const READER_OPS: ReadonlySet<string> = new Set(["remove", "add", "edit"]);

/** The column a network source's rows name their load in; derived from the source id on open. */
const SOURCE_LOADS = "_source.loads";

/** A ULID. */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** The graph-format dtype of a column whose set cells are all of one JavaScript type. */
const DTYPES = { number: "f64", boolean: "bool", string: "string" } as const;

/** A graph-format column declaration as a copy's `columns` carries it. */
interface ColumnDecl {
    readonly name: string;
    readonly dtype: string;
    /** For a `json` column: the rows whose cell is unset, so its nulls are literal. */
    readonly unset?: readonly number[];
}

/** One table of a copy as saved, and its column declarations. */
interface SavedTable {
    readonly cells: Record<string, unknown[]>;
    readonly decls: Record<string, ColumnDecl>;
}

/**
 * Whether a value is a plain JSON object.
 * @param v - The value.
 * @returns True for `{...}`.
 */
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The members of an object that are defined.
 * @param members - The members.
 * @returns Them, without the undefined ones.
 */
const defined = (members: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(members).filter(([, v]) => v !== undefined));

/**
 * A cell as text, as keys and filters compare it (version 2, section 11).
 * @param v - The cell.
 * @returns Its text; null and an absent cell read as empty.
 */
const textOf = (v: CellValue | undefined): string => (v === undefined || v === null ? "" : String(v));

// ---------------------------------------------------------------- save

/**
 * One table as columns with their dtypes.
 * @param rows - The rows as read.
 * @param drop - A column left out.
 * @returns The table.
 */
function tableOut(rows: readonly Row[], drop: string | undefined): SavedTable {
    const names = new Set(rows.flatMap((row) => Object.keys(row)));
    if (drop !== undefined) {
        names.delete(drop);
    }
    const cells: Record<string, unknown[]> = {};
    const decls: Record<string, ColumnDecl> = {};
    for (const name of names) {
        // A cell may hold a list or an object at run time, whatever `CellValue` says.
        const values: unknown[] = rows.map((row) => (Object.hasOwn(row, name) ? row[name] : undefined));
        const set = values.filter((v) => v !== undefined);
        const type = (["number", "boolean", "string"] as const).find((t) => set.every((v) => typeof v === t));
        cells[name] = values.map((v) => v ?? null);
        if (type === undefined || set.includes(null)) {
            const unset = values.flatMap((v, at) => (v === undefined ? [at] : []));
            decls[name] = { name, dtype: "json", ...(unset.length === 0 ? {} : { unset }) };
        } else {
            decls[name] = { name, dtype: DTYPES[type] };
        }
    }
    return { cells, decls };
}

/** The session's source kinds as version 2 spells them. */
const KIND_OUT: Readonly<Record<StepsSourceKind, string>> = {
    file: "file",
    url: "url",
    server: "network",
    sample: "sample",
    derived: "derived",
};

/**
 * A source's mapping as version 2 spells it: `nodes.space` exactly when `nodes.key`, and both end
 * spaces always.
 * @param src - The source.
 * @returns The mapping.
 */
function mappingOut(src: StepsSource): Mapping {
    const { nodes, edges } = src.mapping;
    const own = ownSpace(src.id);
    const nodesOut =
        nodes === undefined
            ? undefined
            : (() => {
                  const { space, ...rest } = nodes;
                  return rest.key === undefined ? rest : { ...rest, space: space ?? own };
              })();
    const edgesOut =
        edges === undefined
            ? undefined
            : { ...edges, sourceSpace: edges.sourceSpace ?? own, targetSpace: edges.targetSpace ?? own };
    return defined({ nodes: nodesOut, edges: edgesOut });
}

/**
 * One source as a version 2 source record.
 * @param src - The source.
 * @param copy - Its rows as read.
 * @returns The record.
 */
function sourceOut(src: StepsSource, copy: CopyTables): Record<string, unknown> {
    const drop = src.kind === "server" ? SOURCE_LOADS : undefined;
    const tables = (["nodes", "edges"] as const).flatMap((table) => {
        const rows = copy[table];
        return rows === undefined ? [] : [[table, tableOut(rows, drop)] as const];
    });
    return {
        id: src.id,
        label: src.label ?? "",
        kind: KIND_OUT[src.kind],
        ...defined({
            format: src.type,
            options: src.config,
        }),
        origin: { copy: src.origin.copy },
        mapping: mappingOut(src),
        ...defined({
            settings: src.settings,
            metadata: src.declared === undefined ? undefined : { ...src.declared },
        }),
        copy: Object.fromEntries(tables.map(([table, saved]) => [table, saved.cells])),
        columns: Object.fromEntries(tables.map(([table, saved]) => [table, saved.decls])),
    };
}

/**
 * A row filter as saved: its values as text, compared as exact strings after NFC (version 2, 4.1.8).
 * @param f - The filter.
 * @returns The filter, or undefined for none.
 */
const filterOut = (f: RowFilter | undefined): RowFilter | undefined =>
    f === undefined ? undefined : { column: f.column, values: f.values.map((v) => textOf(v)) };

/**
 * A step as saved: `rows` and `except` values as text.
 * @param step - The step.
 * @returns The step.
 */
function stepOut(step: Step): Step {
    if (!("rows" in step) && !("except" in step)) {
        return step;
    }
    return { ...step, ...defined({ rows: filterOut(step.rows), except: filterOut(step.except) }) };
}

/**
 * A type entry as saved: rule values as text, and `schema` always written.
 * @param entry - The entry.
 * @returns The entry.
 */
function typeOut(entry: TypeEntry): TypeEntry {
    return {
        ...entry,
        rules: entry.rules.map((r) => (r.values === undefined ? r : { ...r, values: r.values.map((v) => textOf(v)) })),
        schema: entry.schema ?? {},
    };
}

/**
 * The graph-format dtype a reader-added column is declared with.
 * @param v - The cell.
 * @returns The dtype.
 */
function dtypeOf(v: unknown): string {
    const type = typeof v;
    return type === "number" || type === "boolean" || type === "string" ? DTYPES[type] : "json";
}

/**
 * A reader operation as version 2 spells it: no id, an added edge an `add` with `edge`, an added
 * element's `dtypes`, and an edit's `was` always written.
 * @param op - The operation.
 * @returns The saved operation.
 */
function readerOut(op: ReaderOp): Record<string, unknown> {
    switch (op.op) {
        case "remove": {
            const { id: _id, ...rest } = op;
            return rest;
        }
        case "edit": {
            const { id: _id, was, ...rest } = op;
            return { ...rest, was: was ?? null };
        }
        default: {
            const columns = op.columns ?? {};
            const target = op.op === "add" ? { node: op.node } : { edge: op.edge, from: op.from, to: op.to };
            return {
                op: "add",
                ...target,
                ...(op.columns === undefined ? {} : { columns }),
                dtypes: Object.fromEntries(Object.entries(columns).map(([name, v]) => [name, dtypeOf(v)])),
            };
        }
    }
}

/** The most reader copies remembered: past it the oldest is let go and minted again if met. */
const READER_COPIES = 32;

/**
 * The reader copy's id and read time by the operations it holds, as saved, so a save of operations
 * a file was opened with or an earlier save wrote keeps them. ponytail: a small cache by content;
 * keep the id in the session value if a session ever saves more lists than it holds here.
 */
const readerCopies = new Map<string, { readonly copy: string; readonly loaded: string }>();

/**
 * Remember a reader copy's id and read time for its operations.
 * @param key - The operations as saved, as JSON.
 * @param held - The id and the time.
 * @param held.copy - The copy id.
 * @param held.loaded - When the copy was made.
 */
function keepReaderCopy(key: string, held: { readonly copy: string; readonly loaded: string }): void {
    readerCopies.delete(key);
    readerCopies.set(key, held);
    if (readerCopies.size > READER_COPIES) {
        readerCopies.delete(readerCopies.keys().next().value as string);
    }
}

/**
 * The reader copy's id and read time: those its operations were opened or last saved with, else
 * new ones (version 2, 4.1.4: a ULID minted on every edit).
 * @param key - The operations as saved, as JSON.
 * @returns The id and the time.
 */
function readerCopy(key: string): { readonly copy: string; readonly loaded: string } {
    const held = readerCopies.get(key) ?? { copy: mintUlid(), loaded: new Date().toISOString() };
    keepReaderCopy(key, held);
    return held;
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
    const operations = value.reader.map((op) => readerOut(op));
    const { copy, loaded } = readerCopy(JSON.stringify(operations));
    return {
        sources: [
            ...sources.map((src) => sourceOut(src, copies[copyKey(src)] ?? {})),
            {
                id: READER_SOURCE,
                label: READER_SOURCE,
                kind: "reader",
                origin: { copy },
                copy: { operations },
                loaded,
            },
        ],
        // A type left with no rules is not written: version 2 asks at least one (4.1.5).
        types: value.types.filter((entry) => entry.rules.length > 0).map((entry) => typeOut(entry)),
        // A staged joined table's join is written as its steps, off: a proposal (version 2, 4.1.8 rule 1).
        joins: [...value.steps, ...sources.flatMap((src) => stagedJoinSteps(value, copies, src))].map((step) =>
            stepOut(step),
        ),
        ...(value.build === undefined ? {} : { build: value.build }),
    };
}

// ---------------------------------------------------------------- open

/** What a saved member's sources and steps read as. */
export type StepsRead = { readonly value: SourceSteps; readonly copies: Copies } | { readonly pointer: string };

/**
 * One saved table back as rows.
 * @param cells - The table as saved.
 * @param decls - Its column declarations.
 * @returns The rows, or null when it is not shaped like a table.
 */
function tableIn(cells: unknown, decls: unknown): Row[] | null {
    if (!isObject(cells)) {
        return null;
    }
    const columns = Object.entries(cells);
    const count = columns.length === 0 ? 0 : (columns[0][1] as unknown[] | undefined)?.length;
    if (count === undefined || !columns.every(([, values]) => Array.isArray(values) && values.length === count)) {
        return null;
    }
    const declared = isObject(decls) ? decls : {};
    const unsetOf = (name: string): ReadonlySet<number> | null => {
        const decl = declared[name];
        if (!isObject(decl) || decl.dtype !== "json") {
            return null;
        }
        return new Set(Array.isArray(decl.unset) ? (decl.unset as number[]) : []);
    };
    const reads = columns.map(([name, values]) => [name, values as unknown[], unsetOf(name)] as const);
    return Array.from({ length: count }, (_, at) => {
        const row: Record<string, unknown> = {};
        for (const [name, values, unset] of reads) {
            // A typed column's null is unset; a json column's null is literal unless listed as unset.
            if (unset === null ? values[at] !== null : !unset.has(at)) {
                row[name] = values[at];
            }
        }
        return row as Row;
    });
}

/** The session's source kinds by their version 2 spelling. */
const KIND_IN: Readonly<Record<string, StepsSourceKind>> = {
    file: "file",
    url: "url",
    network: "server",
    sample: "sample",
    derived: "derived",
};

/** What a source's `loads` entry gives it back on open. */
interface LoadFacts {
    readonly tables: readonly string[];
    readonly tableRows?: readonly TableName[];
    readonly join?: JoinRecord;
}

/**
 * The table names, table kinds and join each `loads` entry records, by entry id.
 * @param loads - The member's `loads`.
 * @returns The facts by id.
 */
function loadFacts(loads: unknown): ReadonlyMap<string, LoadFacts> {
    const out = new Map<string, LoadFacts>();
    for (const entry of Array.isArray(loads) ? loads : []) {
        if (!isObject(entry) || typeof entry.id !== "string") {
            continue;
        }
        const tables = Array.isArray(entry.tables) ? (entry.tables as string[]) : [];
        const onto = typeof entry.joinedOnto === "string" ? entry.joinedOnto : null;
        out.set(entry.id, {
            tables,
            ...(Array.isArray(entry.tableRows) ? { tableRows: entry.tableRows as TableName[] } : {}),
            ...(isObject(entry.join)
                ? { join: { source: entry.id, onto, ...entry.join } as unknown as JoinRecord }
                : {}),
        });
    }
    return out;
}

/**
 * The type a source was staged with: the node type its whole-source rule names.
 * @param types - The registry.
 * @param id - The source.
 * @returns The type, or undefined.
 */
function stagedTypeOf(types: readonly TypeEntry[], id: string): string | undefined {
    return types.find((t) => t.kind === "node" && t.rules.some((r) => r.source === id && Object.keys(r).length === 1))
        ?.name;
}

/**
 * A saved copy back as rows.
 * @param copy - The copy as saved.
 * @param columns - Its column declarations, by table.
 * @param network - For a network source: its id, which each row names in `_source.loads`.
 * @returns The rows by table, or null when the copy is not shaped as saved.
 */
function copyIn(copy: Record<string, unknown>, columns: unknown, network: string | undefined): CopyTables | null {
    const decls = isObject(columns) ? columns : {};
    const tables: Partial<Record<TableName, Row[]>> = {};
    for (const [table, saved] of Object.entries(copy)) {
        const rows = tableIn(saved, decls[table]);
        if ((table !== "nodes" && table !== "edges") || rows === null) {
            return null;
        }
        tables[table] =
            network === undefined ? rows : rows.map((row) => ({ ...row, [SOURCE_LOADS]: [network] }) as unknown as Row);
    }
    return tables;
}

/**
 * One saved source back, with its copy.
 * @param raw - The source as saved.
 * @param facts - What its `loads` entry records.
 * @param types - The registry, which says the type it was staged with.
 * @returns The source and its rows, or null when it is not shaped like one.
 */
function sourceIn(
    raw: Record<string, unknown>,
    facts: LoadFacts | undefined,
    types: readonly TypeEntry[],
): { source: StepsSource; copy: CopyTables } | null {
    const { id, label, kind, format, options, origin, mapping, settings, metadata, copy, columns } = raw;
    if (
        typeof id !== "string" ||
        typeof kind !== "string" ||
        !(kind in KIND_IN) ||
        typeof label !== "string" ||
        !isObject(origin) ||
        typeof origin.copy !== "string" ||
        !isObject(mapping) ||
        !isObject(copy) ||
        (format !== undefined && typeof format !== "string") ||
        (options !== undefined && !isObject(options))
    ) {
        return null;
    }
    const tables = copyIn(copy, columns, kind === "network" ? id : undefined);
    if (tables === null) {
        return null;
    }
    const nodes = mapping.nodes as Mapping["nodes"];
    const stagedType = stagedTypeOf(types, id);
    const space = nodes?.space;
    const declared =
        isObject(metadata) && typeof metadata.directed === "boolean" && typeof metadata.statedBy === "string"
            ? { directed: metadata.directed, statedBy: metadata.statedBy }
            : undefined;
    const source = {
        id,
        // Sources reading the same bytes share a copy id, so a digest's rows go under the source's id.
        origin: origin.copy.startsWith("sha256:") ? { copy: origin.copy, rows: id } : { copy: origin.copy },
        mapping: mapping,
        kind: KIND_IN[kind],
        label: label === "" ? null : label,
        tables: facts?.tables ?? [],
        ...defined({
            type: format,
            config: options,
            settings: isObject(settings) ? settings : undefined,
            tableRows: facts?.tableRows,
            join: facts?.join,
            stagedType,
            spacePicked:
                nodes?.key !== undefined && space !== undefined && space !== ownSpace(id) && space !== stagedType
                    ? true
                    : undefined,
            declared,
        }),
    } as StepsSource;
    return { source, copy: tables };
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
    const { build } = member;
    if (build !== undefined && !(typeof build === "string" && ULID.test(build))) {
        return "/build";
    }
    return null;
}

/**
 * A type entry as the session keeps it: an empty `schema` is none.
 * @param entry - The entry as saved.
 * @returns The entry.
 */
function typeIn(entry: TypeEntry): TypeEntry {
    const { schema, ...rest } = entry;
    return schema === undefined || Object.keys(schema).length === 0 ? rest : entry;
}

/**
 * One saved reader operation as the session keeps it, under a new id.
 * @param op - The operation as saved.
 * @returns The operation, or null when it is not shaped as saved.
 */
function readerIn(op: Record<string, unknown>): ReaderOp | null {
    const id = mintEditId();
    if (op.op === "add") {
        if (!isObject(op.dtypes)) {
            return null;
        }
        const { dtypes: _dtypes, ...rest } = op;
        if (isObject(op.edge)) {
            return isObject(op.from) && isObject(op.to)
                ? ({ id, ...rest, op: "add-edge" } as unknown as ReaderOp)
                : null;
        }
        return isObject(op.node) ? ({ id, ...rest } as unknown as ReaderOp) : null;
    }
    if (op.op === "edit" && (typeof op.column !== "string" || !("value" in op))) {
        return null;
    }
    return isObject(op.node) || isObject(op.edge) ? ({ id, ...op } as unknown as ReaderOp) : null;
}

/**
 * The reader source's operations as saved, and its copy id and read time kept for the next save.
 * @param raw - The reader source.
 * @returns Its operations, or null when they are not shaped as saved.
 */
function readerOps(raw: Record<string, unknown>): ReaderOp[] | null {
    const operations = isObject(raw.copy) ? raw.copy.operations : undefined;
    if (!Array.isArray(operations) || !operations.every((op) => isObject(op) && READER_OPS.has(op.op as string))) {
        return null;
    }
    const out: ReaderOp[] = [];
    for (const op of operations as Record<string, unknown>[]) {
        const read = readerIn(op);
        if (read === null) {
            return null;
        }
        out.push(read);
    }
    const copy = isObject(raw.origin) ? raw.origin.copy : undefined;
    if (typeof copy === "string") {
        keepReaderCopy(JSON.stringify(out.map((op) => readerOut(op))), {
            copy,
            loaded: typeof raw.loaded === "string" ? raw.loaded : new Date().toISOString(),
        });
    }
    return out;
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
    const types = (member.types as TypeEntry[]).map((entry) => typeIn(entry));
    const facts = loadFacts(member.loads);
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
        const read = sourceIn(raw, facts.get(raw.id as string), types);
        if (read === null || read.source.id in sources) {
            return { pointer: `/sources/${String(at)}` };
        }
        sources[read.source.id] = read.source;
        copies[copyKey(read.source)] = read.copy;
    }
    const { build } = member;
    return {
        value: {
            sources,
            steps: member.joins as Step[],
            types,
            reader,
            ...(build === undefined ? {} : { build: build as string }),
        },
        copies,
    };
}
