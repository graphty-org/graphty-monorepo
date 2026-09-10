/**
 * The data table's geometry, measured in a real browser.
 *
 * Virtualization is a claim about layout: that a table of thousands of rows
 * puts a dozen of them in the document, that the scrollbar is nonetheless the
 * length of all of them, and that scrolling swaps one set of rows for another.
 * JSDOM has no layout engine and no scrolling, so none of that can be measured
 * there -- every assertion here is a `getBoundingClientRect` or a real scroll.
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme, PANEL_GRID } from "../../../src";
import { DataTable } from "../../../src/components/DataTable";
import type { DataTableColumn } from "../../../src/components/DataTable";

interface Node {
    id: string;
    label: string;
    degree: number;
}

const NODES: Node[] = Array.from({ length: 2000 }, (_, index) => ({
    id: `n${String(index)}`,
    label: `Node ${String(index)}`,
    degree: index % 97,
}));

const COLUMNS: DataTableColumn<Node>[] = [
    { id: "label", header: "Node", value: (node) => node.label, width: 160 },
    { id: "degree", header: "Links", value: (node) => node.degree, align: "end", width: 80 },
];

/** The height of the scrolling area these tests measure against. */
const VIEWPORT = 320;

/**
 * Render the table at a known size, the way a panel would.
 * @param ui - The table under test
 * @returns The testing-library render result
 */
function renderTable(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme}>
            <div data-testid="frame" style={{ width: 400 }}>
                {ui}
            </div>
        </MantineProvider>,
    );
}

/**
 * The row numbers currently drawn, in the order they are drawn.
 * @returns One number per drawn row, counting the header as row one
 */
function drawnRowIndexes(): number[] {
    return screen
        .getAllByTestId("data-table-row")
        .map((row) => Number(row.getAttribute("aria-rowindex")))
        .sort((a, b) => a - b);
}

describe("DataTable geometry", () => {
    it("draws a dozen rows of two thousand, and still scrolls the length of all of them", async () => {
        renderTable(<DataTable columns={COLUMNS} data={NODES} getRowId={(node) => node.id} height={VIEWPORT} />);

        const drawn = screen.getAllByTestId("data-table-row");
        // The viewport holds eleven rows at the 28px pitch. Overscan draws eight
        // more above and below, so anything under thirty is virtualization
        // working and two thousand is it not working at all.
        expect(drawn.length).toBeLessThan(30);
        expect(drawn.length).toBeGreaterThan(5);

        const viewport = screen.getByTestId("data-table-viewport");
        await waitFor(() => {
            // The scrollbar is the length of all two thousand rows: that is
            // what makes the scroll position mean the same thing it would if
            // every row were really there.
            expect(viewport.scrollHeight).toBeGreaterThanOrEqual(2000 * PANEL_GRID.DATA_PITCH);
        });
    });

    it("keeps the rows exactly one data pitch apart", () => {
        renderTable(<DataTable columns={COLUMNS} data={NODES} getRowId={(node) => node.id} height={VIEWPORT} />);

        const rows = screen.getAllByTestId("data-table-row");
        const boxes = rows.map((row) => row.getBoundingClientRect()).sort((a, b) => a.top - b.top);

        expect(boxes[0].height).toBeCloseTo(PANEL_GRID.DATA_PITCH, 1);
        expect(boxes[1].top - boxes[0].top).toBeCloseTo(PANEL_GRID.DATA_PITCH, 1);
    });

    it("swaps one set of rows for another as the table is scrolled", async () => {
        renderTable(<DataTable columns={COLUMNS} data={NODES} getRowId={(node) => node.id} height={VIEWPORT} />);

        expect(drawnRowIndexes()[0]).toBe(2);

        const viewport = screen.getByTestId("data-table-viewport");
        viewport.scrollTop = 500 * PANEL_GRID.DATA_PITCH;

        await waitFor(() => {
            expect(drawnRowIndexes()[0]).toBeGreaterThan(480);
        });

        // The rows that were drawn at the top are gone rather than hidden.
        expect(screen.queryByText("Node 0")).toBeNull();
        expect(screen.getAllByTestId("data-table-row").length).toBeLessThan(30);
    });

    it("keeps the column headers in view while the rows scroll under them", async () => {
        renderTable(<DataTable columns={COLUMNS} data={NODES} getRowId={(node) => node.id} height={VIEWPORT} />);

        const viewport = screen.getByTestId("data-table-viewport");
        const header = screen.getAllByRole("columnheader")[0];
        const before = header.getBoundingClientRect().top;

        viewport.scrollTop = 500 * PANEL_GRID.DATA_PITCH;
        await waitFor(() => {
            expect(drawnRowIndexes()[0]).toBeGreaterThan(480);
        });

        expect(header.getBoundingClientRect().top).toBeCloseTo(before, 0);
    });

    it("draws each column at the width it was given", () => {
        renderTable(<DataTable columns={COLUMNS} data={NODES} getRowId={(node) => node.id} height={VIEWPORT} />);

        const row = screen.getAllByTestId("data-table-row")[0];
        const cells = within(row).getAllByRole("gridcell");

        expect(cells[0].getBoundingClientRect().width).toBeCloseTo(160, 0);
        // The last column stretches into the room left over, so a table narrower
        // than its frame has no bare strip down its trailing edge.
        expect(cells[1].getBoundingClientRect().width).toBeGreaterThan(80);
    });

    it("draws the first column at the trailing edge when text runs right to left", () => {
        render(
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <MantineProvider theme={compactTheme}>
                    <div style={{ width: 400 }}>
                        <DataTable
                            columns={COLUMNS}
                            data={NODES}
                            getRowId={(node) => node.id}
                            height={VIEWPORT}
                        />
                    </div>
                </MantineProvider>
            </DirectionProvider>,
        );

        const row = screen.getAllByTestId("data-table-row")[0];
        const cells = within(row).getAllByRole("gridcell");

        // The first column is drawn first, which under reversed text means
        // furthest to the right.
        expect(cells[0].getBoundingClientRect().left).toBeGreaterThan(cells[1].getBoundingClientRect().left);
    });

    it("draws a focus ring on the cell a keyboard user has reached", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={NODES} getRowId={(node) => node.id} height={VIEWPORT} />);

        await user.tab();
        await user.keyboard("{ArrowDown}");

        const focused = document.activeElement;
        expect(focused).not.toBeNull();
        expect(focused).toHaveAttribute("role", "gridcell");

        const ring = getComputedStyle(focused as HTMLElement);
        expect(Number.parseFloat(ring.outlineWidth)).toBeGreaterThan(0);
        expect(ring.outlineStyle).not.toBe("none");
    });

    it("brings a row into view when the keyboard reaches past the bottom of the table", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={NODES} getRowId={(node) => node.id} height={VIEWPORT} />);

        const viewport = screen.getByTestId("data-table-viewport");
        await user.tab();
        await user.keyboard("{ArrowDown}");
        await user.keyboard("{PageDown}{PageDown}{PageDown}");

        await waitFor(() => {
            expect(viewport.scrollTop).toBeGreaterThan(0);
        });

        // Focus followed the movement rather than being dropped when the row it
        // was on scrolled out of the document.
        expect(document.activeElement).toHaveAttribute("role", "gridcell");
        const box = (document.activeElement as HTMLElement).getBoundingClientRect();
        const frame = viewport.getBoundingClientRect();
        expect(box.top).toBeGreaterThanOrEqual(frame.top - 1);
        expect(box.bottom).toBeLessThanOrEqual(frame.bottom + 1);
    });
});
