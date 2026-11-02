/**
 * The tables of a Cytoscape 3 session: the CyCSV `.cytable` files (`research-session-and-style.md`
 * section 2.4; Cytoscape's `CSVCyReader`) and the virtual columns `tables/cytables.xml` joins into
 * them. Cells become XGMML att records, typed by the column's Java class, so the XGMML emitter
 * applies the same column rules (types, widening, equations, hidden columns, renames) to a
 * session's tables as to an XGMML file's atts.
 */

import { type ResolvedImportOptions } from "../../common/options.js";
import { plural } from "../../common/plural.js";
import { ImportReportBuilder } from "../../common/report.js";
import { ImportError } from "../../types.js";
import { CsvRecordReader } from "../csv/records.js";
import { type AttRec } from "../xgmml/document.js";
import { CYS_ISSUE, FORMAT, STYLE_COLUMN_PREFIX } from "./constants.js";
import { entryLabel } from "./session.js";

/** The Cytoscape type names of the Java classes a CyCSV column can hold. */
const JAVA_TYPES: Readonly<Record<string, string>> = {
    "java.lang.String": "String",
    "java.lang.Long": "Long",
    "java.lang.Integer": "Integer",
    "java.lang.Double": "Double",
    "java.lang.Boolean": "Boolean",
};

/** A list column's class: `java.util.List<java.lang.X>`. */
const LIST_CLASS = /^java\.util\.List<\s*([\w.]+)\s*>$/;

/** One column of a table. */
interface CyColumn {
    /** The name. */
    readonly name: string;
    /** The Cytoscape type of a scalar column, or of a list's items. */
    readonly type: string;
    /** A list column. */
    readonly list: boolean;
}

/**
 * One table, read.
 * @category Plugin helpers
 */
export interface CyTable {
    /** The table's path under `tables/` as the archive spells it (what cytables.xml names). */
    readonly path: string;
    /** The entry name, for messages. */
    readonly entry: string;
    /** The columns; the first is the primary key. */
    readonly columns: readonly CyColumn[];
    /** The rows by key text, in file order (the first row of a repeated key). */
    readonly rows: ReadonlyMap<string, readonly string[]>;
    /** The line each row starts on, by key. */
    readonly lines: ReadonlyMap<string, number>;
    /** The cells of each row that are a quoted empty field (`""`), by key; a row without one is absent. */
    readonly quotedEmpty?: ReadonlyMap<string, ReadonlySet<number>>;
}

/** What a table read reports besides its rows. */
interface RowProblems {
    short: number;
    long: number;
    repeated: number;
}

/** One CSV record of a table: its cells, its line, and the cells written as a quoted empty string. */
interface TableRecord {
    readonly cells: string[];
    readonly line: number;
    readonly quotedEmpty?: Set<number>;
}

/** The rows of a table, by key. */
interface TableRows {
    readonly rows: Map<string, readonly string[]>;
    readonly lines: Map<string, number>;
    readonly quotedEmpty: Map<string, ReadonlySet<number>>;
    readonly problems: RowProblems;
}

/**
 * Read one CyCSV table. A table that cannot be read at all (an unknown CyCSV version or column
 * class, a malformed header, broken CSV) is recorded as E_CYS_TABLE and skipped (null); rows with
 * the wrong number of cells or a repeated key are counted in one W_CYS_TABLE_ROW.
 * @param bytes - the entry's bytes
 * @param path - the table's path under `tables/`
 * @param entry - the entry name, for messages
 * @param report - the import's report
 * @param common - cancellation
 * @returns the table, or null
 */
export async function readCyTable(
    bytes: Uint8Array,
    path: string,
    entry: string,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
): Promise<CyTable | null> {
    const records = await tableRecords(bytes, common);
    if (typeof records === "string") {
        return tableError(report, entry, records);
    }
    const header = tableHeader(records);
    if (typeof header === "string") {
        return tableError(report, entry, header);
    }
    const columns = tableColumns(records[header.at].cells, records[header.at + 1].cells);
    if (typeof columns === "string") {
        return tableError(report, entry, columns);
    }
    const { rows, lines, quotedEmpty, problems } = tableRows(records.slice(header.at + header.lines), columns.length);
    if (problems.short + problems.long + problems.repeated > 0) {
        report.warning(
            "parse-error",
            CYS_ISSUE.TABLE_ROW,
            `${entryLabel(entry)}: ${problems.short} row${plural(problems.short)} with too few cells (the rest are unset), ${problems.long} with too many (the extra cells are ignored), ${problems.repeated} repeating a key (the first row is read)`,
        );
    }
    return { path, entry, columns, rows, lines, quotedEmpty };
}

