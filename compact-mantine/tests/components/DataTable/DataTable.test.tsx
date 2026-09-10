import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useRef, useState } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { DataTable } from "../../../src/components/DataTable";
import type { DataTableColumn, DataTableHandle, DataTableSort } from "../../../src/components/DataTable";
import { LabelsProvider } from "../../../src/i18n";

// The virtualizer measures the scrolling area with offsetHeight, which JSDOM
// reports as zero for every element -- so without this the table would draw one
// row and every test would be measuring the wrong thing. The height is a
// variable so a test can shrink the viewport and watch the drawing shrink with
// it, which is the whole point of the component.
let viewportHeight = 600;

beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        get: () => viewportHeight,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        get: () => 800,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        get: () => viewportHeight,
    });
});

beforeEach(() => {
    viewportHeight = 600;
});

interface Cat {
    id: string;
    name: string;
    links: number;
    group: string;
}

const CATS: Cat[] = [
    { id: "c1", name: "Whiskers", links: 4, group: "B" },
    { id: "c2", name: "Chonky", links: 12, group: "A" },
    { id: "c3", name: "Henderson", links: 4, group: "A" },
    { id: "c4", name: "Nibbles", links: 7, group: "B" },
];

const COLUMNS: DataTableColumn<Cat>[] = [
    { id: "name", header: "Name", value: (cat) => cat.name, width: 120 },
    { id: "links", header: "Links", value: (cat) => cat.links, align: "end", width: 60 },
    { id: "group", header: "Group", value: (cat) => cat.group, width: 60 },
];

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderTable(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * The rows currently drawn, read from the first cell of each.
 * @returns One string per drawn row
 */
function drawnNames(): string[] {
    return screen.getAllByTestId("data-table-row").map((row) => {
        const cells = within(row).getAllByRole("gridcell");
        return cells[0].textContent ?? "";
    });
}

/**
 * One drawn row, by the name in its first cell.
 * @param name - The name in the row's first cell
 * @returns The row element
 */
function rowNamed(name: string): HTMLElement {
    const row = screen
        .getAllByTestId("data-table-row")
        .find((candidate) => within(candidate).getAllByRole("gridcell")[0].textContent === name);

    if (row === undefined) {
        throw new Error(`no drawn row named ${name}`);
    }

    return row;
}

/**
 * One cell of a drawn row.
 * @param name - The name in the row's first cell
 * @param column - Which column, counting from zero
 * @returns The cell element
 */
function cellIn(name: string, column = 0): HTMLElement {
    return within(rowNamed(name)).getAllByRole("gridcell")[column];
}

/**
 * The header cell for one column.
 * @param header - The column's name
 * @returns The column header element
 */
function headerFor(header: string): HTMLElement {
    return screen.getByRole("columnheader", { name: new RegExp(header) });
}

describe("DataTable structure", () => {
    it("is a grid that says how many rows and columns it has", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} label="Cats" />);

        const grid = screen.getByRole("grid", { name: "Cats" });
        // The header row counts: a screen reader is told the table has five
        // rows, of which the first is the headers.
        expect(grid).toHaveAttribute("aria-rowcount", "5");
        expect(grid).toHaveAttribute("aria-colcount", "3");
        expect(grid).toHaveAttribute("aria-multiselectable", "true");
    });

    it("numbers every row and cell, because most of them are never in the document", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} />);

        // The header is row one, so the first row of data is row two.
        expect(rowNamed("Whiskers")).toHaveAttribute("aria-rowindex", "2");
        expect(cellIn("Whiskers", 0)).toHaveAttribute("aria-colindex", "1");
        expect(cellIn("Whiskers", 2)).toHaveAttribute("aria-colindex", "3");
    });

    it("names itself when the caller does not", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} />);

        expect(screen.getByRole("grid", { name: "Data table" })).toBeInTheDocument();
    });

    it("takes its name from a heading beside it when given one", () => {
        renderTable(
            <>
                <h2 id="cats-heading">Cats</h2>
                <DataTable columns={COLUMNS} data={CATS} labelledBy="cats-heading" />
            </>,
        );

        expect(screen.getByRole("grid", { name: "Cats" })).toBeInTheDocument();
    });

    it("gives every sortable column a header that says how it is sorted", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} />);

        expect(headerFor("Name")).toHaveAttribute("aria-sort", "none");
        expect(within(headerFor("Name")).getByRole("button")).toBeInTheDocument();
    });

    it("leaves a column that cannot be sorted without a sort state or a button", () => {
        const columns: DataTableColumn<Cat>[] = [{ ...COLUMNS[0], sortable: false }, COLUMNS[1]];
        renderTable(<DataTable columns={columns} data={CATS} />);

        expect(headerFor("Name")).not.toHaveAttribute("aria-sort");
        expect(within(headerFor("Name")).queryByRole("button")).toBeNull();
    });

    it("draws rows at the 28px data pitch, and at whatever height it is given", () => {
        const { rerender } = renderTable(<DataTable columns={COLUMNS} data={CATS} />);
        expect(rowNamed("Whiskers")).toHaveStyle({ height: "28px" });

        rerender(
            <MantineProvider theme={compactTheme}>
                <DataTable columns={COLUMNS} data={CATS} rowHeight={20} />
            </MantineProvider>,
        );
        expect(rowNamed("Whiskers")).toHaveStyle({ height: "20px" });
    });

    it("says what it is announcing out loud as well as drawing it", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} />);

        const status = screen.getByTestId("data-table-status");
        expect(status).toHaveAttribute("aria-live", "polite");
        expect(status).toHaveTextContent("4 of 4 rows");
    });
});

