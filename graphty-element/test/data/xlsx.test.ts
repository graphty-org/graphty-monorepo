/**
 * @file Excel workbooks as data sources: a sheet read by its name (spec/README.md 4.1.2 rule 9,
 * `sheet`), the first sheet by default, `missing` on workbook cells, a sheet the workbook does not
 * have, and detection of `.xlsx`.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { detectFormats } from "../../src/catalog/detect";
import { formatDescriptor } from "../../src/catalog/formats";
import { GraphtyError } from "../../src/errors";

/** A workbook whose first sheet, People, lists nodes and whose second, Links, lists edges. */
const BOOK = new Uint8Array(
    readFileSync(new URL("../../../graph-io/test/formats/xlsx/fixtures/two-sheets.xlsx", import.meta.url)),
);

describe("a workbook source", () => {
    it("reads a workbook's second sheet by its name", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "xlsx", config: { data: BOOK, sheet: "Links" } });
        assert.strictEqual(session.data.edges().length, 3);
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["ava", "ben", "cy"],
        );
        session.dispose();
    });

    it("reads the first sheet when none is named, and records the sheet it read", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "xlsx", config: { data: BOOK } });
        assert.strictEqual(session.data.node("ava")?.code, "007");
        assert.strictEqual(session.data.node("ava")?.score, "N/A");
        const [source] = session.data.sources();
        assert.strictEqual(source.config?.sheet, "People");
        session.dispose();
    });

    it("prepares a sheet named by sheet, and loads it", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "xlsx", config: { data: BOOK, sheet: "Links" } });
        await draft.load();
        assert.strictEqual(session.data.edges().length, 3);
        session.dispose();
    });

    it("reads the cells missing names as unset", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "xlsx", config: { data: BOOK, sheet: "People", missing: ["N/A"] } });
        assert.isUndefined(session.data.node("ava")?.score);
        session.dispose();
    });

    it("refuses a sheet the workbook does not have with E_SHEET_NOT_FOUND and the sheets it has", async () => {
        const session = createGraphSession();
        let caught: unknown;
        try {
            await session.data.import({ type: "xlsx", config: { data: BOOK, sheet: "Nope" } });
        } catch (error) {
            caught = error;
        }
        assert.instanceOf(caught, GraphtyError);
        const error = caught;
        assert.strictEqual(error.code, "E_SHEET_NOT_FOUND");
        assert.isFalse(error.recoverable);
        assert.deepStrictEqual(error.details, { format: "xlsx", sheet: "Nope", available: ["People", "Links"] });
        session.dispose();
    });

    it("is detected by its extension and listed in the catalog", () => {
        assert.deepStrictEqual(detectFormats({ filename: "org.xlsx" }), ["xlsx"]);
        assert.deepStrictEqual(detectFormats({ filename: "org.xlsm" }), ["xlsx"]);
        const descriptor = formatDescriptor("xlsx");
        assert.isTrue(descriptor?.canImport);
        assert.isFalse(descriptor?.canExport);
        assert.isTrue(descriptor?.options.some((option) => option.name === "sheet"));
    });
});

describe("missing through the element, on a CSV file (the spec's conformance case)", () => {
    it("reads N/A as unset with missing and as text without it", async () => {
        const csv = "id,team\nava,N/A\n";
        const withIt = createGraphSession();
        await withIt.data.import({ type: "csv", config: { data: csv, missing: ["N/A"] } });
        assert.isUndefined(withIt.data.node("ava")?.team);
        withIt.dispose();
        const without = createGraphSession();
        await without.data.import({ type: "csv", config: { data: csv } });
        assert.strictEqual(without.data.node("ava")?.team, "N/A");
        without.dispose();
    });
});
