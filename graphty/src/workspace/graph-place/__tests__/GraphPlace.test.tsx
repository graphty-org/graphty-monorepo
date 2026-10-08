/**
 * The Graph place over a headless graphty-element session (the element's own session, with no
 * canvas): the title line, the footer line, the find list's keyboard rules and the "/" command.
 * Runs need the element's executor, so the paint tree after a run is
 * `tasks.real-element.test.tsx`.
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry, type WorkspaceRegistration } from "../../commands/registry";
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

    it("reads 'Analyze in the toolbar (Shift+A) to add results here' with a graph and nothing run, as a hint and not a second Analyze control", async () => {
        renderPlace(await sessionWithGraph());

        const footer = screen.getByText(/to add results here/);
        assert.equal(footer.textContent?.replace(/\s+/g, " "), "Analyze in the toolbar (Shift+A) to add results here");
        assert.isNull(within(footer).queryByRole("button"));
        // The toolbar button's glyph, for a touch reader who sees no tooltip and has no key.
        assert.isNotNull(footer.querySelector("svg[aria-hidden='true']"));
    });

    it("lists matches while typing and selects nothing until a pick", async () => {
        const session = await sessionWithGraph();
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "jav");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const elements = within(list).getByRole("group", { name: "Nodes" });
        assert.isNotNull(within(elements).getByRole("option", { name: /name: Javert/ }));
        assert.equal(session.selection.size, 0);
    });

    for (const [directed, name] of [
        [true, "Station -> Stadium"],
        [false, "Station -- Stadium"],
    ] as const) {
        it(`names an edge hit "${name}" on ${directed ? "a directed" : "an undirected"} graph, as the inspector does`, async () => {
            const session = createGraphSession();
            sessions.push(session);
            await session.config.set({ data: { directed } });
            await session.data.addNodes([{ id: "Station" }, { id: "Stadium" }]);
            await session.data.addEdges([{ source: "Station", target: "Stadium", line: "tram" }]);
            renderPlace(session);

            await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "tram");
            const list = await screen.findByRole("listbox", { name: "Find results" });
            assert.isNotNull(within(list).getByRole("option", { name: new RegExp(`^${name}`) }));
        });

        it(`finds an edge by its name "${name}" or by either end's name`, async () => {
            const session = createGraphSession();
            sessions.push(session);
            await session.config.set({ data: { directed } });
            await session.data.addNodes([{ id: "Station" }, { id: "Stadium" }]);
            await session.data.addEdges([{ source: "Station", target: "Stadium" }]);
            renderPlace(session);
            const box = screen.getByRole("combobox", { name: "Find" });

            for (const typed of [name, "Stadium"]) {
                await userEvent.clear(box);
                await userEvent.type(box, typed);
                const list = await screen.findByRole("listbox", { name: "Find results" });
                assert.isNotNull(within(list).getByRole("option", { name }), typed);
            }
        });
    }

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

    it("checks a rule while typing: a bare number is refused before Enter, a lone = is not approved", async () => {
        const session = await sessionWithGraph();
        await session.data.addEdges([{ source: "b", target: "c", minutes: 12 }]);
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "=");
        const hint = await screen.findByText("Type a rule, such as minutes > `12`");
        // The theme's field hint (11px, secondary ink), not a 9px caption.
        assert.isTrue(hint.classList.contains("cm-field-description"));
        assert.equal(getComputedStyle(hint).fontSize, "11px");
        assert.isNull(screen.queryByText("Rule: press Enter to select matches"));

        await userEvent.type(box, "minutes >= 10");
        assert.isNotNull(await screen.findByText("Put numbers in backticks: minutes > `12`"));
        assert.isNull(screen.queryByText("Rule: press Enter to select matches"));
        assert.equal(session.selection.size, 0);

        await userEvent.clear(box);
        await userEvent.type(box, "=minutes >= `10`");
        assert.isNotNull(await screen.findByText("Rule: press Enter to select matches"));
        assert.isNull(screen.queryByRole("alert"));
    });

    it("offers the columns that hold the word typed after =, and picking one puts it in the box", async () => {
        const session = await sessionWithGraph();
        await session.data.addEdges([{ source: "b", target: "c", minutes: 12 }]);
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "=min");
        const columns = within(await screen.findByRole("listbox", { name: "Find results" })).getByRole("group", {
            name: "Columns",
        });
        const option = within(columns).getByRole("option", { name: /^minutes/ });
        // A column wears the attribute glyph, not the filter funnel.
        assert.isNotNull(option.querySelector(".lucide-columns-3"));
        assert.isNull(option.querySelector(".lucide-list-filter"));
        assert.isNull(within(columns).queryByRole("option", { name: /^side/ }));
        await userEvent.click(option);
        assert.equal((box as HTMLInputElement).value, "=minutes");
        assert.equal(document.activeElement, box);
        assert.equal(session.selection.size, 0);
    });

    it("words a rule refused on Enter from its reason, without an uncaught error", async () => {
        const session = await sessionWithGraph();
        await session.data.addEdges([{ source: "b", target: "c", weight: 5 }]);
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "=weight > 3{Enter}");
        const line = await screen.findByText("Put numbers in backticks: weight > `5`");
        assert.equal(box.getAttribute("aria-invalid"), "true");
        assert.notEqual(line.id, "");
        assert.include(box.getAttribute("aria-describedby") ?? "", line.id);
        assert.equal(session.selection.size, 0);

        await userEvent.clear(box);
        await userEvent.type(box, "=weight > `3`{Enter}");
        await waitFor(() => {
            assert.equal(session.selection.size, 1);
        });
        // The rule stays in the box, not selected, so a second Enter is not invited; the line under
        // the box says what it selected.
        const input = box as HTMLInputElement;
        assert.equal(input.value, "=weight > `3`");
        assert.equal(input.selectionStart, input.selectionEnd);
        assert.isNotNull(await screen.findByText("1 edge selected"));
        assert.isNull(screen.queryByText("Rule: press Enter to select matches"));
        assert.isNull(screen.queryByRole("alert"));
        assert.notEqual(box.getAttribute("aria-invalid"), "true");
    });

    it("lists nodes and edges under their own headings, and ends the list on a whole row", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.config.set({ data: { directed: false } });
        // Enough hits to scroll: every node and edge carries "x".
        await session.data.addNodes(Array.from({ length: 8 }, (_, i) => ({ id: `x${String(i)}` })));
        await session.data.addEdges(
            Array.from({ length: 7 }, (_, i) => ({ source: `x${String(i)}`, target: `x${String(i + 1)}`, kind: "x" })),
        );
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "x");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const nodes = within(list).getByRole("group", { name: "Nodes" });
        const edges = within(list).getByRole("group", { name: "Edges" });
        assert.isTrue(
            within(nodes)
                .getAllByRole("option")
                .every((row) => !row.textContent.includes(" -- ")),
        );
        assert.isTrue(
            within(edges)
                .getAllByRole("option")
                .every((row) => row.textContent.includes(" -- ")),
        );
        assert.isNull(within(list).queryByRole("group", { name: "Elements" }));

        // The list scrolls, and its visible bottom is the bottom of an option row.
        assert.isAbove(list.scrollHeight, list.clientHeight);
        const bottom = list.getBoundingClientRect().top + list.clientHeight;
        const rowBottoms = within(list)
            .getAllByRole("option")
            .map((row) => row.getBoundingClientRect().bottom);
        assert.isTrue(
            rowBottoms.some((b) => Math.abs(b - bottom) < 1),
            `the list ends at ${String(bottom)}, not on a row (${rowBottoms.join(", ")})`,
        );
    });

    it("words any other refused rule with where it went wrong", async () => {
        renderPlace(await sessionWithGraph());
        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "=side == 'law' ~{Enter}");
        assert.match(
            (await screen.findByRole("alert")).textContent ?? "",
            /^Not a rule Find can read \(at character \d+\)$/,
        );
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
