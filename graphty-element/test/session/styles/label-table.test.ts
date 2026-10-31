/**
 * A file's table label (the neutral `labelTable`) as the element draws one (`node.labelTable`): its lengths scaled
 * as the file's other lengths are, each line's runs as label markup.
 */
import { assert, describe, it } from "vitest";

import { labelTableForElement, pictureUrl } from "../../../src/session/styles/fileStyles/translate";

describe("labelTableForElement", () => {
    it("scales every length of the table and its cells, nested tables included, and keeps the rest", () => {
        const file = {
            border: 1,
            cellBorder: 2,
            cellSpacing: 2,
            cellPadding: 4,
            width: 80,
            lineHeight: 1.2,
            rows: [
                {
                    rule: true,
                    cells: [
                        { colspan: 2, width: 10, border: 3, padding: 1, align: "text" },
                        { table: { border: 1, cellSpacing: 2, rows: [{ cells: [{ height: 6 }] }] } },
                    ],
                },
            ],
        };
        const out = JSON.parse(labelTableForElement(JSON.stringify(file), 0.5) ?? "null") as typeof file;
        assert.deepEqual(
            [out.border, out.cellBorder, out.cellSpacing, out.cellPadding, out.width, out.lineHeight],
            [0.5, 1, 1, 2, 40, 1.2],
        );
        assert.deepEqual(out.rows[0].cells[0], { colspan: 2, width: 5, border: 1.5, padding: 0.5, align: "text" });
        assert.deepEqual(out.rows[0].cells[1], {
            table: { border: 0.5, cellSpacing: 1, rows: [{ cells: [{ height: 3 }] }] },
        });
        assert.isTrue(out.rows[0].rule);
    });

    it("writes each line's runs as label markup, keeping its alignment", () => {
        const file = {
            rows: [
                {
                    cells: [
                        {
                            lines: [
                                { runs: [{ text: "a" }, { text: "b", weight: "bold" }], align: "left" },
                                { runs: [{ text: "c", color: "#ff0000" }] },
                            ],
                        },
                    ],
                },
            ],
        };
        const out = JSON.parse(labelTableForElement(JSON.stringify(file), 1) ?? "null") as {
            rows: { cells: { lines: unknown[] }[] }[];
        };
        assert.deepEqual(out.rows[0].cells[0].lines, [
            { text: "a<bold>b</bold>", align: "left" },
            { text: "<color='#ff0000'>c</color>" },
        ]);
    });

    it("keeps a cell's picture and fills, each pixel of a picture one file length across", () => {
        const file = {
            fill: "#ffffe0",
            rows: [
                { cells: [{ image: { src: "a.png", scale: "width" }, fill: "#4477aa" }, { image: { scale: "true" } }] },
            ],
        };
        const out = JSON.parse(labelTableForElement(JSON.stringify(file), 0.5) ?? "null") as {
            fill: string;
            rows: { cells: { image?: unknown; fill?: string }[] }[];
        };
        assert.strictEqual(out.fill, "#ffffe0");
        assert.deepEqual(out.rows[0].cells, [
            { image: { src: "a.png", scale: "width", pixelSize: 0.5 }, fill: "#4477aa" },
            {},
        ]);
    });

    it("resolves a cell's picture against the file's location when the load gives one", () => {
        const file = {
            rows: [{ cells: [{ image: { src: "img/a.png" } }, { image: { src: "data:image/png;base64,AA" } }] }],
        };
        const read = (base?: string): unknown[] =>
            (
                JSON.parse(labelTableForElement(JSON.stringify(file), 1, base) ?? "null") as {
                    rows: { cells: { image: { src: string } }[] }[];
                }
            ).rows[0].cells.map((c) => c.image.src);
        assert.deepEqual(read("https://example.test/sheets/one.gv"), [
            "https://example.test/sheets/img/a.png",
            "data:image/png;base64,AA",
        ]);
        // no location: as the file wrote it, which the browser resolves against the page
        assert.deepEqual(read(), ["img/a.png", "data:image/png;base64,AA"]);
    });

    it("resolves a picture path only against a base that makes a URL", () => {
        assert.strictEqual(pictureUrl("a.png", "https://example.test/x/f.gv"), "https://example.test/x/a.png");
        assert.strictEqual(
            pictureUrl("https://other.test/b.png", "https://example.test/x/f.gv"),
            "https://other.test/b.png",
        );
        assert.strictEqual(pictureUrl("a.png", undefined), "a.png");
        assert.strictEqual(pictureUrl("a.png", "not a url"), "a.png");
    });

    it("draws nothing for a value that is not a table", () => {
        assert.isNull(labelTableForElement("not json", 1));
        assert.isNull(labelTableForElement('{"rows":3}', 1));
        assert.isNull(labelTableForElement(7, 1));
    });
});
