/**
 * The parts of an Excel workbook (ECMA-376 part 1, SpreadsheetML): the sheet list in tab order,
 * the shared strings, the cell styles that mark a number as a date, the 1904 date system, and one
 * sheet's cells as rows. Parts are found through their relationships, by matching names against
 * the zip directory only, so nothing outside the archive can be named. Elements are matched by
 * local name, so Strict OOXML namespaces read as the transitional ones do. Each part is inflated
 * within the import's byte budget and ratio limit; DTD entities are never expanded.
 */

import { readBytes, textChunks } from "../../common/input.js";
import { type ResolvedImportOptions } from "../../common/options.js";
import { type ImportReportBuilder } from "../../common/report.js";
import { localName, tokenizeXml, xmlDeclaredEncoding, XmlSyntaxError } from "../../common/xml.js";
import { readZipDirectory, readZipEntry, type ZipEntry, ZipError } from "../../common/zip.js";
import { type ImportInput } from "../../types.js";
import { XLSX_ISSUE } from "./constants.js";

/** The largest uncompressed-to-compressed ratio a part may have. */
const MAX_RATIO = 1000;
/** Excel's grid: the most rows and columns a cell reference may name. */
const MAX_ROWS = 1_048_576;
const MAX_COLUMNS = 16_384;
/** An OLE compound file: a legacy `.xls`, or an encrypted workbook. */
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** The stream an encrypted OOXML file's compound file holds. */
const ENCRYPTION_INFO = "EncryptionInfo";
/** Built-in number formats that are dates or times (ECMA-376 18.8.30). */
const DATE_FORMAT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const DAY_MS = 86_400_000;
/** The last serial Excel shows as a date (9999-12-31). */
const MAX_SERIAL = 2_958_465;

/** One sheet of the workbook, in tab order. */
export interface SheetEntry {
    /** The sheet's name as the workbook spells it. */
    readonly name: string;
    /** The zip entry name of its part, or null when the workbook names a part the archive lacks. */
    readonly part: string | null;
}

/** An opened workbook. */
export interface Workbook {
    /** The sheets, in tab order, hidden ones included. */
    readonly sheets: readonly SheetEntry[];
    /**
     * Read one sheet's cells.
     * @param sheet - the sheet
     * @returns its rows
     */
    rows(sheet: SheetEntry): Promise<SheetRows>;
}

/** A cell as the table reader takes it. */
export interface Cell {
    /** The 0-based column. */
    readonly column: number;
    /** The cell text. */
    readonly text: string;
    /** Text (written quoted, never typed as a number) rather than a number, boolean or date. */
    readonly quoted: boolean;
}

/** The cells of one sheet. */
export interface SheetRows {
    /** The rows holding a value, by 1-based row number, in sheet order. */
    readonly rows: readonly { readonly row: number; readonly cells: readonly Cell[] }[];
    /** Error cells, read as unset. */
    readonly errorCells: number;
    /** Formula cells with no saved value, read as unset. */
    readonly uncachedCells: number;
}

/**
 * Fail the import for a zip error, under the workbook's codes.
 * @param err - the error
 * @param report - the report
 * @returns never
 */
function zipFailure(err: unknown, report: ImportReportBuilder): never {
    if (!(err instanceof ZipError)) {
        throw err;
    }
    if (err.kind === "too-large") {
        report.failWith("unsupported", XLSX_ISSUE.TOO_LARGE, err.message);
    }
    const code = { "not-zip": XLSX_ISSUE.NOT_ZIP, corrupt: XLSX_ISSUE.CORRUPT, unsupported: XLSX_ISSUE.UNSUPPORTED }[
        err.kind
    ];
    return report.fail(code, err.message);
}

/**
 * Whether bytes start with the given ones.
 * @param bytes - the bytes
 * @param magic - the prefix
 * @returns true when they do
 */
function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
    return magic.every((byte, at) => bytes[at] === byte);
}

