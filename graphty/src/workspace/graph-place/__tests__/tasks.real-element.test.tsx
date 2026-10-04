/**
 * The Graph place on the REAL graphty-element, from the empty app: task T12's find (typing a name
 * that differs from the id fills the list before Enter; a pick selects the node and opens it in
 * the inspector, by mouse and by keyboard alone), and the paint tree after runs (a run row lands
 * on top, its eye switches its layers off and on as one undo step, Delete removes it with Undo).
 * Every assertion reads what the element reports or what the page shows, never canvas pixels.
 *
 * The graph goes in through the element's session: loading a file is the Start screen's and the
 * Data page's, and the karate sample has no names to find by.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Numeric ids, as karate's are, with names that differ from them. */
const NAMES = ["Mr Hi", "Officer", "Ada", "Bea", "Cy", "Dot", "Eve", "Flo", "Gus", "Hal"];
const NODES = NAMES.map((name, i) => ({ id: i + 1, name, club: i < 5 ? "Mr Hi" : "Officer" }));
const EDGES = [
    ...[1, 2, 3, 4, 5].map((n) => ({ source: n, target: (n % 5) + 1 })),
    ...[6, 7, 8, 9, 10].map((n) => ({ source: n, target: ((n - 5) % 5) + 6 })),
    { source: 1, target: 2 },
    { source: 2, target: 6 },
];

/**
 * From the empty app: New project, then the graph added through the element's session.
 * @returns the session and the chrome store.
 */
async function openGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    await userEvent.click(screen.getByRole("button", { name: "New project" }));
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
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return { session, store };
}

/**
 * The paint tree's rows, top first, by name.
 * @returns the names.
 */
function treeRows(): string[] {
    const tree = screen.getByRole("tree", { name: "Paint tree" });
    return within(tree)
        .getAllByRole("treeitem")
        .map((row) => row.getAttribute("aria-label") ?? "");
}

describe("the Graph place on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "finds a node by a name that differs from its id while typing, and a pick selects and inspects it (T12)",
        async () => {
            const { session, store } = await openGraph();

            const box = screen.getByRole("combobox", { name: "Find" });
            await userEvent.type(box, "offic");
            // The list fills while typing, before any Enter, and nothing is selected yet.
            const list = await screen.findByRole("listbox", { name: "Find results" });
            const hit = within(list).getByRole("option", { name: /name: Officer/ });
            assert.isNotNull(hit);
            assert.equal(session.selection.size, 0);
            assert.equal(document.activeElement, box, "focus stays in the box");

            await userEvent.click(hit);
            await waitFor(() => {
                assert.isTrue(session.selection.has(2));
            });
            assert.isNull(store.get().inspected, "the inspector shows what is selected");
            assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "finds and picks with the keyboard alone: / focuses, Down enters the list, Enter picks (T12)",
        async () => {
            const { session, store } = await openGraph();

            (document.activeElement as HTMLElement | null)?.blur();
            await userEvent.keyboard("/");
            const box = screen.getByRole("combobox", { name: "Find" });
            await waitFor(() => {
                assert.equal(document.activeElement, box);
            });
            await userEvent.keyboard("Eve");
            await screen.findByRole("listbox", { name: "Find results" });
            await userEvent.keyboard("{ArrowDown}");
            const active = box.getAttribute("aria-activedescendant");
            assert.isNotNull(active);
            assert.match(document.getElementById(active ?? "")?.textContent ?? "", /Eve/);
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.isTrue(session.selection.has(7));
            });
            assert.isNull(store.get().inspected, "the inspector shows what is selected");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "says when nothing matches, and offers the value rows",
        async () => {
            await openGraph();
            const box = screen.getByRole("combobox", { name: "Find" });

            await userEvent.type(box, "zzz");
            assert.isNotNull(await screen.findByText('No match for "zzz"'));

            await userEvent.clear(box);
            await userEvent.type(box, "Mr Hi");
            const list = await screen.findByRole("listbox", { name: "Find results" });
            const values = within(list).getByRole("group", { name: "Values" });
            assert.isNotNull(within(values).getByRole("option", { name: "Select where club is Mr Hi (5)" }));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "lists a run on top under Selection, hides and shows its paint as one undo step, and deletes it with Undo",
        async () => {
            const { session, store } = await openGraph();
            assert.deepEqual(treeRows(), ["Selection", "Everything"]);
            assert.isNotNull(screen.getByText(/to add results here/));

            await session.runs.start("pagerank");
            const run = session.runs.list()[0];
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", run.label, "Everything"]);
            });
            assert.isNull(screen.queryByText(/to add results here/), "the footer has nothing to say once a run exists");
            const layerIds = session.runs.bindings(run.id);
            assert.isNotEmpty(layerIds, "the run painted");

            // The eye: every layer of the run off, then one undo brings them all back.
            await userEvent.click(screen.getByRole("button", { name: `Hide ${run.label}` }));
            await waitFor(() => {
                assert.isTrue(layerIds.every((id) => session.styles.get(id)?.enabled === false));
            });
            await session.undo();
            await waitFor(() => {
                assert.isTrue(layerIds.every((id) => session.styles.get(id)?.enabled === true));
            });

            // Space on the focused row toggles the eye too.
            const row = screen.getByRole("treeitem", { name: run.label });
            await userEvent.click(row);
            assert.deepEqual(store.get().inspected, { kind: "measure-row", id: run.id });
            await userEvent.keyboard(" ");
            await waitFor(() => {
                assert.isTrue(layerIds.every((id) => session.styles.get(id)?.enabled === false));
            });

            // Delete, with an Undo notice.
            await userEvent.keyboard("{Delete}");
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", "Everything"]);
            });
            assert.equal(store.get().notice?.message, `Deleted ${run.label}.`);
            store.get().notice?.action?.run();
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", run.label, "Everything"]);
            });
            assert.isNull(store.get().notice, "the notice goes once its delete is undone");

            // Once another change is made, the notice goes: its Undo would take back that change.
            const row2 = screen.getByRole("treeitem", { name: run.label });
            await userEvent.click(row2);
            await userEvent.keyboard("{Delete}");
            await waitFor(() => {
                assert.isNotNull(store.get().notice);
            });
            await session.data.addNodes([{ id: 99, name: "Zed" }]);
            await waitFor(() => {
                assert.isNull(store.get().notice);
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "draws a group run with its groups as children, each with the size the element reports",
        async () => {
            const { session } = await openGraph();

            await session.runs.start("louvain");
            const run = session.runs.list()[0];
            const groups = run.record.summary?.groups ?? [];
            assert.isNotEmpty(groups);
            const groupCount = run.result?.graph.groupCount;
            assert.isNumber(groupCount);
            await waitFor(() => {
                assert.include(treeRows(), run.label);
            });
            const tree = screen.getByRole("tree", { name: "Paint tree" });
            const parent = within(tree).getByRole("treeitem", { name: run.label });
            assert.equal(parent.getAttribute("aria-expanded"), "true", "few groups open by default");
            assert.include(parent.textContent, String(groupCount), "the count is the one the run publishes");
            for (const group of groups) {
                const child = within(tree).getByRole("treeitem", { name: group.name ?? String(group.group) });
                assert.include(child.textContent, String(group.size));
            }
        },
        TIMEOUT_MS * 2,
    );
});
