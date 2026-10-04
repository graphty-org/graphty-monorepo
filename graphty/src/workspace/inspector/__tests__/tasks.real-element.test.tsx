/**
 * The tier 1 tasks the inspector delivers, on the REAL graphty-element: T6 (read what loaded),
 * the inspector half of T12 (a picked node opens on Values; Degree lists its neighbors by name,
 * strongest first, by mouse and by keyboard) and of T7 and T8 (a measure row's top 10 and Rerun,
 * a grouping run's summary and groups, Why this look naming the run that won color). Every
 * assertion reads what the element reports, never pixels.
 *
 * Picking a find result and Analyze > Run are other packages' doors; until they land, the walk
 * calls the element verbs those doors call (`selection.apply`, `runs.start`).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Two rings of six joined by one bridge; each node labeled, each edge weighted. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, label: `Node ${String(i)}` }));
const ring = (from: number): { source: string; target: string; weight: number }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
        weight: i + 1,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6", weight: 9 }];

/**
 * The workspace with a project open, once the element's session has come up.
 * @returns the session and the store.
 */
async function openWorkspace(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Two rings", id: 1 } });
    render(<Workspace store={store} />);
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
    return { session, store };
}

/**
 * The workspace holding the two rings, named by their labels.
 * @returns the session and the store.
 */
async function openRings(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const opened = await openWorkspace();
    await opened.session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
    await opened.session.data.addNodes(NODES);
    await opened.session.data.addEdges(EDGES);
    return opened;
}

/**
 * Runs an algorithm to the end, as Analyze > Run does.
 * @param session - the session.
 * @param algorithm - its key.
 * @returns the run's id.
 */
async function runToEnd(session: GraphSession, algorithm: string): Promise<string> {
    const run = session.runs.start(algorithm);
    await act(async () => {
        await run;
        await session.styles.settled();
    });
    return run.id;
}

/**
 * Selects one node, as picking it on the canvas or in the find list does.
 * @param session - the session.
 * @param id - the node.
 */
async function pick(session: GraphSession, id: string): Promise<void> {
    await act(async () => {
        await session.selection.apply({ nodes: [id] });
    });
}

/**
 * The rows of a section that are links, leaving out the section's own open-and-close toggle.
 * @param section - the section.
 * @returns the rows.
 */
const rowButtons = (section: HTMLElement): HTMLElement[] =>
    within(section)
        .getAllByRole("button")
        .filter((button) => !button.hasAttribute("aria-expanded"));

/**
 * The inspector region.
 * @returns queries scoped to it.
 */
const inspector = (): ReturnType<typeof within> => within(screen.getByRole("complementary", { name: "Inspector" }));

