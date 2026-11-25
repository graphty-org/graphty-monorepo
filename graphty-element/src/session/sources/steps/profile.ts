/**
 * @file A source's tables as read, and one column's profile (design
 * design/data/multiple-data-sources-design.md, sections 5.1, 5.2 and 9.2), behind the
 * `source-steps` experiment: what a staged section and a join card show before anything is built.
 * Each read walks one column once and builds nothing. Pure, and free of Babylon.js, Lit and the DOM.
 */

import { GraphtyError } from "../../../errors/GraphtyError";
import { isSourceFactKey } from "../ids";
import { sourceOf } from "./acts";
import { isDate, isEmpty, isNumber, normalize, ownSpace, tableRows } from "./build";
import { buildOf, type Copies, copyMap, type SourceSteps, type StepsSource } from "./project";
import type { CellValue, Row, TableName, Value } from "./types";

/** How many distinct values a profile lists as samples. */
const SAMPLES = 5;

/** What most of a column's filled cells read as. */
type ProfileKind = "text" | "number" | "date" | "boolean";

/** One column's profile. */
export interface ColumnProfile {
    /** What most of its filled cells read as; ties read as text. */
    readonly kind: ProfileKind;
    /** How many rows the table holds. */
    readonly rows: number;
    /** Filled cells that read as `kind`. */
    readonly valid: number;
    /** Empty cells. */
    readonly empty: number;
    /** Distinct filled values. */
    readonly distinct: number;
    /** Values held by more than one row, and how many rows hold them. */
    readonly repeated: { readonly keys: number; readonly rows: number };
    /** The first few distinct values, in the order first read. */
    readonly samples: readonly CellValue[];
}

/** One table of a source as read. */
interface TableSummary {
    readonly table: TableName;
    readonly rows: number;
    /** Its columns under their working names, in the order first read. */
    readonly columns: readonly string[];
}

/** What a source's rows are. */
interface SourceSummary {
    readonly tables: readonly TableSummary[];
    /** Its copy id: `sha256:` and the digest of the bytes as read, or a ULID. */
    readonly origin: string;
    readonly format?: string;
    readonly size?: number;
    readonly loadedAt?: string;
    readonly delimiter?: { readonly value: string; readonly detected: boolean };
    readonly mapping: MappingSummary;
}

/** What a source's rows are for: rows are, key, the spaces named, the types. */
interface MappingSummary {
    readonly rows: "nodes" | "edges" | "both";
    readonly key?: string;
    readonly space?: string;
    readonly type?: string;
    readonly edges?: {
        readonly source: string;
        readonly target: string;
        readonly sourceSpace?: string;
        readonly targetSpace?: string;
        readonly edgeId?: string;
    };
    readonly endTypes?: { readonly source?: string; readonly target?: string };
}

/**
 * The column a source's rows are keyed by because they were numbered under it: the file never had it.
 * @param src - The source.
 * @returns The column, or undefined for a source keyed by a column of its own or by none.
 */
export function numberedKey(src: StepsSource): string | undefined {
    return src.numbered !== undefined && src.numbered === src.mapping.nodes?.key ? src.numbered : undefined;
}

/**
 * What a source's rows are for. A node space reads only once it was named, since unset Add proposes
 * the type; an end's space reads unless it is the source's own.
 * @param src - The source.
 * @returns The mapping.
 */
function mappingSummary(src: StepsSource): MappingSummary {
    const { nodes, edges } = src.mapping;
    const own = ownSpace(src.id);
    const named = (space: string | undefined): string | undefined => (space === own ? undefined : space);
    const defined = <T extends object>(o: T): Partial<T> =>
        Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
    let rows: MappingSummary["rows"] = "nodes";
    if (edges !== undefined) {
        rows = nodes === undefined ? "edges" : "both";
    }
    return {
        rows,
        ...defined({
            key: numberedKey(src) === undefined ? nodes?.key : undefined,
            space: src.spacePicked === true ? nodes?.space : undefined,
            type: src.stagedType ?? undefined,
            edges:
                edges === undefined
                    ? undefined
                    : {
                          source: edges.source,
                          target: edges.target,
                          ...defined({
                              sourceSpace: named(edges.sourceSpace),
                              targetSpace: named(edges.targetSpace),
                              edgeId: edges.edgeId,
                          }),
                      },
            endTypes: src.endTypes === undefined || Object.keys(src.endTypes).length === 0 ? undefined : src.endTypes,
        }),
    };
}

