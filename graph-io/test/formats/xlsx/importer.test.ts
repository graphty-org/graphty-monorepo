import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { xlsxFixtures } from "../../../scripts/make-xlsx-fixtures.js";
import { XLSX_ISSUE, xlsxImporter } from "../../../src/formats/xlsx/index.js";
import { isDateFormatCode, parseCellRef, resolveTarget, serialToIso } from "../../../src/formats/xlsx/workbook.js";
import { importGraph, listGraphs, registry, sniff } from "../../../src/registry.js";
import { ImportError } from "../../../src/types.js";
import { makeZip } from "../../helpers/zip.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function fixture(path: string): Uint8Array {
    return new Uint8Array(readFileSync(join(FIXTURES, path)));
}

function cell(snapshot: GraphSnapshot, column: string, id: string): unknown {
    const c = snapshot.nodes.get(column);
    const index = snapshot.ids.indexOf(id);
    return c === null || index < 0 || !c.isSet(index) ? undefined : c.value(index);
}

async function failure(promise: Promise<unknown>): Promise<ImportError> {
    try {
        await promise;
    } catch (err) {
        if (err instanceof ImportError) {
            return err;
        }
        throw err;
    }
    throw new Error("the import did not fail");
}

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

/** A one-sheet workbook from its sheet data, shared strings and number formats. */
function book(rows: string, strings: readonly string[] = [], formats: readonly string[] = []): Uint8Array {
    const numFmts = formats.map((code, i) => `<numFmt numFmtId="${165 + i}" formatCode="${code}"/>`).join("");
    const xfs = formats.map((_, i) => `<xf numFmtId="${165 + i}"/>`).join("");
    return makeZip([
        {
            name: "_rels/.rels",
            data: `<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        },
        {
            name: "xl/workbook.xml",
            data: `<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        },
        {
            name: "xl/_rels/workbook.xml.rels",
            data:
                `<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
                `<Relationship Id="rIdS" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>` +
                `<Relationship Id="rIdT" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
        },
        {
            name: "xl/sharedStrings.xml",
            data: `<sst xmlns="${MAIN}">${strings.map((text) => `<si><t>${text}</t></si>`).join("")}</sst>`,
        },
        {
            name: "xl/styles.xml",
            data: `<styleSheet xmlns="${MAIN}"><numFmts>${numFmts}</numFmts><cellXfs><xf numFmtId="0"/>${xfs}</cellXfs></styleSheet>`,
        },
        {
            name: "xl/worksheets/sheet1.xml",
            data: `<worksheet xmlns="${MAIN}"><sheetData>${rows}</sheetData></worksheet>`,
        },
    ]);
}

