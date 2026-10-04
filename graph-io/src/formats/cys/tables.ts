/**
 * The tables of a Cytoscape 3 session: the CyCSV `.cytable` files (`research-session-and-style.md`
 * section 2.4; Cytoscape's `CSVCyReader`) and the virtual columns `tables/cytables.xml` joins into
 * them. Cells become XGMML att records, typed by the column's Java class, so the XGMML emitter
 * applies the same column rules (types, widening, equations, hidden columns, renames) to a
 * session's tables as to an XGMML file's atts.
 */

import { type ResolvedImportOptions } from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { ImportError } from "../../types.js";
import { CsvRecordReader } from "../csv/records.js";
import { type AttRec } from "../xgmml/document.js";
import { CYS_ISSUE, FORMAT } from "./constants.js";

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
}

/** What a table read reports besides its rows. */
interface RowProblems {
    short: number;
    long: number;
    repeated: number;
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
    const scratch = new ImportReportBuilder(FORMAT, 0);
    const reader = new CsvRecordReader(bytes, scratch, { delimiter: ",", encoding: "utf-8", signal: common.signal });
    const records: { readonly cells: string[]; readonly line: number }[] = [];
    try {
        for await (const cells of reader) {
            records.push({ cells, line: reader.line });
        }
    } catch (err) {
        if (err instanceof ImportError) {
            return tableError(report, entry, scratch.issues.at(-1)?.message ?? err.message);
        }
        throw err;
    }
    let at = 0;
    let version = 0;
    if (records[0]?.cells[0] === "CyCSV-Version") {
        const { cells } = records[0];
        if (cells.length !== 2 || !/^\d+$/.test(cells[1].trim())) {
            return tableError(report, entry, `the version row ${JSON.stringify(cells)} does not parse`);
        }
        version = Number(cells[1]);
        at = 1;
    }
    if (version !== 0 && version !== 1) {
        return tableError(report, entry, `CyCSV version "${records[0].cells[1]}" is not 0 or 1`);
    }
    // version 1: names, types, column options, table title; version 0: names, types, table title
    let headerLines = version === 1 ? 4 : 3;
    if (records.length < at + headerLines - 1) {
        return tableError(report, entry, "the table header is incomplete");
    }
    // the reader skips blank lines, so a blank title line (another tool's) shows only as a gap
    // in the line numbers: the record after the row before the title is then the first data row
    const beforeTitle = records[at + headerLines - 2];
    const title = records.at(at + headerLines - 1);
    if (
        title === undefined ||
        (title.line > beforeTitle.line + 1 && !beforeTitle.cells.some((c) => /[\r\n]/.test(c)))
    ) {
        headerLines--;
    }
    const names = records[at].cells;
    const classes = records[at + 1].cells;
    if (names.length === 0 || classes.length !== names.length) {
        return tableError(report, entry, `${names.length} column name(s) but ${classes.length} column class(es)`);
    }
    const columns: CyColumn[] = [];
    for (let i = 0; i < names.length; i++) {
        const column = columnOf(names[i], classes[i]);
        if (column === null) {
            return tableError(
                report,
                entry,
                `column "${names[i]}" has the class "${classes[i]}", which graph-io cannot read`,
            );
        }
        columns.push(column);
    }
    const rows = new Map<string, readonly string[]>();
    const lines = new Map<string, number>();
    const problems: RowProblems = { short: 0, long: 0, repeated: 0 };
    for (const record of records.slice(at + headerLines)) {
        const { cells } = record;
        if (cells.length < columns.length) {
            problems.short++;
        } else if (cells.length > columns.length) {
            problems.long++;
        }
        const key = cells[0];
        if (rows.has(key)) {
            problems.repeated++;
            continue;
        }
        rows.set(key, cells.slice(0, columns.length));
        lines.set(key, record.line);
    }
    if (problems.short + problems.long + problems.repeated > 0) {
        report.warning(
            "parse-error",
            CYS_ISSUE.TABLE_ROW,
            `${entry}: ${problems.short} row(s) with too few cells (the rest are unset), ${problems.long} with too many (the extra cells are ignored), ${problems.repeated} repeating a key (the first row is read)`,
        );
    }
    return { path, entry, columns, rows, lines };
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
    report.error("parse-error", CYS_ISSUE.TABLE, `${entry}: ${reason}; the table is not read`);
    return null;
}

/**
 * The att record of one cell, or null for an unset cell. CyCSV's rules: an empty cell is unset
 * except in a String column, where it is the empty string; a list cell holds its items separated
 * by newlines (Java's `split`, so trailing empty items vanish; an empty String-list cell is one
 * empty item, any other empty list cell unset); a cell starting with `=` is an equation.
 * @param column - the column
 * @param text - the cell text
 * @param line - the row's line
 * @param namespace - the table namespace the column belongs to (null for the network's own table)
 * @param hidden - whether the column is hidden (HIDDEN and app tables)
 * @returns the att, or null
 * @category Plugin helpers
 */
export function cellAtt(
    column: CyColumn,
    text: string,
    line: number,
    namespace: string | null,
    hidden: boolean,
): AttRec | null {
    if (text.startsWith("=")) {
        return att(column.name, column.list ? "List" : column.type, null, text, line, namespace, hidden, true);
    }
    if (!column.list) {
        if (text.length === 0 && column.type !== "String") {
            return null;
        }
        return att(column.name, column.type, null, text, line, namespace, hidden, false);
    }
    if (text.length === 0 && column.type !== "String") {
        return null;
    }
    const list = att(column.name, "List", column.type, null, line, namespace, hidden, false);
    for (const item of javaSplitLines(text)) {
        if (item.length === 0 && column.type !== "String") {
            continue;
        }
        list.children.push(att(column.name, column.type, null, item, line, namespace, hidden, false));
    }
    return list;
}

/**
 * Java's `String.split("\n")`: trailing empty strings are removed, and a text without a newline
 * is itself (so `""` is one empty item).
 * @param text - the cell
 * @returns the items
 */
function javaSplitLines(text: string): string[] {
    if (!text.includes("\n")) {
        return [text];
    }
    const items = text.split("\n");
    while (items.length > 0 && items[items.length - 1].length === 0) {
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
 * @param line - the line
 * @param namespace - the table namespace, or null
 * @param hidden - a hidden column
 * @param equation - the value is a formula
 * @returns the record
 */
function att(
    name: string,
    cyType: string,
    elementType: string | null,
    value: string | null,
    line: number,
    namespace: string | null,
    hidden: boolean,
    equation: boolean,
): AttRec {
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
        const values = new Map<string, string>();
        for (const [key, cells] of target.rows) {
            const join = targetKey <= 0 ? key : cells[targetKey];
            const value = join === undefined ? undefined : resolved.values.get(join);
            if (value !== undefined) {
                values.set(key, value);
            }
        }
        out.push({ column: { ...resolved.column, name: virtual.name }, values });
    }
    return out;
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