/**
 * Whether an OLE compound file holds an encrypted OOXML package: its directory names the
 * EncryptionInfo stream.
 * @param bytes - the file
 * @returns true for an encrypted workbook
 */
function isEncrypted(bytes: Uint8Array): boolean {
    // the directory entries are 128-byte aligned, so the UTF-16LE names start at even offsets
    return new TextDecoder("utf-16le").decode(bytes).includes(ENCRYPTION_INFO);
}

/**
 * Walk an XML part's elements. A part that is not well-formed is E_XLSX_CORRUPT naming it.
 * @param bytes - the part
 * @param part - its name, for messages
 * @param report - the report
 * @param common - cancellation
 * @param handler - the element callbacks; `text` receives character data
 * @param handler.start - an element starts, by local name
 * @param handler.end - an element ends, by local name
 * @param handler.text - character data
 */
async function walk(
    bytes: Uint8Array,
    part: string,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
    handler: {
        start(name: string, attrs: ReadonlyMap<string, string>): void;
        end?(name: string): void;
        text?(text: string): void;
    },
): Promise<void> {
    try {
        await tokenizeXml(
            textChunks(bytes, report, { signal: common.signal, declaredEncoding: xmlDeclaredEncoding, xml: true }),
            {
                start: (name, attrs): void => {
                    handler.start(localName(name), attrs);
                },
                end: (name): void => handler.end?.(localName(name)),
                text: (text): void => handler.text?.(text),
            },
        );
    } catch (err) {
        if (err instanceof XmlSyntaxError) {
            report.fail(XLSX_ISSUE.CORRUPT, `${part}: ${err.message}`, { line: err.line, element: part });
        }
        throw err;
    }
}

/**
 * The value of an attribute by its local name (`r:id` and a Strict file's other prefix alike).
 * @param attrs - the attributes
 * @param name - the local name
 * @returns the value, or undefined
 */
function attr(attrs: ReadonlyMap<string, string>, name: string): string | undefined {
    for (const [key, value] of attrs) {
        if (localName(key) === name) {
            return value;
        }
    }
    return undefined;
}

/**
 * The zip entry name a relationship target names, relative to the folder of the part that holds the
 * relationship, or from the package root when it starts with `/`. A target that climbs out of its
 * folder (`..`) or is empty names nothing.
 * @param folder - the folder of the source part, with its trailing slash ("" for the root)
 * @param target - the target as written
 * @returns the entry name, or null
 */
export function resolveTarget(folder: string, target: string): string | null {
    const path = target.startsWith("/") ? target.slice(1) : folder + target;
    const parts = path.split("/");
    if (path === "" || parts.some((part) => part === ".." || part === "." || part === "")) {
        return null;
    }
    return path;
}

/**
 * Whether a number format code formats a date or time: a d, m, y, h or s outside quoted text,
 * brackets (colors, conditions, locales) and escaped characters.
 * @param code - the format code
 * @returns true for a date or time format
 */
export function isDateFormatCode(code: string): boolean {
    const bare = code
        .replaceAll(/"[^"]*"/g, "")
        .replaceAll(/\[[^\]]*\]/g, "")
        .replaceAll(/\\./g, "")
        .replaceAll(/_./g, "");
    return /[dmyhs]/i.test(bare);
}

/**
 * A date serial as ISO 8601 text with no zone, the workbook's wall-clock time: a date alone when
 * the format has no time and the value is a whole day. Excel's fictitious 1900-02-29 (serial 60)
 * is kept as written.
 * @param serial - the cell's number
 * @param date1904 - whether the workbook counts from 1904
 * @param dateOnly - whether the format shows no time
 * @returns the text, or null for a number no date has
 */