describe("the workbook importer", () => {
    it("reads a workbook's second sheet by its name", async () => {
        const { snapshot, report } = await importGraph(fixture("two-sheets.xlsx"), { format: "xlsx", sheet: "Links" });
        expect(snapshot.edgeCount).toBe(3);
        expect(snapshot.nodeCount).toBe(3);
        expect(report.resolved?.sheet).toBe("Links");
        expect(snapshot.meta.extra.xlsx).toEqual({ sheet: "Links" });
        expect(report.issues.map((issue) => issue.code)).not.toContain(XLSX_ISSUE.SHEET_CHOSEN);
    });

    it("reads the first sheet when none is named, and says which", async () => {
        const { snapshot, report } = await importGraph(fixture("two-sheets.xlsx"), { format: "xlsx" });
        expect(snapshot.nodeCount).toBe(3);
        expect(report.resolved?.sheet).toBe("People");
        const chosen = report.issues.find((issue) => issue.code === XLSX_ISSUE.SHEET_CHOSEN);
        expect(chosen?.params).toEqual({ sheet: "People" });
    });

    it("types cells by the workbook's rules", async () => {
        const { snapshot, report } = await importGraph(fixture("two-sheets.xlsx"), { format: "xlsx", sheet: "People" });
        expect(cell(snapshot, "code", "ava")).toBe("007");
        expect(cell(snapshot, "code", "ben")).toBe("");
        expect(cell(snapshot, "name", "cy")).toBe("Rich text");
        expect(cell(snapshot, "born", "ava")).toBe("2023-03-15");
        expect(cell(snapshot, "born", "ben")).toBe("2023-03-15T12:00:00");
        expect(cell(snapshot, "born", "cy")).toBe("1900-02-29");
        expect(cell(snapshot, "active", "ava")).toBe(true);
        expect(cell(snapshot, "active", "ben")).toBe(false);
        expect(cell(snapshot, "active", "cy")).toBeUndefined();
        expect(cell(snapshot, "score", "ava")).toBe("N/A");
        expect(cell(snapshot, "score", "ben")).toBeUndefined();
        expect(cell(snapshot, "score", "cy")).toBe("2");
        const codes = report.issues.map((issue) => issue.code);
        expect(codes).toContain(XLSX_ISSUE.CELL_ERROR);
        expect(codes).toContain(XLSX_ISSUE.NO_CACHED_VALUE);
    });

    it("reads cells the missing option names as unset", async () => {
        const { snapshot } = await importGraph(fixture("two-sheets.xlsx"), {
            format: "xlsx",
            sheet: "People",
            missing: ["N/A"],
        });
        expect(cell(snapshot, "score", "ava")).toBeUndefined();
        expect(cell(snapshot, "score", "cy")).toBe(2);
    });

    it("refuses a sheet name the workbook does not have, listing the sheets", async () => {
        const error = await failure(importGraph(fixture("two-sheets.xlsx"), { format: "xlsx", sheet: "Nope" }));
        expect(error.issue?.code).toBe(XLSX_ISSUE.SHEET_NOT_FOUND);
        expect(error.issue?.params).toEqual({ sheet: "Nope", sheets: ["People", "Links"] });
        expect(error.details).toMatchObject({ sheet: "Nope", sheets: ["People", "Links"] });
    });

    it("matches a sheet name after NFC, never ignoring case", async () => {
        const decomposed = "Links".normalize("NFD");
        const { snapshot } = await importGraph(fixture("two-sheets.xlsx"), { format: "xlsx", sheet: decomposed });
        expect(snapshot.edgeCount).toBe(3);
        const error = await failure(importGraph(fixture("two-sheets.xlsx"), { format: "xlsx", sheet: "links" }));
        expect(error.issue?.code).toBe(XLSX_ISSUE.SHEET_NOT_FOUND);
    });

    it("chooses a sheet by graphIndex and lists the sheets", async () => {
        const { snapshot } = await importGraph(fixture("two-sheets.xlsx"), { format: "xlsx", graphIndex: 1 });
        expect(snapshot.edgeCount).toBe(3);
        expect(await listGraphs(fixture("two-sheets.xlsx"), { format: "xlsx" })).toEqual([
            { index: 0, name: "People", nodes: null, edges: null },
            { index: 1, name: "Links", nodes: null, edges: null },
        ]);
    });

    it("counts dates from 1904 in a 1904 workbook", async () => {
        const { snapshot } = await importGraph(fixture("date1904.xlsx"), { format: "xlsx" });
        const when = snapshot.edges.get("when");
        expect(when?.value(0)).toBe("1904-01-01");
    });

    it("refuses hostile and foreign files with a named code", async () => {
        const cases: [string, string][] = [
            ["hostile/beyond-grid.xlsx", XLSX_ISSUE.CORRUPT],
            ["hostile/escaping-target.xlsx", XLSX_ISSUE.CORRUPT],
            ["hostile/doctype-entity.xlsx", XLSX_ISSUE.CORRUPT],
            ["hostile/not-workbook.docx", XLSX_ISSUE.NOT_WORKBOOK],
            ["hostile/encrypted.xlsx", XLSX_ISSUE.ENCRYPTED],
            ["hostile/legacy.xls", XLSX_ISSUE.LEGACY_XLS],
        ];
        for (const [path, code] of cases) {
            const error = await failure(importGraph(fixture(path), { format: "xlsx" }));
            expect(error.issue?.code, path).toBe(code);
        }
        const text = await failure(importGraph("a,b\n", { format: "xlsx" }));
        expect(text.issue?.code).toBe(XLSX_ISSUE.NOT_ZIP);
    });

    it("bounds what an archive may unpack and how many empty cells a sheet may fill", async () => {
        const small = await failure(
            importGraph(fixture("two-sheets.xlsx"), { format: "xlsx", maxUncompressedBytes: 100 }),
        );
        expect(small.issue?.code).toBe(XLSX_ISSUE.TOO_LARGE);
        const bomb = makeZip([{ name: "xl/workbook.xml", data: `<workbook>${" ".repeat(4_000_000)}</workbook>` }]);
        expect((await failure(importGraph(bomb, { format: "xlsx" }))).issue?.code).toBe(XLSX_ISSUE.TOO_LARGE);
        const wide = await failure(
            importGraph(fixture("hostile/far-cell.xlsx"), { format: "xlsx", maxEmptyCells: 1000 }),
        );
        expect(wide.issue?.code).toBe(XLSX_ISSUE.TOO_MANY_EMPTY_CELLS);
    });

    it("reads a date format with no time as a date, whatever its brackets and escapes hold", async () => {
        const rows =
            '<row r="1"><c r="A1" t="inlineStr"><is><t>id</t></is></c><c r="B1" t="inlineStr"><is><t>long</t></is></c>' +
            '<c r="C1" t="inlineStr"><is><t>escaped</t></is></c></row>' +
            '<row r="2"><c r="A2" t="inlineStr"><is><t>a</t></is></c><c r="B2" s="1"><v>45000</v></c>' +
            '<c r="C2" s="2"><v>45000</v></c></row>';
        const formats = ["[$-x-sysdate]dddd, mmmm dd, yyyy", String.raw`yyyy-mm-dd\h\s`];
        const { snapshot } = await importGraph(book(rows, [], formats), { format: "xlsx", table: "nodes" });
        expect(cell(snapshot, "long", "a")).toBe("2023-03-15");
        expect(cell(snapshot, "escaped", "a")).toBe("2023-03-15");
    });

    it("reads a table that starts right of column A with no extra column", async () => {
        const rows =
            '<row r="1"><c r="B1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>' +
            '<row r="2"><c r="B2" t="s"><v>2</v></c><c r="C2" t="s"><v>3</v></c></row>';
        const { snapshot } = await importGraph(book(rows, ["id", "name", "a", "b"]), {
            format: "xlsx",
            table: "nodes",
        });
        expect(snapshot.nodeCount).toBe(1);
        expect(snapshot.nodes.names()).not.toContain("column1");
        expect(cell(snapshot, "name", "a")).toBe("b");
    });

    it("bounds the text a sheet's repeated shared strings make", async () => {
        const long = "x".repeat(10_000);
        const rows = Array.from(
            { length: 200 },
            (_, i) => `<row r="${i + 1}"><c r="A${i + 1}" t="s"><v>0</v></c></row>`,
        );
        const error = await failure(
            importGraph(book(rows.join(""), [long]), {
                format: "xlsx",
                table: "nodes",
                maxUncompressedBytes: 1_000_000,
            }),
        );
        expect(error.issue?.code).toBe(XLSX_ISSUE.TOO_LARGE);
    });

    it("keeps a header cell named __proto__ as a column, leaving Object.prototype alone", async () => {
        const { snapshot } = await importGraph(fixture("hostile/proto-header.xlsx"), {
            format: "xlsx",
            table: "nodes",
        });
        expect(cell(snapshot, "__proto__", "a")).toBe("polluted");
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        expect(Object.getPrototypeOf({})).toBe(Object.prototype);
    });

    it("is recognized by its contents and its extension, and a Word file is not", () => {
        expect(xlsxImporter.sniff?.(fixture("two-sheets.xlsx"))).toBeGreaterThanOrEqual(0.9);
        expect(sniff({ head: fixture("two-sheets.xlsx") })?.format).toBe("xlsx");
        expect(sniff({ filename: "book.xlsx" })?.format).toBe("xlsx");
        expect(sniff({ head: fixture("hostile/not-workbook.docx") })?.format).not.toBe("xlsx");
        expect(registry.importer("xlsx")).toBe(xlsxImporter);
    });
});