describe("DataTable virtualization", () => {
    it("draws only the rows the scrolling area can show", () => {
        viewportHeight = 112;
        const many: Cat[] = Array.from({ length: 1000 }, (_, index) => ({
            id: `n${index}`,
            name: `Node ${index}`,
            links: index,
            group: index % 2 === 0 ? "A" : "B",
        }));

        renderTable(<DataTable columns={COLUMNS} data={many} getRowId={(cat) => cat.id} height={112} />);

        const drawn = screen.getAllByTestId("data-table-row");
        expect(drawn.length).toBeGreaterThan(0);
        expect(drawn.length).toBeLessThan(40);
        // The table still reports all thousand rows plus the header, which is
        // what tells a screen reader that row two of a thousand is where the
        // reader is.
        expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "1001");
    });
});

describe("DataTable sorting", () => {
    it("sorts a column of words A to Z on the first activation", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} />);

        await user.click(within(headerFor("Name")).getByRole("button"));

        expect(drawnNames()).toEqual(["Chonky", "Henderson", "Nibbles", "Whiskers"]);
        expect(headerFor("Name")).toHaveAttribute("aria-sort", "ascending");
    });

    it("sorts a column of numbers largest first, because that is what a reader is looking for", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} />);

        await user.click(within(headerFor("Links")).getByRole("button"));

        expect(drawnNames()).toEqual(["Chonky", "Nibbles", "Whiskers", "Henderson"]);
        expect(headerFor("Links")).toHaveAttribute("aria-sort", "descending");
    });

    it("sorts numbers as numbers rather than as text", async () => {
        const user = userEvent.setup();
        const numbers: Cat[] = [
            { id: "a", name: "nine", links: 9, group: "A" },
            { id: "b", name: "ten", links: 10, group: "A" },
            { id: "c", name: "two", links: 2, group: "A" },
        ];
        renderTable(<DataTable columns={COLUMNS} data={numbers} getRowId={(cat) => cat.id} />);

        await user.click(within(headerFor("Links")).getByRole("button"));
        await user.click(within(headerFor("Links")).getByRole("button"));

        expect(drawnNames()).toEqual(["two", "nine", "ten"]);
    });

    it("reverses on the second activation and returns to the natural order on the third", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} />);
        const button = within(headerFor("Name")).getByRole("button");

        await user.click(button);
        await user.click(button);
        expect(drawnNames()).toEqual(["Whiskers", "Nibbles", "Henderson", "Chonky"]);
        expect(headerFor("Name")).toHaveAttribute("aria-sort", "descending");

        await user.click(button);
        expect(drawnNames()).toEqual(["Whiskers", "Chonky", "Henderson", "Nibbles"]);
        expect(headerFor("Name")).toHaveAttribute("aria-sort", "none");
    });

    it("sorts by a second column when Shift is held, and by one when it is not", async () => {
        const user = userEvent.setup();
        const handleSortingChange = vi.fn();
        renderTable(<DataTable columns={COLUMNS} data={CATS} onSortingChange={handleSortingChange} />);

        await user.click(within(headerFor("Group")).getByRole("button"));

        await user.keyboard("{Shift>}");
        await user.click(within(headerFor("Links")).getByRole("button"));
        await user.keyboard("{/Shift}");

        expect(drawnNames()).toEqual(["Chonky", "Henderson", "Nibbles", "Whiskers"]);
        expect(headerFor("Group")).toHaveAttribute("aria-sort", "ascending");
        expect(headerFor("Links")).toHaveAttribute("aria-sort", "descending");

        const multi = handleSortingChange.mock.calls[1][0] as DataTableSort[];
        expect(multi).toEqual([
            { id: "group", desc: false },
            { id: "links", desc: true },
        ]);

        // Without Shift the sort is replaced rather than added to.
        await user.click(within(headerFor("Name")).getByRole("button"));
        const single = handleSortingChange.mock.calls[2][0] as DataTableSort[];
        expect(single).toEqual([{ id: "name", desc: false }]);
    });

    it("hands the event that asked for the sort to the consumer", async () => {
        const user = userEvent.setup();
        const handleSortingChange = vi.fn();
        renderTable(<DataTable columns={COLUMNS} data={CATS} onSortingChange={handleSortingChange} />);

        await user.keyboard("{Shift>}");
        await user.click(within(headerFor("Name")).getByRole("button"));
        await user.keyboard("{/Shift}");

        const event = handleSortingChange.mock.calls[0][1] as React.SyntheticEvent | undefined;
        expect(event).toBeDefined();
        expect((event as React.MouseEvent).shiftKey).toBe(true);
    });

    it("takes its sort from the caller when the caller supplies one", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} sorting={[{ id: "name", desc: true }]} />);

        expect(drawnNames()).toEqual(["Whiskers", "Nibbles", "Henderson", "Chonky"]);
        expect(headerFor("Name")).toHaveAttribute("aria-sort", "descending");
    });

    it("starts sorted when given a default sort", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} defaultSorting={[{ id: "links", desc: false }]} />);

        expect(drawnNames()).toEqual(["Whiskers", "Henderson", "Nibbles", "Chonky"]);
    });

    it("sorts words the way a reader of the language does, not the way UTF-16 does", async () => {
        const user = userEvent.setup();
        const german: Cat[] = [
            { id: "z", name: "Zoe", links: 1, group: "A" },
            { id: "ae", name: "Arger", links: 2, group: "A" },
            { id: "a", name: "Anna", links: 3, group: "A" },
        ];
        // The accented name is the point: comparing by code unit puts every
        // accented word after every unaccented one, so "Anna, Zoe, Arger".
        german[1].name = "Ärger";

        render(
            <MantineProvider theme={compactTheme}>
                <LabelsProvider locale="de-DE">
                    <DataTable columns={COLUMNS} data={german} getRowId={(cat) => cat.id} />
                </LabelsProvider>
            </MantineProvider>,
        );

        await user.click(within(headerFor("Name")).getByRole("button"));

        expect(drawnNames()).toEqual(["Anna", "Ärger", "Zoe"]);
    });

    it("draws where each column comes in a sort by several columns", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} />);

        await user.click(within(headerFor("Group")).getByRole("button"));
        await user.keyboard("{Shift>}");
        await user.click(within(headerFor("Links")).getByRole("button"));
        await user.keyboard("{/Shift}");

        // The number is where the column comes in the sort, not where it comes
        // in the table: Group was activated first, so it is the first sort.
        expect(within(headerFor("Group")).getByTestId("data-table-sort-priority")).toHaveTextContent("1");
        expect(within(headerFor("Links")).getByTestId("data-table-sort-priority")).toHaveTextContent("2");
    });
});

