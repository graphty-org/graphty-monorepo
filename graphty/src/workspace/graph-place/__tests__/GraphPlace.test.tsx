/**
 * The Graph place over a headless graphty-element session (the element's own session, with no
 * canvas): the title line, the footer line, the find list's keyboard rules and the "/" command.
 * Runs need the element's executor, so the paint tree after a run is
 * `tasks.real-element.test.tsx`.
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry, defineRegistration, type WorkspaceRegistration } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { FIND_BOX_ID } from "../FindBox";
import { GraphPlace } from "../GraphPlace";

const sessions: GraphSession[] = [];
afterEach(() => {
    sessions.splice(0).forEach((s) => {
        s.dispose();
    });
});

/**
 * A headless session holding a small graph whose ids differ from its names.
 * @param withGraph - false for an empty graph.
 * @returns the session.
 */
async function sessionWithGraph(withGraph = true): Promise<GraphSession> {
    const session = createGraphSession();
    sessions.push(session);
    if (withGraph) {
        await session.data.addNodes([
            { id: "a", name: "Valjean", side: "law" },
            { id: "b", name: "Javert", side: "law" },
            { id: "c", name: "Cosette", side: "family" },
        ]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "a", target: "c" },
        ]);
    }
    return session;
}

/**
 * Renders the Graph place in a workspace context.
 * @param session - the session, or null before the element comes up.
 * @param registrations - the registrations; every package's by default.
 * @returns the chrome store.
 */
function renderPlace(
    session: GraphSession | null,
    registrations: readonly WorkspaceRegistration[] = REGISTRATIONS,
): WorkspaceStore {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    const value = makeWorkspaceValue(store, createRegistry(registrations), session, null);
    render(
        <WorkspaceContext.Provider value={value}>
            <GraphPlace />
        </WorkspaceContext.Provider>,
    );
    return store;
}

describe("the Graph place", () => {
    it("titles the graph with a quiet Graph prefix and its name", async () => {
        renderPlace(await sessionWithGraph());
        const place = screen.getByRole("region", { name: "Graph place" });
        assert.match(place.textContent ?? "", /^GraphLes Miserables/);
    });

    it("draws Selection and Everything only, with nothing run", async () => {
        renderPlace(await sessionWithGraph());
        const rows = within(screen.getByRole("tree", { name: "Paint tree" })).getAllByRole("treeitem");
        assert.deepEqual(
            rows.map((r) => r.getAttribute("aria-label")),
            ["Selection", "Everything"],
        );
    });

    it("says Add data to start with no graph", async () => {
        renderPlace(await sessionWithGraph(false));
        assert.isNotNull(screen.getByText("Add data to start"));
    });

    it("reads 'Analyze (Shift+A) to add results here' with a graph and nothing run, Analyze a link to the popover", async () => {
        const open = vi.fn();
        const analyze = defineRegistration({
            owner: "analyze",
            commands: [{ id: "analyze.open", label: "Analyze", group: "Analyze", keys: ["Shift+A"], run: open }],
        });
        renderPlace(await sessionWithGraph(), [...REGISTRATIONS.filter((r) => r.owner !== "analyze"), analyze]);

        const footer = screen.getByText(/to add results here/);
        assert.equal(footer.textContent, "Analyze (Shift+A) to add results here");
        await userEvent.click(within(footer).getByRole("button", { name: "Analyze" }));
        assert.equal(open.mock.calls.length, 1);
    });

    it("keeps the words but draws no link while Analyze is not built", async () => {
        renderPlace(await sessionWithGraph());
        const footer = screen.getByText(/to add results here/);
        assert.equal(footer.textContent, "Analyze (Shift+A) to add results here");
        assert.isNull(within(footer).queryByRole("button"));
    });

    it("lists matches while typing and selects nothing until a pick", async () => {
        const session = await sessionWithGraph();
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "jav");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const elements = within(list).getByRole("group", { name: "Elements" });
        assert.isNotNull(within(elements).getByRole("option", { name: /name: Javert/ }));
        assert.equal(session.selection.size, 0);
    });

    it("moves through the list with Down and Up, never past its ends, and Enter picks the active row", async () => {
        const session = await sessionWithGraph();
        const store = renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "law");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const options = within(list).getAllByRole("option");
        assert.isNull(box.getAttribute("aria-activedescendant"), "no row is active until Down");

        for (let i = 0; i < options.length + 2; i++) {
            await userEvent.keyboard("{ArrowDown}");
        }
        assert.equal(box.getAttribute("aria-activedescendant"), options[options.length - 1].id);
        for (let i = 0; i < options.length + 2; i++) {
            await userEvent.keyboard("{ArrowUp}");
        }
        assert.equal(box.getAttribute("aria-activedescendant"), options[0].id);

        await userEvent.keyboard("{ArrowDown}{Enter}");
        await waitFor(() => {
            assert.isTrue(session.selection.has("b"));
        });
        assert.isNull(store.get().inspected, "the inspector shows what is selected");
        assert.equal((box as HTMLInputElement).value, "", "a pick clears the box");
    });

    it("picks a value row, selecting every element carrying the value", async () => {
        const session = await sessionWithGraph();
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "law");
        await userEvent.click(await screen.findByRole("option", { name: "Select where side is law (2)" }));
        await waitFor(() => {
            assert.equal(session.selection.size, 2);
        });
    });

    it("keeps the list current when the data changes while the text sits in the box", async () => {
        const session = await sessionWithGraph();
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "law");
        await screen.findByRole("option", { name: "Select where side is law (2)" });
        await session.data.addNodes([{ id: "d", name: "Thenardier", side: "law" }]);
        assert.isNotNull(await screen.findByRole("option", { name: "Select where side is law (3)" }));
    });

    it("clears with Esc, then leaves the box with a second Esc", async () => {
        renderPlace(await sessionWithGraph());
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "jav");
        await screen.findByRole("listbox", { name: "Find results" });
        await userEvent.keyboard("{Escape}");
        assert.equal((box as HTMLInputElement).value, "");
        assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
        assert.equal(document.activeElement, box);

        await userEvent.keyboard("{Escape}");
        assert.notEqual(document.activeElement, box);
    });

    it("says No match for what was typed", async () => {
        renderPlace(await sessionWithGraph());
        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "zzz");
        assert.isNotNull(await screen.findByText('No match for "zzz"'));
    });

    it("runs a pattern only on Enter", async () => {
        const session = await sessionWithGraph();
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "regex:^Co");
        assert.isNotNull(await screen.findByText('Press Enter to select "regex:^Co"'));
        assert.equal(session.selection.size, 0);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isTrue(session.selection.has("c"));
        });
    });

    it("focuses the find box from the find.focus command, moving to the Graph place", async () => {
        const session = await sessionWithGraph();
        const store = renderPlace(session);
        store.set({ place: "data" });

        const registry = createRegistry(REGISTRATIONS);
        makeWorkspaceValue(store, registry, session, null).run("find.focus");
        assert.equal(store.get().place, "graph");
        await waitFor(() => {
            assert.equal(document.activeElement?.id, FIND_BOX_ID);
        });
    });
});
