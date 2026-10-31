/**
 * A label laid out as a table of cells (`shape.labelTable`), against what Graphviz 14 draws for the DOT specimen
 * sheets (graph-io/test/fidelity/oracles/dot-specimen-labels-p2.svg and -p3.svg): DejaVu Sans at 10 points, whose
 * "a", "b", "c" and "x" Graphviz measures 6 points wide and whose line it makes 12.75 points tall.
 */
import { assert, describe, it } from "vitest";

import { type LabelTable, layoutLabelTable, readLabelTable } from "../../src/meshes/labelTable";

/** Widths Graphviz measured for the words of the sheets, in points. */
const WIDTHS: Record<string, number> = { a: 6, b: 6, c: 6, x: 6, ab: 12, wide: 23.25, "wide line": 43 };

/**
 * Measures a text as Graphviz did: its width, one line at a font size of 10.
 * @param text - the text
 * @returns its size
 */
const measure = (text: string): { width: number; height: number } => ({ width: WIDTHS[text] ?? 0, height: 10 });

/** Graphviz's defaults, as graph-io writes them, and the line height the sheets measure. */
const FRAME = { border: 1, cellBorder: 1, cellSpacing: 2, cellPadding: 2, lineHeight: 1.275 } as const;

/**
 * A cell holding one word.
 * @param text - the word
 * @param more - the cell's other fields
 * @returns the cell
 */
const cell = (text: string, more: object = {}): object => ({ lines: [{ text }], ...more });

/**
 * A table of the default frame.
 * @param rows - its rows, each a list of cells
 * @param more - its other fields
 * @returns the table
 */
const table = (rows: object[][], more: object = {}): LabelTable => ({
    ...FRAME,
    ...more,
    rows: rows.map((cells) => ({ cells })),
});

