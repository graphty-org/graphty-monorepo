/**
 * A reload of this tab puts back what the reader was in the middle of: an open dialog with what it
 * opened on (issue #9659), a note being written (issue #9661) and a name being edited in place
 * (issue #9662). Safari ends a background tab and loads it again, often with its session storage
 * emptied, so each case runs with that storage kept and with it emptied. Real element, real
 * autosave, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { screen, waitFor, within } from "../../../test/test-utils";

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

/**
 * The opened element's session.
 * @returns it.
 */
async function sessionNow(): Promise<GraphSession> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(found);
        return found;
    });
}

/** Opens Add filter in the Data place and picks Degree from 5, leaving its workspace open. */
async function newDegreeFilter(): Promise<void> {
    await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
    await userEvent.click(page.getByRole("button", { name: "Add filter", exact: true }));
    // The value picker opens on a new card's arrival, or from its empty Value.
    const empty = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]");
        assert.isNotNull(found, "the new card's Value");
        return found;
    });
    if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
        await userEvent.click(empty);
    }
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard("Degree{Enter}");
    const from = page.getByRole("textbox", { name: "Degree from, number", exact: true });
    await userEvent.clear(from);
    await userEvent.type(from, "5{Enter}");
    await screen.findAllByRole("region", { name: "A, 41 of 77 nodes" });
}

describe.each([{ lostSession: false }, { lostSession: true }])(
    "what the reader was in the middle of, across a reload (session storage emptied: $lostSession)",
    ({ lostSession }) => {
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(forget);
        afterEach(forget);

        it("reopens the Export dialog on the table it opened on (issue #9659)", async () => {
            const before = await openAutosaved("Les Miserables");
            await userEvent.click(page.getByRole("button", { name: "Table", exact: true }));
            const dock = await screen.findByRole("region", { name: "Table" });
            await userEvent.click(page.elementLocator(dock).getByRole("tab", { name: /^Edges/ }));
            await userEvent.keyboard("{Control>}e{/Control}");
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            assert.strictEqual(
                within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Table" }).value,
                "Edges",
            );

            const after = await reload(before, { lostSession });
            const back = await screen.findByRole("dialog", { name: "Export" });
            await waitFor(() => {
                assert.strictEqual(
                    within(back).getByRole<HTMLInputElement>("combobox", { name: "Table" }).value,
                    "Edges",
                );
            });
            after.view.unmount();
        });

        it("brings back a note being written about an edge, which then saves about that edge (issue #9661)", async () => {
            const before = await openAutosaved("Les Miserables");
            const session = await sessionNow();
            const [edge] = session.data.edges();
            assert.isDefined(edge);
            await session.selection.apply({ edges: [edge.id] });
            (document.activeElement as HTMLElement | null)?.blur();
            await userEvent.keyboard("n");
            const field = page.getByRole("textbox", { name: "Note", exact: true });
            await userEvent.type(field, "Check this tie");
            const about = (): string => document.querySelector(".nt-editor")?.textContent ?? "";
            const chips = about();

            const after = await reload(before, { lostSession });
            await waitFor(() => {
                assert.strictEqual(
                    screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Note" }).value,
                    "Check this tie",
                );
                assert.strictEqual(about(), chips, "the note is still about the same edge");
            });
            const reopened = await sessionNow();
            await userEvent.click(page.getByRole("button", { name: "Save note", exact: true }));
            await waitFor(() => {
                const [note] = reopened.notes.list();
                assert.isDefined(note);
                const target = note.targets[0] as { edge: { source: unknown; target: unknown } };
                // Its ends, in either order: the sample's edges are undirected.
                assert.sameMembers([target.edge.source, target.edge.target], [edge.source, edge.target]);
            });
            after.view.unmount();
        });

        it("reopens the project name being edited (issue #9662)", async () => {
            const before = await openAutosaved("Les Miserables");
            await userEvent.click(page.getByRole("button", { name: /^Project: / }));
            await screen.findByRole("textbox", { name: "Project name" });

            const after = await reload(before, { lostSession });
            await screen.findByRole("textbox", { name: "Project name" });
            after.view.unmount();
        });

        it("reopens a style layer's name being edited (issue #9662)", async () => {
            const before = await openAutosaved("Les Miserables");
            const session = await sessionNow();
            await session.styles.add({
                name: "Busy",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#d55e00" },
            });
            await session.styles.settled();
            const tree = await screen.findByRole("tree", { name: "Style layers" });
            await userEvent.click(page.elementLocator(tree).getByRole("treeitem", { name: /^Busy, / }));
            await userEvent.keyboard("{F2}");
            await screen.findByRole("textbox", { name: "Layer name" });

            const after = await reload(before, { lostSession });
            const box = await screen.findByRole<HTMLInputElement>("textbox", { name: "Layer name" });
            assert.strictEqual(box.value, "Busy");
            after.view.unmount();
        });

        it("reopens a new filter's name being edited in its workspace (issue #9662)", async () => {
            const before = await openAutosaved("Les Miserables");
            await newDegreeFilter();
            const ws = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(ws);
            await userEvent.click(page.elementLocator(ws).getByRole("button", { name: /, rename$/ }));
            await within(ws).findByRole("textbox", { name: /^Rename / });

            const after = await reload(before, { lostSession });
            await waitFor(() => {
                const back = document.querySelector<HTMLElement>(".sel-ws");
                assert.isNotNull(back, "the workspace is open");
                within(back).getByRole("textbox", { name: /^Rename / });
            });
            after.view.unmount();
        });

        it("reopens a filter card's name being edited in the Filters list (issue #9662)", async () => {
            const before = await openAutosaved("Les Miserables");
            const session = await sessionNow();
            await newDegreeFilter();
            const ws = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(ws);
            await userEvent.click(page.elementLocator(ws).getByRole("button", { name: /^Done/ }));
            await waitFor(() => {
                assert.lengthOf(session.visibility.conditions, 1, "Done writes the filter");
                assert.isNull(document.querySelector(".sel-ws"), "the workspace is closed");
            });
            await userEvent.click(page.getByRole("button", { name: "More", exact: true }));
            await userEvent.click(page.getByRole("menuitem", { name: /^Rename/ }));
            await screen.findByRole("textbox", { name: /^Rename / });

            const after = await reload(before, { lostSession });
            await screen.findByRole("textbox", { name: /^Rename / });
            after.view.unmount();
        });
    },
);