describe("DataTable selection", () => {
    it("says nothing when a gesture leaves the selection where it was", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.click(cellIn("Whiskers"));
        expect(handleSelectionChange).toHaveBeenCalledTimes(1);

        await user.click(cellIn("Whiskers"));
        expect(handleSelectionChange).toHaveBeenCalledTimes(1);
    });

    it("selects one row on a plain click, and replaces it on the next", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.click(cellIn("Whiskers"));
        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c1"], expect.anything());
        expect(rowNamed("Whiskers")).toHaveAttribute("aria-selected", "true");

        await user.click(cellIn("Nibbles"));
        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c4"], expect.anything());
        expect(rowNamed("Whiskers")).toHaveAttribute("aria-selected", "false");
    });

    it("extends the selection when Shift is held", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.click(cellIn("Whiskers"));
        await user.keyboard("{Shift>}");
        await user.click(cellIn("Henderson"));
        await user.keyboard("{/Shift}");

        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c1", "c2", "c3"], expect.anything());
    });

    it("adds and removes single rows when Control or Command is held", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.click(cellIn("Whiskers"));

        await user.keyboard("{Control>}");
        await user.click(cellIn("Nibbles"));
        await user.keyboard("{/Control}");
        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c1", "c4"], expect.anything());

        await user.keyboard("{Meta>}");
        await user.click(cellIn("Whiskers"));
        await user.keyboard("{/Meta}");
        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c4"], expect.anything());
    });

    it("keeps one row selected at a time when told to", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                selectionMode="single"
                onSelectionChange={handleSelectionChange}
            />,
        );

        expect(screen.getByRole("grid")).not.toHaveAttribute("aria-multiselectable");

        await user.click(cellIn("Whiskers"));
        await user.keyboard("{Shift>}");
        await user.click(cellIn("Nibbles"));
        await user.keyboard("{/Shift}");

        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c4"], expect.anything());
    });

    it("says nothing about selection when there is none to be had", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                selectionMode="none"
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.click(cellIn("Whiskers"));

        expect(rowNamed("Whiskers")).not.toHaveAttribute("aria-selected");
        expect(handleSelectionChange).not.toHaveBeenCalled();
    });

    it("draws the selection the caller gives it", () => {
        renderTable(
            <DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} selectedIds={["c2", "c4"]} />,
        );

        expect(rowNamed("Chonky")).toHaveAttribute("aria-selected", "true");
        expect(rowNamed("Nibbles")).toHaveAttribute("aria-selected", "true");
        expect(rowNamed("Whiskers")).toHaveAttribute("aria-selected", "false");
    });

    it("reports the row that was activated, and whether a pointer or a key did it", async () => {
        const user = userEvent.setup();
        const handleRowClick = vi.fn();
        renderTable(
            <DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} onRowClick={handleRowClick} />,
        );

        await user.click(cellIn("Nibbles"));

        expect(handleRowClick).toHaveBeenCalledWith(CATS[3], expect.anything(), { source: "pointer" });
    });

    it("reports a double click and a context menu on the row", async () => {
        const user = userEvent.setup();
        const handleDoubleClick = vi.fn();
        const handleContextMenu = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onRowDoubleClick={handleDoubleClick}
                onRowContextMenu={handleContextMenu}
            />,
        );

        await user.dblClick(cellIn("Chonky"));
        expect(handleDoubleClick).toHaveBeenCalledWith(CATS[1], expect.anything());

        await user.pointer({ keys: "[MouseRight]", target: cellIn("Chonky") });
        expect(handleContextMenu).toHaveBeenCalledWith(CATS[1], expect.anything());
    });
});