describe("layoutLabelTable", () => {
    it("sizes a row of cells from their text, padding, borders and spacing (html-table)", () => {
        const out = layoutLabelTable(table([[cell("a"), cell("b")]]), measure);
        assert.deepEqual([out.width, out.height], [32, 24.75]);
        // each cell 6 + 2 * (2 + 1) wide, one spacing from the outline and from each other
        assert.deepEqual(
            out.frames.map((f) => [f.x, f.y, f.width, f.height]),
            [
                [3, 3, 12, 18.75],
                [17, 3, 12, 18.75],
            ],
        );
        assert.deepEqual(out.texts[0], { x: 9, y: 12.375, text: "a" });
    });

    it("takes the table's BORDER as its cells' border unless CELLBORDER says otherwise (html-table-border-3)", () => {
        const out = layoutLabelTable(table([[cell("a"), cell("b")]], { border: 3, cellBorder: 3 }), measure);
        assert.deepEqual([out.width, out.height], [44, 32.75]);
    });

    it("grows a cell to its WIDTH and its row to the tallest cell (html-td-width-60)", () => {
        const out = layoutLabelTable(
            table([[cell("a", { width: 60 }), cell("b", { width: 30, height: 30 })]]),
            measure,
        );
        assert.deepEqual([out.width, out.height], [98, 36]);
        // the words centered in their cells
        assert.deepEqual(
            out.texts.map((t) => [t.x, t.y]),
            [
                [33, 18],
                [80, 18],
            ],
        );
    });

    it("gives a cell its own BORDER and CELLPADDING (html-td-border-2, html-td-cellpadding-8)", () => {
        const border = layoutLabelTable(table([[cell("a", { border: 2 }), cell("b")]]), measure);
        assert.deepEqual([border.width, border.height], [34, 26.75]);
        assert.deepEqual(
            border.frames.map((f) => f.border),
            [2, 1],
        );
        const padding = layoutLabelTable(table([[cell("a", { padding: 8 }), cell("b")]]), measure);
        assert.deepEqual([padding.width, padding.height], [44, 36.75]);
    });

    it("spans rows and columns, stacking the rows (html-td-rowspan, html-td-colspan)", () => {
        const rowspan = layoutLabelTable(
            {
                ...FRAME,
                rows: [{ cells: [cell("a", { rowspan: 2 }), cell("b")] }, { cells: [cell("c")] }],
            },
            measure,
        );
        assert.deepEqual([rowspan.width, rowspan.height], [32, 45.5]);
        // a spans both rows; c is under b
        assert.deepEqual(
            rowspan.frames.map((f) => [f.x, f.y, f.width, f.height]),
            [
                [3, 3, 12, 39.5],
                [17, 3, 12, 18.75],
                [17, 23.75, 12, 18.75],
            ],
        );
        const colspan = layoutLabelTable(table([[cell("ab", { colspan: 2 })], [cell("a"), cell("b")]]), measure);
        assert.deepEqual([colspan.width, colspan.height], [32, 45.5]);
        assert.deepEqual(colspan.frames[0].width, 26);
    });

    it("grows the columns a spanning cell covers when it is wider than they are", () => {
        const out = layoutLabelTable(table([[cell("a", { colspan: 2, width: 40 })], [cell("a"), cell("b")]]), measure);
        // 40 over two columns and one spacing: 19 each
        assert.deepEqual(out.width, 2 + 3 * 2 + 2 * 19);
    });

    it("draws an HR between rows and a VR between cells (html-hr)", () => {
        const out = layoutLabelTable(
            {
                ...FRAME,
                rows: [
                    { cells: [cell("a")] },
                    { rule: true, cells: [cell("b")] },
                    { cells: [cell("c"), cell("x", { rule: true })] },
                ],
            },
            measure,
        );
        assert.deepEqual(out.rules[0], [1, 22.75, out.width - 1, 22.75]);
        assert.equal(out.rules[1][0], out.rules[1][2]);
    });

    it("lines a cell's text up by ALIGN and VALIGN (html-td-align-left, html-td-valign-top)", () => {
        const left = layoutLabelTable(
            table([[cell("a", { align: "left" }), cell("b", { width: 30, height: 30 })]]),
            measure,
        );
        assert.deepEqual([left.width, left.height], [50, 36]);
        assert.deepEqual(left.texts[0].x, 3 + 3 + 3);
        const top = layoutLabelTable(
            table([[cell("a", { valign: "top" }), cell("b", { width: 30, height: 30 })]]),
            measure,
        );
        assert.deepEqual(top.texts[0].y, 3 + 3 + 12.75 / 2);
    });

    it("lines each line up by its own break, else BALIGN, across the whole cell for ALIGN=TEXT (html-td-align-text)", () => {
        const text = layoutLabelTable(
            table([
                [
                    {
                        width: 90,
                        align: "text",
                        lines: [
                            { text: "wide line", align: "left" },
                            { text: "x", align: "right" },
                        ],
                    },
                ],
            ]),
            measure,
        );
        assert.deepEqual([text.width, text.height], [96, 37.5]);
        // "wide line" starts at the cell's padding, "x" ends at it (Graphviz: 541 and 625 in a table at 535)
        assert.deepEqual(text.texts[0].x - 43 / 2, 6);
        assert.deepEqual(text.texts[1].x + 3, 90);
        const balign = layoutLabelTable(
            table([
                [{ balign: "left", lines: [{ text: "a" }, { text: "wide" }] }, cell("b", { width: 30, height: 30 })],
            ]),
            measure,
        );
        assert.deepEqual([balign.width, balign.height], [67.25, 37.5]);
        assert.deepEqual(
            balign.texts.slice(0, 2).map((t) => t.x - WIDTHS[t.text] / 2),
            [6, 6],
        );
    });

    it("draws a fixed cell at its own size and a fixed table its WIDTH, the cells at their own (html-td-fixedsize-true)", () => {
        const fixed = layoutLabelTable(
            table([[cell("a", { fixedSize: true, width: 40, height: 30 }), cell("b")]]),
            measure,
        );
        assert.deepEqual([fixed.width, fixed.height], [60, 36]);
        assert.deepEqual(fixed.texts[0].x, 3 + 20);
        const wide = layoutLabelTable(
            table([[cell("a"), cell("b")]], { fixedSize: true, width: 70, height: 30 }),
            measure,
        );
        assert.deepEqual([wide.width, wide.height], [70, 30]);
        // Graphviz leaves the room on the right and below
        assert.deepEqual(wide.frames[1].x, 17);
    });

    it("lines a fixed table up in its cell by its ALIGN and VALIGN (html-table-align-left, html-table-valign-top)", () => {
        const inner = (more: object): LabelTable =>
            table([
                [
                    {
                        fixedSize: true,
                        width: 80,
                        height: 50,
                        table: table([[cell("a")]], { fixedSize: true, width: 36, height: 26, ...more }),
                    },
                ],
            ]);
        const left = layoutLabelTable(inner({ align: "left" }), measure);
        assert.deepEqual([left.width, left.height], [86, 56]);
        // the outer cell, the inner table's outline at the cell's padding, centered down; its cell at its top left
        assert.deepEqual(
            left.frames.map((f) => [f.x, f.y, f.width, f.height]),
            [
                [3, 3, 80, 50],
                [6, 15, 36, 26],
                [9, 18, 12, 18.75],
            ],
        );
        const top = layoutLabelTable(inner({ valign: "top" }), measure);
        assert.deepEqual([top.frames[1].x, top.frames[1].y], [25, 6]);
    });
});

describe("readLabelTable", () => {
    it("reads a table and refuses what is not one", () => {
        assert.deepEqual(readLabelTable('{"rows":[{"cells":[{"lines":[{"text":"a"}]}]}]}')?.rows.length, 1);
        assert.isNull(readLabelTable(undefined));
        assert.isNull(readLabelTable("not json"));
        assert.isNull(readLabelTable('{"rows":[{"cells":[{"lines":[{"runs":[]}]}]}]}'));
        assert.isNull(readLabelTable('{"rows":"x"}'));
    });
});