/**
 * A table's CSV records.
 * @param bytes - the entry's bytes
 * @param common - cancellation
 * @returns the records, or why the CSV is broken
 */
async function tableRecords(bytes: Uint8Array, common: ResolvedImportOptions): Promise<TableRecord[] | string> {
    const scratch = new ImportReportBuilder(FORMAT, 0);
    const reader = new CsvRecordReader(bytes, scratch, { delimiter: ",", encoding: "utf-8", signal: common.signal });
    const records: TableRecord[] = [];
    try {
        for await (const cells of reader) {
            const empty = cells.flatMap((cell, i) => (cell.length === 0 && reader.quoted[i] ? [i] : []));
            records.push({ cells, line: reader.line, quotedEmpty: empty.length === 0 ? undefined : new Set(empty) });
        }
    } catch (err) {
        if (err instanceof ImportError) {
            return scratch.issues.at(-1)?.message ?? err.message;
        }
        throw err;
    }
    return records;
}

/**
 * Where a table's header starts and how many lines it takes.
 * @param records - the table's records
 * @returns the header, or why it does not parse
 */
function tableHeader(records: readonly TableRecord[]): { readonly at: number; readonly lines: number } | string {
    let at = 0;
    let version = 0;
    if (records[0]?.cells[0] === "CyCSV-Version") {
        const { cells } = records[0];
        if (cells.length !== 2 || !/^\d+$/.test(cells[1].trim())) {
            return `the version row ${JSON.stringify(cells)} does not parse`;
        }
        version = Number(cells[1]);
        at = 1;
    }
    if (version !== 0 && version !== 1) {
        return `CyCSV version "${records[0].cells[1]}" is not 0 or 1`;
    }
    // version 1: names, types, column options, table title; version 0: names, types, table title
    const lines = version === 1 ? 4 : 3;
    if (records.length < at + lines - 1) {
        return "the table header is incomplete";
    }
    // the reader skips blank lines, so a blank title line (another tool's) shows only as a gap
    // in the line numbers: the record after the row before the title is then the first data row
    const beforeTitle = records[at + lines - 2];
    const title = records.at(at + lines - 1);
    const titleBlank =
        title === undefined || (title.line > beforeTitle.line + 1 && !beforeTitle.cells.some((c) => /[\r\n]/.test(c)));
    return { at, lines: titleBlank ? lines - 1 : lines };
}

/**
 * A table's columns.
 * @param names - the column names
 * @param classes - their Java classes
 * @returns the columns, or why they cannot be read
 */
function tableColumns(names: readonly string[], classes: readonly string[]): CyColumn[] | string {
    if (names.length === 0 || classes.length !== names.length) {
        return `${names.length} column name${plural(names.length)} but ${classes.length} column class(es)`;
    }
    const columns: CyColumn[] = [];
    for (let i = 0; i < names.length; i++) {
        const column = columnOf(names[i], classes[i]);
        if (column === null) {
            return `column "${names[i]}" has the class "${classes[i]}", which graph-io cannot read`;
        }
        columns.push(column);
    }
    return columns;
}

/**
 * A table's rows by key: the first row of a repeated key is read, and rows of the wrong length are counted.
 * @param records - the data records
 * @param width - how many columns the table has
 * @returns the rows
 */
function tableRows(records: readonly TableRecord[], width: number): TableRows {
    const rows = new Map<string, readonly string[]>();
    const lines = new Map<string, number>();
    const quotedEmpty = new Map<string, ReadonlySet<number>>();
    const problems: RowProblems = { short: 0, long: 0, repeated: 0 };
    for (const record of records) {
        const { cells } = record;
        if (cells.length < width) {
            problems.short++;
        } else if (cells.length > width) {
            problems.long++;
        }
        const key = cells[0];
        if (rows.has(key)) {
            problems.repeated++;
            continue;
        }
        rows.set(key, cells.slice(0, width));
        lines.set(key, record.line);
        if (record.quotedEmpty !== undefined) {
            quotedEmpty.set(key, record.quotedEmpty);
        }
    }
    return { rows, lines, quotedEmpty, problems };
}

/**
 * The column of a name and a Java class.
 * @param name - the name
 * @param javaClass - the class text
 * @returns the column, or null for a class graph-io cannot read
 */
function columnOf(name: string, javaClass: string): CyColumn | null {
    const scalar = JAVA_TYPES[javaClass.trim()];
    if (scalar !== undefined) {
        return { name, type: scalar, list: false };
    }
    const list = LIST_CLASS.exec(javaClass.trim());
    const item = list === null ? undefined : JAVA_TYPES[list[1]];
    return item === undefined ? null : { name, type: item, list: true };
}