describe("DataTable keyboard", () => {
    it("puts one cell in the tab order and moves between the cells with the arrows", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} />);

        await user.tab();
        expect(document.activeElement).toHaveAttribute("data-grid-row", "-1");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "0");

        await user.keyboard("{ArrowDown}");
        expect(document.activeElement).toHaveAttribute("data-grid-row", "0");
        expect(document.activeElement).toHaveAttribute("role", "gridcell");

        await user.keyboard("{ArrowRight}");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "1");

        await user.keyboard("{ArrowLeft}");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "0");

        await user.keyboard("{End}");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "2");

        await user.keyboard("{Home}");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "0");
    });

    it("reaches the ends of the table with Control and Home or End", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} />);

        await user.tab();
        await user.keyboard("{Control>}{End}{/Control}");
        expect(document.activeElement).toHaveAttribute("data-grid-row", "3");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "2");

        await user.keyboard("{Control>}{Home}{/Control}");
        expect(document.activeElement).toHaveAttribute("data-grid-row", "-1");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "0");
    });

    it("takes Tab back out of the table rather than through every cell", async () => {
        const user = userEvent.setup();
        renderTable(
            <>
                <DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} />
                <button type="button">After</button>
            </>,
        );

        await user.tab();
        await user.keyboard("{ArrowDown}");
        await user.tab();

        expect(document.activeElement).toHaveTextContent("After");
    });

    it("follows the direction of the text, so Arrow Left advances where text runs right to left", async () => {
        const user = userEvent.setup();
        render(
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <MantineProvider theme={compactTheme}>
                    <DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} />
                </MantineProvider>
            </DirectionProvider>,
        );

        await user.tab();
        await user.keyboard("{ArrowLeft}");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "1");

        await user.keyboard("{ArrowRight}");
        expect(document.activeElement).toHaveAttribute("data-grid-column", "0");
    });

    it("selects the focused row with Space and activates it with Enter", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        const handleRowClick = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
                onRowClick={handleRowClick}
            />,
        );

        await user.tab();
        await user.keyboard("{ArrowDown}{ArrowDown}");
        await user.keyboard(" ");
        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c2"], expect.anything());

        await user.keyboard("{Enter}");
        expect(handleRowClick).toHaveBeenCalledWith(CATS[1], expect.anything(), { source: "keyboard" });
    });

    it("adds to the selection with Space, the way Control and a click does", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.tab();
        await user.keyboard("{ArrowDown} {ArrowDown} ");

        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c1", "c2"], expect.anything());
    });

    it("grows the selection with Shift and an arrow", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.tab();
        await user.keyboard("{ArrowDown} ");
        await user.keyboard("{Shift>}{ArrowDown}{ArrowDown}{/Shift}");

        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c1", "c2", "c3"], expect.anything());
    });

    it("selects everything on show with Control and A", async () => {
        const user = userEvent.setup();
        const handleSelectionChange = vi.fn();
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={CATS}
                getRowId={(cat) => cat.id}
                onSelectionChange={handleSelectionChange}
            />,
        );

        await user.tab();
        await user.keyboard("{ArrowDown}");
        await user.keyboard("{Control>}a{/Control}");

        expect(handleSelectionChange).toHaveBeenLastCalledWith(["c1", "c2", "c3", "c4"], expect.anything());
    });

    it("does not take focus from the page just by being drawn", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} />);

        expect(document.activeElement).toBe(document.body);
    });
});