export function serialToIso(serial: number, date1904: boolean, dateOnly: boolean): string | null {
    if (!Number.isFinite(serial) || serial < 0 || serial > MAX_SERIAL) {
        return null;
    }
    let days = Math.floor(serial);
    let ms = Math.round((serial - days) * DAY_MS);
    if (ms === DAY_MS) {
        days++;
        ms = 0;
    }
    let date: string;
    if (!date1904 && days === 60) {
        date = "1900-02-29";
    } else {
        // the 1900 system counts 1900-02-29, so days after it are one short of their offset
        const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, days < 60 ? 31 : 30);
        date = new Date(base + days * DAY_MS).toISOString().slice(0, 10);
    }
    if (dateOnly && ms === 0) {
        return date;
    }
    const time = new Date(ms).toISOString().slice(11, 23);
    return `${date}T${time.endsWith(".000") ? time.slice(0, 8) : time}`;
}

/**
 * A cell reference's 0-based column and 1-based row (`B3` is column 1, row 3).
 * @param ref - the reference
 * @returns the position, or null when it is not a reference inside Excel's grid
 */
export function parseCellRef(ref: string): { column: number; row: number } | null {
    const match = /^([A-Z]{1,3})(\d{1,7})$/.exec(ref);
    if (match === null) {
        return null;
    }
    let column = 0;
    for (const letter of match[1]) {
        column = column * 26 + (letter.codePointAt(0) ?? 64) - 64;
    }
    const row = Number(match[2]);
    return column > MAX_COLUMNS || row < 1 || row > MAX_ROWS ? null : { column: column - 1, row };
}

/**
 * Open a workbook: its zip directory, its sheet list and, when a sheet is read, its shared strings
 * and styles. Fatal: text input or not a zip (E_XLSX_NOT_ZIP), a legacy `.xls` (E_XLSX_LEGACY_XLS),
 * an encrypted workbook (E_XLSX_ENCRYPTED), an empty input, a damaged archive or part
 * (E_XLSX_CORRUPT), no workbook part (E_XLSX_NOT_WORKBOOK), more bytes than the budget (E_TOO_LARGE).
 * @param input - the input
 * @param report - the report
 * @param common - cancellation and progress
 * @param maxBytes - the import's uncompressed byte budget
 * @returns the workbook
 */
