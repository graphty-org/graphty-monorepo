/**
 * Writes the workbook fixtures under test/formats/xlsx/fixtures/: small `.xlsx` files whose
 * SpreadsheetML parts are written here by hand and zipped with graph-io's own writeZip, so the
 * bytes depend on nothing outside this file. test/formats/xlsx/importer.test.ts checks the
 * checked-in files are what this script writes.
 *
 * Run: npx tsx scripts/make-xlsx-fixtures.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { writeZip } from "../src/common/zip.js";

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** A cell: a shared string index, an inline string, a number, a bool, an error or a formula. */
type CellSpec =
    | { s: number }
    | { inline: string }
    | { n: string; style?: number }
    | { b: boolean }
    | { e: string }
    | { f: string; v?: string };

/** One sheet: its name and its rows of cells by reference. */
interface SheetSpec {
    readonly name: string;
    readonly rows: readonly (readonly (readonly [string, CellSpec])[])[];
    /** Overrides the target of the sheet's relationship. */
    readonly target?: string;
}

/** A workbook. */
interface BookSpec {
    readonly sheets: readonly SheetSpec[];
    readonly strings: readonly string[];
    readonly date1904?: boolean;
    /** Text put before the shared strings' root element (a DOCTYPE). */
    readonly stringsPrologue?: string;
}

/**
 * Escape XML text.
 * @param text - the text
 * @returns the escaped text
 */
function esc(text: string): string {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

/**
 * One cell's XML.
 * @param ref - the reference
 * @param cell - the cell
 * @returns the XML
 */
function cellXml(ref: string, cell: CellSpec): string {
    if ("s" in cell) {
        return `<c r="${ref}" t="s"><v>${cell.s}</v></c>`;
    }
    if ("inline" in cell) {
        return `<c r="${ref}" t="inlineStr"><is><t>${esc(cell.inline)}</t></is></c>`;
    }
    if ("n" in cell) {
        const style = cell.style === undefined ? "" : ` s="${cell.style}"`;
        return `<c r="${ref}"${style}><v>${cell.n}</v></c>`;
    }
    if ("b" in cell) {
        return `<c r="${ref}" t="b"><v>${cell.b ? 1 : 0}</v></c>`;
    }
    if ("e" in cell) {
        return `<c r="${ref}" t="e"><v>${esc(cell.e)}</v></c>`;
    }
    const value = cell.v === undefined ? "" : `<v>${cell.v}</v>`;
    return `<c r="${ref}"><f>${esc(cell.f)}</f>${value}</c>`;
}

/**
 * The bytes of a workbook.
 * @param book - the workbook
 * @returns the `.xlsx` bytes
 */
function workbook(book: BookSpec): Uint8Array {
    const text = new TextEncoder();
    const workbookPr = book.date1904 === true ? '<workbookPr date1904="1"/>' : "<workbookPr/>";
    const sheetList = book.sheets
        .map((sheet, i) => `<sheet name="${esc(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join("");
    const sheetRels = book.sheets
        .map((sheet, i) => {
            const target = sheet.target ?? `worksheets/sheet${i + 1}.xml`;
            return `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="${target}"/>`;
        })
        .join("");
    const strings = book.strings.map((s) => `<si><t xml:space="preserve">${s}</t></si>`).join("");
    const dateTimeFormat = String.raw`<numFmt numFmtId="164" formatCode="yyyy\-mm\-dd hh:mm"/>`;
    const parts: [string, string][] = [
        [
            "[Content_Types].xml",
            `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
                '<Default Extension="xml" ContentType="application/xml"/></Types>',
        ],
        [
            "_rels/.rels",
            `${XML}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" ` +
                `Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        ],
        [
            "xl/workbook.xml",
            `${XML}<workbook xmlns="${MAIN}" xmlns:r="${REL}">${workbookPr}<sheets>${sheetList}</sheets></workbook>`,
        ],
        [
            "xl/_rels/workbook.xml.rels",
            `${XML}<Relationships xmlns="${PKG_REL}">${sheetRels}` +
                `<Relationship Id="rIdS" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>` +
                `<Relationship Id="rIdT" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
        ],
        [
            "xl/sharedStrings.xml",
            `${XML}${book.stringsPrologue ?? ""}<sst xmlns="${MAIN}" count="${book.strings.length}">${strings}` +
                // a rich-text string with a phonetic run, which is left out
                '<si><r><t>Rich</t></r><r><rPr><b/></rPr><t> text</t></r><rPh sb="0" eb="1"><t>ri</t></rPh></si>' +
                `</sst>`,
        ],
        [
            "xl/styles.xml",
            `${XML}<styleSheet xmlns="${MAIN}"><numFmts count="1">${dateTimeFormat}` +
                `</numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/>` +
                `<xf numFmtId="165"/></cellXfs></styleSheet>`,
        ],
    ];
    book.sheets.forEach((sheet, i) => {
        const rows = sheet.rows
            .map((cells, r) => `<row r="${r + 1}">${cells.map(([ref, cell]) => cellXml(ref, cell)).join("")}</row>`)
            .join("");
        parts.push([
            `xl/worksheets/sheet${i + 1}.xml`,
            `${XML}<worksheet xmlns="${MAIN}"><sheetData>${rows}</sheetData></worksheet>`,
        ]);
    });
    return join2([...writeZip(parts.map(([name, xml]) => ({ name, data: text.encode(xml) })))]);
}

/**
 * Join byte chunks.
 * @param chunks - the chunks
 * @returns the bytes
 */
