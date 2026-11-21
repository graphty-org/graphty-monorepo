/**
 * The `@graphty/graph-io/xlsx` subpath: the Excel workbook importer, its option type and its issue
 * code table. The importer's parser loads on first use, so registering it costs a few hundred bytes.
 * @module @graphty/graph-io/xlsx
 */

import { type GraphSink } from "@graphty/graph-format";

import { type GraphImporter, type GraphListing, type ImportInput, type ImportReport } from "../../types.js";
import { sniffXlsx, XLSX_EXTENSIONS, XLSX_FORMAT, XLSX_MIME_TYPES } from "./constants.js";
import { type XlsxImportOptions } from "./importer.js";

/**
 * The Excel workbook importer (`.xlsx`, `.xlsm`): one sheet read as a table, by the CSV importer's
 * rules. `listGraphs()` lists the sheets. A legacy `.xls` or an encrypted workbook is refused.
 * @category Built-in formats
 */
export const xlsxImporter: GraphImporter<XlsxImportOptions> = Object.freeze({
    format: XLSX_FORMAT,
    options: Object.freeze([
        "blankIdPrefix",
        "header",
        "idColumn",
        "labelColumn",
        "maxUncompressedBytes",
        "missing",
        "rowNumberIds",
        "sheet",
        "sourceColumn",
        "table",
        "targetColumn",
        "typeColumn",
    ]),
    extensions: XLSX_EXTENSIONS,
    mimeTypes: XLSX_MIME_TYPES,
    sniff: sniffXlsx,
    import: async (input: ImportInput, sink: GraphSink, options?: XlsxImportOptions): Promise<ImportReport> =>
        (await import("./importer.js")).importXlsx(input, sink, options),
    listGraphs: async (input: ImportInput, options?: XlsxImportOptions): Promise<readonly GraphListing[]> =>
        (await import("./importer.js")).listXlsxSheets(input, options),
});

export { XLSX_ISSUE } from "./constants.js";
export { type XlsxImportOptions } from "./importer.js";