export async function openWorkbook(
    input: ImportInput,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
    maxBytes: number,
): Promise<Workbook> {
    const bytes = await readBytes(input, common);
    if (bytes === null) {
        return report.fail(
            XLSX_ISSUE.NOT_ZIP,
            "a workbook is a zip archive; text input cannot hold one (pass the bytes)",
        );
    }
    if (bytes.byteLength === 0) {
        return report.fail(XLSX_ISSUE.EMPTY_INPUT, "the input is empty");
    }
    if (startsWith(bytes, OLE_MAGIC)) {
        return isEncrypted(bytes)
            ? report.fail(XLSX_ISSUE.ENCRYPTED, "the workbook is encrypted; save it without a password to read it")
            : report.fail(XLSX_ISSUE.LEGACY_XLS, "a legacy binary .xls workbook; save it as .xlsx to read it");
    }
    let directory: ZipEntry[];
    try {
        directory = readZipDirectory(bytes);
    } catch (err) {
        return zipFailure(err, report);
    }
    const entries = new Map<string, ZipEntry>();
    for (const entry of directory) {
        if (!entry.directory && !entries.has(entry.name)) {
            entries.set(entry.name, entry);
        }
    }
    let budget = maxBytes;
    const read = async (name: string): Promise<Uint8Array | null> => {
        const entry = entries.get(name);
        if (entry === undefined) {
            return null;
        }
        try {
            const data = await readZipEntry(bytes, entry, {
                signal: common.signal,
                maxBytes: budget,
                maxRatio: MAX_RATIO,
            });
            budget -= data.byteLength;
            return data;
        } catch (err) {
            return zipFailure(err, report);
        }
    };
    const relationships = async (part: string): Promise<Map<string, { type: string; target: string | null }>> => {
        const slash = part.lastIndexOf("/") + 1;
        const folder = part.slice(0, slash);
        const rels = await read(`${folder}_rels/${part.slice(slash)}.rels`);
        const found = new Map<string, { type: string; target: string | null }>();
        if (rels !== null) {
            await walk(rels, `${folder}_rels/${part.slice(slash)}.rels`, report, common, {
                start: (name, attrs): void => {
                    const id = attr(attrs, "Id");
                    const target = attr(attrs, "Target");
                    if (name === "Relationship" && id !== undefined && target !== undefined) {
                        const external = attr(attrs, "TargetMode") === "External";
                        found.set(id, {
                            type: attr(attrs, "Type") ?? "",
                            target: external ? null : resolveTarget(folder, target),
                        });
                    }
                },
            });
        }
        return found;
    };
    const ofType = (rels: Map<string, { type: string; target: string | null }>, type: string): string | null =>
        [...rels.values()].find((rel) => rel.type.endsWith(`/${type}`))?.target ?? null;

    const workbookPart = ofType(await relationships(""), "officeDocument") ?? "xl/workbook.xml";
    const workbookXml = await read(workbookPart);
    if (workbookXml === null) {
        return report.fail(XLSX_ISSUE.NOT_WORKBOOK, `the archive holds no workbook (${workbookPart})`);
    }
    const workbookRels = await relationships(workbookPart);
    const sheets: SheetEntry[] = [];
    let date1904 = false;
    await walk(workbookXml, workbookPart, report, common, {
        start: (name, attrs): void => {
            if (name === "workbookPr") {
                const flag = attr(attrs, "date1904");
                date1904 = flag === "1" || flag === "true";
            } else if (name === "sheet") {
                const id = attr(attrs, "id");
                sheets.push({
                    name: (attr(attrs, "name") ?? "").normalize("NFC"),
                    part: id === undefined ? null : (workbookRels.get(id)?.target ?? null),
                });
            }
        },
    });

    let strings: Promise<string[]> | null = null;
    let dateStyles: Promise<{ dates: boolean[]; dateOnly: boolean[] }> | null = null;
    const stringsPart = ofType(workbookRels, "sharedStrings");
    const stylesPart = ofType(workbookRels, "styles");
    return {
        sheets,
        rows: async (sheet): Promise<SheetRows> => {
            strings ??= readStrings(stringsPart === null ? null : await read(stringsPart), stringsPart, report, common);
            dateStyles ??= readStyles(stylesPart === null ? null : await read(stylesPart), stylesPart, report, common);
            const part = sheet.part === null ? null : await read(sheet.part);
            if (part === null || sheet.part === null) {
                return report.fail(
                    XLSX_ISSUE.CORRUPT,
                    `the workbook names sheet ${JSON.stringify(sheet.name)} but the archive does not hold it`,
                );
            }
            return readSheet(
                part,
                sheet.part,
                { strings: await strings, ...(await dateStyles), date1904 },
                report,
                common,
            );
        },
    };
}

/**
 * The shared strings: one text per `si`, rich-text runs joined, phonetic runs left out.
 * @param bytes - the part, or null when the workbook has none
 * @param part - its name
 * @param report - the report
 * @param common - cancellation
 * @returns the strings by index
 */
async function readStrings(
    bytes: Uint8Array | null,
    part: string | null,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
): Promise<string[]> {
    const strings: string[] = [];
    if (bytes === null || part === null) {
        return strings;
    }
    let current: string | null = null;
    let inText = false;
    let phonetic = 0;
    await walk(bytes, part, report, common, {
        start: (name): void => {
            if (name === "si") {
                current = "";
            } else if (name === "rPh") {
                phonetic++;
            } else if (name === "t") {
                inText = phonetic === 0;
            }
        },
        end: (name): void => {
            if (name === "si" && current !== null) {
                strings.push(current);
                current = null;
            } else if (name === "rPh") {
                phonetic--;
            } else if (name === "t") {
                inText = false;
            }
        },
        text: (text): void => {
            if (inText && current !== null) {
                current += text;
            }
        },
    });
    return strings;
}

