/**
 * The inspector and the table on the REAL graphty-element, with real clicks: the table's key
 * column names each row and the table opens about ten rows tall; a selection's Summary lists a
 * column only some nodes fill; a node's Degree row says it changes the selection and the change is
 * spoken; a membership opens its group with the group's layer shown and marked in the style tree.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { DEGREE_ROW_WORDS } from "../words";

/**
 * The workspace at 1440 x 900, once the element is up.
 * @returns The store and the session.
 */
async function openWorkspace(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { store, session };
}

describe("the inspector and the table", () => {
    it("names each table row by its id, opens about ten rows tall, and sums up a partly filled column", async () => {
        const { session } = await openWorkspace();
        await session.data.addNodes(
            Array.from({ length: 15 }, (_, i) => ({
                id: `n${String(i + 1)}`,
                ...(i < 6 ? { email: `person${String(i + 1)}@example.org` } : {}),
            })),
        );

        await userEvent.keyboard("{Shift>}T{/Shift}");
        const grid = await screen.findByRole("grid", { name: "Nodes" });
        const box = grid.getBoundingClientRect();
        await waitFor(() => {
            const rows = within(grid)
                .getAllByTestId("data-table-row")
                .filter((row) => row.getBoundingClientRect().bottom <= box.bottom);
            assert.isAtLeast(rows.length, 10, "about ten rows show when the table opens");
        });
        const first = within(grid).getAllByTestId("data-table-row")[0];
        const header = within(first).getByRole("rowheader");
        assert.equal(header.textContent, "n1", "the id names its row");

        // Every node selected: email, which 6 of the 15 hold, each a different value, has its row.
        await session.selection.apply({ nodes: session.data.nodePage({ limit: 100 }).records.map((r) => r.id) });
        const values = await screen.findByRole("tab", { name: "Values" });
        await userEvent.click(values);
        await waitFor(() => {
            const email = screen.getByRole("group", { name: "email" });
            assert.include(email.textContent ?? "", "6 of 15 have a value");
        });
    });

    it("opens the table with Shift+T while the pointer rests on an info circle", async () => {
        const { session } = await openWorkspace();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);

        // The pointer on the Degree section's circled "i" shows its explanation bubble.
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        await userEvent.hover(await screen.findByRole("button", { name: "About Degree" }));
        await screen.findByRole("dialog", { name: "About Degree" });

        // A hover bubble holds no keys of its own, so the page's shortcuts still run.
        await userEvent.keyboard("{Shift>}T{/Shift}");
        await screen.findByRole("grid", { name: "Nodes" });
    });

    it("says what the Degree row does, speaks its change, and shows a membership's layer in the tree", async () => {
        const { store, session } = await openWorkspace();
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        const valjean = session.data
            .nodePage({ limit: 100 })
            .records.find((r) => session.data.name(r.id) === "Valjean")?.id;
        assert.isDefined(valjean);

        // A membership opens the group; the tree opens the Louvain folder to the group's layer and marks it.
        await session.selection.apply({ nodes: [valjean] });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        const memberships = await screen.findByRole("heading", { name: "Memberships" });
        const section = memberships.closest("section") ?? document.body;
        await userEvent.click(within(section).getByRole("button", { name: /^Louvain/ }));
        const tree = screen.getByRole("tree", { name: "Style layers" });
        await waitFor(() => {
            const folder = within(tree).getByRole("treeitem", { name: /^Louvain, folder/ });
            assert.equal(folder.getAttribute("aria-expanded"), "true");
            const marked = within(tree)
                .getAllByRole("treeitem")
                .filter((row) => row.getAttribute("aria-selected") === "true");
            assert.lengthOf(marked, 1);
            // The group's own layer, inside the folder.
            assert.equal(marked[0].getAttribute("aria-level"), "2");
            assert.match(marked[0].getAttribute("aria-label") ?? "", /node layer/);
        });

        // Back on Valjean: the Degree row says it changes the selection, and the change is spoken.
        await session.selection.apply({ nodes: [valjean] });
        store.set({ inspected: null });
        const degree = await screen.findByRole("button", { name: /^Degree/ });
        assert.equal(degree.getAttribute("aria-description"), DEGREE_ROW_WORDS);
        await userEvent.click(degree);
        await waitFor(() => {
            assert.match(store.get().announcement ?? "", /^Valjean and \d+ connections$/);
        });
    });
});