/**
 * What one filled cell reads as.
 * @param v - The cell.
 * @returns Its kind.
 */
function kindOf(v: CellValue): ProfileKind {
    if (typeof v === "boolean") {
        return "boolean";
    }
    if (isNumber(v)) {
        return "number";
    }
    return isDate(v) ? "date" : "text";
}

/**
 * The profile of a list of cells.
 * @param cells - The cells, one per row.
 * @returns The profile.
 */
function profileOf(cells: Iterable<CellValue | undefined>): ColumnProfile {
    let rows = 0;
    let empty = 0;
    const kinds: Record<ProfileKind, number> = { text: 0, number: 0, date: 0, boolean: 0 };
    const held = new Map<string, { first: CellValue; n: number }>();
    for (const v of cells) {
        rows++;
        if (isEmpty(v)) {
            empty++;
            continue;
        }
        kinds[kindOf(v)]++;
        const k = normalize(v);
        const at = held.get(k);
        if (at === undefined) {
            held.set(k, { first: v, n: 1 });
        } else {
            at.n++;
        }
    }
    // Text wins a tie: it is the reading every filled cell can take.
    const kind = (["text", "number", "date", "boolean"] as const).reduce((a, b) => (kinds[b] > kinds[a] ? b : a));
    let keys = 0;
    let repeatedRows = 0;
    for (const { n } of held.values()) {
        if (n > 1) {
            keys++;
            repeatedRows += n;
        }
    }
    return {
        kind,
        rows,
        valid: kinds[kind],
        empty,
        distinct: held.size,
        repeated: { keys, rows: repeatedRows },
        samples: [...held.values()].slice(0, SAMPLES).map((each) => each.first),
    };
}

/**
 * A source's rows of one table, under their working names.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param src - The source.
 * @param table - The table; absent, the table its node rows live in, else its edge rows.
 * @returns The table and its rows.
 */
function rowsOf(
    value: SourceSteps,
    copies: Copies,
    src: StepsSource,
    table: TableName | undefined,
): { table: TableName; rows: readonly Row[] } {
    const map = copyMap(copies);
    const which = table ?? (tableRows(src, map, "nodes") === null ? "edges" : "nodes");
    return { table: which, rows: tableRows(src, map, which) ?? [] };
}

/**
 * The columns of some rows, in the order first read, without the element's own `_source.` facts.
 * @param rows - The rows.
 * @param numbered - The column the rows' key was numbered under, left out too.
 * @returns The column names.
 */
function columnsOf(rows: readonly Row[], numbered: string | undefined): string[] {
    const out = new Set<string>();
    for (const row of rows) {
        for (const k of Object.keys(row)) {
            if (!isSourceFactKey(k) && k !== numbered) {
                out.add(k);
            }
        }
    }
    return [...out];
}

/**
 * One column's profile in one source's rows as read.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param source - The source.
 * @param column - The column, by its working name.
 * @param table - The table; absent, the one its node rows live in, else its edge rows.
 * @returns The profile.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, or `E_UNKNOWN_ATTRIBUTE`
 *   `{ source, column, table }` for a column the table does not hold.
 */
function sourceProfile(
    value: SourceSteps,
    copies: Copies,
    source: string,
    column: string,
    table?: TableName,
): ColumnProfile {
    const read = rowsOf(value, copies, sourceOf(value, source), table);
    if (!read.rows.some((row) => column in row)) {
        throw new GraphtyError({
            code: "E_UNKNOWN_ATTRIBUTE",
            message: `Source ${source} holds no column ${JSON.stringify(column)} in its ${read.table}.`,
            source: "data",
            details: { source, column, table: read.table },
        });
    }
    return profileOf(read.rows.map((row) => row[column]));
}

