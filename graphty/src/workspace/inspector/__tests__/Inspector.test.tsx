/**
 * The inspector against a real graphty-element session with no view (`createGraphSession`):
 * every number it shows is the session's own. A session with no view runs no algorithms, so the
 * run, measure and group views are tested on the real element (`tasks.real-element.test.tsx`).
 */
import {
    createGraphSession,
    type GraphSession,
    GraphtyError,
    type RunExecutionContext,
    type RunOutcome,
} from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it } from "vitest";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { Inspector } from "../Inspector";

/** Two rings of six joined by one bridge; each node labeled, each edge weighted by `shared`. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, label: `Node ${String(i)}` }));
const ring = (from: number): { source: string; target: string; shared: number }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
        shared: i + 1,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6", shared: 9 }];

let session: GraphSession | null = null;

afterEach(() => {
    session?.dispose();
    session = null;
});

/**
 * A session holding the two rings, the inspector rendered on it.
 * @param execute - how the session runs an algorithm; absent, it runs none.
 * @returns the session and the store.
 */
async function renderInspector(
    execute?: (context: RunExecutionContext) => Promise<RunOutcome>,
): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const made = createGraphSession(execute === undefined ? undefined : { runs: { execute } });
    session = made;
    await made.data.addNodes(NODES);
    await made.data.addEdges(EDGES);
    const store = createWorkspaceStore({ project: { name: "Two rings", id: 1 } });
    const value = makeWorkspaceValue(store, createRegistry(REGISTRATIONS), made, null);
    render(
        <WorkspaceContext.Provider value={value}>
            <Inspector />
        </WorkspaceContext.Provider>,
    );
    return { session: made, store };
}

/**
 * Every reachable control's accessible name, so a test can check that no two share one.
 * @returns the names.
 */
function controlNames(): string[] {
    return [
        ...screen.queryAllByRole("button"),
        ...screen.queryAllByRole("tab"),
        ...screen.queryAllByRole("checkbox"),
    ].map((control) => control.getAttribute("aria-label") ?? control.textContent ?? "");
}

