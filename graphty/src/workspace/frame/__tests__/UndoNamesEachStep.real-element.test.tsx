/**
 * The Undo button on the REAL graphty-element names each kind of step it would take back: a kept
 * set's changes, hiding and showing nodes, showing hidden nodes faintly, pinning and releasing
 * nodes, laying out part or all of the graph, and a result's rename. Each step runs through the
 * session; the test reads the Undo button's name, which is what its tooltip shows.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, NodeId } from "@graphty/graphty-element/session";
import { assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { GRAPH_FILE_GML } from "../../data-place/fixtures";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Renders the workspace, waits for the session and loads the small graph file (8 nodes, 9 edges).
 * @returns the session, the chrome store and the first two node ids.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore; ids: NodeId[] }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    const ids = session.data
        .nodes()
        .slice(0, 2)
        .map((node) => node.id);
    return { session, store, ids };
}

/** The Undo button's name as the test last read it, so the next read waits for the next step. */
let lastName = "";

/**
 * Waits until the Undo button names a new step, then checks it names this one.
 * @param words - what follows "Undo".
 * @returns the button.
 */
async function undoNamed(words: string): Promise<HTMLElement> {
    const undo = await waitFor(() => {
        const button = screen.getByRole("button", { name: /^Undo( |$)/ });
        assert.notEqual(button.getAttribute("aria-label") ?? "", lastName);
        return button;
    });
    lastName = undo.getAttribute("aria-label") ?? "";
    assert.equal(lastName, `Undo ${words}`);
    return undo;
}

describe("the Undo button names each kind of step", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });
    beforeEach(() => {
        lastName = "";
    });

    it("names a kept set's rename, change, members and removal", async () => {
        const { session, store, ids } = await openWithGraph();
        const set = session.sets.create({ kind: "fixed", nodes: ids, reading: "induced" }, { name: "Friends" });
        await undoNamed("creating Friends");

        session.sets.rename(set, "Allies");
        await undoNamed("renaming Friends");

        session.sets.redefine(set, { kind: "fixed", nodes: ids.slice(0, 1), reading: "induced" });
        await undoNamed("changing Allies");

        session.sets.addMembers(set, { nodes: ids.slice(1) });
        await undoNamed("changing the members of Allies");

        session.sets.remove(set);
        const undo = await undoNamed("deleting Allies");

        // Undo says what it took back on the status line.
        await userEvent.click(undo);
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Undid deleting Allies");
        });
    });

    it("names hiding and showing nodes, showing hidden nodes faintly, pins and the layout's scope", async () => {
        const { session, ids } = await openWithGraph();
        await session.execute({ op: "visibility.hide", ids, hidden: true });
        await undoNamed("hiding 2 nodes");

        await session.execute({ op: "visibility.hide", ids: ids.slice(0, 1), hidden: false });
        await undoNamed("showing 1 node");

        await session.execute({ op: "visibility.context", show: true });
        await undoNamed("showing context");

        await session.execute({ op: "visibility.context", show: false });
        await undoNamed("hiding context");

        await session.execute({ op: "positions.pin", ids, pinned: true });
        await undoNamed("pinning 2 nodes");

        await session.execute({ op: "positions.pin", ids, pinned: false });
        await undoNamed("releasing 2 nodes");

        await session.execute({ op: "layout.scope", scope: { nodes: ids } });
        await undoNamed("laying out part of the graph");

        await session.execute({ op: "layout.scope", scope: "graph" });
        await undoNamed("laying out the whole graph");
    });

    it("names a result's rename by the result's row", async () => {
        const { session } = await openWithGraph();
        const run = session.runs.start("degree");
        await run;
        await session.runs.rename(run.id, "Ties");
        // The step is named by the result's row, which keeps the method's name.
        await undoNamed("renaming Degree");
    });
});