/**
 * The profile of the keys of the nodes one id space holds in a build (Field 1's Key), or of a column
 * they carry, each value of a list apart.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param space - The space.
 * @param field - The column; absent, the keys.
 * @returns The profile; every count 0 for a space no node lives in.
 */
export function spaceProfile(value: SourceSteps, copies: Copies, space: string, field?: string): ColumnProfile {
    const cells = function* (): Generator<CellValue | undefined> {
        for (const n of buildOf(value, copies).nodes.values()) {
            if (n.space !== space) {
                continue;
            }
            const v = field === undefined ? n.key : n.values[field];
            if (Array.isArray(v)) {
                yield* v as CellValue[];
            } else {
                yield v as CellValue | undefined;
            }
        }
    };
    return profileOf(cells());
}

/** One column the nodes of a space carry. */
interface SpaceColumn {
    readonly name: string;
    readonly kind: ProfileKind | "list";
    readonly filled: number;
}

/**
 * The columns the nodes of one id space carry in a build, the ones merges brought included.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param space - The space.
 * @returns The columns, in the order first met.
 */
export function spaceColumns(value: SourceSteps, copies: Copies, space: string): readonly SpaceColumn[] {
    const cells = new Map<string, Value[]>();
    for (const n of buildOf(value, copies).nodes.values()) {
        for (const [name, v] of n.space === space ? Object.entries(n.values) : []) {
            // a source's own value of a clash is no column of the space
            if (!isEmpty(v) && !isSourceFactKey(name) && n.clashColumns?.[name] === undefined) {
                const held = cells.get(name) ?? [];
                held.push(v);
                cells.set(name, held);
            }
        }
    }
    return Object.freeze(
        [...cells].map(([name, held]) =>
            Object.freeze({
                name,
                kind: held.some((v) => Array.isArray(v)) ? ("list" as const) : profileOf(held as CellValue[]).kind,
                filled: held.length,
            }),
        ),
    );
}

/**
 * What a source's rows are: rows and columns per table, and what reading it recorded.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param source - The source.
 * @returns The summary.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source.
 */
function sourceSummary(value: SourceSteps, copies: Copies, source: string): SourceSummary {
    const src = sourceOf(value, source);
    const map = copyMap(copies);
    const tables = (["nodes", "edges"] as const).flatMap((table): TableSummary[] => {
        const rows = tableRows(src, map, table);
        return rows === null ? [] : [{ table, rows: rows.length, columns: columnsOf(rows, numberedKey(src)) }];
    });
    return {
        tables,
        origin: src.origin.copy,
        ...(src.type === undefined ? {} : { format: src.type }),
        ...(src.read?.size === undefined ? {} : { size: src.read.size }),
        ...(src.read?.at === undefined ? {} : { loadedAt: src.read.at }),
        ...(src.read?.delimiter === undefined ? {} : { delimiter: src.read.delimiter }),
        mapping: mappingSummary(src),
    };
}

/** One source's rows as read, read again at each call. */
export interface TableHandle {
    readonly source: string;
    summary(): SourceSummary;
    profile(column: string, options?: { readonly table?: TableName }): ColumnProfile;
}

/**
 * A handle on one source's rows, reading the value and copies `now` gives at each call.
 * @param now - The value and copies now.
 * @param source - The source.
 * @returns The handle.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source.
 */
export function tableHandle(now: () => { value: SourceSteps; copies: Copies }, source: string): TableHandle {
    sourceOf(now().value, source);
    return Object.freeze({
        source,
        summary: () => {
            const { value, copies } = now();
            return sourceSummary(value, copies, source);
        },
        profile: (column: string, options: { readonly table?: TableName } = {}) => {
            const { value, copies } = now();
            return sourceProfile(value, copies, source, column, options.table);
        },
    });
}
