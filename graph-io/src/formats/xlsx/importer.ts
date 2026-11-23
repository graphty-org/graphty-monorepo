/**
 * The Excel workbook importer: one sheet of an `.xlsx` or `.xlsm` workbook, read as a table by the
 * CSV importer's rules (header, endpoint and id columns, node or edge table, column typing and
 * `missing`). The sheet is the one `sheet` names (matched exactly, after NFC), else the one
 * `graphIndex` / `graphName` chooses, else the first in tab order. String cells are text (an empty
 * string stays the empty string), numbers keep their saved digits, numbers under a date style become
 * ISO 8601 text, booleans are true or false; error cells and formulas saved without a value are
 * unset. Formulas are never evaluated.
 */

import { GraphFormatError, type GraphSink } from "@graphty/graph-format";

import { CellBudgetBuilder, maxEmptyCellsOption } from "../../common/cell-budget.js";
import { chooseGraph, describe, graphChosen, resolveImportOptions } from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import {
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphListing,
    ImportError,
    type ImportInput,
    type ImportReport,
} from "../../types.js";
import { csvImporter, type CsvImportOptions } from "../csv/importer.js";
import { XLSX_FORMAT, XLSX_ISSUE } from "./constants.js";
import { openWorkbook, type SheetRows, type Workbook } from "./workbook.js";

/** The default total of uncompressed bytes one import may inflate (2 GiB), as for Cytoscape sessions. */
const DEFAULT_MAX_UNCOMPRESSED = 2 * 1024 * 1024 * 1024;

/** The longest text a JavaScript engine is sure to hold (V8's limit), which a sheet's table text may not pass. */
const MAX_TABLE_TEXT = 2 ** 29 - 24;

/**
 * The options of the workbook importer: which sheet, the archive's byte budget, and the CSV
 * importer's table options, which a sheet is read by.
 * @category Built-in formats
 */
export interface XlsxImportOptions
    extends
        GraphChoiceOptions,
        CommonImportOptions,
        Pick<
            CsvImportOptions,
            | "header"
            | "table"
            | "sourceColumn"
            | "targetColumn"
            | "typeColumn"
            | "idColumn"
            | "labelColumn"
            | "rowNumberIds"
            | "blankIdPrefix"
            | "missing"
        > {
    /**
     * The name of the sheet to read, matched exactly after Unicode NFC normalization. Left out, the
     * first sheet in tab order (hidden sheets included) is read, unless `graphIndex` or `graphName`
     * chooses one. A name no sheet has stops the import with E_SHEET_NOT_FOUND, whose params list
     * every sheet.
     * @defaultValue the first sheet
     */
    sheet?: string | undefined;
    /**
     * The most bytes one import may unpack from the workbook archive, in total (2 GiB). A file that
     * would unpack to more, or one compressed more than 1000 to 1, fails with E_TOO_LARGE, as does a
     * sheet whose cells add up to more characters than this (or than about 536 million), which a
     * small sheet can when many cells repeat one long shared string.
     * @defaultValue 2147483648
     */
    maxUncompressedBytes?: number | undefined;
}

/**
 * The byte budget option.
 * @param value - the caller's value
 * @returns the budget
 */
function budgetOf(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_MAX_UNCOMPRESSED;
    }
    if (typeof value === "number" && value > 0 && (Number.isInteger(value) || value === Infinity)) {
        return value;
    }
    return badOption("maxUncompressedBytes", value, "is not a positive integer");
}

/**
 * Refuse an option value, as the other importers do (E_UNSUPPORTED).
 * @param option - the option
 * @param value - its value
 * @param why - what is wrong
 * @throws GraphFormatError E_UNSUPPORTED, always
 */
function badOption(option: string, value: unknown, why: string): never {
    throw new GraphFormatError("E_UNSUPPORTED", `option ${option}: ${describe(value)} ${why}`, {
        option,
        found: value,
    });
}

/**
 * The index of the sheet to read.
 * @param workbook - the workbook
 * @param options - the caller's options
 * @param report - the report
 * @returns the index
 */
function chooseSheet(workbook: Workbook, options: XlsxImportOptions, report: ImportReportBuilder): number {
    const names = workbook.sheets.map((sheet) => sheet.name);
    const { sheet } = options;
    if (sheet === undefined) {
        const index = chooseGraph(names, options, report);
        if (!graphChosen(options) && names.length > 1) {
            report.warning(
                "unsupported",
                XLSX_ISSUE.SHEET_CHOSEN,
                `read the first of ${names.length} sheets, ${JSON.stringify(names[0])}; pass sheet to read another`,
                { element: names[0] },
                { sheet: names[0] },
            );
        }
        return index;
    }
    if (typeof sheet !== "string") {
        return badOption("sheet", sheet, "is not a string");
    }
    if (graphChosen(options)) {
        return badOption("sheet", sheet, "and graphIndex or graphName both choose a sheet; pass one");
    }
    const index = names.indexOf(sheet.normalize("NFC"));
    if (index < 0) {
        const params = { sheet, sheets: names };
        report.failWith(
            "validation-error",
            XLSX_ISSUE.SHEET_NOT_FOUND,
            `the workbook has no sheet named ${JSON.stringify(sheet)}; it has ${names.map((name) => JSON.stringify(name)).join(", ")}`,
            { element: sheet },
            params,
            params,
        );
    }
    return index;
}