/**
 * Which cell styles (`cellXfs` entries) format numbers as dates, and which of those show no time.
 * @param bytes - the part, or null when the workbook has none
 * @param part - its name
 * @param report - the report
 * @param common - cancellation
 * @returns per style index: a date, a date with no time
 */
async function readStyles(
    bytes: Uint8Array | null,
    part: string | null,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
): Promise<{ dates: boolean[]; dateOnly: boolean[] }> {
    const dates: boolean[] = [];
    const dateOnly: boolean[] = [];
    if (bytes === null || part === null) {
        return { dates, dateOnly };
    }
    const codes = new Map<number, string>();
    let inXfs = false;
    const formats: number[] = [];
    await walk(bytes, part, report, common, {
        start: (name, attrs): void => {
            if (name === "numFmt") {
                codes.set(Number(attr(attrs, "numFmtId")), attr(attrs, "formatCode") ?? "");
            } else if (name === "cellXfs") {
                inXfs = true;
            } else if (name === "xf" && inXfs) {
                formats.push(Number(attr(attrs, "numFmtId") ?? 0));
            }
        },
        end: (name): void => {
            if (name === "cellXfs") {
                inXfs = false;
            }
        },
    });
    for (const id of formats) {
        const code = codes.get(id);
        const date = code === undefined ? DATE_FORMAT_IDS.has(id) : isDateFormatCode(code);
        dates.push(date);
        const timeless = code === undefined ? id >= 14 && id <= 17 : !/[hs]/i.test(code.replaceAll(/"[^"]*"/g, ""));
        dateOnly.push(date && timeless);
    }
    return { dates, dateOnly };
}

/** What reading a sheet's cells needs from the rest of the workbook. */
interface SheetContext {
    readonly strings: readonly string[];
    readonly dates: readonly boolean[];
    readonly dateOnly: readonly boolean[];
    readonly date1904: boolean;
}

/** The cell being read. */
interface OpenCell {
    column: number;
    type: string;
    style: number;
    formula: boolean;
    /** The `v` text, null when the cell has none. */
    value: string | null;
    /** The inline string, null when the cell has none. */
    inline: string | null;
}

/**
 * What one cell holds: its text and whether it is text, an error, a formula saved without a value,
 * or nothing.
 * @param cell - the cell
 * @param context - the shared strings, styles and date system
 * @returns the text and kind, "error", "uncached" or null
 */
function cellValue(
    cell: OpenCell,
    context: SheetContext,
): { text: string; quoted: boolean } | "error" | "uncached" | null {
    const { type, value, style } = cell;
    if (type === "e") {
        return "error";
    }
    if (type === "inlineStr") {
        return cell.inline === null ? null : { text: cell.inline, quoted: true };
    }
    if (value === null) {
        return cell.formula ? "uncached" : null;
    }
    switch (type) {
        case "s": {
            const text = context.strings[Number(value)] as string | undefined;
            return text === undefined ? null : { text, quoted: true };
        }
        case "str":
            return { text: value, quoted: true };
        case "b":
            return { text: value === "1" || value === "true" ? "true" : "false", quoted: false };
        case "n":
            return context.dates[style]
                ? {
                      text: serialToIso(Number(value), context.date1904, context.dateOnly[style]) ?? value,
                      quoted: false,
                  }
                : { text: value, quoted: false };
        default:
            return { text: value, quoted: false };
    }
}

/**
 * The 0-based column of a cell: its reference, or the column after the previous cell.
 * @param ref - the `r` attribute, if any
 * @param row - the row being read
 * @param previous - the previous cell's column, -1 for none
 * @returns the column, or null when the reference is outside the row or the grid
 */
function cellColumn(ref: string | undefined, row: number, previous: number): number | null {
    if (ref === undefined) {
        return previous + 1 < MAX_COLUMNS ? previous + 1 : null;
    }
    const at = parseCellRef(ref);
    return at?.row === row ? at.column : null;
}

/**
 * One sheet's cells, by the cell rules of the workbook format: shared, inline and formula strings
 * are text; numbers keep their saved digits, or become ISO dates under a date style; booleans are
 * true or false; error cells and formulas with no saved value are unset (and counted). A row or
 * cell without a reference follows the previous one. A reference outside Excel's grid, or a shared
 * string the workbook does not hold, is E_XLSX_CORRUPT.
 * @param bytes - the sheet part
 * @param part - its name
 * @param context - the shared strings, styles and date system
 * @param report - the report
 * @param common - cancellation
 * @returns the rows holding a value
 */
async function readSheet(
    bytes: Uint8Array,
    part: string,
    context: SheetContext,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
): Promise<SheetRows> {
    const rows: { row: number; cells: Cell[] }[] = [];
    const counts = { errorCells: 0, uncachedCells: 0 };
    let row = 0;
    let cells: Cell[] = [];
    let cell: OpenCell = { column: -1, type: "n", style: 0, formula: false, value: null, inline: null };
    let capture: "v" | "t" | null = null;
    let inInline = false;
    let phonetic = 0;
    const bad = (what: string): never => report.fail(XLSX_ISSUE.CORRUPT, `${part}: ${what}`, { element: part });

    const openRow = (ref: string | undefined): void => {
        const next = ref === undefined ? row + 1 : Number(ref);
        if (!Number.isInteger(next) || next <= row || next > MAX_ROWS) {
            bad(`row ${String(ref)} is out of order or outside the sheet's grid`);
        }
        row = next;
        cells = [];
        cell = { ...cell, column: -1 };
    };
    const openCell = (attrs: ReadonlyMap<string, string>): void => {
        const ref = attr(attrs, "r");
        const column = cellColumn(ref, row, cell.column);
        cell = {
            column: column ?? bad(`cell ${String(ref)} is not in row ${row} of the sheet's grid`),
            type: attr(attrs, "t") ?? "n",
            style: Number(attr(attrs, "s") ?? 0),
            formula: false,
            value: null,
            inline: null,
        };
    };
    const closeCell = (): void => {
        const read = cellValue(cell, context);
        if (read === "error") {
            counts.errorCells++;
        } else if (read === "uncached") {
            counts.uncachedCells++;
        } else if (read !== null) {
            cells.push({ column: cell.column, ...read });
        } else if (cell.type === "s" && cell.value !== null) {
            bad(`a cell names shared string ${cell.value}, which the workbook does not hold`);
        }
    };

    await walk(bytes, part, report, common, {
        start: (name, attrs): void => {
            switch (name) {
                case "row":
                    openRow(attr(attrs, "r"));
                    break;
                case "c":
                    openCell(attrs);
                    break;
                case "f":
                    cell.formula = true;
                    break;
                case "v":
                    capture = "v";
                    cell.value = "";
                    break;
                case "is":
                    inInline = true;
                    cell.inline = "";
                    break;
                case "rPh":
                    phonetic++;
                    break;
                case "t":
                    capture = inInline && phonetic === 0 ? "t" : null;
                    break;
                default:
                    break;
            }
        },
        end: (name): void => {
            switch (name) {
                case "c":
                    closeCell();
                    break;
                case "row":
                    if (cells.length > 0) {
                        rows.push({ row, cells });
                    }
                    cells = [];
                    break;
                case "v":
                case "t":
                    capture = null;
                    break;
                case "is":
                    inInline = false;
                    break;
                case "rPh":
                    phonetic--;
                    break;
                default:
                    break;
            }
        },
        text: (text): void => {
            if (capture === "v") {
                cell.value = (cell.value ?? "") + text;
            } else if (capture === "t") {
                cell.inline = (cell.inline ?? "") + text;
            }
        },
    });
    return { rows, ...counts };
}
