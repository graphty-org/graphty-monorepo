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
            .map((row) => row.textContent);
        // A session with no view holds no records, so no labels and no edge weights: each
        // neighbor is named by its id, in name order, with no tie value.
        assert.deepEqual(names, ["n1", "n5", "n6"]);
        assert.equal(document.activeElement, list);
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