describe("DataTable search", () => {
    it("keeps the rows that hold the text, in every visible column", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} searchable />);

        await user.type(screen.getByRole("searchbox", { name: "Search" }), "nib");

        expect(drawnNames()).toEqual(["Nibbles"]);
        expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "2");
        expect(screen.getByTestId("data-table-status")).toHaveTextContent("1 of 4 rows");
    });

    it("searches the text a reader can see, not the value behind it", async () => {
        const user = userEvent.setup();
        const big: Cat[] = [{ id: "b", name: "Big", links: 1024, group: "A" }];
        renderTable(<DataTable columns={COLUMNS} data={big} getRowId={(cat) => cat.id} searchable />);

        await user.type(screen.getByRole("searchbox", { name: "Search" }), "1,024");

        expect(drawnNames()).toEqual(["Big"]);
    });

    it("stops searching a column that has been hidden", async () => {
        const user = userEvent.setup();
        const { rerender } = renderTable(
            <DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} searchable />,
        );

        await user.type(screen.getByRole("searchbox", { name: "Search" }), "b");
        expect(drawnNames()).toEqual(["Whiskers", "Nibbles"]);

        rerender(
            <MantineProvider theme={compactTheme}>
                <DataTable
                    columns={COLUMNS}
                    data={CATS}
                    getRowId={(cat) => cat.id}
                    searchable
                    hiddenColumns={["group"]}
                />
            </MantineProvider>,
        );

        expect(drawnNames()).toEqual(["Nibbles"]);
    });

    it("says so when a search matches nothing, and says something else when there is nothing at all", async () => {
        const user = userEvent.setup();
        const { rerender } = renderTable(
            <DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} searchable />,
        );

        await user.type(screen.getByRole("searchbox", { name: "Search" }), "zzz");
        expect(screen.getByTestId("data-table-empty")).toHaveTextContent("No rows match the search");

        rerender(
            <MantineProvider theme={compactTheme}>
                <DataTable columns={COLUMNS} data={[]} getRowId={(cat) => cat.id} searchable />
            </MantineProvider>,
        );
        expect(screen.getByTestId("data-table-empty")).toHaveTextContent("No rows");
    });

    it("empties the search box on request", async () => {
        const user = userEvent.setup();
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} searchable />);

        await user.type(screen.getByRole("searchbox", { name: "Search" }), "nib");
        await user.click(screen.getByRole("button", { name: "Clear search" }));

        expect(drawnNames()).toHaveLength(4);
    });

    it("takes the text from the caller when the caller supplies it", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} filter="chon" />);

        expect(drawnNames()).toEqual(["Chonky"]);
    });
});

