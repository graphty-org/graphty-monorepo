/**
 * A content-sized data table's column widths do not depend on when its font loaded: a table drawn
 * before the font arrives is measured again once it has, and comes out as wide as one drawn after,
 * with every value whole (#3520).
 */
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../../src";
import { DataTable, type DataTableColumn } from "../../../src/components/DataTable";
import interLatinWoff2 from "../../../src/fonts/inter-latin-wght-normal.woff2";

interface Point {
    id: string;
    position: string;
    degree: number;
}

const POINTS: Point[] = [
    { id: "n1", position: '{"x":12,"y":-5.196,"z":0}', degree: 1048576 },
    { id: "n2", position: '{"x":0,"y":0,"z":0}', degree: 3 },
    { id: "n3", position: '{"x":-8.5,"y":4,"z":100.25}', degree: 77 },
];

const COLUMNS: DataTableColumn<Point>[] = [
    { id: "id", header: "id", value: (point) => point.id },
    { id: "position", header: "position", value: (point) => point.position },
    { id: "degree", header: "degree", value: (point) => point.degree, align: "end" },
];

/**
 * Render a content-sized table.
 * @param label - The table's accessible name
 * @param fontFamily - A font family for the table to inherit, or the theme's
 * @returns The grid
 */
function renderTable(label: string, fontFamily?: string): HTMLElement {
    render(
        <MantineProvider theme={compactTheme}>
            <div style={{ width: 900, fontFamily }}>
                <DataTable
                    columns={COLUMNS}
                    data={POINTS}
                    getRowId={(point) => point.id}
                    label={label}
                    columnSizing="content"
                />
            </div>
        </MantineProvider>,
    );
    return screen.getByRole("grid", { name: label });
}

/**
 * The widths the grid's header cells are drawn at, in column order.
 * @param grid - The grid
 * @returns The widths in pixels
 */
function columnWidths(grid: HTMLElement): number[] {
    return within(grid)
        .getAllByTestId("data-table-header")
        .map((header) => header.getBoundingClientRect().width);
}

/**
 * Expect every value the grid writes to be drawn whole, with no ellipsis.
 * @param grid - The grid
 */
function expectNothingCut(grid: HTMLElement): void {
    for (const text of grid.querySelectorAll<HTMLElement>(".cm-dt-text")) {
        expect(text.scrollWidth, text.textContent ?? "").toBeLessThanOrEqual(text.clientWidth);
    }
}

describe("DataTable content widths and fonts", () => {
    it("draws every value whole in the real font, digits at their tabular width", async () => {
        await document.fonts.load('450 11px "Inter Variable"');
        const grid = renderTable("Points");
        await waitFor(() => {
            expectNothingCut(grid);
        });
    });

    it("measures again when the font loads, to the widths of a table drawn after it", async () => {
        // A face of its own, not yet in the page, so the first table is drawn in the fallback.
        const family = "CmDtLateInter";
        const face = new FontFace(family, `url(${interLatinWoff2})`, { weight: "100 900" });
        const stack = `"${family}", monospace`;
        const early = renderTable("Early", stack);
        let fallbackWidths: number[] = [];
        await waitFor(() => {
            expectNothingCut(early);
            fallbackWidths = columnWidths(early);
            expect(fallbackWidths[1]).toBeGreaterThan(88);
        });

        document.fonts.add(face);
        await face.load();
        const late = renderTable("Late", stack);
        await waitFor(() => {
            expect(columnWidths(early)).toEqual(columnWidths(late));
            // The fallback's wider widths did not stick.
            expect(columnWidths(early)).not.toEqual(fallbackWidths);
        });
        expectNothingCut(early);
        document.fonts.delete(face);
    });
});
