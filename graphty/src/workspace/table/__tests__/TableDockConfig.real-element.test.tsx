/**
 * The table dock's configuration on the REAL graphty-element (data prototype spec section 3.5),
 * with the fraud fixture: the node and edge files dropped together open the table maximized
 * beside Sources, Fields and the Issues list; every issue the element counts is in the list and in
 * a header (its hover and its menu), each with Ignore; a fix and an Ignore change the element;
 * Hide others leaves one column and Unhide all brings the rest back; Esc minimizes. The body holds
 * records only. Every assertion reads what the element reports or what the page draws from it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The fraud fixture's issues as the element counts them, and the header that carries each. */
const ISSUES: readonly { label: string; tab: "Nodes" | "Edges"; header: string }[] = [
    { label: "18 unknown ends", tab: "Edges", header: "From" },
    { label: "2 repeated ids", tab: "Nodes", header: "Id" },
    { label: "row 412 refused", tab: "Edges", header: "From" },
    { label: "5 repeated", tab: "Edges", header: "From" },
    { label: "3 decimal commas", tab: "Edges", header: "amount" },
    { label: "1 not a number", tab: "Edges", header: "amount" },
];

/**
 * A fixture as a file, read from where the app serves it.
 * @param name - its file name.
 * @returns the file.
 */
async function fixture(name: string): Promise<File> {
    const sample = PROTOTYPE_SAMPLES.find((each) => sampleName(each) === name);
    if (sample === undefined) {
        throw new Error(`no fixture ${name}`);
    }
    const response = await fetch(sampleUrl(sample));
    return new File([await response.blob()], name);
}

/**
 * Drops files as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param files - the files.
 */
function drop(...files: File[]): void {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * Waits for the project's element and its session.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element:not([data-start-page])",
            )?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * The header cells' names of a table, left to right.
 * @param name - "Nodes" or "Edges".
 * @returns the names.
 */
function headerNames(name: string): string[] {
    return screen
        .getAllByRole("grid", { name })
        .flatMap((grid) => within(grid).queryAllByTestId("data-table-header-label"))
        .map((label) => label.textContent);
}