describe("DataTable columns", () => {
    it("hides the columns it is told to", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} hiddenColumns={["links"]} />);

        expect(screen.getByRole("grid")).toHaveAttribute("aria-colcount", "2");
        expect(screen.queryByRole("columnheader", { name: /Links/ })).toBeNull();
    });

    it("draws the columns in the order it is given", () => {
        renderTable(<DataTable columns={COLUMNS} data={CATS} columnOrder={["group", "name"]} />);

        const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
        expect(headers).toEqual(["Group", "Name", "Links"]);
    });

    it("draws a cell the column draws for itself, and still sorts and searches the value behind it", async () => {
        const user = userEvent.setup();
        const columns: DataTableColumn<Cat>[] = [
            {
                id: "name",
                header: "Name",
                value: (cat) => cat.name,
                cell: (cat) => <span data-testid="drawn-cell">{cat.name.toUpperCase()}</span>,
            },
        ];
        renderTable(<DataTable columns={columns} data={CATS} getRowId={(cat) => cat.id} searchable />);

        expect(screen.getAllByTestId("drawn-cell")[0]).toHaveTextContent("WHISKERS");

        await user.type(screen.getByRole("searchbox", { name: "Search" }), "nibbles");
        expect(screen.getAllByTestId("drawn-cell")).toHaveLength(1);
    });

    it("lets a table that keeps its own column arrangement be rearranged from outside", async () => {
        const user = userEvent.setup();

        /**
         * A table that keeps its own arrangement, with a control beside it.
         * @returns The example
         */
        function Example(): React.JSX.Element {
            const handle = useRef<DataTableHandle>(null);

            return (
                <MantineProvider theme={compactTheme}>
                    <DataTable ref={handle} columns={COLUMNS} data={CATS} getRowId={(cat) => cat.id} />
                    <button
                        type="button"
                        onClick={() => {
                            handle.current?.setColumnHidden("links", true);
                        }}
                    >
                        Hide links
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            handle.current?.moveColumn("group", 0);
                        }}
                    >
                        Group first
                    </button>
                </MantineProvider>
            );
        }

        render(<Example />);

        await user.click(screen.getByRole("button", { name: "Hide links" }));
        expect(screen.queryByRole("columnheader", { name: /Links/ })).toBeNull();

        await user.click(screen.getByRole("button", { name: "Group first" }));
        expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Group", "Name"]);
    });
});

