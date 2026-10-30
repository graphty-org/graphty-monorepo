/**
 * What a reader gets from the data table in a real browser: columns sized to their content, a cut
 * value shown whole in a tooltip, a sorted header that says how it sorts, an empty cell that is
 * named, a Shift-click that selects rows, never the page's text, and a status read as phrases
 * after the rows.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme } from "../../../src";
import { DataTable, type DataTableColumn } from "../../../src/components/DataTable";

interface Person {
    id: string;
    name: string;
    email?: string;
    score: number;
}

const PEOPLE: Person[] = [
    { id: "p1", name: "Mademoiselle Baptistine", email: "baptistine@example.org", score: 3 },
    { id: "p2", name: "Myriel", score: 12 },
    { id: "p3", name: "Napoleon", email: "n@example.org", score: 7 },
];

const COLUMNS: DataTableColumn<Person>[] = [
    { id: "id", header: "Id", value: (person) => person.id },
    { id: "name", header: "name", value: (person) => person.name },
    { id: "score", header: "score", value: (person) => person.score, align: "end" },
    { id: "email", header: "email", value: (person) => person.email },
];

/**
 * Render the table at a given width.
 * @param props - Extra table props
 * @param props.columnSizing - How columns without a width are sized
 * @param props.width - The frame's width
 * @returns The testing-library render result
 */
function renderTable({
    columnSizing,
    width = 900,
}: { columnSizing?: "fixed" | "content"; width?: number } = {}): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme}>
            <p>Text on the page around the table.</p>
            <div style={{ width }}>
                <DataTable
                    columns={COLUMNS}
                    data={PEOPLE}
                    getRowId={(person) => person.id}
                    label="People"
                    columnSizing={columnSizing}
                />
            </div>
        </MantineProvider>,
    );
}

/**
 * The text span of the cell showing a value.
 * @param text - The value's text
 * @returns The span
 */
function textOf(text: string): HTMLElement {
    return screen.getByText(text, { selector: ".cm-dt-text" });
}

describe("DataTable reading", () => {
    it("sizes a column to its content, so a long name is not cut while room is left over", async () => {
        renderTable({ columnSizing: "content" });
        await waitFor(() => {
            const name = textOf("Mademoiselle Baptistine");
            expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        });
        // A short column stays narrow: the Id column is narrower than one field (88 px).
        expect(textOf("p1").closest("td")!.getBoundingClientRect().width).toBeLessThan(88);
    });

    it("keeps one field per column by default", () => {
        renderTable();
        const name = textOf("Mademoiselle Baptistine");
        expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    });

    it("shows a cut value whole in a tooltip while the pointer rests on it", async () => {
        renderTable();
        await userEvent.hover(textOf("Mademoiselle Baptistine"));
        await waitFor(() => {
            expect(screen.getByRole("tooltip")).toHaveTextContent("Mademoiselle Baptistine");
        });
        // A value the column shows whole has no tooltip.
        await userEvent.hover(textOf("p2"));
        await waitFor(() => {
            expect(screen.queryByRole("tooltip")).toBeNull();
        });
    });

    it("names the sorted header with how it sorts", async () => {
        renderTable();
        const header = screen.getAllByTestId("data-table-header")[2];
        const button = within(header).getByTestId("data-table-sort-button");
        expect(button).toHaveAccessibleName("score");
        // A number column sorts largest first on its first activation.
        await userEvent.click(button);
        expect(header).toHaveAttribute("aria-sort", "descending");
        expect(button).toHaveAccessibleName("score, sorted descending");
        await userEvent.click(button);
        expect(button).toHaveAccessibleName("score, sorted ascending");
    });

    it("names an empty cell", () => {
        renderTable();
        const myriel = screen.getAllByRole("row").find((row) => row.textContent?.includes("Myriel"))!;
        const cells = within(myriel).getAllByRole("gridcell");
        expect(cells[3]).toHaveAccessibleName("No value");
    });

    it("selects rows with a Shift-click and leaves the page's text unselected", async () => {
        renderTable();
        await userEvent.click(textOf("p1"));
        await userEvent.keyboard("{Shift>}");
        await userEvent.click(textOf("p3"));
        await userEvent.keyboard("{/Shift}");
        expect(screen.getAllByRole("row").filter((row) => row.getAttribute("aria-selected") === "true")).toHaveLength(
            3,
        );
        expect(window.getSelection()?.toString() ?? "").toBe("");
    });

    it("says the count and the selection as two phrases, after the rows", async () => {
        renderTable();
        await userEvent.click(textOf("p1"));
        const status = screen.getByTestId("data-table-status");
        await waitFor(() => {
            expect(status).toHaveTextContent("3 of 3 rows, 1 selected");
        });
        // Read after the grid, so it never runs on from the text above the table.
        const grid = screen.getByRole("grid");
        expect(grid.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    it("keeps a cell's controls out of the Tab order until the arrows reach their cell", async () => {
        const columns: DataTableColumn<Person>[] = [
            ...COLUMNS.slice(0, 2),
            {
                id: "act",
                header: "Actions",
                value: () => "",
                cell: (person) => <button type="button">{`Act on ${person.name}`}</button>,
            },
        ];
        render(
            <MantineProvider theme={compactTheme}>
                <button type="button">Before</button>
                <DataTable columns={columns} data={PEOPLE} getRowId={(person) => person.id} label="People" />
                <button type="button">After</button>
            </MantineProvider>,
        );
        const grid = screen.getByRole("grid");
        screen.getByRole("button", { name: "Before" }).focus();
        await userEvent.tab();
        expect(grid.contains(document.activeElement)).toBe(true);
        // One Tab leaves the grid: no row's button on the way.
        await userEvent.tab();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
        // Back in, the arrows reach the second row's button cell, and Tab then reaches its button.
        await userEvent.tab({ shift: true });
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{End}");
        await userEvent.tab();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "Act on Myriel" }));
        await userEvent.tab();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    });
});