describe("the workbook parts", () => {
    it("reads cell references within Excel's grid", () => {
        expect(parseCellRef("A1")).toEqual({ column: 0, row: 1 });
        expect(parseCellRef("XFD1048576")).toEqual({ column: 16_383, row: 1_048_576 });
        expect(parseCellRef("XFE1")).toBeNull();
        expect(parseCellRef("A1048577")).toBeNull();
        expect(parseCellRef("a1")).toBeNull();
    });

    it("resolves relationship targets inside the archive only", () => {
        expect(resolveTarget("xl/", "worksheets/sheet1.xml")).toBe("xl/worksheets/sheet1.xml");
        expect(resolveTarget("xl/", "/xl/worksheets/sheet1.xml")).toBe("xl/worksheets/sheet1.xml");
        expect(resolveTarget("xl/", "../x.xml")).toBeNull();
        expect(resolveTarget("xl/", "")).toBeNull();
    });

    it("tells date formats from number formats", () => {
        expect(isDateFormatCode("yyyy-mm-dd")).toBe(true);
        expect(isDateFormatCode("[h]:mm")).toBe(true);
        expect(isDateFormatCode('0.00 "days"')).toBe(false);
        expect(isDateFormatCode("[Red]0.00")).toBe(false);
        expect(isDateFormatCode("General")).toBe(false);
    });

    it("turns serials into ISO text in both date systems", () => {
        expect(serialToIso(1, false, true)).toBe("1900-01-01");
        expect(serialToIso(59, false, true)).toBe("1900-02-28");
        expect(serialToIso(60, false, true)).toBe("1900-02-29");
        expect(serialToIso(61, false, true)).toBe("1900-03-01");
        expect(serialToIso(0, true, true)).toBe("1904-01-01");
        expect(serialToIso(45000.25, false, false)).toBe("2023-03-15T06:00:00");
        expect(serialToIso(1.5, false, true)).toBe("1900-01-01T12:00:00");
        expect(serialToIso(-1, false, true)).toBeNull();
    });

    it("are what the fixture script writes", () => {
        for (const [path, bytes] of Object.entries(xlsxFixtures())) {
            expect(fixture(path), path).toEqual(bytes);
        }
    });
});