/**
 * Record E_CYS_TABLE for a table that is skipped.
 * @param report - the report
 * @param entry - the entry name
 * @param reason - why
 * @returns null
 */
function tableError(report: ImportReportBuilder, entry: string, reason: string): null {
    report.error("parse-error", CYS_ISSUE.TABLE, `${entryLabel(entry)}: ${reason}; the table is not read`);
    return null;
}

/**
 * The att record of one cell, or null for an unset cell. CyCSV's rules: an empty cell is unset
 * except in a String column, where it is the empty string (but in a `graphty.style.` column only when quoted,
 * `""`: graphty writes an element without a style value as an unquoted empty cell); a list cell holds its items separated
 * by line breaks (`\n`, or `\r` as some Cytoscape versions write them; Java's `split`, so trailing empty items
 * vanish; an empty String-list cell is one
 * empty item, any other empty list cell unset); a cell starting with `=` is an equation.
 * @param column - the column
 * @param text - the cell text
 * @param line - the row's line
 * @param namespace - the table namespace the column belongs to (null for the network's own table)
 * @param hidden - whether the column is hidden (HIDDEN and app tables)
 * @param quoted - whether the cell was quoted
 * @returns the att, or null
 * @category Plugin helpers
 */
export function cellAtt(
    column: CyColumn,
    text: string,
    line: number,
    namespace: string | null,
    hidden: boolean,
    quoted = false,
): AttRec | null {
    const cell = { line, namespace, hidden };
    if (text.startsWith("=")) {
        return att(column.name, column.list ? "List" : column.type, null, text, true, cell);
    }
    if (!column.list) {
        // graphty writes an unset style value as an unquoted empty cell, and the empty string quoted (`""`)
        if (
            text.length === 0 &&
            (column.type !== "String" || (!quoted && column.name.startsWith(STYLE_COLUMN_PREFIX)))
        ) {
            return null;
        }
        return att(column.name, column.type, null, text, false, cell);
    }
    if (text.length === 0 && column.type !== "String") {
        return null;
    }
    const list = att(column.name, "List", column.type, null, false, cell);
    for (const item of javaSplitLines(text)) {
        if (item.length === 0 && column.type !== "String") {
            continue;
        }
        list.children.push(att(column.name, column.type, null, item, false, cell));
    }
    return list;
}

/**
 * Java's `String.split("\n")`, with `\r` and `\r\n` read as line breaks too (Cytoscape has written list cells
 * with each): trailing empty strings are removed, and a text without a line break is itself (so `""` is one empty
 * item).
 * @param text - the cell
 * @returns the items
 */
function javaSplitLines(text: string): string[] {
    if (!text.includes("\n") && !text.includes("\r")) {
        return [text];
    }
    const items = text.split(/\r\n|\r|\n/);
    while (items.at(-1)?.length === 0) {
        items.pop();
    }
    return items;
}

/**
 * An att record.
 * @param name - the name
 * @param cyType - the Cytoscape type
 * @param elementType - a list's item type, or null
 * @param value - the value, or null
 * @param equation - the value is a formula
 * @param cell - where the cell sits
 * @param cell.line - the line
 * @param cell.namespace - the table namespace, or null
 * @param cell.hidden - a hidden column
 * @returns the record
 */
function att(
    name: string,
    cyType: string,
    elementType: string | null,
    value: string | null,
    equation: boolean,
    cell: { readonly line: number; readonly namespace: string | null; readonly hidden: boolean },
): AttRec {
    const { line, namespace, hidden } = cell;
    return {
        name,
        type: null,
        cyType,
        elementType,
        value,
        hidden,
        equation,
        children: [],
        extra: {},
        xml: null,
        hasGraph: false,
        text: "",
        line,
        namespace,
    };
}

/**
 * One virtual column of `tables/cytables.xml`.
 * @category Plugin helpers
 */
export interface VirtualColumn {
    /** The column name in the target table. */
    readonly name: string;
    /** The target table's path under `tables/`. */
    readonly targetTable: string;
    /** The source table's path. */
    readonly sourceTable: string;
    /** The source column's name. */
    readonly sourceColumn: string;
    /** The join column of the source (normally SUID). */
    readonly sourceJoinKey: string;
    /** The join column of the target (normally SUID). */
    readonly targetJoinKey: string;
}

/** A resolved virtual column: its type and its value per target row key. */
interface VirtualValues {
    readonly column: CyColumn;
    readonly values: ReadonlyMap<string, string>;
}

/**
 * Resolve the virtual columns of one table: each one's values joined from its source table,
 * following a source that is itself a virtual column. A column whose source table or column is
 * missing, or whose sources form a cycle, is E_CYS_TABLE and skipped.
 * @param target - the table
 * @param virtuals - every virtual column of the session
 * @param tableOf - reads (and caches) a table by path, null when it cannot be read or is absent
 * @param report - the report
 * @returns the virtual columns of the table, in cytables.xml order
 */