/**
 * Quote a text cell as RFC 4180 does.
 * @param text - the text
 * @returns the quoted field
 */
function quote(text: string): string {
    return `"${text.replaceAll('"', '""')}"`;
}

/**
 * A sheet's rows as CSV text: every row as wide as the used columns, an empty row for each
 * row without a value (so a CSV line number is the sheet's row number), leading and trailing empty
 * columns and trailing empty rows left out. The empty cells this fills count against
 * `maxEmptyCells`, and the text's length against `maxChars` (E_TOO_LARGE).
 * @param sheet - the sheet's cells
 * @param limits - the most empty cells and characters allowed
 * @param limits.maxEmptyCells - the most empty cells allowed
 * @param limits.maxChars - the most characters the text may hold
 * @param report - the report
 * @returns the text
 */
function tableText(
    sheet: SheetRows,
    limits: { maxEmptyCells: number; maxChars: number },
    report: ImportReportBuilder,
): string {
    const { maxEmptyCells, maxChars } = limits;
    let first = Infinity;
    let end = 0;
    let filled = 0;
    for (const { cells } of sheet.rows) {
        filled += cells.length;
        for (const cell of cells) {
            first = Math.min(first, cell.column);
            end = Math.max(end, cell.column + 1);
        }
    }
    const width = Math.max(0, end - first);
    const empty = sheet.rows.length * width - filled;
    if (empty > maxEmptyCells) {
        report.failWith(
            "unsupported",
            XLSX_ISSUE.TOO_MANY_EMPTY_CELLS,
            `the sheet's ${sheet.rows.length} rows by ${width} columns hold ${empty} empty cells, more than maxEmptyCells (${maxEmptyCells})`,
        );
    }
    const lines: string[] = [];
    let line = 1;
    let chars = 0;
    for (const { row, cells } of sheet.rows) {
        for (; line < row; line++) {
            lines.push("");
        }
        const fields = new Array<string>(width).fill("");
        for (const { column, text, quoted } of cells) {
            fields[column - first] = quoted ? quote(text) : text;
        }
        const joined = fields.join(",");
        chars += joined.length + 1;
        if (chars > maxChars) {
            report.failWith(
                "unsupported",
                XLSX_ISSUE.TOO_LARGE,
                `the sheet's cells hold more than ${maxChars} characters`,
            );
        }
        lines.push(joined);
        line++;
    }
    return lines.join("\n");
}

/**
 * Import one sheet of a workbook into a sink.
 * @param input - the workbook's bytes
 * @param sink - the sink
 * @param options - the options
 * @returns the report
 */
export async function importXlsx(
    input: ImportInput,
    sink: GraphSink,
    options: XlsxImportOptions = {},
): Promise<ImportReport> {
    const common = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: "weight" });
    const report = new ImportReportBuilder(XLSX_FORMAT, common.errorLimit);
    const { sheet: _sheet, maxUncompressedBytes, graphIndex: _index, graphName: _name, ...table } = options;
    const budget = budgetOf(maxUncompressedBytes);
    const workbook = await openWorkbook(input, report, common, budget);
    const chosen = workbook.sheets[chooseSheet(workbook, options, report)];
    report.resolve("sheet", chosen.name);
    const cells = await workbook.rows(chosen);
    if (cells.errorCells > 0) {
        report.warning(
            "missing-value",
            XLSX_ISSUE.CELL_ERROR,
            `${cells.errorCells} error cells (#N/A and others) were read as unset`,
            undefined,
            { count: cells.errorCells },
        );
    }
    if (cells.uncachedCells > 0) {
        report.warning(
            "missing-value",
            XLSX_ISSUE.NO_CACHED_VALUE,
            `${cells.uncachedCells} formula cells saved without a value were read as unset`,
            undefined,
            { count: cells.uncachedCells },
        );
    }
    // importGraph's maxEmptyCells reaches the importer as the budget of the builder it fills
    const maxEmptyCells = sink instanceof CellBudgetBuilder ? sink.maxEmptyCells : maxEmptyCellsOption(undefined);
    const text = tableText(cells, { maxEmptyCells, maxChars: Math.min(budget, MAX_TABLE_TEXT) }, report);
    let read: ImportReport;
    try {
        read = await csvImporter.import(text, sink, { ...table, delimiter: ",", decimal: "." });
    } catch (err) {
        if (err instanceof ImportError) {
            report.include(err.report);
            throw report.abort(err.message, err.details);
        }
        throw err;
    }
    sink.setMeta({ name: chosen.name, sourceFormat: XLSX_FORMAT, extra: { [XLSX_FORMAT]: { sheet: chosen.name } } });
    return report.include(read).finish();
}

/**
 * List a workbook's sheets, in tab order, without reading their cells.
 * @param input - the workbook's bytes
 * @param options - the options
 * @returns one listing per sheet
 */
export async function listXlsxSheets(input: ImportInput, options: XlsxImportOptions = {}): Promise<GraphListing[]> {
    const common = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: "weight" });
    const report = new ImportReportBuilder(XLSX_FORMAT, common.errorLimit);
    const workbook = await openWorkbook(input, report, common, budgetOf(options.maxUncompressedBytes));
    return workbook.sheets.map((sheet, index) => ({ index, name: sheet.name, nodes: null, edges: null }));
}
