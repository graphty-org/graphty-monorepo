/**
 * The data table's header features in a real browser: a pinned key column that holds the start
 * edge while the others scroll sideways, a header glyph, a header tooltip, and a header menu
 * opened by its caret or from the keyboard.
 */
import { MantineProvider, Menu } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme } from "../../../src";
import { DataTable, type DataTableColumn } from "../../../src/components/DataTable";

interface Node {
    id: string;
    degree: number;
    group: string;
}

const NODES: Node[] = Array.from({ length: 20 }, (_, index) => ({
    id: `n${String(index)}`,
    degree: index,
    group: `g${String(index % 3)}`,
}));

/**
 * Columns with the id last in the list but pinned, so it is drawn first.
 * @param onHide - Called by the degree column's menu item
 * @returns The columns
 */
function columns(onHide: () => void): DataTableColumn<Node>[] {
    return [
        {
            id: "degree",
            header: "Degree",
            value: (node) => node.degree,
            width: 160,
            icon: <span data-testid="glyph">#</span>,
            headerTooltip: "20 values, 0 to 19",
            menu: <Menu.Item onClick={onHide}>Hide column</Menu.Item>,
        },
        {
            id: "group",
            header: "Group",
            value: (node) => node.group,
            width: 160,
            sortable: false,
            headerTooltip: "3 groups",
        },
        { id: "id", header: "Node", value: (node) => node.id, width: 100, pinned: "start" },
    ];
}

/**
 * Render the table in a frame narrower than its columns.
 * @param onHide - Called by the degree column's menu item
 * @returns The testing-library render result
 */
function renderTable(onHide = vi.fn()): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme}>
            <div style={{ width: 240 }}>
                <DataTable columns={columns(onHide)} data={NODES} getRowId={(node) => node.id} label="Nodes" />
            </div>
        </MantineProvider>,
    );
}

describe("DataTable header features", () => {
    it("draws a pinned column first and keeps it at the start edge while the table scrolls sideways", async () => {
        renderTable();
        const headers = screen.getAllByTestId("data-table-header");
        expect(headers[0]).toHaveTextContent("Node");

        const viewport = screen.getByTestId("data-table-viewport");
        const cell = screen.getByText("n3").closest("td")!;
        const before = cell.getBoundingClientRect().left;
        const degreeBefore = screen.getByText("3", { selector: ".cm-dt-text" }).getBoundingClientRect().left;
        viewport.scrollLeft = 120;
        await waitFor(() => {
            expect(viewport.scrollLeft).toBe(120);
        });
        expect(cell.getBoundingClientRect().left).toBeCloseTo(before, 0);
        expect(headers[0].getBoundingClientRect().left).toBeCloseTo(before, 0);
        expect(screen.getByText("3", { selector: ".cm-dt-text" }).getBoundingClientRect().left).toBeLessThan(
            degreeBefore - 100,
        );
        // The pinned cell is drawn over the cells scrolling under it.
        const { left, top, height } = cell.getBoundingClientRect();
        expect(document.elementFromPoint(left + 10, top + height / 2)?.closest("td")).toBe(cell);
    });

    it("draws the glyph before the name and keeps the name as the header's name", () => {
        renderTable();
        const button = within(screen.getAllByTestId("data-table-header")[1]).getByTestId("data-table-sort-button");
        const glyph = within(button).getByTestId("glyph").getBoundingClientRect();
        const name = within(button).getByText("Degree").getBoundingClientRect();
        expect(glyph.right).toBeLessThanOrEqual(name.left);
        expect(button).toHaveAccessibleName("Degree");
    });

    it("shows the header tooltip on keyboard focus and describes the header with it", async () => {
        renderTable();
        const button = within(screen.getAllByTestId("data-table-header")[1]).getByTestId("data-table-sort-button");
        await userEvent.tab();
        await userEvent.keyboard("{ArrowRight}");
        expect(button).toHaveFocus();
        await waitFor(
            () => {
                expect(screen.getByRole("tooltip")).toHaveTextContent("20 values, 0 to 19");
            },
            { timeout: 3000 },
        );
        expect(button).toHaveAccessibleDescription("20 values, 0 to 19");
    });

    it("keeps a long header name clear of the menu caret when the column does not sort", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <DataTable
                    columns={[
                        {
                            id: "long",
                            header: "A very long column name that does not fit",
                            value: (node: Node) => node.group,
                            width: 160,
                            sortable: false,
                            menu: <Menu.Item>Hide column</Menu.Item>,
                        },
                        // A last column takes the spare width, so the first keeps its 160px.
                        { id: "id", header: "Node", value: (node: Node) => node.id, width: 100 },
                    ]}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Nodes"
                />
            </MantineProvider>,
        );
        const header = screen.getAllByTestId("data-table-header")[0];
        await userEvent.hover(header);
        const label = within(header).getByTestId("data-table-header-label").getBoundingClientRect();
        const caret = within(header).getByTestId("data-table-header-menu").getBoundingClientRect();
        expect(label.right).toBeLessThanOrEqual(caret.left);
    });

    it("gives a header that is not a button its tooltip too", async () => {
        renderTable();
        const header = screen.getAllByTestId("data-table-header")[2];
        await userEvent.tab();
        await userEvent.keyboard("{ArrowRight}{ArrowRight}");
        expect(header).toHaveFocus();
        await waitFor(
            () => {
                expect(screen.getByRole("tooltip")).toHaveTextContent("3 groups");
            },
            { timeout: 3000 },
        );
    });

    it("opens the header menu from its caret, and from the keyboard on the header", async () => {
        const onHide = vi.fn();
        renderTable(onHide);
        const caret = screen.getByRole("button", { name: "Options for Degree" });
        await userEvent.click(caret);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Hide column" }));
        expect(onHide).toHaveBeenCalledTimes(1);
        // Closing from an item hands focus back to the header.
        const button = within(screen.getAllByTestId("data-table-header")[1]).getByTestId("data-table-sort-button");
        await waitFor(() => {
            expect(button).toHaveFocus();
        });

        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        const item = await screen.findByRole("menuitem", { name: "Hide column" });
        await waitFor(() => {
            expect(item).toHaveFocus();
        });
        // Arrow keys inside the menu are the menu's, not the grid's.
        await userEvent.keyboard("{ArrowDown}");
        expect(screen.getByRole("menu")).toBeInTheDocument();
        await userEvent.keyboard("{Enter}");
        expect(onHide).toHaveBeenCalledTimes(2);
        await waitFor(() => {
            expect(button).toHaveFocus();
        });
    });

    it("leaves the caret out of the tab order", () => {
        renderTable();
        expect(screen.getByRole("button", { name: "Options for Degree" })).toHaveAttribute("tabindex", "-1");
    });
});