function join2(chunks: readonly Uint8Array[]): Uint8Array {
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let at = 0;
    for (const chunk of chunks) {
        out.set(chunk, at);
        at += chunk.byteLength;
    }
    return out;
}

/** Shared strings of the main fixture, by index. */
const STRINGS = ["id", "name", "born", "code", "active", "score", "ava", "Ava", "ben", "Ben", "007", "N/A"];
const LINKS = ["source", "target", "weight"];

/** The main fixture: "People" first, "Links" second. */
const TWO_SHEETS: BookSpec = {
    strings: [...STRINGS, ...LINKS],
    sheets: [
        {
            name: "People",
            rows: [
                [
                    ["A1", { s: 0 }],
                    ["B1", { s: 1 }],
                    ["C1", { s: 2 }],
                    ["D1", { s: 3 }],
                    ["E1", { s: 4 }],
                    ["F1", { s: 5 }],
                ],
                [
                    ["A2", { s: 6 }],
                    ["B2", { s: 7 }],
                    ["C2", { n: "45000", style: 1 }],
                    ["D2", { s: 10 }],
                    ["E2", { b: true }],
                    ["F2", { s: 11 }],
                ],
                [
                    ["A3", { s: 8 }],
                    ["B3", { s: 9 }],
                    ["C3", { n: "45000.5", style: 2 }],
                    ["D3", { inline: "" }],
                    ["E3", { b: false }],
                    ["F3", { e: "#N/A" }],
                ],
                [
                    ["A4", { inline: "cy" }],
                    ["B4", { s: 12 + LINKS.length }],
                    ["C4", { n: "60", style: 1 }],
                    ["E4", { f: "TRUE()" }],
                    ["F4", { f: "1+1", v: "2" }],
                ],
            ],
        },
        {
            name: "Links",
            rows: [
                [
                    ["A1", { s: 12 }],
                    ["B1", { s: 13 }],
                    ["C1", { s: 14 }],
                ],
                [
                    ["A2", { s: 6 }],
                    ["B2", { s: 8 }],
                    ["C2", { n: "1.5" }],
                ],
                [
                    ["A3", { s: 8 }],
                    ["B3", { inline: "cy" }],
                    ["C3", { n: "2" }],
                ],
                [
                    ["A4", { inline: "cy" }],
                    ["B4", { s: 6 }],
                    ["C4", { n: "3" }],
                ],
            ],
        },
    ],
};

/** A sheet that is a plain edge list. */
const EDGES: SheetSpec = {
    name: "Edges",
    rows: [
        [
            ["A1", { inline: "source" }],
            ["B1", { inline: "target" }],
            ["C1", { inline: "when" }],
        ],
        [
            ["A2", { inline: "a" }],
            ["B2", { inline: "b" }],
            ["C2", { n: "0", style: 1 }],
        ],
    ],
};

/** A compound file header: the legacy `.xls` and encrypted-workbook container. */
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/**
 * A compound file stub holding a UTF-16LE directory name.
 * @param name - the stream name
 * @returns the bytes
 */
function oleStub(name: string): Uint8Array {
    const out = new Uint8Array(1024);
    out.set(OLE, 0);
    for (let i = 0; i < name.length; i++) {
        out[512 + 2 * i] = name.codePointAt(i) ?? 0;
    }
    return out;
}

/**
 * Every fixture, by path under the fixtures folder.
 * @returns the bytes by path
 */
export function xlsxFixtures(): Record<string, Uint8Array> {
    const text = new TextEncoder();
    return {
        "two-sheets.xlsx": workbook(TWO_SHEETS),
        "date1904.xlsx": workbook({ strings: [], sheets: [EDGES], date1904: true }),
        "hostile/beyond-grid.xlsx": workbook({
            strings: [],
            sheets: [{ name: "S", rows: [[["XFE1", { n: "1" }]]] }],
        }),
        "hostile/far-cell.xlsx": workbook({
            strings: [],
            sheets: [
                {
                    name: "S",
                    rows: [
                        [
                            ["A1", { inline: "id" }],
                            ["XFD1", { n: "1" }],
                        ],
                    ],
                },
            ],
        }),
        "hostile/escaping-target.xlsx": workbook({
            strings: [],
            sheets: [{ ...EDGES, target: "../../etc/passwd" }],
        }),
        "hostile/proto-header.xlsx": workbook({
            strings: [],
            sheets: [
                {
                    name: "S",
                    rows: [
                        [
                            ["A1", { inline: "id" }],
                            ["B1", { inline: "__proto__" }],
                            ["C1", { inline: "constructor" }],
                        ],
                        [
                            ["A2", { inline: "a" }],
                            ["B2", { inline: "polluted" }],
                            ["C2", { inline: "x" }],
                        ],
                    ],
                },
            ],
        }),
        "hostile/doctype-entity.xlsx": workbook({
            strings: ["&boom;"],
            stringsPrologue: '<!DOCTYPE sst [<!ENTITY boom "BOOM">]>',
            sheets: [{ name: "S", rows: [[["A1", { s: 0 }]]] }],
        }),
        "hostile/not-workbook.docx": join2([
            ...writeZip([{ name: "word/document.xml", data: text.encode(`${XML}<document/>`) }]),
        ]),
        "hostile/encrypted.xlsx": oleStub("EncryptionInfo"),
        "hostile/legacy.xls": oleStub("Workbook"),
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const root = fileURLToPath(new URL("../test/formats/xlsx/fixtures/", import.meta.url));
    for (const [path, bytes] of Object.entries(xlsxFixtures())) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), bytes);
    }
}
