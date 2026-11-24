/**
 * What the workbook importer's modules share: the format facts, the sniffer and the issue code
 * table. Kept apart from the parser so the root registry can name the format without loading it.
 */

import { TOO_MANY_EMPTY_CELLS_CODE } from "../../common/cell-budget.js";
import {
    AMBIGUOUS_GRAPH_NAME_CODE,
    GRAPH_NOT_FOUND_CODE,
    INPUT_ISSUE,
    NO_GRAPH_CODE,
    SHEET_NOT_FOUND_CODE,
} from "../../common/codes.js";
import { startsLikeZip } from "../../common/zip.js";
import { CSV_ISSUE } from "../csv/index.js";

/**
 * The format name.
 * @category Plugin helpers
 */
export const XLSX_FORMAT = "xlsx";

/**
 * File extensions: Excel workbooks, with and without macros.
 * @category Plugin helpers
 */
export const XLSX_EXTENSIONS: readonly string[] = Object.freeze([".xlsx", ".xlsm"]);

/**
 * MIME types of Excel workbooks.
 * @category Plugin helpers
 */
export const XLSX_MIME_TYPES: readonly string[] = Object.freeze([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
]);

/**
 * Issue codes of the workbook importer: its own, and the CSV codes it relays, since a sheet is
 * read as a table by the CSV importer's rules.
 * @category Built-in formats
 */
export const XLSX_ISSUE = Object.freeze({
    ...CSV_ISSUE,
    ...INPUT_ISSUE,
    /** The input is not a zip archive (or is text). The import stops. */
    NOT_ZIP: "E_XLSX_NOT_ZIP",
    /** The archive or one of its parts is damaged, or a part names a path outside the archive. The import stops. */
    CORRUPT: "E_XLSX_CORRUPT",
    /** A zip that holds no workbook (`xl/workbook.xml`), such as a Word document. The import stops. */
    NOT_WORKBOOK: "E_XLSX_NOT_WORKBOOK",
    /** A zip feature the reader does not support: a compression method, a split archive. The import stops. */
    UNSUPPORTED: "E_XLSX_UNSUPPORTED",
    /** A legacy binary `.xls` workbook; save it as `.xlsx` to read it. The import stops. */
    LEGACY_XLS: "E_XLSX_LEGACY_XLS",
    /** A password-protected (encrypted) workbook. The import stops. */
    ENCRYPTED: "E_XLSX_ENCRYPTED",
    /** The `sheet` option names no sheet; params `{ sheet, sheets }`. The import stops. */
    SHEET_NOT_FOUND: SHEET_NOT_FOUND_CODE,
    /** `graphIndex` or `graphName` names no sheet. The import stops. */
    GRAPH_NOT_FOUND: GRAPH_NOT_FOUND_CODE,
    /** `graphName` names two sheets. The import stops. */
    AMBIGUOUS_GRAPH_NAME: AMBIGUOUS_GRAPH_NAME_CODE,
    /** The workbook lists no sheet. The import stops. */
    NO_GRAPH: NO_GRAPH_CODE,
    /** No sheet was chosen and the workbook has several; the first, named in params `{ sheet }`, was read. */
    SHEET_CHOSEN: "W_XLSX_SHEET_CHOSEN",
    /** Cells holding an error value (`#N/A`, `#DIV/0!`) were read as unset; params `{ count }`. */
    CELL_ERROR: "W_XLSX_CELL_ERROR",
    /** Formula cells saved without a computed value were read as unset; params `{ count }`. */
    NO_CACHED_VALUE: "W_XLSX_NO_CACHED_VALUE",
    /** The sheet's used range would fill more empty cells than `maxEmptyCells` allows. The import stops. */
    TOO_MANY_EMPTY_CELLS: TOO_MANY_EMPTY_CELLS_CODE,
});

/** The bytes of the first local file names the sniffer looks through. */
const NAME_WINDOW = 2048;

/**
 * How sure the head is a workbook: a zip whose first entries name the `xl/` folder, weakly a zip
 * that starts with `[Content_Types].xml` (every Office file does), else no. The names are found as
 * text, so a head that went through a text decoder still matches.
 * @param head - the first bytes
 * @returns a confidence in 0..1
 * @category Plugin helpers
 */
export function sniffXlsx(head: Uint8Array): number {
    if (!startsLikeZip(head)) {
        return 0;
    }
    const text = new TextDecoder("latin1").decode(head.subarray(0, NAME_WINDOW));
    if (text.includes("xl/")) {
        return 0.9;
    }
    return text.includes("[Content_Types].xml") ? 0.3 : 0;
}