describe("tier 1 tasks in the inspector, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "T6: the graph's Overview shows the element's counts for karate",
        async () => {
            const { session } = await openWorkspace();
            await session.data.import({ config: { url: "/samples/karate.gml" } });
            await waitFor(
                () => {
                    assert.equal(session.data.statistics().nodeCount, 34);
                },
                { timeout: TIMEOUT_MS },
            );
            const statistics = session.data.statistics();

            await waitFor(() => {
                assert.include(inspector().getByRole("group", { name: "Nodes" }).textContent, "34");
            });
            assert.include(inspector().getByRole("group", { name: "Edges" }).textContent, String(statistics.edgeCount));
            assert.include(inspector().getByRole("group", { name: "Direction" }).textContent, "Undirected");
            assert.include(
                inspector().getByRole("group", { name: "Components" }).textContent,
                String(statistics.components.count),
            );
            // The header names the source once.
            assert.isNotNull(inspector().getByRole("button", { name: "From karate.gml" }));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T12: a picked node opens on Values, and Degree lists its neighbors by name, strongest first",
        async () => {
            const { session } = await openRings();
            await pick(session, "n0");

            const values = await inspector().findByRole("tab", { name: "Values" });
            assert.equal(values.getAttribute("aria-selected"), "true");
            await userEvent.click(inspector().getByRole("button", { name: /Degree/ }));

            const list = await inspector().findByRole("region", { name: "n0's 3 connections" });
            const rows = rowButtons(list);
            // The bridge (9) first, then the ring's two ties (6 and 1).
            assert.deepEqual(
                rows.map((row) => row.textContent),
                ["Node 69", "Node 56", "Node 11"],
            );
            await userEvent.click(rows[1]);
            await waitFor(() => {
                assert.deepEqual([...session.selection.nodes], ["n5"]);
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T12 by keyboard only: Degree, the neighbor names, and Esc back to the node",
        async () => {
            const { session } = await openRings();
            await pick(session, "n0");

            inspector().getByRole("button", { name: /Degree/ }).focus();
            await userEvent.keyboard("{Enter}");
            const list = await inspector().findByRole("region", { name: "n0's 3 connections" });
            assert.equal(document.activeElement, list);

            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.deepEqual([...session.selection.nodes], ["n0"]);
            });
            await userEvent.click(await inspector().findByRole("button", { name: /Degree/ }));
            await inspector().findByRole("region", { name: "n0's 3 connections" });
            await userEvent.tab();
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.deepEqual([...session.selection.nodes], ["n6"]);
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T7: a measure row shows its top 10, a node its rank, and Rerun revises the same row",
        async () => {
            const { session, store } = await openRings();
            const id = await runToEnd(session, "pagerank");

            await pick(session, "n0");
            // The run's readable name, as the element gives it.
            const label = session.runs.get(id)?.label ?? "";
            const rank = await inspector().findByRole("group", { name: label });
            assert.match(rank.textContent ?? "", /#\d+ of 12/);

            act(() => {
                store.set({ inspected: { kind: "measure-row", id } });
            });
            const top = await inspector().findByRole("group", { name: "Top 10" });
            assert.isAtMost(rowButtons(top).length, 10);
            assert.isAbove(rowButtons(top).length, 0);

            const madeWith = inspector().getByRole("group", { name: "Made with" });
            const field = within(madeWith).getByRole("spinbutton", { name: "Damping Factor" });
            await userEvent.clear(field);
            await userEvent.type(field, "0.5{Enter}");
            const bar = await inspector().findByRole("status");
            assert.include(bar.textContent, "Settings changed since the run");
            await userEvent.click(within(bar).getByRole("button", { name: "Rerun" }));

            await waitFor(
                () => {
                    const runs = session.runs.list().filter((run) => run.algorithm === "pagerank");
                    assert.lengthOf(runs, 1);
                    assert.equal(runs[0].status, "succeeded");
                    assert.include(Object.values(runs[0].params), 0.5);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.isNull(inspector().queryByRole("status"));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T8: Louvain's row shows its groups, a group its members, and Why this look names it for Color",
        async () => {
            const { session, store } = await openRings();
            await runToEnd(session, "betweenness");
            const id = await runToEnd(session, "louvain");

            await pick(session, "n3");
            await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));
            const why: HTMLElement[] = await inspector().findAllByTestId("why-line");
            const label = session.runs.get(id)?.label ?? "";
            const louvain = why.find((line) => line.textContent.startsWith(label));
            if (louvain === undefined) {
                throw new Error(`no Why this look line for ${label}`);
            }
            assert.include(louvain.textContent, "Color");
            // The line's name opens Louvain's row.
            await userEvent.click(within(louvain).getByRole("button"));
            assert.equal(store.get().inspected?.id, id);
            await userEvent.click(await inspector().findByRole("tab", { name: "Values" }));
            const groups = Number(inspector().getByRole("group", { name: "Groups" }).textContent?.replace(/\D/g, ""));
            assert.equal(groups, session.runs.get(id)?.result?.summary().groups?.length);

            const sizes = inspector().getByRole("group", { name: "Sizes" });
            await userEvent.click(rowButtons(sizes)[0]);
            const members = await inspector().findByRole("button", { name: /^Size/ });
            await userEvent.click(members);
            await waitFor(() => {
                assert.isAbove(session.selection.nodes.length, 1);
                // The selection change closed the row: the inspector shows the selection.
                assert.isNull(store.get().inspected);
            });
        },
        TIMEOUT_MS * 2,
    );
});
