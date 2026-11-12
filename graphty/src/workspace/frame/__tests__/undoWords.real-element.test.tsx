/**
 * Undo, Redo and Clear selection on the REAL graphty-element say what they did: the Undo tooltip
 * names the step it would take back, the status line names it after, and Escape names what it
 * cleared.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it, onTestFinished } from "vitest";
import { page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { render, screen, waitFor } from "../../../test/test-utils";
import { GRAPH_FILE_GML } from "../../data-place/fixtures";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Renders the workspace, waits for the session and loads the small graph file (8 nodes, 9 edges).
 * @returns the session and the chrome store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    return { session, store };
}

describe("Undo, Redo and Clear selection words", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("names a style step in the Undo tooltip and in the status line after Undo and Redo", async () => {
        const { session, store } = await openWithGraph();
        const layer = await session.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.update(layer.id, { set: { "node.color": "#ff0000", "node.size": 3 } });

        const undo = screen.getByRole("button", { name: "Undo changing node size on Hubs" });
        await userEvent.hover(undo);
        await screen.findByText("Undo changing node size on Hubs", undefined);

        await userEvent.click(undo);
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Undid changing node size on Hubs");
        });
        await userEvent.click(screen.getByRole("button", { name: /^Redo( |$)/ }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Redid changing node size on Hubs");
        });
        // The accessible name says what Undo takes back, as the tooltip does.
        assert.strictEqual(undo.getAttribute("aria-label"), "Undo changing node size on Hubs");
    });

    it("reads a step whose name ends in a question mark once, and adds no period of its own", async () => {
        const { session, store } = await openWithGraph();
        await session.transaction("Can the hubs be red?", (tx) =>
            tx.styles.add({ name: "Hubs", target: "node", selector: { match: "everything" }, set: { "node.size": 2 } }),
        );
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Undid Can the hubs be red?");
        });
    });

    it("keeps an Assistant message's Undo off the canvas while the panel is open, and still says it", async () => {
        // A site with the Assistant, so its rail button shows.
        resetSiteConfig();
        await loadSiteConfig(
            `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`,
        );
        onTestFinished(resetSiteConfig);
        const { session, store } = await openWithGraph();
        const add = (name: string): Promise<unknown> =>
            session.transaction(
                `Add ${name}.`,
                (tx) =>
                    tx.styles.add({ name, target: "node", selector: { match: "everything" }, set: { "node.size": 2 } }),
                { provenance: { message: name } },
            );
        await add("Hubs");
        await add("Rims");
        const undo = (): Promise<void> => userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));

        // Panel closed: the notice says it, with the step's own period read once.
        await undo();
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Undid Add Rims.");
        });
        store.set({ notice: null });

        // Panel open: the turn reads Undone there, so only the status line speaks.
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        await waitFor(() => {
            assert.equal(store.get().place, "assistant");
        });
        await undo();
        await waitFor(() => {
            assert.equal(store.get().announcement, "Undid Add Hubs.");
        });
        assert.isNull(store.get().notice, "no notice crosses the canvas");
        assert.isNull(screen.queryByText("Undid Add Hubs.", { selector: ".cm-toast-message" }));
    });

    it("says what Escape cleared, and nothing when the selection was empty", async () => {
        const { session, store } = await openWithGraph();
        await session.selection.apply({ where: "value > `0`" });
        const edges = session.selection.edges.length;
        assert.isAbove(edges, 0);
        assert.lengthOf(session.selection.nodes, 0);

        document.body.focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(session.selection.size, 0);
            assert.equal(store.get().notice?.message, `Selection cleared: ${String(edges)} edges`);
        });

        store.set({ notice: null });
        await userEvent.keyboard("{Escape}");
        assert.isNull(store.get().notice);
    });

    it("takes the Selection cleared notice down when a new selection is made", async () => {
        const { session, store } = await openWithGraph();
        const find = await screen.findByRole("combobox", { name: "Find" });
        await userEvent.click(find);
        await userEvent.type(find, "=value > `0`");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isAbove(session.selection.edges.length, 0);
        });
        const edges = session.selection.edges.length;
        // Focus leaves the find box for no control, as a click on bare page does. A real click
        // here has no bare page to land on: the middle of the page is the drawing, where a click
        // clears the selection itself and leaves no Selection cleared notice to read.
        find.blur();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(session.selection.size, 0);
            assert.equal(store.get().notice?.message, `Selection cleared: ${String(edges)} edges`);
        });
        // The toast, not the status line that speaks it too.
        await screen.findByText(`Selection cleared: ${String(edges)} edges`, { selector: ".cm-toast-message" });

        // The rule is still in the find box, so Enter there selects the same edges again.
        await userEvent.click(find);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(session.selection.edges.length, edges);
            assert.isNull(store.get().notice);
            assert.isNull(screen.queryByText(/^Selection cleared/, { selector: ".cm-toast-message" }));
        });
    });

    it("says what Escape cleared when the Selected row has the focus", async () => {
        const { session, store } = await openWithGraph();
        // The starting rows the app turns on for a project it opens; this one was open from the start.
        await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
        await session.selection.apply({ where: "value > `0`" });
        const edges = session.selection.edges.length;
        assert.isAbove(edges, 0);

        await userEvent.click(await screen.findByRole("treeitem", { name: /^Selected, / }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(session.selection.size, 0);
            assert.equal(store.get().notice?.message, `Selection cleared: ${String(edges)} edges`);
        });
    });
});