describe("the inspector", () => {
    it("shows the graph's Overview with the element's counts when nothing is selected", async () => {
        await renderInspector();

        assert.equal(screen.getByRole("tab", { name: "Values" }).getAttribute("aria-selected"), "true");
        const overview = screen.getByRole("group", { name: "Nodes" });
        assert.include(overview.textContent, "12");
        assert.include(screen.getByRole("group", { name: "Edges" }).textContent, "13");
        assert.include(screen.getByRole("group", { name: "Components" }).textContent, "1");
    });

    it("leads the Overview with the element's visible counts while a filter step is on", async () => {
        const { session: on } = await renderInspector();
        // No step: no showing rows, no whole-graph note.
        assert.isNull(screen.queryByRole("group", { name: "Nodes showing" }));
        assert.isNull(screen.queryByText(/whole graph/));

        await act(async () => {
            await on.visibility.setSteps([
                { id: "s1", on: true, rule: { kind: "range", attribute: "data.shared", min: 5, nodes: "ends" } },
            ]);
        });
        const { visibleNodes, visibleEdges } = on.status.counts;
        assert.isBelow(visibleNodes, 12);
        const nodes = await screen.findByRole("group", { name: "Nodes showing" });
        assert.include(nodes.textContent, `${String(visibleNodes)} of 12`);
        assert.include(
            screen.getByRole("group", { name: "Edges showing" }).textContent,
            `${String(visibleEdges)} of 13`,
        );
        assert.isNotNull(screen.getByText("The counts below are for the whole graph."));
        assert.include(screen.getByRole("group", { name: "Nodes" }).textContent, "12");

        // Off again: back to the plain Overview.
        await act(async () => {
            await on.visibility.setSteps([]);
        });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Nodes showing" }));
        });
        assert.isNull(screen.queryByRole("group", { name: "Edges showing" }));
        assert.isNull(screen.queryByText(/whole graph/));
    });

    it("keeps the graph's tab, and always opens a single node on Values", async () => {
        const { session: on } = await renderInspector();

        await userEvent.click(screen.getByRole("tab", { name: "Style" }));
        assert.isNotNull(screen.getByRole("group", { name: "Canvas" }));

        await act(async () => {
            await on.selection.apply({ nodes: ["n1"] });
        });
        await waitFor(() => {
            assert.equal(screen.getByRole("tab", { name: "Values" }).getAttribute("aria-selected"), "true");
        });
        // Style picked on one node does not carry to the next.
        await userEvent.click(screen.getByRole("tab", { name: "Style" }));
        await act(async () => {
            await on.selection.apply({ nodes: ["n2"] });
        });
        await waitFor(() => {
            assert.equal(screen.getByRole("tab", { name: "Values" }).getAttribute("aria-selected"), "true");
        });

        // Back on the graph, the Style tab the reader chose is still chosen.
        act(() => {
            on.selection.clear();
        });
        await waitFor(() => {
            assert.equal(screen.getByRole("tab", { name: "Style" }).getAttribute("aria-selected"), "true");
        });
    });

    it("lists a node's neighbors from the Degree link, by name with no weight; Esc returns", async () => {
        const { session: on } = await renderInspector();
        await act(async () => {
            await on.selection.apply({ nodes: ["n0"] });
        });

        const degree = await screen.findByRole("button", { name: /Degree/ });
        assert.include(degree.textContent, "3");
        await userEvent.click(degree);

        const list = await screen.findByRole("region", { name: "n0's 3 connections" });
        const names = within(list)
            .getAllByRole("button")
            .map((row) => row.textContent)
            .filter((name) => name !== "Filter to neighbors" && name !== "Back to n0");
        // A session with no view holds no records, so no labels and no edge weights: each
        // neighbor is named by its id, in name order, with no tie value.
        assert.deepEqual(names, ["n1", "n5", "n6"]);
        // Focus lands on the first neighbor, a control, not on the whole list.
        assert.equal(document.activeElement, within(list).getByRole("button", { name: "n1" }));
        assert.equal(on.selection.nodes.length, 4);

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.deepEqual([...on.selection.nodes], ["n0"]);
        });
        // Keyboard focus comes back to Degree, not to the page.
        await waitFor(() => {
            assert.equal(document.activeElement, screen.getByRole("button", { name: /Degree/ }));
        });
    });

    it("heads the neighbor list as a section, one form at every reach, with a way back to the node", async () => {
        const { session: on } = await renderInspector();
        await act(async () => {
            await on.selection.apply({ nodes: ["n0"] });
        });
        await userEvent.click(await screen.findByRole("button", { name: /Degree/ }));
        const list = await screen.findByRole("region", { name: "n0's 3 connections" });
        // The heading is the section title, as the node's Summary is.
        assert.isNotNull(within(list).getByRole("group", { name: "n0's 3 connections" }));

        await userEvent.click(within(list).getByRole("radio", { name: "2" }));
        const wider = await screen.findByRole("region", { name: /^n0's \d+ connections$/ });
        // Two hops list the same way one hop does: by name.
        const names = within(wider)
            .getAllByRole("button")
            .map((row) => row.textContent ?? "")
            .filter((name) => name !== "Filter to neighbors" && name !== "Back to n0");
        assert.deepEqual(names, ["n1", "n2", "n4", "n5", "n6", "n7", "n11"]);

        await userEvent.click(within(wider).getByRole("button", { name: "Back to n0" }));
        await waitFor(() => {
            assert.deepEqual([...on.selection.nodes], ["n0"]);
        });
        // Focus returns to the Degree row that opened the neighbors, as Esc's does.
        await waitFor(() => {
            assert.equal(document.activeElement, screen.getByRole("button", { name: /Degree/ }));
        });
    });

    it("draws Filter to neighbors as a button that says what it does, and how to undo it when on", async () => {
        const { session: on } = await renderInspector();
        await act(async () => {
            await on.selection.apply({ nodes: ["n0"] });
        });
        await userEvent.click(await screen.findByRole("button", { name: /Degree/ }));
        const toggle = await screen.findByRole("button", { name: "Filter to neighbors" });
        assert.equal(toggle.getAttribute("data-variant"), "default");
        assert.equal(toggle.getAttribute("aria-pressed"), "false");
        await userEvent.hover(toggle);
        assert.isNotNull(await screen.findByText("Hide every node outside this neighborhood"));

        await userEvent.click(toggle);
        await waitFor(() => {
            assert.equal(toggle.getAttribute("aria-pressed"), "true");
        });
        assert.equal(toggle.getAttribute("data-variant"), "filled");
        await userEvent.unhover(toggle);
        await userEvent.hover(toggle);
        assert.isNotNull(await screen.findByText(/Press again to show every node/));
    });

    it("draws an attribute's kind and origin as rows, the kind's meaning in a tooltip", async () => {
        const { store } = await renderInspector();
        act(() => {
            store.set({ inspected: { kind: "attribute", id: "data.shared" } });
        });
        const origin = await screen.findByRole("group", { name: "Origin" });
        assert.include(origin.textContent, "From the file");
        const kind = screen.getByRole("group", { name: "Kind" });
        const word = within(kind).getByText("Amount");
        await userEvent.hover(word);
        // By its text, then its tooltip: in a full run the role query alone missed a tooltip that
        // was already in the page with this text (testing-library judged it inaccessible).
        const tip = await screen.findByText(/quantity/);
        assert.isNotNull(tip.closest('[role="tooltip"]'));
    });

    it("closes the neighbor list when the selection changes again", async () => {
        const { session: on, store } = await renderInspector();
        await act(async () => {
            await on.selection.apply({ nodes: ["n0"] });
        });
        await userEvent.click(await screen.findByRole("button", { name: /Degree/ }));
        await screen.findByRole("region", { name: "n0's 3 connections" });

        await act(async () => {
            await on.selection.apply({ nodes: [...on.selection.nodes, "n3"] });
        });
        await waitFor(() => {
            assert.isNull(store.get().inspected);
        });
        assert.isNull(screen.queryByRole("region"));
    });

    it("leaves out a Summary row that says nothing: no selected edges, a value only one node holds", async () => {
        const { session: on } = await renderInspector();
        await act(async () => {
            await on.selection.apply({ nodes: ["n0", "n1", "n2"] });
        });

        const among = await screen.findByRole("group", { name: "Edges joining these nodes" });
        assert.include(among.textContent, "2");
        assert.isNull(screen.queryByRole("group", { name: "Edges" }));
        assert.isNull(screen.queryByText(/\(1\)/));
    });

    it("shows no joining-edges row for an edge-only selection, and says what is selected in the header", async () => {
        const { session: on } = await renderInspector();
        const edges = on.data
            .edges()
            .slice(0, 3)
            .map((edge) => edge.id);
        await act(async () => {
            await on.selection.apply({ edges });
        });

        assert.include((await screen.findByRole("group", { name: "Edges" })).textContent, "3");
        assert.isNotNull(screen.getByText("3 edges selected"));
        assert.isNull(screen.queryByRole("group", { name: /^Edges (among|joining)/ }));
        assert.isNull(screen.queryByRole("group", { name: "Nodes" }));
    });

    it("words two joined nodes' summary so it does not contradict the header's edge count", async () => {
        const { session: on } = await renderInspector();
        await act(async () => {
            await on.selection.apply({ nodes: ["n0", "n6"] });
        });

        const joining = await screen.findByRole("group", { name: "Edges joining these nodes" });
        assert.include(joining.textContent, "1");
        assert.isNotNull(screen.getByText("2 nodes selected"));
        assert.isNull(screen.queryByText(/0 edges/));
        assert.isNull(screen.queryByRole("group", { name: "Edges" }));
    });

    it("shows isolated nodes, self-loops and repeated edges from the element's statistics", async () => {
        const { session: on } = await renderInspector();
        await act(async () => {
            await on.data.addNodes([{ id: "alone" }, { id: "looped" }]);
            await on.data.addEdges([
                { source: "looped", target: "looped" },
                { source: "n1", target: "n2" },
            ]);
        });
        const statistics = on.data.statistics();

        await waitFor(() => {
            assert.isNotNull(
                screen.getByText(`${String(statistics.components.isolatedCount)} nodes joined to no other node`),
            );
        });
        assert.isNotNull(screen.getByText("1 edge from a node to itself"));
        assert.isNotNull(screen.getByText(`${String(statistics.repeatedEdgeCount)} repeated edge`));
    });

    it("shows a queued run's place, and a running run's Cancel stops it", async () => {
        const execute = (context: RunExecutionContext): Promise<RunOutcome> =>
            new Promise((_resolve, reject) => {
                context.signal.addEventListener("abort", () => {
                    reject(new Error("canceled"));
                });
            });
        const { session: on, store } = await renderInspector(execute);
        const first = on.runs.start("pagerank");
        const second = on.runs.start("degree");
        first.then(undefined, () => undefined);
        second.then(undefined, () => undefined);

        act(() => {
            store.set({ inspected: { kind: "measure-row", id: second.id } });
        });
        assert.include((await screen.findByRole("status")).textContent, "Queued, 1st");

        act(() => {
            store.set({ inspected: { kind: "measure-row", id: first.id } });
        });
        await waitFor(() => {
            assert.include(screen.getByRole("status").textContent, "Running");
        });
        await userEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.equal(on.runs.get(first.id)?.status, "canceled");
        });
        second.cancel();
    });

    it("says why a run failed in the app's words, never the element's code", async () => {
        const execute = (): Promise<RunOutcome> =>
            Promise.reject(new GraphtyError({ code: "E_NOT_CONVERGED", message: "no", source: "run" }));
        const { session: on, store } = await renderInspector(execute);
        const run = on.runs.start("pagerank");
        await run.then(undefined, () => undefined);

        act(() => {
            store.set({ inspected: { kind: "measure-row", id: run.id } });
        });
        const bar = await screen.findByRole("status");
        assert.equal(bar.textContent, "The run failed: it did not settle on an answer");
        assert.notInclude(bar.textContent, "E_");
    });

    it("names the Everything row once in its header, not again as its kind", async () => {
        const { store } = await renderInspector();
        act(() => {
            store.set({ inspected: { kind: "everything-row" } });
        });
        await waitFor(() => {
            assert.lengthOf(screen.getAllByText("Everything"), 1);
        });
    });

    it("shows the selection's Summary on the Selection row's Values tab", async () => {
        const { session: on, store } = await renderInspector();
        await act(async () => {
            await on.selection.apply({ nodes: ["n0", "n1", "n2"] });
        });
        act(() => {
            store.set({ inspected: { kind: "selection-row" } });
        });

        // The row opens on Style (the highlight); Values holds the Summary.
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        const nodes = await screen.findByRole("group", { name: "Nodes" });
        assert.include(nodes.textContent, "3");
        assert.isNotNull(screen.getByRole("group", { name: "Edges joining these nodes" }));
    });

    it("names a selected edge by its ends, and Select endpoints selects those two nodes", async () => {
        const { session: on } = await renderInspector();
        const bridge = on.data.edges().find((edge) => edge.source === "n0" && edge.target === "n6");
        assert.isDefined(bridge);
        await act(async () => {
            await on.config.set({ data: { directed: false } });
            await on.selection.apply({ edges: [bridge?.id ?? ""] });
        });
        assert.isNotNull(await screen.findByText("n0 -- n6"));

        await userEvent.click(screen.getByRole("button", { name: "Edge actions" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /Select endpoints/ }));
        await waitFor(() => {
            assert.sameMembers([...on.selection.nodes], ["n0", "n6"]);
        });
        assert.lengthOf(on.selection.edges, 0);

        // On a directed graph the name points from source to target.
        await act(async () => {
            await on.config.set({ data: { directed: true } });
            await on.selection.apply({ edges: [bridge?.id ?? ""] });
        });
        assert.isNotNull(await screen.findByText("n0 -> n6"));
    });

    it("lists an edge's end columns once, as From and To, whatever the file named them", async () => {
        const made = createGraphSession();
        session = made;
        // As the app opens a file: prepared, then loaded as it reads.
        const file = new File(["from,to,minutes\nStation,Stadium,4\nDepot,Station,15\n"], "bus-stops.csv");
        const draft = await made.data.prepare({ config: { file } });
        await draft.load();
        const store = createWorkspaceStore({ project: { name: "Bus", id: 1 } });
        render(
            <WorkspaceContext.Provider value={makeWorkspaceValue(store, createRegistry(REGISTRATIONS), made, null)}>
                <Inspector />
            </WorkspaceContext.Provider>,
        );
        const edge = made.data.edges().find((each) => each.source === "Station");
        await act(async () => {
            await made.selection.apply({ edges: [edge?.id ?? ""] });
        });
        await screen.findByRole("group", { name: "minutes" });
        assert.include(screen.getByRole("button", { name: /^From/ }).textContent, "Station");
        assert.include(screen.getByRole("button", { name: /^To/ }).textContent, "Stadium");
        assert.isNull(screen.queryByRole("group", { name: "from" }));
        assert.isNull(screen.queryByRole("group", { name: "to" }));
    });

    it("gives no two reachable controls the same accessible name", async () => {
        const { session: on } = await renderInspector();
        for (const select of [
            () => on.selection.clear(),
            () => on.selection.apply({ nodes: ["n0"] }),
            () => on.selection.apply({ nodes: ["n1", "n4", "n9"] }),
        ]) {
            await act(async () => {
                await select();
            });
            const names = controlNames();
            assert.deepEqual(names, [...new Set(names)]);
        }
    });
});
