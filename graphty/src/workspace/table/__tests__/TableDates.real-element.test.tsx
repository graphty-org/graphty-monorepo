/**
 * Dates in the table on the REAL graphty-element, with the pantry site list: a column typed date
 * reads "Mar 2, 2015" without being the time, its sort is spoken as "oldest first", the first
 * click on a header of words sorts A to Z, and in the header menu an issue's fix lines up with
 * Ignore and Show rows under the issue's label.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { columnGlyph } from "../../data-place/words";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The site list the studio's T62 opens: "opened" is read as words, "families" has an "n/a". */
const PANTRIES = `id,site,opened,families
P01,Central Warehouse,2015-03-02,0
P02,Eastside Pantry,2017-06-14,140
P03,Riverside Church,2016-09-01,95
P07,Library Annex,2021-08-05,n/a
P12,Bayview Clinic,2023-03-08,55
`;

/**
 * Drops a file as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param file - the file.
 */
function drop(file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * A header cell of the table, by its column's name.
 * @param name - the column.
 * @returns the cell.
 */
function headerCell(name: string): HTMLElement {
    const label = screen.getAllByTestId("data-table-header-label").find((each) => each.textContent === name);
    const cell = label?.closest<HTMLElement>('[data-testid="data-table-header"]');
    if (cell === null || cell === undefined) {
        throw new Error(`no header ${name}`);
    }
    return cell;
}

/**
 * Where a menu row's words start, in pixels from the window's left.
 * @param row - the menu row.
 * @returns the left edge of its label.
 */
function labelLeft(row: HTMLElement): number {
    const label = row.querySelector<HTMLElement>('[class*="itemLabel"]') ?? row;
    return label.getBoundingClientRect().left;
}

describe("dates in the table", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("reads a date column as dates, sorts it oldest first, words A to Z, and lines up a fix", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        drop(new File([PANTRIES], "pantries.csv", { type: "text/csv" }));
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element:not([data-start-page])",
            )?.session;
            assert.isDefined(session);
            assert.strictEqual(session?.data.nodes().length, 5);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.setType({ kind: "node", name: "opened" }, "date");
        // A dropped table of nodes opens the table dock by itself.
        const grid = await screen.findByRole("grid", { name: "Nodes" });

        // A date column that is not the time reads as the time does.
        await waitFor(() => {
            within(grid).getByText("Mar 2, 2015");
            assert.notInclude(grid.textContent, "2015-03-02");
        });

        // Its sort is spoken in dates' words; the oldest site is first.
        await userEvent.click(within(headerCell("opened")).getByTestId("data-table-sort-button"));
        await waitFor(() => {
            assert.strictEqual(store.get().announcement, "Sorted by opened, oldest first");
            const first = within(grid).getAllByRole("row")[1];
            assert.isTrue(first?.textContent?.startsWith("P01"), first?.textContent ?? "no row");
        });

        // The first click on a header of words sorts A to Z, as a spreadsheet does.
        await userEvent.click(within(headerCell("families")).getByTestId("data-table-sort-button"));
        await waitFor(() => {
            assert.strictEqual(store.get().announcement, "Sorted by families, A to Z");
        });

        // An issue's fix starts where Ignore and Show rows start, under the issue's label.
        await userEvent.click(within(headerCell("families")).getByRole("button", { name: "Options for families" }));
        const menu = await screen.findByRole("menu");
        const fix = within(menu).getAllByRole("menuitemradio")[0];
        const ignore = within(menu).getAllByRole("menuitem", { name: "Ignore" })[0];
        const showRows = within(menu).getAllByRole("menuitem", { name: "Show rows" })[0];
        assert.isDefined(fix);
        assert.isDefined(ignore);
        assert.isDefined(showRows);
        assert.closeTo(labelLeft(ignore), labelLeft(fix), 0.5, "Ignore lines up with the fix");
        assert.closeTo(labelLeft(showRows), labelLeft(fix), 0.5, "Show rows lines up with the fix");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
        });
    });

    it("draws a text column with the Time role as text, and as dates once typed date", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        drop(new File([PANTRIES], "pantries.csv", { type: "text/csv" }));
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element:not([data-start-page])",
            )?.session;
            assert.isDefined(session);
            assert.strictEqual(session?.data.nodes().length, 5);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const live = session;
        await live.time.setField({ nodes: { start: "opened" } });
        const grid = await screen.findByRole("grid", { name: "Nodes" });
        // What Fields' column lists and the inspector draw for the column.
        const fieldsGlyph = (): string => {
            const column = live.data.attributes().find((each) => each.kind === "node" && each.name === "opened");
            assert.isDefined(column);
            return column === undefined ? "" : columnGlyph(live, column);
        };

        // The Time role leaves a text column text: its cells as written, Aa with the Time chip, A to Z.
        await waitFor(() => {
            within(grid).getByText("2015-03-02");
            assert.notInclude(grid.textContent, "Mar 2, 2015");
            const icons = headerCell("opened").querySelector<HTMLElement>(".ws-th-icons");
            assert.strictEqual(icons?.dataset.type, "string");
            assert.strictEqual(icons?.querySelector<HTMLElement>(".ws-th-role")?.dataset.role, "time");
        });
        assert.strictEqual(fieldsGlyph(), "text");
        await userEvent.click(within(headerCell("opened")).getByTestId("data-table-sort-button"));
        await waitFor(() => {
            assert.strictEqual(store.get().announcement, "Sorted by opened, A to Z");
        });

        // Typed date, every sign says date.
        await live.data.setType({ kind: "node", name: "opened" }, "date");
        await waitFor(() => {
            within(grid).getByText("Mar 2, 2015");
            assert.strictEqual(headerCell("opened").querySelector<HTMLElement>(".ws-th-icons")?.dataset.type, "time");
        });
        assert.strictEqual(fieldsGlyph(), "time");
        await userEvent.click(within(headerCell("opened")).getByTestId("data-table-sort-button"));
        await waitFor(() => {
            assert.strictEqual(store.get().announcement, "Sorted by opened, newest first");
        });
    });
});
