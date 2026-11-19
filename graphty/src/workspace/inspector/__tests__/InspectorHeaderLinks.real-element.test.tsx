/**
 * The inspector header's links on the REAL graphty-element, followed by real clicks: a group's
 * "from" line opens the run that made it, a run's opens Analyze, the graph's opens the Data place,
 * and the count of notes about the graph opens the Notes place.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceState, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { groupKey } from "../inspected";

/** A small graph file, so the graph has a source its header names. */
const PAIRS =
    "graph [\n node [ id 1 ]\n node [ id 2 ]\n node [ id 3 ]\n node [ id 4 ]\n edge [ source 1 target 2 ]\n edge [ source 3 target 4 ]\n]\n";

/**
 * The workspace holding the graph file.
 * @returns the session and the store.
 */
async function openPairs(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Pairs", id: 1 }, inspected: null });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "pairs.gml", config: { data: PAIRS } });
    await session.styles.settled();
    return { session, store };
}

/**
 * Opens something in the inspector and finds the link in its header.
 * @param store - the store.
 * @param inspected - what to open.
 * @param name - the link's words.
 * @returns the link.
 */
async function headerLink(
    store: WorkspaceStore,
    inspected: WorkspaceState["inspected"],
    name: RegExp,
): Promise<HTMLElement> {
    act(() => {
        store.set({ inspected });
    });
    const inspector = within(await screen.findByRole("complementary", { name: "Inspector" }));
    return inspector.findByRole("button", { name });
}

describe("the inspector header's links on the real element", () => {
    it("a group's from line opens the run that made it", async () => {
        const { session, store } = await openPairs();
        const { runId } = await session.runs.start("louvain");
        await session.styles.settled();
        const group = session.runs.get(runId)?.result?.summary().groups?.[0]?.group;
        assert.isDefined(group);
        const link = await headerLink(store, { kind: "group-row", id: groupKey(runId, group ?? 0) }, /^from /);
        await userEvent.click(link);
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "run-row", id: runId });
        });
    });

    it("a run's from line opens Analyze", async () => {
        const { session, store } = await openPairs();
        const { runId } = await session.runs.start("degree");
        await session.styles.settled();
        const link = await headerLink(store, { kind: "measure-row", id: runId }, /^ran |^from /);
        await userEvent.click(link);
        await waitFor(() => {
            assert.equal(store.get().dialog, "analyze");
        });
    });

    it("the graph's from line opens the Data place", async () => {
        const { store } = await openPairs();
        const link = await headerLink(store, null, /pairs/i);
        await userEvent.click(link);
        await waitFor(() => {
            assert.equal(store.get().place, "data");
        });
        assert.equal(store.get().page, "panels");
    });

    it("the count of notes about the graph opens the Notes place", async () => {
        const { session, store } = await openPairs();
        act(() => {
            session.notes.add({ text: "Two pairs, never met", targets: [{ graph: true }] });
        });
        const link = await headerLink(store, null, /^1 note$/);
        await userEvent.click(link);
        await waitFor(() => {
            assert.equal(store.get().place, "notes");
        });
    });
});
