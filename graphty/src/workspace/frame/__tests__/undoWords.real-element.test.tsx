/**
 * Undo, Redo and Clear selection on the REAL graphty-element say what they did: the Undo tooltip
 * names the step it would take back, the status line names it after, and Escape names what it
 * cleared.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { GRAPH_FILE_GML } from "../../data-place/fixtures";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace, waits for the session and loads the small graph file (8 nodes, 9 edges).
 * @returns the session and the chrome store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "names a style step in the Undo tooltip and in the status line after Undo and Redo",
        async () => {
            const { session, store } = await openWithGraph();
            const layer = await session.styles.add({
                name: "Hubs",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
            await session.styles.update(layer.id, { set: { "node.color": "#ff0000", "node.size": 3 } });

            const undo = screen.getByRole("button", { name: "Undo" });
            await userEvent.hover(undo);
            await screen.findByText("Undo changing Size on Hubs", undefined, { timeout: TIMEOUT_MS });

            await userEvent.click(undo);
            await waitFor(() => {
                assert.equal(store.get().notice?.message, "Undid changing Size on Hubs.");
            });
            await userEvent.click(screen.getByRole("button", { name: "Redo" }));
            await waitFor(() => {
                assert.equal(store.get().notice?.message, "Redid changing Size on Hubs.");
            });
            // The accessible names stay the verbs, so no two controls change names.
            assert.isNotNull(screen.queryByRole("button", { name: "Undo" }));
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "says what Escape cleared, and nothing when the selection was empty",
        async () => {
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
        },
        TIMEOUT_MS,
    );
});
