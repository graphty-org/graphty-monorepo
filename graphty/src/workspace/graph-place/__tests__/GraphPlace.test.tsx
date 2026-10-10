/**
 * The Graph place over a headless graphty-element session (the element's own session, with no
 * canvas): the title line, the footer line, the find list's keyboard rules and the "/" command.
 * Runs need the element's executor, so the paint tree after a run is
 * `tasks.real-element.test.tsx`.
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it, vi } from "vitest";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
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

/**
 * Asserts that the scroller's visible bottom is the bottom of an option row: no row is cut and
 * no heading sits alone at the edge.
 * @param viewport - the scroller.
 * @param list - the listbox inside it.
 */
function assertEndsOnRow(viewport: HTMLElement, list: HTMLElement): void {
    const bottom = viewport.getBoundingClientRect().top + viewport.clientHeight;
    const rowBottoms = within(list)
        .getAllByRole("option")
        .map((row) => row.getBoundingClientRect().bottom);
    assert.isTrue(
        rowBottoms.some((b) => Math.abs(b - bottom) < 1),
        `the list ends at ${String(bottom)}, not on a row (${rowBottoms.join(", ")})`,
    );
}

/**
 * Where an element's first line of text starts on screen.
 * @param element - the element.
 * @returns the left edge of its text, in pixels.
 */
function textLeft(element: Element | null): number {
    const range = document.createRange();
    if (element !== null) {
        range.selectNodeContents(element);
    }
    return range.getClientRects()[0]?.left ?? Number.NaN;
}