export async function virtualColumnsOf(
    target: CyTable,
    virtuals: readonly VirtualColumn[],
    tableOf: (path: string) => Promise<CyTable | null>,
    report: ImportReportBuilder,
): Promise<VirtualValues[]> {
    const out: VirtualValues[] = [];
    for (const virtual of virtuals) {
        if (virtual.targetTable !== target.path) {
            continue;
        }
        const resolved = await resolve(virtual, virtuals, tableOf, new Set());
        if (typeof resolved === "string") {
            report.error(
                "parse-error",
                CYS_ISSUE.TABLE,
                `${target.entry}: the virtual column "${virtual.name}" ${resolved}; the column is not read`,
            );
            continue;
        }
        const targetKey = target.columns.findIndex((c) => c.name === virtual.targetJoinKey);
        if (targetKey < 0) {
            report.error(
                "parse-error",
                CYS_ISSUE.TABLE,
                `${target.entry}: the virtual column "${virtual.name}" joins on the column "${virtual.targetJoinKey}", which the table does not have; the column is not read`,
            );
            continue;
        }
        out.push({
            column: { ...resolved.column, name: virtual.name },
            values: joinValues(target, targetKey, resolved),
        });
    }
    return out;
}

/**
 * A virtual column's values per target row key, joined from its source's values.
 * @param target - the table
 * @param targetKey - the index of the target's join column (0 or less: the row key)
 * @param source - the source's values by its join key
 * @returns target row key -> value, for the rows the source has a value for
 */
function joinValues(target: CyTable, targetKey: number, source: VirtualValues): Map<string, string> {
    const values = new Map<string, string>();
    for (const [key, cells] of target.rows) {
        const join = targetKey <= 0 ? key : cells[targetKey];
        const value = join === undefined ? undefined : source.values.get(join);
        if (value !== undefined) {
            values.set(key, value);
        }
    }
    return values;
}

/**
 * The values of a virtual column's source, by the source's join key.
 * @param virtual - the virtual column
 * @param virtuals - every virtual column
 * @param tableOf - the table reader
 * @param seen - the virtual columns on the current chain (a cycle check)
 * @returns the values, or the reason they cannot be read
 */
async function resolve(
    virtual: VirtualColumn,
    virtuals: readonly VirtualColumn[],
    tableOf: (path: string) => Promise<CyTable | null>,
    seen: Set<VirtualColumn>,
): Promise<VirtualValues | string> {
    if (seen.has(virtual)) {
        return "is part of a cycle of virtual columns";
    }
    seen.add(virtual);
    const source = await tableOf(virtual.sourceTable);
    if (source === null) {
        return `names the source table "${virtual.sourceTable}", which the session does not hold or cannot read`;
    }
    const joinIndex = source.columns.findIndex((c) => c.name === virtual.sourceJoinKey);
    if (joinIndex < 0) {
        return `joins on the column "${virtual.sourceJoinKey}", which its source table does not have`;
    }
    const joinOf = (key: string, cells: readonly string[]): string | undefined =>
        joinIndex === 0 ? key : cells[joinIndex];
    const own = source.columns.findIndex((c) => c.name === virtual.sourceColumn);
    if (own >= 0) {
        const values = new Map<string, string>();
        for (const [key, cells] of source.rows) {
            const join = joinOf(key, cells);
            if (join !== undefined && cells[own] !== undefined) {
                values.set(join, cells[own]);
            }
        }
        return { column: source.columns[own], values };
    }
    const chained = virtuals.find((v) => v.targetTable === source.path && v.name === virtual.sourceColumn);
    if (chained === undefined) {
        return `names the source column "${virtual.sourceColumn}", which its source table does not have`;
    }
    const inner = await resolve(chained, virtuals, tableOf, seen);
    if (typeof inner === "string") {
        return inner;
    }
    // re-key the chained values (by the chained source's join key) to this source's join key
    const values = new Map<string, string>();
    const chainedJoin = source.columns.findIndex((c) => c.name === chained.targetJoinKey);
    if (chainedJoin < 0) {
        return `reads the virtual column "${chained.name}", which joins on the column "${chained.targetJoinKey}" its table does not have`;
    }
    for (const [key, cells] of source.rows) {
        const lookup = chainedJoin <= 0 ? key : cells[chainedJoin];
        const value = lookup === undefined ? undefined : inner.values.get(lookup);
        const join = joinOf(key, cells);
        if (value !== undefined && join !== undefined) {
            values.set(join, value);
        }
    }
    return { column: inner.column, values };
}