/**
 * A header cell of a table, by its column's name.
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

describe("the table dock's configuration", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("lists every fraud issue in its header and in the Issues list, with fixes and Ignore", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        drop(await fixture("accounts.csv"), await fixture("transfers.csv"));
        const session = await elementSession();
        await waitFor(
            () => {
                assert.lengthOf(session.data.issues(), ISSUES.length);
                assert.isTrue(store.get().dockMaximized);
            },
            { timeout: TIMEOUT_MS },
        );

        // Maximized: the configuration column beside the table, with every issue, each with Ignore.
        const dock = await screen.findByRole("region", { name: "Table" });
        const config = await within(dock).findByRole("complementary", { name: "Table configuration" });
        within(config).getByRole("list", { name: "Sources" });
        const list = within(config).getByRole("list", { name: "Issues" });
        for (const { label } of ISSUES) {
            within(list).getByText(label);
            within(list).getByRole("button", { name: `Ignore ${label}` });
        }

        // Every issue is in its header: the warning's hover lists it with its buttons, and the
        // header's menu offers the same fixes and Ignore for the keyboard.
        for (const tab of ["Nodes", "Edges"] as const) {
            await userEvent.click(within(dock).getByRole("tab", { name: tab }));
            for (const issue of ISSUES.filter((each) => each.tab === tab)) {
                const cell = await waitFor(() => headerCell(issue.header));
                await userEvent.hover(within(cell).getByRole("img", { name: `Issues in ${issue.header}` }));
                const hover = await screen.findByRole("list", { name: `Issues in ${issue.header}` });
                within(hover).getByRole("button", { name: `Ignore ${issue.label}` });
                await userEvent.unhover(within(cell).getByRole("img", { name: `Issues in ${issue.header}` }));
                await userEvent.click(within(cell).getByRole("button", { name: `Options for ${issue.header}` }));
                const menu = await screen.findByRole("menu");
                within(menu).getByText(issue.label);
                assert.isAtLeast(within(menu).getAllByRole("menuitem", { name: "Ignore" }).length, 1);
                await userEvent.keyboard("{Escape}");
                await waitFor(() => {
                    assert.isNull(screen.queryByRole("menu"));
                });
            }
        }
        // Esc in a menu closed the menu, not the maximized view.
        assert.isTrue(store.get().dockMaximized);

        // A fix from the header's hover: the "N/A" becomes blank, and the issue goes.
        const amount = headerCell("amount");
        await userEvent.hover(within(amount).getByRole("img", { name: "Issues in amount" }));
        const amountHover = await screen.findByRole("list", { name: "Issues in amount" });
        await userEvent.click(within(amountHover).getByRole("button", { name: "Make blank: 1 not a number" }));
        await waitFor(() => {
            assert.isUndefined(session.data.issues().find((issue) => issue.code === "not-a-number"));
        });
        await userEvent.unhover(within(amount).getByRole("img", { name: "Issues in amount" }));

        // Ignore in the list: the issue leaves the list and the headers, and the toggle brings it back.
        await userEvent.click(within(list).getByRole("button", { name: "Ignore 5 repeated" }));
        await waitFor(() => {
            assert.isUndefined(session.data.issues().find((issue) => issue.code === "repeated-edge"));
            assert.isTrue(
                session.data.issues({ includeIgnored: true }).some((issue) => issue.code === "repeated-edge"),
            );
        });
        assert.isNull(within(list).queryByText("5 repeated"));
        await userEvent.click(within(config).getByRole("button", { name: "Ignored 1" }));
        await within(list).findByRole("button", { name: "Restore 5 repeated" });

        // The body holds records only: every control of the grid is in its header row.
        const grid = screen.getByRole("grid", { name: "Edges" });
        const [, ...bodyRows] = within(grid).getAllByRole("row");
        assert.isAbove(bodyRows.length, 0);
        for (const row of bodyRows) {
            assert.lengthOf(within(row).queryAllByRole("button"), 0);
        }

        // Hide others on holder leaves one column; Unhide all brings the rest back.
        await userEvent.click(within(dock).getByRole("tab", { name: "Nodes" }));
        const before = await waitFor(() => {
            const names = headerNames("Nodes");
            assert.include(names, "holder");
            return names;
        });
        await userEvent.click(within(headerCell("holder")).getByRole("button", { name: "Options for holder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Hide others" }));
        await waitFor(() => {
            assert.deepEqual(headerNames("Nodes"), ["holder"]);
        });
        assert.isTrue(session.data.attributes().some((a) => a.name === "opened" && a.hidden === true));
        await userEvent.click(within(headerCell("holder")).getByRole("button", { name: "Options for holder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Unhide all" }));
        await waitFor(() => {
            assert.deepEqual(headerNames("Nodes"), before);
        });

        // Esc minimizes back to the dock, and the drawing shows again.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(store.get().dockMaximized);
        });
        assert.isNull(within(dock).queryByRole("complementary", { name: "Table configuration" }));
        assert.isTrue(store.get().dockOpen);
        await userEvent.click(within(dock).getByRole("button", { name: "Maximize table" }));
        await waitFor(() => {
            assert.isTrue(store.get().dockMaximized);
        });
    });

    it("renames a column and changes its type from the header menu", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        drop(await fixture("accounts.csv"), await fixture("transfers.csv"));
        const session = await elementSession();
        await waitFor(
            () => {
                assert.isTrue(store.get().dockMaximized);
            },
            { timeout: TIMEOUT_MS },
        );
        const dock = await screen.findByRole("region", { name: "Table" });
        await waitFor(() => headerCell("holder"));

        // Rename...: the name is typed in a pop-over under the header; Enter renames.
        await userEvent.click(within(headerCell("holder")).getByRole("button", { name: "Options for holder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Rename..." }));
        const input = await screen.findByRole("textbox", { name: "Column name" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, input);
        });
        await userEvent.keyboard("{Control>}a{/Control}owner{Enter}");
        await waitFor(() => {
            assert.isTrue(session.data.attributes().some((a) => a.kind === "node" && a.name === "owner"));
            assert.include(headerNames("Nodes"), "owner");
        });

        // Type > yes/no on flagged, after the row says how many will not convert.
        await userEvent.click(within(headerCell("flagged")).getByRole("button", { name: "Options for flagged" }));
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Type" }));
        await userEvent.click(await screen.findByRole("menuitemradio", { name: /^yes\/no/ }));
        await waitFor(() => {
            assert.strictEqual(session.data.attributes().find((a) => a.name === "flagged")?.type, "boolean");
        });
        await session.undo();
        await waitFor(() => {
            assert.notStrictEqual(session.data.attributes().find((a) => a.name === "flagged")?.type, "boolean");
        });
        within(dock).getByRole("tab", { name: "Nodes" });
    });
});
