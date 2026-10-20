/**
 * Selecting or making a layer shows the layer list, on the REAL graphty-element with real clicks:
 * a run started from Analyze while the Data place is open, and a group opened from a node's
 * Memberships there, both switch the left panel to the Graph place, with the new folder or the
 * selected group layer in the tree.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables in the workspace, open on the Data place.
 * @returns The session and the store.
 */
async function openOnData(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.styles.settled();
    assert.equal(store.get().place, "data");
    return { session, store };
}

/**
 * The left panel's layer list, once it shows.
 * @returns the tree.
 */
async function layerList(): Promise<HTMLElement> {
    const left = screen.getByRole("complementary", { name: "Left panel" });
    return within(left).findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
}

describe("selecting or making a layer from the Data place", () => {
    it("shows the run's new folder after a run from Analyze", async () => {
        const { session, store } = await openOnData();
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Louvain");
        await userEvent.click(await screen.findByRole("option", { name: /^Louvain/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
        await waitFor(
            () => {
                assert.equal(session.runs.list().find((r) => r.algorithm === "louvain")?.status, "succeeded");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(store.get().place, "graph");
        await within(await layerList()).findByRole("treeitem", { name: /^Louvain, folder, \d+ layers$/ });
    });

    it("shows the selected group layer after a Memberships group button", async () => {
        const { session, store } = await openOnData();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        // The run showed the layer list; the reader goes back to Data before opening a group.
        const rail = screen.getByRole("toolbar", { name: "Places" });
        await userEvent.click(within(rail).getByRole("button", { name: /^Data/ }));
        await waitFor(() => {
            assert.equal(store.get().place, "data");
        });
        const valjean = String(session.data.nodes().find((n) => n.name === "Valjean")?.id);
        await act(async () => {
            await session.selection.apply({ nodes: [valjean] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }, { timeout: TIMEOUT_MS }));
        const memberships = await screen.findByRole("heading", { name: "Memberships" });
        const section = memberships.closest("section") ?? document.body;
        await userEvent.click(within(section).getByRole("button", { name: /^Louvain/ }));
        await waitFor(() => {
            assert.equal(store.get().inspected?.kind, "layer-row");
            assert.equal(store.get().place, "graph");
        });
        const id = store.get().inspected?.id ?? "";
        const row = (await layerList()).querySelector<HTMLElement>(`.cm-tree-row[data-id="${CSS.escape(id)}"]`);
        assert.isNotNull(row, "the group's layer row is in the list");
        assert.equal(row?.getAttribute("aria-selected"), "true");
    });
});