describe("the Graph place", () => {
    it("titles the graph with a quiet Graph prefix and its name", async () => {
        renderPlace(await sessionWithGraph());
        const place = screen.getByRole("region", { name: "Graph place" });
        assert.match(place.textContent ?? "", /^GraphLes Miserables/);
    });

    it("opens the graph in the inspector from its title, by pointer and by Enter, keeping the selection", async () => {
        const user = userEvent.setup();
        const session = await sessionWithGraph();
        await session.selection.apply({ nodes: ["a"] });
        const store = renderPlace(session);
        store.set({ inspected: { kind: "measure-row", id: "pagerank" } });
        const title = screen.getByRole("button", { name: "Graph Les Miserables" });
        await user.click(title);
        assert.deepEqual(store.get().inspected, { kind: "graph" });
        store.set({ inspected: null });
        title.focus();
        await user.keyboard("{Enter}");
        assert.deepEqual(store.get().inspected, { kind: "graph" });
        assert.deepEqual(session.selection.nodes, ["a"]);
    });

    it("shows the graph's name as a tooltip only while the name is cut short", async () => {
        renderPlace(await sessionWithGraph());
        const name = screen.getByText("Les Miserables");
        await userEvent.hover(name);
        // Past the theme's 1000 ms open delay: a whole name has no tooltip.
        // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
        await new Promise((resolve) => setTimeout(resolve, 1300));
        assert.isNull(screen.queryByRole("tooltip"));
        await userEvent.unhover(name);

        const place = screen.getByRole("region", { name: "Graph place" });
        place.style.width = "90px";
        await userEvent.hover(name);
        const tip = await screen.findByRole("tooltip", {}, { timeout: 3000 });
        assert.equal(tip.textContent, "Les Miserables");
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
        assert.equal(box.getAttribute("aria-activedescendant"), options[0].id, "the first row is active until Down");

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

    it("marks the option Enter picks from the moment the list shows, and Enter picks it", async () => {
        const session = await sessionWithGraph();
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "Cos");
        const first = within(await screen.findByRole("listbox", { name: "Find results" })).getAllByRole("option")[0];
        assert.match(first.textContent ?? "", /Cosette/);
        assert.equal(first.getAttribute("aria-selected"), "true");
        assert.equal(box.getAttribute("aria-activedescendant"), first.id);
        assert.equal(session.selection.size, 0, "the mark selects nothing");

        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isTrue(session.selection.has("c"));
        });
    });

    it("marks no option while Enter would run the typed rule", async () => {
        const session = await sessionWithGraph();
        await session.data.addEdges([{ source: "b", target: "c", minutes: 12 }]);
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "=min");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        assert.isNull(box.getAttribute("aria-activedescendant"));
        assert.isNull(within(list).queryByRole("option", { selected: true }));
        await userEvent.keyboard("{ArrowDown}");
        assert.equal(box.getAttribute("aria-activedescendant"), within(list).getAllByRole("option")[0].id);
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

    it("answers a condition typed without = with how to write it as a rule, and a name with No match", async () => {
        const session = await sessionWithGraph();
        await session.data.addEdges([{ source: "b", target: "c", minutes: 12 }]);
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "minutes >= 10");
        // The reader's own rule, with the element's backticks, on a line of its own.
        const example = await screen.findByText("=minutes >= `10`");
        const hint = example.parentElement as HTMLElement;
        assert.equal(hint.textContent, "Start with = to select by a value: =minutes >= `10`");
        assert.equal(getComputedStyle(example).display, "block");
        assert.include(box.getAttribute("aria-describedby") ?? "", hint.id);
        assert.notEqual(hint.id, "");
        assert.isNull(screen.queryByText('No match for "minutes >= 10"'));

        const count = vi.spyOn(session.scope, "count");
        await userEvent.clear(box);
        await userEvent.type(box, "zzz");
        assert.isNotNull(await screen.findByText('No match for "zzz"'));
        // The element reads "zzz" as a column that holds nothing, so once it has answered no hint follows.
        await waitFor(() => {
            assert.isTrue(count.mock.calls.some(([spec]) => JSON.stringify(spec) === '{"where":"zzz"}'));
        });
        await act(async () => {
            await Promise.allSettled(count.mock.results.map((r) => r.value as Promise<unknown>));
        });
        assert.isNull(screen.queryByText(/to select by a value/));
        assert.isNotNull(screen.queryByText('No match for "zzz"'));
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
        const example = await screen.findByText("minutes > `12`");
        const hint = example.parentElement as HTMLElement;
        assert.equal(hint.textContent, "Type a rule, such as minutes > `12`");
        // The example rule never breaks; the sentence wraps before it.
        assert.equal(getComputedStyle(example).whiteSpace, "nowrap");
        // Set like every rule the box quotes.
        assert.isTrue(example.classList.contains("ws-mono"));
        const ruleFont = getComputedStyle(example).fontFamily;
        // The theme's field hint (11px, secondary ink), not a 9px caption.
        assert.isTrue(hint.classList.contains("cm-field-description"));
        assert.equal(getComputedStyle(hint).fontSize, "11px");
        assert.isNull(screen.queryByText("Rule: press Enter to select matches"));

        await userEvent.type(box, "minutes >= 10");
        // The reader's own rule, not an example from other numbers, which would get copied.
        const suggestion = await screen.findByText("minutes >= `10`");
        assert.equal(suggestion.parentElement?.textContent, "Put numbers in backticks: minutes >= `10`");
        assert.equal(getComputedStyle(suggestion).fontFamily, ruleFont);
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

        // Where the gray hint's words start, to hold the refusal to.
        await userEvent.type(box, "=");
        const hintLeft = textLeft(await screen.findByText(/^Type a rule/));
        await userEvent.clear(box);

        await userEvent.type(box, "=weight > 3{Enter}");
        // The line under the box, not the status region that speaks it.
        const rule = await screen.findByText("weight > `3`");
        const line = rule.parentElement as HTMLElement;
        assert.equal(line.textContent, "Put numbers in backticks: weight > `3`");
        // It starts where the hint does.
        assert.closeTo(textLeft(line), hintLeft, 1);
        // The rule takes a line of its own, in the monospace face of every rule the box quotes.
        assert.equal(getComputedStyle(rule).display, "block");
        assert.isTrue(rule.classList.contains("ws-mono"));
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

        // The list scrolls, shows its scrollbar, and its visible bottom is the bottom of an option row.
        const viewport = list.closest<HTMLElement>(".ws-find-viewport");
        assert.isNotNull(viewport);
        assert.isAbove(viewport.scrollHeight, viewport.clientHeight);
        assertEndsOnRow(viewport, list);
        // The scrollbar is measured once the scroll area has observed its size.
        await waitFor(() => {
            const thumb = list.closest(".ws-find-list")?.querySelector("[data-orientation='vertical'] > *");
            assert.isAbove(thumb?.getBoundingClientRect().height ?? 0, 0, "a scrollbar thumb is drawn");
        });
    });

    it("ends a long name in ... and never scrolls the list sideways", async () => {
        const session = createGraphSession();
        sessions.push(session);
        // Wider than any window the test runs in.
        const long = `Jean Valjean ${"also known as Monsieur Madeleine, ".repeat(20)}`.trim();
        await session.data.addNodes([{ id: long }]);
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "valjean");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const viewport = list.closest<HTMLElement>(".ws-find-viewport");
        assert.isNotNull(viewport);
        assert.isAtMost(viewport.scrollWidth, viewport.clientWidth, "the list scrolls sideways");
        const name = within(within(list).getByRole("group", { name: "Nodes" }))
            .getByRole("option")
            .querySelector<HTMLElement>(".cm-result-name");
        assert.isNotNull(name);
        assert.equal(getComputedStyle(name).textOverflow, "ellipsis");
        assert.isAbove(name.scrollWidth, name.clientWidth, "the name is cut short, so it ends in ...");
        assert.isAtMost(name.getBoundingClientRect().right, viewport.getBoundingClientRect().right);
    });

    it("counts every match of a kind on its heading, past the rows listed", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.config.set({ data: { directed: false } });
        // A hub with 25 ties: more than the list holds.
        await session.data.addNodes([
            { id: "hub", name: "Hub" },
            ...Array.from({ length: 25 }, (_, i) => ({ id: `t${String(i)}`, name: `Tie${String(i)}` })),
        ]);
        await session.data.addEdges(Array.from({ length: 25 }, (_, i) => ({ source: "hub", target: `t${String(i)}` })));
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "Hub");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const edges = within(list).getByRole("group", { name: "Edges" });
        assert.isBelow(within(edges).getAllByRole("option").length, 25);
        assert.equal(edges.querySelector(".ws-find-heading")?.textContent, "Edges 25");
        const nodes = within(list).getByRole("group", { name: "Nodes" });
        assert.equal(nodes.querySelector(".ws-find-heading")?.textContent, "Nodes 1");
    });

    it("scrolls only to where an option row ends the list, never leaving a heading alone at its edge", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.config.set({ data: { directed: false } });
        // Node rows, then edge rows, then value rows: two headings fall inside the scroll.
        await session.data.addNodes(Array.from({ length: 9 }, (_, i) => ({ id: `n${String(i)}`, kind: "x" })));
        await session.data.addEdges(
            Array.from({ length: 8 }, (_, i) => ({ source: `n${String(i)}`, target: `n${String(i + 1)}`, kind: "x" })),
        );
        renderPlace(session);

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "x");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const viewport = list.closest<HTMLElement>(".ws-find-viewport");
        assert.isNotNull(viewport);
        const room = viewport.scrollHeight - viewport.clientHeight;
        assert.isAbove(room, 0);
        for (let to = 0; to <= room; to += 7) {
            viewport.scrollTop = to;
            await waitFor(() => {
                assertEndsOnRow(viewport, list);
            });
        }
    });

    it("draws the list's scrollbar only while its rows overflow", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.config.set({ data: { directed: false } });
        // "M" lists 20 rows; "Medici" then lists the node and its 6 edges, which fit.
        await session.data.addNodes([
            { id: "Medici" },
            ...Array.from({ length: 24 }, (_, i) => ({ id: `Ma${String(i)}` })),
        ]);
        await session.data.addEdges(
            Array.from({ length: 6 }, (_, i) => ({ source: "Medici", target: `Ma${String(i)}` })),
        );
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });
        // Mantine keeps the scrollbar mounted and hides it with display: none while nothing overflows.
        const scrollbar = (): Element | null => {
            const bar = document.querySelector(
                ".ws-find-list .mantine-ScrollArea-scrollbar[data-orientation=vertical]",
            );
            return bar !== null && getComputedStyle(bar).display !== "none" ? bar : null;
        };

        await userEvent.type(box, "M");
        await waitFor(() => {
            assert.isNotNull(scrollbar());
        });
        await userEvent.type(box, "edici");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        await waitFor(() => {
            assert.lengthOf(within(list).getAllByRole("option"), 7);
        });
        const viewport = list.closest<HTMLElement>(".ws-find-viewport");
        assert.isNotNull(viewport);
        assert.isAtMost(viewport.scrollHeight, viewport.clientHeight);
        await waitFor(() => {
            assert.isNull(scrollbar());
        });
    });

    it("words any other refused rule with where it went wrong", async () => {
        renderPlace(await sessionWithGraph());
        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "=side == 'law' ~{Enter}");
        assert.isNotEmpty(await screen.findAllByText(/^Not a rule Find can read \(at character \d+\)$/));
    });

    it("says a refused rule once, politely, and not again on each keystroke", async () => {
        const session = await sessionWithGraph();
        await session.data.addEdges([{ source: "b", target: "c", minutes: 12 }]);
        renderPlace(session);
        const box = screen.getByRole("combobox", { name: "Find" });
        const words = "Put numbers in backticks:\nminutes >= `10`";
        const spoken = (): string[] => screen.queryAllByRole("status").map((status) => status.textContent ?? "");

        await userEvent.type(box, "=minutes >= 10");
        await waitFor(() => {
            assert.include(spoken(), words);
        });
        assert.isNull(screen.queryByRole("alert"));
        const region = screen.getAllByRole("status").find((status) => status.textContent === words);
        // A keystroke clears the line under the box until the rule is checked again; the region
        // keeps its words, so nothing new is said.
        await userEvent.type(box, " ");
        assert.equal(region?.textContent, words);
        await userEvent.clear(box);
        await userEvent.type(box, "=minutes >= `10`");
        await waitFor(() => {
            assert.notInclude(spoken(), words);
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