describe("DataTable internationalization", () => {
    it("formats numbers for the locale in force", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <LabelsProvider locale="de-DE">
                    <DataTable
                        columns={COLUMNS}
                        data={[{ id: "b", name: "Big", links: 1024, group: "A" }]}
                        getRowId={(cat) => cat.id}
                    />
                </LabelsProvider>
            </MantineProvider>,
        );

        expect(cellIn("Big", 1)).toHaveTextContent("1.024");
    });

    it("lets every string it produces be replaced", () => {
        renderTable(
            <DataTable
                columns={COLUMNS}
                data={[]}
                labels={{ dataTable: "Datentabelle", noRows: "Keine Zeilen" }}
                searchable
            />,
        );

        expect(screen.getByRole("grid", { name: "Datentabelle" })).toBeInTheDocument();
        expect(screen.getByTestId("data-table-empty")).toHaveTextContent("Keine Zeilen");
    });

    it("follows the LabelsProvider that translates the rest of the library", () => {
        // One provider translates the whole package. The table used to carry a
        // string set of its own, so an application that translated everything
        // else found the table still speaking English.
        render(
            <MantineProvider theme={compactTheme}>
                <LabelsProvider labels={{ noRows: "Keine Zeilen" }}>
                    <DataTable columns={COLUMNS} data={[]} />
                </LabelsProvider>
            </MantineProvider>,
        );

        expect(screen.getByTestId("data-table-empty")).toHaveTextContent("Keine Zeilen");
    });

    it("lets one table reword a string the provider set for all of them", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <LabelsProvider labels={{ noRows: "Keine Zeilen" }}>
                    <DataTable columns={COLUMNS} data={[]} labels={{ noRows: "Keine Katzen" }} />
                </LabelsProvider>
            </MantineProvider>,
        );

        expect(screen.getByTestId("data-table-empty")).toHaveTextContent("Keine Katzen");
    });
});

describe("DataTable controlled state", () => {
    it("drives the selection from the caller's own state", async () => {
        const user = userEvent.setup();

        /**
         * A table whose selection is held outside it.
         * @returns The example
         */
        function Example(): React.JSX.Element {
            const [selected, setSelected] = useState<string[]>([]);

            return (
                <MantineProvider theme={compactTheme}>
                    <DataTable
                        columns={COLUMNS}
                        data={CATS}
                        getRowId={(cat) => cat.id}
                        selectedIds={selected}
                        onSelectionChange={setSelected}
                    />
                    <div data-testid="selected-ids">{selected.join(",")}</div>
                </MantineProvider>
            );
        }

        render(<Example />);

        await user.click(cellIn("Henderson"));
        expect(screen.getByTestId("selected-ids")).toHaveTextContent("c3");

        await user.keyboard("{Shift>}");
        await user.click(cellIn("Nibbles"));
        await user.keyboard("{/Shift}");
        expect(screen.getByTestId("selected-ids")).toHaveTextContent("c3,c4");
    });
});
