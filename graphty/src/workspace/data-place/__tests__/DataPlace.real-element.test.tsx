/**
 * The Data place's left sidebar on the REAL graphty-element: Sources rows with node and edge
 * chips and their menu, the Fields dropdowns (each change one undo step the element records), the
 * kinds of an event table's two ends, and the Data source condition that appears with a second
 * source. Every change is made by real input; every assertion reads the element or what is drawn.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { AUTH_LOG_CSV, HOSTS_CSV } from "../fixtures";

/**
 * Renders the workspace on the Data place with a project open and waits for the session.
 * @returns the session.
 */
async function openDataPlace(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Auth", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
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
 * Queries inside the Data place: a maximized table dock shows another Sources list and Fields
 * section beside the table.
 * @returns the queries.
 */
const place = (): ReturnType<typeof within> => within(screen.getByRole("region", { name: "Data place" }));

/**
 * The Data place's Fields section.
 * @returns the section.
 */
const fieldsGroup = (): HTMLElement => place().getByRole("group", { name: "Fields" });

/**
 * Picks an option of a Fields dropdown by clicking it open and clicking the option.
 * @param label - the dropdown's label.
 * @param option - the option's text.
 */
async function pick(label: string, option: string): Promise<void> {
    await userEvent.click(within(fieldsGroup()).getByRole("combobox", { name: label }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * The value a Fields dropdown shows.
 * @param label - the dropdown's label.
 * @returns its text.
 */
const shown = (label: string): string =>
    within(fieldsGroup()).getByRole<HTMLInputElement>("combobox", { name: label }).value;

/**
 * Adds a field from a side's "+" as a reader does: "+", the kind, then a column from the list that
 * opens.
 * @param side - node or edge.
 * @param kind - the kind of field, as "+" lists it.
 * @param column - the column.
 */
async function addField(side: "node" | "edge", kind: string, column: string): Promise<void> {
    await userEvent.click(within(fieldsGroup()).getByRole("button", { name: `Add to ${side} fields` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: kind }));
    await userEvent.click(await screen.findByRole("option", { name: column }));
}

/**
 * Drops the auth log, whose ends the element cannot find from its values, and reads it as edges
 * from user to host in Fields, as a reader does.
 * @param session - the session.
 */
async function loadLog(session: GraphSession): Promise<void> {
    drop(new File([AUTH_LOG_CSV], "auth-log.csv"));
    await waitFor(() => {
        assert.equal(shown("Rows are"), "edges");
    });
    await pick("Source", "user");
    await pick("Target", "host");
    await waitFor(() => {
        assert.lengthOf(session.data.edges(), 4);
        assert.equal(shown("Source"), "user");
    });
}

describe("the Data place's sidebar on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("lists a source with its chips, its special fields, and no list of other fields", async () => {
        const session = await openDataPlace();
        await loadLog(session);

        const row = await place().findByRole("listitem", { name: "auth-log.csv" });
        const [source] = session.data.sources();
        assert.include(row.textContent, `Node ${String(source.counts.nodes)}`);
        assert.include(row.textContent, `Edge ${String(source.counts.edges)}`);
        await waitFor(() => {
            assert.equal(shown("Source"), "user");
            assert.equal(shown("Target"), "host");
        });
        // The kinds of the ends are not set, so they are not listed: "+" offers them.
        assert.isNull(within(fieldsGroup()).queryByRole("combobox", { name: "Kind of source" }));
        assert.isNull(screen.queryByRole("tree", { name: "Attributes" }));
        // The section names the load it edits, and shows only that load's edge rows, under an edge chip.
        const fields = fieldsGroup();
        assert.include(fields.textContent, "auth-log.csv");
        assert.isNotNull(fields.querySelector('[data-kind="edge"]'));
        assert.isNull(fields.querySelector('[data-kind="node"]'));
        within(fields).getByRole("button", { name: "Add to edge fields" });
        assert.isNull(within(fields).queryByRole("button", { name: "Add to node fields" }));
    });

    it("reads an event table as nodes until the reader says its rows are edges, one undo step", async () => {
        const session = await openDataPlace();
        drop(new File([AUTH_LOG_CSV], "auth-log.csv"));
        await waitFor(() => {
            assert.equal(shown("Rows are"), "edges");
            assert.lengthOf(session.data.edges(), 0);
        });
        // Back to nodes: the node rows, with no ends to pick.
        await pick("Rows are", "nodes");
        await waitFor(() => {
            assert.equal(shown("Rows are"), "nodes");
            within(fieldsGroup()).getByRole("button", { name: "Add to node fields" });
        });
        assert.isNull(within(fieldsGroup()).queryByRole("combobox", { name: "Source" }));

        await pick("Rows are", "edges");
        const before = session.history.steps.length;
        await pick("Source", "user");
        // One end is held; nothing is read again yet.
        assert.lengthOf(session.data.edges(), 0);
        await pick("Target", "host");
        await waitFor(() => {
            assert.lengthOf(session.data.edges(), 4);
            assert.equal(session.history.steps.length, before + 1);
            assert.equal(shown("Rows are"), "edges");
        });

        await pick("Rows are", "nodes");
        await waitFor(() => {
            assert.lengthOf(session.data.edges(), 0);
        });
    });

    it("reads an event table as edges from two node columns' Role menus", async () => {
        const session = await openDataPlace();
        drop(new File([AUTH_LOG_CSV], "auth-log.csv"));
        const header = async (name: string): Promise<HTMLElement> => {
            const label = (await screen.findAllByTestId("data-table-header-label", {})).find(
                (each) => each.textContent === name,
            );
            const cell = label?.closest<HTMLElement>('[data-testid="data-table-header"]');
            if (cell === null || cell === undefined) {
                throw new Error(`no header ${name}`);
            }
            return cell;
        };
        for (const [column, role] of [
            ["user", "Source"],
            ["host", "Target"],
        ]) {
            await userEvent.click(within(await header(column)).getByRole("button", { name: `Options for ${column}` }));
            await userEvent.hover(await screen.findByRole("menuitem", { name: "Role" }));
            await userEvent.click(await screen.findByRole("menuitemradio", { name: role }));
        }
        await waitFor(() => {
            assert.lengthOf(session.data.edges(), 4);
        });
    });

    it("offers only number columns as the weight", async () => {
        const session = await openDataPlace();
        await loadLog(session);
        await userEvent.click(within(fieldsGroup()).getByRole("button", { name: "Add to edge fields" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Weight" }));
        const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
        assert.includeMembers(options, ["time", "bytes"]);
        assert.notInclude(options, "user");
        await userEvent.keyboard("{Escape}");
    });

    it("names a two-file drop after both files", async () => {
        const session = await openDataPlace();
        drop(
            new File([HOSTS_CSV], "hosts.csv"),
            new File(["source,target\nweb1,db1\n"], "logins.csv"),
            new File(["x"], "extra.csv"),
        );
        await screen.findByText("Not added: extra.csv", {});
        await waitFor(() => {
            assert.equal(session.data.sources()[0]?.name, "hosts.csv + logins.csv");
        });
    });

    it('adds a column as the weight from "+" and says a higher weight means farther, each one undo step', async () => {
        const session = await openDataPlace();
        await loadLog(session);
        const steps = (): number => session.history.steps.length;
        const before = steps();

        await addField("edge", "Weight", "bytes");
        await waitFor(() => {
            assert.equal(steps(), before + 1);
            assert.include(
                session.data.attributes().find((a) => a.kind === "edge" && a.name === "bytes")?.roles ?? [],
                "weight",
            );
            assert.equal(shown("Edge weight"), "bytes");
        });

        await pick("Higher weight means", "farther");
        await waitFor(() => {
            assert.equal(steps(), before + 2);
            assert.equal(session.config.data.knownFields.edgeWeightMeaning, "distance");
        });

        await session.undo();
        await session.undo();
        await waitFor(() => {
            assert.isNull(within(fieldsGroup()).queryByRole("combobox", { name: "Edge weight" }));
        });
    });

    it("gives the ends kinds by reading the load again, and splits a shared id on request", async () => {
        const session = await openDataPlace();
        await loadLog(session);
        const before = session.history.steps.length;

        await addField("edge", "Kind of source", "user");
        await waitFor(() => {
            assert.equal(session.history.steps.length, before + 1);
            assert.equal(session.data.node("alice")?.kind, "user");
            assert.equal(shown("Kind of source"), "user");
        });
        await addField("edge", "Kind of target", "host");
        // The shared-ids row appears once the load is read again with both kinds.
        await within(fieldsGroup()).findByRole("combobox", { name: "Shared ids" });
        await pick("Shared ids", "Different nodes");
        await waitFor(() => {
            assert.isDefined(session.data.node("user:admin"));
            assert.isDefined(session.data.node("host:admin"));
        });

        await session.undo();
        await waitFor(() => {
            assert.isUndefined(session.data.node("user:admin"));
            assert.isDefined(session.data.node("admin"));
        });
    });

    it("offers the Data source condition only once two sources are loaded", async () => {
        const session = await openDataPlace();
        await loadLog(session);
        // The Filters section's "+": the fields, and no Data source with one load.
        await userEvent.click(await place().findByRole("button", { name: "Add filter" }));
        await screen.findAllByRole("menuitem");
        assert.isNull(screen.queryByRole("menuitem", { name: "Data source" }));
        await userEvent.keyboard("{Escape}");

        await session.data.import({ config: { file: new File([HOSTS_CSV], "hosts.csv") } }, { mode: "merge" });
        await place().findByRole("listitem", { name: "hosts.csv" });
        await userEvent.click(place().getByRole("button", { name: "Add filter" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Data source" }));
        const card = await screen.findByRole("group", { name: "Data source values" });
        const [first] = session.data.sources();
        await userEvent.click(
            within(card).getByRole("checkbox", {
                name: new RegExp(`^auth-log\\.csv, ${String(first.counts.nodes)} nodes$`),
            }),
        );
        await waitFor(() => {
            assert.deepEqual(session.visibility.conditions[0]?.rule, { kind: "source", sources: [first.key] });
        });
    });

    it("removes a source from its row menu, and renames one in place", async () => {
        const session = await openDataPlace();
        await loadLog(session);
        const row = await place().findByRole("listitem", { name: "auth-log.csv" });

        await userEvent.hover(row);
        await userEvent.click(within(row).getByRole("button", { name: "auth-log.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
        // The field opens focused on the name.
        const input = await screen.findByRole("textbox", { name: "Source name" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, input);
        });
        await userEvent.clear(input);
        await userEvent.type(input, "logins{Enter}");
        await waitFor(() => {
            assert.equal(session.data.sources()[0]?.name, "logins");
        });

        const renamed = await place().findByRole("listitem", { name: "logins" });
        renamed.querySelector("button")?.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        await waitFor(() => {
            assert.lengthOf(session.data.sources(), 0);
        });
    });

    it("draws no chip for a count of 0, keeps the name readable, and swaps the chips for the actions on hover", async () => {
        await openDataPlace();
        const name = "a-node-table-with-a-rather-long-file-name-for-a-narrow-sidebar.csv";
        drop(new File([HOSTS_CSV], name));
        const row: HTMLElement = await place().findByRole("listitem", { name });
        // A drop takes focus to the new row.
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row.querySelector(".dp-source-main"));
        });
        assert.isNotNull(row.querySelector('[data-kind="node"]'));
        assert.isNull(row.querySelector('[data-kind="edge"]'), "no edge chip for 0 edges");
        const label = row.querySelector<HTMLElement>(".dp-source-name");
        assert.isAtLeast(label?.getBoundingClientRect().width ?? 0, 40);

        await userEvent.hover(row);
        const chips = row.querySelector<HTMLElement>(".dp-source-chips");
        const menu = within(row).getByRole("button", { name: `${name} menu` });
        await waitFor(() => {
            assert.equal(chips === null ? "" : getComputedStyle(chips).display, "none");
            assert.isAbove(menu.getBoundingClientRect().width, 0);
        });
    });

    it("selects a source's nodes from its row menu, and only picks the row on a press", async () => {
        const session = await openDataPlace();
        await loadLog(session);
        await session.data.import({ config: { file: new File([HOSTS_CSV], "hosts.csv") } }, { mode: "merge" });
        const row: HTMLElement = await place().findByRole("listitem", { name: "hosts.csv" });
        const [, hosts] = session.data.sources();

        const log: HTMLElement = place().getByRole("listitem", { name: "auth-log.csv" });
        await userEvent.click(within(log).getByRole("button", { pressed: false }));
        await waitFor(() => {
            assert.include(fieldsGroup().textContent, "auth-log.csv");
        });
        assert.lengthOf(session.selection.nodes, 0, "a press picks the row; it selects nothing");

        await userEvent.hover(row);
        await userEvent.click(within(row).getByRole("button", { name: "hosts.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Select nodes" }));
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["web1", "db1"]);
            assert.lengthOf(session.selection.nodes, hosts.counts.nodes);
        });
    });

    it("hands focus to the dialog a + menu item opens, by keyboard", async () => {
        await openDataPlace();
        const add = await place().findByRole("button", { name: "Add source" });
        add.focus();
        await userEvent.keyboard("{Enter}");
        const item = await screen.findByRole("menuitem", { name: "Samples..." });
        for (let step = 0; step < 10 && document.activeElement !== item; step++) {
            await userEvent.keyboard("{ArrowDown}");
        }
        await userEvent.keyboard("{Enter}");
        const dialog = await screen.findByRole("dialog", { name: "Samples" });
        await waitFor(() => {
            assert.isTrue(dialog.contains(document.activeElement), "focus is in the dialog");
        });
        await userEvent.keyboard("{Escape}");
    });
});
