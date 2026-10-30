/**
 * The table dock's configuration on the REAL graphty-element (data prototype spec section 3.5),
 * with the fraud fixture: the node and edge files dropped together draw, so the table opens docked,
 * not maximized; the loaded key columns (account, from, to) are the key columns, with no made-up
 * Id, From or To beside them. Maximized, the Issues list is beside the table and the left panel is
 * the Data place (Sources, Fields, Filters), each shown once, and the canvas under it is inert.
 * Every issue the element counts is in the list (with a node or edge chip) and in a header (its
 * hover, its description and its menu), each with Ignore; a fix and an Ignore change the element,
 * and a fixed issue is listed under Resolved; Hide others leaves one column and Unhide brings one
 * back, then all; a filter narrows the table to the shown records (Shown / All); Esc minimizes.
 * The body holds records only. Every assertion reads what the element reports or what the page draws from it.
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

/** The fraud fixture's issues as the element counts them, and the header that carries each. */
const ISSUES: readonly { label: string; tab: "Nodes" | "Edges"; header: string }[] = [
    { label: "18 unknown ends", tab: "Edges", header: "from" },
    { label: "2 repeated ids", tab: "Nodes", header: "account" },
    { label: "row 412 refused", tab: "Edges", header: "from" },
    { label: "5 repeated edges", tab: "Edges", header: "from" },
    { label: "298 values could be yes/no", tab: "Nodes", header: "flagged" },
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
    await waitFor(() => {
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
    });
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

/**
 * Drops the fraud fixture's two files, waits for every issue, and maximizes the table.
 * @returns the store, the session, the dock, its configuration and its Issues list.
 */
async function openMaximized(): Promise<{
    store: ReturnType<typeof createWorkspaceStore>;
    session: GraphSession;
    dock: HTMLElement;
    config: HTMLElement;
    list: HTMLElement;
}> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    drop(await fixture("accounts.csv"), await fixture("transfers.csv"));
    const session = await elementSession();
    await waitFor(() => {
        assert.lengthOf(session.data.issues(), ISSUES.length);
        assert.isTrue(store.get().dockOpen);
    });
    const dock = await screen.findByRole("region", { name: "Table" });
    await userEvent.click(within(dock).getByRole("button", { name: "Maximize table" }));
    const config = await within(dock).findByRole("complementary", { name: "Table configuration" });
    return { store, session, dock, config, list: within(config).getByRole("list", { name: "Issues" }) };
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
        await waitFor(() => {
            assert.lengthOf(session.data.issues(), ISSUES.length);
            assert.isTrue(store.get().dockOpen);
        });
        // The files drew: issues that do not stop the drawing leave the dock docked.
        assert.isFalse(store.get().dockMaximized);
        const dock = await screen.findByRole("region", { name: "Table" });
        // The loaded key columns are the keys: no made-up Id, From or To.
        await waitFor(() => {
            assert.strictEqual(headerNames("Nodes")[0], "account");
        });
        assert.notInclude(headerNames("Nodes"), "Id");

        // The toggle keeps one name, pressed or not.
        const maximize = within(dock).getByRole("button", { name: "Maximize table" });
        assert.strictEqual(maximize.getAttribute("aria-pressed"), "false");
        await userEvent.click(maximize);
        await waitFor(() => {
            assert.isTrue(store.get().dockMaximized);
        });
        assert.strictEqual(
            within(dock).getByRole("button", { name: "Maximize table" }).getAttribute("aria-pressed"),
            "true",
        );
        // Under the maximized table the canvas takes no input.
        assert.isTrue(document.querySelector<HTMLElement>(".ws-canvas")?.inert);

        // Maximized: the Issues list beside the table; Sources, Fields and Filters once, in the
        // Data place on the left.
        const config = await within(dock).findByRole("complementary", { name: "Table configuration" });
        assert.isNull(within(config).queryByRole("list", { name: "Sources" }));
        const left = screen.getByRole("complementary", { name: "Left panel" });
        assert.lengthOf(screen.getAllByRole("list", { name: "Sources" }), 1);
        within(left).getByRole("list", { name: "Sources" });
        const list = within(config).getByRole("list", { name: "Issues" });
        for (const { label, tab } of ISSUES) {
            const item = within(list).getByText(label).closest("li");
            assert.isNotNull(item);
            // Each row names its table with a node or edge chip.
            assert.strictEqual(
                item?.querySelector(".cm-entity-chip")?.getAttribute("data-kind"),
                tab === "Nodes" ? "node" : "edge",
            );
            within(list).getByRole("button", { name: `Ignore ${label}` });
        }
        // The fix the data already shows is pressed: the made nodes are kept.
        assert.strictEqual(
            within(list).getByRole("button", { name: "Add nodes: 18 unknown ends" }).getAttribute("aria-pressed"),
            "true",
        );

        // Every issue is in its header: the warning's hover lists it with its buttons, and the
        // header's menu offers the same fixes and Ignore for the keyboard.
        for (const tab of ["Nodes", "Edges"] as const) {
            await userEvent.click(within(dock).getByRole("tab", { name: tab }));
            for (const issue of ISSUES.filter((each) => each.tab === tab)) {
                const cell = await waitFor(() => headerCell(issue.header));
                // Without hovering, a screen reader hears each issue as the warning's description.
                const warning = within(cell).getByRole("img", { name: `Issues in ${issue.header}` });
                const description = document.getElementById(warning.getAttribute("aria-describedby") ?? "");
                assert.include(description?.textContent, issue.label);
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
    });

    it("fixes, ignores, hides and filters from the maximized table's headers and Issues list", async () => {
        const { store, session, dock, config, list } = await openMaximized();
        await userEvent.click(within(dock).getByRole("tab", { name: "Edges" }));

        // A fix from the header's hover: the "N/A" becomes blank, and the issue goes.
        const amount = headerCell("amount");
        await userEvent.hover(within(amount).getByRole("img", { name: "Issues in amount" }));
        const amountHover = await screen.findByRole("list", { name: "Issues in amount" });
        await userEvent.click(within(amountHover).getByRole("button", { name: "Make blank: 1 not a number" }));
        await waitFor(() => {
            assert.isUndefined(session.data.issues().find((issue) => issue.code === "not-a-number"));
        });
        await userEvent.unhover(within(amount).getByRole("img", { name: "Issues in amount" }));
        // The fixed issue is listed under Resolved, with the fix that settled it.
        await userEvent.click(await within(config).findByRole("button", { name: "Resolved 1" }));
        const resolved = within(config).getByRole("list", { name: "Resolved" });
        within(resolved).getByRole("button", { name: "Make blank: 1 not a number" });

        // Ignore in the list: the issue leaves the list and the headers, and the toggle brings it back.
        await userEvent.click(within(list).getByRole("button", { name: "Ignore 5 repeated edges" }));
        await waitFor(() => {
            assert.isUndefined(session.data.issues().find((issue) => issue.code === "repeated-edge"));
            assert.isTrue(
                session.data.issues({ includeIgnored: true }).some((issue) => issue.code === "repeated-edge"),
            );
        });
        assert.isNull(within(list).queryByText("5 repeated edges"));
        await userEvent.click(within(config).getByRole("button", { name: "Ignored 1" }));
        await within(list).findByRole("button", { name: "Restore 5 repeated edges" });

        // The body holds records only: every control of the grid is in its header row.
        const grid = screen.getByRole("grid", { name: "Edges" });
        const [, ...bodyRows] = within(grid).getAllByRole("row");
        assert.isAbove(bodyRows.length, 0);
        for (const row of bodyRows) {
            assert.lengthOf(within(row).queryAllByRole("button"), 0);
        }

        // Hide others on holder leaves one column; Unhide brings one back, then all the rest.
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
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Unhide" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "opened" }));
        await waitFor(() => {
            assert.deepEqual(headerNames("Nodes"), ["holder", "opened"]);
        });
        await userEvent.click(within(headerCell("holder")).getByRole("button", { name: "Options for holder" }));
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Unhide" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Unhide all" }));
        await waitFor(() => {
            assert.deepEqual(headerNames("Nodes"), before);
        });

        // A filter narrows the table to the shown nodes; All lists every node again.
        const { total } = session.data.nodePage({ limit: 0 });
        await session.visibility.set({ kind: "categories", attribute: "data.flagged", values: ["yes"] });
        const shown = session.visibility.summary.visibleNodes;
        assert.isBelow(shown, total);
        // Tier 3's count words while a filter hides some: "100 of 412 nodes".
        await within(dock).findByText(`${shown.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} nodes`);
        await userEvent.click(within(dock).getByText("All"));
        await within(dock).findByText(`${total.toLocaleString("en-US")} nodes`);
        await session.visibility.set(null);

        // Esc minimizes back to the dock, and the drawing shows again.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(store.get().dockMaximized);
        });
        assert.isNull(within(dock).queryByRole("complementary", { name: "Table configuration" }));
        assert.isFalse(document.querySelector<HTMLElement>(".ws-canvas")?.inert);
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
        await waitFor(() => {
            assert.isTrue(store.get().dockOpen);
        });
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
